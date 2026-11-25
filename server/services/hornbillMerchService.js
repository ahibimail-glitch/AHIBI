const axios = require('axios');

const DEFAULT_TIMEOUT = Number(process.env.HORNBILL_MERCH_TIMEOUT || 10000);

const hornbillMerchClient = axios.create({
  baseURL: process.env.HORNBILL_MERCH_API_BASE_URL,
  timeout: DEFAULT_TIMEOUT
});

hornbillMerchClient.interceptors.request.use((config) => {
  const apiKey = process.env.HORNBILL_MERCH_API_KEY;
  console.log("[HORNBILL API REQUEST]", {
    method: config.method,
    url: `${config.baseURL}${config.url}`,
    headers: config.headers,
  });

  if (!config.baseURL) {
    throw new Error('HORNBILL_MERCH_API_BASE_URL is not configured');
  }

  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }

  if (process.env.HORNBILL_MERCH_AUTH_TOKEN) {
    config.headers.Authorization = `Bearer ${process.env.HORNBILL_MERCH_AUTH_TOKEN}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for better error handling
hornbillMerchClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const fullUrl = `${error.config?.baseURL || ''}${error.config?.url || ''}`;

    console.error("[HORNBILL API ERROR]", {
      url: fullUrl,
      status: error.response?.status,
      message: error.response?.data || error.message,
      headers: error.config?.headers,
    });

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new Error(`Cannot connect to Hornbill API: ${error.message} at ${fullUrl}`);
    }

    if (error.response) {
      throw new Error(
        `Hornbill API error: ${error.response.status} - ${error.response.data?.message || error.message} | URL: ${fullUrl}`
      );
    }

    if (error.request) {
      throw new Error(`No response from Hornbill API | URL: ${fullUrl}`);
    }

    throw error;
  }
);


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
      image: item.image || item.thumbnail || item.thumbnail_url || ''
    };
  });

const fetchCartBySession = async (sessionId) => {
  if (!sessionId) {
    throw new Error('Hornbill sessionId is required');
  }

  if (!process.env.HORNBILL_MERCH_API_BASE_URL) {
    throw new Error('HORNBILL_MERCH_API_BASE_URL environment variable is not configured');
  }

  try {
    const endpoint = `api/merch/cart/session/${encodeURIComponent(sessionId)}`;
    const { data } = await hornbillMerchClient.get(endpoint);
  
    const payload = data?.data || data?.cart || data;

    if (!payload) {
      throw new Error('Hornbill cart payload is empty');
    }

    return {
      raw: payload,
      items: normalizeItems(payload.items || payload.cartItems || []),
      currency: payload.currency || 'INR',
      notes: payload.notes,
      sessionId: payload.sessionId || sessionId
    };
  } catch (error) {
    console.error('[HornbillMerchService] Error fetching cart:', {
      sessionId,
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    throw error;
  }
};

module.exports = {
  fetchCartBySession,
  normalizeItems
};

