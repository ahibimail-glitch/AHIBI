const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const PASS_OPTIONS = require('../config/nuscHomeMatchPricing');

const SERVER = path.resolve(__dirname, '..');
const objectId = (value) => `0000000000000000000000${value}`.slice(-24);

function query(value) {
  return {
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean() { return Promise.resolve(value); },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}

function setupManualService(t, options = {}) {
  const userId = objectId('001');
  const adminId = objectId('002');
  const fixtures = Array.from({ length: 10 }, (_, index) => {
    const date = `2026-${String(index + 1).padStart(2, '0')}-14`;
    return {
      date,
      opponent: `Opponent ${index + 1}`,
      matchDate: date,
      matchIndex: index + 1,
      event: {
        _id: objectId(String(index + 10).padStart(3, '0')),
        slug: `nusc-home-match-${date.replace(/-/g, '')}`,
        status: 'approved',
        isPublic: true,
        startDate: new Date('2027-12-31T20:00:00Z'),
        ticketTypes: [{ name: 'General Pass', sold: 0 }, { name: 'Premium Pass', sold: 0 }],
      },
    };
  });
  const orderById = new Map();
  const reserveCalls = [];
  const releaseCalls = [];
  const issuedCalls = [];
  let issuedBookings = [];
  let confirmCalls = 0;

  const ManualOrder = {
    async init() {},
    findOne(filter) {
      return query([...orderById.values()].find((order) =>
        (filter.requestId && order.requestId === filter.requestId) ||
        (filter.orderId && order.orderId === filter.orderId)
      ) || null);
    },
    async create(input) {
      if (orderById.has(input.requestId)) {
        const error = new Error('duplicate request ID');
        error.code = 11000;
        throw error;
      }
      const order = {
        ...input,
        _id: objectId(String(orderById.size + 100).padStart(3, '0')),
        async save() { orderById.set(order.requestId, order); return order; },
      };
      orderById.set(order.requestId, order);
      return order;
    },
    async findOneAndUpdate(filter, update) {
      const order = [...orderById.values()].find((item) => String(item._id) === String(filter._id));
      if (!order || (filter.settlementHash === null && order.settlementHash)) return null;
      Object.assign(order, update.$set || {});
      if (update.$push?.operationsAudit) order.operationsAudit.push(update.$push.operationsAudit);
      return order;
    },
  };

  const Booking = {
    async init() {},
    find(filter) {
      return query(filter.manualSeasonPassOrderId ? issuedBookings : []);
    },
    async countDocuments() { return 0; },
  };
  const Event = {
    find(filter) { return query(fixtures.filter((fixture) => filter.slug.$in.includes(fixture.event.slug)).map(({ event }) => event)); },
  };
  const User = {
    findOne() { return { select() { return query({ _id: userId }); } }; },
  };
  class InventoryConflict extends Error {
    constructor(message, code) { super(message); this.code = code; }
  }
  const inventory = {
    TICKET_SALES_ENABLED: true,
    FIXTURE_MATCHES: fixtures,
    FIXTURE_DATES: fixtures.map((fixture) => fixture.date),
    GENERAL_SEATING_AREAS: ['G1', 'G2', 'G3', 'G4', 'G5'].map((name) => ({ name })),
    SUITE_FULL_BOX: 'Suite full box',
    SUITE_SEASON: 'Suite season',
    InventoryConflict,
    async reserveSeasonPassOrder(input) {
      reserveCalls.push(input);
      if (options.capacityUnavailable && reserveCalls.length === 1) throw new InventoryConflict('No capacity', 'TICKETS_UNAVAILABLE');
      return { expiresAt: new Date(Date.now() + 15 * 60 * 1000) };
    },
    async confirmSeasonPassOrder() {
      confirmCalls += 1;
      if (options.expireFirstHold && confirmCalls === 1) throw new InventoryConflict('Hold expired', 'HOLD_EXPIRED');
    },
    async markSeasonPassStockApplied() {},
    async releaseSeasonPassOrder(orderId) { releaseCalls.push(orderId); },
  };
  const issuer = {
    async createSeasonPassTicketRecords(input) {
      issuedCalls.push(input);
      issuedBookings = input.fixtures.map((fixture, index) => ({
        _id: objectId(String(index + 30).padStart(3, '0')),
        event: fixture.eventId,
        ticketType: fixture.ticketType,
        quantity: 1,
        price: input.pricePerMatch,
        total: input.pricePerMatch,
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentProvider: input.paymentProvider,
        modeOfPayment: input.modeOfPayment,
        manualSeasonPassOrderId: input.manualOrderId,
        manualSeasonPassMatchIndex: fixture.matchIndex,
      }));
      return { bookings: issuedBookings, bookingIds: issuedBookings.map(({ _id }) => _id) };
    },
  };

  const modules = [
    ['models/ManualSeasonPassOrder', ManualOrder],
    ['models/Booking', Booking],
    ['models/Event', Event],
    ['models/User', User],
    ['services/nuscHomeMatchInventoryService', inventory],
    ['services/nuscSeasonPassBookingService', issuer],
  ];
  const originals = new Map();
  for (const [relative, exports] of modules) {
    const filename = require.resolve(path.join(SERVER, relative));
    originals.set(filename, require.cache[filename]);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
  }
  const servicePath = require.resolve(path.join(SERVER, 'services/manualSeasonPassService'));
  originals.set(servicePath, require.cache[servicePath]);
  delete require.cache[servicePath];
  const service = require(servicePath);
  t.after(() => {
    for (const [filename, cached] of originals) {
      if (cached) require.cache[filename] = cached;
      else delete require.cache[filename];
    }
  });
  return { service, reserveCalls, releaseCalls, issuedCalls, userId, adminId, fixtures, issuer, inventory, orderById };
}

test('manual AHIBI pass uses the server total and issues ten match tickets once', async (t) => {
  assert.equal(PASS_OPTIONS['general-season'].amountMinor, 382520);
  assert.equal(PASS_OPTIONS['premium-season'].amountMinor, 1350000);
  const db = setupManualService(t);
  const request = { requestId: 'manual-pass-request-0001', userId: db.userId, adminId: db.adminId, passId: 'general-season', zone: 'G-1' };
  const reserved = await db.service.reserveAhibiManualSeasonPass(request);
  assert.equal(reserved.amountMinor, 382520);
  assert.equal(reserved.status, 'reserved');
  assert.equal(db.reserveCalls.length, 1);
  const reserveRetry = await db.service.reserveAhibiManualSeasonPass(request);
  assert.equal(reserveRetry.orderId, reserved.orderId);
  assert.equal(db.reserveCalls.length, 1);

  const issued = await db.service.settleAhibiManualSeasonPass({
    orderId: reserved.orderId,
    adminId: db.adminId,
    settlement: { settlementType: 'paid', modeOfPayment: 'Cash', paymentReference: 'cash-receipt-7' },
  });
  assert.equal(issued.status, 'issued');
  assert.equal(issued.bookings.length, 10);
  assert.equal(new Set(db.issuedCalls[0].fixtures.map((fixture) => String(fixture.eventId))).size, 10);
  assert.equal(db.issuedCalls[0].paymentProvider, 'manual');
  assert.equal(db.issuedCalls[0].pricePerMatch, 382.52);
  assert.equal(db.issuedCalls[0].modeOfPayment, 'Cash');
  assert.equal(db.issuedCalls[0].settlementType, 'paid');
  assert.equal(Object.hasOwn(db.issuedCalls[0], 'paymentId'), false);
  assert.equal(issued.bookings.every((booking) => !booking.razorpayPaymentId && !booking.razorpayOrderId), true);

  const retry = await db.service.settleAhibiManualSeasonPass({
    orderId: reserved.orderId,
    adminId: db.adminId,
    settlement: { settlementType: 'paid', modeOfPayment: 'Cash', paymentReference: 'cash-receipt-7' },
  });
  assert.equal(retry.status, 'issued');
  assert.equal(db.issuedCalls.length, 1);
});

test('manual settlement is retained and inventory is renewed after a hold expires', async (t) => {
  const db = setupManualService(t, { expireFirstHold: true });
  const reserved = await db.service.reserveAhibiManualSeasonPass({
    requestId: 'manual-pass-request-0002', userId: db.userId, adminId: db.adminId, passId: 'premium-season', zone: null,
  });
  const result = await db.service.settleAhibiManualSeasonPass({
    orderId: reserved.orderId,
    adminId: db.adminId,
    settlement: { settlementType: 'paid', modeOfPayment: 'UPI' },
  });
  assert.equal(result.status, 'issued');
  assert.equal(db.reserveCalls.length, 2);
  assert.deepEqual(db.releaseCalls, [reserved.orderId]);
  assert.equal(db.reserveCalls[1].allowSalesClosed, true);
  assert.equal(db.issuedCalls.length, 1);
});

test('complimentary issuance records its reason, zero settlement, and audit entry', async (t) => {
  const db = setupManualService(t);
  const reserved = await db.service.reserveAhibiManualSeasonPass({
    requestId: 'manual-pass-request-0004', userId: db.userId, adminId: db.adminId, passId: 'premium-season', zone: null,
  });
  const result = await db.service.settleAhibiManualSeasonPass({
    orderId: reserved.orderId,
    adminId: db.adminId,
    settlement: { settlementType: 'complimentary', complimentaryReason: 'Approved community partner allocation' },
  });
  const order = db.orderById.get('manual-pass-request-0004');
  assert.equal(result.status, 'issued');
  assert.equal(order.settledAmountMinor, 0);
  assert.equal(order.complimentaryReason, 'Approved community partner allocation');
  assert.equal(order.operationsAudit.some((entry) => entry.action === 'complimentary_recorded'), true);
  assert.equal(db.issuedCalls[0].pricePerMatch, 0);
  assert.equal(db.issuedCalls[0].settlementType, 'complimentary');
  assert.equal(db.issuedCalls[0].modeOfPayment, null);
});

test('Card is accepted as an offline paid settlement method', async (t) => {
  const db = setupManualService(t);
  const reserved = await db.service.reserveAhibiManualSeasonPass({
    requestId: 'manual-pass-request-0005', userId: db.userId, adminId: db.adminId, passId: 'premium-season', zone: null,
  });
  const result = await db.service.settleAhibiManualSeasonPass({
    orderId: reserved.orderId,
    adminId: db.adminId,
    settlement: { settlementType: 'paid', modeOfPayment: 'Card' },
  });
  assert.equal(result.status, 'issued');
  assert.equal(db.issuedCalls[0].modeOfPayment, 'Card');
  assert.equal(db.issuedCalls[0].pricePerMatch, 1350);
  assert.equal(Object.hasOwn(db.issuedCalls[0], 'paymentId'), false);
});

test('a full inventory response leaves a retryable failed order and creates no tickets', async (t) => {
  const db = setupManualService(t, { capacityUnavailable: true });
  await assert.rejects(
    db.service.reserveAhibiManualSeasonPass({
      requestId: 'manual-pass-request-0003', userId: db.userId, adminId: db.adminId, passId: 'general-season', zone: 'G-2',
    }),
    (error) => error.status === 409 && error.code === 'TICKETS_UNAVAILABLE',
  );
  assert.equal(db.issuedCalls.length, 0);
  assert.equal(db.orderById.get('manual-pass-request-0003').status, 'failed');
});
