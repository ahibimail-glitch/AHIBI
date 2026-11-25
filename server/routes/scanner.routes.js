const express = require('express');
const mongoose = require('mongoose');
const { performance } = require('node:perf_hooks');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Scan = require('../models/Scan');
const scannerAuth = require('../middlewares/scannerAuth');
const scannerRequestTiming = require('../middlewares/scannerRequestTiming');
const scannerActivityAudit = require('../middlewares/scannerActivityAudit');
const { CheckInError, checkInBooking } = require('../services/bookingCheckInService');
const { CheckOutError, checkOutBooking } = require('../services/bookingCheckOutService');
const onSpotBookingController = require('../controllers/onSpotBookingController');

function permissionFor(req, eventId, permission = 'canScan') {
  const assignments = req.scannerStaff?.eventAssignments;
  // Accounts created before assignments existed keep their scanner-only access.
  if (assignments == null) return permission === 'canScan';
  const assignment = assignments.find((item) => String(item.event) === String(eventId));
  return Boolean(assignment && assignment[permission]);
}

const router = express.Router();

router.post('/login', scannerRequestTiming, scannerActivityAudit, require('../controllers/scannerAuthController').login);
router.use(scannerRequestTiming);
router.use(scannerActivityAudit);
router.use(scannerAuth);

async function timedDatabase(req, name, operation) {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    const endedAt = performance.now();
    req.scannerTiming?.recordDatabase(name, endedAt - startedAt, startedAt, endedAt);
  }
}

router.get('/events', async (req, res) => {
  try {
    const now = new Date();
    const eventFilter = {
      status: 'approved',
      $or: [
        { endDate: { $gte: now } },
        { endDate: null, startDate: { $gte: now } },
        { endDate: { $exists: false }, startDate: { $gte: now } },
      ],
    };
    if (Array.isArray(req.scannerStaff.eventAssignments)) {
      const allowedIds = req.scannerStaff.eventAssignments.filter((item) => item.canScan).map((item) => item.event);
      eventFilter._id = { $in: allowedIds };
    }
    let events = await timedDatabase(req, 'scanner-events-db', () => Event.find(eventFilter).select('_id title wristbandTrackingEnabled').sort({ startDate: 1 }).lean());
    // Wristband assignment is part of check-in for tracked events. Keep those
    // events out of a scanner's list unless both required actions are assigned.
    if (Array.isArray(req.scannerStaff.eventAssignments)) {
      events = events.filter((event) => !event.wristbandTrackingEnabled || permissionFor(req, event._id, 'canIssueWristbands'));
    } else {
      // Legacy accounts retain scan access for ordinary events, but do not
      // receive wristband issuance privileges implicitly.
      events = events.filter((event) => !event.wristbandTrackingEnabled);
    }
    return res.json({ success: true, data: { events } });
  } catch (error) {
    console.error('Scanner event list failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load events.' });
  }
});

router.get('/session', async (req, res) => {
  try {
    const assignments = req.scannerStaff.eventAssignments;
    const eventIds = Array.isArray(assignments) ? assignments.map((item) => item.event) : [];
    const events = eventIds.length ? await Event.find({ _id: { $in: eventIds } }).select('_id title').lean() : [];
    const titles = new Map(events.map((event) => [String(event._id), event.title]));
    return res.json({ success: true, data: {
      id: String(req.scannerStaff._id), username: req.scannerStaff.username, role: 'scanner',
      eventAssignments: assignments == null ? null : assignments.map((item) => ({ ...item.toObject(), event: String(item.event), eventTitle: titles.get(String(item.event)) || 'Event' })),
    } });
  } catch (error) {
    console.error('Scanner session details failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load scanner permissions.' });
  }
});

router.get('/on-spot/events', (req, res, next) => {
  if (req.scannerStaff.eventAssignments == null) {
    return res.status(403).json({ success: false, message: 'Box-office sales access must be assigned by an administrator.' });
  }
  return onSpotBookingController.listEvents(req, res, next);
});

router.get('/wristbands/:eventId/report', (req, res, next) => {
  if (!permissionFor(req, req.params.eventId, 'canViewCounts')) {
    return res.status(403).json({ success: false, message: 'You are not assigned to view counts for this event.' });
  }
  return require('../controllers/wristbandController').getReport(req, res, next);
});

router.post('/on-spot', async (req, res, next) => {
  const eventId = String(req.body?.eventId || '');
  if (!permissionFor(req, eventId, 'canSellOnsite')) {
    return res.status(403).json({ message: 'You are not assigned to sell tickets at this box office.', code: 'BOX_OFFICE_PERMISSION_REQUIRED' });
  }
  try {
    const event = await Event.findById(eventId).select('_id wristbandTrackingEnabled').lean();
    if (event?.wristbandTrackingEnabled && !permissionFor(req, eventId, 'canIssueWristbands')) {
      return res.status(403).json({ message: 'This event requires wristband issuance during box-office sale. Ask an administrator to assign both permissions.', code: 'WRISTBAND_PERMISSION_REQUIRED' });
    }
  } catch (error) {
    return next(error);
  }
  return onSpotBookingController.createBooking(req, res, next);
});

router.get('/check-in-history', async (req, res) => {
  const eventId = typeof req.query.eventId === 'string' ? req.query.eventId.trim() : '';
  if (!mongoose.isValidObjectId(eventId)) {
    return res.status(400).json({ success: false, message: 'A valid event ID is required.' });
  }
  if (!permissionFor(req, eventId)) return res.status(403).json({ success: false, message: 'You are not assigned to this event.' });

  try {
    const now = new Date();
    const event = await timedDatabase(req, 'scanner-history-event-db', () => Event.findOne({
      _id: eventId,
      status: 'approved',
      $or: [
        { endDate: { $gte: now } },
        { endDate: null, startDate: { $gte: now } },
        { endDate: { $exists: false }, startDate: { $gte: now } },
      ],
    }).select('_id').lean());
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or no longer available to scan.' });
    }

    const parsedLimit = Number.parseInt(typeof req.query.limit === 'string' ? req.query.limit : '', 10);
    const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
    const scanFilter = { event: eventId };
    const beforeTimestamp = req.query.beforeTimestamp;
    const beforeScanId = req.query.beforeScanId;
    if (beforeTimestamp !== undefined || beforeScanId !== undefined) {
      const parsedTimestamp = typeof beforeTimestamp === 'string' ? new Date(beforeTimestamp) : null;
      if (
        !parsedTimestamp || Number.isNaN(parsedTimestamp.getTime()) ||
        typeof beforeScanId !== 'string' || !mongoose.isValidObjectId(beforeScanId)
      ) {
        return res.status(400).json({ success: false, message: 'The history cursor is invalid.' });
      }
      scanFilter.$or = [
        { timestamp: { $lt: parsedTimestamp } },
        { timestamp: parsedTimestamp, _id: { $lt: new mongoose.Types.ObjectId(beforeScanId) } },
      ];
    }

    const scannedRows = await timedDatabase(req, 'scanner-history-scans-db', () => Scan.find(scanFilter)
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit + 1)
      .select('ticket timestamp')
      .lean());
    const hasMore = scannedRows.length > limit;
    const scans = hasMore ? scannedRows.slice(0, limit) : scannedRows;
    const bookingIds = [...new Set(scans.map((scan) => String(scan.ticket)).filter(mongoose.isValidObjectId))];
    const bookings = bookingIds.length
      ? await timedDatabase(req, 'scanner-history-bookings-db', () => Booking.find({ _id: { $in: bookingIds } })
        .select('_id ticketType ticketIndex totalTickets customerName user')
        .populate({ path: 'user', select: 'name' })
        .lean())
      : [];
    const bookingsById = new Map(bookings.map((booking) => [String(booking._id), booking]));
    const items = scans.map((scan) => {
      const booking = bookingsById.get(String(scan.ticket));
      const attendeeName = [booking?.customerName, booking?.user?.name]
        .find((name) => typeof name === 'string' && name.trim())?.trim() || 'Guest';
      return {
        scanId: String(scan._id),
        bookingId: String(scan.ticket),
        timestamp: scan.timestamp,
        attendeeName,
        ticketType: booking?.ticketType || 'Ticket',
        ticketIndex: booking?.ticketIndex,
        totalTickets: booking?.totalTickets,
      };
    });
    const lastItem = items[items.length - 1];

    return res.json({
      success: true,
      data: {
        items,
        hasMore,
        nextCursor: hasMore && lastItem
          ? { beforeTimestamp: new Date(lastItem.timestamp).toISOString(), beforeScanId: lastItem.scanId }
          : null,
      },
    });
  } catch (error) {
    console.error('Scanner check-in history failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load check-in history.' });
  }
});

router.post('/verify-ticket', async (req, res) => {
  try {
    const { bookingId, eventId, ticketToken } = req.body || {};
    if (!bookingId || !eventId) {
      return res.status(400).json({ message: 'Booking ID and event ID are required.', status: 'INVALID' });
    }
    if (!permissionFor(req, eventId)) return res.status(403).json({ message: 'You are not assigned to this event.', status: 'FORBIDDEN' });

    const booking = await timedDatabase(req, 'verify-booking-db', () => Booking.findById(bookingId)
      .select('event status ticketType user createdAt checkedInAt +ticketQrToken'));
    if (!booking) return res.status(404).json({ message: 'Booking not found.', status: 'INVALID' });

    if (booking.ticketQrToken && booking.ticketQrToken !== ticketToken) {
      return res.status(200).json({ message: 'This ticket QR code has been replaced. Please use the latest ticket from your AHIBI dashboard.', status: 'INVALID' });
    }

    if (!['confirmed', 'checked-in'].includes(booking.status)) {
      return res.status(200).json({ message: 'This ticket is not active for entry.', status: 'INVALID' });
    }

    const isSeasonPass = typeof booking.ticketType === 'string' && booking.ticketType.toLowerCase().includes('season');
    if (!isSeasonPass && String(booking.event || '') !== String(eventId)) {
      return res.status(400).json({ message: 'This ticket is not for the selected event.', status: 'INVALID' });
    }

    const [event, usedEntries] = await Promise.all([
      timedDatabase(req, 'verify-event-db', () => Event.findById(eventId).select('ticketTypes')),
      timedDatabase(req, 'verify-scan-count-db', () => Scan.countDocuments({ ticket: bookingId, event: eventId })),
    ]);
    if (!event) return res.status(404).json({ message: 'Event not found.', status: 'INVALID' });

    const ticketTypeInfo = (event.ticketTypes || []).find((ticket) => ticket.name === booking.ticketType);
    const capacity = Math.max(1, Number(ticketTypeInfo?.capacity) || 1);
    const remainingEntries = Math.max(0, capacity - usedEntries);
    if (remainingEntries === 0) {
      const checkOutScan = await timedDatabase(req, 'verify-checkout-scan-db', () => Scan.findOne({
        ticket: bookingId,
        event: eventId,
      }).sort({ timestamp: -1, _id: -1 }).select('_id').lean());
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
        checkOutScanId: checkOutScan ? String(checkOutScan._id) : undefined,
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
    const { bookingId, eventId, requestId, ticketToken } = req.body || {};
    const idempotencyKey = requestId || req.get('Idempotency-Key');
    if (!bookingId || !eventId) {
      return res.status(400).json({ message: 'Booking ID and event ID are required.', code: 'CHECK_IN_IDENTITY_REQUIRED' });
    }
    if (!permissionFor(req, eventId)) return res.status(403).json({ message: 'You are not assigned to this event.', code: 'EVENT_NOT_ASSIGNED' });
    const result = await checkInBooking({
      bookingId,
      eventId,
      requestId: idempotencyKey,
      scannerStaffId: String(req.scannerStaff._id),
      canIssueWristbands: permissionFor(req, eventId, 'canIssueWristbands'),
      ticketToken,
    }, {
      onDatabaseTiming: (name, elapsedMs, startedAt, endedAt) =>
        req.scannerTiming?.recordDatabase(name, elapsedMs, startedAt, endedAt),
      onTransactionTiming: (elapsedMs) => req.scannerTiming?.recordPhase('checkin-transaction', elapsedMs),
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
    const { bookingId, eventId, scanId } = req.body || {};
    if (!bookingId || !eventId) {
      return res.status(400).json({ message: 'Booking ID and event ID are required.', code: 'CHECK_OUT_IDENTITY_REQUIRED' });
    }
    if (!permissionFor(req, eventId)) return res.status(403).json({ message: 'You are not assigned to this event.', code: 'EVENT_NOT_ASSIGNED' });

    const result = await checkOutBooking({ bookingId, eventId, scanId }, {
      onDatabaseTiming: (name, elapsedMs, startedAt, endedAt) =>
        req.scannerTiming?.recordDatabase(name, elapsedMs, startedAt, endedAt),
      onTransactionTiming: (elapsedMs) => req.scannerTiming?.recordPhase('checkout-transaction', elapsedMs),
    });
    return res.status(200).json({
      message: result.idempotentReplay
        ? 'This check-out was already processed or the entry is no longer active.'
        : 'Check-out successful. One entry has been freed up.',
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
