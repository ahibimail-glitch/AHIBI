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
        booking.nuscPartnerTicket.partnerOrderId !== oldReservation.partnerOrderId ||
        String(booking.nuscPartnerTicket.memberReferenceHash) !== String(oldReservation.memberReferenceHash) ||
        String(booking.event) !== String(oldReservation.eventIds[Number(booking.nuscSeasonMatchIndex) - 1])
      ))) {
    throw new ReplacementError('OLD_TICKET_SET_INCOMPLETE', 500);
  }

  const premiumBookings = await Booking.find({
    'nuscPartnerTicket.partnerId': 'nusc',
    'nuscPartnerTicket.reservationId': premiumReservationId,
    'nuscPartnerTicket.partnerOrderId': premiumReservation.partnerOrderId,
  }).lean();
  const premiumByIndex = new Map(premiumBookings.map((booking) => [Number(booking.nuscSeasonMatchIndex), booking]));
  if (premiumByIndex.size !== premiumBookings.length || premiumBookings.some((booking) => (
    booking.ticketType !== premiumReservation.ticketType ||
    String(booking.nuscPartnerTicket.memberReferenceHash) !== String(premiumReservation.memberReferenceHash) ||
    String(booking.event) !== String(premiumReservation.eventIds[Number(booking.nuscSeasonMatchIndex) - 1])
  ))) throw new ReplacementError('PREMIUM_TICKET_SET_INVALID', 500);

  const recoveryStatus = premiumReservation.recoveryStatus || 'none';
  const currentPremiumIndices = [...premiumByIndex.keys()].sort((a, b) => a - b);
  const issuedReplacementIndices = (premiumReservation.replacementMatchIndices || []).map(Number).sort((a, b) => a - b);
  const expectedExistingIndices = recoveryStatus === 'issued'
    ? Array.from({ length: 10 }, (_, index) => index + 1)
    : [...issuedReplacementIndices, ...(recoveryStatus === 'issuing' ? currentPremiumIndices.filter((index) => index === 1 || index === 2) : [])].sort((a, b) => a - b);
  if (recoveryStatus === 'none' &&
      (issuedReplacementIndices.join(',') !== '3,4,5,6,7,8,9,10' || currentPremiumIndices.join(',') !== issuedReplacementIndices.join(','))) {
    throw new ReplacementError('RECOVERY_NOT_APPLICABLE');
  }
  if (recoveryStatus !== 'none' && currentPremiumIndices.join(',') !== expectedExistingIndices.join(',')) {
    throw new ReplacementError('PREMIUM_TICKET_SET_INVALID', 500);
  }

  const recoveryIndices = [1, 2];
  const missingPremiumIndices = recoveryIndices.filter((index) => !premiumByIndex.has(index));
  if (recoveryStatus === 'issued') {
    if (missingPremiumIndices.length || recoveryIndices.some((index) => !premiumByIndex.has(index))) {
      throw new ReplacementError('RECOVERY_TICKET_SET_INCOMPLETE', 500);
    }
    return {
      reservation: premiumReservation,
      issuedBookingIds: recoveryIndices.map((index) => premiumByIndex.get(index)._id),
      retainedUsedTicketCount: Number(premiumReservation.replacementUsedTicketCount || 0),
      alreadyIssued: true,
    };
  }
  if (recoveryStatus !== 'issuing' &&
      (missingPremiumIndices.length !== 2 || recoveryIndices.some((index) => premiumByIndex.has(index)))) {
    throw new ReplacementError('RECOVERY_NOT_APPLICABLE');
  }
  if (!premiumReservation.bookingIds.every((id) => premiumByIndex.has(Number(premiumBookings.find((booking) => String(booking._id) === String(id))?.nuscSeasonMatchIndex))) ||
      premiumReservation.bookingIds.length !== premiumReservation.replacementMatchIndices.length) {
    throw new ReplacementError('PREMIUM_TICKET_SET_INVALID', 500);
  }

  const scans = await Scan.find({
    ticket: { $in: oldReservation.bookingIds },
    event: { $in: oldReservation.eventIds },
    partnerId: 'nusc',
  }).select('ticket event').lean();
  const scanKeys = new Set(scans.map((scan) => `${String(scan.ticket)}:${String(scan.event)}`));
  const targetHasValidScan = recoveryIndices.some((index) => {
    const booking = oldByIndex.get(index);
    return scanKeys.has(`${String(booking._id)}:${String(oldReservation.eventIds[index - 1])}`);
  });
  if (targetHasValidScan) throw new ReplacementError('TARGET_MATCH_ALREADY_CHECKED_IN');
  if (recoveryIndices.some((index) => !['confirmed', 'cancelled'].includes(oldByIndex.get(index).status)) ||
      (recoveryStatus !== 'issuing' && recoveryIndices.some((index) => oldByIndex.get(index).status !== 'confirmed'))) {
    throw new ReplacementError('TARGET_TICKET_STATE_REVIEW_REQUIRED');
  }
  const retainedUsedTicketCount = oldBookings.filter((booking) => (
    scanKeys.has(`${String(booking._id)}:${String(booking.event)}`)
  )).length;

  const knownRecoveryIndices = (premiumReservation.recoveryMatchIndices || []).map(Number);
  if (recoveryStatus === 'issuing' &&
      (knownRecoveryIndices.length !== 2 || knownRecoveryIndices.some((index, position) => index !== [1, 2][position]))) {
    throw new ReplacementError('RECOVERY_CONFLICT');
  }
  const datesStillNeedingHold = missingPremiumIndices;
  const eventDocs = datesStillNeedingHold.length
    ? await Event.find({ _id: { $in: datesStillNeedingHold.map((index) => premiumReservation.eventIds[index - 1]) } }).select('+ticketTypes')
    : [];
  const eventById = new Map(eventDocs.map((event) => [String(event._id), event]));
  const matches = datesStillNeedingHold.map((index) => {
    const event = eventById.get(String(premiumReservation.eventIds[index - 1]));
    if (!event) throw new ReplacementError('PREMIUM_INVENTORY_UNAVAILABLE');
    return { matchDate: premiumReservation.matchDates[index - 1], ticketTypes: event.ticketTypes };
  });
  try {
    await homeMatchInventory.beginPartnerMissingTicketRecovery({
      orderId: premiumReservationId,
      oldReservationId,
      paymentId,
      matchIndices: recoveryIndices,
      matchDates: matches.map((match) => match.matchDate),
      matches,
    });
  } catch (error) {
    if (error.code) throw new ReplacementError(error.code, error.code === 'RESERVATION_NOT_FOUND' ? 404 : 409);
    throw error;
  }

  const fixtures = recoveryIndices.map((matchIndex) => ({
    eventId: premiumReservation.eventIds[matchIndex - 1],
    matchDate: premiumReservation.matchDates[matchIndex - 1],
    matchIndex,
    ticketType: premiumReservation.ticketType,
  }));
  const issued = await require('./nuscSeasonPassBookingService').createSeasonPassTicketRecords({
    orderId: premiumReservation.partnerOrderId,
    fixtures,
    passId: premiumReservation.passId,
    quantity: 1,
    paymentId,
    paymentProvider: 'nusc-partner',
    memberReferenceHash: premiumReservation.memberReferenceHash,
    reservationId: premiumReservationId,
    partnerId: 'nusc',
  });
  if (issued.bookingIds.length !== 2) throw new ReplacementError('RECOVERY_TICKET_SET_INCOMPLETE', 500);

  const targetOldIds = recoveryIndices.map((index) => oldByIndex.get(index)._id);
  await Booking.updateMany({ _id: { $in: targetOldIds }, status: 'confirmed' }, {
    $set: { status: 'cancelled', 'nuscPartnerTicket.replacedByReservationId': premiumReservationId },
  });
  const finalOldTargets = await Booking.find({ _id: { $in: targetOldIds } })
    .select('_id status nuscPartnerTicket.replacedByReservationId').lean();
  if (finalOldTargets.length !== 2 || finalOldTargets.some((booking) => (
    booking.status !== 'cancelled' || booking.nuscPartnerTicket?.replacedByReservationId !== premiumReservationId
  ))) {
    throw new ReplacementError('OLD_TICKETS_CHANGED_RETRY');
  }
  const finalOldBookings = await Booking.find({ _id: { $in: oldReservation.bookingIds } }).select('_id status').lean();
  const cancelledUnusedTicketCount = finalOldBookings.filter((booking) => booking.status === 'cancelled').length;

  const premiumBookingIdsByIndex = new Map(premiumBookings.map((booking) => [Number(booking.nuscSeasonMatchIndex), booking._id]));
  issued.bookings.forEach((booking) => premiumBookingIdsByIndex.set(Number(booking.nuscSeasonMatchIndex), booking._id));
  const allBookingIds = [...premiumBookingIdsByIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, id]) => id);
  if (allBookingIds.length !== 10) throw new ReplacementError('RECOVERY_TICKET_SET_INCOMPLETE', 500);
  const completed = await homeMatchInventory.completePartnerMissingTicketRecovery(
    premiumReservationId,
    oldReservationId,
    issued.bookingIds,
    allBookingIds,
    recoveryIndices,
    retainedUsedTicketCount,
    cancelledUnusedTicketCount,
  );
  return { reservation: completed, issuedBookingIds: issued.bookingIds, retainedUsedTicketCount, alreadyIssued: false };
}

module.exports = {
  ReplacementError,
  beginPartnerSeasonPassReplacement,
  completePartnerSeasonPassReplacement,
  recoverMissingGeneralReplacementTickets,
};
