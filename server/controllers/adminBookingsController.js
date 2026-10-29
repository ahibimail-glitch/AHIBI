const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');

const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'refunded', 'checked-in'];
const PAGE_SIZES = new Set([25, 50, 100]);
const DETAIL_FIELDS = [
  'event eventSnapshot user bookingSource ticketType ticketTypeId quantity price total status paymentStatus',
  'paymentId paymentProvider externalPaymentId nuscOrderId nuscTicketIndex nuscSuiteBoxNumber',
  'nuscSeasonPassType nuscSeasonMatchIndex nuscGeneralZone nuscPartnerTicket',
  'entryVerified entryVerifiedAt entryVerifiedBy ticketIndex totalTickets',
  'customerName customerPhone customerEmail qrCode country state modeOfPayment visitorType',
  'parentBookingId bookedAt updatedAt onSpotCreatedBy',
].join(' ');

class QueryValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function boundedText(value, maxLength = 120) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseEventIds(value) {
  const rawIds = boundedText(value, 1000).split(',').map((id) => id.trim()).filter(Boolean);
  if (rawIds.length > 40 || rawIds.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
    throw new QueryValidationError('The event selection is invalid.');
  }
  return [...new Set(rawIds)].map((id) => new mongoose.Types.ObjectId(id));
}

function parseDateRange(query) {
  const startValue = boundedText(query.startDate, 40);
  const endValue = boundedText(query.endDate, 40);
  if (!startValue && !endValue) return null;
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime())) || (start && end && start >= end)) {
    throw new QueryValidationError('The booking date range is invalid.');
  }
  return { ...(start ? { $gte: start } : {}), ...(end ? { $lt: end } : {}) };
}

async function buildBookingFilters(query) {
  const clauses = [];
  const eventId = boundedText(query.eventId, 24);
  const category = boundedText(query.category, 100);
  const source = boundedText(query.source, 20);
  const paymentSource = boundedText(query.paymentSource, 20);
  const status = boundedText(query.status, 30);
  const ticketType = boundedText(query.ticketType, 120);
  const country = boundedText(query.country, 100);
  const state = boundedText(query.state, 100);
  const visitorType = boundedText(query.visitorType, 60);
  const eventIds = parseEventIds(query.eventIds);

  if (eventId) {
    if (!/^[a-f\d]{24}$/i.test(eventId)) {
      throw new QueryValidationError('The selected event is invalid.');
    }
    const id = new mongoose.Types.ObjectId(eventId);
    clauses.push({ $or: [{ event: id }, { 'eventSnapshot._id': id }] });
  }

  if (eventIds.length) {
    clauses.push({ $or: [{ event: { $in: eventIds } }, { 'eventSnapshot._id': { $in: eventIds } }] });
  }

  if (category) {
    const eventIds = await Event.distinct('_id', { category });
    clauses.push({ $or: [{ event: { $in: eventIds } }, { 'eventSnapshot._id': { $in: eventIds } }] });
  }

  if (status) {
    if (!BOOKING_STATUSES.includes(status)) {
      throw new QueryValidationError('The selected booking status is invalid.');
    }
    clauses.push({ status });
  }

  if (source === 'on-spot') {
    clauses.push({ bookingSource: 'on-spot' });
  } else if (source === 'online') {
    clauses.push({ $or: [{ bookingSource: 'online' }, { bookingSource: { $exists: false } }, { bookingSource: null }] });
  } else if (source && source !== 'all') {
    throw new QueryValidationError('The selected booking source is invalid.');
  }

  if (paymentSource === 'online') {
    clauses.push({ paymentId: { $exists: true, $nin: [null, ''] } });
  } else if (paymentSource === 'manual') {
    clauses.push({ $or: [{ paymentId: { $exists: false } }, { paymentId: null }, { paymentId: '' }] });
  } else if (paymentSource && paymentSource !== 'all') {
    throw new QueryValidationError('The selected payment source is invalid.');
  }

  if (ticketType && ticketType !== 'all') clauses.push({ ticketType });
  if (country && country !== 'all') clauses.push({ country });
  if (state && state !== 'all') clauses.push({ state });
  if (visitorType && visitorType !== 'all') clauses.push({ visitorType });

  const dateRange = parseDateRange(query);
  if (dateRange) clauses.push({ bookedAt: dateRange });

  return {
    match: clauses.length ? { $and: clauses } : {},
    name: boundedText(query.name, 100),
    phone: boundedText(query.phone, 40),
    search: boundedText(query.search, 120),
  };
}

function bookingLookups() {
  return [
    {
      $lookup: {
        from: Event.collection.name,
        let: { eventId: '$event' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$eventId'] } } },
          { $project: { title: 1, category: 1 } },
        ],
        as: 'eventDoc',
      },
    },
    { $unwind: { path: '$eventDoc', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: User.collection.name,
        let: { userId: '$user' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
          { $project: { name: 1, email: 1, phone: 1 } },
        ],
        as: 'userDoc',
      },
    },
    { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
  ];
}

function searchMatches(filters) {
  const stages = [];
  if (filters.name) {
    const name = new RegExp(escapeRegex(filters.name), 'i');
    stages.push({ $match: { $or: [{ customerName: name }, { 'userDoc.name': name }] } });
  }
  if (filters.phone) {
    const phone = new RegExp(escapeRegex(filters.phone));
    stages.push({ $match: { $or: [{ customerPhone: phone }, { 'userDoc.phone': phone }] } });
  }
  if (filters.search) {
    const search = new RegExp(escapeRegex(filters.search), 'i');
    stages.push({
      $match: {
        $or: [
          { 'eventDoc.title': search },
          { 'eventSnapshot.title': search },
          { customerName: search },
          { customerEmail: search },
          { customerPhone: search },
          { 'userDoc.name': search },
          { 'userDoc.email': search },
          { 'userDoc.phone': search },
        ],
      },
    });
  }
  return stages;
}

function hasJoinedSearch(filters) {
  return Boolean(filters.name || filters.phone || filters.search);
}

function sortedBookingPipeline(filters) {
  return [
    { $match: filters.match },
    { $sort: { bookedAt: -1, _id: -1 } },
  ];
}

function rowProjection({ includeTicketFields = false } = {}) {
  const projection = {
    _id: 1,
    eventTitle: { $ifNull: ['$eventDoc.title', { $ifNull: ['$eventSnapshot.title', 'Deleted Event'] }] },
    user: {
      name: { $ifNull: ['$customerName', { $ifNull: ['$userDoc.name', 'Guest'] }] },
      email: { $ifNull: ['$customerEmail', { $ifNull: ['$userDoc.email', ''] }] },
      phone: { $ifNull: ['$customerPhone', { $ifNull: ['$userDoc.phone', ''] }] },
    },
    bookedAt: 1,
    ticketType: 1,
    quantity: 1,
    total: 1,
    status: 1,
    paymentStatus: 1,
    bookingSource: { $ifNull: ['$bookingSource', 'online'] },
    modeOfPayment: 1,
  };

  if (includeTicketFields) {
    Object.assign(projection, {
      eventId: { $ifNull: ['$event', '$eventSnapshot._id'] },
      event: {
        _id: { $ifNull: ['$event', '$eventSnapshot._id'] },
        title: { $ifNull: ['$eventDoc.title', { $ifNull: ['$eventSnapshot.title', 'Deleted Event'] }] },
        category: { $ifNull: ['$eventDoc.category', null] },
      },
      paymentId: 1,
      country: 1,
      state: 1,
      visitorType: 1,
    });
  }
  return projection;
}

async function listBookings(req, res) {
  try {
    const pageValue = Number.parseInt(req.query.page, 10);
    const limitValue = Number.parseInt(req.query.limit, 10);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = PAGE_SIZES.has(limitValue) ? limitValue : 25;
    const filters = await buildBookingFilters(req.query);
    const joinForSearch = hasJoinedSearch(filters);
    const pipeline = [
      ...sortedBookingPipeline(filters),
      ...(joinForSearch ? [...bookingLookups(), ...searchMatches(filters)] : []),
      {
        $facet: {
          bookings: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            ...(!joinForSearch ? bookingLookups() : []),
            { $project: rowProjection({ includeTicketFields: req.query.view === 'tickets' }) },
          ],
          pagination: [{ $count: 'total' }],
        },
      },
    ];

    const [result = { bookings: [], pagination: [] }] = await Booking.aggregate(pipeline).allowDiskUse(true).exec();
    const total = result.pagination[0]?.total || 0;
    return res.json({
      bookings: result.bookings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error listing admin bookings:', error);
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Server error while loading bookings' });
  }
}

async function getBookingOptions(req, res) {
  try {
    const scope = await buildBookingFilters({ eventIds: req.query.eventIds });
    const [eventIds, snapshotEventIds, ticketTypes, countries, states, visitorTypes] = await Promise.all([
      Booking.distinct('event', scope.match),
      Booking.distinct('eventSnapshot._id', scope.match),
      Booking.distinct('ticketType', scope.match),
      Booking.distinct('country', scope.match),
      Booking.distinct('state', scope.match),
      Booking.distinct('visitorType', scope.match),
    ]);
    const allEventIds = [...new Map([...eventIds, ...snapshotEventIds].filter(Boolean).map((id) => [id.toString(), id])).values()];
    const events = await Event.find({ _id: { $in: allEventIds } })
      .select('_id title category')
      .sort({ title: 1 })
      .lean();
    const categories = [...new Set(events.map((event) => event.category).filter(Boolean))].sort();

    return res.json({
      events: events.map((event) => ({ _id: event._id, title: event.title, category: event.category || '' })),
      categories,
      ticketTypes: ticketTypes.filter(Boolean).sort(),
      statuses: BOOKING_STATUSES,
      countries: countries.filter(Boolean).sort(),
      states: states.filter(Boolean).sort(),
      visitorTypes: visitorTypes.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error('Error loading admin booking filter options:', error);
    return res.status(500).json({ message: 'Server error while loading booking filters' });
  }
}

async function getBookingStats(req, res) {
  try {
    const filters = await buildBookingFilters(req.query);
    const searchStages = hasJoinedSearch(filters) ? [...bookingLookups(), ...searchMatches(filters)] : [];
    const [result = { totals: [], statuses: [], sources: [] }] = await Booking.aggregate([
      { $match: filters.match },
      ...searchStages,
      {
        $facet: {
          totals: [{
            $group: {
              _id: null,
              totalBookings: { $sum: 1 },
              totalTickets: { $sum: { $ifNull: ['$quantity', 0] } },
            },
          }],
          statuses: [{ $group: { _id: { $ifNull: ['$status', 'unknown'] }, count: { $sum: 1 } } }],
          sources: [{ $group: { _id: { $ifNull: ['$bookingSource', 'online'] }, count: { $sum: 1 } } }],
        },
      },
    ]).allowDiskUse(true).exec();

    return res.json({
      totalBookings: result.totals[0]?.totalBookings || 0,
      totalTickets: result.totals[0]?.totalTickets || 0,
      statusCounts: Object.fromEntries(result.statuses.map(({ _id, count }) => [_id, count])),
      sourceCounts: Object.fromEntries(result.sources.map(({ _id, count }) => [_id, count])),
    });
  } catch (error) {
    console.error('Error loading admin booking stats:', error);
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Server error while loading booking statistics' });
  }
}

function csvCell(value) {
  let text = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function exportBookings(req, res) {
  let cursor;
  try {
    const filters = await buildBookingFilters(req.query);
    const pipeline = [
      ...sortedBookingPipeline(filters),
      ...bookingLookups(),
      ...searchMatches(filters),
      { $project: rowProjection({ includeTicketFields: true }) },
    ];
    cursor = Booking.aggregate(pipeline).allowDiskUse(true).cursor({ batchSize: 500 });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.write('\uFEFF');

    const headers = ['Booking ID', 'Event', 'Customer', 'Email', 'Phone', 'Booked Date', 'Ticket Type', 'Source', 'Payment Source', 'Payment Status', 'Payment Reference', 'Payment Method', 'Quantity', 'Total Amount', 'Status', 'Country', 'State', 'Visitor Type'];
    res.write(`${headers.map(csvCell).join(',')}\r\n`);

    for await (const booking of cursor) {
      const row = [
        booking._id,
        booking.eventTitle,
        booking.user?.name,
        booking.user?.email,
        booking.user?.phone,
        booking.bookedAt,
        booking.ticketType,
        booking.bookingSource === 'on-spot' ? 'On spot' : 'Online',
        booking.paymentId ? 'Online' : 'Manual',
        booking.paymentStatus === 'completed' ? 'Paid' : booking.paymentStatus,
        booking.paymentId,
        booking.modeOfPayment,
        booking.quantity,
        booking.total == null ? '' : `₹${booking.total}`,
        booking.status,
        booking.country,
        booking.state,
        booking.visitorType,
      ];
      if (!res.write(`${row.map(csvCell).join(',')}\r\n`)) {
        await new Promise((resolve) => res.once('drain', resolve));
      }
    }
    return res.end();
  } catch (error) {
    console.error('Error exporting admin bookings:', error);
    if (cursor) await cursor.close().catch(() => {});
    if (res.headersSent) return res.destroy(error);
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Server error while exporting bookings' });
  }
}

async function getBookingDetails(req, res) {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'The booking ID is invalid.' });
    }
    const booking = await Booking.findById(req.params.id)
      .select(DETAIL_FIELDS)
      .populate('event', 'title banner startDate endDate location ticketTypes')
      .populate('user', 'name email phone')
      .lean();

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!booking.event && booking.eventSnapshot) booking.event = booking.eventSnapshot;
    return res.json({ booking });
  } catch (error) {
    console.error('Error loading admin booking details:', error);
    return res.status(500).json({ message: 'Server error while loading booking details' });
  }
}

module.exports = {
  listBookings,
  getBookingOptions,
  getBookingStats,
  exportBookings,
  getBookingDetails,
};
