const express = require('express');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Scan = require('../models/Scan');
const scannerAuth = require('../middlewares/scannerAuth');
const { CheckInError, checkInBooking } = require('../services/bookingCheckInService');
const { CheckOutError, checkOutBooking } = require('../services/bookingCheckOutService');

const router = express.Router();

router.post('/login', require('../controllers/scannerAuthController').login);
router.use(scannerAuth);

router.get('/session', (req, res) => res.json({
  success: true,
  data: { id: String(req.scannerStaff._id), username: req.scannerStaff.username, role: 'scanner' },
}));

router.post('/verify-ticket', async (req, res) => {
  try {
    const { bookingId, eventId } = req.body || {};
    if (!bookingId || !eventId) {
      return res.status(400).json({ message: 'Booking ID and event ID are required.', status: 'INVALID' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.', status: 'INVALID' });

    if (!['confirmed', 'checked-in'].includes(booking.status)) {
      return res.status(200).json({ message: 'This ticket is not active for entry.', status: 'INVALID' });
    }

    const isSeasonPass = typeof booking.ticketType === 'string' && booking.ticketType.toLowerCase().includes('season');
    if (!isSeasonPass && String(booking.event || '') !== String(eventId)) {
      return res.status(400).json({ message: 'This ticket is not for the selected event.', status: 'INVALID' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found.', status: 'INVALID' });

    const ticketTypeInfo = (event.ticketTypes || []).find((ticket) => ticket.name === booking.ticketType);
    const capacity = Math.max(1, Number(ticketTypeInfo?.capacity) || 1);
    const usedEntries = await Scan.countDocuments({ ticket: bookingId, event: eventId });
    const remainingEntries = Math.max(0, capacity - usedEntries);
    if (remainingEntries === 0) {
      return res.json({
        message: `This ticket has reached its maximum capacity (${capacity}). No more entries allowed.`,
        status: 'ALREADY_USED',
        bookingId: String(booking._id),
        userId: booking.user ? String(booking.user) : 'Unknown',
        ticketType: booking.ticketType,
        eventDate: booking.createdAt,
        checkedInAt: booking.checkedInAt,
        capacity,
        usedEntries,
        remainingEntries,
      });
    }

    return res.json({
      message: 'Ticket verified successfully.',
      status: 'VALID',
      bookingId: String(booking._id),
      userId: booking.user ? String(booking.user) : 'Unknown',
      ticketType: booking.ticketType,
      eventDate: booking.createdAt,
      capacity,
      usedEntries,
      remainingEntries,
    });
  } catch (error) {
    console.error('Scanner ticket verification failed:', error);
    return res.status(500).json({ message: 'Unable to verify this ticket.' });
  }
});

router.post('/check-in', async (req, res) => {
  try {
    const { bookingId, eventId, requestId } = req.body || {};
    const idempotencyKey = requestId || req.get('Idempotency-Key');
    if (!bookingId || !eventId) {
      return res.status(400).json({ message: 'Booking ID and event ID are required.', code: 'CHECK_IN_IDENTITY_REQUIRED' });
    }

    const result = await checkInBooking({
      bookingId,
      eventId,
      requestId: idempotencyKey,
      scannerStaffId: String(req.scannerStaff._id),
    });
    return res.status(200).json({
      message: `Check-in successful. ${result.remainingEntries > 0 ? `${result.remainingEntries} entries remaining.` : 'No more entries remaining.'}`,
      ...result,
    });
  } catch (error) {
    if (error instanceof CheckInError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'This check-in request was already processed.', code: 'REQUEST_ALREADY_PROCESSED' });
    }
    console.error('Scanner check-in failed:', error);
    return res.status(500).json({ message: 'Unable to check in this ticket.' });
  }
});

router.post('/check-out', async (req, res) => {
  try {
    const { bookingId, eventId } = req.body || {};
    if (!bookingId || !eventId) {
      return res.status(400).json({ message: 'Booking ID and event ID are required.', code: 'CHECK_OUT_IDENTITY_REQUIRED' });
    }

    const result = await checkOutBooking({ bookingId, eventId });
    return res.status(200).json({
      message: 'Check-out successful. One entry has been freed up.',
      ...result,
    });
  } catch (error) {
    if (error instanceof CheckOutError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    console.error('Scanner check-out failed:', error);
    return res.status(500).json({ message: 'Unable to check out this ticket.' });
  }
});

module.exports = router;
