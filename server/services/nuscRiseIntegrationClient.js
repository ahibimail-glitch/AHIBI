const crypto = require('crypto');

class NuscRiseIntegrationError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'NuscRiseIntegrationError';
    this.status = status;
    this.code = code;
  }
}

function integrationBaseUrl() {
  const raw = String(process.env.NUSC_RISE_INTEGRATION_BASE_URL || '').trim();
  if (!raw) throw new NuscRiseIntegrationError(503, 'NUSC_RISE_NOT_CONFIGURED', 'NUSC RISE member services are not configured.');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new NuscRiseIntegrationError(503, 'NUSC_RISE_NOT_CONFIGURED', 'NUSC RISE member services are not configured.');
  }
  const localTest = process.env.NODE_ENV !== 'production' && process.env.NUSC_HOME_MATCH_TEST_MODE === 'true';
  if (url.protocol !== 'https:' && !(localTest && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new NuscRiseIntegrationError(503, 'NUSC_RISE_URL_INVALID', 'NUSC RISE service URL must use HTTPS.');
  }
  return url.toString().replace(/\/$/, '');
}

function makeRequestId() {
  return crypto.randomUUID();
}

async function postNuscRise(path, payload, requestId = makeRequestId()) {
  const baseUrl = integrationBaseUrl();
  const secret = String(process.env.AHIBI_PARTNER_SECRET || '');
  if (secret.length < 32) {
    throw new NuscRiseIntegrationError(503, 'NUSC_RISE_NOT_CONFIGURED', 'NUSC RISE member services are not configured.');
  }
  const keyId = String(process.env.NUSC_RISE_INTEGRATION_KEY_ID || 'ahibi-admin').trim();
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(keyId)) {
    throw new NuscRiseIntegrationError(503, 'NUSC_RISE_NOT_CONFIGURED', 'NUSC RISE member services are not configured.');
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify(payload || {});
  const signature = crypto.createHmac('sha256', secret)
    .update(`${timestamp}.${requestId}.${rawBody}`)
    .digest('hex');
  const url = `${baseUrl}/api/integrations/ahibi/${path.replace(/^\//, '')}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ahibi-key-id': keyId,
        'x-ahibi-timestamp': timestamp,
        'x-ahibi-request-id': requestId,
        'x-ahibi-signature': signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new NuscRiseIntegrationError(502, 'NUSC_RISE_UNAVAILABLE', 'NUSC RISE could not complete the request. Check order status before retrying.');
  }

  let result = {};
  try { result = await response.json(); } catch { /* mapped below */ }
  if (!response.ok) {
    const status = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw new NuscRiseIntegrationError(
      status,
      String(result.code || 'NUSC_RISE_REQUEST_FAILED'),
      String(result.message || 'NUSC RISE could not complete the request.'),
    );
  }
  return result;
}

async function searchRiseMembers(query) {
  return postNuscRise('manual-season-passes/members/search', { query });
}

async function reserveRiseSeasonPass(payload) {
  return postNuscRise('manual-season-passes/reserve', payload, payload.requestId);
}

async function settleRiseSeasonPass(payload) {
  return postNuscRise('manual-season-passes/settle', payload);
}

async function cancelRiseSeasonPass(payload) {
  return postNuscRise('manual-season-passes/cancel', payload);
}

async function getRiseSeasonPassStatus(payload) {
  return postNuscRise('manual-season-passes/status', payload);
}

module.exports = {
  NuscRiseIntegrationError,
  cancelRiseSeasonPass,
  getRiseSeasonPassStatus,
  postNuscRise,
  reserveRiseSeasonPass,
  searchRiseMembers,
  settleRiseSeasonPass,
};
