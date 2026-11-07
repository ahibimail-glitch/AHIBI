const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createNuscHomeMatchPaymentReconciliationService,
  RECONCILIATION_INTERVAL_MS,
} = require('../services/nuscHomeMatchPaymentReconciliationService');

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function matches(record, filter) {
  return Object.entries(filter || {}).every(([key, expected]) => {
    if (key === '$and') return expected.every((part) => matches(record, part));
    if (key === '$or') return expected.some((part) => matches(record, part));

    const actual = record[key];
    if (expected && typeof expected === 'object' && !(expected instanceof Date) && !Array.isArray(expected)) {
      return Object.entries(expected).every(([operator, value]) => {
        if (operator === '$in') return value.includes(actual);
        if (operator === '$nin') return !value.includes(actual);
        if (operator === '$ne') return actual !== value;
        if (operator === '$lte') return actual != null && new Date(actual).getTime() <= new Date(value).getTime();
        if (operator === '$exists') return (Object.hasOwn(record, key) && actual !== undefined) === value;
        return false;
      });
    }
    if (expected === null) return actual == null;
    return actual === expected;
  });
}

function applyUpdate(record, update) {
  for (const [key, value] of Object.entries(update.$setOnInsert || {})) {
    if (!Object.hasOwn(record, key)) record[key] = clone(value);
  }
  Object.assign(record, clone(update.$set || {}));
  for (const [key, value] of Object.entries(update.$inc || {})) record[key] = Number(record[key] || 0) + value;
  for (const key of Object.keys(update.$unset || {})) delete record[key];
}

function createHarness({ order, payments = [], bookings = [] }) {
  const orders = [clone(order)];
  const transactions = [];
  const alerts = { captured: [], reconciliation: [], additional: [], resolved: [] };
  const NuscHomeMatchOrder = {
    find(filter) {
      let limit = Infinity;
      const query = {
        sort() { return query; },
        limit(value) { limit = value; return query; },
        select() { return query; },
        lean() { return Promise.resolve(orders.filter((item) => matches(item, filter)).slice(0, limit).map(({ _id }) => ({ _id }))); },
      };
      return query;
    },
    async findOneAndUpdate(filter, update) {
      const target = orders.find((item) => matches(item, filter));
      if (!target) return null;
      applyUpdate(target, update);
      return clone(target);
    },
    async updateOne(filter, update) {
      const target = orders.find((item) => matches(item, filter));
      if (!target) return { matchedCount: 0 };
      applyUpdate(target, update);
      return { matchedCount: 1 };
    },
    findById(id) {
      return { select: async () => clone(orders.find((item) => item._id === id) || null) };
    },
  };
  const PaymentTransaction = {
    findOne(filter) {
      return { select: async () => clone(transactions.find((item) => matches(item, filter)) || null) };
    },
    async findOneAndUpdate(filter, update) {
      let target = transactions.find((item) => matches(item, filter));
      if (!target) {
        target = { ...filter };
        transactions.push(target);
      }
      applyUpdate(target, update);
      return clone(target);
    },
  };
  const Booking = {
    find(filter) {
      const query = {
        select() { return query; },
        lean() { return Promise.resolve(bookings.filter((booking) => matches(booking, filter)).map(clone)); },
      };
      return query;
    },
  };
  const alertService = {
    async alertCapturedPaymentNeedsTickets(alert) { alerts.captured.push(alert); },
    async alertReconciliationNeedsReview(alert) { alerts.reconciliation.push(alert); },
    async alertAdditionalCapture(alert) { alerts.additional.push(alert); },
    async resolveOrderAlerts(orderId) { alerts.resolved.push(orderId); },
  };
  const recoveries = [];
  const service = createNuscHomeMatchPaymentReconciliationService({
    NuscHomeMatchOrder,
    PaymentTransaction,
    Booking,
    alertService,
    logger: { error() {} },
    recoverCapturedOrder: async (orderId, payment) => {
      recoveries.push({ orderId, paymentId: payment.id });
      const target = orders.find((item) => item.orderId === orderId);
      target.status = 'completed';
      return { bookings: [{ _id: 'booking-test-1' }] };
    },
  });
  const razorpay = {
    orders: { fetchPayments: async () => ({ items: payments }) },
    payments: { fetch: async (paymentId) => payments.find((payment) => payment.id === paymentId) },
  };

  return { service, razorpay, orders, transactions, alerts, recoveries };
}

function makeOrder(overrides = {}) {
  const now = new Date('2026-11-07T00:00:00.000Z');
  return {
    _id: 'nusc-order-document-1',
    orderId: 'order_nusc_123',
    user: 'user-1',
    event: 'event-1',
    amountMinor: 50000,
    currency: 'INR',
    bookingDetails: { user: { name: 'Test Customer' } },
    status: 'created',
    createdAt: new Date(now.getTime() - RECONCILIATION_INTERVAL_MS - 1000),
    nextReconciliationAt: new Date(now.getTime() - 1000),
    reconciliationAttemptCount: 0,
    needsAdminIntervention: false,
    ...overrides,
  };
}

function capturedPayment(overrides = {}) {
  return {
    id: 'pay_nusc_123',
    order_id: 'order_nusc_123',
    amount: 50000,
    currency: 'INR',
    status: 'captured',
    captured: true,
    created_at: 1794000000,
    ...overrides,
  };
}

test('NUSC reconciliation finds an omitted capture webhook and recovers the captured order', async () => {
  const now = new Date('2026-11-07T00:00:00.000Z');
  const payment = capturedPayment();
  const harness = createHarness({ order: makeOrder(), payments: [payment] });

  const result = await harness.service.run(harness.razorpay, now);

  assert.equal(result.settled, 1);
  assert.equal(result.failed, 0);
  assert.deepEqual(harness.recoveries, [{ orderId: 'order_nusc_123', paymentId: payment.id }]);
  assert.equal(harness.orders[0].status, 'completed');
  assert.equal(harness.orders[0].paymentId, payment.id);
  assert.equal(harness.orders[0].reconciliationAttemptCount, 0);
  assert.equal(harness.orders[0].reconciliationLeaseId, undefined);
  assert.equal(harness.transactions[0].status, 'paid_no_booking');
  assert.deepEqual(harness.alerts.resolved, ['order_nusc_123']);
});

test('NUSC reconciliation keeps an uncaptured checkout out of paid-but-not-booked alerts', async () => {
  const now = new Date('2026-11-07T00:00:00.000Z');
  const harness = createHarness({ order: makeOrder() });

  const result = await harness.service.run(harness.razorpay, now);

  assert.equal(result.noCapture, 1);
  assert.equal(harness.orders[0].status, 'created');
  assert.ok(harness.orders[0].nextReconciliationAt > now);
  assert.equal(harness.orders[0].needsAdminIntervention, false);
  assert.equal(harness.transactions.length, 0);
  assert.equal(harness.alerts.captured.length, 0);
  assert.equal(harness.recoveries.length, 0);
});

test('NUSC reconciliation sends a captured amount mismatch to admin review without issuing tickets', async () => {
  const now = new Date('2026-11-07T00:00:00.000Z');
  const payment = capturedPayment({ amount: 49900 });
  const harness = createHarness({ order: makeOrder(), payments: [payment] });

  const result = await harness.service.run(harness.razorpay, now);

  assert.equal(result.needsReview, 1);
  assert.equal(harness.orders[0].status, 'paid_no_booking');
  assert.equal(harness.orders[0].needsAdminIntervention, true);
  assert.equal(harness.orders[0].lastReconciliationErrorCode, 'PAYMENT_AMOUNT_MISMATCH');
  assert.equal(harness.transactions[0].status, 'paid_no_booking');
  assert.equal(harness.alerts.captured.length, 1);
  assert.equal(harness.alerts.captured[0].needsAdminIntervention, true);
  assert.equal(harness.recoveries.length, 0);
});

test('NUSC integrity checks move completed orders with missing tickets back to the recovery queue', async () => {
  const now = new Date('2026-11-07T00:00:00.000Z');
  const payment = capturedPayment();
  const order = makeOrder({
    status: 'completed',
    paymentId: payment.id,
    bookingDetails: { user: { name: 'Test Customer' }, tickets: [{ ticketType: 'General Pass', quantity: 2 }] },
    nextReconciliationAt: null,
    nextIntegrityCheckAt: new Date(now.getTime() - 1000),
  });
  const harness = createHarness({ order, bookings: [] });

  const result = await harness.service.run(harness.razorpay, now);

  assert.equal(result.integrityPending, 1);
  assert.equal(harness.orders[0].status, 'paid_no_booking');
  assert.equal(harness.orders[0].needsAdminIntervention, false);
  assert.equal(harness.orders[0].lastReconciliationErrorCode, 'NUSC_TICKETS_MISSING');
  assert.equal(harness.transactions[0].status, 'paid_no_booking');
  assert.equal(harness.alerts.captured.length, 1);
  assert.equal(harness.alerts.captured[0].needsAdminIntervention, false);
  assert.equal(harness.recoveries.length, 0);
});

test('NUSC integrity checks leave complete ticket sets settled', async () => {
  const now = new Date('2026-11-07T00:00:00.000Z');
  const payment = capturedPayment();
  const order = makeOrder({
    status: 'completed',
    paymentId: payment.id,
    bookingDetails: { user: { name: 'Test Customer' }, tickets: [{ ticketType: 'General Pass', quantity: 2 }] },
    nextReconciliationAt: null,
    nextIntegrityCheckAt: new Date(now.getTime() - 1000),
  });
  const bookings = [1, 2].map((nuscTicketIndex) => ({
    nuscOrderId: order.orderId,
    user: order.user,
    paymentId: payment.id,
    status: 'confirmed',
    paymentStatus: 'completed',
    nuscTicketIndex,
  }));
  const harness = createHarness({ order, bookings });

  const result = await harness.service.run(harness.razorpay, now);

  assert.equal(result.integrityOk, 1);
  assert.equal(harness.orders[0].status, 'completed');
  assert.ok(harness.orders[0].nextIntegrityCheckAt > now);
  assert.equal(harness.transactions.length, 0);
  assert.equal(harness.alerts.captured.length, 0);
});
