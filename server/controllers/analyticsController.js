const { googleAnalyticsService, isGa4Configured } = require('../services/googleAnalyticsService');
const {
  getEventDbMetrics,
  getArtistDbMetrics,
  getPlatformDbMetrics,
  listEventsForAnalytics,
  listArtistsForAnalytics,
  assertOrganizerOwnsEvent,
} = require('../services/platformAnalyticsService');

function parseDateParam(value, fallback) {
  if (!value) return fallback;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function previousPeriod(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1));
  return {
    startDate: prevStart.toISOString().slice(0, 10),
    endDate: prevEnd.toISOString().slice(0, 10),
  };
}

function getDates(req) {
  const defaults = defaultRange();
  const startDate = parseDateParam(req.query.startDate, defaults.startDate);
  const endDate = parseDateParam(req.query.endDate, defaults.endDate);
  const autoPrev = previousPeriod(startDate, endDate);
  const comparisonStartDate = parseDateParam(
    req.query.comparisonStartDate,
    autoPrev.startDate
  );
  const comparisonEndDate = parseDateParam(req.query.comparisonEndDate, autoPrev.endDate);
  return { startDate, endDate, comparisonStartDate, comparisonEndDate };
}

function roleOf(req) {
  return req.user?.role || req.admin?.role || null;
}

function userIdOf(req) {
  return String(req.user?.id || req.user?._id || req.admin?.id || req.admin?._id || '');
}

async function ensureEventAccess(req, eventId) {
  const role = roleOf(req);
  if (role === 'admin') return { ok: true };
  if (role === 'organizer') {
    const owns = await assertOrganizerOwnsEvent(userIdOf(req), eventId);
    if (!owns) return { ok: false, status: 403, message: 'You do not have access to this event' };
    return { ok: true };
  }
  return { ok: false, status: 403, message: 'Forbidden' };
}

async function ensureArtistAccess(req, artistId) {
  const role = roleOf(req);
  if (role === 'admin') return { ok: true };
  if (role === 'artist') {
    if (String(userIdOf(req)) !== String(artistId)) {
      return { ok: false, status: 403, message: 'You can only view your own artist analytics' };
    }
    return { ok: true };
  }
  return { ok: false, status: 403, message: 'Forbidden' };
}

function pctChange(current, previous) {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

exports.getOverview = async (req, res) => {
  try {
    if (roleOf(req) !== 'admin' && roleOf(req) !== 'organizer') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const dates = getDates(req);
    const organizerId = roleOf(req) === 'organizer' ? userIdOf(req) : null;

    const [gaCurrent, gaPrevious, dbCurrent, dbPrevious] = await Promise.all([
      organizerId
        ? Promise.resolve({
            available: false,
            code: 'GA4_SCOPED',
            message: 'Platform GA overview is admin-only. Use event analytics for owned events.',
          })
        : googleAnalyticsService.getOverview(dates.startDate, dates.endDate),
      organizerId
        ? Promise.resolve({ available: false })
        : googleAnalyticsService.getOverview(dates.comparisonStartDate, dates.comparisonEndDate),
      getPlatformDbMetrics(dates.startDate, dates.endDate, organizerId),
      getPlatformDbMetrics(dates.comparisonStartDate, dates.comparisonEndDate, organizerId),
    ]);

    const comparison = {};
    if (gaCurrent?.available && !gaCurrent.empty && gaPrevious?.available && !gaPrevious.empty) {
      Object.keys(gaCurrent.summary || {}).forEach((key) => {
        comparison[key] = pctChange(gaCurrent.summary?.[key], gaPrevious.summary?.[key]);
      });
    }

    const dbComparison = {};
    Object.keys(dbCurrent.metrics || {}).forEach((key) => {
      dbComparison[key] = pctChange(dbCurrent.metrics?.[key], dbPrevious.metrics?.[key]);
    });

    return res.json({
      success: true,
      configured: isGa4Configured(),
      dates,
      ga4: gaCurrent,
      ga4Previous: gaPrevious?.available ? gaPrevious : undefined,
      comparison: { ga4: comparison, database: dbComparison },
      database: dbCurrent,
      labels: {
        ga4: 'GA4 behavioural metrics',
        database: 'AHIBI database (source of truth for payments & tickets)',
      },
    });
  } catch (err) {
    console.error('[analytics] getOverview failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load analytics overview' });
  }
};

exports.getEventsList = async (req, res) => {
  try {
    const role = roleOf(req);
    if (role !== 'admin' && role !== 'organizer') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const organizerId = role === 'organizer' ? userIdOf(req) : null;
    const events = await listEventsForAnalytics({ organizerId, limit: Number(req.query.limit) || 50 });
    return res.json({ success: true, data: events });
  } catch (err) {
    console.error('[analytics] getEventsList failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to list events' });
  }
};

exports.getEventAnalytics = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const access = await ensureEventAccess(req, eventId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const dates = getDates(req);
    const include =
      String(req.query.include || 'ga4,database,traffic,devices,locations,funnel').split(',');

    const tasks = {
      ga4: include.includes('ga4')
        ? googleAnalyticsService.getEventAnalytics(eventId, dates.startDate, dates.endDate)
        : Promise.resolve(null),
      ga4Previous: include.includes('ga4')
        ? googleAnalyticsService.getEventAnalytics(
            eventId,
            dates.comparisonStartDate,
            dates.comparisonEndDate
          )
        : Promise.resolve(null),
      database: include.includes('database')
        ? getEventDbMetrics(eventId, dates.startDate, dates.endDate)
        : Promise.resolve(null),
      traffic: include.includes('traffic')
        ? googleAnalyticsService.getTrafficSources('event', eventId, dates.startDate, dates.endDate)
        : Promise.resolve(null),
      devices: include.includes('devices')
        ? googleAnalyticsService.getDeviceBreakdown('event', eventId, dates.startDate, dates.endDate)
        : Promise.resolve(null),
      locations: include.includes('locations')
        ? googleAnalyticsService.getLocationBreakdown(
            'event',
            eventId,
            dates.startDate,
            dates.endDate
          )
        : Promise.resolve(null),
      funnel: include.includes('funnel')
        ? googleAnalyticsService.getFunnel('event', eventId, dates.startDate, dates.endDate)
        : Promise.resolve(null),
    };

    const result = {};
    for (const [key, promise] of Object.entries(tasks)) {
      result[key] = await promise;
    }

    const comparison = {};
    if (result.ga4?.available && !result.ga4.empty && result.ga4Previous?.available && !result.ga4Previous.empty) {
      Object.keys(result.ga4.summary || {}).forEach((key) => {
        comparison[key] = pctChange(result.ga4.summary?.[key], result.ga4Previous.summary?.[key]);
      });
    }

    return res.json({
      success: true,
      configured: isGa4Configured(),
      dates,
      eventId,
      ...result,
      comparison,
      labels: {
        ga4: 'GA4 behavioural metrics',
        database: 'AHIBI database (source of truth for payments & tickets)',
      },
    });
  } catch (err) {
    console.error('[analytics] getEventAnalytics failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load event analytics' });
  }
};

exports.getArtistsList = async (req, res) => {
  try {
    if (roleOf(req) !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const artists = await listArtistsForAnalytics({ limit: Number(req.query.limit) || 50 });
    return res.json({ success: true, data: artists });
  } catch (err) {
    console.error('[analytics] getArtistsList failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to list artists' });
  }
};

exports.getArtistAnalytics = async (req, res) => {
  try {
    const artistId = req.params.artistId === 'me' ? userIdOf(req) : req.params.artistId;
    const access = await ensureArtistAccess(req, artistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const dates = getDates(req);
    const [ga4, ga4Previous, database, traffic, devices, locations] = await Promise.all([
      googleAnalyticsService.getArtistAnalytics(artistId, dates.startDate, dates.endDate),
      googleAnalyticsService.getArtistAnalytics(
        artistId,
        dates.comparisonStartDate,
        dates.comparisonEndDate
      ),
      getArtistDbMetrics(artistId, dates.startDate, dates.endDate),
      googleAnalyticsService.getTrafficSources('artist', artistId, dates.startDate, dates.endDate),
      googleAnalyticsService.getDeviceBreakdown('artist', artistId, dates.startDate, dates.endDate),
      googleAnalyticsService.getLocationBreakdown(
        'artist',
        artistId,
        dates.startDate,
        dates.endDate
      ),
    ]);

    return res.json({
      success: true,
      configured: isGa4Configured(),
      dates,
      artistId,
      ga4: ga4
        ? {
            ...ga4,
            trafficSources: traffic?.rows || [],
            devices: devices?.rows || [],
            visitorCities: locations?.rows || [],
          }
        : null,
      ga4Previous,
      database,
      labels: {
        ga4: 'GA4 behavioural metrics',
        database: 'AHIBI database (source of truth for bookings)',
      },
    });
  } catch (err) {
    console.error('[analytics] getArtistAnalytics failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load artist analytics' });
  }
};

exports.getRealtime = async (req, res) => {
  try {
    if (roleOf(req) !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const realtime = await googleAnalyticsService.getRealtimeOverview();
    return res.json({
      success: true,
      configured: realtime.configured ?? isGa4Configured(),
      available: realtime.available,
      processing: realtime.processing ?? false,
      activeUsers: realtime.activeUsers,
      eventCount: realtime.eventCount,
      recentEvents: realtime.recentEvents ?? [],
      errorCode: realtime.errorCode ?? null,
      message: realtime.message ?? null,
      realtime,
    });
  } catch (err) {
    console.error('[analytics] getRealtime failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load realtime analytics' });
  }
};
