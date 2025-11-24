const axios = require('axios');

const DEFAULT_TIMEOUT = Number(process.env.HORNBILL_MERCH_TIMEOUT || 10000);

const hornbillMerchClient = axios.create({
  baseURL: process.env.HORNBILL_MERCH_API_BASE_URL,
  timeout: DEFAULT_TIMEOUT
});

hornbillMerchClient.interceptors.request.use((config) => {
  const apiKey = process.env.HORNBILL_MERCH_API_KEY;
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
});

const normalizeItems = (items = []) =>
  items.map((item, index) => ({
    itemId: item.id || item.itemId || item.sku || `line-${index}`,
    name: item.name || item.title || 'Merch item',
    sku: item.sku || item.sku_code,
    variant: item.variant || item.option || item.size,
    quantity: Number(item.quantity) || 1,
    price: Number(item.price ?? item.unitPrice ?? item.amount ?? 0),
    taxRate: typeof item.taxRate === 'number'
      ? item.taxRate
      : typeof item.tax_rate === 'number'
        ? item.tax_rate
        : undefined,
    image: item.image || item.thumbnail || item.thumbnail_url
  }));

const fetchCartBySession = async (sessionId) => {
  if (!sessionId) {
    throw new Error('Hornbill sessionId is required');
  }

  const { data } = await hornbillMerchClient.get(`/api/merch/cart/session/${sessionId}`);
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
};

module.exports = {
  fetchCartBySession,
  normalizeItems
};

