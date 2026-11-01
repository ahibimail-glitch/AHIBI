const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const riseClient = require('../services/nuscRiseIntegrationClient');

test('AHIBI signs RISE member verification and pass settlement calls to NUSC', async (t) => {
  const envKeys = [
    'NODE_ENV',
    'NUSC_HOME_MATCH_TEST_MODE',
    'NUSC_RISE_INTEGRATION_BASE_URL',
    'NUSC_RISE_INTEGRATION_KEY_ID',
    'AHIBI_PARTNER_SECRET',
  ];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = global.fetch;
  const testSecret = 'test-only-ahibi-partner-secret-'.padEnd(40, 'x');
  process.env.NODE_ENV = 'production';
  process.env.NUSC_HOME_MATCH_TEST_MODE = 'false';
  process.env.NUSC_RISE_INTEGRATION_BASE_URL = 'https://nusc.example.test';
  process.env.NUSC_RISE_INTEGRATION_KEY_ID = 'ahibi-admin-test';
  process.env.AHIBI_PARTNER_SECRET = testSecret;

  const requests = [];
  global.fetch = async (url, request) => {
    requests.push({ url: new URL(url), request });
    return {
      ok: true,
      status: 200,
      async json() { return { success: true, path: new URL(url).pathname }; },
    };
  };

  t.after(() => {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const memberResult = await riseClient.searchRiseMembers('RISE-1042');
  const reserveResult = await riseClient.reserveRiseSeasonPass({
    requestId: 'manual-pass-request-0001',
    memberNumber: 'RISE-1042',
    passId: 'general-season',
    zone: 'G-2',
  });
  const settlementResult = await riseClient.settleRiseSeasonPass({
    orderId: 'nusc-manual-order-1',
    settlementType: 'paid',
    modeOfPayment: 'UPI',
  });

  assert.deepEqual(memberResult, {
    success: true,
    path: '/api/integrations/ahibi/manual-season-passes/members/search',
  });
  assert.equal(reserveResult.path, '/api/integrations/ahibi/manual-season-passes/reserve');
  assert.equal(settlementResult.path, '/api/integrations/ahibi/manual-season-passes/settle');
  assert.equal(requests.length, 3);

  for (const { url, request } of requests) {
    const timestamp = request.headers['x-ahibi-timestamp'];
    const requestId = request.headers['x-ahibi-request-id'];
    const body = request.body;
    const expectedSignature = crypto.createHmac('sha256', testSecret)
      .update(timestamp + '.' + requestId + '.' + body)
      .digest('hex');
    assert.equal(url.protocol, 'https:');
    assert.equal(request.headers['x-ahibi-key-id'], 'ahibi-admin-test');
    assert.equal(request.headers['x-ahibi-signature'], expectedSignature);
  }

  assert.match(requests[0].request.headers['x-ahibi-request-id'], /^[0-9a-f-]{36}$/i);
  assert.match(requests[2].request.headers['x-ahibi-request-id'], /^[0-9a-f-]{36}$/i);
  assert.equal(requests[1].request.headers['x-ahibi-request-id'], 'manual-pass-request-0001');
  assert.deepEqual(JSON.parse(requests[0].request.body), { query: 'RISE-1042' });
  assert.deepEqual(JSON.parse(requests[1].request.body), {
    requestId: 'manual-pass-request-0001',
    memberNumber: 'RISE-1042',
    passId: 'general-season',
    zone: 'G-2',
  });
});
