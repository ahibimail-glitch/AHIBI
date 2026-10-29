const crypto = require('crypto');
const NuscPartnerRequest = require('../models/NuscPartnerRequest');
const { measureStage } = require('./nuscSeasonPassTiming');

function databaseName() {
  try {
    return decodeURIComponent(new URL(process.env.MONGO_URI).pathname.replace(/^\/+/, '')).split('/')[0];
  } catch {
    return '';
  }
}

function credentials() {
  const db = databaseName();
  const test = process.env.NODE_ENV !== 'production' &&
    process.env.NUSC_HOME_MATCH_TEST_MODE === 'true' && db === 'ahibi-test';
  const production = process.env.NODE_ENV === 'production' && db === 'ahibi';
  if (process.env.NUSC_PARTNER_API_ENABLED !== 'true' || (!test && !production)) return null;
  const keyId = test ? process.env.NUSC_PARTNER_TEST_KEY_ID : process.env.NUSC_PARTNER_LIVE_KEY_ID;
  const secret = test ? process.env.NUSC_PARTNER_TEST_SECRET : process.env.NUSC_PARTNER_LIVE_SECRET;
  return keyId && secret ? { keyId, secret } : null;
}

function safeEqualHex(left, right) {
  if (!/^[a-f0-9]{64}$/i.test(left || '') || !/^[a-f0-9]{64}$/i.test(right || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function signedMessage({ timestamp, requestId, method, path, rawBody }) {
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  return `${timestamp}\n${requestId}\n${method.toUpperCase()}\n${path}\n${bodyHash}`;
}

function authenticateNuscPartner(req, res, next) {
  return measureStage(req, 'partner_auth_audit', () => authenticateNuscPartnerRequest(req, res, next));
}

async function authenticateNuscPartnerRequest(req, res, next) {
  const config = credentials();
  if (!config) return res.status(503).json({ success: false, code: 'PARTNER_API_DISABLED' });

  const keyId = String(req.get('x-ahibi-key-id') || '');
  const timestamp = String(req.get('x-ahibi-timestamp') || '');
  const requestId = String(req.get('x-ahibi-request-id') || '');
  const signature = String(req.get('x-ahibi-signature') || '');
  if (keyId !== config.keyId || !/^\d{10}$/.test(timestamp) || !/^[A-Za-z0-9_-]{16,100}$/.test(requestId)) {
    return res.status(401).json({ success: false, code: 'INVALID_PARTNER_AUTH' });
  }
  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return res.status(401).json({ success: false, code: 'STALE_PARTNER_REQUEST' });
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const message = signedMessage({ timestamp, requestId, method: req.method, path: req.originalUrl, rawBody });
  const expected = crypto.createHmac('sha256', config.secret).update(message).digest('hex');
  if (!safeEqualHex(expected, signature)) return res.status(401).json({ success: false, code: 'INVALID_PARTNER_SIGNATURE' });

  try {
    await NuscPartnerRequest.init();
    await NuscPartnerRequest.create({ keyId, requestId });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, code: 'REQUEST_REPLAYED' });
    return next(error);
  }

  if (rawBody.length) {
    if (!req.is('application/json')) return res.status(415).json({ success: false, code: 'JSON_REQUIRED' });
    try {
      req.body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ success: false, code: 'INVALID_JSON' });
    }
  } else {
    req.body = {};
  }
  req.nuscPartnerId = 'nusc';
  return next();
}

module.exports = { authenticateNuscPartner, signedMessage };
