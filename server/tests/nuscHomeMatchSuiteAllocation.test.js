const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.NUSC_HOME_MATCH_TEST_MODE = 'true';
process.env.NUSC_HOME_MATCH_TICKET_SALES_ENABLED = 'true';
process.env.RAZORPAY_KEY_ID = 'rzp_test_acceptance';
process.env.MONGO_URI = 'mongodb://localhost:27017/ahibi-test';

const InventoryModel = require('../models/NuscHomeMatchInventory');
const inventory = require('../services/nuscHomeMatchInventoryService');

let state;
InventoryModel.updateOne = async (filter, update, options = {}) => {
  if (!state && options.upsert) {
    state = { _id: 'test-inventory', __v: 0, key: filter.key, orders: [], generalZoneSales: [], seasonPassOrders: [], seasonReservations: [] };
    return { modifiedCount: 1, upsertedCount: 1 };
  }
  await new Promise((resolve) => setImmediate(resolve));
  if (!state || state.__v !== filter.__v) return { modifiedCount: 0 };
  Object.assign(state, update.$set);
  state.__v += update.$inc.__v;
  return { modifiedCount: 1 };
};
InventoryModel.findOne = () => ({ lean: async () => state && JSON.parse(JSON.stringify(state)) });

const matchDate = inventory.FIXTURE_DATES[0];

test.beforeEach(() => {
  state = null;
});

test('United Suite Single uses only box 1 and stops at eight seats per match', async () => {
  for (let index = 0; index < 8; index += 1) {
    await inventory.reserveMatchOrder({
      orderId: `single-${index}`,
      userId: `buyer-${index}`,
      matchDate,
      ticketLines: [{ ticketType: inventory.SUITE_SINGLE, quantity: 1 }],
      eventTicketTypes: [],
    });
  }

  await assert.rejects(() => inventory.reserveMatchOrder({
    orderId: 'single-over-capacity',
    userId: 'buyer-9',
    matchDate,
    ticketLines: [{ ticketType: inventory.SUITE_SINGLE, quantity: 1 }],
    eventTicketTypes: [],
  }), { code: 'SUITE_SEATS_UNAVAILABLE' });

  assert.deepEqual(state.orders.flatMap((order) => order.suiteAllocations).map((allocation) => allocation.boxNumber), Array(8).fill(1));
});

test('United Suite Full Box uses only boxes 2 through 4 and allows three bookings per match', async () => {
  for (let index = 0; index < 3; index += 1) {
    await inventory.reserveMatchOrder({
      orderId: `full-box-${index}`,
      userId: `buyer-${index}`,
      matchDate,
      ticketLines: [{ ticketType: inventory.SUITE_FULL_BOX, quantity: 1 }],
      eventTicketTypes: [],
    });
  }

  await assert.rejects(() => inventory.reserveMatchOrder({
    orderId: 'full-box-over-capacity',
    userId: 'buyer-4',
    matchDate,
    ticketLines: [{ ticketType: inventory.SUITE_FULL_BOX, quantity: 1 }],
    eventTicketTypes: [],
  }), { code: 'SUITE_BOXES_UNAVAILABLE' });

  assert.deepEqual(state.orders.flatMap((order) => order.suiteAllocations).map((allocation) => allocation.boxNumber), [2, 3, 4]);
});

test('single-pass sales do not consume full-box inventory', async () => {
  for (let index = 0; index < 8; index += 1) {
    await inventory.reserveMatchOrder({
      orderId: `single-first-${index}`,
      userId: `buyer-${index}`,
      matchDate,
      ticketLines: [{ ticketType: inventory.SUITE_SINGLE, quantity: 1 }],
      eventTicketTypes: [],
    });
  }

  const availability = await inventory.getMatchAvailability(matchDate, [
    { name: inventory.SUITE_SINGLE, quantity: 8, sold: 0 },
    { name: inventory.SUITE_FULL_BOX, quantity: 3, sold: 0 },
  ]);
  assert.equal(availability.find((ticket) => ticket.name === inventory.SUITE_SINGLE).quantity, 0);
  assert.equal(availability.find((ticket) => ticket.name === inventory.SUITE_FULL_BOX).quantity, 3);
});

test('concurrent orders cannot oversell the final single-pass seat', async () => {
  for (let index = 0; index < 7; index += 1) {
    await inventory.reserveMatchOrder({
      orderId: `prebooked-${index}`,
      userId: `buyer-${index}`,
      matchDate,
      ticketLines: [{ ticketType: inventory.SUITE_SINGLE, quantity: 1 }],
      eventTicketTypes: [],
    });
  }

  const results = await Promise.allSettled(['race-a', 'race-b'].map((orderId) => inventory.reserveMatchOrder({
    orderId,
    userId: orderId,
    matchDate,
    ticketLines: [{ ticketType: inventory.SUITE_SINGLE, quantity: 1 }],
    eventTicketTypes: [],
  })));

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(state.orders.flatMap((order) => order.suiteAllocations).length, 8);
});

test('multi-date reservation rolls back every date when a later date is unavailable', async () => {
  await assert.rejects(() => inventory.reserveMultiMatchOrder({
    orderId: 'multi-date',
    userId: 'buyer',
    matches: [inventory.FIXTURE_DATES[0], inventory.FIXTURE_DATES[1]].map((date) => ({
      matchDate: date,
      ticketLines: [{ ticketType: 'Custom Pass', quantity: 1 }],
      eventTicketTypes: [{ name: 'Custom Pass', quantity: 1, sold: date === inventory.FIXTURE_DATES[0] ? 0 : 1 }],
    })),
  }), { code: 'TICKETS_UNAVAILABLE' });

  assert.equal(state?.orders.length || 0, 0);
});

test('Full Box is rejected from a multi-date reservation', async () => {
  await assert.rejects(() => inventory.reserveMultiMatchOrder({
    orderId: 'multi-full-box',
    userId: 'buyer',
    matches: inventory.FIXTURE_DATES.slice(0, 2).map((date) => ({
      matchDate: date,
      ticketLines: [{ ticketType: inventory.SUITE_FULL_BOX, quantity: 1 }],
      eventTicketTypes: [],
    })),
  }), { code: 'FULL_BOX_SINGLE_DATE' });

  assert.equal(state?.orders.length || 0, 0);
});
