const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Inventory = require('../models/NuscHomeMatchInventory');
const ManualSeasonPassOrder = require('../models/ManualSeasonPassOrder');
const NuscHomeMatchOrder = require('../models/NuscHomeMatchOrder');
const PaymentTransaction = require('../models/PaymentTransaction');
const Scan = require('../models/Scan');
const getRazorpayClient = require('../utils/getRazorpayClient');
const inventory = require('./nuscHomeMatchInventoryService');
const nuscRise = require('./nuscRiseIntegrationClient');
const { createSeasonPassTicketRecords } = require('./nuscSeasonPassBookingService');

const INVENTORY_KEY = 'nusc-il-2026-27';
const NUSC_ORDER_ID_PREFIX = 'nusc-order-';
const NUSC_ORDER_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_STATUSES = ['confirmed', 'checked-in'];
const EVIDENCE_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/# -]{2,199}$/;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RAZORPAY_PAYMENT_ID_PATTERN = /^pay_[A-Za-z0-9]{6,64}$/;
const MANUAL_PAYMENT_VERIFICATION_MAX_AGE_MS = 15 * 60 * 1000;
const MANUAL_PAYMENT_WORKFLOW = 'admin_manual_payment_verification';

class TicketReissueError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'TicketReissueError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function asString(value) {
  return value == null ? '' : String(value);
}

function sameId(left, right) {
  return Boolean(left && right && asString(left) === asString(right));
}

function safeReference(value) {
  const reference = typeof value === 'string' ? value.trim() : '';
  return EVIDENCE_REFERENCE_PATTERN.test(reference) ? reference : null;
}

function amountToMinorUnits(value, currency) {
  if (typeof value !== 'string' || !/^\d{1,12}(?:\.\d{1,4})?$/.test(value.trim())) return null;
  let fractionDigits;
  try {
    fractionDigits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return null;
  }
  const [whole, fraction = ''] = value.trim().split('.');
  if (fraction.length > fractionDigits) return null;
  const scale = 10n ** BigInt(fractionDigits);
  const minor = BigInt(whole) * scale + BigInt((fraction.padEnd(fractionDigits, '0') || '0'));
  const result = Number(minor);
  return Number.isSafeInteger(result) && result > 0 ? result : null;
}

function knownPaymentAmounts(context) {
  return [context.order?.amountMinor, context.order?.amountPaise,
    context.reservation?.amountMinor, context.reservation?.amountPaise]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(Number);
}

function knownPaymentCurrencies(context) {
  return [context.order?.currency, context.reservation?.currency]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim().toUpperCase());
}

function safeIndex(value) {
  const index = Number(value);
  return Number.isInteger(index) && index >= 1 && index <= 10 ? index : null;
}

function addReason(reasons, code, message, evidenceRequired, matchIndex = null) {
  const key = `${code}:${matchIndex ?? 'all'}`;
  if (reasons.some((reason) => `${reason.code}:${reason.matchIndex ?? 'all'}` === key)) return;
  reasons.push({ code, message, evidenceRequired, ...(matchIndex && { matchIndex }) });
}

function indexForBooking(kind, booking) {
  if (kind === 'manual') return safeIndex(booking.manualSeasonPassMatchIndex || booking.nuscSeasonMatchIndex);
  if (kind === 'online') return safeIndex(booking.nuscSeasonMatchIndex || booking.nuscTicketIndex);
  return safeIndex(booking.nuscSeasonMatchIndex || booking.nuscPartnerTicket?.ticketIndex);
}

function bookingState(booking, scanFound) {
  if (!booking) return scanFound ? 'checked_in' : 'missing';
  if (booking.paymentStatus === 'refunded' || booking.status === 'refunded') return 'refunded';
  if (booking.status === 'checked-in' || booking.entryVerified === true || scanFound) return 'checked_in';
  if (booking.paymentStatus === 'completed' && ACTIVE_STATUSES.includes(booking.status)) return 'valid';
  if (booking.status === 'cancelled' && booking.paymentStatus === 'completed') return 'cancelled';
  return 'unusable';
}

function normalizedHistoricalEvidence(input) {
  const result = new Map();
  for (const entry of Array.isArray(input) ? input : []) {
    const matchIndex = safeIndex(entry?.matchIndex);
    const reference = safeReference(entry?.reference);
    const ticketReference = safeReference(entry?.ticketReference);
    const outcome = entry?.outcome === 'used' ? 'used' : entry?.outcome === 'unused' ? 'unused' : null;
    if (matchIndex && reference && ticketReference && outcome && !result.has(matchIndex)) {
      result.set(matchIndex, { matchIndex, reference, ticketReference, outcome });
    }
  }
  return result;
}

function normalizedInventoryEvidence(input) {
  const result = new Map();
  for (const entry of Array.isArray(input) ? input : []) {
    const matchIndex = safeIndex(entry?.matchIndex);
    const reference = safeReference(entry?.reference);
    const ticketReference = safeReference(entry?.ticketReference);
    if (matchIndex && reference && ticketReference && !result.has(matchIndex)) result.set(matchIndex, { matchIndex, reference, ticketReference });
  }
  return result;
}

function reservationRows(inventoryDoc) {
  return Array.isArray(inventoryDoc?.partnerSeasonPassReservations)
    ? inventoryDoc.partnerSeasonPassReservations : [];
}

function partnerOrderIdCandidates(orderId) {
  const id = asString(orderId).trim();
  if (!id) return [];
  return NUSC_ORDER_UUID_PATTERN.test(id)
    ? [`${NUSC_ORDER_ID_PREFIX}${id.toLowerCase()}`, id]
    : [id];
}

function orderRows(inventoryDoc) {
  return Array.isArray(inventoryDoc?.orders) ? inventoryDoc.orders : [];
}

function seasonHoldRows(inventoryDoc) {
  return Array.isArray(inventoryDoc?.seasonPassOrders) ? inventoryDoc.seasonPassOrders : [];
}

function isActiveHold(hold, now) {
  return hold?.status === 'confirmed' || (hold?.status === 'held' && new Date(hold.expiresAt) > now);
}

function isActiveSeasonHold(hold, now) {
  return (hold?.status === 'confirmed' && !hold.stockApplied) ||
    (hold?.status === 'held' && new Date(hold.expiresAt) > now);
}

function ticketHoldUnits(hold, ticketType) {
  if (!hold || hold.stockApplied) return 0;
  return (hold.ticketLines || []).filter((line) => line.ticketType === ticketType)
    .reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

function riseOrderForMember(response, memberNumber, orderId) {
  const member = (response?.members || []).find((item) => String(item.memberNumber) === String(memberNumber));
  const order = (member?.orders || []).find((item) => String(item.orderId) === String(orderId));
  return order ? { ...order, memberNumber } : null;
}

function latestNewReissueAudit(reservation) {
  return [...(reservation?.adminTicketRecoveryAudit || [])].reverse().find((entry) => (
    entry.details?.workflow === 'admin_new_ticket_reissue' && entry.details?.status === 'completed'
  )) || null;
}

function makeProductionDeps() {
  return {
    Booking, Event, Inventory, ManualSeasonPassOrder, NuscHomeMatchOrder, PaymentTransaction, Scan,
    inventory, nuscRise, issue: createSeasonPassTicketRecords,
    razorpay: () => getRazorpayClient(),
    now: () => new Date(),
  };
}

function createAdminNewTicketReissueService(overrides = {}) {
  const deps = { ...makeProductionDeps(), ...overrides };

  async function loadAhibi(kind, orderId) {
    if (!['manual', 'online'].includes(kind)) {
      throw new TicketReissueError(400, 'INVALID_ORDER_KIND', 'Select a paid AHIBI season pass order.');
    }
    const order = kind === 'manual'
      ? await deps.ManualSeasonPassOrder.findOne({ orderId })
      : await deps.NuscHomeMatchOrder.findOne({ orderId, orderType: 'seasonPass' });
    if (!order) throw new TicketReissueError(404, 'ORDER_NOT_FOUND', 'The selected season pass order was not found.');
    let fixtures;
    if (kind === 'manual') {
      const slugs = deps.inventory.FIXTURE_MATCHES.map(({ date }) => `nusc-home-match-${date.replace(/-/g, '')}`);
      const events = await deps.Event.find({ slug: { $in: slugs } }).select('+ticketTypes').lean();
      const bySlug = new Map((events || []).map((event) => [event.slug, event]));
      fixtures = deps.inventory.FIXTURE_MATCHES.map((match, offset) => {
        const event = bySlug.get(`nusc-home-match-${match.date.replace(/-/g, '')}`);
        return {
          matchIndex: offset + 1,
          matchDate: match.date,
          eventId: event?._id || null,
          event,
          ticketType: order.ticketType,
          opponent: match.opponent,
        };
      });
    } else {
      fixtures = (order.bookingDetails?.fixtures || []).map((fixture, offset) => {
        const eventId = fixture.eventId || fixture.event?._id;
        return {
          matchIndex: Number(fixture.matchIndex || offset + 1),
          matchDate: fixture.matchDate,
          eventId,
          event: fixture.event?._id ? fixture.event : null,
          ticketType: fixture.ticketType || order.bookingDetails?.ticketType,
          opponent: fixture.event?.title?.replace(/^NUSC vs /i, '') || fixture.opponent || 'Home match',
        };
      });
      const missing = fixtures.filter((fixture) => !fixture.event?.ticketTypes);
      if (missing.length) {
        const events = await deps.Event.find({ _id: { $in: missing.map((fixture) => fixture.eventId).filter(Boolean) } })
          .select('+ticketTypes').lean();
        const byId = new Map((events || []).map((event) => [asString(event._id), event]));
        fixtures = fixtures.map((fixture) => ({ ...fixture, event: fixture.event || byId.get(asString(fixture.eventId)) || null }));
      }
    }
    const inventoryDoc = await deps.Inventory.findOne({ key: INVENTORY_KEY }).lean();
    const refIds = (order.bookingIds || []).map(asString).filter((id) => mongoose.isValidObjectId(id));
    const clauses = [kind === 'manual' ? { manualSeasonPassOrderId: orderId } : { nuscOrderId: orderId }];
    if (refIds.length) clauses.push({ _id: { $in: refIds } });
    const bookings = await deps.Booking.find({ $or: clauses }).lean();
    const eventIds = fixtures.map((fixture) => fixture.eventId).filter(Boolean);
    const allActiveBookings = await deps.Booking.find({
      event: { $in: eventIds },
      ticketType: { $in: [...new Set(fixtures.map((fixture) => fixture.ticketType).filter(Boolean))] },
      status: { $in: ACTIVE_STATUSES },
      paymentStatus: 'completed',
      bookingSource: { $ne: 'on-spot' },
    }).lean();
    const scanIds = [...new Set([...refIds, ...bookings.map((booking) => asString(booking._id))])];
    const scans = scanIds.length
      ? await deps.Scan.find({ ticket: { $in: scanIds }, ...(eventIds.length ? { event: { $in: eventIds } } : {}) }).select('ticket event partnerId').lean()
      : [];
    return {
      channel: 'ahibi', kind, order, fixtures, bookings, allActiveBookings, scans, inventoryDoc,
      reservation: null, oldReservation: null, memberNumber: null, riseOrder: null,
      // Derived from the AHIBI order collection and saved season-pass type,
      // never from the Admin request body.
      paymentMerchantSource: kind === 'online' && order.orderType === 'seasonPass' ? 'ahibi' : null,
    };
  }

  async function loadRise(orderId, memberNumber) {
    if (typeof memberNumber !== 'string' || !/^NUSC\d{8}$/i.test(memberNumber)) {
      throw new TicketReissueError(400, 'INVALID_MEMBER', 'Select a valid NUSC RISE member.');
    }
    const signed = await deps.nuscRise.searchRiseRecoveryOrders(memberNumber);
    const signedOrder = riseOrderForMember(signed, memberNumber, orderId);
    if (!signedOrder) throw new TicketReissueError(404, 'RISE_ORDER_NOT_FOUND', 'The selected RISE season pass could not be verified. Refresh the order list.');
    const inventoryDoc = await deps.Inventory.findOne({ key: INVENTORY_KEY }).lean();
    const partnerOrderIds = partnerOrderIdCandidates(signedOrder.orderId);
    const matchingReservations = reservationRows(inventoryDoc).filter((row) => partnerOrderIds.includes(row.partnerOrderId));
    const reservation = matchingReservations.length === 1 ? matchingReservations[0] : null;
    if (!reservation) return {
      channel: 'rise', kind: 'rise', order: signedOrder, fixtures: [], bookings: [], scans: [], inventoryDoc,
      reservation: null, oldReservation: null, memberNumber, riseOrder: signedOrder, reservationLinkVerified: false,
      // The exact order was returned by the authenticated signed NUSC integration.
      paymentMerchantSource: 'nusc',
    };
    const reservationLinkVerified =
      (!signedOrder.reservationId || sameId(signedOrder.reservationId, reservation.reservationId)) &&
      (!signedOrder.partnerOrderId || signedOrder.partnerOrderId === reservation.partnerOrderId) &&
      partnerOrderIds.includes(reservation.partnerOrderId);
    // The signed NUSC order identifies the paid order; AHIBI's linked reservation
    // supplies the local pass and fixture fields used by issuance and audit.
    const order = {
      ...signedOrder,
      reservationId: signedOrder.reservationId || reservation.reservationId,
      partnerOrderId: signedOrder.partnerOrderId || reservation.partnerOrderId,
      passId: signedOrder.passId || reservation.passId,
      ticketType: signedOrder.ticketType || reservation.ticketType,
      zone: signedOrder.zone ?? reservation.zone,
    };
    const oldReservation = reservation.replacesReservationId
      ? reservationRows(inventoryDoc).find((row) => row.reservationId === reservation.replacesReservationId)
      : null;
    const eventIds = reservation.eventIds || [];
    const events = await deps.Event.find({ _id: { $in: eventIds } }).select('+ticketTypes').lean();
    const eventById = new Map((events || []).map((event) => [asString(event._id), event]));
    const eligible = oldReservation ? (reservation.replacementMatchIndices || []).map(Number) : Array.from({ length: 10 }, (_, index) => index + 1);
    const premiumReferences = (reservation.bookingIds || []).map(asString);
    const premiumByIndex = new Map();
    const replacementHasFullTicketSet = Boolean(oldReservation && reservation.recoveryStatus === 'issued' && premiumReferences.length === 10);
    if (oldReservation && !replacementHasFullTicketSet) eligible.forEach((index, offset) => premiumByIndex.set(index,
      premiumReferences[offset] || asString((order.tickets || []).find((ticket) => Number(ticket.matchIndex) === index)?.ticketId) || null));
    else Array.from({ length: 10 }, (_, index) => index + 1).forEach((index, offset) => premiumByIndex.set(index,
      premiumReferences[offset] || asString((order.tickets || []).find((ticket) => Number(ticket.matchIndex) === index)?.ticketId) || null));
    const generalReferences = (oldReservation?.bookingIds || []).map(asString);
    const allRefs = [...new Set([...premiumReferences, ...generalReferences,
      ...(order.tickets || []).map((ticket) => asString(ticket.ticketId))]
      .filter((id) => mongoose.isValidObjectId(id)))];
    const clauses = [
      { 'nuscPartnerTicket.partnerId': 'nusc', 'nuscPartnerTicket.partnerOrderId': reservation.partnerOrderId },
      { 'nuscPartnerTicket.partnerId': 'nusc', 'nuscPartnerTicket.reservationId': reservation.reservationId },
      ...(allRefs.length ? [{ _id: { $in: allRefs } }] : []),
    ];
    const bookings = await deps.Booking.find({ $or: clauses }).lean();
    const allActiveBookings = await deps.Booking.find({
      event: { $in: eventIds }, ticketType: reservation.ticketType,
      status: { $in: ACTIVE_STATUSES }, paymentStatus: 'completed', bookingSource: { $ne: 'on-spot' },
    }).lean();
    const scanIds = [...new Set([...allRefs, ...bookings.map((booking) => asString(booking._id))])];
    const scans = scanIds.length ? await deps.Scan.find({ ticket: { $in: scanIds }, event: { $in: eventIds }, partnerId: 'nusc' }).select('ticket event partnerId').lean() : [];
    const fixtures = Array.from({ length: 10 }, (_, offset) => ({
      matchIndex: offset + 1,
      matchDate: reservation.matchDates?.[offset],
      eventId: eventIds[offset],
      event: eventById.get(asString(eventIds[offset])) || null,
      ticketType: reservation.ticketType,
      opponent: deps.inventory.FIXTURE_MATCHES[offset]?.opponent || 'Home match',
      premiumReference: premiumByIndex.get(offset + 1) || null,
      generalReference: generalReferences[offset] || null,
      eligible: !oldReservation || eligible.includes(offset + 1),
    }));
    return {
      channel: 'rise', kind: 'rise', order, fixtures, bookings, allActiveBookings, scans, inventoryDoc,
      reservation, oldReservation, memberNumber, riseOrder: order, reservationLinkVerified,
      // Source is the signed NUSC order above, not a client-selected account.
      paymentMerchantSource: 'nusc',
    };
  }

  function trustedPaymentMerchantSource(context) {
    if (context.paymentMerchantSource === 'nusc' && context.channel === 'rise' &&
        context.riseOrder?.orderId === context.order?.orderId) return 'nusc';
    if (context.paymentMerchantSource === 'ahibi' && context.channel === 'ahibi' &&
        context.kind === 'online' && context.order?.orderType === 'seasonPass') return 'ahibi';
    return null;
  }

  function manualPaymentFailure(code, message, referencePresent = true) {
    return {
      verified: false,
      source: 'manual_razorpay_dashboard_verification_rejected',
      referencePresent,
      reasonCode: code,
      message,
      evidenceRequired: 'Correct the payment evidence against the selected paid order, then record the verification again.',
    };
  }

  function contextPaymentId(context) {
    return context.order?.paymentId;
  }

  async function validateManualPayment(context, supplied, adminId) {
    const paymentId = typeof supplied?.paymentId === 'string' ? supplied.paymentId.trim() : '';
    const orderId = typeof supplied?.orderId === 'string' ? supplied.orderId.trim() : '';
    const currency = typeof supplied?.currency === 'string' ? supplied.currency.trim().toUpperCase() : '';
    const capturedAmount = typeof supplied?.capturedAmount === 'string' ? supplied.capturedAmount.trim() : '';
    const capturedAmountMinor = amountToMinorUnits(capturedAmount, currency);
    const auditReason = typeof supplied?.auditReason === 'string' ? supplied.auditReason.trim() : '';

    if (!adminId) return manualPaymentFailure('MANUAL_PAYMENT_ADMIN_REQUIRED', 'An authenticated Admin is required to record manual Razorpay verification.');
    if (context.channel === 'ahibi' && context.kind !== 'online') {
      return manualPaymentFailure('MANUAL_PAYMENT_NOT_APPLICABLE', 'Razorpay verification is only available for online AHIBI and NUSC RISE paid orders.');
    }
    const merchantSource = trustedPaymentMerchantSource(context);
    if (!merchantSource) {
      return manualPaymentFailure('MANUAL_PAYMENT_MERCHANT_UNVERIFIED', 'The correct Razorpay account cannot be established from the selected authoritative paid order.');
    }
    if (supplied?.confirmed !== true || !REQUEST_ID_PATTERN.test(String(supplied?.verificationId || '')) ||
        !orderId || orderId !== asString(context.order?.orderId) ||
        !RAZORPAY_PAYMENT_ID_PATTERN.test(paymentId) || !capturedAmountMinor || !/^[A-Z]{3}$/.test(currency) ||
        auditReason.length < 10 || auditReason.length > 500) {
      return manualPaymentFailure('MANUAL_PAYMENT_EVIDENCE_INCOMPLETE', 'Confirm the captured, unreversed payment and provide its payment ID, exact amount, currency, selected order, and a meaningful audit reason.', Boolean(contextPaymentId(context)));
    }
    if (context.channel === 'rise' && String(supplied?.memberNumber || '') !== String(context.memberNumber || '')) {
      return manualPaymentFailure('MANUAL_PAYMENT_MEMBER_MISMATCH', 'The manual payment verification is not bound to the selected NUSC member.');
    }
    const expectedPaymentId = contextPaymentId(context);
    if (!expectedPaymentId || paymentId !== String(expectedPaymentId) ||
        (context.channel === 'rise' && (!context.reservation || context.reservation.paymentId !== expectedPaymentId || context.reservationLinkVerified !== true))) {
      return manualPaymentFailure('MANUAL_PAYMENT_REFERENCE_MISMATCH', 'The Razorpay Payment ID does not match the selected entitlement and linked reservation.', Boolean(expectedPaymentId));
    }
    if (context.channel === 'rise') {
      const order = context.order;
      const refundStatus = String(order.refundStatus || '').toLowerCase();
      if (order.kind !== 'paid' || (order.settlementType || 'paid') !== 'paid' ||
          !['paid', 'completed'].includes(String(order.status || '').toLowerCase()) ||
          context.reservation.status !== 'issued' || (refundStatus && !['not_requested', 'none'].includes(refundStatus))) {
        return manualPaymentFailure('MANUAL_PAYMENT_ENTITLEMENT_CONFLICT', 'The signed NUSC paid entitlement or its AHIBI reservation is no longer in a valid paid state.');
      }
    } else if (context.order.status !== 'completed' || context.order.refundStatus !== 'not_requested' ||
        context.order.orderType !== 'seasonPass') {
      return manualPaymentFailure('MANUAL_PAYMENT_ENTITLEMENT_CONFLICT', 'The AHIBI order is not a completed, non-refunded season pass.');
    }

    const expectedAmounts = knownPaymentAmounts(context);
    if (expectedAmounts.some((amount) => !Number.isSafeInteger(amount)) || new Set(expectedAmounts).size > 1 ||
        (expectedAmounts.length && expectedAmounts[0] !== capturedAmountMinor)) {
      return manualPaymentFailure('MANUAL_PAYMENT_AMOUNT_CONFLICT', 'The captured amount conflicts with the amount recorded on the paid entitlement.');
    }
    const expectedCurrencies = knownPaymentCurrencies(context);
    if (new Set(expectedCurrencies).size > 1 ||
        (expectedCurrencies.length && expectedCurrencies[0] !== currency) ||
        (!expectedCurrencies.length && currency !== 'INR')) {
      return manualPaymentFailure('MANUAL_PAYMENT_CURRENCY_CONFLICT', 'The captured currency conflicts with the paid entitlement.');
    }

    if (context.channel === 'ahibi') {
      let transactions;
      try {
        transactions = await deps.PaymentTransaction.find({ paymentId }).lean();
      } catch {
        return manualPaymentFailure('PAYMENT_TRANSACTION_UNAVAILABLE', 'AHIBI payment records are unavailable; manual Razorpay confirmation cannot safely be matched to this order yet.');
      }
      if ((transactions || []).length > 1) {
        return manualPaymentFailure('PAYMENT_TRANSACTION_CONFLICT', 'More than one AHIBI payment transaction uses this Razorpay Payment ID. Resolve the duplicate payment records before reissue.');
      }
      const transaction = transactions?.[0] || null;
      if (transaction) {
        const transactionAmounts = [];
        if (transaction.amountPaise != null) transactionAmounts.push(Number(transaction.amountPaise));
        if (transaction.amount != null) transactionAmounts.push(amountToMinorUnits(String(transaction.amount), currency));
        const transactionStatus = String(transaction.status || '').toLowerCase();
        if ((transaction.paymentId && String(transaction.paymentId) !== paymentId) ||
            (transaction.orderId && String(transaction.orderId) !== String(context.order.orderId)) ||
            (transaction.user && !sameId(transaction.user, context.order.user)) ||
            !['completed', 'resolved', 'paid_no_booking'].includes(transactionStatus) ||
            transactionAmounts.some((amount) => amount == null || amount !== capturedAmountMinor) ||
            (transaction.currency && String(transaction.currency).toUpperCase() !== currency)) {
          return manualPaymentFailure('PAYMENT_TRANSACTION_CONFLICT', 'The saved AHIBI payment transaction conflicts with the manually verified Razorpay payment.');
        }
      }
    }

    const audit = {
      workflow: MANUAL_PAYMENT_WORKFLOW,
      status: 'verified',
      verificationId: supplied.verificationId,
      channel: context.channel,
      orderId: context.order.orderId,
      ...(context.channel === 'rise' && { memberNumber: context.memberNumber }),
      paymentId,
      merchantSource,
      capturedAmount,
      capturedAmountMinor,
      currency,
      verifiedAt: deps.now(),
      adminId: asString(adminId),
      auditReason,
      source: 'razorpay_dashboard_manual',
    };
    return { verified: true, source: audit.source, referencePresent: true, audit };
  }

  function findManualPaymentAudit(context, verificationId) {
    if (context.channel === 'rise') {
      return (context.reservation?.adminTicketRecoveryAudit || []).find((entry) => (
        entry.requestId === verificationId && entry.action === 'payment_verified_manually' &&
        entry.details?.workflow === MANUAL_PAYMENT_WORKFLOW && entry.details?.status === 'verified'
      )) || null;
    }
    return (context.order?.operationsAudit || []).find((entry) => (
      entry.action === 'admin_manual_payment_verified' && entry.details?.verificationId === verificationId &&
      entry.details?.workflow === MANUAL_PAYMENT_WORKFLOW && entry.details?.status === 'verified'
    )) || null;
  }

  async function verifyStoredManualPayment(context, verificationId) {
    if (!REQUEST_ID_PATTERN.test(String(verificationId || ''))) {
      return { verified: false, source: 'manual_razorpay_dashboard_verification_missing', referencePresent: Boolean(contextPaymentId(context)), reasonCode: 'MANUAL_PAYMENT_VERIFICATION_REQUIRED', message: 'Record an Admin Razorpay Dashboard verification for this exact paid order before using manual payment verification.', evidenceRequired: 'Complete the manual payment verification step for the selected order.' };
    }
    const entry = findManualPaymentAudit(context, verificationId);
    const details = entry?.details;
    if (!entry || !details || details.orderId !== context.order.orderId || details.channel !== context.channel ||
        details.merchantSource !== trustedPaymentMerchantSource(context) ||
        (context.channel === 'rise' && details.memberNumber !== context.memberNumber)) {
      return { verified: false, source: 'manual_razorpay_dashboard_verification_missing', referencePresent: Boolean(contextPaymentId(context)), reasonCode: 'MANUAL_PAYMENT_VERIFICATION_NOT_FOUND', message: 'The manual payment verification does not match this selected order, member, or authoritative Razorpay account.', evidenceRequired: 'Record a new payment verification against the selected entitlement.' };
    }
    const verifiedAt = new Date(details.verifiedAt || entry.at || 0);
    const age = deps.now().getTime() - verifiedAt.getTime();
    if (!Number.isFinite(verifiedAt.getTime()) || age < 0 || age > MANUAL_PAYMENT_VERIFICATION_MAX_AGE_MS) {
      return { verified: false, source: 'manual_razorpay_dashboard_verification_expired', referencePresent: true, reasonCode: 'MANUAL_PAYMENT_VERIFICATION_EXPIRED', message: 'The manual Razorpay verification has expired and must be confirmed again before reissue.', evidenceRequired: 'Recheck the payment in Razorpay and record a fresh manual verification.' };
    }
    const checked = await validateManualPayment(context, {
      verificationId,
      orderId: details.orderId,
      memberNumber: details.memberNumber,
      paymentId: details.paymentId,
      capturedAmount: details.capturedAmount,
      currency: details.currency,
      auditReason: details.auditReason,
      confirmed: true,
    }, details.adminId);
    if (!checked.verified) return checked;
    return { ...checked, source: details.source, audit: { ...details, verifiedAt } };
  }

  async function verifyPayment(context, manualPaymentVerificationId) {
    if (manualPaymentVerificationId) return verifyStoredManualPayment(context, manualPaymentVerificationId);
    if (context.channel === 'rise') {
      const { order, reservation } = context;
      const valid = Boolean(reservation && order.kind === 'paid' && (order.settlementType || 'paid') === 'paid' &&
        ['paid', 'completed'].includes(String(order.status || '').toLowerCase()) && order.paymentId &&
        order.paymentId === reservation.paymentId && reservation.status === 'issued');
      return { verified: valid, source: 'signed_nusc_paid_order', referencePresent: Boolean(order.paymentId) };
    }
    const { kind, order } = context;
    if (kind === 'manual') {
      const valid = order.status === 'issued' && order.settlementType === 'paid' && Boolean(order.settlementHash) &&
        Number(order.settledAmountMinor) === Number(order.listAmountMinor) && Boolean(order.settledBy) && Boolean(order.settledAt);
      return { verified: valid, source: 'audited_manual_settlement', referencePresent: Boolean(order.paymentReference) };
    }
    if (order.status !== 'completed' || order.refundStatus !== 'not_requested' || !order.paymentId) {
      return { verified: false, source: 'razorpay_capture_unverified', referencePresent: Boolean(order.paymentId) };
    }
    const transaction = await deps.PaymentTransaction.findOne({ orderId: order.orderId, paymentId: order.paymentId }).lean();
    if (!transaction || transaction.status !== 'completed' || !sameId(transaction.user, order.user) ||
        (transaction.amountPaise != null && Number(transaction.amountPaise) !== Number(order.amountMinor)) ||
        (transaction.amountPaise == null && transaction.amount != null && Math.round(Number(transaction.amount) * 100) !== Number(order.amountMinor)) ||
        String(transaction.currency || 'INR').toUpperCase() !== String(order.currency || 'INR').toUpperCase()) {
      return { verified: false, source: 'payment_transaction_mismatch', referencePresent: true };
    }
    let payment;
    try {
      payment = await deps.razorpay().payments.fetch(order.paymentId);
    } catch {
      return { verified: false, source: 'razorpay_capture_unavailable', referencePresent: true };
    }
    const verified = payment?.status === 'captured' && payment?.captured === true &&
      String(payment.id) === String(order.paymentId) && String(payment.order_id) === String(order.orderId) &&
      Number(payment.amount) === Number(order.amountMinor) &&
      String(payment.currency || '').toUpperCase() === String(order.currency || 'INR').toUpperCase() &&
      Number(payment.amount_refunded || 0) === 0;
    return { verified, source: verified ? 'razorpay_captured_and_transaction_completed' : 'razorpay_capture_mismatch', referencePresent: true };
  }

  function sameManualPaymentAudit(existing, candidate) {
    return Boolean(existing && candidate &&
      existing.verificationId === candidate.verificationId &&
      existing.channel === candidate.channel &&
      existing.orderId === candidate.orderId &&
      existing.memberNumber === candidate.memberNumber &&
      existing.paymentId === candidate.paymentId &&
      existing.merchantSource === candidate.merchantSource &&
      Number(existing.capturedAmountMinor) === Number(candidate.capturedAmountMinor) &&
      existing.currency === candidate.currency &&
      existing.adminId === candidate.adminId &&
      existing.auditReason === candidate.auditReason);
  }

  async function recordManualPaymentVerification(input) {
    if (!input.adminId) throw new TicketReissueError(401, 'ADMIN_REQUIRED', 'Admin authorization is required to record payment verification.');
    const verificationId = String(input.verificationRequestId || '');
    if (!REQUEST_ID_PATTERN.test(verificationId)) throw new TicketReissueError(400, 'PAYMENT_VERIFICATION_ID_REQUIRED', 'A valid one-time verification ID is required.');
    const context = await loadContext(input);
    const supplied = {
      ...(input.manualPaymentVerification || {}),
      verificationId,
    };
    const checked = await validateManualPayment(context, supplied, input.adminId);
    if (!checked.verified) {
      throw new TicketReissueError(409, checked.reasonCode, checked.message, {
        paymentVerified: false,
        reasons: [{ code: checked.reasonCode, message: checked.message, evidenceRequired: checked.evidenceRequired }],
      });
    }
    const details = checked.audit;
    const existing = findManualPaymentAudit(context, verificationId);
    if (existing) {
      if (!sameManualPaymentAudit(existing.details, details)) {
        throw new TicketReissueError(409, 'MANUAL_PAYMENT_VERIFICATION_ID_CONFLICT', 'This verification ID is already linked to different payment evidence. Start a new verification.');
      }
      return { status: 'already_verified', verificationId, verifiedAt: existing.details.verifiedAt || existing.at, source: existing.details.source, merchantSource: existing.details.merchantSource };
    }

    if (context.channel === 'rise') {
      if (typeof deps.inventory.recordPartnerSeasonPassManualPaymentVerification !== 'function') {
        throw new TicketReissueError(503, 'MANUAL_PAYMENT_AUDIT_UNAVAILABLE', 'The NUSC payment verification audit could not be saved. No tickets were issued.');
      }
      try {
        const saved = await deps.inventory.recordPartnerSeasonPassManualPaymentVerification({
          reservationId: context.reservation.reservationId,
          verificationId,
          paymentId: details.paymentId,
          adminId: input.adminId,
          auditDetails: details,
        });
        if (saved?.details) details.verifiedAt = saved.details.verifiedAt || saved.at || details.verifiedAt;
      } catch (error) {
        if (error.code) throw new TicketReissueError(409, error.code, error.message);
        throw error;
      }
    } else {
      const Model = deps.NuscHomeMatchOrder;
      const update = await Model.updateOne({
        _id: context.order._id,
        orderId: context.order.orderId,
        orderType: 'seasonPass',
        status: 'completed',
        refundStatus: 'not_requested',
        paymentId: details.paymentId,
        user: context.order.user,
        amountMinor: context.order.amountMinor,
        currency: context.order.currency || 'INR',
        'operationsAudit.details.verificationId': { $ne: verificationId },
      }, {
        $push: { operationsAudit: { action: 'admin_manual_payment_verified', admin: input.adminId, at: details.verifiedAt, details } },
      });
      if (update.modifiedCount !== 1) {
        const latest = await Model.findOne({ _id: context.order._id }).lean();
        const duplicate = findManualPaymentAudit({ ...context, order: latest }, verificationId);
        if (!duplicate || !sameManualPaymentAudit(duplicate.details, details)) {
          throw new TicketReissueError(409, 'MANUAL_PAYMENT_VERIFICATION_SAVE_CONFLICT', 'The paid order changed while its manual payment verification was being recorded. Refresh and review the order.');
        }
        return { status: 'already_verified', verificationId, verifiedAt: duplicate.details.verifiedAt || duplicate.at, source: duplicate.details.source, merchantSource: duplicate.details.merchantSource };
      }
    }
    return { status: 'verified', verificationId, verifiedAt: details.verifiedAt, source: details.source, merchantSource: details.merchantSource };
  }

  function replacementLineage(context, reasons) {
    if (context.channel !== 'rise') return { verified: true, eligibleIndices: Array.from({ length: 10 }, (_, index) => index + 1) };
    const { order, reservation, oldReservation } = context;
    const supportedPaidPass = (order.passId === 'premium-season' && order.ticketType === 'Premium Pass') ||
      (order.passId === 'general-season' && order.ticketType === 'General Pass');
    if (!reservation || context.reservationLinkVerified !== true || reservation.partnerOrderId !== order.partnerOrderId || reservation.passId !== order.passId ||
        reservation.ticketType !== order.ticketType || !supportedPaidPass) {
      addReason(reasons, 'RESERVATION_MISMATCH', 'The signed paid order does not match a supported AHIBI season pass reservation.', 'Verify the signed NUSC order and AHIBI reservation linkage.');
      return { verified: false, eligibleIndices: [] };
    }
    if (oldReservation && (reservation.passId !== 'premium-season' || reservation.ticketType !== 'Premium Pass')) {
      addReason(reasons, 'REPLACEMENT_PASS_TYPE_INVALID', 'Only a paid Premium pass can use a General-to-Premium replacement lineage.', 'Select the paid Premium replacement order or send this reservation for manual review.');
      return { verified: false, eligibleIndices: [] };
    }
    if (!oldReservation) {
      if (reservation.replacedByReservationId) {
        addReason(reasons, 'SUPERSEDED_ORDER', 'This order has itself been replaced; select its current replacement order.', 'Select the latest active paid RISE entitlement.');
        return { verified: false, eligibleIndices: [] };
      }
      return { verified: true, eligibleIndices: Array.from({ length: 10 }, (_, index) => index + 1) };
    }
    const usedCount = Number(reservation.replacementUsedTicketCount);
    const cancelledCount = Number(reservation.replacementCancelledTicketCount);
    const rawIndices = (reservation.replacementMatchIndices || []).map(Number);
    const unique = new Set(rawIndices);
    const dates = context.fixtures.map((fixture) => fixture.matchDate);
    const eventIds = context.fixtures.map((fixture) => asString(fixture.eventId));
    const valid = reservation.status === 'issued' && reservation.replacesReservationId === oldReservation.reservationId &&
      oldReservation.status === 'replaced' && oldReservation.replacedByReservationId === reservation.reservationId &&
      oldReservation.passId === 'general-season' && oldReservation.ticketType === 'General Pass' &&
      sameId(oldReservation.memberReferenceHash, reservation.memberReferenceHash) &&
      Number.isInteger(usedCount) && Number.isInteger(cancelledCount) && usedCount + cancelledCount === 10 &&
      cancelledCount === rawIndices.length && unique.size === rawIndices.length &&
      rawIndices.every((index, offset) => Number.isInteger(index) && index >= 1 && index <= 10 && (offset === 0 || index > rawIndices[offset - 1])) &&
      oldReservation.matchDates?.length === 10 && reservation.matchDates?.length === 10 &&
      oldReservation.eventIds?.length === 10 && reservation.eventIds?.length === 10 &&
      oldReservation.matchDates.every((date, offset) => date === reservation.matchDates[offset] && date === dates[offset]) &&
      oldReservation.eventIds.every((id, offset) => sameId(id, reservation.eventIds[offset]) && asString(id) === eventIds[offset]);
    if (!valid) addReason(reasons, 'REPLACEMENT_LINEAGE_UNVERIFIED', 'Saved General-to-Premium replacement decisions or fixture linkage do not reconcile.', 'Verify the reciprocal reservation links, exact fixture set, and saved used/cancelled decision. Do not infer non-use from NUSC cancellation rows or an empty scan query.');
    return { verified: valid, eligibleIndices: valid ? rawIndices : [] };
  }

  function inventorySnapshot(context, fixture, activeBookings, now) {
    const ticket = fixture.event?.ticketTypes?.find((row) => row.name === fixture.ticketType);
    if (!ticket) return { configured: false, sold: null, activeBookings: activeBookings.length, capacity: null, activeHolds: 0, soldDelta: null };
    const sold = ticket.sold == null ? null : Number(ticket.sold);
    const capacity = Number(deps.inventory.TICKET_CAPACITIES[fixture.ticketType] ?? ticket.quantity ?? 0);
    const ownReservationId = context.reservation?.reservationId;
    const ownOrderId = context.channel === 'rise' ? ownReservationId : context.order?.orderId;
    const ownHoldIds = new Set([ownReservationId, ownOrderId, `nusc-recovery:${ownReservationId}`].filter(Boolean));
    const matchHolds = orderRows(context.inventoryDoc).filter((hold) => hold.matchDate === fixture.matchDate &&
      !ownHoldIds.has(hold.orderId) && isActiveHold(hold, now));
    const activeHolds = matchHolds.reduce((sum, hold) => sum + ticketHoldUnits(hold, fixture.ticketType), 0);
    const seasonHolds = seasonHoldRows(context.inventoryDoc).filter((hold) => (
      hold.ticketType === fixture.ticketType && (hold.matchDates || []).includes(fixture.matchDate) && isActiveSeasonHold(hold, now)
    ));
    const ownSeasonHold = seasonHolds.find((hold) => ownHoldIds.has(hold.orderId) && Number(hold.quantity) === 1);
    const otherSeasonHolds = seasonHolds.filter((hold) => !ownHoldIds.has(hold.orderId))
      .reduce((sum, hold) => sum + Number(hold.quantity || 0), 0);
    const otherPartnerReservations = reservationRows(context.inventoryDoc).filter((reservation) => {
      if (reservation.reservationId === ownReservationId || reservation.reservationId === context.oldReservation?.reservationId) return false;
      if (reservation.ticketType !== fixture.ticketType || !(reservation.matchDates || []).includes(fixture.matchDate)) return false;
      return reservation.status === 'issuing' ||
        (reservation.status === 'held' && new Date(reservation.expiresAt) > now);
    }).length;
    return {
      configured: Number.isInteger(sold) && sold >= 0 && Number.isFinite(capacity) && capacity > 0,
      sold,
      activeBookings: activeBookings.length,
      capacity,
      activeHolds: activeHolds + otherSeasonHolds + otherPartnerReservations,
      ownSeasonHold: Boolean(ownSeasonHold),
      soldDelta: Number.isInteger(sold) ? sold - activeBookings.length : null,
    };
  }

  async function buildPreview(context, evidence = {}, manualPaymentVerificationId = null) {
    const reasons = [];
    const payment = await verifyPayment(context, manualPaymentVerificationId);
    if (!payment.verified) addReason(reasons, payment.reasonCode || 'PAID_ENTITLEMENT_UNVERIFIED',
      payment.message || 'The existing paid entitlement is not backed by matching authoritative payment records.',
      payment.evidenceRequired || (context.channel === 'rise' ? 'Verify the signed NUSC paid order and payment reference.' : context.kind === 'online'
        ? 'Verify a completed PaymentTransaction and Razorpay payment with captured=true, matching order, amount, and currency, or record an Admin Dashboard verification.'
        : 'Verify the original paid manual settlement record, settlement hash, full amount, and Admin settlement audit.'));
    if (context.channel === 'ahibi') {
      const order = context.order;
      if (context.kind === 'manual' && order.settlementType !== 'paid') addReason(reasons, 'COMPLIMENTARY_ORDER_INELIGIBLE', 'Complimentary season passes cannot be reissued by this paid-entitlement action.', 'Select an existing verified paid entitlement.');
      if (context.kind === 'online' && order.orderType !== 'seasonPass') addReason(reasons, 'ORDER_TYPE_INELIGIBLE', 'Only an existing season pass can be reissued from this interface.', 'Use the existing order recovery workflow for another ticket order type.');
      if (context.kind === 'manual' && !['issued', 'needs_reconciliation'].includes(order.status)) addReason(reasons, 'ORDER_NOT_ISSUED', 'The paid manual season pass is not in an issued state.', 'Resolve the original pass settlement before reissue.');
      if (context.kind === 'online' && order.status !== 'completed') addReason(reasons, 'ORDER_NOT_COMPLETED', 'The existing Razorpay season pass is not completed.', 'Resolve the original payment order before reissue.');
      if (context.kind === 'online' && ['requested', 'pending', 'processed', 'failed_review'].includes(order.refundStatus)) addReason(reasons, 'REFUND_STATE_CONFLICT', 'The paid order has a refund state that needs review.', 'Resolve the original refund record before reissue.');
    } else {
      const { order, reservation } = context;
      if (!reservation || order.kind !== 'paid' || (order.settlementType || 'paid') !== 'paid' || !['paid', 'completed'].includes(String(order.status || '').toLowerCase())) {
        addReason(reasons, 'RISE_ORDER_NOT_PAID', 'The signed NUSC order is not a paid season pass.', 'Select the verified paid NUSC entitlement.');
      }
    }

    const lineage = replacementLineage(context, reasons);
    const fixtures = context.fixtures || [];
    const expectedType = context.channel === 'rise' ? context.reservation?.ticketType : context.kind === 'manual' ? context.order.ticketType : context.order.bookingDetails?.ticketType;
    if (fixtures.length !== 10 || fixtures.some((fixture, offset) => (
      Number(fixture.matchIndex) !== offset + 1 || !fixture.eventId || !fixture.matchDate ||
      !sameId(fixture.eventId, fixture.event?._id) || fixture.ticketType !== expectedType ||
      !fixture.event?.slug?.startsWith('nusc-home-match-') || deps.inventory.matchDateFromSlug(fixture.event.slug) !== fixture.matchDate ||
      !fixture.event.ticketTypes?.some((ticket) => ticket.name === fixture.ticketType)
    ))) addReason(reasons, 'FIXTURE_MAPPING_UNVERIFIED', 'The original ten fixture allocation does not match current event records.', 'Verify each saved event ID, date, index, and ticket type before reissue.');
    const passZone = context.channel === 'rise' ? context.reservation?.zone
      : context.kind === 'manual' ? context.order?.zone : context.order?.bookingDetails?.zone;
    if (expectedType === 'General Pass' && !deps.inventory.GENERAL_SEATING_AREAS?.some((area) => area.name === passZone)) {
      addReason(reasons, 'GENERAL_ZONE_UNVERIFIED', 'The existing General pass has no valid saved seating zone.', 'Verify the original paid pass zone before issuing replacement General tickets.');
    }

    const historicalEvidence = normalizedHistoricalEvidence(evidence.historicalEvidence);
    const inventoryEvidence = normalizedInventoryEvidence(evidence.inventoryEvidence);
    const scanKeys = new Set((context.scans || []).map((scan) => `${asString(scan.ticket)}:${asString(scan.event)}`));
    const bookingRowsByIndex = new Map();
    for (const booking of context.bookings || []) {
      const index = indexForBooking(context.kind, booking);
      if (!index) continue;
      const rows = bookingRowsByIndex.get(index) || [];
      rows.push(booking);
      bookingRowsByIndex.set(index, rows);
    }
    const activeByEvent = new Map();
    for (const fixture of fixtures) {
      const rows = (context.allActiveBookings || []).filter((booking) => sameId(booking.event, fixture.eventId) &&
        booking.ticketType === fixture.ticketType && ACTIVE_STATUSES.includes(booking.status) && booking.paymentStatus === 'completed' &&
        booking.bookingSource !== 'on-spot');
      activeByEvent.set(fixture.matchIndex, rows);
    }
    const memberBookings = context.channel === 'rise'
      ? await deps.Booking.find({
        'nuscPartnerTicket.partnerId': 'nusc',
        'nuscPartnerTicket.memberReferenceHash': context.reservation?.memberReferenceHash,
        event: { $in: fixtures.map((fixture) => fixture.eventId).filter(Boolean) },
        status: { $in: ACTIVE_STATUSES }, paymentStatus: 'completed',
      }).lean()
      : await deps.Booking.find({
        user: context.order?.user,
        event: { $in: fixtures.map((fixture) => fixture.eventId).filter(Boolean) },
        status: { $in: ACTIVE_STATUSES }, paymentStatus: 'completed',
      }).lean();

    const fixtureResults = [];
    const eligibleSet = new Set(lineage.eligibleIndices);
    for (const fixture of fixtures) {
      const index = fixture.matchIndex;
      const isReplacementUsedFixture = context.channel === 'rise' && context.oldReservation && !eligibleSet.has(index);
      const ref = context.channel === 'rise'
        ? (fixture.premiumReference || fixture.generalReference)
        : asString(context.order.bookingIds?.[index - 1]) || asString((context.bookings || []).find((booking) => indexForBooking(context.kind, booking) === index)?._id) || null;
      const rows = (bookingRowsByIndex.get(index) || []).filter((booking) => {
        if (context.channel === 'rise' && context.oldReservation) {
          return isReplacementUsedFixture
            ? sameId(booking.nuscPartnerTicket?.reservationId, context.oldReservation.reservationId)
            : sameId(booking.nuscPartnerTicket?.reservationId, context.reservation?.reservationId);
        }
        return true;
      });
      const currentRows = rows.filter((booking) => !(booking.status === 'cancelled' && booking.adminTicketReissue?.status === 'superseded' && booking.adminTicketReissue?.newBookingId));
      const matchingRef = currentRows.filter((booking) => !ref || sameId(booking._id, ref));
      const row = matchingRef.length === 1 ? matchingRef[0] : currentRows.length === 1 ? currentRows[0] : null;
      const exactScan = Boolean((ref && scanKeys.has(`${ref}:${asString(fixture.eventId)}`)) ||
        (row && scanKeys.has(`${asString(row._id)}:${asString(fixture.eventId)}`)));
      let status = isReplacementUsedFixture ? 'checked_in' : bookingState(row, exactScan);
      if (currentRows.length > 1 || matchingRef.length > 1) {
        status = 'manual_review';
        addReason(reasons, 'DUPLICATE_OR_AMBIGUOUS_TICKETS', 'Multiple ticket records map to this fixture.', 'Reconcile the old and replacement ticket references before reissue.', index);
      }
      if (isReplacementUsedFixture && context.oldReservation) {
        const usedCount = Number(context.reservation.replacementUsedTicketCount);
        const savedUsed = (context.reservation.replacementMatchIndices || []).map(Number).length === 10 - usedCount;
        const oldRow = (context.bookings || []).find((booking) => sameId(booking._id, fixture.generalReference));
        const oldScan = Boolean(fixture.generalReference && scanKeys.has(`${fixture.generalReference}:${asString(fixture.eventId)}`));
        const oldUseProof = historicalEvidence.get(index);
        const independentlyVerifiedUse = oldUseProof?.outcome === 'used' &&
          oldUseProof.reference !== fixture.generalReference && oldUseProof.ticketReference === fixture.generalReference;
        if (oldRow?.status === 'cancelled' && oldScan) {
          status = 'manual_review';
          addReason(reasons, 'GENERAL_CANCELLED_TICKET_HAS_SCAN', 'The replaced General ticket is cancelled but has a scan record.', 'Reconcile the original check-in and replacement decision records before preserving this fixture as used.', index);
        } else if (!savedUsed || (!oldRow && !oldScan && !independentlyVerifiedUse) ||
            (oldRow && !(oldRow.status === 'checked-in' || oldRow.entryVerified === true) && !oldScan && !independentlyVerifiedUse)) {
          status = 'manual_review';
          addReason(reasons, 'USED_TICKET_EVIDENCE_MISSING', 'A fixture saved as used has no authoritative check-in evidence.', 'Restore the original ticket/check-in record or cite an independent archived check-in record for this fixture. Empty scan results and NUSC cancelled rows do not prove non-use or use.', index);
        }
      }
      if (status === 'refunded' || status === 'unusable') {
        addReason(reasons, 'TICKET_STATE_CONFLICT', 'A ticket has a refunded or unsupported state.', 'Review its payment, cancellation, and scan history; it will not be silently reactivated.', index);
      }
      if (row && status === 'checked_in' && row.paymentStatus !== 'completed') {
        addReason(reasons, 'CHECKED_IN_PAYMENT_CONFLICT', 'A checked-in booking does not have completed payment state.', 'Resolve the payment/ticket history before reissue.', index);
      }
      if (row?.status === 'cancelled' && (exactScan || row.entryVerified === true)) {
        addReason(reasons, 'CANCELLED_TICKET_HAS_ADMISSION_EVIDENCE', 'A cancelled ticket also has check-in evidence.', 'Manually reconcile the cancellation and admission history before issuing a replacement.', index);
      }
      if (row && exactScan && !['confirmed', 'checked-in', 'cancelled', 'refunded'].includes(row.status)) {
        addReason(reasons, 'SCAN_TICKET_STATE_CONFLICT', 'A scan is linked to a ticket in an unsupported booking state.', 'Reconcile the original ticket and scan records before issuing any replacement.', index);
      }
      if (row && !isReplacementUsedFixture) {
        const ownershipMatches = context.channel === 'rise'
          ? row.nuscPartnerTicket?.partnerId === 'nusc' &&
            row.nuscPartnerTicket?.partnerOrderId === context.reservation.partnerOrderId &&
            row.nuscPartnerTicket?.reservationId === context.reservation.reservationId &&
            sameId(row.nuscPartnerTicket?.memberReferenceHash, context.reservation.memberReferenceHash) &&
            Number(row.nuscPartnerTicket?.ticketIndex) === index && row.paymentProvider === 'nusc-partner' &&
            row.externalPaymentId === context.reservation.paymentId && row.nuscSeasonPassType === context.reservation.passId
          : context.kind === 'manual'
            ? row.manualSeasonPassOrderId === context.order.orderId &&
              row.manualSeasonPassSettlementType === 'paid' && row.paymentProvider === 'manual' &&
              row.nuscSeasonPassType === context.order.passId
            : row.nuscOrderId === context.order.orderId && row.paymentProvider === 'razorpay' &&
              row.externalPaymentId === context.order.paymentId && row.nuscSeasonPassType === context.order.bookingDetails?.passId;
        if (!ownershipMatches || !sameId(row.event, fixture.eventId) || row.ticketType !== fixture.ticketType ||
            Number(indexForBooking(context.kind, row)) !== index || row.paymentStatus !== 'completed') {
          addReason(reasons, 'TICKET_REFERENCE_CONFLICT', 'A saved ticket row does not match the paid order, member, or fixture.', 'Resolve the booking reference and payment metadata before reissue.', index);
        }
      }
      const otherMemberActive = memberBookings.filter((booking) => sameId(booking.event, fixture.eventId) &&
        Number(indexForBooking(context.kind, booking) || index) === index &&
        ACTIVE_STATUSES.includes(booking.status) && booking.paymentStatus === 'completed' &&
        (!row || !sameId(booking._id, row._id)));
      if (otherMemberActive.length) addReason(reasons, 'MEMBER_ACTIVE_TICKET_CONFLICT', 'Another active or checked-in ticket already covers this member and fixture.', 'Resolve the overlapping ticket before issuing a new identity.', index);

      const issueRequested = !isReplacementUsedFixture && ['missing', 'cancelled'].includes(status);
      const issueAfterEvidence = issueRequested && historicalEvidence.get(index)?.outcome !== 'used';
      const activeBookings = activeByEvent.get(index) || [];
      const inv = inventorySnapshot(context, fixture, activeBookings, deps.now());
      if (issueAfterEvidence && !inv.configured) {
        addReason(reasons, 'INVENTORY_UNVERIFIED', 'Current sold count or fixture capacity is unavailable.', 'Restore the authoritative fixture inventory values before issuing a new ticket.', index);
      }
      if (issueRequested && (!ref || !mongoose.isValidObjectId(ref))) {
        addReason(reasons, 'OLD_TICKET_REFERENCE_MISSING', 'The original ticket reference is unavailable for this fixture.', 'Restore the order-to-ticket reference from the order record or an auditable backup before reissue.', index);
      }
      if (issueRequested && !historicalEvidence.has(index)) {
        addReason(reasons, 'CHECKIN_EVIDENCE_REQUIRED', 'Missing ticket rows and an empty scan query do not establish non-use.', 'Cite an independent authoritative check-in archive for this fixture and record whether the old ticket was used.', index);
      }
      if (issueRequested && historicalEvidence.has(index) && historicalEvidence.get(index).reference === ref) {
        addReason(reasons, 'CHECKIN_EVIDENCE_REFERENCE_INVALID', 'The supplied check-in evidence reference duplicates the old ticket ID.', 'Cite the independent check-in archive or source record used to establish this ticket outcome.', index);
      }
      if (issueRequested && historicalEvidence.has(index) && historicalEvidence.get(index).ticketReference !== ref) {
        addReason(reasons, 'CHECKIN_EVIDENCE_TICKET_MISMATCH', 'The cited check-in evidence is not bound to this old ticket reference.', 'Verify that the archive record names this exact old ticket ID and fixture before authorizing reissue.', index);
      }
      if (historicalEvidence.get(index)?.outcome === 'used' && historicalEvidence.get(index).ticketReference === ref && historicalEvidence.get(index).reference !== ref) status = 'checked_in';
      if (historicalEvidence.get(index)?.outcome === 'unused' && exactScan) {
        addReason(reasons, 'CHECKIN_EVIDENCE_CONFLICT', 'The cited evidence says unused but AHIBI has a matching scan record.', 'Resolve the conflicting check-in records; no replacement ticket will be issued.', index);
      }
      if (issueAfterEvidence && inv.soldDelta < 0) addReason(reasons, 'INVENTORY_BOOKINGS_EXCEED_SOLD', 'Active ticket bookings exceed the stored sold allocation.', 'Reconcile the fixture inventory before reissue.', index);
      if (issueAfterEvidence && inv.soldDelta > 1) addReason(reasons, 'MULTIPLE_UNATTRIBUTED_ALLOCATIONS', 'More than one sold unit is unmatched for this fixture.', 'Supply authoritative inventory and booking evidence for every allocation; this entitlement cannot explain multiple units.', index);
      if (issueAfterEvidence && inv.soldDelta === 1 && !inventoryEvidence.has(index)) addReason(reasons, 'INVENTORY_EVIDENCE_REQUIRED', 'One sold unit is unmatched and cannot be assigned from aggregate counts.', 'Cite an authoritative booking, reservation, or inventory backup linking this old ticket reference to the paid order.', index);
      if (issueAfterEvidence && inv.soldDelta === 1 && inventoryEvidence.has(index) &&
          (inventoryEvidence.get(index).ticketReference !== ref || inventoryEvidence.get(index).reference === ref)) {
        addReason(reasons, 'INVENTORY_EVIDENCE_TICKET_MISMATCH', 'The cited inventory evidence is not bound to this old ticket reference.', 'Verify that the source record attributes this exact sold unit to the old ticket reference and paid order.', index);
      }
      if (issueAfterEvidence && inv.soldDelta === 0 && !inv.ownSeasonHold) {
        if (!inv.configured || inv.sold + inv.activeHolds + 1 > inv.capacity) {
          addReason(reasons, 'CAPACITY_UNAVAILABLE', 'A new inventory unit is required and current capacity or holds do not permit it.', 'Resolve fixture capacity and active holds before reissue.', index);
        }
      }
      if (issueAfterEvidence && inv.soldDelta === 1 && inv.sold + inv.activeHolds > inv.capacity) {
        addReason(reasons, 'CAPACITY_OR_HOLD_CONFLICT', 'The existing allocation plus active holds exceeds verified capacity.', 'Resolve holds or verify the authoritative fixture capacity.', index);
      }

      const inventoryEvidenceMatches = inventoryEvidence.get(index)?.ticketReference === ref && inventoryEvidence.get(index)?.reference !== ref;
      const inventoryStatus = !issueAfterEvidence ? 'not_needed' : inv.soldDelta === 1
        ? (inventoryEvidenceMatches ? 'pass' : 'blocked')
        : inv.soldDelta === 0 && (inv.ownSeasonHold || inv.configured && inv.sold + inv.activeHolds + 1 <= inv.capacity)
          ? 'pass' : 'blocked';
      fixtureResults.push({
        matchIndex: index,
        matchDate: fixture.matchDate || null,
        opponent: fixture.opponent || 'Home match',
        eventId: asString(fixture.eventId) || null,
        status,
        oldTicketReference: ref || null,
        currentTicketReference: row ? asString(row._id) : null,
        eligible: !isReplacementUsedFixture,
        inventory: {
          sold: inv.sold,
          activeBookings: inv.activeBookings,
          activeHolds: inv.activeHolds,
          capacity: inv.capacity,
          soldDelta: inv.soldDelta,
          reconciliationRequired: issueAfterEvidence && inv.soldDelta === 1,
          newAllocationRequired: issueAfterEvidence && inv.soldDelta === 0 && !inv.ownSeasonHold,
          status: inventoryStatus,
        },
      });
    }
    const previewResult = {
      status: reasons.length ? 'blocked' : 'ready',
      safe: reasons.length === 0,
      channel: context.channel,
      kind: context.kind,
      orderId: context.order.orderId,
      passId: context.channel === 'rise' ? context.reservation?.passId : context.kind === 'manual' ? context.order.passId : context.order.bookingDetails?.passId,
      paymentProof: payment.source,
      paymentVerified: payment.verified,
      paymentReferencePresent: payment.referencePresent,
      paymentMerchant: trustedPaymentMerchantSource(context),
      lineageVerified: lineage.verified,
      replacementDecision: context.channel === 'rise' && context.oldReservation ? {
        usedTicketCount: Number(context.reservation.replacementUsedTicketCount),
        cancelledUnusedTicketCount: Number(context.reservation.replacementCancelledTicketCount),
        eligibleMatchIndices: lineage.eligibleIndices,
      } : null,
      dashboardSyncStatus: context.channel === 'rise'
        ? latestNewReissueAudit(context.reservation)?.details?.nuscSync || null
        : null,
      missingCount: fixtureResults.filter((fixture) => ['missing', 'cancelled'].includes(fixture.status)).length,
      validCount: fixtureResults.filter((fixture) => fixture.status === 'valid').length,
      checkedInCount: fixtureResults.filter((fixture) => fixture.status === 'checked_in').length,
      fixtures: fixtureResults,
      reasons,
      evidenceNeeded: {
        checkIn: fixtureResults.filter((fixture) => fixture.inventory.status !== 'not_needed' && ['missing', 'cancelled'].includes(fixture.status)).map((fixture) => fixture.matchIndex),
        inventory: fixtureResults.filter((fixture) => fixture.inventory.reconciliationRequired).map((fixture) => fixture.matchIndex),
        historical: reasons.filter((reason) => ['CHECKIN_EVIDENCE_REQUIRED', 'USED_TICKET_EVIDENCE_MISSING'].includes(reason.code) && reason.matchIndex).map((reason) => reason.matchIndex),
      },
    };
    Object.defineProperty(previewResult, 'manualPaymentAudit', { value: payment.audit || null, enumerable: false });
    return previewResult;
  }

  async function loadContext(input) {
    return input.channel === 'rise'
      ? loadRise(String(input.orderId || ''), input.memberNumber)
      : loadAhibi(input.kind, String(input.orderId || ''));
  }

  async function preview(input) {
    const context = await loadContext(input);
    return buildPreview(context, input.evidence || {}, input.manualPaymentVerificationId || null);
  }

  async function claimAhibi(context, requestId, adminId) {
    const Model = context.kind === 'manual' ? deps.ManualSeasonPassOrder : deps.NuscHomeMatchOrder;
    const order = context.order;
    const staleBefore = new Date(deps.now().getTime() - 30 * 60 * 1000);
    const claimed = await Model.findOneAndUpdate({
      _id: order._id,
      $or: [
        { 'adminTicketReissue.status': { $ne: 'processing' } },
        { 'adminTicketReissue.startedAt': { $lte: staleBefore } },
      ],
    }, { $set: { adminTicketReissue: { requestId, admin: adminId, status: 'processing', startedAt: deps.now() } } }, { new: true });
    if (!claimed) throw new TicketReissueError(409, 'REISSUE_IN_PROGRESS', 'Another Admin reissue is already running for this paid order. Refresh the order and retry after it completes.');
    return claimed;
  }

  async function claimRise(context, requestId, adminId) {
    const claim = await deps.inventory.claimPartnerSeasonPassReissue({
      reservationId: context.reservation.reservationId, requestId, adminId,
    });
    if (!claim?.claimed) throw new TicketReissueError(409, claim?.code || 'REISSUE_IN_PROGRESS', 'Another Admin ticket operation is already running for this RISE entitlement. Refresh and retry after it completes.');
    return claim.reservation;
  }

  async function retireOldBooking(context, booking, fixture, requestId, adminId) {
    const common = {
      status: 'cancelled', paymentStatus: 'completed', _id: booking._id,
      event: fixture.eventId, ticketType: fixture.ticketType,
    };
    const set = {
      adminTicketReissue: {
        requestId,
        admin: adminId,
        status: 'superseded',
        at: deps.now(),
        oldBookingId: asString(booking._id),
        oldTicketReference: asString(booking._id),
        orderId: context.order.orderId,
        matchIndex: fixture.matchIndex,
      },
    };
    const unset = context.channel === 'rise'
      ? { 'nuscPartnerTicket.partnerOrderId': '' }
      : context.kind === 'manual'
        ? { manualSeasonPassOrderId: '', manualSeasonPassMatchIndex: '' }
        : { nuscOrderId: '', nuscTicketIndex: '' };
    if (context.channel === 'rise') {
      common['nuscPartnerTicket.partnerId'] = 'nusc';
      common['nuscPartnerTicket.reservationId'] = context.reservation.reservationId;
      common['nuscPartnerTicket.partnerOrderId'] = context.reservation.partnerOrderId;
      common['nuscPartnerTicket.ticketIndex'] = fixture.matchIndex;
      common.externalPaymentId = context.reservation.paymentId;
    } else if (context.kind === 'manual') {
      common.manualSeasonPassOrderId = context.order.orderId;
      common.manualSeasonPassMatchIndex = fixture.matchIndex;
    } else {
      common.nuscOrderId = context.order.orderId;
      common.nuscTicketIndex = fixture.matchIndex;
      common.externalPaymentId = context.order.paymentId;
    }
    const result = await deps.Booking.updateOne(common, { $set: set, $unset: unset });
    if (result.modifiedCount !== 1) throw new TicketReissueError(409, 'OLD_TICKET_CHANGED', `The cancelled ticket for fixture ${fixture.matchIndex} changed during reissue. Refresh and review it.`);
  }

  async function updateOldTicketLink(bookingId, requestId, newBookingId) {
    if (!bookingId || !mongoose.isValidObjectId(asString(bookingId))) return;
    await deps.Booking.updateOne({ _id: bookingId, 'adminTicketReissue.requestId': requestId }, {
      $set: { 'adminTicketReissue.newBookingId': asString(newBookingId) },
    });
  }

  async function reserveNewAllocations(context, previewResult, requestId, adminId) {
    const held = [];
    for (const fixtureResult of previewResult.fixtures) {
      if (!fixtureResult.inventory.newAllocationRequired) continue;
      const fixture = context.fixtures[fixtureResult.matchIndex - 1];
      const orderId = `admin-ticket-reissue:${context.order.orderId}:${requestId}:${fixture.matchDate}`;
      const userId = context.channel === 'rise'
        ? context.reservation.memberReferenceHash.slice(0, 24)
        : context.order.user;
      try {
        await deps.inventory.reserveMatchOrder({
          orderId,
          userId,
          matchDate: fixture.matchDate,
          ticketLines: [{ ticketType: fixture.ticketType, quantity: 1, ...(context.channel === 'rise' ? (context.reservation.zone ? { zone: context.reservation.zone } : {}) : (context.kind === 'manual' ? context.order.zone : context.order.bookingDetails?.zone) ? { zone: context.kind === 'manual' ? context.order.zone : context.order.bookingDetails.zone } : {}) }],
          eventTicketTypes: fixture.event.ticketTypes,
          existingUserTicketCount: 0,
          allowSalesClosed: true,
          skipBuyerLimit: true,
        });
      } catch (error) {
        const code = /^[A-Z0-9_]{1,80}$/.test(String(error.code || '')) ? error.code : 'CAPACITY_UNAVAILABLE';
        throw new TicketReissueError(409, code, `Fixture ${fixture.matchIndex} cannot be reserved safely. Resolve its capacity or inventory holds and refresh the preview before issuing.`, {
          matchIndex: fixture.matchIndex,
          inventoryStatus: 'blocked',
        });
      }
      held.push({ orderId, ticketType: fixture.ticketType });
    }
    return held;
  }

  async function issueNewBookings(context, previewResult, evidence, requestId, adminId) {
    const historical = normalizedHistoricalEvidence(evidence.historicalEvidence);
    const fixturesToIssue = [];
    const retired = [];
    for (const result of previewResult.fixtures) {
      if (!['missing', 'cancelled'].includes(result.status)) continue;
      const proof = historical.get(result.matchIndex);
      if (proof?.outcome === 'used') continue;
      if (proof?.outcome !== 'unused') continue;
      const fixture = context.fixtures[result.matchIndex - 1];
      const rows = (context.bookings || []).filter((booking) => indexForBooking(context.kind, booking) === result.matchIndex &&
        (context.channel !== 'rise' || sameId(booking.nuscPartnerTicket?.reservationId, context.reservation.reservationId)));
      const oldRow = rows.find((booking) => sameId(booking._id, result.oldTicketReference));
      if (oldRow) {
        await retireOldBooking(context, oldRow, fixture, requestId, adminId);
        retired.push({ matchIndex: result.matchIndex, bookingId: asString(oldRow._id) });
      }
      fixturesToIssue.push({
        eventId: fixture.eventId,
        matchDate: fixture.matchDate,
        matchIndex: fixture.matchIndex,
        ticketType: fixture.ticketType,
        ...(context.channel === 'rise' ? {} : { bookingId: null }),
        reissueSourceBookingId: result.oldTicketReference,
      });
    }
    const alreadyIssuedForRequest = unfinalizedReissueRows(context);
    if (!fixturesToIssue.length) return { fixturesToIssue, retired, issued: alreadyIssuedForRequest };

    const common = {
      orderId: context.channel === 'rise' ? context.reservation.partnerOrderId : context.order.orderId,
      fixtures: fixturesToIssue.map(({ reissueSourceBookingId, ...fixture }) => fixture),
      passId: context.channel === 'rise' ? context.reservation.passId : context.kind === 'manual' ? context.order.passId : context.order.bookingDetails.passId,
      quantity: 1,
      paymentProvider: context.channel === 'rise' ? 'nusc-partner' : context.kind === 'manual' ? 'manual' : 'razorpay',
      zone: context.channel === 'rise' ? context.reservation.zone : context.kind === 'manual' ? context.order.zone : context.order.bookingDetails?.zone,
      pricePerMatch: context.channel === 'rise' ? 0 : context.kind === 'manual'
        ? Number(context.order.listAmountMinor) / 100 / 10
        : Number(context.order.amountMinor) / 100 / 10,
      reissueRequestId: requestId,
      reissueAdminId: adminId,
      reissueOldBookingIds: Object.fromEntries(fixturesToIssue.map((fixture) => [fixture.matchIndex, fixture.reissueSourceBookingId])),
      preserveUnrelatedTicketAllocations: true,
    };
    const issued = await deps.issue(context.channel === 'rise'
      ? { ...common, paymentId: context.reservation.paymentId, memberReferenceHash: context.reservation.memberReferenceHash, reservationId: context.reservation.reservationId, partnerId: 'nusc' }
      : context.kind === 'manual'
        ? { ...common, userId: context.order.user, manualOrderId: context.order.orderId, settlementType: context.order.settlementType, modeOfPayment: context.order.modeOfPayment }
        : { ...common, userId: context.order.user, paymentId: context.order.paymentId });
    if (!issued || issued.bookings?.length !== fixturesToIssue.length) throw new TicketReissueError(502, 'ISSUANCE_INCOMPLETE', 'Some new tickets were not confirmed. Keep this order; refresh its status before retrying.');
    for (let offset = 0; offset < issued.bookings.length; offset += 1) {
      const sourceId = fixturesToIssue[offset].reissueSourceBookingId;
      await updateOldTicketLink(sourceId, requestId, issued.bookings[offset]._id);
    }
    const allIssued = new Map(issued.bookings.map((booking) => [indexForBooking(context.kind, booking), booking]));
    alreadyIssuedForRequest.forEach((booking) => allIssued.set(indexForBooking(context.kind, booking), booking));
    return { fixturesToIssue, retired, issued: [...allIssued.values()].sort((left, right) => indexForBooking(context.kind, left) - indexForBooking(context.kind, right)) };
  }

  function finalTicketRows(context, previewResult, issuedBookings, evidence) {
    const issuedByIndex = new Map(issuedBookings.map((booking) => [indexForBooking(context.kind, booking), booking]));
    const prior = normalizedHistoricalEvidence(evidence.historicalEvidence);
    return previewResult.fixtures.map((fixture) => {
      const issued = issuedByIndex.get(fixture.matchIndex);
      const oldRow = (context.bookings || []).find((booking) => sameId(booking._id, fixture.oldTicketReference));
      const proof = prior.get(fixture.matchIndex);
      const checkedIn = fixture.status === 'checked_in' || proof?.outcome === 'used';
      const id = issued?._id || fixture.currentTicketReference || (checkedIn ? fixture.oldTicketReference : oldRow?._id || fixture.oldTicketReference);
      const sourceBooking = id ? issued || (context.bookings || []).find((booking) => sameId(booking._id, id)) : null;
      const usedOriginalGeneral = context.channel === 'rise' && context.oldReservation && !fixture.eligible;
      const ticketReservationId = sourceBooking?.nuscPartnerTicket?.reservationId ||
        (usedOriginalGeneral ? context.oldReservation.reservationId : context.reservation?.reservationId);
      const ticketType = sourceBooking?.ticketType || (usedOriginalGeneral ? context.oldReservation.ticketType : fixture.ticketType);
      const zone = sourceBooking?.nuscGeneralZone || (usedOriginalGeneral ? context.oldReservation.zone : context.reservation?.zone) || null;
      return {
        matchIndex: fixture.matchIndex,
        eventId: fixture.eventId,
        bookingId: id ? asString(id) : null,
        matchDate: fixture.matchDate,
        opponent: fixture.opponent,
        ticketType,
        zone,
        ...(context.channel === 'rise' && id && ticketReservationId && sourceBooking ? {
          ticketAccessPath: `/api/nusc-partner/v1/reservations/${encodeURIComponent(ticketReservationId)}/tickets/${encodeURIComponent(asString(id))}`,
        } : {}),
        status: checkedIn ? 'used' : 'confirmed',
      };
    });
  }

  function unfinalizedReissueRows(context) {
    const completedRequestIds = new Set(context.channel === 'rise'
      ? (context.reservation?.adminTicketRecoveryAudit || [])
        .filter((entry) => entry.action === 'recovered' && entry.details?.workflow === 'admin_new_ticket_reissue' && entry.details?.status === 'completed')
        .map((entry) => entry.requestId)
      : (context.order?.operationsAudit || [])
        .filter((entry) => entry.details?.status === 'completed')
        .map((entry) => entry.details?.requestId));
    return (context.bookings || []).filter((booking) => booking.adminTicketReissue?.requestId &&
      booking.adminTicketReissue?.status === 'issued' && ACTIVE_STATUSES.includes(booking.status) &&
      booking.paymentStatus === 'completed' && !completedRequestIds.has(booking.adminTicketReissue.requestId));
  }

  function oldToNewTicketLinks(previewResult, tickets) {
    const byIndex = new Map(tickets.map((ticket) => [ticket.matchIndex, ticket]));
    return previewResult.fixtures.flatMap((fixture) => {
      const ticket = byIndex.get(fixture.matchIndex);
      return ticket?.bookingId && fixture.oldTicketReference && ticket.bookingId !== fixture.oldTicketReference
        ? [{ matchIndex: fixture.matchIndex, oldBookingId: fixture.oldTicketReference, newBookingId: ticket.bookingId }]
        : [];
    });
  }

  function ticketsForRiseSync(tickets) {
    return tickets.map((ticket) => ({
      matchIndex: ticket.matchIndex,
      matchDate: ticket.matchDate,
      opponent: ticket.opponent,
      eventId: ticket.eventId,
      bookingId: ticket.bookingId,
      ticketType: ticket.ticketType,
      zone: ticket.zone,
      ...(ticket.ticketAccessPath && { ticketAccessPath: ticket.ticketAccessPath }),
      status: ticket.status === 'used' ? 'used' : 'confirmed',
    }));
  }

  async function saveAhibiResult(context, input, previewResult, result, tickets) {
    const Model = context.kind === 'manual' ? deps.ManualSeasonPassOrder : deps.NuscHomeMatchOrder;
    const details = {
      requestId: input.requestId,
      status: 'completed',
      reissuedMatchIndices: oldToNewTicketLinks(previewResult, tickets).map((link) => link.matchIndex),
      oldToNewReferences: oldToNewTicketLinks(previewResult, tickets),
      historicalEvidence: [...normalizedHistoricalEvidence(input.evidence?.historicalEvidence).values()].map(({ matchIndex, reference, ticketReference, outcome }) => ({ matchIndex, reference, ticketReference, outcome })),
      inventoryEvidence: [...normalizedInventoryEvidence(input.evidence?.inventoryEvidence).values()].map(({ matchIndex, reference, ticketReference }) => ({ matchIndex, reference, ticketReference })),
      paymentProof: previewResult.paymentProof,
      ...(previewResult.manualPaymentAudit && { manualPaymentVerification: previewResult.manualPaymentAudit }),
      approvedBy: asString(input.adminId),
      approvedAt: deps.now(),
    };
    const bookingIds = tickets.map((ticket) => ticket.bookingId).filter(Boolean);
    const $set = { 'adminTicketReissue.status': 'completed', 'adminTicketReissue.completedAt': deps.now(), bookingIds };
    const update = await Model.updateOne({ _id: context.order._id, 'adminTicketReissue.requestId': input.requestId }, {
      $set,
      $push: { operationsAudit: { action: 'admin_new_ticket_reissue', admin: input.adminId, at: deps.now(), details } },
    });
    if (update.modifiedCount !== 1) throw new TicketReissueError(409, 'ORDER_CHANGED', 'The paid order changed before its new ticket references could be saved. Refresh and review it.');
    if (context.kind === 'online') {
      await deps.PaymentTransaction.updateOne({ orderId: context.order.orderId, paymentId: context.order.paymentId, status: 'completed' }, { $set: { bookingIds } });
    } else {
      await deps.inventory.markSeasonPassStockApplied(context.order.orderId);
    }
    return details;
  }

  async function saveRiseResult(context, input, previewResult, result, tickets) {
    const detail = {
      workflow: 'admin_new_ticket_reissue',
      status: 'completed',
      reissuedMatchIndices: oldToNewTicketLinks(previewResult, tickets).map((link) => link.matchIndex),
      oldToNewReferences: oldToNewTicketLinks(previewResult, tickets),
      historicalEvidence: [...normalizedHistoricalEvidence(input.evidence?.historicalEvidence).values()].map(({ matchIndex, reference, ticketReference, outcome }) => ({ matchIndex, reference, ticketReference, outcome })),
      inventoryEvidence: [...normalizedInventoryEvidence(input.evidence?.inventoryEvidence).values()].map(({ matchIndex, reference, ticketReference }) => ({ matchIndex, reference, ticketReference })),
      paymentProof: previewResult.paymentProof,
      ...(previewResult.manualPaymentAudit && { manualPaymentVerification: previewResult.manualPaymentAudit }),
      approvedBy: asString(input.adminId),
      approvedAt: deps.now(),
      nuscSync: 'pending',
    };
    await deps.inventory.finishPartnerSeasonPassReissue({
      reservationId: context.reservation.reservationId,
      requestId: input.requestId,
      adminId: input.adminId,
      bookingIds: tickets.map((ticket) => ticket.bookingId),
      auditDetails: detail,
    });
    await deps.inventory.releaseSeasonPassOrder(`nusc-recovery:${context.reservation.reservationId}`);
    let sync = 'pending';
    try {
      const response = await deps.nuscRise.syncRiseRecoveryTickets({
        orderId: context.order.orderId,
        memberNumber: context.memberNumber,
        kind: context.order.kind,
        reservationId: context.reservation.reservationId,
        tickets: ticketsForRiseSync(tickets),
        adminReference: asString(input.adminId),
        requestId: input.requestId,
      });
      sync = ['synced', 'completed', 'success'].includes(String(response?.status || '').toLowerCase()) ? 'synced' : 'pending';
    } catch {
      sync = 'pending';
    }
    await deps.inventory.updatePartnerSeasonPassReissueSync({
      reservationId: context.reservation.reservationId,
      requestId: input.requestId,
      adminId: input.adminId,
      nuscSync: sync,
    });
    return { ...detail, nuscSync: sync };
  }

  async function retryRiseDashboardSync(context, input, existingAudit) {
    const bookingIds = (context.reservation?.bookingIds || []).map(asString);
    if (bookingIds.length !== 10 || new Set(bookingIds).size !== 10 || bookingIds.some((id) => !mongoose.isValidObjectId(id))) {
      throw new TicketReissueError(409, 'REISSUE_TICKET_SET_INCOMPLETE', 'AHIBI has no complete ten-ticket set to synchronize. Refresh the entitlement and send it for manual review.');
    }
    const historical = normalizedHistoricalEvidence(existingAudit.details?.historicalEvidence);
    const tickets = context.fixtures.map((fixture) => {
      const bookingId = bookingIds[fixture.matchIndex - 1];
      const booking = context.bookings.find((row) => sameId(row._id, bookingId));
      const scanned = context.scans.some((scan) => sameId(scan.ticket, bookingId) && sameId(scan.event, fixture.eventId));
      const used = historical.get(fixture.matchIndex)?.outcome === 'used' || bookingState(booking, scanned) === 'checked_in';
      const usedOriginalGeneral = context.oldReservation && !fixture.eligible;
      const ticketReservationId = booking?.nuscPartnerTicket?.reservationId ||
        (usedOriginalGeneral ? context.oldReservation.reservationId : context.reservation.reservationId);
      return {
        matchIndex: fixture.matchIndex,
        eventId: asString(fixture.eventId),
        bookingId,
        ticketId: bookingId,
        matchDate: fixture.matchDate,
        opponent: fixture.opponent,
        ticketType: booking?.ticketType || (usedOriginalGeneral ? context.oldReservation.ticketType : fixture.ticketType),
        zone: booking?.nuscGeneralZone || (usedOriginalGeneral ? context.oldReservation.zone : context.reservation.zone) || null,
        ...(booking ? { ticketAccessPath: `/api/nusc-partner/v1/reservations/${encodeURIComponent(ticketReservationId)}/tickets/${encodeURIComponent(bookingId)}` } : {}),
        status: used ? 'used' : 'confirmed',
      };
    });
    let sync = 'pending';
    try {
      const response = await deps.nuscRise.syncRiseRecoveryTickets({
        orderId: context.order.orderId,
        memberNumber: context.memberNumber,
        kind: context.order.kind,
        reservationId: context.reservation.reservationId,
        tickets: ticketsForRiseSync(tickets),
        adminReference: asString(input.adminId),
        requestId: input.requestId,
      });
      sync = ['synced', 'completed', 'success'].includes(String(response?.status || '').toLowerCase()) ? 'synced' : 'pending';
    } catch {
      // Ticket issuance is already complete; only the same-order dashboard sync remains retryable.
    }
    await deps.inventory.updatePartnerSeasonPassReissueSync({
      reservationId: context.reservation.reservationId,
      requestId: input.requestId,
      adminId: input.adminId,
      nuscSync: sync,
    });
    return {
      status: sync === 'pending' ? 'dashboard_sync_pending' : 'already_completed',
      requestId: input.requestId,
      reissuedMatchIndices: [],
      dashboardSync: sync,
      audit: { ...existingAudit.details, nuscSync: sync },
    };
  }

  async function reissue(input) {
    if (!REQUEST_ID_PATTERN.test(String(input.requestId || ''))) throw new TicketReissueError(400, 'REQUEST_ID_REQUIRED', 'A valid idempotency request ID is required.');
    if (!input.adminId) throw new TicketReissueError(401, 'ADMIN_REQUIRED', 'Admin authorization is required.');
    if (input.approved !== true) throw new TicketReissueError(400, 'ADMIN_APPROVAL_REQUIRED', 'Confirm that the cited check-in and inventory evidence has been reviewed before issuing new tickets.');
    const context = await loadContext(input);
    const latestRiseReissueAudit = context.channel === 'rise' ? latestNewReissueAudit(context.reservation) : null;
    const pendingRiseSync = latestRiseReissueAudit?.details?.nuscSync === 'pending' ? latestRiseReissueAudit : null;
    if (pendingRiseSync && pendingRiseSync.requestId !== input.requestId) {
      return retryRiseDashboardSync(context, { ...input, requestId: pendingRiseSync.requestId }, pendingRiseSync);
    }
    const existingAudit = context.channel === 'rise'
      ? context.reservation?.adminTicketRecoveryAudit?.find((entry) => entry.requestId === input.requestId && entry.details?.workflow === 'admin_new_ticket_reissue' && entry.details?.status === 'completed')
      : context.order.operationsAudit?.find((entry) => entry.details?.requestId === input.requestId && entry.details?.status === 'completed');
    if (existingAudit) {
      if (context.channel === 'rise' && existingAudit.details.nuscSync === 'pending') {
        return retryRiseDashboardSync(context, input, existingAudit);
      }
      if (context.channel === 'ahibi' && context.kind === 'online' && Array.isArray(context.order.bookingIds) && context.order.bookingIds.length === 10) {
        await deps.PaymentTransaction.updateOne({ orderId: context.order.orderId, paymentId: context.order.paymentId, status: 'completed' }, {
          $set: { bookingIds: context.order.bookingIds },
        });
      }
      return { status: existingAudit.details.nuscSync === 'pending' ? 'dashboard_sync_pending' : 'already_completed', requestId: input.requestId, audit: existingAudit.details };
    }

    let previewResult = await buildPreview(context, input.evidence || {}, input.manualPaymentVerificationId || null);
    if (!previewResult.safe) throw new TicketReissueError(409, 'REISSUE_REQUIRES_REVIEW', 'New tickets are blocked until the listed payment, check-in, fixture, conflict, and inventory evidence is reconciled.', previewResult);
    if (!context.fixtures.length) throw new TicketReissueError(409, 'FIXTURE_SET_INVALID', 'The paid order has no complete ten-fixture allocation.');
    const partialRequestTicketExists = unfinalizedReissueRows(context).length > 0;
    if (!previewResult.fixtures.some((fixture) => ['missing', 'cancelled'].includes(fixture.status)) && !partialRequestTicketExists) {
      throw new TicketReissueError(409, 'NO_TICKETS_TO_REISSUE', 'No missing or cancelled ticket is eligible for a new identity. Existing valid and checked-in tickets remain unchanged.', previewResult);
    }

    if (context.channel === 'rise') await claimRise(context, input.requestId, input.adminId);
    else await claimAhibi(context, input.requestId, input.adminId);

    const held = [];
    try {
      const current = await loadContext(input);
      previewResult = await buildPreview(current, input.evidence || {}, input.manualPaymentVerificationId || null);
      if (!previewResult.safe) throw new TicketReissueError(409, 'REISSUE_REQUIRES_REVIEW', 'Safety checks changed while the request was starting. Refresh the preview and review the listed blockers.', previewResult);
      held.push(...await reserveNewAllocations(current, previewResult, input.requestId, input.adminId));
      const result = await issueNewBookings(current, previewResult, input.evidence || {}, input.requestId, input.adminId);
      for (const hold of held) await deps.inventory.releaseMatchOrder(hold.orderId);
      const tickets = finalTicketRows(current, previewResult, result.issued, input.evidence || {});
      let audit;
      if (current.channel === 'rise') audit = await saveRiseResult(current, input, previewResult, result, tickets);
      else audit = await saveAhibiResult(current, input, previewResult, result, tickets);
      const syncStatus = audit.nuscSync || 'not_required';
      return {
        status: syncStatus === 'pending' ? 'dashboard_sync_pending' : 'reissued',
        requestId: input.requestId,
        reissuedMatchIndices: result.issued.map((booking) => Number(booking.nuscSeasonMatchIndex || booking.manualSeasonPassMatchIndex || booking.nuscPartnerTicket?.ticketIndex)),
        preservedMatchIndices: tickets.filter((ticket) => ticket.status === 'used').map((ticket) => ticket.matchIndex),
        tickets,
        dashboardSync: syncStatus,
        audit,
      };
    } catch (error) {
      await Promise.all(held.map((hold) => deps.inventory.releaseMatchOrder(hold.orderId).catch(() => null)));
      const safeCode = /^[A-Z0-9_]{1,80}$/.test(String(error.code || '')) ? error.code : 'REISSUE_FAILED';
      if (context.channel === 'rise') {
        await deps.inventory.finishPartnerSeasonPassReissue({
          reservationId: context.reservation.reservationId,
          requestId: input.requestId,
          adminId: input.adminId,
          bookingIds: context.reservation.bookingIds || [],
          manualIntervention: true,
          auditDetails: {
            workflow: 'admin_new_ticket_reissue', status: 'manual_intervention', code: safeCode,
            ...(previewResult?.manualPaymentAudit && { manualPaymentVerification: previewResult.manualPaymentAudit }),
          },
        }).catch(() => null);
      } else {
        const Model = context.kind === 'manual' ? deps.ManualSeasonPassOrder : deps.NuscHomeMatchOrder;
        await Model.updateOne({ _id: context.order._id, 'adminTicketReissue.requestId': input.requestId }, {
          $set: { 'adminTicketReissue.status': 'manual_intervention', 'adminTicketReissue.completedAt': deps.now() },
          $push: { operationsAudit: { action: 'admin_new_ticket_reissue_blocked', admin: input.adminId, at: deps.now(), details: {
            requestId: input.requestId, code: safeCode,
            ...(previewResult?.manualPaymentAudit && { manualPaymentVerification: previewResult.manualPaymentAudit }),
          } } },
        }).catch(() => null);
      }
      if (!(error instanceof TicketReissueError)) {
        throw new TicketReissueError(error.status || 502, safeCode,
          'Ticket reissue stopped before completion. Refresh this paid order, inspect its current ticket set and audit, then retry only after resolving the listed state. The payment and season pass were retained.',
          { manualReview: true, code: safeCode });
      }
      throw error;
    }
  }

  return { preview, reissue, recordManualPaymentVerification };
}

const service = createAdminNewTicketReissueService();
module.exports = {
  TicketReissueError,
  createAdminNewTicketReissueService,
  previewNewTicketReissue: service.preview,
  reissueNewTickets: service.reissue,
  recordManualPaymentVerification: service.recordManualPaymentVerification,
};
