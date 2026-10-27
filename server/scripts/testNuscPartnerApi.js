const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const crypto = require('crypto');
const { createRequire } = require('module');
const serverRequire = createRequire(path.join(__dirname, '..', 'package.json'));
const mongoose = serverRequire('mongoose');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Inventory = require('../models/NuscHomeMatchInventory');
const NuscPartnerRequest = require('../models/NuscPartnerRequest');
const usedRequestIds = [];

function fail(message) {
  throw new Error(message);
}

function redirectedTestUri() {
  if (process.env.NODE_ENV === 'production' || process.env.NUSC_HOME_MATCH_TEST_MODE !== 'true') {
    fail('Refusing partner API acceptance tests outside protected NUSC test mode.');
  }
  if (!/^rzp_test_/.test(process.env.RAZORPAY_KEY_ID || '')) fail('A test Razorpay key is required for the protected server launcher.');
  const uri = new URL(process.env.MONGO_URI || '');
  const configuredDb = decodeURIComponent(uri.pathname.replace(/^\/+/, '')).split('/')[0];
  if (!['ahibi', 'ahibi-test'].includes(configuredDb)) fail('Refusing a Mongo database outside the AHIBI test redirect allowlist.');
  uri.pathname = '/ahibi-test';
  return uri.toString();
}

function authHeaders(method, pathAndQuery, rawBody, fixedRequestId) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const requestId = fixedRequestId || `nusc-test-${crypto.randomUUID()}`;
  usedRequestIds.push(requestId);
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const message = `${timestamp}\n${requestId}\n${method.toUpperCase()}\n${pathAndQuery}\n${bodyHash}`;
  const signature = crypto.createHmac('sha256', process.env.NUSC_PARTNER_TEST_SECRET).update(message).digest('hex');
  return {
    'x-ahibi-key-id': process.env.NUSC_PARTNER_TEST_KEY_ID,
    'x-ahibi-timestamp': timestamp,
    'x-ahibi-request-id': requestId,
    'x-ahibi-signature': signature,
    'content-type': 'application/json',
  };
}

async function callApiResponse(pathAndQuery, { method = 'GET', body = null, invalidSignature = false, requestId = null } = {}) {
  const rawBody = body === null ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body));
  const headers = authHeaders(method, `/api/nusc-partner/v1${pathAndQuery}`, rawBody, requestId);
  if (invalidSignature) headers['x-ahibi-signature'] = '0'.repeat(64);
  return fetch(`${process.env.NUSC_PARTNER_TEST_BASE_URL || 'http://127.0.0.1:5000/api/nusc-partner/v1'}${pathAndQuery}`, {
    method,
    headers,
    ...(body !== null && { body: rawBody }),
  });
}

async function callApi(pathAndQuery, options = {}) {
  const response = await callApiResponse(pathAndQuery, options);
  return { status: response.status, json: await response.json() };
}

async function checkRunnerMongo(stage) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(redirectedTestUri(), { serverSelectionTimeoutMS: 10000 });
    }
    await mongoose.connection.db.command({ ping: 1 });
    console.log(`[NUSC partner acceptance] Mongo ${stage}: database=${mongoose.connection.name}, state=${mongoose.connection.readyState}, eventModelSameConnection=${Event.db === mongoose.connection}, eventModelState=${Event.db.readyState}`);
  } catch (error) {
    console.error(`[NUSC partner acceptance] Mongo ${stage} failed: ${error.code || error.name || 'UNKNOWN'}; state=${mongoose.connection.readyState}; eventModelState=${Event.db.readyState}`);
    throw error;
  }
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function run() {
  if (process.env.NUSC_PARTNER_API_ENABLED !== 'true' || !process.env.NUSC_PARTNER_TEST_KEY_ID || !process.env.NUSC_PARTNER_TEST_SECRET) {
    fail('Enable the test-only NUSC partner API and configure its test credentials in server/.env.');
  }
  const base = process.env.NUSC_PARTNER_TEST_BASE_URL || 'http://127.0.0.1:5000/api/nusc-partner/v1';
  if (!base.startsWith('http://127.0.0.1:') && !base.startsWith('http://localhost:')) {
    fail('Acceptance tests may call only a loopback partner API URL.');
  }

  await mongoose.connect(redirectedTestUri());
  await checkRunnerMongo('after connect');
  const catalog = await callApi('/catalog/season-passes');
  assert(
    catalog.status === 200 && catalog.json.matches?.length === 10,
    `Catalog must resolve all ten AHIBI test events (HTTP ${catalog.status}, code ${catalog.json?.code || 'none'}, matches ${Array.isArray(catalog.json?.matches) ? catalog.json.matches.length : 'not returned'}).`,
  );
  await checkRunnerMongo('after catalog');
  const testRun = crypto.randomUUID();
  const prefix = `nusc-test-${testRun}`;
  const trackedReservations = [];
  const originalSold = new Map();
  let allEvents = [];
  let passed = 0;
  let scenarioError = null;
  console.log(`[NUSC partner acceptance] Test run ID: ${prefix}`);

  try {
    allEvents = await Event.find({ _id: { $in: catalog.json.matches.map((match) => match.eventId) } }).select('+ticketTypes');
    if (allEvents.length !== 10) fail('Catalog IDs did not resolve to ten AHIBI test event records.');
    for (const event of allEvents) originalSold.set(String(event._id), event.ticketTypes.map((ticket) => ({ name: ticket.name, sold: ticket.sold })));

    const zoneCandidates = ['G-1', 'G-2', 'G-3', 'G-4', 'G-5'];
    let selectedZone = null;
    for (const zone of zoneCandidates) {
      const capacities = { 'G-1': 600, 'G-2': 600, 'G-3': 450, 'G-4': 650, 'G-5': 600 };
      const counts = await Promise.all(allEvents.map((event) => Booking.countDocuments({
        event: event._id,
        ticketType: 'General Pass',
        nuscGeneralZone: zone,
        status: { $in: ['confirmed', 'checked-in'] },
        paymentStatus: 'completed',
      })));
      if (counts.every((count, index) => count < capacities[zone] && count < Number(allEvents[index].ticketTypes.find((ticket) => ticket.name === 'General Pass')?.quantity || 0))) {
        selectedZone = zone;
        break;
      }
    }
    if (!selectedZone) fail('No General zone has room across all ten AHIBI test fixtures.');

    const invalid = await callApi('/catalog/season-passes', { invalidSignature: true });
    assert(invalid.status === 401 && invalid.json.code === 'INVALID_PARTNER_SIGNATURE', 'Invalid signatures must be rejected.');
    passed += 1;

    const replayRequestId = `nusc-test-${crypto.randomUUID()}`;
    const firstSignedRead = await callApi('/catalog/season-passes', { requestId: replayRequestId });
    const replayedRead = await callApi('/catalog/season-passes', { requestId: replayRequestId });
    assert(firstSignedRead.status === 200 && replayedRead.status === 409 && replayedRead.json.code === 'REQUEST_REPLAYED', 'A signed request ID must be accepted only once.');
    passed += 1;

    const orderId = `${prefix}-issue`;
    const memberReference = `member-${testRun}`;
    const reservePath = '/season-pass/reservations';
    const reserveBody = { partnerOrderId: orderId, memberReference, passId: 'general-season', zone: selectedZone };
    const reserved = await callApi(reservePath, { method: 'POST', body: reserveBody });
    assert(reserved.status === 201 && reserved.json.reservation?.matches?.length === 10, 'Reservation must hold ten fixtures.');
    trackedReservations.push(reserved.json.reservation.reservationId);
    passed += 1;

    const reservedAgain = await callApi(reservePath, { method: 'POST', body: reserveBody });
    assert(reservedAgain.status === 200 && reservedAgain.json.reservation.reservationId === reserved.json.reservation.reservationId, 'Duplicate reserve must return the same reservation.');
    passed += 1;

    const paymentId = `${prefix}-payment`;
    const confirmPath = `/reservations/${encodeURIComponent(reserved.json.reservation.reservationId)}/confirm`;
    const issued = await callApi(confirmPath, { method: 'POST', body: { paymentId } });
    assert(issued.status === 201 && issued.json.tickets?.length === 10, 'Confirm must issue exactly ten tickets.');
    assert(issued.json.tickets.every((ticket) => ticket.zone === selectedZone && ticket.status === 'confirmed' && ticket.ticketId), 'Every General ticket must carry the selected zone and booking ID.');
    passed += 1;

    const duplicateConfirm = await callApi(confirmPath, { method: 'POST', body: { paymentId } });
    assert(duplicateConfirm.status === 200 && JSON.stringify(duplicateConfirm.json.tickets.map((ticket) => ticket.ticketId)) === JSON.stringify(issued.json.tickets.map((ticket) => ticket.ticketId)), 'Duplicate confirm/lost-response retry must return the same tickets.');
    const issuedBookings = await Booking.find({ 'nuscPartnerTicket.partnerOrderId': orderId }).lean();
    assert(issuedBookings.length === 10 && issuedBookings.every((booking) => booking.paymentProvider === 'nusc-partner' && !booking.razorpayOrderId && !booking.razorpayPaymentId && !booking.user), 'Partner issuance must create ten accountless, non-Ahibi-Razorpay bookings.');
    passed += 1;

    const ticketPath = issued.json.tickets[0].ticketAccessPath.replace('/api/nusc-partner/v1', '');
    const ticket = await callApi(ticketPath);
    assert(ticket.status === 200 && ticket.json.ticket?.qrPayload?.bookingId === issued.json.tickets[0].ticketId, 'Private ticket lookup must return its QR payload.');
    passed += 1;

    const reservationId = reserved.json.reservation.reservationId;
    const bookingId = issued.json.tickets[0].ticketId;
    const pdfPath = `/reservations/${encodeURIComponent(reservationId)}/tickets/${encodeURIComponent(bookingId)}/pdf`;
    const validPdf = await callApiResponse(pdfPath);
    const pdfBytes = Buffer.from(await validPdf.arrayBuffer());
    const contentDisposition = validPdf.headers.get('content-disposition') || '';
    assert(
      validPdf.status === 200 &&
      (validPdf.headers.get('content-type') || '').startsWith('application/pdf') &&
      contentDisposition === `attachment; filename="ahibi-ticket-${bookingId}.pdf"` &&
      (validPdf.headers.get('cache-control') || '').includes('no-store') &&
      pdfBytes.subarray(0, 5).toString('ascii') === '%PDF-',
      'An issued booking in its reservation must return an uncached official PDF with a safe filename.',
    );
    passed += 1;

    const attendee = {
      name: 'NUSC Acceptance Member',
      email: 'nusc-acceptance@example.test',
      phone: '+91 90000 00000',
    };
    const storedBeforeAttendeePdf = await Booking.findById(bookingId)
      .select('_id user customerName customerEmail customerPhone nuscPartnerTicket updatedAt').lean();
    const attendeePdf = await callApiResponse(pdfPath, { method: 'POST', body: { attendee } });
    const attendeePdfBytes = Buffer.from(await attendeePdf.arrayBuffer());
    assert(
      attendeePdf.status === 200 &&
      (attendeePdf.headers.get('content-type') || '').startsWith('application/pdf') &&
      attendeePdfBytes.subarray(0, 5).toString('ascii') === '%PDF-',
      'Signed attendee details must return the branded ticket PDF.',
    );
    const storedAfterAttendeePdf = await Booking.findById(bookingId)
      .select('_id user customerName customerEmail customerPhone nuscPartnerTicket updatedAt').lean();
    assert(
      storedAfterAttendeePdf &&
      !storedAfterAttendeePdf.user &&
      !storedAfterAttendeePdf.customerName &&
      !storedAfterAttendeePdf.customerEmail &&
      !storedAfterAttendeePdf.customerPhone &&
      JSON.stringify(storedAfterAttendeePdf.nuscPartnerTicket) === JSON.stringify(storedBeforeAttendeePdf.nuscPartnerTicket) &&
      String(storedAfterAttendeePdf.updatedAt) === String(storedBeforeAttendeePdf.updatedAt),
      'Attendee details must be used only for PDF generation and never stored on the AHIBI booking.',
    );
    passed += 1;

    const unknownBookingId = crypto.randomBytes(12).toString('hex');
    const unknownPdf = await callApi(`/reservations/${encodeURIComponent(reservationId)}/tickets/${unknownBookingId}/pdf`);
    assert(unknownPdf.status === 404 && unknownPdf.json.code === 'TICKET_NOT_FOUND', 'Unknown bookings must not return a ticket PDF.');
    const unknownPostPdf = await callApi(`/reservations/${encodeURIComponent(reservationId)}/tickets/${unknownBookingId}/pdf`, {
      method: 'POST', body: { attendee },
    });
    assert(unknownPostPdf.status === 404 && unknownPostPdf.json.code === 'TICKET_NOT_FOUND', 'POST must not return a PDF for an unknown booking.');
    passed += 1;

    const foreignReservation = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-pdf-other`, memberReference: `member-pdf-other-${testRun}`, passId: 'premium-season',
    } });
    assert(foreignReservation.status === 201, 'Second reservation for PDF ownership test should succeed.');
    trackedReservations.push(foreignReservation.json.reservation.reservationId);
    const foreignReservationId = foreignReservation.json.reservation.reservationId;
    const foreignConfirm = await callApi(`/reservations/${encodeURIComponent(foreignReservationId)}/confirm`, {
      method: 'POST', body: { paymentId: `${prefix}-pdf-other-payment` },
    });
    assert(foreignConfirm.status === 201 && foreignConfirm.json.tickets?.length === 10, 'Second reservation should issue ten test tickets.');
    const crossReservationPdf = await callApi(`/reservations/${encodeURIComponent(reservationId)}/tickets/${encodeURIComponent(foreignConfirm.json.tickets[0].ticketId)}/pdf`);
    assert(crossReservationPdf.status === 404 && crossReservationPdf.json.code === 'TICKET_NOT_FOUND', 'A booking from another reservation must not return a PDF.');
    const crossReservationPostPdf = await callApi(`/reservations/${encodeURIComponent(reservationId)}/tickets/${encodeURIComponent(foreignConfirm.json.tickets[0].ticketId)}/pdf`, {
      method: 'POST', body: { attendee },
    });
    assert(crossReservationPostPdf.status === 404 && crossReservationPostPdf.json.code === 'TICKET_NOT_FOUND', 'POST must reject a booking from another reservation.');
    passed += 1;

    const invalidPdfSignature = await callApiResponse(pdfPath, { invalidSignature: true });
    const invalidPdfBody = await invalidPdfSignature.json();
    assert(invalidPdfSignature.status === 401 && invalidPdfBody.code === 'INVALID_PARTNER_SIGNATURE', 'PDF retrieval must reject an invalid partner signature.');
    const invalidPostPdfSignature = await callApiResponse(pdfPath, {
      method: 'POST', body: { attendee }, invalidSignature: true,
    });
    const invalidPostPdfBody = await invalidPostPdfSignature.json();
    assert(invalidPostPdfSignature.status === 401 && invalidPostPdfBody.code === 'INVALID_PARTNER_SIGNATURE', 'POST PDF retrieval must reject an invalid HMAC signature.');
    passed += 1;

    const releaseBody = { partnerOrderId: `${prefix}-release`, memberReference: `member-release-${testRun}`, passId: 'premium-season' };
    const releasable = await callApi(reservePath, { method: 'POST', body: releaseBody });
    assert(releasable.status === 201, 'Premium reservation should succeed in available test inventory.');
    trackedReservations.push(releasable.json.reservation.reservationId);
    const released = await callApi(`/reservations/${releasable.json.reservation.reservationId}/release`, { method: 'POST', body: {} });
    assert(released.status === 200 && released.json.reservation.status === 'released', 'Unpaid hold should be releasable.');
    passed += 1;

    const expiring = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-expiry`, memberReference: `member-expiry-${testRun}`, passId: 'general-season', zone: selectedZone,
    } });
    assert(expiring.status === 201, 'Expiry scenario reservation should succeed.');
    trackedReservations.push(expiring.json.reservation.reservationId);
    await Inventory.updateOne(
      { key: 'nusc-il-2026-27', 'partnerSeasonPassReservations.reservationId': expiring.json.reservation.reservationId },
      { $set: {
        'partnerSeasonPassReservations.$.expiresAt': new Date(Date.now() - 1000),
        'seasonPassOrders.$[hold].expiresAt': new Date(Date.now() - 1000),
      } },
      { arrayFilters: [{ 'hold.orderId': expiring.json.reservation.reservationId }] }
    );
    const expiredConfirm = await callApi(`/reservations/${expiring.json.reservation.reservationId}/confirm`, { method: 'POST', body: { paymentId: `${prefix}-expired-payment` } });
    assert(expiredConfirm.status === 409 && expiredConfirm.json.code === 'HOLD_EXPIRED', 'Expired hold must not be issued.');
    passed += 1;

    const soldOutEvent = allEvents[0];
    const generalTicket = soldOutEvent.ticketTypes.find((ticket) => ticket.name === 'General Pass');
    generalTicket.sold = Number(generalTicket.quantity || 2900);
    await soldOutEvent.save();
    const soldOut = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-sold-out`, memberReference: `member-soldout-${testRun}`, passId: 'general-season', zone: selectedZone,
    } });
    assert(soldOut.status === 409 && soldOut.json.code === 'TICKETS_UNAVAILABLE', 'Sold-out fixture must reject reservation before payment.');
    passed += 1;

    console.log(`NUSC partner acceptance checks passed: ${passed}. Test-only zone: ${selectedZone}. Catalog returned ten ahibi-test event IDs.`);
  } catch (error) {
    scenarioError = error;
  } finally {
    const cleanupErrors = [];
    const cleanupStep = async (label, operation) => {
      try {
        await operation();
      } catch (error) {
        cleanupErrors.push(`${label} (${error.code || error.name || 'UNKNOWN'})`);
      }
    };
    const connectionState = mongoose.connection.readyState;
    if (connectionState !== 1) {
      cleanupErrors.push(`Mongo connection unavailable; cleanup skipped (state ${connectionState})`);
    } else {
      const testOrderPattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      await cleanupStep('booking cleanup', () => Booking.deleteMany({ 'nuscPartnerTicket.partnerOrderId': testOrderPattern }));
      await cleanupStep('inventory cleanup', () => Inventory.updateOne(
        { key: 'nusc-il-2026-27' },
        { $pull: {
          partnerSeasonPassReservations: { partnerOrderId: testOrderPattern },
          seasonPassOrders: { orderId: { $in: trackedReservations } },
        } }
      ));
      for (const event of allEvents) {
        const original = originalSold.get(String(event._id));
        if (!original) continue;
        event.ticketTypes = event.ticketTypes.map((ticket) => {
          const old = original.find((item) => item.name === ticket.name);
          if (old) ticket.sold = old.sold;
          return ticket;
        });
        await cleanupStep('event inventory restore', () => event.save());
      }
      if (usedRequestIds.length) {
        await cleanupStep('request audit cleanup', () => NuscPartnerRequest.deleteMany({ requestId: { $in: usedRequestIds } }));
      }
    }
    await mongoose.disconnect().catch(() => {});
    if (cleanupErrors.length) {
      console.error(`[NUSC partner acceptance] Cleanup issue(s): ${cleanupErrors.join('; ')}`);
    }
    if (scenarioError) throw scenarioError;
    if (cleanupErrors.length) throw new Error('Acceptance checks completed, but test cleanup was incomplete.');
  }
}

run().catch(async (error) => {
  console.error(`[NUSC partner acceptance] ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
