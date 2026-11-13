const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Scan = require('../models/Scan');

class CheckOutError extends Error {
  constructor(message, code, status = 409) {
    super(message);
    this.name = 'CheckOutError';
    this.code = code;
    this.status = status;
  }
}

async function checkOutBooking({ bookingId, eventId }) {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new CheckOutError('A valid booking ID is required.', 'INVALID_BOOKING_ID', 400);
  }
  if (eventId && !mongoose.isValidObjectId(eventId)) {
    throw new CheckOutError('A valid event ID is required.', 'INVALID_EVENT_ID', 400);
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new CheckOutError('Booking not found.', 'BOOKING_NOT_FOUND', 404);
  if (eventId && String(booking.event) !== String(eventId)) {
    throw new CheckOutError('This booking is not for the selected event.', 'EVENT_MISMATCH', 409);
  }

  const scanFilter = { ticket: booking._id };
  if (eventId) scanFilter.event = eventId;
  const latestScans = await Scan.find(scanFilter).sort({ timestamp: -1 }).limit(1);
  if (latestScans.length === 0) {
    throw new CheckOutError('No scan records found for this ticket.', 'SCAN_NOT_FOUND', 400);
  }

  await Scan.findByIdAndDelete(latestScans[0]._id);

  const remainingScans = await Scan.countDocuments({ ticket: booking._id });
  const eventScansRemaining = eventId
    ? await Scan.countDocuments(scanFilter)
    : remainingScans;
  if (remainingScans === 0) booking.status = 'confirmed';

  booking.checkedOutAt = new Date();
  await booking.save();

  const event = await Event.findById(eventId || booking.event);
  const ticketTypeInfo = (event?.ticketTypes || []).find((ticket) => ticket.name === booking.ticketType);
  const capacity = Math.max(1, Number(ticketTypeInfo?.capacity) || 1);

  return {
    status: 'VALID',
    checkedOutAt: booking.checkedOutAt,
    capacity,
    usedEntries: eventScansRemaining,
    remainingEntries: Math.max(0, capacity - eventScansRemaining),
  };
}

module.exports = { CheckOutError, checkOutBooking };
