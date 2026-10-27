const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const crypto = require('crypto');
const { createRequire } = require('module');
const serverRequire = createRequire(path.join(__dirname, '..', 'package.json'));
const mongoose = serverRequire('mongoose');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Scan = require('../models/Scan');
const Inventory = require('../models/NuscHomeMatchInventory');
const NuscPartnerRequest = require('../models/NuscPartnerRequest');
const { createSeasonPassTicketRecords } = require('../services/nuscSeasonPassBookingService');
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
  const testScanBookingIds = [];
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

    const upgradeOldReservationId = reserved.json.reservation.reservationId;
    const upgradeOldBookings = await Booking.find({
      'nuscPartnerTicket.partnerId': 'nusc',
      'nuscPartnerTicket.reservationId': upgradeOldReservationId,
    }).sort({ nuscSeasonMatchIndex: 1 }).lean();
    assert(upgradeOldBookings.length === 10, 'Upgrade source General pass must contain ten issued tickets.');
    const usedGeneralTicket = upgradeOldBookings[0];
    await Booking.updateOne(
      { _id: usedGeneralTicket._id, status: 'confirmed' },
      { $set: { status: 'checked-in', entryVerified: true, entryVerifiedAt: new Date() } },
    );
    const usedScan = await Scan.create({
      ticket: usedGeneralTicket._id,
      event: usedGeneralTicket.event,
      partnerId: 'nusc',
      requestId: `${prefix}-upgrade-used-match`,
    });
    testScanBookingIds.push(usedGeneralTicket._id);

    const upgradePremiumHold = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-upgrade-premium`,
      memberReference,
      passId: 'premium-season',
    } });
    assert(upgradePremiumHold.status === 201, 'The same member should be able to hold a Premium pass for an upgrade.');
    trackedReservations.push(upgradePremiumHold.json.reservation.reservationId);
    const premiumReservationId = upgradePremiumHold.json.reservation.reservationId;
    const replacementPath = `/reservations/${encodeURIComponent(premiumReservationId)}/replace-general`;
    const replacementBody = { oldReservationId: upgradeOldReservationId, paymentId: `${prefix}-upgrade-payment` };
    await Inventory.updateOne(
      { key: 'nusc-il-2026-27', 'partnerSeasonPassReservations.reservationId': premiumReservationId },
      { $set: {
        'partnerSeasonPassReservations.$.expiresAt': new Date(Date.now() - 1000),
        'seasonPassOrders.$[hold].expiresAt': new Date(Date.now() - 1000),
      } },
      { arrayFilters: [{ 'hold.orderId': premiumReservationId }] },
    );
    const invalidExpiredReplacement = await callApi(replacementPath, {
      method: 'POST', body: replacementBody, invalidSignature: true,
    });
    const beforeExpiredReplacement = await Inventory.findOne({ key: 'nusc-il-2026-27' }).lean();
    const beforeExpiredGeneral = beforeExpiredReplacement.partnerSeasonPassReservations.find((item) => item.reservationId === upgradeOldReservationId);
    const beforeExpiredPremium = beforeExpiredReplacement.partnerSeasonPassReservations.find((item) => item.reservationId === premiumReservationId);
    const beforeExpiredGeneralBookings = await Booking.find({ _id: { $in: beforeExpiredGeneral.bookingIds } }).select('_id status').lean();
    assert(
      invalidExpiredReplacement.status === 401 && beforeExpiredGeneral.status === 'issued' &&
      beforeExpiredPremium.paymentId == null &&
      beforeExpiredGeneralBookings.filter((booking) => booking.status === 'confirmed').length === 9,
      'An invalid signature must not recover inventory or mutate the issued General pass.',
    );
    const [replacement, concurrentReplacement] = await Promise.all([
      callApi(replacementPath, { method: 'POST', body: replacementBody }),
      callApi(replacementPath, { method: 'POST', body: replacementBody }),
    ]);
    assert([replacement.status, concurrentReplacement.status].some((status) => status === 201), 'One concurrent expired-hold recovery must perform the replacement.');
    assert(
      [replacement, concurrentReplacement].every((result) => [200, 201].includes(result.status)) &&
      replacement.json.replacement?.issuedTicketCount === 9 &&
      concurrentReplacement.json.replacement?.issuedTicketCount === 9 &&
      replacement.json.replacement?.retainedUsedTicketCount === 1 &&
      replacement.json.replacement?.cancelledUnusedTicketCount === 9 &&
      JSON.stringify(replacement.json.tickets.map((ticket) => ticket.ticketId)) === JSON.stringify(concurrentReplacement.json.tickets.map((ticket) => ticket.ticketId)) &&
      replacement.json.tickets?.length === 9 &&
      !replacement.json.tickets.some((ticket) => ticket.match.matchIndex === 1),
      'Expired-hold recovery must issue only nine unused matches; concurrent retries must return the same Premium tickets.',
    );
    const replacementRetry = await callApi(replacementPath, { method: 'POST', body: replacementBody });
    assert(
      replacementRetry.status === 200 &&
      replacementRetry.json.replacement?.issuedTicketCount === 9 &&
      JSON.stringify(replacementRetry.json.tickets.map((ticket) => ticket.ticketId)) === JSON.stringify(replacement.json.tickets.map((ticket) => ticket.ticketId)),
      'A duplicate replacement request must return the same Premium ticket IDs without issuing another set.',
    );
    const oldReservationAfterUpgrade = await Inventory.findOne({ key: 'nusc-il-2026-27' }).lean();
    const oldPassRecord = oldReservationAfterUpgrade.partnerSeasonPassReservations.find((item) => item.reservationId === upgradeOldReservationId);
    const premiumPassRecord = oldReservationAfterUpgrade.partnerSeasonPassReservations.find((item) => item.reservationId === premiumReservationId);
    const oldPassBookingsAfterUpgrade = await Booking.find({ _id: { $in: oldPassRecord.bookingIds } })
      .select('_id status entryVerified nuscSeasonMatchIndex').lean();
    assert(
      oldPassRecord.status === 'replaced' &&
      premiumPassRecord.status === 'issued' &&
      oldPassBookingsAfterUpgrade.find((booking) => booking.nuscSeasonMatchIndex === 1)?.status === 'checked-in' &&
      oldPassBookingsAfterUpgrade.filter((booking) => booking.nuscSeasonMatchIndex !== 1).every((booking) => booking.status === 'cancelled') &&
      await Scan.countDocuments({ ticket: usedGeneralTicket._id, requestId: usedScan.requestId }) === 1,
      'Replacement must preserve the used ticket and scan history while cancelling every unused old ticket.',
    );
    const replacementBookings = await Booking.find({ _id: { $in: premiumPassRecord.bookingIds } })
      .select('_id paymentProvider razorpayOrderId razorpayPaymentId').lean();
    assert(
      replacementBookings.length === 9 && replacementBookings.every((booking) => (
        booking.paymentProvider === 'nusc-partner' && !booking.razorpayOrderId && !booking.razorpayPaymentId
      )),
      'Expired-hold recovery must issue tickets without creating an AHIBI Razorpay payment order.',
    );

    const scannerOrigin = new URL(base).origin;
    const oldUnusedTicket = upgradeOldBookings[1];
    const oldQrResponse = await fetch(`${scannerOrigin}/api/bookings/verify-qr`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bookingId: String(oldUnusedTicket._id) }),
    });
    const oldQrResult = await oldQrResponse.json();
    assert(
      oldQrResponse.status === 200 &&
      oldQrResult.status === 'INVALID' &&
      String(oldQrResult.message).includes('cancelled'),
      'The scanner must reject an unused General QR after its reservation has been replaced.',
    );

    const replacementStatus = await callApi(`/reservations/${encodeURIComponent(premiumReservationId)}`);
    assert(
      replacementStatus.status === 200 &&
      replacementStatus.json.reservation?.status === 'issued' &&
      replacementStatus.json.replacement?.issuedTicketCount === 9 &&
      replacementStatus.json.tickets?.length === 9,
      'Status lookup must report an issued partial Premium pass with only its nine tickets.',
    );

    const fullRecoveryMember = `member-full-recovery-${testRun}`;
    const fullRecoveryGeneral = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-full-recovery-general`, memberReference: fullRecoveryMember,
      passId: 'general-season', zone: selectedZone,
    } });
    assert(fullRecoveryGeneral.status === 201, 'Full recovery General reservation should succeed.');
    trackedReservations.push(fullRecoveryGeneral.json.reservation.reservationId);
    const fullRecoveryGeneralId = fullRecoveryGeneral.json.reservation.reservationId;
    const fullRecoveryIssued = await callApi(`/reservations/${encodeURIComponent(fullRecoveryGeneralId)}/confirm`, {
      method: 'POST', body: { paymentId: `${prefix}-full-recovery-general-payment` },
    });
    assert(fullRecoveryIssued.status === 201 && fullRecoveryIssued.json.tickets?.length === 10, 'Full recovery General pass should issue ten tickets.');
    const fullRecoveryPremium = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-full-recovery-premium`, memberReference: fullRecoveryMember, passId: 'premium-season',
    } });
    assert(fullRecoveryPremium.status === 201, 'Full recovery Premium reservation should succeed.');
    trackedReservations.push(fullRecoveryPremium.json.reservation.reservationId);
    const fullRecoveryPremiumId = fullRecoveryPremium.json.reservation.reservationId;
    const fullRecoveryPremiumRecord = await Inventory.findOne({ key: 'nusc-il-2026-27' }).lean();
    assert(
      fullRecoveryPremiumRecord.partnerSeasonPassReservations.find((item) => item.reservationId === fullRecoveryPremiumId)?.zone === null,
      'Premium recovery fixture must retain a null zone before its hold expires.',
    );
    await Inventory.updateOne(
      { key: 'nusc-il-2026-27', 'partnerSeasonPassReservations.reservationId': fullRecoveryPremiumId },
      { $set: {
        'partnerSeasonPassReservations.$.expiresAt': new Date(Date.now() - 1000),
        'seasonPassOrders.$[hold].expiresAt': new Date(Date.now() - 1000),
      } },
      { arrayFilters: [{ 'hold.orderId': fullRecoveryPremiumId }] },
    );
    const fullRecovery = await callApi(`/reservations/${encodeURIComponent(fullRecoveryPremiumId)}/replace-general`, {
      method: 'POST', body: { oldReservationId: fullRecoveryGeneralId, paymentId: `${prefix}-full-recovery-payment` },
    });
    assert(
      fullRecovery.status === 201 && fullRecovery.json.tickets?.length === 10 &&
      fullRecovery.json.replacement?.issuedTicketCount === 10 && fullRecovery.json.replacement?.retainedUsedTicketCount === 0,
      'Expired Premium inventory must be reacquired for all ten unused matches.',
    );
    const fullRecoveryStatus = await callApi(`/reservations/${encodeURIComponent(fullRecoveryPremiumId)}`);
    assert(fullRecoveryStatus.status === 200 && fullRecoveryStatus.json.tickets?.length === 10, 'Recovered full pass status must list all ten tickets.');
    passed += 1;

    const missingRecoveryMember = `member-missing-recovery-${testRun}`;
    const missingRecoveryGeneral = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-missing-recovery-general`, memberReference: missingRecoveryMember,
      passId: 'general-season', zone: selectedZone,
    } });
    assert(missingRecoveryGeneral.status === 201, 'Missing-ticket recovery General fixture should succeed.');
    trackedReservations.push(missingRecoveryGeneral.json.reservation.reservationId);
    const missingRecoveryGeneralId = missingRecoveryGeneral.json.reservation.reservationId;
    const missingRecoveryGeneralIssued = await callApi(`/reservations/${encodeURIComponent(missingRecoveryGeneralId)}/confirm`, {
      method: 'POST', body: { paymentId: `${prefix}-missing-recovery-general-payment` },
    });
    assert(missingRecoveryGeneralIssued.status === 201, 'Missing-ticket recovery General pass should issue ten tickets.');
    const missingRecoveryPremium = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-missing-recovery-premium`, memberReference: missingRecoveryMember, passId: 'premium-season',
    } });
    assert(missingRecoveryPremium.status === 201, 'Missing-ticket recovery Premium reservation should succeed.');
    trackedReservations.push(missingRecoveryPremium.json.reservation.reservationId);
    const missingRecoveryPremiumId = missingRecoveryPremium.json.reservation.reservationId;
    const missingRecoveryPaymentId = `${prefix}-missing-recovery-upgrade-payment`;
    const missingRecoverySetup = await Inventory.findOne({ key: 'nusc-il-2026-27' }).lean();
    const missingRecoveryPremiumSetup = missingRecoverySetup.partnerSeasonPassReservations.find((item) => item.reservationId === missingRecoveryPremiumId);
    const generalBookings = await Booking.find({ _id: { $in: missingRecoveryGeneralIssued.json.tickets.map((ticket) => ticket.ticketId) } });
    const generalByIndex = new Map(generalBookings.map((booking) => [Number(booking.nuscSeasonMatchIndex), booking]));
    await Booking.updateMany({ _id: { $in: [generalByIndex.get(1)._id, generalByIndex.get(2)._id] } }, {
      $set: { entryVerified: true, entryVerifiedAt: new Date() },
    });
    await Booking.updateMany({ _id: { $in: [...generalByIndex.entries()].filter(([index]) => index > 2).map(([, booking]) => booking._id) } }, {
      $set: { status: 'cancelled', 'nuscPartnerTicket.replacedByReservationId': missingRecoveryPremiumId },
    });

    const partialPremiumTickets = await createSeasonPassTicketRecords({
      orderId: missingRecoveryPremium.json.reservation.partnerOrderId,
      fixtures: catalog.json.matches.filter((match) => match.matchIndex >= 3).map((match) => ({
        eventId: match.eventId, matchDate: match.matchDate, matchIndex: match.matchIndex, ticketType: 'Premium Pass',
      })),
      passId: 'premium-season', quantity: 1, paymentId: missingRecoveryPaymentId,
      paymentProvider: 'nusc-partner', memberReferenceHash: missingRecoveryPremiumSetup.memberReferenceHash,
      reservationId: missingRecoveryPremiumId, partnerId: 'nusc',
    });
    const preservedPremiumTicket = partialPremiumTickets.bookings.find((booking) => booking.nuscSeasonMatchIndex === 3);
    preservedPremiumTicket.status = 'checked-in';
    preservedPremiumTicket.entryVerified = true;
    preservedPremiumTicket.entryVerifiedAt = new Date();
    await preservedPremiumTicket.save();
    const preservedPremiumScan = await Scan.create({
      ticket: preservedPremiumTicket._id, event: preservedPremiumTicket.event, partnerId: 'nusc',
      requestId: `${prefix}-preserved-premium-scan`,
    });
    testScanBookingIds.push(preservedPremiumTicket._id);
    const missingRecoveryInventory = await Inventory.findOne({ key: 'nusc-il-2026-27' });
    const generalPassRecord = missingRecoveryInventory.partnerSeasonPassReservations.find((item) => item.reservationId === missingRecoveryGeneralId);
    const missingRecoveryPremiumRecord = missingRecoveryInventory.partnerSeasonPassReservations.find((item) => item.reservationId === missingRecoveryPremiumId);
    generalPassRecord.status = 'replaced';
    generalPassRecord.replacedByReservationId = missingRecoveryPremiumId;
    missingRecoveryPremiumRecord.status = 'issued';
    missingRecoveryPremiumRecord.paymentId = missingRecoveryPaymentId;
    missingRecoveryPremiumRecord.replacesReservationId = missingRecoveryGeneralId;
    missingRecoveryPremiumRecord.replacementMatchIndices = [3, 4, 5, 6, 7, 8, 9, 10];
    missingRecoveryPremiumRecord.replacementUsedTicketCount = 2;
    missingRecoveryPremiumRecord.replacementCancelledTicketCount = 8;
    missingRecoveryPremiumRecord.bookingIds = partialPremiumTickets.bookingIds;
    missingRecoveryInventory.seasonPassOrders = missingRecoveryInventory.seasonPassOrders.filter((item) => item.orderId !== missingRecoveryPremiumId);
    await missingRecoveryInventory.save();
    await Inventory.updateOne(
      { key: 'nusc-il-2026-27', 'partnerSeasonPassReservations.reservationId': missingRecoveryPremiumId },
      { $unset: { 'partnerSeasonPassReservations.$.recoveryStatus': 1 } },
    );

    const recoverPath = `/reservations/${encodeURIComponent(missingRecoveryPremiumId)}/recover-missing-general-tickets`;
    const recoveryBody = { oldReservationId: missingRecoveryGeneralId, paymentId: missingRecoveryPaymentId };
    const invalidRecovery = await callApi(recoverPath, { method: 'POST', body: recoveryBody, invalidSignature: true });
    const beforeInvalidRecovery = await Inventory.findOne({ key: 'nusc-il-2026-27' }).lean();
    const untouchedPremium = beforeInvalidRecovery.partnerSeasonPassReservations.find((item) => item.reservationId === missingRecoveryPremiumId);
    assert(invalidRecovery.status === 401 && untouchedPremium.recoveryStatus !== 'issuing' && untouchedPremium.bookingIds.length === 8,
      'Invalid recovery signatures must not reserve inventory or issue tickets.');

    const [missingRecovery, missingRecoveryRetry] = await Promise.all([
      callApi(recoverPath, { method: 'POST', body: recoveryBody }),
      callApi(recoverPath, { method: 'POST', body: recoveryBody }),
    ]);
    const recoveredIds = missingRecovery.json.tickets?.map((ticket) => ticket.ticketId);
    assert(
      [missingRecovery, missingRecoveryRetry].every((result) => [200, 201].includes(result.status)) &&
      missingRecovery.json.recovery?.issuedTicketCount === 10 &&
      missingRecovery.json.recovery?.recoveredTicketCount === 2 &&
      missingRecovery.json.recovery?.retainedUsedTicketCount === 0 &&
      missingRecovery.json.tickets?.length === 10 &&
      missingRecovery.json.tickets.find((ticket) => ticket.match.matchIndex === 1)?.match.opponent === 'Gokulam Kerala FC' &&
      missingRecovery.json.tickets.find((ticket) => ticket.match.matchIndex === 2)?.match.opponent === 'Dempo SC' &&
      JSON.stringify(recoveredIds) === JSON.stringify(missingRecoveryRetry.json.tickets?.map((ticket) => ticket.ticketId)),
      'Concurrent recovery retries must issue exactly the missing two fixtures and return the same ten Premium tickets.',
    );
    const recoveredPremium = await Inventory.findOne({ key: 'nusc-il-2026-27' }).lean();
    const recoveredPremiumRecord = recoveredPremium.partnerSeasonPassReservations.find((item) => item.reservationId === missingRecoveryPremiumId);
    const recoveredPremiumBookings = await Booking.find({ _id: { $in: recoveredPremiumRecord.bookingIds } }).lean();
    const oldTargetsAfterRecovery = await Booking.find({ _id: { $in: [generalByIndex.get(1)._id, generalByIndex.get(2)._id] } }).lean();
    assert(
      recoveredPremiumBookings.length === 10 && recoveredPremiumBookings.every((booking) => booking.paymentProvider === 'nusc-partner' && !booking.razorpayOrderId && !booking.razorpayPaymentId) &&
      recoveredPremiumBookings.filter((booking) => booking.nuscSeasonMatchIndex >= 3).every((booking) => partialPremiumTickets.bookingIds.some((id) => String(id) === String(booking._id))) &&
      oldTargetsAfterRecovery.every((booking) => booking.status === 'cancelled') &&
      await Scan.countDocuments({ _id: preservedPremiumScan._id, ticket: preservedPremiumTicket._id, event: preservedPremiumTicket.event }) === 1,
      'Recovery must preserve all eight existing Premium booking IDs and scan history, cancel the two old unused General tickets, and create no AHIBI Razorpay order.',
    );
    const missingRecoveryStatus = await callApi(`/reservations/${encodeURIComponent(missingRecoveryPremiumId)}`);
    assert(missingRecoveryStatus.status === 200 && missingRecoveryStatus.json.tickets?.length === 10,
      'Status lookup must report all ten Premium tickets after missing-ticket recovery.');
    passed += 1;

    const scannedTargetMember = `member-scanned-target-${testRun}`;
    const scannedTargetGeneral = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-scanned-target-general`, memberReference: scannedTargetMember,
      passId: 'general-season', zone: selectedZone,
    } });
    trackedReservations.push(scannedTargetGeneral.json.reservation.reservationId);
    const scannedTargetGeneralId = scannedTargetGeneral.json.reservation.reservationId;
    const scannedTargetIssued = await callApi(`/reservations/${encodeURIComponent(scannedTargetGeneralId)}/confirm`, {
      method: 'POST', body: { paymentId: `${prefix}-scanned-target-general-payment` },
    });
    const scannedTargetPremium = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-scanned-target-premium`, memberReference: scannedTargetMember, passId: 'premium-season',
    } });
    trackedReservations.push(scannedTargetPremium.json.reservation.reservationId);
    const scannedTargetPremiumId = scannedTargetPremium.json.reservation.reservationId;
    const scannedTargetPayment = `${prefix}-scanned-target-upgrade-payment`;
    const scannedTargetSetup = await Inventory.findOne({ key: 'nusc-il-2026-27' }).lean();
    const scannedTargetPremiumSetup = scannedTargetSetup.partnerSeasonPassReservations.find((item) => item.reservationId === scannedTargetPremiumId);
    const scannedTargetGeneralBookings = await Booking.find({ _id: { $in: scannedTargetIssued.json.tickets.map((ticket) => ticket.ticketId) } });
    const scannedTarget = scannedTargetGeneralBookings.find((booking) => booking.nuscSeasonMatchIndex === 1);
    await Scan.create({ ticket: scannedTarget._id, event: scannedTarget.event, partnerId: 'nusc', requestId: `${prefix}-scanned-target` });
    testScanBookingIds.push(scannedTarget._id);
    const scannedTargetPremiumBookings = await createSeasonPassTicketRecords({
      orderId: scannedTargetPremium.json.reservation.partnerOrderId,
      fixtures: catalog.json.matches.filter((match) => match.matchIndex >= 3).map((match) => ({
        eventId: match.eventId, matchDate: match.matchDate, matchIndex: match.matchIndex, ticketType: 'Premium Pass',
      })),
      passId: 'premium-season', quantity: 1, paymentId: scannedTargetPayment, paymentProvider: 'nusc-partner',
      memberReferenceHash: scannedTargetPremiumSetup.memberReferenceHash,
      reservationId: scannedTargetPremiumId, partnerId: 'nusc',
    });
    const scannedTargetInventory = await Inventory.findOne({ key: 'nusc-il-2026-27' });
    const scannedGeneralRecord = scannedTargetInventory.partnerSeasonPassReservations.find((item) => item.reservationId === scannedTargetGeneralId);
    const scannedPremiumRecord = scannedTargetInventory.partnerSeasonPassReservations.find((item) => item.reservationId === scannedTargetPremiumId);
    scannedGeneralRecord.status = 'replaced';
    scannedGeneralRecord.replacedByReservationId = scannedTargetPremiumId;
    scannedPremiumRecord.status = 'issued';
    scannedPremiumRecord.paymentId = scannedTargetPayment;
    scannedPremiumRecord.replacesReservationId = scannedTargetGeneralId;
    scannedPremiumRecord.replacementMatchIndices = [3, 4, 5, 6, 7, 8, 9, 10];
    scannedPremiumRecord.replacementUsedTicketCount = 2;
    scannedPremiumRecord.replacementCancelledTicketCount = 8;
    scannedPremiumRecord.bookingIds = scannedTargetPremiumBookings.bookingIds;
    scannedTargetInventory.seasonPassOrders = scannedTargetInventory.seasonPassOrders.filter((item) => item.orderId !== scannedTargetPremiumId);
    await scannedTargetInventory.save();
    const scannedTargetResponse = await callApi(`/reservations/${encodeURIComponent(scannedTargetPremiumId)}/recover-missing-general-tickets`, {
      method: 'POST', body: { oldReservationId: scannedTargetGeneralId, paymentId: scannedTargetPayment },
    });
    const afterScannedTarget = await Inventory.findOne({ key: 'nusc-il-2026-27' }).lean();
    const scannedTargetRecordAfter = afterScannedTarget.partnerSeasonPassReservations.find((item) => item.reservationId === scannedTargetPremiumId);
    assert(scannedTargetResponse.status === 409 && scannedTargetResponse.json.code === 'TARGET_MATCH_ALREADY_CHECKED_IN' &&
      scannedTargetRecordAfter.recoveryStatus !== 'issuing' && scannedTargetRecordAfter.bookingIds.length === 8,
      'Recovery must refuse both missing tickets if either target fixture has a valid event-scoped Scan record.');
    passed += 1;

    const soldOutRecoveryMember = `member-sold-out-recovery-${testRun}`;
    const soldOutRecoveryGeneral = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-sold-out-recovery-general`, memberReference: soldOutRecoveryMember,
      passId: 'general-season', zone: selectedZone,
    } });
    assert(soldOutRecoveryGeneral.status === 201, 'Sold-out recovery General reservation should succeed.');
    trackedReservations.push(soldOutRecoveryGeneral.json.reservation.reservationId);
    const soldOutRecoveryGeneralId = soldOutRecoveryGeneral.json.reservation.reservationId;
    const soldOutRecoveryIssued = await callApi(`/reservations/${encodeURIComponent(soldOutRecoveryGeneralId)}/confirm`, {
      method: 'POST', body: { paymentId: `${prefix}-sold-out-general-payment` },
    });
    assert(soldOutRecoveryIssued.status === 201 && soldOutRecoveryIssued.json.tickets?.length === 10, 'Sold-out recovery General pass should issue ten tickets.');
    const soldOutRecoveryPremium = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-sold-out-recovery-premium`, memberReference: soldOutRecoveryMember, passId: 'premium-season',
    } });
    assert(soldOutRecoveryPremium.status === 201, 'Sold-out recovery Premium reservation should initially succeed.');
    trackedReservations.push(soldOutRecoveryPremium.json.reservation.reservationId);
    const soldOutRecoveryPremiumId = soldOutRecoveryPremium.json.reservation.reservationId;
    await Inventory.updateOne(
      { key: 'nusc-il-2026-27', 'partnerSeasonPassReservations.reservationId': soldOutRecoveryPremiumId },
      { $set: {
        'partnerSeasonPassReservations.$.expiresAt': new Date(Date.now() - 1000),
        'seasonPassOrders.$[hold].expiresAt': new Date(Date.now() - 1000),
      } },
      { arrayFilters: [{ 'hold.orderId': soldOutRecoveryPremiumId }] },
    );
    const soldOutPremiumTicket = allEvents[0].ticketTypes.find((ticket) => ticket.name === 'Premium Pass');
    soldOutPremiumTicket.sold = Number(soldOutPremiumTicket.quantity || 250);
    await allEvents[0].save();
    const soldOutRecovery = await callApi(`/reservations/${encodeURIComponent(soldOutRecoveryPremiumId)}/replace-general`, {
      method: 'POST', body: { oldReservationId: soldOutRecoveryGeneralId, paymentId: `${prefix}-sold-out-upgrade-payment` },
    });
    const afterSoldOutRecovery = await Inventory.findOne({ key: 'nusc-il-2026-27' }).lean();
    const soldOutOldRecord = afterSoldOutRecovery.partnerSeasonPassReservations.find((item) => item.reservationId === soldOutRecoveryGeneralId);
    const soldOutPremiumRecord = afterSoldOutRecovery.partnerSeasonPassReservations.find((item) => item.reservationId === soldOutRecoveryPremiumId);
    const soldOutExpiredHold = afterSoldOutRecovery.seasonPassOrders.find((item) => item.orderId === soldOutRecoveryPremiumId);
    const soldOutOldBookings = await Booking.find({ _id: { $in: soldOutOldRecord.bookingIds } }).select('_id status').lean();
    assert(
      soldOutRecovery.status === 409 && soldOutRecovery.json.code === 'PREMIUM_INVENTORY_UNAVAILABLE' &&
      soldOutOldRecord.status === 'issued' && soldOutOldBookings.length === 10 && soldOutOldBookings.every((booking) => booking.status === 'confirmed') &&
      soldOutPremiumRecord.status === 'held' && soldOutPremiumRecord.paymentId == null &&
      soldOutPremiumRecord.zone === null &&
      soldOutExpiredHold && new Date(soldOutExpiredHold.expiresAt) < new Date(),
      'Sold-out recovery must leave General tickets unchanged and must not bind or issue the Premium reservation.',
    );
    const originalFirstEventPremium = originalSold.get(String(allEvents[0]._id))
      .find((ticket) => ticket.name === 'Premium Pass');
    allEvents[0].ticketTypes.find((ticket) => ticket.name === 'Premium Pass').sold = originalFirstEventPremium.sold;
    await allEvents[0].save();
    passed += 1;

    const wrongMemberGeneral = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-wrong-member-general`,
      memberReference: `member-wrong-general-${testRun}`,
      passId: 'general-season',
      zone: selectedZone,
    } });
    assert(wrongMemberGeneral.status === 201, 'Wrong-member General fixture reservation should succeed.');
    trackedReservations.push(wrongMemberGeneral.json.reservation.reservationId);
    const wrongMemberGeneralId = wrongMemberGeneral.json.reservation.reservationId;
    const wrongMemberIssued = await callApi(`/reservations/${encodeURIComponent(wrongMemberGeneralId)}/confirm`, {
      method: 'POST', body: { paymentId: `${prefix}-wrong-member-general-payment` },
    });
    assert(wrongMemberIssued.status === 201 && wrongMemberIssued.json.tickets?.length === 10, 'Wrong-member General fixture should issue ten test tickets.');
    const wrongMemberPremium = await callApi(reservePath, { method: 'POST', body: {
      partnerOrderId: `${prefix}-wrong-member-premium`,
      memberReference: `member-wrong-premium-${testRun}`,
      passId: 'premium-season',
    } });
    assert(wrongMemberPremium.status === 201, 'Different-member Premium hold should succeed.');
    trackedReservations.push(wrongMemberPremium.json.reservation.reservationId);
    const wrongMemberPremiumId = wrongMemberPremium.json.reservation.reservationId;
    const wrongMemberReplacement = await callApi(`/reservations/${encodeURIComponent(wrongMemberPremiumId)}/replace-general`, {
      method: 'POST',
      body: { oldReservationId: wrongMemberGeneralId, paymentId: `${prefix}-wrong-member-upgrade-payment` },
    });
    const afterWrongMemberAttempt = await Inventory.findOne({ key: 'nusc-il-2026-27' }).lean();
    const wrongOldRecord = afterWrongMemberAttempt.partnerSeasonPassReservations.find((item) => item.reservationId === wrongMemberGeneralId);
    const wrongPremiumRecord = afterWrongMemberAttempt.partnerSeasonPassReservations.find((item) => item.reservationId === wrongMemberPremiumId);
    assert(
      wrongMemberReplacement.status === 409 &&
      wrongMemberReplacement.json.code === 'MEMBER_MISMATCH' &&
      wrongOldRecord.status === 'issued' &&
      wrongPremiumRecord.status === 'held',
      'A replacement between different member reservations must fail without changing either pass.',
    );
    const invalidReplacementSignature = await callApi(replacementPath, {
      method: 'POST', body: replacementBody, invalidSignature: true,
    });
    assert(
      invalidReplacementSignature.status === 401 &&
      invalidReplacementSignature.json.code === 'INVALID_PARTNER_SIGNATURE',
      'Replacement must reject an invalid partner HMAC.',
    );
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
      if (testScanBookingIds.length) {
        await cleanupStep('scan cleanup', () => Scan.deleteMany({ ticket: { $in: testScanBookingIds } }));
      }
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
