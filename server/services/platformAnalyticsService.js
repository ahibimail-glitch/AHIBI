const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const PaymentTransaction = require('../models/PaymentTransaction');
const Scan = require('../models/Scan');
const Event = require('../models/Event');
const Artist = require('../models/Artist');
const ArtistBooking = require('../models/ArtistBooking');

function toObjectId(id) {
  if (!id) return null;
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

function dateRangeFilter(field, startDate, endDate) {
  const filter = {};
  if (startDate) filter.$gte = new Date(`${startDate}T00:00:00.000Z`);
  if (endDate) filter.$lte = new Date(`${endDate}T23:59:59.999Z`);
  return Object.keys(filter).length ? { [field]: filter } : {};
}

async function getEventDbMetrics(eventId, startDate, endDate) {
  const oid = toObjectId(eventId);
  if (!oid) {
    return { source: 'database', available: false, message: 'Invalid event id' };
  }

  const createdFilter = dateRangeFilter('createdAt', startDate, endDate);
  const matchBase = { event: oid, ...createdFilter };

  const [
    completedAgg,
    failedCount,
    refundedAgg,
    cancelledCount,
    scanCount,
    ticketTypes,
    eventDoc,
  ] = await Promise.all([
    Booking.aggregate([
      {
        $match: {
          ...matchBase,
          paymentStatus: 'completed',
          status: { $nin: ['cancelled'] },
        },
      },
      {
        $group: {
          _id: null,
          ticketQuantity: { $sum: '$quantity' },
          grossRevenue: { $sum: '$total' },
          successfulPayments: { $sum: 1 },
        },
      },
    ]),
    Booking.countDocuments({ ...matchBase, paymentStatus: 'failed' }),
    Booking.aggregate([
      {
        $match: {
          ...matchBase,
          $or: [{ paymentStatus: 'refunded' }, { status: 'refunded' }],
        },
      },
      {
        $group: {
          _id: null,
          refundCount: { $sum: 1 },
          refundAmount: { $sum: '$total' },
        },
      },
    ]),
    Booking.countDocuments({ ...matchBase, status: 'cancelled' }),
    Scan.countDocuments({
      event: oid,
      ...dateRangeFilter('timestamp', startDate, endDate),
    }),
    Booking.aggregate([
      {
        $match: {
          ...matchBase,
          paymentStatus: 'completed',
        },
      },
      {
        $group: {
          _id: '$ticketType',
          ticketQuantity: { $sum: '$quantity' },
          grossRevenue: { $sum: '$total' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { grossRevenue: -1 } },
    ]),
    Event.findById(oid)
      .select('title category location organizer createdBy convenience totalRevenue ticketsSold')
      .populate('organizer', 'name')
      .lean(),
  ]);

  const completed = completedAgg[0] || {
    ticketQuantity: 0,
    grossRevenue: 0,
    successfulPayments: 0,
  };
  const refunded = refundedAgg[0] || { refundCount: 0, refundAmount: 0 };

  const conveniencePct = Number(eventDoc?.convenience?.percentage) || 0;
  const convenienceFixed = Number(eventDoc?.convenience?.fixedAmount) || 0;
  // Approximate convenience from config when per-booking fee breakdown is unavailable
  const estimatedConvenience =
    completed.grossRevenue * (conveniencePct / (100 + conveniencePct || 100)) +
    convenienceFixed * completed.successfulPayments;
  const netRevenue = Math.max(0, completed.grossRevenue - estimatedConvenience - refunded.refundAmount);

  const paidNoBooking = await PaymentTransaction.countDocuments({
    event: oid,
    status: 'paid_no_booking',
    ...dateRangeFilter('createdAt', startDate, endDate),
  }).catch(() => 0);

  return {
    source: 'database',
    available: true,
    event: eventDoc
      ? {
          _id: String(eventDoc._id),
          title: eventDoc.title,
          category: eventDoc.category,
          city: eventDoc.location?.city,
          organizer_id: eventDoc.organizer?._id
            ? String(eventDoc.organizer._id)
            : eventDoc.organizer
              ? String(eventDoc.organizer)
              : eventDoc.createdBy
                ? String(eventDoc.createdBy)
                : null,
          organizer_name:
            typeof eventDoc.organizer === 'object' ? eventDoc.organizer?.name : null,
        }
      : { _id: String(oid) },
    metrics: {
      ticketQuantity: completed.ticketQuantity,
      grossRevenue: completed.grossRevenue,
      netRevenue: Number(netRevenue.toFixed(2)),
      convenienceFees: Number(estimatedConvenience.toFixed(2)),
      successfulPayments: completed.successfulPayments,
      failedPayments: failedCount,
      paidNoBooking,
      refunds: refunded.refundCount,
      refundAmount: refunded.refundAmount,
      cancelledBookings: cancelledCount,
      qrScans: scanCount,
    },
    ticketTypes: ticketTypes.map((t) => ({
      ticketType: t._id || 'Unknown',
      ticketQuantity: t.ticketQuantity,
      grossRevenue: t.grossRevenue,
      bookings: t.bookings,
    })),
  };
}

async function getArtistDbMetrics(artistId, startDate, endDate) {
  const oid = toObjectId(artistId);
  if (!oid) {
    return { source: 'database', available: false, message: 'Invalid artist id' };
  }

  const createdFilter = dateRangeFilter('createdAt', startDate, endDate);
  const match = { artist: oid, ...createdFilter };

  const [artist, statusAgg, enquiryCount] = await Promise.all([
    Artist.findById(oid).select('name type city genres').lean(),
    ArtistBooking.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$booking.status',
          count: { $sum: 1 },
        },
      },
    ]),
    ArtistBooking.countDocuments(match),
  ]);

  const byStatus = Object.fromEntries(statusAgg.map((s) => [s._id || 'unknown', s.count]));

  return {
    source: 'database',
    available: true,
    artist: artist
      ? {
          _id: String(artist._id),
          name: artist.name,
          type: artist.type,
          city: artist.city,
          genres: Array.isArray(artist.genres) ? artist.genres.join(', ') : artist.genres,
        }
      : { _id: String(oid) },
    metrics: {
      artistEnquiries: enquiryCount,
      confirmedArtistBookings:
        (byStatus.confirmed || 0) + (byStatus.accepted || 0) + (byStatus.completed || 0),
      cancelledBookings: byStatus.cancelled || 0,
      pendingBookings: byStatus.pending || 0,
      declinedBookings: byStatus.declined || 0,
      statusBreakdown: byStatus,
    },
  };
}

async function getPlatformDbMetrics(startDate, endDate, organizerId = null) {
  const createdFilter = dateRangeFilter('createdAt', startDate, endDate);
  const eventMatch = {};
  if (organizerId) {
    const oid = toObjectId(organizerId);
    if (oid) {
      eventMatch.$or = [{ organizer: oid }, { createdBy: oid }, { 'organizerInfo.id': oid }];
    }
  }

  let eventIds = null;
  if (organizerId) {
    const events = await Event.find(eventMatch).select('_id').lean();
    eventIds = events.map((e) => e._id);
    if (!eventIds.length) {
      return {
        source: 'database',
        available: true,
        metrics: {
          ticketQuantity: 0,
          grossRevenue: 0,
          successfulPayments: 0,
          failedPayments: 0,
          refunds: 0,
          qrScans: 0,
          eventCount: 0,
        },
      };
    }
  }

  const bookingMatch = {
    ...createdFilter,
    ...(eventIds ? { event: { $in: eventIds } } : {}),
  };

  const [completedAgg, failedPayments, refunds, scans, eventCount] = await Promise.all([
    Booking.aggregate([
      { $match: { ...bookingMatch, paymentStatus: 'completed' } },
      {
        $group: {
          _id: null,
          ticketQuantity: { $sum: '$quantity' },
          grossRevenue: { $sum: '$total' },
          successfulPayments: { $sum: 1 },
        },
      },
    ]),
    Booking.countDocuments({ ...bookingMatch, paymentStatus: 'failed' }),
    Booking.countDocuments({
      ...bookingMatch,
      $or: [{ paymentStatus: 'refunded' }, { status: 'refunded' }],
    }),
    Scan.countDocuments({
      ...dateRangeFilter('timestamp', startDate, endDate),
      ...(eventIds ? { event: { $in: eventIds } } : {}),
    }),
    eventIds
      ? Promise.resolve(eventIds.length)
      : Event.countDocuments({ ...dateRangeFilter('createdAt', startDate, endDate) }),
  ]);

  const completed = completedAgg[0] || {
    ticketQuantity: 0,
    grossRevenue: 0,
    successfulPayments: 0,
  };

  return {
    source: 'database',
    available: true,
    metrics: {
      ticketQuantity: completed.ticketQuantity,
      grossRevenue: completed.grossRevenue,
      successfulPayments: completed.successfulPayments,
      failedPayments,
      refunds,
      qrScans: scans,
      eventCount,
    },
  };
}

async function listEventsForAnalytics({ organizerId = null, limit = 50 } = {}) {
  const query = {};
  if (organizerId) {
    const oid = toObjectId(organizerId);
    if (oid) {
      query.$or = [{ organizer: oid }, { createdBy: oid }, { 'organizerInfo.id': oid }];
    }
  }

  const events = await Event.find(query)
    .select('title category location startDate endDate organizer ticketsSold totalRevenue status')
    .populate('organizer', 'name')
    .sort({ startDate: -1 })
    .limit(limit)
    .lean();

  return events.map((e) => ({
    _id: String(e._id),
    title: e.title,
    category: e.category,
    city: e.location?.city,
    startDate: e.startDate,
    endDate: e.endDate,
    status: e.status,
    ticketsSold: e.ticketsSold || 0,
    totalRevenue: e.totalRevenue || 0,
    organizer_id: e.organizer?._id ? String(e.organizer._id) : null,
    organizer_name: e.organizer?.name || null,
  }));
}

async function listArtistsForAnalytics({ limit = 50 } = {}) {
  const artists = await Artist.find({})
    .select('name type city genres totalBookings rating status')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  return artists.map((a) => ({
    _id: String(a._id),
    name: a.name,
    type: a.type,
    city: a.city,
    genres: Array.isArray(a.genres) ? a.genres.join(', ') : a.genres,
    totalBookings: a.totalBookings || 0,
    rating: a.rating?.average || 0,
    status: a.status,
  }));
}

async function assertOrganizerOwnsEvent(organizerId, eventId) {
  const oid = toObjectId(organizerId);
  const eid = toObjectId(eventId);
  if (!oid || !eid) return false;
  const event = await Event.findOne({
    _id: eid,
    $or: [{ organizer: oid }, { createdBy: oid }, { 'organizerInfo.id': oid }],
  })
    .select('_id')
    .lean();
  return Boolean(event);
}

module.exports = {
  getEventDbMetrics,
  getArtistDbMetrics,
  getPlatformDbMetrics,
  listEventsForAnalytics,
  listArtistsForAnalytics,
  assertOrganizerOwnsEvent,
  toObjectId,
};
