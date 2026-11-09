const test = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../middlewares/auth');
const User = require('../models/User');
const adminController = require('../controllers/adminController');
const adminRoutes = require('../routes/admin.routes');
const bookingRoutes = require('../routes/booking.routes');

function denyWithGuard(guard, role) {
  let statusCode = null;
  let responseBody = null;
  const response = {
    status(code) { statusCode = code; return this; },
    json(value) { responseBody = value; return this; },
  };
  guard({ user: { role } }, response, () => assert.fail('The authorization guard should reject this role.'));
  return { statusCode, responseBody };
}

test('admin user search and manual booking endpoints are behind server-side Admin guards', () => {
  const routerGuards = adminRoutes.stack.filter((layer) => !layer.route).slice(0, 2).map((layer) => layer.handle);
  assert.equal(routerGuards[0], auth.protect);
  assert.equal(denyWithGuard(routerGuards[1], 'organizer').statusCode, 403);

  const searchRoute = adminRoutes.stack.find((layer) => layer.route?.path === '/users/search');
  assert.ok(searchRoute);
  const manualRoute = bookingRoutes.stack.find((layer) => layer.route?.path === '/admin-manual-booking');
  assert.ok(manualRoute);
  assert.equal(manualRoute.route.stack[0].handle, auth.protect);
  assert.equal(denyWithGuard(manualRoute.route.stack[1].handle, 'user').statusCode, 403);
});

test('NUSC partner recovery and capacity control routes are registered after Admin guards', () => {
  const adminGuardIndex = Math.max(...adminRoutes.stack
    .filter((layer) => !layer.route)
    .slice(0, 2)
    .map((layer) => adminRoutes.stack.indexOf(layer)));
  const expectedPaths = [
    '/nusc-home-matches/partner-season-passes/:orderId/recovery-preview',
    '/nusc-home-matches/partner-season-passes/:orderId/recover-missing-tickets',
    '/nusc-home-matches/availability',
  ];
  const routes = expectedPaths.map((path) => adminRoutes.stack.find((layer) => layer.route?.path === path));
  const capacityUpdateRoute = adminRoutes.stack.find((layer) => layer.route?.path === '/nusc-home-matches/availability' && layer.route.methods.put);

  assert.ok(routes.every(Boolean));
  assert.ok(routes.every((route) => adminRoutes.stack.indexOf(route) > adminGuardIndex));
  assert.ok(capacityUpdateRoute);
  assert.equal(adminRoutes.stack.indexOf(capacityUpdateRoute) > adminGuardIndex, true);
});

test('booking cancellation replaces both legacy delete routes and remains behind Admin guards', () => {
  const adminGuardIndex = Math.max(...adminRoutes.stack
    .filter((layer) => !layer.route)
    .slice(0, 2)
    .map((layer) => adminRoutes.stack.indexOf(layer)));
  const routes = adminRoutes.stack.filter((layer) => (
    layer.route?.path === '/bookings/:id' && layer.route.methods.delete
  ));

  assert.equal(routes.length, 1);
  assert.equal(adminRoutes.stack.indexOf(routes[0]) > adminGuardIndex, true);
  assert.equal(routes[0].route.stack.at(-1).handle.name, 'cancelPendingBooking');
});

test('Admin user search is bounded, escapes input, and projects only selector fields', async (t) => {
  const originalFind = User.find;
  let filter;
  let projection;
  let limit;
  User.find = (input) => {
    filter = input;
    return {
      select(fields) { projection = fields; return this; },
      sort() { return this; },
      limit(value) { limit = value; return this; },
      lean() { return Promise.resolve([{ _id: 'user-1', name: 'Active user', email: 'user@example.test', phone: '9999999999' }]); },
    };
  };
  t.after(() => { User.find = originalFind; });

  let result;
  const response = { status() { return this; }, json(value) { result = value; return this; } };
  await adminController.searchUsers({ query: { search: 'a.*', limit: '5000' } }, response);

  assert.equal(filter.role, 'user');
  assert.equal(filter.status, 'active');
  assert.equal(filter.$or[0].name.$regex, 'a\\.\\*');
  assert.equal(projection, '_id name email phone');
  assert.equal(limit, 20);
  assert.deepEqual(Object.keys(result.data.users[0]).sort(), ['_id', 'email', 'name', 'phone']);
});
