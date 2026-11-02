const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const router = require('../routes/admin.routes');
const { protect } = require('../middlewares/auth');

function responseStub() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('all season pass recovery routes are mounted behind authentication and Admin role authorization', async () => {
  const protectionIndex = router.stack.findIndex((layer) => layer.handle === protect);
  assert.ok(protectionIndex >= 0);
  const authorizationLayer = router.stack[protectionIndex + 1];
  assert.equal(typeof authorizationLayer?.handle, 'function');
  assert.match(authorizationLayer.handle.toString(), /roles\.includes\(req\.user\.role\)/);

  const requiredRoutes = [
    '/season-pass-recovery/ahibi/orders',
    '/season-pass-recovery/rise/search',
    '/season-pass-recovery/ahibi/recover',
    '/season-pass-recovery/rise/recover',
    '/season-pass-recovery/:channel/reissue-preview',
    '/season-pass-recovery/:channel/reissue-payment-verification',
    '/season-pass-recovery/:channel/reissue-new',
  ];
  for (const path of requiredRoutes) {
    const index = router.stack.findIndex((layer) => layer.route?.path === path);
    assert.ok(index > protectionIndex + 1, `${path} must follow both shared auth middleware`);
  }

  const noToken = responseStub();
  await protect({ headers: {}, originalUrl: '/api/admin/season-pass-recovery/rise/search' }, noToken, () => {
    assert.fail('unauthenticated recovery request must not reach its route');
  });
  assert.equal(noToken.statusCode, 401);

  const previousJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'recovery-test-secret';
  const userToken = jwt.sign({ id: '000000000000000000000001', role: 'user' }, process.env.JWT_SECRET);
  const nonAdmin = responseStub();
  try {
    await protect({
      headers: { authorization: `Bearer ${userToken}` },
      originalUrl: '/api/admin/season-pass-recovery/rise/recover',
    }, nonAdmin, () => assert.fail('non-admin recovery request must be rejected'));
    assert.equal(nonAdmin.statusCode, 403);
  } finally {
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
  }

  const deniedAdminAction = responseStub();
  let reachedAdminHandler = false;
  authorizationLayer.handle({ user: { role: 'user' } }, deniedAdminAction, () => { reachedAdminHandler = true; });
  assert.equal(deniedAdminAction.statusCode, 403);
  assert.equal(reachedAdminHandler, false);
});
