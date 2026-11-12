const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.NUSC_HOME_MATCH_TEST_MODE = 'true';
process.env.NUSC_HOME_MATCH_TICKET_SALES_ENABLED = 'true';
process.env.RAZORPAY_KEY_ID = 'rzp_test_ticket_availability';
process.env.MONGO_URI = 'mongodb://localhost:27017/ahibi-test';

const InventoryModel = require('../models/NuscHomeMatchInventory');
const Booking = require('../models/Booking');
const inventory = require('../services/nuscHomeMatchInventoryService');
const { parseConfirmedBoxes } = require('../config/unitedSuiteBoxes');

let state;

InventoryModel.updateOne = async (filter, update, options = {}) => {
  if (!state && options.upsert) {
    state = {
      _id: 'test-inventory',
      __v: 0,
      ...update.$setOnInsert,
      seasonPassHistoryInitializedAt: new Date(),
    };
    return { modifiedCount: 1, upsertedCount: 1 };
  }
  if (!state || state.__v !== filter.__v) return { modifiedCount: 0 };
  Object.assign(state, update.$set);
  state.__v += update.$inc.__v;
  return { modifiedCount: 1 };
};
InventoryModel.findOne = () => ({ lean: async () => state && JSON.parse(JSON.stringify(state)) });

const firstDate = inventory.FIXTURE_DATES[0];
const adminId = '507f1f77bcf86cd799439011';

test.beforeEach(() => {
  state = null;
});

test('General Pass zone capacities match the requested 2,800 seats', () => {
  assert.deepEqual(inventory.GENERAL_SEATING_AREAS.map(({ name, capacity }) => [name, capacity]), [
    ['G-1', 550], ['G-2', 550], ['G-3', 450], ['G-4', 650], ['G-5', 600], ['G-6', 0],
  ]);
  assert.equal(inventory.TICKET_CAPACITIES['General Pass'], 2800);
});

test('admin overview includes each General Pass zone and keeps unconfigured G-6 closed', async () => {
  const overview = await inventory.getAdminCapacityOverview({ matches: [{
    matchDate: firstDate,
    ticketTypes: [{ name: 'General Pass', quantity: 2800, sold: 0 }],
  }] });

  assert.deepEqual(overview.fixtures[0].generalZones.map(({ zone, capacity, availabilityLimit }) => (
    [zone, capacity, availabilityLimit]
  )), [
    ['G-1', 550, 550],
    ['G-2', 550, 550],
    ['G-3', 450, 450],
    ['G-4', 650, 650],
    ['G-5', 600, 600],
    ['G-6', 0, 0],
  ]);

  await assert.rejects(() => inventory.setAvailabilityOverride({
    matchDate: firstDate,
    ticketType: 'General Pass',
    zone: 'G-6',
    availability: 1,
    adminId,
  }), { code: 'INVALID_AVAILABILITY' });
});

test('admin sale availability remains separate from total capacity and limits checkout', async () => {
  const ticketTypes = [{ name: 'General Pass', quantity: 2800, sold: 20 }];
  await inventory.setAvailabilityOverride({
    matchDate: firstDate,
    ticketType: 'General Pass',
    availability: 100,
    soldCount: 20,
    adminId,
  });

  const publicTickets = await inventory.getMatchAvailability(firstDate, ticketTypes);
  assert.equal(publicTickets.find((ticket) => ticket.name === 'General Pass')?.quantity, 80);
  const overview = await inventory.getAdminCapacityOverview({ matches: [{ matchDate: firstDate, ticketTypes }] });
  const general = overview.fixtures[0].capacities.find((row) => row.ticketType === 'General Pass' && !row.zone);
  assert.equal(general?.capacity, 2800);
  assert.equal(general?.availabilityLimit, 100);
  assert.equal(general?.available, 80);
});

test('season pass sale availability is enforced separately from its quota', async () => {
  await inventory.setAvailabilityOverride({
    ticketType: 'General Season Pass',
    availability: 2,
    adminId,
  });

  const listing = await inventory.getMatchAvailability(firstDate, [{ name: 'General Pass', quantity: 2800, sold: 0 }]);
  assert.equal(listing[0]?.seasonPassRemaining, 2);
  const matches = inventory.FIXTURE_DATES.map((matchDate) => ({
    matchDate,
    ticketTypes: [{ name: 'General Pass', quantity: 2800, sold: 0 }],
  }));
  await assert.rejects(() => inventory.reserveSeasonPassOrder({
    orderId: 'general-season-availability-limit',
    userId: 'season-buyer',
    ticketType: 'General Pass',
    quantity: 3,
    zone: 'G-1',
    matches,
  }), { code: 'SEASON_PASS_LIMIT_REACHED' });
});

test('General zone sale limits are enforced independently at checkout', async () => {
  const ticketTypes = [{ name: 'General Pass', quantity: 2800, sold: 10 }];
  await inventory.setAvailabilityOverride({
    matchDate: firstDate,
    ticketType: 'General Pass',
    zone: 'G-1',
    availability: 20,
    soldCount: 10,
    adminId,
  });

  const general = (await inventory.getMatchAvailability(firstDate, ticketTypes)).find((ticket) => ticket.name === 'General Pass');
  assert.equal(general.zones.find((zone) => zone.name === 'G-1')?.available, 10);
  await inventory.reserveMatchOrder({
    orderId: 'g1-limit-order',
    userId: 'buyer-1',
    matchDate: firstDate,
    ticketLines: [{ ticketType: 'General Pass', quantity: 10, zone: 'G-1' }],
    eventTicketTypes: ticketTypes,
  });
  await assert.rejects(() => inventory.reserveMatchOrder({
    orderId: 'g1-over-limit',
    userId: 'buyer-2',
    matchDate: firstDate,
    ticketLines: [{ ticketType: 'General Pass', quantity: 1, zone: 'G-1' }],
    eventTicketTypes: ticketTypes,
  }), { code: 'GENERAL_ZONE_UNAVAILABLE' });
});

test('existing booking zone sales flow into public and admin availability', async () => {
  const originalAggregate = Booking.aggregate;
  Booking.aggregate = async (pipeline) => {
    assert.deepEqual(pipeline[1].$group.count, { $sum: { $ifNull: ['$quantity', 1] } });
    return [{ _id: { event: 'match-event', zone: 'G-2' }, count: 5 }];
  };

  try {
    const ticketTypes = [{ name: 'General Pass', quantity: 2800, sold: 5 }];
    const publicGeneral = (await inventory.getMatchAvailability(firstDate, ticketTypes, { eventId: 'match-event' }))
      .find((ticket) => ticket.name === 'General Pass');
    assert.equal(publicGeneral.zones.find((zone) => zone.name === 'G-2')?.available, 545);
    assert.equal(publicGeneral.zones.find((zone) => zone.name === 'G-1')?.available, 550);

    const overview = await inventory.getAdminCapacityOverview({ matches: [{
      matchDate: firstDate,
      ticketTypes,
      zoneSoldCounts: { 'G-2': 5 },
    }] });
    const zone = overview.fixtures[0].generalZones.find((row) => row.zone === 'G-2');
    assert.equal(zone?.sold, 5);
    assert.equal(zone?.held, 0);
    assert.equal(zone?.available, 545);
  } finally {
    Booking.aggregate = originalAggregate;
  }
});

test('Single Match offers two eight-guest boxes per fixture and allocates them separately', async () => {
  const first = await inventory.getMatchAvailability(firstDate);
  assert.equal(first.find((ticket) => ticket.name === inventory.SUITE_SINGLE_MATCH)?.quantity, 2);
  assert.equal(first.find((ticket) => ticket.name === inventory.SUITE_SINGLE_MATCH)?.capacity, 8);

  for (let index = 0; index < 2; index += 1) {
    await inventory.reserveMatchOrder({
      orderId: `single-match-${index}`,
      userId: `buyer-${index}`,
      matchDate: firstDate,
      ticketLines: [{ ticketType: inventory.SUITE_SINGLE_MATCH, quantity: 1 }],
      eventTicketTypes: [],
    });
  }
  const allocations = state.orders.flatMap((order) => order.suiteAllocations);
  assert.equal(allocations.length, 2);
  assert.equal(new Set(allocations.map((allocation) => allocation.boxNumber)).size, 2);
  assert.ok(allocations.every((allocation) => inventory.getBoxGuestCapacity(allocation.boxNumber) === 8));
  assert.equal((await inventory.getMatchAvailability(firstDate)).find((ticket) => ticket.name === inventory.SUITE_SINGLE_MATCH)?.quantity, 0);
  assert.equal((await inventory.getMatchAvailability(inventory.FIXTURE_DATES[1])).find((ticket) => ticket.name === inventory.SUITE_SINGLE_MATCH)?.quantity, 2);
});

test('Full Box offers four ten-guest boxes per fixture and stops after four holds', async () => {
  const listing = await inventory.getMatchAvailability(firstDate, [{ name: inventory.SUITE_FULL_BOX, quantity: 4, sold: 0 }]);
  const fullBox = listing.find((ticket) => ticket.name === inventory.SUITE_FULL_BOX);
  assert.equal(fullBox.quantity, 4);
  assert.equal(fullBox.capacity, 10);

  for (let index = 0; index < 4; index += 1) {
    await inventory.reserveMatchOrder({
      orderId: `full-box-${index}`,
      userId: `buyer-${index}`,
      matchDate: firstDate,
      ticketLines: [{ ticketType: inventory.SUITE_FULL_BOX, quantity: 1 }],
      eventTicketTypes: [],
    });
  }
  const allocations = state.orders.flatMap((order) => order.suiteAllocations);
  assert.equal(allocations.length, 4);
  assert.equal(new Set(allocations.map((allocation) => allocation.boxNumber)).size, 4);
  assert.ok(allocations.every((allocation) => inventory.getBoxGuestCapacity(allocation.boxNumber) === 10));
  await assert.rejects(() => inventory.reserveMatchOrder({
    orderId: 'full-box-over-capacity',
    userId: 'buyer-5',
    matchDate: firstDate,
    ticketLines: [{ ticketType: inventory.SUITE_FULL_BOX, quantity: 1 }],
    eventTicketTypes: [],
  }), { code: 'SUITE_BOXES_UNAVAILABLE' });
});

test('Suite physical mapping is confirmed only with ten unique box numbers', () => {
  const boxes = [
    ...[1, 2, 3, 4].map((boxNumber) => ({ boxId: `legacy-box-${boxNumber}`, guestCapacity: 8, physicalNumber: boxNumber })),
    { boxId: 'unmapped-8-a', guestCapacity: 8, physicalNumber: 5 },
    { boxId: 'unmapped-8-b', guestCapacity: 8, physicalNumber: 6 },
    ...['a', 'b', 'c', 'd'].map((suffix, index) => ({ boxId: `unmapped-10-${suffix}`, guestCapacity: 10, physicalNumber: index + 7 })),
  ];
  assert.equal(parseConfirmedBoxes(JSON.stringify(boxes)).mappingConfirmed, true);
  assert.equal(parseConfirmedBoxes(JSON.stringify(boxes.map((box) => ({ ...box, physicalNumber: 1 })))).mappingConfirmed, false);
});
