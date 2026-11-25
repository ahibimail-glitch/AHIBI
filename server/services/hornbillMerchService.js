const axios = require('axios');
const { resolvePartner } = require('./merchPartners');

const DEFAULT_TIMEOUT = Number(process.env.HORNBILL_MERCH_TIMEOUT || 20000);

// Join base + path with exactly one slash (for accurate logs/errors).
const joinUrl = (base, path) =>
  `${String(base || '').replace(/\/+$/, '')}/${String(path || '').replace(/^\/+/, '')}`;

/**
 * Build a per-partner axios client. Previously this module held a single client
 * bound to the Hornbill env vars; it now builds the client from the resolved
 * partner config so multiple partner sites can be supported. Behaviour for the
 * Hornbill source is identical to before.
 */
const buildClient = (partner) => {
  const client = axios.create({
    baseURL: partner.baseURL,
    timeout: DEFAULT_TIMEOUT,
  });

  client.interceptors.request.use((config) => {
    console.log('[PARTNER MERCH API REQUEST]', {
      source: partner.source,
      method: config.method,
      url: joinUrl(config.baseURL, config.url),
    });

    if (!config.baseURL) {
      throw new Error(`Merch cart API base URL is not configured for source "${partner.source}"`);
    }

    if (partner.apiKey) {
      config.headers['x-api-key'] = partner.apiKey;
    }

    if (partner.authToken) {
      config.headers.Authorization = `Bearer ${partner.authToken}`;
    }

    return config;
  }, (error) => Promise.reject(error));

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const fullUrl = joinUrl(error.config?.baseURL, error.config?.url);

      console.error('[PARTNER MERCH API ERROR]', {
        source: partner.source,
        url: fullUrl,
        status: error.response?.status,
        message: error.response?.data || error.message,
      });

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error(`Cannot connect to merch API: ${error.message} at ${fullUrl}`);
      }

      if (error.response) {
        throw new Error(
          `Merch API error: ${error.response.status} - ${error.response.data?.message || error.message} | URL: ${fullUrl}`
        );
      }

      if (error.request) {
        throw new Error(`No response from merch API | URL: ${fullUrl}`);
      }

      throw error;
    }
  );

  return client;
};

const normalizeItems = (items = []) =>
  items.map((item, index) => {
    const variantParts = [
      item.design,
      item.colour,
      item.size ? `Size: ${item.size}` : '',
      item.packOption
    ].filter(Boolean);
    const variant =
      item.variant ||
      (variantParts.length > 0 ? variantParts.join(' · ') : (item.option || item.size || ''));

    return {
      itemId: item.id || item.itemId || item.productId || item.sku || `line-${index}`,
      name: item.name || item.title || 'Hornbill Merch Item',
      sku: item.sku || item.sku_code || item.productCode || '',
      variant: variant || undefined,
      quantity: Number(item.quantity) || 1,
      price: Number(item.price ?? item.unitPrice ?? item.amount ?? 0),
      taxRate: typeof item.taxRate === 'number'
        ? item.taxRate
        : typeof item.tax_rate === 'number'
          ? item.tax_rate
          : undefined,
      image: item.image || item.thumbnail || item.thumbnail_url || '',
      hsn: item.hsn || item.hsn_code || item.hsnCode || '',
      gstRate: typeof item.gstRate === 'number'
        ? item.gstRate
        : typeof item.gst_rate === 'number'
          ? item.gst_rate
          : undefined,
    };
  });

/**
 * Fetch a cart for a given sessionId from the partner identified by `source`.
 * When source is omitted it resolves to the Hornbill partner, matching the
 * original single-partner behaviour.
 */
const fetchCartBySession = async (sessionId, source) => {
  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  const partner = resolvePartner(source);

  if (!partner.baseURL) {
    throw new Error(`Merch cart API base URL is not configured for source "${partner.source}"`);
  }

  const client = buildClient(partner);
  const endpoint = `${partner.cartPath}/${encodeURIComponent(sessionId)}`;

  try {
    let data;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        ({ data } = await client.get(endpoint));
        break;
      } catch (err) {
        // Retry only transient failures (no response / timeout), not real HTTP errors.
        const transient = !err.response &&
          (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || !!err.request);
        if (attempt < 2 && transient) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        throw err;
      }
    }
    const payload = data?.data || data?.cart || data;

    if (!payload) {
      throw new Error('Merch cart payload is empty');
    }

    return {
      raw: payload,
      items: normalizeItems(payload.items || payload.cartItems || []),
      currency: payload.currency || 'INR',
      notes: payload.notes,
      sessionId: payload.sessionId || sessionId,
      source: partner.source,
    };
  } catch (error) {
    console.error('[MerchPartnerService] Error fetching cart:', {
      source: partner.source,
      sessionId,
      message: error.message,
      code: error.code,
      response: error.response?.data,
    });
    throw error;
  }
};

module.exports = {
  fetchCartBySession,
  normalizeItems,
};
