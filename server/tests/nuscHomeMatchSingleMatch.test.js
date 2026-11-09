const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.NUSC_HOME_MATCH_TEST_MODE = 'true';
process.env.NUSC_HOME_MATCH_TICKET_SALES_ENABLED = 'true';
process.env.RAZORPAY_KEY_ID = 'rzp_test_acceptance';
process.env.MONGO_URI = 'mongodb://localhost:27017/ahibi-test';

const InventoryModel = require('../models/NuscHomeMatchInventory');
const NuscHomeMatchOrder = require('../models/NuscHomeMatchOrder');
const inventory = require('../services/nuscHomeMatchInventoryService');

let state;
InventoryModel.updateOne = async (filter, update, options = {}) => {
  if (update.$setOnInsert) {
    if (!state && options.upsert) {
      state = {
        _id: 'test-inventory',
        __v: 0,
        key: filter.key,
        orders: [],
        generalZoneSales: [],
        seasonPassOrders: [],
        partnerSeasonPassReservations: [],
        seasonReservations: [],
        capacityOverrides: [],
        seasonPassHistoryInitializedAt: null,
      };
      return { modifiedCount: 0, upsertedCount: 1 };
    }
    return { modifiedCount: 0 };
  }

  await new Promise((resolve) => setImmediate(resolve));
  if (!state || (filter.__v != null && state.__v !== filter.__v)) return { modifiedCount: 0 };
  Object.assign(state, update.$set || {});
  for (const [key, increment] of Object.entries(update.$inc || {})) {
    state[key] = Number(state[key] || 0) + Number(increment);
  }
  return { modifiedCount: 1 };
};
InventoryModel.findOne = () => ({
  session() { return this; },
  lean: async () => state && JSON.parse(JSON.stringify(state)),
});
NuscHomeMatchOrder.find = () => ({
  select() { return this; },
  session() { return this; },
  lean: async () => [],
});

const firstDate = inventory.FIXTURE_DATES[0];
const secondDate = inventory.FIXTURE_DATES[1];
const singleMatchLine = [{ ticketType: inventory.SUITE_SINGLE_MATCH, quantity: 1 }];

test.beforeEach(() => {
  state = null;
});

async function getSingleMatchQuantity(matchDate) {
  const ticket = (await inventory.getMatchAvailability(matchDate, []))
    .find((item) => item.name === inventory.SUITE_SINGLE_MATCH);
  return ticket?.quantity;
}

test('two tickets are available across all ten dates until they are purchased', async () => {
  assert.equal(inventory.SINGLE_MATCH_CAPACITY, 2);
  assert.equal(inventory.getMatchTicketPrice(inventory.SUITE_SINGLE_MATCH).price, 84000);
  const beforePurchase = await Promise.all(inventory.FIXTURE_DATES.map(getSingleMatchQuantity));
  assert.deepEqual(beforePurchase, Array(10).fill(2));

  await inventory.reserveMatchOrder({
    orderId: 'single-match-order',
    userId: 'buyer-1',
    matchDate: inventory.FIXTURE_DATES[9],
    ticketLines: singleMatchLine,
    eventTicketTypes: [],
  });
  assert.deepEqual(await Promise.all(inventory.FIXTURE_DATES.map(getSingleMatchQuantity)), Array(10).fill(1));
  await inventory.confirmMatchOrder('single-match-order');
  await inventory.markTicketStockApplied('single-match-order');
  await inventory.finalizeMatchOrder('single-match-order');

  await inventory.reserveMatchOrder({
    orderId: 'second-single-match-order',
    userId: 'buyer-2',
    matchDate: firstDate,
    ticketLines: singleMatchLine,
    eventTicketTypes: [],
  });
  assert.deepEqual(await Promise.all(inventory.FIXTURE_DATES.map(getSingleMatchQuantity)), Array(10).fill(0));
  await assert.rejects(() => inventory.reserveMatchOrder({
    orderId: 'third-single-match-order',
    userId: 'buyer-3',
    matchDate: secondDate,
    ticketLines: singleMatchLine,
    eventTicketTypes: [],
  }), { code: 'TICKETS_UNAVAILABLE' });
});

test('a single-match order rejects quantity above one and a multi-date selection', async () => {
  await assert.rejects(() => inventory.reserveMatchOrder({
    orderId: 'multiple-single-match-tickets',
    userId: 'buyer-1',
    matchDate: firstDate,
    ticketLines: [{ ticketType: inventory.SUITE_SINGLE_MATCH, quantity: 2 }],
    eventTicketTypes: [],
  }), { code: 'SUITE_SINGLE_MATCH_LIMIT' });

  await assert.rejects(() => inventory.reserveMultiMatchOrder({
    orderId: 'multiple-single-match-dates',
    userId: 'buyer-1',
    matches: [firstDate, secondDate].map((matchDate) => ({
      matchDate,
      ticketLines: singleMatchLine,
      eventTicketTypes: [],
    })),
  }), { code: 'SUITE_SINGLE_MATCH_LIMIT' });
  assert.equal(state?.orders?.length || 0, 0);
});

test('concurrent reservations on different dates share the same two-ticket limit', async () => {
  const results = await Promise.allSettled([firstDate, secondDate, inventory.FIXTURE_DATES[2]].map((matchDate, index) => inventory.reserveMatchOrder({
    orderId: `single-match-race-${index}`,
    userId: `buyer-${index}`,
    matchDate,
    ticketLines: singleMatchLine,
    eventTicketTypes: [],
  })));

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 2);
  assert.equal(state.orders.filter((order) => order.ticketLines.some((line) => line.ticketType === inventory.SUITE_SINGLE_MATCH)).length, 2);
});

test('refunding the confirmed order releases the global ticket', async () => {
  await inventory.reserveMatchOrder({
    orderId: 'refundable-single-match',
    userId: 'buyer-1',
    matchDate: firstDate,
    ticketLines: singleMatchLine,
    eventTicketTypes: [],
  });
  await inventory.confirmMatchOrder('refundable-single-match');
  await inventory.releaseRefundedMatchOrder('refundable-single-match');
  assert.deepEqual(await Promise.all(inventory.FIXTURE_DATES.map(getSingleMatchQuantity)), Array(10).fill(2));
});

test('regular Premium Pass reservations still use the existing per-match inventory', async () => {
  await inventory.reserveMatchOrder({
    orderId: 'regular-premium-order',
    userId: 'buyer-1',
    matchDate: firstDate,
    ticketLines: [{ ticketType: 'Premium Pass', quantity: 1 }],
    eventTicketTypes: [{ name: 'Premium Pass', quantity: 275, sold: 0 }],
  });

  const tickets = await inventory.getMatchAvailability(firstDate, [
    { name: 'Premium Pass', quantity: 275, sold: 0 },
  ]);
  assert.equal(tickets.find((ticket) => ticket.name === 'Premium Pass')?.quantity, 184);
  assert.equal(tickets.find((ticket) => ticket.name === inventory.SUITE_SINGLE_MATCH)?.quantity, 2);
});

test('Admin capacity overview subtracts sold Premium seats and committed suite reservations', async () => {
  const overview = await inventory.getAdminCapacityOverview({
    matches: [{
      matchDate: firstDate,
      ticketTypes: [
        { name: 'Premium Pass', quantity: 250, sold: 35 },
        { name: 'General Pass', quantity: 2800, sold: 10 },
      ],
    }],
  });
  const fixture = overview.fixtures.find((item) => item.matchDate === firstDate);
  const premium = fixture.capacities.find((item) => item.ticketType === 'Premium Pass');
  const suiteSeats = fixture.capacities.find((item) => item.ticketType === inventory.SUITE_SINGLE);
  const suiteBoxes = fixture.capacities.find((item) => item.ticketType === inventory.SUITE_FULL_BOX);
  assert.equal(premium.capacity, 185);
  assert.equal(premium.sold, 35);
  assert.equal(premium.available, 150);
  assert.equal(suiteSeats.offlineReserved, 3);
  assert.equal(suiteSeats.available, 5);
  assert.equal(suiteBoxes.capacity, 3);
  assert.equal(suiteBoxes.available, 3);
  assert.equal(overview.singleMatchTicket.capacity, 2);
});

test('Admin capacity changes are persisted and cannot go below committed tickets', async () => {
  const adminId = '507f1f77bcf86cd799439011';
  await inventory.setCapacityOverride({
    matchDate: firstDate,
    ticketType: 'Premium Pass',
    capacity: 200,
    soldCount: 35,
    adminId,
  });
  assert.equal(state.capacityOverrides[0].capacity, 200);
  await assert.rejects(() => inventory.setCapacityOverride({
    matchDate: firstDate,
    ticketType: 'Premium Pass',
    capacity: 34,
    soldCount: 35,
    adminId,
  }), { code: 'CAPACITY_BELOW_COMMITTED' });

  const tickets = await inventory.getMatchAvailability(firstDate, [
    { name: 'Premium Pass', quantity: 250, sold: 35 },
  ]);
  assert.equal(tickets.find((ticket) => ticket.name === 'Premium Pass')?.quantity, 165);
});

test('season box reservation consumes Full Box and season box availability', async () => {
  state = {
    _id: 'test-inventory',
    __v: 0,
    key: 'nusc-il-2026-27',
    orders: [],
    generalZoneSales: [],
    seasonPassOrders: [],
    partnerSeasonPassReservations: [],
    seasonReservations: [{ boxNumber: 2, status: 'active', bookingReference: 'SEASON-BOX-1' }],
    capacityOverrides: [],
    seasonPassHistoryInitializedAt: new Date().toISOString(),
  };
  const overview = await inventory.getAdminCapacityOverview();
  const fixture = overview.fixtures.find((item) => item.matchDate === firstDate);
  const fullBoxes = fixture.capacities.find((item) => item.ticketType === inventory.SUITE_FULL_BOX);
  assert.equal(fullBoxes.offlineReserved, 1);
  assert.equal(fullBoxes.available, 2);
  assert.equal(overview.seasonBoxes.available, 2);
  await assert.rejects(() => inventory.setCapacityOverride({
    matchDate: firstDate,
    ticketType: inventory.SUITE_FULL_BOX,
    capacity: 0,
    adminId: '507f1f77bcf86cd799439011',
  }), { code: 'CAPACITY_BELOW_COMMITTED' });
});
