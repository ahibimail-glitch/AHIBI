const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Inventory = require('../models/NuscHomeMatchInventory');
const Scan = require('../models/Scan');
const homeMatchInventory = require('./nuscHomeMatchInventoryService');

const INVENTORY_KEY = 'nusc-il-2026-27';

class ReplacementError extends Error {
  constructor(code, status = 409) {
    super(code);
    this.name = 'ReplacementError';
    this.code = code;
    this.status = status;
  }
}

function getReservation(inventoryDoc, reservationId) {
  return (inventoryDoc.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
}

function ensureSameFixtureSet(oldReservation, premiumReservation) {
  if (
    oldReservation.eventIds?.length !== 10 ||
    premiumReservation.eventIds?.length !== 10 ||
    oldReservation.matchDates?.length !== 10 ||
    premiumReservation.matchDates?.length !== 10 ||
    oldReservation.eventIds.some((id, index) => String(id) !== String(premiumReservation.eventIds[index])) ||
    oldReservation.matchDates.some((date, index) => date !== premiumReservation.matchDates[index])
  ) {
    throw new ReplacementError('RESERVATION_FIXTURES_MISMATCH');
  }
}

async function reacquireExpiredPremiumHold({ premiumReservationId, oldReservationId, paymentId }) {
  const inventoryDoc = await Inventory.findOne({ key: INVENTORY_KEY }).lean();
  if (!inventoryDoc) throw new ReplacementError('RESERVATION_NOT_FOUND', 404);
  const oldReservation = getReservation(inventoryDoc, oldReservationId);
  const premiumReservation = getReservation(inventoryDoc, premiumReservationId);
  if (!oldReservation || !premiumReservation) throw new ReplacementError('RESERVATION_NOT_FOUND', 404);
  if (premiumReservation.replacesReservationId === oldReservationId &&
      premiumReservation.paymentId === paymentId && ['issuing', 'issued'].includes(premiumReservation.status)) return;
  if (oldReservation.status !== 'issued' || oldReservation.passId !== 'general-season') {
    throw new ReplacementError('OLD_RESERVATION_NOT_ISSUED_GENERAL');
  }
  if (!['held', 'expired'].includes(premiumReservation.status) || premiumReservation.passId !== 'premium-season') {
    throw new ReplacementError('PREMIUM_RESERVATION_NOT_HELD');
  }
  if (String(oldReservation.memberReferenceHash) !== String(premiumReservation.memberReferenceHash)) {
    throw new ReplacementError('MEMBER_MISMATCH');
  }
  ensureSameFixtureSet(oldReservation, premiumReservation);
  if (oldReservation.replacedByReservationId) throw new ReplacementError('OLD_RESERVATION_ALREADY_REPLACED');
  if (premiumReservation.paymentId && premiumReservation.paymentId !== paymentId) {
    throw new ReplacementError('PAYMENT_CONFLICT');
  }

  const heldOrder = (inventoryDoc.seasonPassOrders || []).find((item) => item.orderId === premiumReservationId);
  const holdIsActive = heldOrder?.status === 'held' && new Date(heldOrder.expiresAt) > new Date();
  if (holdIsActive) return;

  if (!Array.isArray(oldReservation.bookingIds) || oldReservation.bookingIds.length !== 10) {
    throw new ReplacementError('OLD_TICKET_SET_INCOMPLETE', 500);
  }
  const oldBookings = await Booking.find({
    _id: { $in: oldReservation.bookingIds },
    'nuscPartnerTicket.partnerId': 'nusc',
    'nuscPartnerTicket.reservationId': oldReservationId,
  }).lean();
  if (oldBookings.length !== 10) throw new ReplacementError('OLD_TICKET_SET_INCOMPLETE', 500);
  const preflightByMatch = new Map(oldBookings.map((booking) => [Number(booking.nuscSeasonMatchIndex), booking]));
  if (preflightByMatch.size !== 10 || Array.from({ length: 10 }, (_, index) => index + 1).some((index) => !preflightByMatch.has(index)) ||
      oldBookings.some((booking) => (
        booking.ticketType !== oldReservation.ticketType ||
        String(booking.nuscPartnerTicket.memberReferenceHash) !== String(oldReservation.memberReferenceHash) ||
        booking.nuscPartnerTicket.partnerOrderId !== oldReservation.partnerOrderId ||
        String(booking.event) !== String(oldReservation.eventIds[Number(booking.nuscSeasonMatchIndex) - 1])
      ))) {
    throw new ReplacementError('OLD_TICKET_SET_INCOMPLETE', 500);
  }
  const scans = await Scan.find({
    ticket: { $in: oldReservation.bookingIds },
    event: { $in: oldReservation.eventIds },
    partnerId: 'nusc',
  }).select('ticket event').lean();
  const scannedIds = new Set(scans.map((scan) => `${String(scan.ticket)}:${String(scan.event)}`));
  if (oldBookings.some((booking) => booking.status === 'checked-in' &&
      !scannedIds.has(`${String(booking._id)}:${String(booking.event)}`))) {
    throw new ReplacementError('CHECKIN_EVIDENCE_CONFLICT');
  }
  const remainingBookings = oldBookings.filter((booking) => (
    booking.status === 'confirmed' && !scannedIds.has(`${String(booking._id)}:${String(booking.event)}`)
  ));
  const remainingIndices = remainingBookings.map((booking) => Number(booking.nuscSeasonMatchIndex)).sort((a, b) => a - b);
  if (!remainingIndices.length) throw new ReplacementError('NO_REMAINING_MATCHES');

  const events = await Event.find({ _id: { $in: remainingIndices.map((index) => premiumReservation.eventIds[index - 1]) } }).select('+ticketTypes');
  const eventById = new Map(events.map((event) => [String(event._id), event]));
  const matches = remainingIndices.map((index) => {
    const eventId = premiumReservation.eventIds[index - 1];
    const event = eventById.get(String(eventId));
    if (!event) throw new ReplacementError('PREMIUM_INVENTORY_UNAVAILABLE');
    return { matchDate: premiumReservation.matchDates[index - 1], ticketTypes: event.ticketTypes };
  });
  try {
    await homeMatchInventory.reacquirePartnerReplacementInventory({
      orderId: premiumReservationId,
      paymentId,
      matchDates: matches.map((match) => match.matchDate),
      matches,
    });
  } catch (error) {
    if (error.code) throw new ReplacementError(error.code, error.code === 'RESERVATION_NOT_FOUND' ? 404 : 409);
    throw error;
  }
}

async function beginPartnerSeasonPassReplacement({ premiumReservationId, oldReservationId, paymentId }) {
  await reacquireExpiredPremiumHold({ premiumReservationId, oldReservationId, paymentId });
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const inventoryDoc = await Inventory.findOne({ key: INVENTORY_KEY }).session(session);
      if (!inventoryDoc) throw new ReplacementError('RESERVATION_NOT_FOUND', 404);
      const oldReservation = getReservation(inventoryDoc, oldReservationId);
      const premiumReservation = getReservation(inventoryDoc, premiumReservationId);
      if (!oldReservation || !premiumReservation) throw new ReplacementError('RESERVATION_NOT_FOUND', 404);

      const retrying = premiumReservation.replacesReservationId === oldReservationId &&
        premiumReservation.paymentId === paymentId &&
        ['issuing', 'issued'].includes(premiumReservation.status);
      if (retrying) {
        ensureSameFixtureSet(oldReservation, premiumReservation);
        result = {
          oldReservation: oldReservation.toObject(),
          premiumReservation: premiumReservation.toObject(),
          remainingMatchIndices: [...(premiumReservation.replacementMatchIndices || [])],
          retainedUsedTicketCount: Number(premiumReservation.replacementUsedTicketCount || 0),
          cancelledUnusedTicketCount: Number(premiumReservation.replacementCancelledTicketCount || 0),
          alreadyIssued: premiumReservation.status === 'issued',
          isRetry: true,
        };
        return;
      }

      if (oldReservation.status !== 'issued' || oldReservation.passId !== 'general-season') {
        throw new ReplacementError('OLD_RESERVATION_NOT_ISSUED_GENERAL');
      }
      if (premiumReservation.status !== 'held' || premiumReservation.passId !== 'premium-season') {
        throw new ReplacementError('PREMIUM_RESERVATION_NOT_HELD');
      }
      if (String(oldReservation.memberReferenceHash) !== String(premiumReservation.memberReferenceHash)) {
        throw new ReplacementError('MEMBER_MISMATCH');
      }
      ensureSameFixtureSet(oldReservation, premiumReservation);
      if (oldReservation.replacedByReservationId) throw new ReplacementError('OLD_RESERVATION_ALREADY_REPLACED');
      if (premiumReservation.paymentId && premiumReservation.paymentId !== paymentId) throw new ReplacementError('PAYMENT_CONFLICT');
      if ((inventoryDoc.partnerSeasonPassReservations || []).some((item) => (
        item.reservationId !== premiumReservationId && item.paymentId === paymentId
      ))) throw new ReplacementError('PAYMENT_ALREADY_USED');
      if (!Array.isArray(oldReservation.bookingIds) || oldReservation.bookingIds.length !== 10) {
        throw new ReplacementError('OLD_TICKET_SET_INCOMPLETE', 500);
      }

      const oldBookings = await Booking.find({
        _id: { $in: oldReservation.bookingIds },
        'nuscPartnerTicket.partnerId': 'nusc',
        'nuscPartnerTicket.reservationId': oldReservationId,
      }).session(session);
      if (oldBookings.length !== 10) throw new ReplacementError('OLD_TICKET_SET_INCOMPLETE', 500);
      const byMatchIndex = new Map(oldBookings.map((booking) => [Number(booking.nuscSeasonMatchIndex), booking]));
      if (byMatchIndex.size !== 10 || Array.from({ length: 10 }, (_, i) => i + 1).some((index) => !byMatchIndex.has(index))) {
        throw new ReplacementError('OLD_TICKET_SET_INCOMPLETE', 500);
      }
      if (oldBookings.some((booking) => (
        booking.ticketType !== oldReservation.ticketType ||
        String(booking.nuscPartnerTicket.memberReferenceHash) !== String(oldReservation.memberReferenceHash) ||
        booking.nuscPartnerTicket.partnerOrderId !== oldReservation.partnerOrderId ||
        String(booking.event) !== String(oldReservation.eventIds[Number(booking.nuscSeasonMatchIndex) - 1])
      ))) throw new ReplacementError('OLD_TICKET_SET_INCOMPLETE', 500);

      const scans = await Scan.find({
        ticket: { $in: oldReservation.bookingIds },
        event: { $in: oldReservation.eventIds },
        partnerId: 'nusc',
      }).select('ticket event').session(session).lean();
      const scannedBookingIds = new Set(scans.map((scan) => `${String(scan.ticket)}:${String(scan.event)}`));
      if (oldBookings.some((booking) => booking.status === 'checked-in' &&
          !scannedBookingIds.has(`${String(booking._id)}:${String(booking.event)}`))) {
        throw new ReplacementError('CHECKIN_EVIDENCE_CONFLICT');
      }
      const usedBookings = oldBookings.filter((booking) => (
        scannedBookingIds.has(`${String(booking._id)}:${String(booking.event)}`)
      ));
      const remainingBookings = oldBookings.filter((booking) => (
        booking.status === 'confirmed' && !scannedBookingIds.has(`${String(booking._id)}:${String(booking.event)}`)
      ));
      const remainingMatchIndices = remainingBookings.map((booking) => Number(booking.nuscSeasonMatchIndex)).sort((a, b) => a - b);
      if (remainingMatchIndices.length === 0) throw new ReplacementError('NO_REMAINING_MATCHES');

      const hold = (inventoryDoc.seasonPassOrders || []).find((item) => item.orderId === premiumReservationId);
      if (!hold || hold.status !== 'held' || hold.ticketType !== 'Premium Pass' || new Date(hold.expiresAt) <= new Date() ||
          remainingBookings.some((booking) => !hold.matchDates.includes(premiumReservation.matchDates[Number(booking.nuscSeasonMatchIndex) - 1]))) {
        throw new ReplacementError('HOLD_EXPIRED');
      }
      const availableMatchDates = remainingMatchIndices.map((index) => premiumReservation.matchDates[index - 1]);
      hold.matchDates = availableMatchDates;
      hold.status = 'confirmed';

      const unusedBookingIds = remainingBookings.map((booking) => booking._id);
      const cancelled = await Booking.updateMany({
        _id: { $in: unusedBookingIds },
        status: 'confirmed',
      }, {
        $set: {
          status: 'cancelled',
          'nuscPartnerTicket.replacedByReservationId': premiumReservationId,
        },
      }, { session });
      if (cancelled.modifiedCount !== unusedBookingIds.length) {
        throw new ReplacementError('OLD_TICKETS_CHANGED_RETRY');
      }

      oldReservation.status = 'replaced';
      oldReservation.replacedByReservationId = premiumReservationId;
      premiumReservation.status = 'issuing';
      premiumReservation.paymentId = paymentId;
      premiumReservation.replacesReservationId = oldReservationId;
      premiumReservation.replacementMatchIndices = remainingMatchIndices;
      premiumReservation.replacementUsedTicketCount = usedBookings.length;
      premiumReservation.replacementCancelledTicketCount = cancelled.modifiedCount;
      await inventoryDoc.save({ session });
      result = {
        oldReservation: oldReservation.toObject(),
        premiumReservation: premiumReservation.toObject(),
        remainingMatchIndices,
        retainedUsedTicketCount: usedBookings.length,
        cancelledUnusedTicketCount: cancelled.modifiedCount,
        alreadyIssued: false,
        isRetry: false,
      };
    });
  } finally {
    await session.endSession();
  }
  return result;
}

async function completePartnerSeasonPassReplacement(premiumReservationId, bookingIds) {
  const session = await mongoose.startSession();
  let reservation;
  try {
    await session.withTransaction(async () => {
      const inventoryDoc = await Inventory.findOne({ key: INVENTORY_KEY }).session(session);
      const current = inventoryDoc && getReservation(inventoryDoc, premiumReservationId);
      if (!current) throw new ReplacementError('RESERVATION_NOT_FOUND', 404);
      if (current.status === 'issued') {
        reservation = current.toObject();
        return;
      }
      if (current.status !== 'issuing' || !current.replacesReservationId) {
        throw new ReplacementError('REPLACEMENT_NOT_IN_PROGRESS');
      }
      if (bookingIds.length !== (current.replacementMatchIndices || []).length) {
        throw new ReplacementError('REPLACEMENT_TICKET_SET_INCOMPLETE', 500);
      }
      current.bookingIds = bookingIds;
      current.status = 'issued';
      current.issuedAt = new Date();
      inventoryDoc.seasonPassOrders = (inventoryDoc.seasonPassOrders || []).filter((item) => item.orderId !== premiumReservationId);
      await inventoryDoc.save({ session });
      reservation = current.toObject();
    });
  } finally {
    await session.endSession();
  }
  return reservation;
}

async function recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId }) {
  const inventoryDoc = await Inventory.findOne({ key: INVENTORY_KEY }).lean();
  if (!inventoryDoc) throw new ReplacementError('RESERVATION_NOT_FOUND', 404);
  const oldReservation = getReservation(inventoryDoc, oldReservationId);
  const premiumReservation = getReservation(inventoryDoc, premiumReservationId);
  if (!oldReservation || !premiumReservation) throw new ReplacementError('RESERVATION_NOT_FOUND', 404);
  if (oldReservation.passId !== 'general-season' || oldReservation.status !== 'replaced' ||
      oldReservation.replacedByReservationId !== premiumReservationId ||
      premiumReservation.passId !== 'premium-season' || premiumReservation.status !== 'issued' ||
      premiumReservation.replacesReservationId !== oldReservationId || premiumReservation.paymentId !== paymentId ||
      String(oldReservation.memberReferenceHash) !== String(premiumReservation.memberReferenceHash)) {
    throw new ReplacementError('RECOVERY_RESERVATION_MISMATCH');
  }
  ensureSameFixtureSet(oldReservation, premiumReservation);
  if (!Array.isArray(oldReservation.bookingIds) || oldReservation.bookingIds.length !== 10) {
    throw new ReplacementError('OLD_TICKET_SET_INCOMPLETE', 500);
  }

  const oldBookings = await Booking.find({
    _id: { $in: oldReservation.bookingIds },
    'nuscPartnerTicket.partnerId': 'nusc',
    'nuscPartnerTicket.reservationId': oldReservationId,
  }).lean();
  const oldByIndex = new Map(oldBookings.map((booking) => [Number(booking.nuscSeasonMatchIndex), booking]));
  if (oldByIndex.size !== 10 || Array.from({ length: 10 }, (_, index) => index + 1).some((index) => !oldByIndex.has(index)) ||
      oldBookings.some((booking) => (
        booking.ticketType !== oldReservation.ticketType ||
      booking.paymentStatus !== 'completed' || booking.paymentProvider !== 'nusc-partner' ||
      (oldReservation.paymentId && String(booking.externalPaymentId) !== String(oldReservation.paymentId)) ||
        booking.nuscPartnerTicket.partnerOrderId !== oldReservation.partnerOrderId ||
        String(booking.nuscPartnerTicket.memberReferenceHash) !== String(oldReservation.memberReferenceHash) ||
        String(booking.event) !== String(oldReservation.eventIds[Number(booking.nuscSeasonMatchIndex) - 1])
      ))) {
    throw new ReplacementError('OLD_TICKET_SET_INCOMPLETE', 500);
  }

  const recoveryStatus = premiumReservation.recoveryStatus || 'none';
  if (!['none', 'issuing', 'issued'].includes(recoveryStatus)) throw new ReplacementError('RECOVERY_CONFLICT');
  const recoveryIndices = (premiumReservation.replacementMatchIndices || []).map(Number).sort((a, b) => a - b);
  if (!recoveryIndices.length || new Set(recoveryIndices).size !== recoveryIndices.length ||
      recoveryIndices.some((index) => !Number.isInteger(index) || index < 1 || index > 10) ||
      premiumReservation.replacementCancelledTicketCount == null || premiumReservation.replacementUsedTicketCount == null ||
      !Number.isInteger(Number(premiumReservation.replacementCancelledTicketCount)) ||
      !Number.isInteger(Number(premiumReservation.replacementUsedTicketCount)) ||
      Number(premiumReservation.replacementCancelledTicketCount) !== recoveryIndices.length ||
      Number(premiumReservation.replacementUsedTicketCount) !== 10 - recoveryIndices.length) {
    throw new ReplacementError('REPLACEMENT_LINEAGE_COUNTS_INVALID');
  }

  const premiumQueries = [
    Booking.find({ 'nuscPartnerTicket.partnerId': 'nusc', 'nuscPartnerTicket.reservationId': premiumReservationId }).lean(),
    Booking.find({ 'nuscPartnerTicket.partnerId': 'nusc', 'nuscPartnerTicket.partnerOrderId': premiumReservation.partnerOrderId }).lean(),
    ...(premiumReservation.bookingIds?.length ? [Booking.find({ _id: { $in: premiumReservation.bookingIds } }).lean()] : []),
  ];
  const premiumQueryResults = await Promise.all(premiumQueries);
  const premiumBookings = [...new Map(premiumQueryResults.flat().map((booking) => [String(booking._id), booking])).values()];
  const premiumByIndex = new Map();
  for (const booking of premiumBookings) {
    const partner = booking.nuscPartnerTicket || {};
    if (partner.reservationId === oldReservationId) continue;
    const index = Number(booking.nuscSeasonMatchIndex || partner.ticketIndex);
    if (partner.partnerId !== 'nusc' || partner.reservationId !== premiumReservationId ||
        partner.partnerOrderId !== premiumReservation.partnerOrderId ||
        String(partner.memberReferenceHash) !== String(premiumReservation.memberReferenceHash) ||
        !Number.isInteger(index) || !recoveryIndices.includes(index) ||
        booking.paymentProvider !== 'nusc-partner' || String(booking.externalPaymentId) !== String(paymentId) ||
        booking.ticketType !== premiumReservation.ticketType ||
        String(booking.event) !== String(premiumReservation.eventIds[index - 1])) {
      throw new ReplacementError('PREMIUM_TICKET_SET_INVALID', 500);
    }
    const rows = premiumByIndex.get(index) || [];
    rows.push(booking);
    premiumByIndex.set(index, rows);
  }
  if ([...premiumByIndex.values()].some((rows) => rows.length !== 1)) {
    throw new ReplacementError('REPLACEMENT_DUPLICATE_ACTIVE_TICKETS');
  }

  const priorRecoveryIndices = (premiumReservation.recoveryMatchIndices || []).map(Number).sort((a, b) => a - b);
  const currentPremiumIndices = [...premiumByIndex.keys()].sort((a, b) => a - b);
  if (recoveryStatus === 'issuing' &&
      (priorRecoveryIndices.length !== recoveryIndices.length || priorRecoveryIndices.some((value, index) => value !== recoveryIndices[index]))) {
    throw new ReplacementError('RECOVERY_CONFLICT');
  }
  if (recoveryStatus === 'issued' &&
      (currentPremiumIndices.join(',') !== recoveryIndices.join(',') || premiumReservation.bookingIds?.length !== 10)) {
    throw new ReplacementError('PREMIUM_TICKET_SET_INVALID', 500);
  }

  const scans = await Scan.find({
    ticket: { $in: [...oldReservation.bookingIds, ...(premiumReservation.recoveryBookingIds || [])] },
    event: { $in: oldReservation.eventIds },
    partnerId: 'nusc',
  }).select('ticket event').lean();
  const scanKeys = new Set(scans.map((scan) => `${String(scan.ticket)}:${String(scan.event)}`));
  const targetIndices = new Set(recoveryIndices);
  const activeTicket = (booking) => booking &&
    !['cancelled', 'voided', 'refunded'].includes(booking.status) &&
    !['cancelled', 'voided', 'refunded'].includes(booking.paymentStatus) &&
    booking.paymentStatus === 'completed' && ['confirmed', 'checked-in'].includes(booking.status);
  for (const [index, rows] of premiumByIndex.entries()) {
    if (activeTicket(rows[0]) && activeTicket(oldByIndex.get(index))) {
      throw new ReplacementError('REPLACEMENT_DUPLICATE_ACTIVE_TICKETS');
    }
  }
  const usedIndices = [];
  for (let index = 1; index <= 10; index += 1) {
    const oldBooking = oldByIndex.get(index);
    const scanned = scanKeys.has(`${String(oldBooking._id)}:${String(oldBooking.event)}`);
    if (targetIndices.has(index)) {
      if (scanned || oldBooking.entryVerified === true) {
        throw new ReplacementError('TARGET_MATCH_ALREADY_CHECKED_IN');
      }
      if (oldBooking.status !== 'cancelled' || oldBooking.nuscPartnerTicket.replacedByReservationId !== premiumReservationId) {
        throw new ReplacementError('TARGET_TICKET_STATE_REVIEW_REQUIRED');
      }
    } else {
      if (!scanned || !['confirmed', 'checked-in'].includes(oldBooking.status) ||
          (oldBooking.entryVerified === true && !scanned)) {
        throw new ReplacementError('USED_TICKET_EVIDENCE_MISMATCH');
      }
      usedIndices.push(index);
    }
  }
  if (usedIndices.length !== Number(premiumReservation.replacementUsedTicketCount || 0)) {
    throw new ReplacementError('REPLACEMENT_LINEAGE_COUNTS_INVALID');
  }

  for (const [index, rows] of premiumByIndex.entries()) {
    if (!activeTicket(rows[0])) throw new ReplacementError('TARGET_TICKET_STATE_REVIEW_REQUIRED');
    if (!targetIndices.has(index) && activeTicket(oldByIndex.get(index))) {
      throw new ReplacementError('REPLACEMENT_DUPLICATE_ACTIVE_TICKETS');
    }
  }

  const targetIndicesWithTickets = recoveryIndices.filter((index) => premiumByIndex.has(index));
  const missingPremiumIndices = recoveryIndices.filter((index) => !premiumByIndex.has(index));
  if (recoveryStatus === 'issued') {
    const finalByIndex = new Map();
    for (const index of recoveryIndices) finalByIndex.set(index, premiumByIndex.get(index)?.[0]);
    for (const index of usedIndices) finalByIndex.set(index, oldByIndex.get(index));
    const finalRows = Array.from({ length: 10 }, (_, offset) => finalByIndex.get(offset + 1));
    if (finalRows.some((booking) => !booking || !activeTicket(booking)) ||
        new Set(finalRows.map((booking) => String(booking._id))).size !== 10 ||
        premiumReservation.bookingIds.map(String).some((id, index) => id !== String(finalRows[index]._id))) {
      throw new ReplacementError('RECOVERY_TICKET_SET_INCOMPLETE', 500);
    }
    return {
      reservation: premiumReservation,
      issuedBookingIds: recoveryIndices.map((index) => premiumByIndex.get(index)[0]._id),
      recoveredMatchIndices: [],
      relinkedMatchIndices: Array.from({ length: 10 }, (_, index) => index + 1),
      retainedUsedTicketCount: usedIndices.length,
      alreadyIssued: true,
    };
  }

  if (recoveryStatus === 'none') {
    const linkedIds = (premiumReservation.bookingIds || []).map(String);
    if (linkedIds.length !== recoveryIndices.length || new Set(linkedIds).size !== linkedIds.length) {
      throw new ReplacementError('PREMIUM_TICKET_SET_INVALID', 500);
    }
    const originalBookingIds = new Set(oldReservation.bookingIds.map(String));
    if (linkedIds.some((id) => originalBookingIds.has(id))) throw new ReplacementError('PREMIUM_TICKET_SET_INVALID', 500);
    recoveryIndices.forEach((index, position) => {
      const booking = premiumByIndex.get(index)?.[0];
      if (booking && linkedIds[position] !== String(booking._id)) {
        throw new ReplacementError('PREMIUM_TICKET_SET_INVALID', 500);
      }
    });
  }

  const missingFixtures = missingPremiumIndices.map((matchIndex) => ({
    eventId: premiumReservation.eventIds[matchIndex - 1],
    matchDate: premiumReservation.matchDates[matchIndex - 1],
    matchIndex,
    ticketType: premiumReservation.ticketType,
  }));
  const eventDocs = missingFixtures.length
    ? await Event.find({ _id: { $in: missingFixtures.map(({ eventId }) => eventId) } }).select('+ticketTypes')
    : [];
  const eventById = new Map(eventDocs.map((event) => [String(event._id), event]));
  const matches = missingFixtures.map((fixture) => {
    const event = eventById.get(String(fixture.eventId));
    if (!event) throw new ReplacementError('PREMIUM_INVENTORY_UNAVAILABLE');
    return { eventId: fixture.eventId, matchDate: fixture.matchDate, ticketTypes: event.ticketTypes };
  });
  try {
    await homeMatchInventory.beginPartnerMissingTicketRecovery({
      orderId: premiumReservationId,
      oldReservationId,
      paymentId,
      matchIndices: recoveryIndices,
      missingMatchIndices: missingPremiumIndices,
      matchDates: matches.map((match) => match.matchDate),
      matches,
    });
  } catch (error) {
    if (error.code) {
      const replacementError = new ReplacementError(error.code, error.code === 'RESERVATION_NOT_FOUND' ? 404 : 409);
      if (error.matchDate) replacementError.matchDate = error.matchDate;
      throw replacementError;
    }
    throw error;
  }

  let newlyIssuedBookingIds = [];
  if (missingFixtures.length) {
    const issued = await require('./nuscSeasonPassBookingService').createSeasonPassTicketRecords({
      orderId: premiumReservation.partnerOrderId,
      fixtures: missingFixtures,
      passId: premiumReservation.passId,
      quantity: 1,
      paymentId,
      paymentProvider: 'nusc-partner',
      memberReferenceHash: premiumReservation.memberReferenceHash,
      reservationId: premiumReservationId,
      partnerId: 'nusc',
    });
    if (issued.bookingIds.length !== missingFixtures.length) throw new ReplacementError('RECOVERY_TICKET_SET_INCOMPLETE', 500);
    for (const booking of issued.bookings) {
      const index = Number(booking.nuscSeasonMatchIndex || booking.nuscPartnerTicket?.ticketIndex);
      const rows = premiumByIndex.get(index) || [];
      if (rows.length && String(rows[0]._id) !== String(booking._id)) throw new ReplacementError('REPLACEMENT_DUPLICATE_ACTIVE_TICKETS');
      premiumByIndex.set(index, [booking]);
    }
    newlyIssuedBookingIds = issued.bookingIds;
  }

  const allByIndex = new Map();
  for (const index of recoveryIndices) {
    const booking = premiumByIndex.get(index)?.[0];
    if (!booking || !activeTicket(booking)) throw new ReplacementError('RECOVERY_TICKET_SET_INCOMPLETE', 500);
    allByIndex.set(index, booking);
  }
  for (const index of usedIndices) allByIndex.set(index, oldByIndex.get(index));
  const allBookingIds = [...allByIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, booking]) => booking._id);
  const recoveredMatchIndices = [...newlyIssuedBookingIds].map((id) => {
    const booking = [...premiumByIndex.values()].flat().find((item) => String(item._id) === String(id));
    return Number(booking?.nuscSeasonMatchIndex || booking?.nuscPartnerTicket?.ticketIndex);
  }).filter(Number.isInteger).sort((a, b) => a - b);
  const relinkedMatchIndices = Array.from({ length: 10 }, (_, index) => index + 1)
    .filter((index) => usedIndices.includes(index) || targetIndicesWithTickets.includes(index));
  if (allBookingIds.length !== 10 || new Set(allBookingIds.map(String)).size !== 10) {
    throw new ReplacementError('RECOVERY_TICKET_SET_INCOMPLETE', 500);
  }
  const currentTargetBookingIds = recoveryIndices.map((index) => premiumByIndex.get(index)[0]._id);
  const cancelledUnusedTicketCount = Number(premiumReservation.replacementCancelledTicketCount);
  const completed = await homeMatchInventory.completePartnerMissingTicketRecovery(
    premiumReservationId,
    oldReservationId,
    currentTargetBookingIds,
    allBookingIds,
    recoveryIndices,
    usedIndices.length,
    cancelledUnusedTicketCount,
  );
  return {
    reservation: completed,
    issuedBookingIds: currentTargetBookingIds,
    recoveredMatchIndices,
    relinkedMatchIndices,
    retainedUsedTicketCount: usedIndices.length,
    alreadyIssued: false,
  };
}

module.exports = {
  ReplacementError,
  beginPartnerSeasonPassReplacement,
  completePartnerSeasonPassReplacement,
  recoverMissingGeneralReplacementTickets,
};
