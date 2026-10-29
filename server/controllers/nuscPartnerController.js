const crypto = require('crypto');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Inventory = require('../models/NuscHomeMatchInventory');
const inventory = require('../services/nuscHomeMatchInventoryService');
const { createSeasonPassTicketRecords } = require('../services/nuscSeasonPassBookingService');
const {
  ReplacementError,
  beginPartnerSeasonPassReplacement,
  completePartnerSeasonPassReplacement,
  recoverMissingGeneralReplacementTickets,
} = require('../services/nuscSeasonPassReplacementService');
const {
  createOfficialTicketPdfBuffer,
  mergeTicketEvent,
} = require('../services/officialTicketPdfService');
const {
  finishStage,
  measureStage,
  measureSyncStage,
  startStage,
} = require('../middlewares/nuscSeasonPassTiming');

const PARTNER_ID = 'nusc';
const INVENTORY_KEY = 'nusc-il-2026-27';
const PASS_OPTIONS = {
  'general-season': { ticketType: 'General Pass', requiresZone: true },
  'premium-season': { ticketType: 'Premium Pass', requiresZone: false },
};
const ZONES = new Set(['G-1', 'G-2', 'G-3', 'G-4', 'G-5']);

function deterministicReservationId(partnerOrderId) {
  return `nsp_${crypto.createHash('sha256').update(`${PARTNER_ID}:${partnerOrderId}`).digest('hex').slice(0, 40)}`;
}

function hashMemberReference(reference) {
  return crypto.createHash('sha256').update(`${PARTNER_ID}\0${reference}`).digest('hex');
}

function syntheticOwnerId(memberReferenceHash) {
  // Inventory's existing per-buyer limit uses ObjectIds; this stable pseudonymous
  // value is never inserted into User or used to authenticate an Ahibi account.
  return memberReferenceHash.slice(0, 24);
}

function getSeasonFixtures(events) {
  const bySlug = new Map(events.map((event) => [event.slug, event]));
  return inventory.FIXTURE_MATCHES.map((fixture, index) => {
    const event = bySlug.get(`nusc-home-match-${fixture.date.replace(/-/g, '')}`);
    return event ? { ...fixture, matchDate: fixture.date, matchIndex: index + 1, event } : null;
  });
}

async function loadSeasonFixtures({ allowClosed = false } = {}) {
  const slugs = inventory.FIXTURE_MATCHES.map(({ date }) => `nusc-home-match-${date.replace(/-/g, '')}`);
  const events = await Event.find({ slug: { $in: slugs } }).select('+ticketTypes');
  const fixtures = getSeasonFixtures(events);
  if (fixtures.some((item) => !item || item.event.status !== 'approved' || item.event.isPublic === false)) {
    const error = new Error('All ten NUSC home fixtures must be available.');
    error.code = 'FIXTURES_UNAVAILABLE';
    throw error;
  }
  if (!allowClosed && new Date(fixtures[0].event.startDate) <= new Date()) {
    const error = new Error('Season pass reservations have closed.');
    error.code = 'SALES_CLOSED';
    throw error;
  }
  return fixtures;
}

function shapeTickets(reservation, bookings) {
  const byMatchIndex = new Map(bookings.map((booking) => [booking.nuscSeasonMatchIndex, booking]));
  return (reservation.eventIds || []).map((eventId, index) => {
    const booking = byMatchIndex.get(index + 1);
    const fixture = inventory.FIXTURE_MATCHES[index];
    return {
      match: {
        matchIndex: index + 1,
        eventId: String(eventId),
        matchDate: fixture?.date,
        opponent: fixture?.opponent,
      },
      ticketId: booking ? String(booking._id) : null,
      status: booking?.status || 'pending',
      ticketType: reservation.ticketType,
      ...(reservation.zone && { zone: reservation.zone }),
      ticketAccessPath: booking
        ? `/api/nusc-partner/v1/reservations/${encodeURIComponent(reservation.reservationId)}/tickets/${encodeURIComponent(String(booking._id))}`
        : null,
    };
  });
}

async function findPartnerReservation(reservationId) {
  const inventoryDoc = await Inventory.findOne({ key: INVENTORY_KEY }).lean();
  const reservation = (inventoryDoc?.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
  return reservation ? { inventoryDoc, reservation } : null;
}

async function reserveSeasonPass(req, res) {
  try {
    const partnerOrderId = String(req.body?.partnerOrderId || '').trim();
    const memberReference = String(req.body?.memberReference || '').trim();
    const passId = String(req.body?.passId || '').trim();
    const zoneInput = req.body?.zone == null ? null : String(req.body.zone).trim();
    const pass = PASS_OPTIONS[passId];
    if (!/^[A-Za-z0-9._:-]{6,120}$/.test(partnerOrderId) || !/^[A-Za-z0-9._:-]{4,128}$/.test(memberReference) || !pass) {
      return res.status(400).json({ success: false, code: 'INVALID_RESERVATION_REQUEST' });
    }
    if ((pass.requiresZone && !ZONES.has(zoneInput)) || (!pass.requiresZone && zoneInput !== null)) {
      return res.status(400).json({ success: false, code: 'INVALID_ZONE' });
    }

    const reservationId = deterministicReservationId(partnerOrderId);
    const memberReferenceHash = hashMemberReference(memberReference);
    const existing = await measureStage(req, 'existing_reservation_lookup', () =>
      inventory.getPartnerSeasonPassReservation(reservationId)
    );
    if (existing) {
      if (existing.memberReferenceHash !== memberReferenceHash || existing.passId !== passId || (existing.zone || null) !== zoneInput) {
        return res.status(409).json({ success: false, code: 'ORDER_CONFLICT' });
      }
      return sendReservationResponse(req, res, 200, existing);
    }

    const fixtureStageStartedAt = startStage(req);
    let fixtures;
    try {
      fixtures = await loadSeasonFixtures();
      for (const fixture of fixtures) {
        if (!fixture.event.ticketTypes.some((ticket) => ticket.name === pass.ticketType)) {
          return res.status(409).json({ success: false, code: 'PASS_NOT_CONFIGURED_FOR_ALL_FIXTURES' });
        }
      }
    } finally {
      finishStage(req, 'fixture_query_validation', fixtureStageStartedAt);
    }

    const zoneSoldByDate = {};
    if (zoneInput) {
      await measureStage(req, 'general_zone_booking_counts', () =>
        Promise.all(fixtures.map(async (fixture) => {
          zoneSoldByDate[fixture.matchDate] = await Booking.countDocuments({
            event: fixture.event._id,
            ticketType: pass.ticketType,
            nuscGeneralZone: zoneInput,
            bookingSource: { $ne: 'on-spot' },
            status: { $in: ['confirmed', 'checked-in'] },
            paymentStatus: 'completed',
          });
        }))
      );
    }

    const hold = await measureStage(req, 'inventory_hold_cas', () =>
      inventory.reserveSeasonPassOrder({
        orderId: reservationId,
        userId: syntheticOwnerId(memberReferenceHash),
        ticketType: pass.ticketType,
        quantity: 1,
        zone: zoneInput,
        zoneSoldByDate,
        allowSalesClosed: true,
        matches: fixtures.map(({ matchDate, event }) => ({ matchDate, ticketTypes: event.ticketTypes })),
      })
    );

    let reservation;
    try {
      reservation = await measureStage(req, 'partner_reservation_cas', () =>
        inventory.recordPartnerSeasonPassReservation({
          reservationId,
          partnerOrderId,
          memberReferenceHash,
          passId,
          ticketType: pass.ticketType,
          zone: zoneInput,
          matchDates: inventory.FIXTURE_DATES,
          eventIds: fixtures.map(({ event }) => event._id),
          status: 'held',
          expiresAt: hold.expiresAt,
          paymentId: null,
          bookingIds: [],
          createdAt: new Date(),
          issuedAt: null,
        })
      );
    } catch (error) {
      await inventory.releaseSeasonPassOrder(reservationId).catch(() => {});
      throw error;
    }
    return sendReservationResponse(req, res, 201, reservation);
  } catch (error) {
    if (error.code && ['TICKETS_UNAVAILABLE', 'ZONE_UNAVAILABLE', 'BUYER_TICKET_LIMIT', 'TICKET_NOT_CONFIGURED', 'INVALID_ZONE', 'ORDER_CONFLICT'].includes(error.code)) {
      return res.status(409).json({ success: false, code: error.code, message: error.message });
    }
    if (error.code === 'FIXTURES_UNAVAILABLE' || error.code === 'SALES_CLOSED') {
      return res.status(409).json({ success: false, code: error.code, message: error.message });
    }
    console.error('[NUSC partner API] Reservation failed:', error.message);
    return res.status(500).json({ success: false, code: 'RESERVATION_FAILED' });
  }
}

function sendReservationResponse(req, res, status, reservation) {
  return measureSyncStage(req, 'response_build', () =>
    res.status(status).json({ success: true, reservation: reservationResponse(reservation) })
  );
}

async function getCatalog(req, res) {
  try {
    const fixtures = await loadSeasonFixtures({ allowClosed: true });
    return res.json({
      success: true,
      passes: Object.entries(PASS_OPTIONS).map(([passId, pass]) => ({
        passId,
        ticketType: pass.ticketType,
        generalZoneRequired: pass.requiresZone,
        zoneRule: pass.requiresZone ? 'one selected zone is applied to all ten matches' : null,
      })),
      matches: fixtures.map(({ matchDate, matchIndex, opponent, event }) => ({
        matchIndex,
        matchDate,
        opponent,
        eventId: String(event._id),
        eventSlug: event.slug,
      })),
    });
  } catch (error) {
    if (error.code === 'FIXTURES_UNAVAILABLE') return res.status(409).json({ success: false, code: error.code });
    console.error('[NUSC partner API] Season catalog failed:', error.message);
    return res.status(500).json({ success: false, code: 'CATALOG_UNAVAILABLE' });
  }
}

function reservationResponse(reservation) {
  const expired = reservation.status === 'held' && new Date(reservation.expiresAt) <= new Date();
  return {
    reservationId: reservation.reservationId,
    partnerOrderId: reservation.partnerOrderId,
    passId: reservation.passId,
    status: expired ? 'expired' : reservation.status,
    expiresAt: reservation.expiresAt,
    matches: (reservation.eventIds || []).map((eventId, index) => ({
      eventId: String(eventId),
      matchDate: reservation.matchDates[index],
      opponent: inventory.FIXTURE_MATCHES[index]?.opponent,
    })),
    ...(reservation.zone && { zone: reservation.zone }),
  };
}

async function confirmAndIssue(req, res) {
  const reservationId = String(req.params.reservationId || '');
  const paymentId = String(req.body?.paymentId || '').trim();
  if (!/^nsp_[a-f0-9]{40}$/.test(reservationId) || !/^[A-Za-z0-9._:-]{6,128}$/.test(paymentId)) {
    return res.status(400).json({ success: false, code: 'INVALID_CONFIRM_REQUEST' });
  }
  try {
    const selected = await findPartnerReservation(reservationId);
    if (!selected) return res.status(404).json({ success: false, code: 'RESERVATION_NOT_FOUND' });
    const { reservation } = selected;
    const result = await inventory.beginPartnerSeasonPassIssuance(reservationId, paymentId);
    if (!result.alreadyIssued) {
      const fixtures = reservation.eventIds.map((eventId, index) => ({
        eventId,
        matchDate: reservation.matchDates[index],
        matchIndex: index + 1,
        ticketType: reservation.ticketType,
      }));
      const issued = await createSeasonPassTicketRecords({
        orderId: reservation.partnerOrderId,
        fixtures,
        passId: reservation.passId,
        quantity: 1,
        paymentId,
        paymentProvider: 'nusc-partner',
        zone: reservation.zone,
        memberReferenceHash: reservation.memberReferenceHash,
        reservationId,
        partnerId: PARTNER_ID,
      });
      await inventory.completePartnerSeasonPassIssuance(reservationId, issued.bookingIds);
    }
    const current = await inventory.getPartnerSeasonPassReservation(reservationId);
    const bookings = await Booking.find({
      'nuscPartnerTicket.partnerId': PARTNER_ID,
      'nuscPartnerTicket.partnerOrderId': current.partnerOrderId,
    }).sort({ 'nuscPartnerTicket.ticketIndex': 1 }).lean();
    if (bookings.length !== inventory.FIXTURE_DATES.length) {
      console.error('[NUSC partner API] Issued reservation has an incomplete ticket set.');
      return res.status(500).json({ success: false, code: 'ISSUANCE_PENDING' });
    }
    return res.status(result.alreadyIssued ? 200 : 201).json({
      success: true,
      issuance: { reservationId, partnerOrderId: current.partnerOrderId, paymentId, status: 'issued' },
      tickets: shapeTickets(current, bookings),
    });
  } catch (error) {
    if (error.code === 'HOLD_EXPIRED' || error.code === 'PAYMENT_CONFLICT' || error.code === 'PAYMENT_ALREADY_USED' || error.code === 'RESERVATION_NOT_ACTIVE') {
      return res.status(409).json({ success: false, code: error.code, message: error.message });
    }
    console.error('[NUSC partner API] Ticket issuance failed:', error.message);
    return res.status(500).json({ success: false, code: 'ISSUANCE_PENDING' });
  }
}


async function replaceGeneralWithPremium(req, res) {
  const premiumReservationId = String(req.params.reservationId || '');
  const oldReservationId = String(req.body?.oldReservationId || '').trim();
  const paymentId = String(req.body?.paymentId || '').trim();
  if (
    !/^nsp_[a-f0-9]{40}$/.test(premiumReservationId) ||
    !/^nsp_[a-f0-9]{40}$/.test(oldReservationId) ||
    oldReservationId === premiumReservationId ||
    !/^[A-Za-z0-9._:-]{6,128}$/.test(paymentId) ||
    Object.keys(req.body || {}).some((key) => !['oldReservationId', 'paymentId'].includes(key))
  ) {
    return res.status(400).json({ success: false, code: 'INVALID_REPLACEMENT_REQUEST' });
  }
  try {
    const transition = await beginPartnerSeasonPassReplacement({ premiumReservationId, oldReservationId, paymentId });
    let current = transition.premiumReservation;
    if (!transition.alreadyIssued) {
      const fixtures = transition.remainingMatchIndices.map((matchIndex) => ({
        eventId: current.eventIds[matchIndex - 1],
        matchDate: current.matchDates[matchIndex - 1],
        matchIndex,
        ticketType: current.ticketType,
      }));
      const issued = await createSeasonPassTicketRecords({
        orderId: current.partnerOrderId,
        fixtures,
        passId: current.passId,
        quantity: 1,
        paymentId,
        paymentProvider: 'nusc-partner',
        memberReferenceHash: current.memberReferenceHash,
        reservationId: premiumReservationId,
        partnerId: PARTNER_ID,
      });
      current = await completePartnerSeasonPassReplacement(premiumReservationId, issued.bookingIds);
    }
    const bookings = current.bookingIds.length
      ? await Booking.find({
        _id: { $in: current.bookingIds },
        'nuscPartnerTicket.partnerId': PARTNER_ID,
        'nuscPartnerTicket.reservationId': premiumReservationId,
      }).sort({ nuscSeasonMatchIndex: 1 }).lean()
      : [];
    if (bookings.length !== current.bookingIds.length) {
      return res.status(500).json({ success: false, code: 'REPLACEMENT_PENDING' });
    }
    const tickets = shapeTickets(current, bookings).filter((ticket) => ticket.ticketId);
    return res.status(transition.isRetry ? 200 : 201).json({
      success: true,
      replacement: {
        oldReservationId,
        premiumReservationId,
        status: 'issued',
        issuedTicketCount: tickets.length,
        retainedUsedTicketCount: transition.retainedUsedTicketCount,
        cancelledUnusedTicketCount: transition.cancelledUnusedTicketCount,
      },
      tickets,
    });
  } catch (error) {
    if (error instanceof ReplacementError) {
      return res.status(error.status).json({ success: false, code: error.code });
    }
    console.error('[NUSC partner API] Season pass replacement failed:', error.message);
    return res.status(500).json({ success: false, code: 'REPLACEMENT_PENDING' });
  }
}

async function recoverMissingGeneralTickets(req, res) {
  const premiumReservationId = String(req.params.reservationId || '');
  const oldReservationId = String(req.body?.oldReservationId || '').trim();
  const paymentId = String(req.body?.paymentId || '').trim();
  if (
    !/^nsp_[a-f0-9]{40}$/.test(premiumReservationId) ||
    !/^nsp_[a-f0-9]{40}$/.test(oldReservationId) ||
    oldReservationId === premiumReservationId ||
    !/^[A-Za-z0-9._:-]{6,128}$/.test(paymentId) ||
    Object.keys(req.body || {}).some((key) => !['oldReservationId', 'paymentId'].includes(key))
  ) {
    return res.status(400).json({ success: false, code: 'INVALID_RECOVERY_REQUEST' });
  }
  try {
    const recovery = await recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId });
    const reservation = recovery.reservation;
    const bookings = await Booking.find({
      _id: { $in: reservation.bookingIds },
      'nuscPartnerTicket.partnerId': PARTNER_ID,
      'nuscPartnerTicket.reservationId': premiumReservationId,
    }).sort({ nuscSeasonMatchIndex: 1 }).lean();
    if (bookings.length !== reservation.bookingIds.length || bookings.length !== 10) {
      return res.status(500).json({ success: false, code: 'RECOVERY_PENDING' });
    }
    return res.status(recovery.alreadyIssued ? 200 : 201).json({
      success: true,
      recovery: {
        oldReservationId,
        premiumReservationId,
        status: 'issued',
        issuedTicketCount: bookings.length,
        recoveredTicketCount: 2,
        recoveredMatchIndices: [1, 2],
        retainedUsedTicketCount: recovery.retainedUsedTicketCount,
      },
      tickets: shapeTickets(reservation, bookings).filter((ticket) => ticket.ticketId),
    });
  } catch (error) {
    if (error instanceof ReplacementError) {
      return res.status(error.status).json({ success: false, code: error.code });
    }
    console.error('[NUSC partner API] Missing ticket recovery failed:', error.message);
    return res.status(500).json({ success: false, code: 'RECOVERY_PENDING' });
  }
}

async function releaseReservation(req, res) {
  try {
    const reservation = await inventory.releasePartnerSeasonPassReservation(String(req.params.reservationId || ''));
    if (!reservation) return res.status(404).json({ success: false, code: 'RESERVATION_NOT_FOUND' });
    return res.json({ success: true, reservation: reservationResponse(reservation) });
  } catch (error) {
    if (error.code === 'RESERVATION_NOT_RELEASABLE') return res.status(409).json({ success: false, code: error.code });
    console.error('[NUSC partner API] Reservation release failed:', error.message);
    return res.status(500).json({ success: false, code: 'RELEASE_FAILED' });
  }
}

async function getReservation(req, res) {
  try {
    const selected = await findPartnerReservation(String(req.params.reservationId || ''));
    if (!selected) return res.status(404).json({ success: false, code: 'RESERVATION_NOT_FOUND' });
    const { reservation } = selected;
    if (reservation.status !== 'issued') {
      return res.json({ success: true, reservation: reservationResponse(reservation), tickets: [] });
    }
    const bookings = await Booking.find({
      'nuscPartnerTicket.partnerId': PARTNER_ID,
      'nuscPartnerTicket.partnerOrderId': reservation.partnerOrderId,
    }).sort({ 'nuscPartnerTicket.ticketIndex': 1 }).lean();
    const expectedTicketCount = reservation.replacesReservationId
      ? (reservation.recoveryStatus === 'issued' ? 10 : (reservation.replacementMatchIndices || []).length)
      : inventory.FIXTURE_DATES.length;
    if (bookings.length !== expectedTicketCount) {
      return res.status(500).json({ success: false, code: 'ISSUANCE_PENDING' });
    }
    const tickets = shapeTickets(reservation, bookings);
    return res.json({
      success: true,
      reservation: reservationResponse(reservation),
      ...(reservation.replacesReservationId && {
        replacement: {
          oldReservationId: reservation.replacesReservationId,
          issuedTicketCount: bookings.length,
          retainedUsedTicketCount: Number(reservation.replacementUsedTicketCount || 0),
          cancelledUnusedTicketCount: Number(reservation.replacementCancelledTicketCount || 0),
        },
      }),
      tickets: reservation.replacesReservationId ? tickets.filter((ticket) => ticket.ticketId) : tickets,
    });
  } catch (error) {
    console.error('[NUSC partner API] Reservation lookup failed:', error.message);
    return res.status(500).json({ success: false, code: 'LOOKUP_FAILED' });
  }
}

async function getTicket(req, res) {
  try {
    const selected = await findPartnerReservation(String(req.params.reservationId || ''));
    if (!selected || selected.reservation.status !== 'issued') return res.status(404).json({ success: false, code: 'TICKET_NOT_FOUND' });
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      'nuscPartnerTicket.partnerId': PARTNER_ID,
      'nuscPartnerTicket.reservationId': selected.reservation.reservationId,
    }).populate('event', 'title startDate location');
    if (!booking) return res.status(404).json({ success: false, code: 'TICKET_NOT_FOUND' });
    if (!['confirmed', 'checked-in'].includes(booking.status) || booking.paymentStatus !== 'completed') {
      return res.status(409).json({ success: false, code: 'TICKET_NOT_ACTIVE' });
    }
    // The QR payload is returned only on this signed, server-to-server endpoint.
    // It is never written to logs or included in a webhook.
    return res.json({
      success: true,
      ticket: {
        ticketId: String(booking._id),
        eventId: String(booking.event?._id || booking.event),
        matchDate: selected.reservation.matchDates[booking.nuscSeasonMatchIndex - 1],
        eventName: booking.event?.title || booking.eventSnapshot?.title,
        ticketType: booking.ticketType,
        ...(booking.nuscGeneralZone && { zone: booking.nuscGeneralZone }),
        status: booking.status,
        qrPayload: {
          bookingId: String(booking._id),
          eventId: String(booking.event?._id || booking.event),
          ticketType: booking.ticketType,
          quantity: booking.quantity,
        },
      },
    });
  } catch (error) {
    console.error('[NUSC partner API] Ticket lookup failed:', error.message);
    return res.status(500).json({ success: false, code: 'TICKET_LOOKUP_FAILED' });
  }
}

function validatePdfAttendee(attendee) {
  if (!attendee || typeof attendee !== 'object' || Array.isArray(attendee)) return null;
  const allowedKeys = new Set(['name', 'email', 'phone']);
  if (Object.keys(attendee).some((key) => !allowedKeys.has(key))) return null;
  if (typeof attendee.name !== 'string' || typeof attendee.email !== 'string' || typeof attendee.phone !== 'string') return null;

  const name = attendee.name.trim();
  const email = attendee.email.trim();
  const phone = attendee.phone.trim();
  if (!name || name.length > 100 || /[\u0000-\u001F\u007F]/.test(name)) return null;
  if (!email || email.length > 254 || /\s/.test(email) || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return null;
  if (!phone || phone.length > 40 || !/^\+?[0-9][0-9().\s-]{4,38}$/.test(phone) || phone.replace(/\D/g, '').length < 5) return null;
  return { name, email, phone };
}

async function serveTicketPdf(req, res, { requireAttendee = false } = {}) {
  try {
    let attendee;
    if (requireAttendee) {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => key !== 'attendee')) {
        return res.status(400).json({ success: false, code: 'INVALID_ATTENDEE' });
      }
      attendee = validatePdfAttendee(body.attendee);
      if (!attendee) return res.status(400).json({ success: false, code: 'INVALID_ATTENDEE' });
    }

    const reservationId = String(req.params.reservationId || '');
    const bookingId = String(req.params.bookingId || '');
    if (!/^nsp_[a-f0-9]{40}$/.test(reservationId) || !/^[a-f0-9]{24}$/i.test(bookingId)) {
      return res.status(404).json({ success: false, code: 'TICKET_NOT_FOUND' });
    }
    const normalizedBookingId = bookingId.toLowerCase();

    const selected = await findPartnerReservation(reservationId);
    const reservation = selected?.reservation;
    const belongsToReservation = (reservation?.bookingIds || []).some((id) => String(id) === normalizedBookingId);
    if (!reservation || reservation.status !== 'issued' || !belongsToReservation) {
      return res.status(404).json({ success: false, code: 'TICKET_NOT_FOUND' });
    }

    const booking = await Booking.findOne({
      _id: normalizedBookingId,
      'nuscPartnerTicket.partnerId': PARTNER_ID,
      'nuscPartnerTicket.reservationId': reservationId,
    })
      .populate('event', 'title banner startDate endDate startTime endTime location venue ticketTypes')
      .populate('user', 'name email phone')
      .lean();
    if (!booking) return res.status(404).json({ success: false, code: 'TICKET_NOT_FOUND' });
    if (!['confirmed', 'checked-in'].includes(booking.status) || booking.paymentStatus !== 'completed') {
      return res.status(409).json({ success: false, code: 'TICKET_NOT_ACTIVE' });
    }

    const event = mergeTicketEvent(booking.event, booking.eventSnapshot);
    const pdf = await createOfficialTicketPdfBuffer(booking, event, {
      includedWith: 'Included with NUSC season pass',
      useMemberTicketQrSource: true,
      ...(attendee && { attendee }),
    });
    const safeFilename = `ahibi-ticket-${bookingId.toLowerCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(pdf);
  } catch (error) {
    // Do not log request bodies or attendee values from this partner endpoint.
    console.error('[NUSC partner API] Ticket PDF generation failed.');
    return res.status(500).json({ success: false, code: 'TICKET_PDF_FAILED' });
  }
}

async function getTicketPdf(req, res) {
  return serveTicketPdf(req, res);
}

async function postTicketPdf(req, res) {
  return serveTicketPdf(req, res, { requireAttendee: true });
}

module.exports = { confirmAndIssue, getCatalog, getReservation, getTicket, getTicketPdf, postTicketPdf, recoverMissingGeneralTickets, releaseReservation, replaceGeneralWithPremium, reserveSeasonPass, validatePdfAttendee };
