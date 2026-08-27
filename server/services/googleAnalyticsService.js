const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const cache = require('../utils/analyticsCache');

const STANDARD_TTL_MS = 15 * 60 * 1000;
const REALTIME_TTL_MS = 60 * 1000;

const DIMENSION = {
  eventId: 'customEvent:event_id',
  eventName: 'customEvent:event_name',
  eventCategory: 'customEvent:event_category',
  eventCity: 'customEvent:event_city',
  organizerId: 'customEvent:organizer_id',
  organizerName: 'customEvent:organizer_name',
  ticketType: 'customEvent:ticket_type',
  artistId: 'customEvent:artist_id',
  artistName: 'customEvent:artist_name',
  artistType: 'customEvent:artist_type',
  artistCity: 'customEvent:artist_city',
};

function getPropertyId() {
  const id = String(process.env.GA4_PROPERTY_ID || '').trim();
  if (!id) {
    const err = new Error('GA4_PROPERTY_ID is not set');
    err.code = 'GA4_PROPERTY_ID_MISSING';
    throw err;
  }
  return id;
}

function hasPropertyId() {
  return Boolean(String(process.env.GA4_PROPERTY_ID || '').trim());
}

function buildCredentials() {
  if (process.env.GA4_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON);
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    } catch (err) {
      console.error('[GA4] Failed to parse GA4_SERVICE_ACCOUNT_JSON');
      throw new Error('Invalid GA4_SERVICE_ACCOUNT_JSON');
    }
  }

  const clientEmail = process.env.GA4_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.GA4_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '').replace(
    /\\n/g,
    '\n'
  );

  if (clientEmail && privateKey) {
    return {
      client_email: clientEmail,
      private_key: privateKey,
    };
  }

  return null;
}

function isConfigured() {
  return Boolean(
    hasPropertyId() && (buildCredentials() || process.env.GOOGLE_APPLICATION_CREDENTIALS)
  );
}

class GoogleAnalyticsService {
  constructor() {
    this.client = null;
    this.initError = null;
  }

  getClient() {
    if (this.client) return this.client;
    if (!hasPropertyId()) {
      const err = new Error('GA4_PROPERTY_ID is not set');
      err.code = 'GA4_PROPERTY_ID_MISSING';
      throw err;
    }
    if (!isConfigured()) {
      const err = new Error('GA4 credentials are not configured');
      err.code = 'GA4_NOT_CONFIGURED';
      throw err;
    }

    try {
      const credentials = buildCredentials();
      this.client = credentials
        ? new BetaAnalyticsDataClient({ credentials })
        : new BetaAnalyticsDataClient();
      return this.client;
    } catch (err) {
      this.initError = err;
      console.error('[GA4] Client init failed:', err.message);
      const e = new Error('GA4 authentication failed');
      e.code = 'GA4_AUTH_FAILED';
      throw e;
    }
  }

  property() {
    return `properties/${getPropertyId()}`;
  }

  async cached(key, ttlMs, fn) {
    const hit = cache.get(key);
    if (hit) {
      return { ...hit, cached: true };
    }
    const value = await fn();
    const payload = { ...value, cached: false };
    cache.set(key, payload, ttlMs);
    return payload;
  }

  async runReportSafe(request) {
    try {
      const client = this.getClient();
      const [response] = await client.runReport({
        property: this.property(),
        ...request,
      });
      return { ok: true, response };
    } catch (err) {
      return this.mapGaError(err);
    }
  }

  async runRealtimeSafe(request) {
    try {
      const client = this.getClient();
      const [response] = await client.runRealtimeReport({
        property: this.property(),
        ...request,
      });
      return { ok: true, response };
    } catch (err) {
      return this.mapGaError(err);
    }
  }

  async batchRunReportsSafe(requests) {
    try {
      const client = this.getClient();
      const [response] = await client.batchRunReports({
        property: this.property(),
        requests,
      });
      return { ok: true, reports: response.reports || [] };
    } catch (err) {
      return this.mapGaError(err);
    }
  }

  mapGaError(err) {
    const message = err?.message || 'GA4 request failed';
    const status = err?.code || err?.status;
    console.error('[GA4] API error:', message);

    if (/UNAUTHENTICATED|invalid_grant|credentials/i.test(message) || status === 16) {
      return { ok: false, code: 'GA4_AUTH_FAILED', message: 'GA4 authentication failed' };
    }
    if (/RESOURCE_EXHAUSTED|quota|429/i.test(message) || status === 8 || status === 429) {
      return { ok: false, code: 'GA4_QUOTA', message: 'GA4 quota exceeded. Please retry later.' };
    }
    if (err?.code === 'GA4_PROPERTY_ID_MISSING') {
      return { ok: false, code: 'GA4_PROPERTY_ID_MISSING', message: 'GA4_PROPERTY_ID is not set' };
    }
    if (/NOT_FOUND|property/i.test(message)) {
      return { ok: false, code: 'GA4_NOT_FOUND', message: 'GA4 property not found or inaccessible' };
    }
    return { ok: false, code: 'GA4_ERROR', message: 'Analytics data is still processing' };
  }

  dimensionFilterEquals(dimensionName, value) {
    return {
      filter: {
        fieldName: dimensionName,
        stringFilter: {
          matchType: 'EXACT',
          value: String(value),
        },
      },
    };
  }

  parseRows(response, dimensionKeys = [], metricKeys = []) {
    const rows = response?.rows || [];
    return rows.map((row) => {
      const item = {};
      (row.dimensionValues || []).forEach((d, i) => {
        item[dimensionKeys[i] || `dim_${i}`] = d.value;
      });
      (row.metricValues || []).forEach((m, i) => {
        const key = metricKeys[i] || `metric_${i}`;
        const num = Number(m.value);
        item[key] = Number.isFinite(num) ? num : m.value;
      });
      return item;
    });
  }

  metricTotals(response, metricKeys = []) {
    const totals = {};
    metricKeys.forEach((key) => {
      totals[key] = null;
    });

    const totalRow = response?.totals?.[0] || response?.rows?.[0];
    if (!totalRow?.metricValues) {
      if (!response?.rows?.length) return { empty: true, totals };
      // Sum rows when totals absent
      const summed = {};
      metricKeys.forEach((k) => {
        summed[k] = 0;
      });
      const rows = this.parseRows(response, [], metricKeys);
      rows.forEach((r) => {
        metricKeys.forEach((k) => {
          summed[k] += Number(r[k]) || 0;
        });
      });
      return { empty: false, totals: summed };
    }

    (totalRow.metricValues || []).forEach((m, i) => {
      const key = metricKeys[i];
      if (!key) return;
      const num = Number(m.value);
      totals[key] = Number.isFinite(num) ? num : null;
    });
    return { empty: false, totals };
  }

  async getOverview(startDate, endDate) {
    const cacheKey = `overview:${startDate}:${endDate}`;
    return this.cached(cacheKey, STANDARD_TTL_MS, async () => {
      const metrics = [
        'activeUsers',
        'totalUsers',
        'sessions',
        'engagedSessions',
        'eventCount',
        'screenPageViews',
        'ecommercePurchases',
        'itemsPurchased',
        'purchaseRevenue',
        'keyEvents',
      ];

      const batch = await this.batchRunReportsSafe([
        {
          dateRanges: [{ startDate, endDate }],
          metrics: metrics.map((name) => ({ name })),
          metricAggregations: ['TOTAL'],
        },
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'eventCount' },
            { name: 'purchaseRevenue' },
            { name: 'ecommercePurchases' },
          ],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        },
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
          limit: 25,
        },
      ]);

      if (!batch.ok) {
        return { available: false, code: batch.code, message: batch.message, source: 'ga4' };
      }

      const [summaryRes, trendRes, eventsRes] = batch.reports;
      const summary = this.metricTotals(summaryRes, metrics);
      if (summary.empty) {
        return {
          available: true,
          empty: true,
          message: 'Analytics data is still processing',
          source: 'ga4',
          summary: null,
          dailyTrend: [],
          topEvents: [],
        };
      }

      return {
        available: true,
        empty: false,
        source: 'ga4',
        summary: summary.totals,
        dailyTrend: this.parseRows(trendRes, ['date'], [
          'activeUsers',
          'sessions',
          'eventCount',
          'purchaseRevenue',
          'ecommercePurchases',
        ]),
        topEvents: this.parseRows(eventsRes, ['eventName'], ['eventCount', 'activeUsers']),
      };
    });
  }

  async getEventAnalytics(eventId, startDate, endDate) {
    const cacheKey = `event:${eventId}:${startDate}:${endDate}`;
    return this.cached(cacheKey, STANDARD_TTL_MS, async () => {
      const filter = this.dimensionFilterEquals(DIMENSION.eventId, eventId);
      const summaryMetrics = [
        'activeUsers',
        'totalUsers',
        'sessions',
        'engagedSessions',
        'eventCount',
        'screenPageViews',
        'ecommercePurchases',
        'itemsPurchased',
        'purchaseRevenue',
        'keyEvents',
      ];

      const batch = await this.batchRunReportsSafe([
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: DIMENSION.eventId }, { name: DIMENSION.eventName }],
          metrics: summaryMetrics.map((name) => ({ name })),
          dimensionFilter: filter,
          metricAggregations: ['TOTAL'],
        },
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'eventCount' },
            { name: 'ecommercePurchases' },
            { name: 'purchaseRevenue' },
          ],
          dimensionFilter: filter,
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        },
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: filter,
          orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
          limit: 30,
        },
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: DIMENSION.ticketType }],
          metrics: [
            { name: 'eventCount' },
            { name: 'itemsPurchased' },
            { name: 'purchaseRevenue' },
          ],
          dimensionFilter: filter,
          orderBys: [{ metric: { metricName: 'purchaseRevenue' }, desc: true }],
          limit: 20,
        },
      ]);

      if (!batch.ok) {
        return { available: false, code: batch.code, message: batch.message, source: 'ga4' };
      }

      const [summaryRes, trendRes, funnelRes, ticketsRes] = batch.reports;
      const summary = this.metricTotals(summaryRes, summaryMetrics);
      const metaRow = this.parseRows(
        summaryRes,
        ['event_id', 'event_name'],
        summaryMetrics
      )[0];

      if (summary.empty) {
        return {
          available: true,
          empty: true,
          message: 'Analytics data is still processing',
          source: 'ga4',
          eventId,
        };
      }

      const funnelRows = this.parseRows(funnelRes, ['eventName'], ['eventCount']);
      const funnelMap = Object.fromEntries(funnelRows.map((r) => [r.eventName, r.eventCount]));

      return {
        available: true,
        empty: false,
        source: 'ga4',
        eventId,
        eventName: metaRow?.event_name || null,
        summary: summary.totals,
        dailyTrend: this.parseRows(trendRes, ['date'], [
          'activeUsers',
          'sessions',
          'eventCount',
          'ecommercePurchases',
          'purchaseRevenue',
        ]),
        funnel: {
          views: funnelMap.view_item || funnelMap.event_view || 0,
          bookingStarts: funnelMap.booking_started || 0,
          addToCart: funnelMap.add_to_cart || 0,
          beginCheckout: funnelMap.begin_checkout || 0,
          purchases: funnelMap.purchase || summary.totals.ecommercePurchases || 0,
          paymentFailed: funnelMap.payment_failed || 0,
        },
        ticketTypes: this.parseRows(ticketsRes, ['ticket_type'], [
          'eventCount',
          'itemsPurchased',
          'purchaseRevenue',
        ]),
      };
    });
  }

  async getArtistAnalytics(artistId, startDate, endDate) {
    const cacheKey = `artist:${artistId}:${startDate}:${endDate}`;
    return this.cached(cacheKey, STANDARD_TTL_MS, async () => {
      const filter = this.dimensionFilterEquals(DIMENSION.artistId, artistId);

      const batch = await this.batchRunReportsSafe([
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }],
          dimensionFilter: filter,
          orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
          limit: 40,
        },
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }],
          dimensionFilter: filter,
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        },
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: DIMENSION.artistId },
            { name: DIMENSION.artistName },
            { name: DIMENSION.artistType },
            { name: DIMENSION.artistCity },
          ],
          metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }],
          dimensionFilter: filter,
          limit: 5,
        },
      ]);

      if (!batch.ok) {
        return { available: false, code: batch.code, message: batch.message, source: 'ga4' };
      }

      const [eventsRes, trendRes, metaRes] = batch.reports;
      const eventRows = this.parseRows(eventsRes, ['eventName'], ['eventCount', 'activeUsers']);
      if (!eventRows.length) {
        return {
          available: true,
          empty: true,
          message: 'Analytics data is still processing',
          source: 'ga4',
          artistId,
        };
      }

      const byName = Object.fromEntries(eventRows.map((r) => [r.eventName, r.eventCount || 0]));
      const profileViews = byName.artist_profile_view || 0;
      const bookingStarts = byName.artist_booking_started || 0;
      const leads = byName.generate_lead || 0;
      const leadConversionRate =
        bookingStarts > 0 ? Number(((leads / bookingStarts) * 100).toFixed(2)) : null;

      const meta = this.parseRows(
        metaRes,
        ['artist_id', 'artist_name', 'artist_type', 'artist_city'],
        ['eventCount', 'activeUsers']
      )[0];

      return {
        available: true,
        empty: false,
        source: 'ga4',
        artistId,
        artistName: meta?.artist_name || null,
        artistType: meta?.artist_type || null,
        artistCity: meta?.artist_city || null,
        profileViews,
        bookingStarts,
        leads,
        leadConversionRate,
        socialClicks: byName.artist_social_click || 0,
        contactClicks: byName.artist_contact_click || 0,
        mediaViews: byName.artist_media_view || 0,
        downloads: byName.file_download || 0,
        shares: byName.share || 0,
        selectContent: byName.select_content || 0,
        eventBreakdown: eventRows,
        dailyTrend: this.parseRows(trendRes, ['date'], ['eventCount', 'activeUsers']),
      };
    });
  }

  async getTrafficSources(entityType, entityId, startDate, endDate) {
    const cacheKey = `traffic:${entityType}:${entityId || 'all'}:${startDate}:${endDate}`;
    return this.cached(cacheKey, STANDARD_TTL_MS, async () => {
      const dimensionFilter = this.entityFilter(entityType, entityId);
      const result = await this.runReportSafe({
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'sessionSourceMedium' },
          { name: 'sessionCampaignName' },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'engagedSessions' },
          { name: 'ecommercePurchases' },
        ],
        dimensionFilter,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 25,
      });

      if (!result.ok) {
        return { available: false, code: result.code, message: result.message, source: 'ga4' };
      }

      const rows = this.parseRows(
        result.response,
        ['sessionSourceMedium', 'sessionCampaignName'],
        ['sessions', 'activeUsers', 'engagedSessions', 'ecommercePurchases']
      );

      return {
        available: true,
        empty: !rows.length,
        message: rows.length ? undefined : 'Analytics data is still processing',
        source: 'ga4',
        rows,
      };
    });
  }

  async getDeviceBreakdown(entityType, entityId, startDate, endDate) {
    const cacheKey = `device:${entityType}:${entityId || 'all'}:${startDate}:${endDate}`;
    return this.cached(cacheKey, STANDARD_TTL_MS, async () => {
      const dimensionFilter = this.entityFilter(entityType, entityId);
      const result = await this.runReportSafe({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'ecommercePurchases' },
        ],
        dimensionFilter,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      });

      if (!result.ok) {
        return { available: false, code: result.code, message: result.message, source: 'ga4' };
      }

      const rows = this.parseRows(result.response, ['deviceCategory'], [
        'sessions',
        'activeUsers',
        'ecommercePurchases',
      ]);

      return {
        available: true,
        empty: !rows.length,
        message: rows.length ? undefined : 'Analytics data is still processing',
        source: 'ga4',
        rows,
      };
    });
  }

  async getLocationBreakdown(entityType, entityId, startDate, endDate) {
    const cacheKey = `location:${entityType}:${entityId || 'all'}:${startDate}:${endDate}`;
    return this.cached(cacheKey, STANDARD_TTL_MS, async () => {
      const dimensionFilter = this.entityFilter(entityType, entityId);
      const result = await this.runReportSafe({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'city' }, { name: 'country' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'ecommercePurchases' },
        ],
        dimensionFilter,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 40,
      });

      if (!result.ok) {
        return { available: false, code: result.code, message: result.message, source: 'ga4' };
      }

      const rows = this.parseRows(result.response, ['city', 'country'], [
        'sessions',
        'activeUsers',
        'ecommercePurchases',
      ]);

      return {
        available: true,
        empty: !rows.length,
        message: rows.length ? undefined : 'Analytics data is still processing',
        source: 'ga4',
        rows,
      };
    });
  }

  async getFunnel(entityType, entityId, startDate, endDate) {
    if (entityType === 'event' && entityId) {
      const event = await this.getEventAnalytics(entityId, startDate, endDate);
      return {
        available: event.available,
        empty: event.empty,
        code: event.code,
        message: event.message,
        source: 'ga4',
        funnel: event.funnel || null,
      };
    }

    if (entityType === 'artist' && entityId) {
      const artist = await this.getArtistAnalytics(entityId, startDate, endDate);
      return {
        available: artist.available,
        empty: artist.empty,
        code: artist.code,
        message: artist.message,
        source: 'ga4',
        funnel: artist.available && !artist.empty
          ? {
              profileViews: artist.profileViews,
              bookingStarts: artist.bookingStarts,
              leads: artist.leads,
              leadConversionRate: artist.leadConversionRate,
            }
          : null,
      };
    }

    const overview = await this.getOverview(startDate, endDate);
    return {
      available: overview.available,
      empty: overview.empty,
      code: overview.code,
      message: overview.message,
      source: 'ga4',
      funnel: overview.topEvents || [],
    };
  }

  async getRealtimeOverview() {
    const cacheKey = 'realtime:overview';
    return this.cached(cacheKey, REALTIME_TTL_MS, async () => {
      const result = await this.runRealtimeSafe({
        metrics: [{ name: 'activeUsers' }, { name: 'eventCount' }],
        dimensions: [{ name: 'eventName' }],
        minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 20,
      });

      if (!result.ok) {
        return { available: false, code: result.code, message: result.message, source: 'ga4_realtime' };
      }

      const rows = this.parseRows(result.response, ['eventName'], ['activeUsers', 'eventCount']);
      const totals = this.metricTotals(result.response, ['activeUsers', 'eventCount']);

      return {
        available: true,
        empty: !rows.length && totals.empty,
        message: rows.length ? undefined : 'Analytics data is still processing',
        source: 'ga4_realtime',
        windowMinutes: 30,
        summary: totals.empty ? null : totals.totals,
        topEvents: rows,
      };
    });
  }

  entityFilter(entityType, entityId) {
    if (!entityId) return undefined;
    if (entityType === 'event') return this.dimensionFilterEquals(DIMENSION.eventId, entityId);
    if (entityType === 'artist') return this.dimensionFilterEquals(DIMENSION.artistId, entityId);
    return undefined;
  }
}

module.exports = {
  GoogleAnalyticsService,
  googleAnalyticsService: new GoogleAnalyticsService(),
  isGa4Configured: isConfigured,
  DIMENSION,
  STANDARD_TTL_MS,
  REALTIME_TTL_MS,
};
