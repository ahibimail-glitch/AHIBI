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
  const scans = await Scan.find({ ticket: { $in: oldReservation.bookingIds } }).select('ticket').lean();
  const scannedIds = new Set(scans.map((scan) => String(scan.ticket)));
  const remainingBookings = oldBookings.filter((booking) => (
    booking.status === 'confirmed' && booking.entryVerified !== true && !scannedIds.has(String(booking._id))
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

      const scans = await Scan.find({ ticket: { $in: oldReservation.bookingIds } }).select('ticket').session(session).lean();
      const scannedBookingIds = new Set(scans.map((scan) => String(scan.ticket)));
      const usedBookings = oldBookings.filter((booking) => (
        booking.status === 'checked-in' || booking.entryVerified === true || scannedBookingIds.has(String(booking._id))
      ));
      const remainingBookings = oldBookings.filter((booking) => (
        booking.status === 'confirmed' && booking.entryVerified !== true && !scannedBookingIds.has(String(booking._id))
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
        entryVerified: { $ne: true },
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

module.exports = {
  ReplacementError,
  beginPartnerSeasonPassReplacement,
  completePartnerSeasonPassReplacement,
};
