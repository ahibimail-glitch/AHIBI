const test = require('node:test');
const assert = require('node:assert/strict');
const lifecycle = require('../services/adminBookingLifecycleService');
const adminBookingsController = require('../controllers/adminBookingsController');
const BOOKING_ID = '64b000000000000000000001';
const ADMIN_ONE_ID = '64b000000000000000000002';
const ADMIN_TWO_ID = '64b000000000000000000003';

function makeHarness(initialBooking, { scanCount = 0 } = {}) {
  const state = {
    booking: structuredClone(initialBooking),
    scans: scanCount,
    inventory: { sold: 18, activeBookings: 18 },
    updateAttempts: 0,
  };

  const sessionFactory = async () => ({
    async withTransaction(callback) { return callback(); },
    async endSession() {},
  });
  const BookingModel = {
    findById(id) {
      return {
        session: async () => (String(state.booking?._id) === String(id) ? structuredClone(state.booking) : null),
      };
    },
    async findOneAndUpdate(filter, update) {
      state.updateAttempts += 1;
      if (
        !state.booking ||
        String(state.booking._id) !== String(filter._id) ||
        state.booking.status !== filter.status ||
        !filter.paymentStatus.$in.includes(state.booking.paymentStatus) ||
        state.booking.entryVerified === true ||
        state.booking.bookingSource === 'on-spot' ||
        Object.keys(filter).some((field) => field !== '_id' && field !== 'status' && field !== 'paymentStatus' && field !== 'entryVerified' && field !== 'bookingSource' && state.booking[field] != null)
      ) return null;

      state.booking = {
        ...state.booking,
        ...update.$set,
        adminLifecycleAudit: [...(state.booking.adminLifecycleAudit || []), ...update.$push.adminLifecycleAudit.$each],
      };
      return structuredClone(state.booking);
    },
  };
  const ScanModel = {
    countDocuments() {
      return { session: async () => state.scans };
    },
  };

  return { state, deps: { BookingModel, ScanModel, sessionFactory } };
}

function pendingBooking(overrides = {}) {
  return {
    _id: BOOKING_ID,
    event: 'event-1',
    ticketType: 'General',
    quantity: 1,
    bookingSource: 'online',
    status: 'pending',
    paymentStatus: 'pending',
    entryVerified: false,
    bookedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

test('NUSC RISE reservation tickets cannot be deleted or cancelled from generic booking Admin', async () => {
  const { state, deps } = makeHarness(pendingBooking({
    paymentProvider: 'nusc-partner',
    nuscSeasonPassType: 'premium-season',
    nuscSeasonMatchIndex: 1,
    nuscPartnerTicket: {
      partnerId: 'nusc',
      reservationId: 'reservation-1',
      partnerOrderId: 'paid-order-1',
      ticketIndex: 1,
    },
  }));

  await assert.rejects(
    lifecycle.cancelPendingBooking({ bookingId: BOOKING_ID, adminId: ADMIN_ONE_ID }, deps),
    (error) => error.code === 'PARTNER_RESERVATION_LINKED' && error.status === 409 && /partner|reservation/i.test(error.message),
  );
  assert.equal(state.booking.status, 'pending');
  assert.equal(state.booking.nuscPartnerTicket.partnerOrderId, 'paid-order-1');
  assert.equal(state.booking.adminLifecycleAudit, undefined);
  assert.deepEqual(state.inventory, { sold: 18, activeBookings: 18 });
});

test('issued AHIBI tickets are retained instead of being hard deleted or invalidated', async () => {
  const booking = pendingBooking({ status: 'confirmed', paymentStatus: 'completed', qrCode: 'signed-ticket' });
  const { state, deps } = makeHarness(booking);

  await assert.rejects(
    lifecycle.cancelPendingBooking({ bookingId: BOOKING_ID, adminId: ADMIN_ONE_ID }, deps),
    (error) => error.code === 'BOOKING_ISSUED' && error.status === 409 && /issued|active ticket/i.test(error.message),
  );
  assert.deepEqual(state.booking, booking);
  assert.deepEqual(state.inventory, { sold: 18, activeBookings: 18 });
});

test('a payment-complete pending booking is blocked from generic cancellation', async () => {
  const booking = pendingBooking({ paymentStatus: 'completed', paymentId: 'pay-1' });
  const { state, deps } = makeHarness(booking);

  await assert.rejects(
    lifecycle.cancelPendingBooking({ bookingId: BOOKING_ID, adminId: ADMIN_ONE_ID }, deps),
    (error) => error.code === 'BOOKING_PAID' && error.status === 409 && /payment|refund/i.test(error.message),
  );
  assert.deepEqual(state.booking, booking);
});

test('checked-in state and independent scan evidence both block cancellation', async (t) => {
  await t.test('checked-in flag', async () => {
    const booking = pendingBooking({ status: 'checked-in', entryVerified: true });
    const { state, deps } = makeHarness(booking);
    await assert.rejects(
      lifecycle.cancelPendingBooking({ bookingId: BOOKING_ID, adminId: ADMIN_ONE_ID }, deps),
      (error) => error.code === 'BOOKING_CHECKED_IN' && error.status === 409 && /scan|check-in/i.test(error.message),
    );
    assert.deepEqual(state.booking, booking);
  });

  await t.test('scan exists even if booking flags are missing', async () => {
    const booking = pendingBooking();
    const { state, deps } = makeHarness(booking, { scanCount: 1 });
    await assert.rejects(
      lifecycle.cancelPendingBooking({ bookingId: BOOKING_ID, adminId: ADMIN_ONE_ID }, deps),
      (error) => error.code === 'BOOKING_SCAN_HISTORY_EXISTS' && error.status === 409 && /scan|check-in/i.test(error.message),
    );
    assert.deepEqual(state.booking, booking);
  });

  await t.test('legacy check-in metadata exists even if the status flag is stale', async () => {
    const booking = pendingBooking({ entryVerifiedAt: new Date('2026-02-01T12:00:00.000Z') });
    const { state, deps } = makeHarness(booking);
    await assert.rejects(
      lifecycle.cancelPendingBooking({ bookingId: BOOKING_ID, adminId: ADMIN_ONE_ID }, deps),
      (error) => error.code === 'BOOKING_CHECKED_IN' && error.status === 409,
    );
    assert.deepEqual(state.booking, booking);
  });
});

test('only clearly unpaid, unissued pending records are cancelled and audited without changing inventory', async () => {
  const booking = pendingBooking({
    eventSnapshot: { title: 'Test event' },
    customerName: 'Test customer',
    reservationMetadata: { retained: true },
  });
  const { state, deps } = makeHarness(booking);

  const result = await lifecycle.cancelPendingBooking({ bookingId: BOOKING_ID, adminId: ADMIN_ONE_ID }, deps);

  assert.equal(result.code, 'BOOKING_CANCELLED');
  assert.equal(result.booking._id, BOOKING_ID);
  assert.equal(state.booking.status, 'cancelled');
  assert.equal(state.booking.paymentStatus, 'pending');
  assert.deepEqual(state.booking.eventSnapshot, booking.eventSnapshot);
  assert.deepEqual(state.booking.reservationMetadata, booking.reservationMetadata);
  assert.equal(state.booking.adminLifecycleAudit.length, 1);
  assert.equal(state.booking.adminLifecycleAudit[0].adminId, ADMIN_ONE_ID);
  assert.equal(state.booking.adminLifecycleAudit[0].action, 'cancelled_unissued_pending_booking');
  assert.deepEqual(state.inventory, { sold: 18, activeBookings: 18 });
});

test('repeated Admin cancellation is idempotent and adds no duplicate audit entry', async () => {
  const { state, deps } = makeHarness(pendingBooking());

  const first = await lifecycle.cancelPendingBooking({ bookingId: BOOKING_ID, adminId: ADMIN_ONE_ID }, deps);
  const second = await lifecycle.cancelPendingBooking({ bookingId: BOOKING_ID, adminId: ADMIN_TWO_ID }, deps);

  assert.equal(first.idempotentReplay, false);
  assert.equal(second.idempotentReplay, true);
  assert.equal(second.booking._id, BOOKING_ID);
  assert.equal(state.booking.adminLifecycleAudit.length, 1);
  assert.equal(state.booking.adminLifecycleAudit[0].adminId, ADMIN_ONE_ID);
  assert.equal(state.updateAttempts, 1);
});

test('concurrent Admin cancellation attempts produce one state change and one audit record', async () => {
  const { state, deps } = makeHarness(pendingBooking());

  const results = await Promise.all([
    lifecycle.cancelPendingBooking({ bookingId: BOOKING_ID, adminId: ADMIN_ONE_ID }, deps),
    lifecycle.cancelPendingBooking({ bookingId: BOOKING_ID, adminId: ADMIN_TWO_ID }, deps),
  ]);

  assert.equal(state.booking.status, 'cancelled');
  assert.equal(state.booking.adminLifecycleAudit.length, 1);
  assert.deepEqual(results.map((result) => result.idempotentReplay).sort(), [false, true]);
});

test('Admin receives the specific prohibition code and manual-review message', async (t) => {
  const originalCancel = lifecycle.cancelPendingBooking;
  lifecycle.cancelPendingBooking = async () => {
    throw new lifecycle.AdminBookingLifecycleError(
      'This is an active or issued ticket. Use the existing event cancellation/refund workflow.',
      'BOOKING_ISSUED',
    );
  };
  t.after(() => { lifecycle.cancelPendingBooking = originalCancel; });

  let statusCode;
  let responseBody;
  const response = {
    status(code) { statusCode = code; return this; },
    json(body) { responseBody = body; return this; },
  };
  await adminBookingsController.cancelPendingBooking({
    params: { id: BOOKING_ID },
    user: { _id: ADMIN_ONE_ID },
  }, response);

  assert.equal(statusCode, 409);
  assert.equal(responseBody.code, 'BOOKING_ISSUED');
  assert.match(responseBody.message, /issued ticket|cancellation\/refund workflow/i);
});
