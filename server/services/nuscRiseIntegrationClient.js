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
    const verifierErrors = {
      'Invalid signature': {
        code: 'NUSC_RISE_AUTH_REJECTED',
        message: 'NUSC RISE rejected the AHIBI signature. Verify AHIBI_PARTNER_SECRET matches the NUSC server setting.',
      },
      'Invalid signature length': {
        code: 'NUSC_RISE_AUTH_REJECTED',
        message: 'NUSC RISE rejected the AHIBI signature format.',
      },
      'Malformed signature': {
        code: 'NUSC_RISE_AUTH_REJECTED',
        message: 'NUSC RISE rejected the AHIBI signature format.',
      },
      'Missing security headers': {
        code: 'NUSC_RISE_AUTH_HEADERS_INVALID',
        message: 'NUSC RISE rejected the request security headers.',
      },
      'Request expired': {
        code: 'NUSC_RISE_REQUEST_EXPIRED',
        message: 'NUSC RISE rejected an expired request. Check service clock synchronization.',
      },
      'Integration is not configured': {
        code: 'NUSC_RISE_NOT_CONFIGURED',
        message: 'NUSC RISE integration is not configured on the NUSC server.',
      },
    };
    const verifierError = typeof result.error === 'string' ? verifierErrors[result.error] : null;
    throw new NuscRiseIntegrationError(
      status,
      String(result.code || verifierError?.code || 'NUSC_RISE_REQUEST_FAILED'),
      String(result.message || verifierError?.message || 'NUSC RISE could not complete the request.'),
    );
  }
  return result && result.success === true && Object.prototype.hasOwnProperty.call(result, 'data')
    ? result.data
    : result;
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

async function searchRiseRecoveryOrders(query) {
  const response = await postNuscRise('season-pass-recovery/search', { query });
  return response?.data && typeof response.data === 'object' ? response.data : response;
}

async function syncRiseRecoveryTickets(payload) {
  const response = await postNuscRise('season-pass-recovery/sync', payload, payload.requestId);
  return response?.data && typeof response.data === 'object' ? response.data : response;
}

module.exports = {
  NuscRiseIntegrationError,
  cancelRiseSeasonPass,
  getRiseSeasonPassStatus,
  postNuscRise,
  reserveRiseSeasonPass,
  searchRiseMembers,
  searchRiseRecoveryOrders,
  settleRiseSeasonPass,
  syncRiseRecoveryTickets,
};
