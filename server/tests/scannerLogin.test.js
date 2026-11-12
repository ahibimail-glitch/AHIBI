const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ScannerStaff = require('../models/ScannerStaff');
const controller = require('../controllers/scannerAuthController');

process.env.JWT_SECRET = 'scanner-login-test-secret';

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('scanner login signs a scanner-scoped token only for an active matching account', async (t) => {
  const originalFindOne = ScannerStaff.findOne;
  t.after(() => { ScannerStaff.findOne = originalFindOne; });

  const password = 'a-long-scanner-test-password';
  const staff = {
    _id: new mongoose.Types.ObjectId(),
    username: 'gate-one',
    password: await bcrypt.hash(password, 4),
    tokenVersion: 2,
    isActive: true,
  };
  ScannerStaff.findOne = () => ({ select: async () => staff });

  const res = responseRecorder();
  await controller.login({ body: { username: ' GATE-ONE ', password } }, res);
  assert.equal(res.statusCode, 200);
  const decoded = jwt.verify(res.body.data.token, process.env.JWT_SECRET);
  assert.equal(decoded.role, 'scanner');
  assert.equal(decoded.id, String(staff._id));
  assert.equal(decoded.tokenVersion, 2);
  assert.equal(decoded.exp - decoded.iat, 12 * 60 * 60);

  const disabledRes = responseRecorder();
  staff.isActive = false;
  await controller.login({ body: { username: staff.username, password } }, disabledRes);
  assert.equal(disabledRes.statusCode, 401);
  assert.deepEqual(disabledRes.body, { success: false, message: 'Invalid scanner credentials.' });
});
