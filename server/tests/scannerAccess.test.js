const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'scanner-access-test-secret';

const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Scan = require('../models/Scan');
const ScannerStaff = require('../models/ScannerStaff');
const User = require('../models/User');
const auth = require('../middlewares/auth');
const scannerAuth = require('../middlewares/scannerAuth');
const bookingRoutes = require('../routes/booking.routes');
const scannerRoutes = require('../routes/scanner.routes');
const adminRoutes = require('../routes/admin.routes');

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function signedToken(payload = {}, options = {}) {
  return jwt.sign({ id: '507f1f77bcf86cd799439011', ...payload }, process.env.JWT_SECRET, options);
}

function getRoute(router, method, path) {
  const layer = router.stack.find((item) => item.route?.path === path && item.route.methods[method]);
  assert.ok(layer, `expected ${method.toUpperCase()} ${path} route`);
  return layer.route.stack.map((item) => item.handle);
}

test('scanner authentication requires an active scanner account and current token version', async (t) => {
  const originalFindById = ScannerStaff.findById;
  t.after(() => { ScannerStaff.findById = originalFindById; });
  const staff = { _id: '507f1f77bcf86cd799439011', username: 'gate-one', isActive: true, tokenVersion: 4 };
  ScannerStaff.findById = async () => staff;

  const req = { headers: { authorization: `Bearer ${signedToken({ role: 'scanner', tokenVersion: 4 })}` } };
  const res = responseRecorder();
  let nextCalled = false;
  await scannerAuth(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.scannerStaff, staff);

  staff.isActive = false;
  const disabledRes = responseRecorder();
  await scannerAuth({ headers: { authorization: `Bearer ${signedToken({ role: 'scanner', tokenVersion: 4 })}` } }, disabledRes, () => {});
  assert.equal(disabledRes.statusCode, 401);

  staff.isActive = true;
  const revokedRes = responseRecorder();
  await scannerAuth({ headers: { authorization: `Bearer ${signedToken({ role: 'scanner', tokenVersion: 3 })}` } }, revokedRes, () => {});
  assert.equal(revokedRes.statusCode, 401);
});

test('scanner verification returns the same booking identity fields for valid and used tickets', async (t) => {
  const originalBookingFindById = Booking.findById;
  const originalEventFindById = Event.findById;
  const originalScanCountDocuments = Scan.countDocuments;
  const bookingId = '507f1f77bcf86cd799439011';
  const eventId = '507f1f77bcf86cd799439012';
  const userId = '507f1f77bcf86cd799439013';
  const booking = {
    _id: bookingId,
    user: userId,
    event: eventId,
    status: 'confirmed',
    ticketType: 'General Pass',
    createdAt: new Date('2026-11-13T00:00:00.000Z'),
  };
  let usedEntries = 0;
  Booking.findById = async () => booking;
  Event.findById = async () => ({ ticketTypes: [{ name: 'General Pass', capacity: 1 }] });
  Scan.countDocuments = async () => usedEntries;
  t.after(() => {
    Booking.findById = originalBookingFindById;
    Event.findById = originalEventFindById;
    Scan.countDocuments = originalScanCountDocuments;
  });

  const verifyTicket = getRoute(scannerRoutes, 'post', '/verify-ticket')[0];
  for (const [entryCount, expectedStatus] of [[0, 'VALID'], [1, 'ALREADY_USED']]) {
    usedEntries = entryCount;
    const res = responseRecorder();
    await verifyTicket({ body: { bookingId, eventId } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, expectedStatus);
    assert.equal(res.body.bookingId, bookingId);
    assert.equal(res.body.userId, userId);
    assert.equal(res.body.ticketType, booking.ticketType);
  }
});

test('scanner identities cannot use generic authenticated routes or be attached as optional users', async () => {
  let userLookups = 0;
  const originalUserFindById = User.findById;
  User.findById = async () => { userLookups += 1; return null; };
  try {
    const scannerToken = signedToken({ role: 'scanner', tokenVersion: 0 });
    const req = { headers: { authorization: `Bearer ${scannerToken}` }, originalUrl: '/api/bookings/my-bookings' };
    const res = responseRecorder();
    let nextCalled = false;
    await auth.protect(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(userLookups, 0);

    const optionalReq = { headers: { authorization: `Bearer ${scannerToken}` }, originalUrl: '/api/events' };
    let optionalNextCalled = false;
    await auth.optionalAuth(optionalReq, responseRecorder(), () => { optionalNextCalled = true; });
    assert.equal(optionalNextCalled, true);
    assert.equal(optionalReq.user, undefined);
    assert.equal(userLookups, 0);
  } finally {
    User.findById = originalUserFindById;
  }
});

test('scanner credentials cannot use generic booking routes and only use scanner-scoped mutations', () => {
  for (const path of ['/verify-ticket', '/verify-qr', '/check-out']) {
    const handlers = getRoute(bookingRoutes, 'post', path);
    assert.equal(handlers[0], auth.protect, `${path} must authenticate before its handler`);
  }

  const checkIn = getRoute(bookingRoutes, 'post', '/check-in');
  assert.equal(checkIn[0], auth.protect);

  const scannerCheckIn = getRoute(scannerRoutes, 'post', '/check-in');
  assert.equal(scannerCheckIn.length, 1, 'scanner check-in must run after the router-level scannerAuth guard');
  const scannerCheckOut = getRoute(scannerRoutes, 'post', '/check-out');
  assert.equal(scannerCheckOut.length, 1, 'scanner check-out must run after the router-level scannerAuth guard');
  const scannerGuardIndex = scannerRoutes.stack.findIndex((layer) => layer.handle === scannerAuth);
  const scannerCheckInIndex = scannerRoutes.stack.findIndex((layer) => layer.route?.path === '/check-in');
  const scannerCheckOutIndex = scannerRoutes.stack.findIndex((layer) => layer.route?.path === '/check-out');
  assert.ok(scannerGuardIndex >= 0 && scannerGuardIndex < scannerCheckInIndex, 'scanner check-in must follow scannerAuth');
  assert.ok(scannerGuardIndex < scannerCheckOutIndex, 'scanner check-out must follow scannerAuth');

  assert.ok(adminRoutes.stack.some((layer) => layer.handle === auth.protect), 'scanner account management must be behind admin authentication');
  const adminGuardIndex = adminRoutes.stack.findIndex((layer) => layer.handle === auth.protect);
  const usersRouteIndex = adminRoutes.stack.findIndex((layer) => layer.route?.path === '/users');
  assert.ok(adminGuardIndex >= 0 && usersRouteIndex > adminGuardIndex, 'the admin users endpoint must not be exposed before the Admin guard');
});
