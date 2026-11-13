const mongoose = require('mongoose');
const { performance } = require('node:perf_hooks');
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

function createDatabaseTimer(onDatabaseTiming) {
  if (typeof onDatabaseTiming !== 'function') return (_name, operation) => operation();

  return async (name, operation) => {
    const startedAt = performance.now();
    try {
      return await operation();
    } finally {
      const endedAt = performance.now();
      onDatabaseTiming(name, endedAt - startedAt, startedAt, endedAt);
    }
  };
}

async function checkOutBooking(
  { bookingId, eventId, scanId },
  { onDatabaseTiming, onTransactionTiming } = {},
) {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new CheckOutError('A valid booking ID is required.', 'INVALID_BOOKING_ID', 400);
  }
  if (eventId && !mongoose.isValidObjectId(eventId)) {
    throw new CheckOutError('A valid event ID is required.', 'INVALID_EVENT_ID', 400);
  }
  if (!mongoose.isValidObjectId(scanId)) {
    throw new CheckOutError('A valid check-in record is required.', 'INVALID_SCAN_ID', 400);
  }

  const session = await mongoose.startSession();
  const timeDatabase = createDatabaseTimer(onDatabaseTiming);
  let result;
  try {
    const transactionStartedAt = typeof onTransactionTiming === 'function' ? performance.now() : 0;
    try {
      await session.withTransaction(async () => {
        const booking = await timeDatabase(
          'checkout-booking-read-db',
          () => Booking.findById(bookingId).session(session),
        );
        if (!booking) throw new CheckOutError('Booking not found.', 'BOOKING_NOT_FOUND', 404);

        const isSeasonPass = typeof booking.ticketType === 'string' && booking.ticketType.toLowerCase().includes('season');
        if (eventId && String(booking.event) !== String(eventId) && !isSeasonPass) {
          throw new CheckOutError('This booking is not for the selected event.', 'EVENT_MISMATCH', 409);
        }

        const scanFilter = { ticket: booking._id };
        if (eventId) scanFilter.event = eventId;
        const removedScan = await timeDatabase('checkout-scan-delete-db', () => Scan.findOneAndDelete({
          _id: scanId,
          ...scanFilter,
        }).session(session));

        const remainingScans = await timeDatabase(
          'checkout-count-db',
          () => Scan.countDocuments({ ticket: booking._id }).session(session),
        );
        const eventScansRemaining = eventId
          ? await timeDatabase('checkout-event-count-db', () => Scan.countDocuments(scanFilter).session(session))
          : remainingScans;

        if (removedScan) {
          if (remainingScans === 0) booking.status = 'confirmed';
          booking.checkedOutAt = new Date();
          booking.increment();
          await timeDatabase('checkout-booking-write-db', () => booking.save({ session }));
        }

        const event = await timeDatabase(
          'checkout-event-read-db',
          () => Event.findById(eventId || booking.event).session(session),
        );
        const ticketTypeInfo = (event?.ticketTypes || []).find((ticket) => ticket.name === booking.ticketType);
        const capacity = Math.max(1, Number(ticketTypeInfo?.capacity) || 1);

        result = {
          status: 'VALID',
          ...(removedScan ? { checkedOutAt: booking.checkedOutAt } : {}),
          capacity,
          usedEntries: eventScansRemaining,
          remainingEntries: Math.max(0, capacity - eventScansRemaining),
          idempotentReplay: !removedScan,
        };
      });
    } finally {
      if (typeof onTransactionTiming === 'function') {
        onTransactionTiming(performance.now() - transactionStartedAt);
      }
    }
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { CheckOutError, checkOutBooking };
