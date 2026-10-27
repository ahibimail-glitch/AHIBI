const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { authenticateNuscPartner, signedMessage } = require('../middlewares/nuscPartnerAuth');

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

function setTestPartnerEnvironment() {
  process.env.NODE_ENV = 'test';
  process.env.NUSC_HOME_MATCH_TEST_MODE = 'true';
  process.env.NUSC_PARTNER_API_ENABLED = 'true';
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/ahibi-test';
  process.env.NUSC_PARTNER_TEST_KEY_ID = 'test-key-id';
  process.env.NUSC_PARTNER_TEST_SECRET = 'test-only-secret';
}

test('partner signature canonical message binds method, path, and exact body bytes', () => {
  const input = {
    timestamp: '1792900000',
    requestId: 'request-id-12345678',
    method: 'post',
    path: '/api/nusc-partner/v1/season-pass/reservations',
    rawBody: Buffer.from('{"passId":"general-season"}'),
  };
  const base = signedMessage(input);
  assert.equal(base.split('\n')[2], 'POST');
  assert.notEqual(base, signedMessage({ ...input, path: `${input.path}?x=1` }));
  assert.notEqual(base, signedMessage({ ...input, rawBody: Buffer.from('{"passId":"premium-season"}') }));
  assert.equal(base.split('\n').length, 5);
});

test('bad partner signature is rejected before nonce storage or route execution', async () => {
  setTestPartnerEnvironment();
  const req = {
    method: 'POST',
    originalUrl: '/api/nusc-partner/v1/season-pass/reservations',
    body: Buffer.from('{}'),
    get(name) {
      return {
        'x-ahibi-key-id': 'test-key-id',
        'x-ahibi-timestamp': String(Math.floor(Date.now() / 1000)),
        'x-ahibi-request-id': 'request-id-12345678',
        'x-ahibi-signature': '0'.repeat(64),
      }[name.toLowerCase()];
    },
    is() { return 'application/json'; },
  };
  const res = makeResponse();
  let nextCalled = false;
  await authenticateNuscPartner(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'INVALID_PARTNER_SIGNATURE');
  assert.equal(nextCalled, false);
});

test('a request outside the five-minute window is rejected', async () => {
  setTestPartnerEnvironment();
  const timestamp = String(Math.floor(Date.now() / 1000) - 301);
  const req = {
    method: 'GET',
    originalUrl: '/api/nusc-partner/v1/catalog/season-passes',
    body: Buffer.alloc(0),
    get(name) {
      return {
        'x-ahibi-key-id': 'test-key-id',
        'x-ahibi-timestamp': timestamp,
        'x-ahibi-request-id': 'request-id-12345678',
        'x-ahibi-signature': '0'.repeat(64),
      }[name.toLowerCase()];
    },
  };
  const res = makeResponse();
  let nextCalled = false;
  await authenticateNuscPartner(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'STALE_PARTNER_REQUEST');
  assert.equal(nextCalled, false);
});

test('production configuration does not accept the test partner key ID', async () => {
  setTestPartnerEnvironment();
  process.env.NODE_ENV = 'production';
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/ahibi';
  process.env.NUSC_PARTNER_LIVE_KEY_ID = 'live-key-id';
  process.env.NUSC_PARTNER_LIVE_SECRET = 'live-only-secret';
  const req = {
    method: 'GET',
    originalUrl: '/api/nusc-partner/v1/catalog/season-passes',
    body: Buffer.alloc(0),
    get(name) {
      return {
        'x-ahibi-key-id': 'test-key-id',
        'x-ahibi-timestamp': String(Math.floor(Date.now() / 1000)),
        'x-ahibi-request-id': 'request-id-12345678',
        'x-ahibi-signature': '0'.repeat(64),
      }[name.toLowerCase()];
    },
  };
  const res = makeResponse();
  let nextCalled = false;
  await authenticateNuscPartner(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'INVALID_PARTNER_AUTH');
  assert.equal(nextCalled, false);
});

test('the documented HMAC algorithm matches the canonical payload hash', () => {
  const secret = 'test-only-secret';
  const input = {
    timestamp: '1792900000',
    requestId: 'request-id-12345678',
    method: 'POST',
    path: '/api/nusc-partner/v1/season-pass/reservations',
    rawBody: Buffer.from('{"passId":"general-season"}'),
  };
  const expected = crypto.createHmac('sha256', secret).update(signedMessage(input)).digest('hex');
  assert.match(expected, /^[a-f0-9]{64}$/);
});
