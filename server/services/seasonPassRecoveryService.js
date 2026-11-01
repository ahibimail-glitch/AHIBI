const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const ManualSeasonPassOrder = require('../models/ManualSeasonPassOrder');
const NuscHomeMatchOrder = require('../models/NuscHomeMatchOrder');
const PaymentTransaction = require('../models/PaymentTransaction');
const Scan = require('../models/Scan');
const inventory = require('./nuscHomeMatchInventoryService');
const nuscRise = require('./nuscRiseIntegrationClient');
const { createSeasonPassTicketRecords } = require('./nuscSeasonPassBookingService');

const MATCH_COUNT = 10;

class SeasonPassRecoveryError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'SeasonPassRecoveryError';
    this.status = status;
    this.code = code;
  }
}

function safeObjectId(value) {
  return mongoose.isValidObjectId(value) ? String(value) : null;
}

function ticketStatus(booking) {
  if (!booking) return 'missing';
  if (booking.status === 'refunded' || booking.paymentStatus === 'refunded') return 'refunded';
  if (['cancelled', 'voided'].includes(booking.status) || ['cancelled', 'voided'].includes(booking.paymentStatus)) return 'invalid';
  if (booking.status === 'checked-in' || booking.entryVerified) return 'checked_in';
  if (booking.paymentStatus !== 'completed') return 'invalid';
  if (booking.status === 'confirmed') return 'valid';
  return 'invalid';
}

function ticketSummary(fixtures, bookings, getIndex) {
  const byIndex = new Map();
  for (const booking of bookings) {
    const index = Number(getIndex(booking));
    if (!Number.isInteger(index) || index < 1 || index > MATCH_COUNT) continue;
    const current = byIndex.get(index) || [];
    current.push(booking);
    byIndex.set(index, current);
  }
  return Array.from({ length: MATCH_COUNT }, (_, offset) => {
    const matchIndex = offset + 1;
    const fixture = fixtures[offset] || {};
    const rows = byIndex.get(matchIndex) || [];
    const active = rows.filter((booking) => ['valid', 'checked_in'].includes(ticketStatus(booking)));
    const status = active.length > 1 ? 'duplicate_valid' : active.length === 1
      ? ticketStatus(active[0]) : rows.length ? ticketStatus(rows[0]) : 'missing';
    return {
      matchIndex,
      matchDate: fixture.matchDate || fixture.date || null,
      opponent: fixture.opponent || fixture.eventSnapshot?.title || 'Home match',
      status,
      bookingId: active.length === 1 ? String(active[0]._id) : null,
      eventId: fixture.eventId ? String(fixture.eventId) : (active[0]?.event ? String(active[0].event) : null),
    };
  });
}

async function manualFixtures() {
  const slugs = inventory.FIXTURE_MATCHES.map(({ date }) => `nusc-home-match-${date.replace(/-/g, '')}`);
  const events = await Event.find({ slug: { $in: slugs } });
  const eventBySlug = new Map((events || []).map((event) => [event.slug, event]));
  return inventory.FIXTURE_MATCHES.map((match, index) => {
    const event = eventBySlug.get(`nusc-home-match-${match.date.replace(/-/g, '')}`);
    return { ...match, matchDate: match.date, matchIndex: index + 1, eventId: event?._id ? String(event._id) : null };
  });
}

function safeAhibiOrder(order, kind, tickets) {
  return {
    orderId: order.orderId,
    kind,
    passId: order.passId || order.bookingDetails?.passId,
    ticketType: order.ticketType || order.bookingDetails?.ticketType,
    zone: order.zone || order.bookingDetails?.zone || null,
    amountMinor: order.listAmountMinor ?? order.amountMinor ?? null,
    settlementType: order.settlementType || 'paid',
    status: order.status,
    createdAt: order.createdAt || null,
    tickets,
  };
}

function safeRiseOrder(order, tickets) {
  return {
    orderId: order.orderId,
    kind: order.kind,
    passId: order.passId,
    ticketType: order.ticketType,
    zone: order.zone || null,
    status: order.status,
    ahibiStatus: order.ahibiStatus,
    amountMinor: order.amountMinor ?? null,
    settlementType: order.settlementType || 'paid',
    tickets,
  };
}

async function listAhibiSeasonPassOrders(userId) {
  const id = safeObjectId(userId);
  if (!id) throw new SeasonPassRecoveryError(400, 'INVALID_USER', 'Select a valid AHIBI user.');
  const [manualOrders, onlineOrders] = await Promise.all([
    ManualSeasonPassOrder.find({ user: id, status: { $in: ['issued', 'needs_reconciliation'] }, settlementHash: { $ne: null } })
      .select('orderId passId ticketType zone listAmountMinor settlementType status bookingIds errorCode createdAt')
      .sort({ createdAt: -1 }).limit(25).lean(),
    NuscHomeMatchOrder.find({ user: id, orderType: 'seasonPass', status: { $in: ['completed', 'paid_no_booking', 'created'] }, paymentId: { $ne: null } })
      .select('orderId orderType status amountMinor paymentId bookingIds bookingDetails createdAt')
      .sort({ createdAt: -1 }).limit(25).lean(),
  ]);

  const results = [];
  const fixtures = await manualFixtures();
  for (const order of manualOrders) {
    const bookings = await Booking.find({
      $or: [
        { manualSeasonPassOrderId: order.orderId },
        ...(order.bookingIds?.length ? [{ _id: { $in: order.bookingIds } }] : []),
      ],
    }).select('_id event eventSnapshot status paymentStatus entryVerified ticketType nuscSeasonMatchIndex manualSeasonPassMatchIndex').lean();
    results.push(safeAhibiOrder(order, 'manual', ticketSummary(fixtures, bookings, (booking) => (
      booking.manualSeasonPassMatchIndex || booking.nuscSeasonMatchIndex
    ))));
  }

  for (const order of onlineOrders) {
    const fixtures = (order.bookingDetails?.fixtures || []).map((fixture) => ({
      ...fixture,
      matchDate: fixture.matchDate,
      eventId: fixture.eventId || fixture.event?._id,
      opponent: fixture.event?.title?.replace(/^NUSC vs /i, '') || fixture.opponent,
    }));
    const bookings = await Booking.find({
      $or: [
        { nuscOrderId: order.orderId },
        ...(order.bookingIds?.length ? [{ _id: { $in: order.bookingIds } }] : []),
      ],
    }).select('_id event eventSnapshot status paymentStatus entryVerified ticketType nuscSeasonMatchIndex nuscTicketIndex').lean();
    results.push(safeAhibiOrder(order, 'online', ticketSummary(fixtures, bookings, (booking) => booking.nuscSeasonMatchIndex)));
  }
  return results.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

async function partnerTicketDetails(reservation, bookings) {
  const byIndex = new Map();
  for (const booking of bookings) {
    const index = Number(booking.nuscSeasonMatchIndex || booking.nuscPartnerTicket?.ticketIndex);
    if (!Number.isInteger(index) || index < 1 || index > MATCH_COUNT) continue;
    const rows = byIndex.get(index) || [];
    rows.push(booking);
    byIndex.set(index, rows);
  }
  return Array.from({ length: MATCH_COUNT }, (_, offset) => {
    const index = offset + 1;
    const rows = byIndex.get(index) || [];
    const active = rows.filter((booking) => ['valid', 'checked_in'].includes(ticketStatus(booking)));
    return {
      matchIndex: index,
      matchDate: reservation.matchDates?.[offset] || null,
      opponent: inventory.FIXTURE_MATCHES[offset]?.opponent || 'Home match',
      eventId: reservation.eventIds?.[offset] ? String(reservation.eventIds[offset]) : null,
      status: active.length > 1 ? 'duplicate_valid' : active.length === 1
        ? ticketStatus(active[0]) : rows.length ? ticketStatus(rows[0]) : 'missing',
      bookingId: active.length === 1 ? String(active[0]._id) : null,
      ticketType: reservation.ticketType,
      zone: reservation.zone || null,
      ticketAccessPath: active.length === 1
        ? `/api/nusc-partner/v1/reservations/${encodeURIComponent(reservation.reservationId)}/tickets/${encodeURIComponent(String(active[0]._id))}`
        : null,
    };
  });
}

function ticketsForNuscSync(tickets) {
  return tickets.map((ticket) => ({
    ...ticket,
    status: ticket.status === 'checked_in' ? 'used' : 'confirmed',
  }));
}

async function inspectRiseOrder(order) {
  if (!order.reservationId) {
    return safeRiseOrder(order, Array.from({ length: MATCH_COUNT }, (_, offset) => ({ matchIndex: offset + 1, status: 'missing', matchDate: null, opponent: 'Home match' })));
  }
  const reservation = await inventory.getPartnerSeasonPassReservation(order.reservationId);
  if (!reservation || reservation.partnerOrderId !== order.partnerOrderId) {
    return safeRiseOrder({ ...order, status: reservation ? 'manual_intervention' : 'reservation_missing' },
      Array.from({ length: MATCH_COUNT }, (_, offset) => ({ matchIndex: offset + 1, status: 'missing', matchDate: null, opponent: inventory.FIXTURE_MATCHES[offset].opponent })));
  }
  const bookings = await Booking.find({
    $or: [
      { 'nuscPartnerTicket.partnerId': 'nusc', 'nuscPartnerTicket.partnerOrderId': reservation.partnerOrderId },
      ...(reservation.bookingIds?.length ? [{ _id: { $in: reservation.bookingIds } }] : []),
    ],
  }).select('_id event status paymentStatus paymentProvider externalPaymentId entryVerified ticketType nuscGeneralZone nuscSeasonMatchIndex nuscPartnerTicket').lean();
  const tickets = await partnerTicketDetails(reservation, bookings);
  return safeRiseOrder({
    ...order,
    status: reservation.status === 'issued' ? order.status : 'manual_intervention',
    ahibiStatus: reservation.status,
    passId: reservation.passId,
    ticketType: reservation.ticketType,
    zone: reservation.zone,
  }, tickets);
}

async function searchRiseRecoveryOrders(query) {
  const result = await nuscRise.searchRiseRecoveryOrders(query);
  const members = Array.isArray(result.members) ? result.members : [];
  const orders = [];
  for (const member of members) {
    for (const order of member.orders || []) {
      orders.push({ memberNumber: member.memberNumber, memberName: member.name, tier: member.tier, order: await inspectRiseOrder(order) });
    }
  }
  return { members: members.map(({ memberNumber, name, phoneMasked, tier }) => ({ memberNumber, name, phoneMasked, tier })), orders };
}

async function loadAhibiBookings(kind, order) {
  const keys = kind === 'manual'
    ? { primary: { manualSeasonPassOrderId: order.orderId }, index: 'manualSeasonPassMatchIndex' }
    : { primary: { nuscOrderId: order.orderId }, index: 'nuscSeasonMatchIndex' };
  const clauses = [keys.primary];
  if (order.bookingIds?.length) clauses.push({ _id: { $in: order.bookingIds } });
  return Booking.find({ $or: clauses })
    .select('_id user event eventSnapshot status paymentStatus entryVerified ticketType nuscGeneralZone nuscSeasonPassType nuscSeasonMatchIndex nuscTicketIndex manualSeasonPassOrderId manualSeasonPassMatchIndex manualSeasonPassSettlementType paymentProvider externalPaymentId nuscOrderId nuscPartnerTicket')
    .lean();
}

function safeTicketsFromAhibiBookings(order, kind, bookings) {
  const fixtures = kind === 'manual'
    ? inventory.FIXTURE_MATCHES.map((fixture, index) => ({ ...fixture, matchDate: fixture.date, matchIndex: index + 1 }))
    : (order.bookingDetails?.fixtures || []).map((fixture) => ({
      matchDate: fixture.matchDate,
      eventId: fixture.eventId || fixture.event?._id,
      opponent: fixture.event?.title?.replace(/^NUSC vs /i, '') || fixture.opponent,
    }));
  const tickets = ticketSummary(fixtures, bookings, (booking) => kind === 'manual'
    ? booking.manualSeasonPassMatchIndex || booking.nuscSeasonMatchIndex
    : booking.nuscSeasonMatchIndex);
  return tickets.map((ticket) => {
    const booking = bookings.find((item) => String(item._id) === ticket.bookingId);
    return {
      ...ticket,
      status: ticket.status === 'checked_in' ? 'used' : ticket.status === 'valid' ? 'confirmed' : ticket.status,
      ticketType: booking?.ticketType || (kind === 'manual' ? order.ticketType : order.bookingDetails?.ticketType),
      zone: booking?.nuscGeneralZone || (kind === 'manual' ? order.zone : order.bookingDetails?.zone) || null,
      ticketAccessPath: ticket.bookingId
        ? `/api/nusc-partner/v1/reservations/${encodeURIComponent(order.reservationId || '')}/tickets/${encodeURIComponent(ticket.bookingId)}`
        : null,
    };
  });
}

async function expectedAhibiFixtures(kind, order) {
  if (kind === 'manual') return (await manualFixtures()).map((fixture) => ({
    ...fixture,
    ticketType: order.ticketType,
  }));
  const fixtures = order.bookingDetails?.fixtures;
  if (!Array.isArray(fixtures) || fixtures.length !== MATCH_COUNT) return [];
  return fixtures.map((fixture, index) => ({
    matchDate: fixture.matchDate,
    matchIndex: Number(fixture.matchIndex || index + 1),
    eventId: fixture.eventId || fixture.event?._id,
    opponent: fixture.event?.title?.replace(/^NUSC vs /i, '') || fixture.opponent,
    ticketType: fixture.ticketType || order.bookingDetails.ticketType,
  }));
}

function activeBookingsByIndex(kind, order, fixtures, bookings) {
  const rows = new Map();
  for (const booking of bookings) {
    let index = Number(kind === 'manual'
      ? booking.manualSeasonPassMatchIndex || booking.nuscSeasonMatchIndex
      : booking.nuscSeasonMatchIndex);
    if (!index && booking.event) index = fixtures.findIndex((fixture) => String(fixture.eventId) === String(booking.event)) + 1;
    if (!Number.isInteger(index) || index < 1 || index > MATCH_COUNT) continue;
    const list = rows.get(index) || [];
    list.push(booking);
    rows.set(index, list);
  }
  const active = new Map();
  const missing = [];
  for (const fixture of fixtures) {
    const candidates = rows.get(fixture.matchIndex) || [];
    const valid = candidates.filter((booking) => ticketStatus(booking) === 'valid' || ticketStatus(booking) === 'checked_in');
    if (valid.length > 1) throw new SeasonPassRecoveryError(409, 'DUPLICATE_VALID_TICKETS', 'Multiple active tickets exist for a match. Manual review is required.');
    if (valid.length === 1) {
      if (fixture.eventId && String(valid[0].event) !== String(fixture.eventId)) {
        throw new SeasonPassRecoveryError(409, 'TICKET_EVENT_MISMATCH', 'A ticket is linked to a different match. Manual review is required.');
      }
      const booking = valid[0];
      if (String(booking.user) !== String(order.user) || booking.ticketType !== fixture.ticketType ||
          booking.nuscSeasonPassType !== order.passId) {
        throw new SeasonPassRecoveryError(409, 'TICKET_OWNERSHIP_MISMATCH', 'A match ticket does not match this pass owner or type. Manual review is required.');
      }
      if (kind === 'manual' && (booking.manualSeasonPassOrderId !== order.orderId ||
          booking.paymentProvider !== 'manual' || booking.manualSeasonPassSettlementType !== order.settlementType)) {
        throw new SeasonPassRecoveryError(409, 'TICKET_ORDER_MISMATCH', 'A match ticket does not match this manual pass record. Manual review is required.');
      }
      if (kind === 'online' && (booking.nuscOrderId !== order.orderId ||
          booking.paymentProvider !== 'razorpay' || booking.externalPaymentId !== order.paymentId)) {
        throw new SeasonPassRecoveryError(409, 'TICKET_ORDER_MISMATCH', 'A match ticket does not match this paid pass record. Manual review is required.');
      }
      active.set(fixture.matchIndex, valid[0]);
      continue;
    }
    if (candidates.length) throw new SeasonPassRecoveryError(409, 'INVALID_TICKET_STATE', 'A match ticket is refunded, voided, or otherwise inactive. Manual review is required.');
    missing.push(fixture);
  }
  return { active, missing };
}

async function ensureNoOrphanedCheckIn(order, bookings, fixtures, kind) {
  const knownIds = new Set(bookings.map((booking) => String(booking._id)));
  const staleIds = (order.bookingIds || []).filter((id) => !knownIds.has(String(id)));
  if (!staleIds.length) return;
  const eventIds = fixtures.map((fixture) => fixture.eventId).filter(Boolean);
  const scan = await Scan.findOne({ ticket: { $in: staleIds }, ...(kind === 'rise' ? { partnerId: 'nusc' } : {}), ...(eventIds.length ? { event: { $in: eventIds } } : {}) }).select('_id').lean();
  if (scan) throw new SeasonPassRecoveryError(409, 'ORPHANED_CHECK_IN', 'A prior check-in exists for a ticket that is no longer available. Manual review is required.');
}

async function retryCapturedOnlineOrder(order, adminId, requestId) {
  const controller = require('../controllers/nuscHomeMatchController');
  let responseBody;
  let statusCode = 200;
  const response = {
    status(code) { statusCode = code; return this; },
    json(body) { responseBody = body; return this; },
  };
  await controller.retryPaidOrder({
    params: { id: String(order._id) },
    user: { _id: adminId },
    body: { requestId },
  }, response);
  if (statusCode >= 400 || responseBody?.success === false) {
    throw new SeasonPassRecoveryError(statusCode >= 400 ? statusCode : 409,
      responseBody?.code || 'PAYMENT_RECOVERY_REQUIRES_REVIEW',
      responseBody?.message || 'The existing captured payment could not be verified for ticket recovery.');
  }
}

async function auditAhibiRecoveryFailure(kind, order, adminId, requestId, error) {
  const rawCode = String(error?.code || 'RECOVERY_FAILED');
  const details = { requestId, code: /^[A-Z0-9_]{1,80}$/.test(rawCode) ? rawCode : 'RECOVERY_FAILED' };
  if (kind === 'manual') {
    order.operationsAudit ||= [];
    order.operationsAudit.push({ action: error?.status === 409 ? 'ticket_recovery_blocked' : 'ticket_recovery_failed', admin: adminId, details });
    await order.save();
    return;
  }
  await NuscHomeMatchOrder.updateOne({ _id: order._id }, {
    $push: { operationsAudit: {
      action: error?.status === 409 ? 'ticket_recovery_blocked' : 'ticket_recovery_failed',
      admin: adminId,
      at: new Date(),
      details,
    } },
  });
}

async function loadOrder(kind, orderId) {
  if (kind === 'manual') return ManualSeasonPassOrder.findOne({ orderId });
  if (kind === 'online') return NuscHomeMatchOrder.findOne({ orderId, orderType: 'seasonPass' });
  throw new SeasonPassRecoveryError(400, 'INVALID_ORDER_KIND', 'Choose a valid season pass order.');
}

async function recoverAhibiSeasonPass({ kind, orderId, requestId, adminId }) {
  if (!/^[0-9a-f-]{36}$/i.test(String(requestId || ''))) throw new SeasonPassRecoveryError(400, 'REQUEST_ID_REQUIRED', 'A recovery request ID is required.');
  const order = await loadOrder(kind, String(orderId || ''));
  if (!order) throw new SeasonPassRecoveryError(404, 'ORDER_NOT_FOUND', 'Season pass order was not found.');
  try {
    const isSettledManual = kind === 'manual' && Boolean(order.settlementHash) && ['paid', 'complimentary'].includes(order.settlementType)
      && Number(order.settledAmountMinor) === (order.settlementType === 'paid' ? Number(order.listAmountMinor) : 0);
    const onlineRetryAllowed = kind === 'online' && ['paid_no_booking', 'created'].includes(order.status) && Boolean(order.paymentId);
    const isPaidOnline = kind === 'online' && order.orderType === 'seasonPass'
      && (order.status === 'completed' || onlineRetryAllowed) && Boolean(order.paymentId);
    if (!(isSettledManual || isPaidOnline) || ['refunded', 'refund_pending'].includes(order.status)) {
      throw new SeasonPassRecoveryError(409, 'ORDER_NOT_RECOVERABLE', 'This pass is not confirmed as a paid or issued entitlement. Manual review is required.');
    }
    if (kind === 'manual' && !['issued', 'needs_reconciliation'].includes(order.status)) {
      throw new SeasonPassRecoveryError(409, 'ORDER_NOT_ISSUED', 'This pass is not in an issued or recoverable state.');
    }

    const fixtures = await expectedAhibiFixtures(kind, order);
    if (fixtures.length !== MATCH_COUNT || fixtures.some((fixture, index) => (
      fixture.matchIndex !== index + 1 || !fixture.eventId || !fixture.matchDate || !fixture.ticketType
    ))) {
      throw new SeasonPassRecoveryError(409, 'FIXTURE_SET_INVALID', 'The original ten-match allocation cannot be verified. Manual review is required.');
    }
    const bookings = await loadAhibiBookings(kind, order);
    const { active, missing } = activeBookingsByIndex(kind, order, fixtures, bookings);
    await ensureNoOrphanedCheckIn(order, bookings, fixtures, kind);

    if (onlineRetryAllowed) {
      await retryCapturedOnlineOrder(order, adminId, requestId);
      const completed = await NuscHomeMatchOrder.findOne({ orderId: order.orderId, orderType: 'seasonPass' });
      if (!completed || completed.status !== 'completed') {
        throw new SeasonPassRecoveryError(502, 'RECOVERY_INCOMPLETE', 'The existing payment recovery is still in progress. Refresh this pass before retrying.');
      }
      order.status = completed.status;
      order.bookingIds = completed.bookingIds;
    }

    if (missing.length) {
      const issuance = {
        orderId: order.orderId,
        userId: order.user,
        fixtures: missing,
        passId: kind === 'manual' ? order.passId : order.bookingDetails.passId,
        quantity: 1,
        ...(kind === 'manual' ? {
          paymentProvider: 'manual',
          zone: order.zone,
          manualOrderId: order.orderId,
          pricePerMatch: order.settlementType === 'paid' ? Number(order.listAmountMinor) / 100 / MATCH_COUNT : 0,
          settlementType: order.settlementType,
          modeOfPayment: order.modeOfPayment,
        } : {
          paymentId: order.paymentId,
          paymentProvider: 'razorpay',
          zone: order.bookingDetails.zone,
          pricePerMatch: Number(order.amountMinor) / 100 / MATCH_COUNT,
        }),
      };
      await createSeasonPassTicketRecords(issuance);
    }

    const refreshed = await loadAhibiBookings(kind, order);
    const final = activeBookingsByIndex(kind, order, fixtures, refreshed);
    if (final.missing.length || final.active.size !== MATCH_COUNT) {
      throw new SeasonPassRecoveryError(502, 'RECOVERY_INCOMPLETE', 'Some match tickets still need recovery. Retry this same pass; do not create another pass.');
    }
    const bookingIds = fixtures.map((fixture) => final.active.get(fixture.matchIndex)._id);
    if (kind === 'manual') {
      await inventory.markSeasonPassStockApplied(order.orderId);
      order.bookingIds = bookingIds;
      order.status = 'issued';
      order.errorCode = null;
      order.operationsAudit.push({ action: 'tickets_recovered', admin: adminId, details: { requestId, recoveredMatchIndices: missing.map(({ matchIndex }) => matchIndex), ticketCount: MATCH_COUNT } });
      await order.save();
    } else {
      await NuscHomeMatchOrder.updateOne({ _id: order._id, status: 'completed' }, {
        $set: { bookingIds },
        $push: { operationsAudit: { action: 'ticket_recovery', admin: adminId, at: new Date(), details: { requestId, recoveredMatchIndices: missing.map(({ matchIndex }) => matchIndex), ticketCount: MATCH_COUNT } } },
      });
      if (order.paymentId) {
        await PaymentTransaction.updateOne({ orderId: order.orderId, paymentId: order.paymentId }, { $set: { bookingIds } });
      }
    }
    const tickets = safeTicketsFromAhibiBookings(order, kind, refreshed);
    return {
      order: safeAhibiOrder(order, kind, tickets),
      result: { status: 'recovered', recoveredMatchIndices: missing.map(({ matchIndex }) => matchIndex), relinkedMatchIndices: [], tickets },
    };
  } catch (error) {
    await auditAhibiRecoveryFailure(kind, order, adminId, requestId, error);
    throw error;
  }
}

async function riseOrderByMember(orderId, memberNumber) {
  const result = await nuscRise.searchRiseRecoveryOrders(memberNumber);
  for (const member of result.members || []) {
    if (member.memberNumber !== memberNumber) continue;
    const order = (member.orders || []).find((item) => item.orderId === orderId);
    if (order) return { ...order, memberNumber };
  }
  throw new SeasonPassRecoveryError(404, 'RISE_ORDER_NOT_FOUND', 'The RISE pass could not be verified. Refresh the order list and try again.');
}

async function recoverRiseSeasonPass({ orderId, memberNumber, requestId, adminId }) {
  if (!/^[0-9a-f-]{36}$/i.test(String(requestId || ''))) throw new SeasonPassRecoveryError(400, 'REQUEST_ID_REQUIRED', 'A recovery request ID is required.');
  if (typeof memberNumber !== 'string' || !/^NUSC\d{8}$/i.test(memberNumber)) {
    throw new SeasonPassRecoveryError(400, 'INVALID_MEMBER', 'Select a valid RISE member.');
  }
  const order = await riseOrderByMember(String(orderId || ''), memberNumber);
  const passStatusRecoverable = order.kind === 'paid'
    ? ['issued', 'needs_reconciliation'].includes(order.ahibiStatus)
    : order.ahibiStatus === 'issued';
  if (!order.reservationId || !order.partnerOrderId || !passStatusRecoverable || !['paid', 'complimentary'].includes(order.settlementType || 'paid')) {
    throw new SeasonPassRecoveryError(409, 'RISE_ORDER_NOT_RECOVERABLE', 'This pass is not verified as an issued RISE entitlement. Manual review is required.');
  }
  const reservation = await inventory.getPartnerSeasonPassReservation(order.reservationId);
  if (!reservation || reservation.partnerOrderId !== order.partnerOrderId || reservation.status !== 'issued' || !reservation.paymentId) {
    throw new SeasonPassRecoveryError(409, 'RESERVATION_NOT_ISSUED', 'AHIBI could not verify an issued ticket allocation for this RISE order. Manual review is required.');
  }
  if (reservation.replacesReservationId || reservation.replacedByReservationId) {
    throw new SeasonPassRecoveryError(409, 'REPLACEMENT_REQUIRES_REVIEW', 'This replaced pass must use the existing replacement recovery workflow.');
  }
  const claim = await inventory.beginPartnerAdminTicketRecovery({ reservationId: order.reservationId, requestId, adminId });
  if (claim.alreadyCompleted) {
    const current = await inspectRiseOrder(order);
    const sync = await nuscRise.syncRiseRecoveryTickets({
      orderId, memberNumber, kind: order.kind, reservationId: order.reservationId, tickets: ticketsForNuscSync(current.tickets),
      adminReference: String(adminId), requestId,
    });
    return { order: current, result: {
      status: 'already_recovered',
      recoveredMatchIndices: claim.reservation.adminTicketRecovery?.recoveredMatchIndices || [],
      relinkedMatchIndices: claim.reservation.adminTicketRecovery?.relinkedMatchIndices || [],
      nuscSync: sync.status || 'synced',
      tickets: current.tickets,
    } };
  }

  const reservationNow = claim.reservation;
  const recoveredBefore = reservationNow.adminTicketRecovery?.recoveredMatchIndices || [];
  const relinkedBefore = reservationNow.adminTicketRecovery?.relinkedMatchIndices || [];
  const bookings = await Booking.find({
    $or: [
      { 'nuscPartnerTicket.partnerId': 'nusc', 'nuscPartnerTicket.partnerOrderId': reservationNow.partnerOrderId },
      ...(reservationNow.bookingIds?.length ? [{ _id: { $in: reservationNow.bookingIds } }] : []),
    ],
  }).select('_id event status paymentStatus entryVerified ticketType nuscGeneralZone nuscSeasonMatchIndex nuscPartnerTicket').lean();

  let status;
  let bookingIds;
  let recoveredMatchIndices = [];
  let relinkedMatchIndices = [];
  try {
    const fixtures = Array.from({ length: MATCH_COUNT }, (_, offset) => ({
      eventId: reservationNow.eventIds?.[offset],
      matchDate: reservationNow.matchDates?.[offset],
      matchIndex: offset + 1,
      ticketType: reservationNow.ticketType,
    }));
    if (fixtures.some((fixture) => !fixture.eventId || !fixture.matchDate) || reservationNow.matchDates.length !== MATCH_COUNT || reservationNow.eventIds.length !== MATCH_COUNT) {
      throw new SeasonPassRecoveryError(409, 'FIXTURE_SET_INVALID', 'The original ten-match allocation cannot be verified. Manual review is required.');
    }

    const rowsByIndex = new Map();
    for (const booking of bookings) {
      const index = Number(booking.nuscSeasonMatchIndex || booking.nuscPartnerTicket?.ticketIndex);
      if (!Number.isInteger(index) || index < 1 || index > MATCH_COUNT) continue;
      const list = rowsByIndex.get(index) || [];
      list.push(booking);
      rowsByIndex.set(index, list);
    }
    const active = new Map();
    const missing = [];
    for (const fixture of fixtures) {
      const rows = rowsByIndex.get(fixture.matchIndex) || [];
      const valid = rows.filter((booking) => ['valid', 'checked_in'].includes(ticketStatus(booking)));
      if (valid.length > 1) throw new SeasonPassRecoveryError(409, 'DUPLICATE_VALID_TICKETS', 'Multiple active tickets exist for a match. Manual review is required.');
      if (valid.length === 1) {
        const booking = valid[0];
        const metadata = booking.nuscPartnerTicket || {};
        if (String(booking.event) !== String(fixture.eventId) || booking.ticketType !== reservationNow.ticketType ||
            (booking.nuscGeneralZone || null) !== (reservationNow.zone || null) ||
            booking.paymentProvider !== 'nusc-partner' || booking.externalPaymentId !== reservationNow.paymentId ||
            metadata.partnerId !== 'nusc' || metadata.partnerOrderId !== reservationNow.partnerOrderId ||
            String(metadata.memberReferenceHash) !== String(reservationNow.memberReferenceHash)) {
          throw new SeasonPassRecoveryError(409, 'TICKET_METADATA_MISMATCH', 'A match ticket is linked to unexpected pass metadata. Manual review is required.');
        }
        if (metadata.reservationId !== reservationNow.reservationId) {
          if (booking.status === 'checked-in' || booking.entryVerified) {
            throw new SeasonPassRecoveryError(409, 'CHECKED_IN_REFERENCE_MISMATCH', 'A checked-in ticket has mismatched references. Manual review is required.');
          }
          const scan = await Scan.findOne({ ticket: booking._id, event: fixture.eventId, partnerId: 'nusc' }).select('_id').lean();
          if (scan) throw new SeasonPassRecoveryError(409, 'CHECKED_IN_REFERENCE_MISMATCH', 'A previously scanned ticket has mismatched references. Manual review is required.');
          const update = await Booking.updateOne({ _id: booking._id, status: 'confirmed', paymentStatus: 'completed', 'nuscPartnerTicket.partnerOrderId': reservationNow.partnerOrderId }, {
            $set: { 'nuscPartnerTicket.reservationId': reservationNow.reservationId },
          });
          if (update.modifiedCount !== 1) throw new SeasonPassRecoveryError(409, 'TICKET_CHANGED', 'A ticket changed while recovery was running. Refresh and inspect it.');
          relinkedMatchIndices.push(fixture.matchIndex);
          booking.nuscPartnerTicket.reservationId = reservationNow.reservationId;
        }
        active.set(fixture.matchIndex, booking);
      } else if (rows.length) {
        throw new SeasonPassRecoveryError(409, 'INVALID_TICKET_STATE', 'A match ticket is refunded, voided, or otherwise inactive. Manual review is required.');
      } else {
        const previousTicket = (order.tickets || []).find((ticket) => String(ticket.eventId || '') === String(fixture.eventId));
        if (previousTicket?.ticketId && mongoose.isValidObjectId(previousTicket.ticketId)) {
          const scan = await Scan.findOne({ ticket: previousTicket.ticketId, event: fixture.eventId, partnerId: 'nusc' }).select('_id').lean();
          if (scan) throw new SeasonPassRecoveryError(409, 'ORPHANED_CHECK_IN', 'A prior check-in exists for the missing ticket reference. Manual review is required.');
        }
        missing.push(fixture);
      }
    }

    if (relinkedMatchIndices.length) {
      await inventory.recordPartnerAdminTicketRecoveryProgress({
        reservationId: reservationNow.reservationId,
        requestId,
        relinkedMatchIndices,
      });
    }

    if (missing.length) {
      const knownBookingIds = new Set(bookings.map((booking) => String(booking._id)));
      try {
        await createSeasonPassTicketRecords({
          orderId: reservationNow.partnerOrderId,
          fixtures: missing,
          passId: reservationNow.passId,
          quantity: 1,
          paymentId: reservationNow.paymentId,
          paymentProvider: 'nusc-partner',
          memberReferenceHash: reservationNow.memberReferenceHash,
          reservationId: reservationNow.reservationId,
          partnerId: 'nusc',
        });
        recoveredMatchIndices = missing.map(({ matchIndex }) => matchIndex);
      } catch (error) {
        const partial = await Booking.find({
          'nuscPartnerTicket.partnerId': 'nusc',
          'nuscPartnerTicket.partnerOrderId': reservationNow.partnerOrderId,
        }).select('_id nuscSeasonMatchIndex status paymentStatus').lean();
        const createdIndices = partial.filter((booking) => !knownBookingIds.has(String(booking._id))
          && ticketStatus(booking) === 'valid').map((booking) => Number(booking.nuscSeasonMatchIndex)).filter(Number.isInteger);
        if (createdIndices.length) {
          await inventory.recordPartnerAdminTicketRecoveryProgress({
            reservationId: reservationNow.reservationId,
            requestId,
            recoveredMatchIndices: createdIndices,
          });
        }
        throw error;
      }
    }
    const updatedBookings = await Booking.find({
      'nuscPartnerTicket.partnerId': 'nusc',
      'nuscPartnerTicket.partnerOrderId': reservationNow.partnerOrderId,
    }).select('_id event status paymentStatus entryVerified ticketType nuscGeneralZone nuscSeasonMatchIndex nuscPartnerTicket').lean();
    const tickets = await partnerTicketDetails(reservationNow, updatedBookings);
    if (tickets.length !== MATCH_COUNT || tickets.some((ticket) => !ticket.bookingId || !['valid', 'checked_in'].includes(ticket.status))) {
      throw new SeasonPassRecoveryError(502, 'RECOVERY_INCOMPLETE', 'Some match tickets still need recovery. Retry this same pass.');
    }
    bookingIds = tickets.map((ticket) => ticket.bookingId);
    const allRecoveredMatchIndices = [...new Set([...recoveredBefore, ...recoveredMatchIndices])].sort((a, b) => a - b);
    const allRelinkedMatchIndices = [...new Set([...relinkedBefore, ...relinkedMatchIndices])].sort((a, b) => a - b);
    await inventory.completePartnerAdminTicketRecovery({
      reservationId: reservationNow.reservationId,
      requestId,
      adminId,
      bookingIds,
      recoveredMatchIndices: allRecoveredMatchIndices,
      relinkedMatchIndices: allRelinkedMatchIndices,
    });
    status = await nuscRise.syncRiseRecoveryTickets({
      orderId,
      memberNumber,
      kind: order.kind,
      reservationId: reservationNow.reservationId,
      tickets: ticketsForNuscSync(tickets),
      adminReference: String(adminId),
      requestId,
    });
    return {
      order: safeRiseOrder({ ...order, status: 'issued', ahibiStatus: 'issued' }, tickets),
      result: { status: 'recovered', recoveredMatchIndices: allRecoveredMatchIndices, relinkedMatchIndices: allRelinkedMatchIndices, nuscSync: status.status || 'synced', tickets },
    };
  } catch (error) {
    if (error instanceof SeasonPassRecoveryError && error.status === 409) {
      await inventory.completePartnerAdminTicketRecovery({
        reservationId: reservationNow.reservationId,
        requestId,
        adminId,
        bookingIds: reservationNow.bookingIds || [],
        recoveredMatchIndices: [...new Set([...recoveredBefore, ...recoveredMatchIndices])],
        relinkedMatchIndices: [...new Set([...relinkedBefore, ...relinkedMatchIndices])],
        manualIntervention: true,
      });
    }
    throw error;
  }
}

module.exports = {
  SeasonPassRecoveryError,
  inspectRiseOrder,
  listAhibiSeasonPassOrders,
  recoverAhibiSeasonPass,
  recoverRiseSeasonPass,
  searchRiseRecoveryOrders,
  ticketStatus,
};
