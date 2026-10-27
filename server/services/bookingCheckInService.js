const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Scan = require('../models/Scan');
const Inventory = require('../models/NuscHomeMatchInventory');

const INVENTORY_KEY = 'nusc-il-2026-27';

class CheckInError extends Error {
  constructor(message, code, status = 409) {
    super(message);
    this.name = 'CheckInError';
    this.code = code;
    this.status = status;
  }
}

function sameId(left, right) {
  return left != null && right != null && String(left) === String(right);
}

function eventTicketCapacity(event, ticketType) {
  const ticket = (event.ticketTypes || []).find((item) => item.name === ticketType);
  return Math.max(1, Number(ticket?.capacity) || 1);
}

async function checkInBooking({ bookingId, eventId, staffId, requestId }, { afterScan = async () => {} } = {}) {
  if (!mongoose.isValidObjectId(bookingId) || !mongoose.isValidObjectId(eventId)) {
    throw new CheckInError('Booking ID and event ID must be valid.', 'INVALID_CHECK_IN_ID', 400);
  }
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(requestId)) {
    throw new CheckInError('A valid check-in request ID is required.', 'INVALID_REQUEST_ID', 400);
  }

  const session = await mongoose.startSession();
  let result;
  try {
    try {
      await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) throw new CheckInError('Booking not found.', 'BOOKING_NOT_FOUND', 404);
      if (!sameId(booking.event, eventId)) {
        throw new CheckInError('This booking is not for the selected event.', 'EVENT_MISMATCH', 409);
      }

      const event = await Event.findById(eventId).session(session);
      if (!event) throw new CheckInError('Event not found.', 'EVENT_NOT_FOUND', 404);

      const partnerTicket = booking.nuscPartnerTicket?.partnerId === 'nusc' || booking.paymentProvider === 'nusc-partner';
      if (!booking.user && !partnerTicket) {
        throw new CheckInError('Booking has no user account and is not an eligible partner ticket.', 'ACCOUNTLESS_BOOKING_NOT_ALLOWED', 409);
      }

      if (partnerTicket) {
        const metadata = booking.nuscPartnerTicket || {};
        if (!metadata.reservationId || !metadata.memberReferenceHash) {
          throw new CheckInError('Partner ticket reservation details are incomplete.', 'RESERVATION_MISMATCH', 409);
        }
        const inventoryDoc = await Inventory.findOne({
          key: INVENTORY_KEY,
          'partnerSeasonPassReservations.reservationId': metadata.reservationId,
        }).session(session).lean();
        const reservation = (inventoryDoc?.partnerSeasonPassReservations || [])
          .find((item) => item.reservationId === metadata.reservationId);
        const matchIndex = Number(booking.nuscSeasonMatchIndex);
        const reservationBookingIds = reservation?.bookingIds || [];
        const reservationEventIds = reservation?.eventIds || [];
        if (
          !reservation ||
          reservation.status !== 'issued' ||
          reservation.memberReferenceHash !== metadata.memberReferenceHash ||
          (metadata.partnerOrderId && reservation.partnerOrderId !== metadata.partnerOrderId) ||
          !reservationBookingIds.some((id) => sameId(id, booking._id)) ||
          !Number.isInteger(matchIndex) ||
          matchIndex < 1 ||
          !sameId(reservationEventIds[matchIndex - 1], booking.event) ||
          !sameId(reservationEventIds[matchIndex - 1], eventId) ||
          reservation.ticketType !== booking.ticketType ||
          (reservation.zone || null) !== (booking.nuscGeneralZone || null)
        ) {
          throw new CheckInError('This partner ticket does not belong to an issued reservation for the selected event.', 'RESERVATION_MISMATCH', 409);
        }
      }

      const ticketFilter = { ticket: booking._id, event: eventId };
      const priorRequest = await Scan.findOne({ ...ticketFilter, requestId }).session(session).lean();
      if (priorRequest) {
        const usedEntries = await Scan.countDocuments(ticketFilter).session(session);
        result = {
          status: 'CHECKED_IN',
          bookingId: String(booking._id),
          checkedInAt: priorRequest.timestamp,
          capacity: partnerTicket ? 1 : eventTicketCapacity(event, booking.ticketType),
          usedEntries,
          remainingEntries: Math.max(0, (partnerTicket ? 1 : eventTicketCapacity(event, booking.ticketType)) - usedEntries),
          idempotentReplay: true,
        };
        return;
      }

      const scanCount = await Scan.countDocuments(ticketFilter).session(session);
      const capacity = partnerTicket ? 1 : eventTicketCapacity(event, booking.ticketType);
      if (partnerTicket && (booking.entryVerified === true || scanCount > 0)) {
        throw new CheckInError('This partner ticket has already been used.', 'TICKET_ALREADY_USED', 409);
      }
      if (scanCount >= capacity) {
        throw new CheckInError(`This ticket has reached its maximum capacity (${capacity}). No more entries allowed.`, 'TICKET_EXHAUSTED', 409);
      }

      const scan = (await Scan.create([{
        ticket: booking._id,
        event: eventId,
        requestId,
        ...(partnerTicket ? { partnerId: 'nusc' } : { user: booking.user }),
      }], { session }))[0];
      await afterScan({ booking, scan, session });

      if (partnerTicket) {
        booking.entryVerified = true;
        booking.entryVerifiedAt = scan.timestamp;
        if (staffId && mongoose.isValidObjectId(staffId)) booking.entryVerifiedBy = staffId;
      }
      if (scanCount === 0) booking.status = 'checked-in';
      await booking.save({ session });

      result = {
        status: 'CHECKED_IN',
        bookingId: String(booking._id),
        checkedInAt: scan.timestamp,
        capacity,
        usedEntries: scanCount + 1,
        remainingEntries: capacity - scanCount - 1,
        idempotentReplay: false,
      };
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      const existing = await Scan.findOne({ ticket: bookingId, event: eventId, requestId }).lean();
      if (!existing) throw error;
      const usedEntries = await Scan.countDocuments({ ticket: bookingId, event: eventId });
      const bookingAfterCommit = await Booking.findById(bookingId).select('ticketType nuscPartnerTicket');
      const eventAfterCommit = await Event.findById(eventId);
      const partnerAfterCommit = bookingAfterCommit?.nuscPartnerTicket?.partnerId === 'nusc';
      const capacity = partnerAfterCommit ? 1 : eventTicketCapacity(eventAfterCommit || {}, bookingAfterCommit?.ticketType);
      result = {
        status: 'CHECKED_IN',
        bookingId: String(bookingId),
        checkedInAt: existing.timestamp,
        capacity,
        usedEntries,
        remainingEntries: Math.max(0, capacity - usedEntries),
        idempotentReplay: true,
      };
    }
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { CheckInError, checkInBooking };
