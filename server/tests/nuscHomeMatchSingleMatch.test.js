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

test('one ticket is available across all ten dates until it is purchased', async () => {
  assert.equal(inventory.SINGLE_MATCH_CAPACITY, 1);
  assert.equal(inventory.getMatchTicketPrice(inventory.SUITE_SINGLE_MATCH).price, 84000);
  const beforePurchase = await Promise.all(inventory.FIXTURE_DATES.map(getSingleMatchQuantity));
  assert.deepEqual(beforePurchase, Array(10).fill(1));

  await inventory.reserveMatchOrder({
    orderId: 'single-match-order',
    userId: 'buyer-1',
    matchDate: inventory.FIXTURE_DATES[9],
    ticketLines: singleMatchLine,
    eventTicketTypes: [],
  });
  assert.deepEqual(await Promise.all(inventory.FIXTURE_DATES.map(getSingleMatchQuantity)), Array(10).fill(0));
  await inventory.confirmMatchOrder('single-match-order');
  await inventory.markTicketStockApplied('single-match-order');
  await inventory.finalizeMatchOrder('single-match-order');

  const afterPurchase = await Promise.all(inventory.FIXTURE_DATES.map(getSingleMatchQuantity));
  assert.deepEqual(afterPurchase, Array(10).fill(0));
  await assert.rejects(() => inventory.reserveMatchOrder({
    orderId: 'second-single-match-order',
    userId: 'buyer-2',
    matchDate: firstDate,
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

test('concurrent reservations on different dates share the same one-ticket limit', async () => {
  const results = await Promise.allSettled([firstDate, secondDate].map((matchDate, index) => inventory.reserveMatchOrder({
    orderId: `single-match-race-${index}`,
    userId: `buyer-${index}`,
    matchDate,
    ticketLines: singleMatchLine,
    eventTicketTypes: [],
  })));

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(state.orders.filter((order) => order.ticketLines.some((line) => line.ticketType === inventory.SUITE_SINGLE_MATCH)).length, 1);
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
  assert.deepEqual(await Promise.all(inventory.FIXTURE_DATES.map(getSingleMatchQuantity)), Array(10).fill(1));
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
  assert.equal(tickets.find((ticket) => ticket.name === 'Premium Pass')?.quantity, 274);
  assert.equal(tickets.find((ticket) => ticket.name === inventory.SUITE_SINGLE_MATCH)?.quantity, 1);
});
