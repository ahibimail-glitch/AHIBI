/**
 * Merch partner registry.
 *
 * AHIBI fetches a partner site's cart server-to-server and then runs the
 * Razorpay checkout on AHIBI's side. Each partner is identified by a `source`
 * string (also stored on MerchOrder.source) and configured purely via env vars
 * so no secrets live in code.
 *
 * Backward compatibility: when no source is supplied (or an unknown one),
 * resolvePartner() falls back to the original Hornbill config, which reads the
 * exact same env vars as before — so the existing Hornbill flow is unchanged.
 */

const DEFAULT_SOURCE = 'hornbill-merch';
const DEFAULT_CART_PATH = 'api/merch/cart/session';

const PARTNERS = {
  'hornbill-merch': {
    source: 'hornbill-merch',
    baseURL: process.env.HORNBILL_MERCH_API_BASE_URL,
    apiKey: process.env.HORNBILL_MERCH_API_KEY,
    authToken: process.env.HORNBILL_MERCH_AUTH_TOKEN,
    cartPath: process.env.HORNBILL_MERCH_CART_PATH || DEFAULT_CART_PATH,
    callbackUrl: process.env.HORNBILL_MERCH_PAYMENT_CALLBACK_URL,
    // AHIBI frontend return page used to build the default callback_url
    successPath: process.env.HORNBILL_MERCH_SUCCESS_PATH || '/HornbillFestival2026/merch/success',
    description: 'Hornbill merch checkout',
  },
  'nagaland-tourism': {
    source: 'nagaland-tourism',
    baseURL: process.env.TOURISM_MERCH_API_BASE_URL,
    apiKey: process.env.TOURISM_MERCH_API_KEY,
    authToken: process.env.TOURISM_MERCH_AUTH_TOKEN,
    cartPath: process.env.TOURISM_MERCH_CART_PATH || DEFAULT_CART_PATH,
    callbackUrl: process.env.TOURISM_MERCH_PAYMENT_CALLBACK_URL,
    successPath: process.env.TOURISM_MERCH_SUCCESS_PATH || '/tourism-merch-checkout/success',
    description: 'Nagaland Tourism — Hornbill merch checkout',
  },
};

/**
 * Resolve a partner config by source. Unknown/empty source -> Hornbill default,
 * preserving the pre-existing single-partner behaviour.
 */
function resolvePartner(source) {
  const key = source && PARTNERS[source] ? source : DEFAULT_SOURCE;
  return PARTNERS[key];
}

module.exports = { PARTNERS, resolvePartner, DEFAULT_SOURCE };
