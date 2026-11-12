const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const adminBookingsController = require('../controllers/adminBookingsController');

const EVENT_ID = '64b000000000000000000001';

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('Admin booking ticket type options are scoped to the selected event', async (t) => {
  const originalDistinct = Booking.distinct;
  const originalAggregate = Booking.aggregate;
  const originalEventFind = Event.find;
  const originalConsoleError = console.error;
  const distinctCalls = [];
  const aggregateCalls = [];
  const eventId = new mongoose.Types.ObjectId(EVENT_ID);
  const nuscTicketCategories = [
    { ticketType: 'General Pass', seasonPassType: null },
    { ticketType: 'Premium Pass', seasonPassType: null },
    { ticketType: 'United Suite — Single pass', seasonPassType: null },
    { ticketType: 'United Suite — Full Box', seasonPassType: null },
    { ticketType: 'United Suite - Single Match', seasonPassType: null },
    { ticketType: 'General Pass', seasonPassType: 'general-season' },
    { ticketType: 'Premium Pass', seasonPassType: 'premium-season' },
  ];

  Booking.distinct = async (field, match) => {
    distinctCalls.push({ field, match });
    if (field === 'event') return [eventId];
    if (field === 'eventSnapshot._id') return [];
    if (field === 'ticketType') {
      return match.$and?.some((clause) => clause.$or) ? ['General Pass'] : ['Annie Musical Seat', 'General Pass'];
    }
    return [];
  };
  Booking.aggregate = (pipeline) => {
    aggregateCalls.push(pipeline);
    return {
      allowDiskUse() { return this; },
      async exec() {
        const isScoped = JSON.stringify(pipeline[0]?.$match || {}).includes(EVENT_ID);
        if (pipeline.some((stage) => stage.$group)) {
          return (isScoped ? nuscTicketCategories : [...nuscTicketCategories, { ticketType: 'Annie Musical Seat', seasonPassType: null }])
            .map(({ ticketType, seasonPassType }) => ({ _id: { ticketType, seasonPassType } }));
        }
        return [{ totals: [], statuses: [], sources: [] }];
      },
    };
  };

  Event.find = () => ({
    select() { return this; },
    sort() { return this; },
    async lean() { return [{ _id: eventId, title: 'NUSC Home Match vs Dempo SC', category: 'Sports' }]; },
  });

  t.after(() => {
    Booking.distinct = originalDistinct;
    Booking.aggregate = originalAggregate;
    Event.find = originalEventFind;
    console.error = originalConsoleError;
  });

  const allEventsResponse = makeResponse();
  await adminBookingsController.getBookingOptions({ query: {} }, allEventsResponse);
  assert.deepEqual(allEventsResponse.body.ticketTypes, ['Annie Musical Seat', 'General Pass']);
  assert.deepEqual(allEventsResponse.body.ticketCategories.map(({ label }) => label), [
    'General Pass',
    'Premium Pass',
    'United Suite — Single pass',
    'United Suite — Full Box',
    'United Suite - Single Match',
    'General Season Pass',
    'Premium Season Pass',
    'Annie Musical Seat',
  ]);

  distinctCalls.length = 0;
  const selectedEventResponse = makeResponse();
  await adminBookingsController.getBookingOptions({ query: { ticketTypeEventId: EVENT_ID } }, selectedEventResponse);

  assert.equal(selectedEventResponse.statusCode, 200);
  assert.deepEqual(selectedEventResponse.body.ticketTypes, ['General Pass']);
  assert.deepEqual(selectedEventResponse.body.ticketCategories.map(({ label }) => label), [
    'General Pass',
    'Premium Pass',
    'United Suite — Single pass',
    'United Suite — Full Box',
    'United Suite - Single Match',
    'General Season Pass',
    'Premium Season Pass',
  ]);
  const ticketTypeCall = distinctCalls.find(({ field }) => field === 'ticketType');
  assert.equal(ticketTypeCall.match.$and[0].$or[0].event.toString(), EVENT_ID);
  assert.equal(ticketTypeCall.match.$and[0].$or[1]['eventSnapshot._id'].toString(), EVENT_ID);
  assert.equal(distinctCalls.find(({ field }) => field === 'event').match.$and, undefined);
  const selectedTicketCategoryPipeline = aggregateCalls.filter((pipeline) => pipeline.some((stage) => stage.$group)).at(-1);
  assert.equal(selectedTicketCategoryPipeline[0].$match.$and[0].$or[0].event.toString(), EVENT_ID);

  const invalidEventResponse = makeResponse();
  console.error = () => {};
  await adminBookingsController.getBookingOptions({ query: { ticketTypeEventId: 'invalid-id' } }, invalidEventResponse);
  assert.equal(invalidEventResponse.statusCode, 400);
});

test('Admin booking category filters separate single-match passes from season passes', async (t) => {
  const originalAggregate = Booking.aggregate;
  const originalConsoleError = console.error;
  const matches = [];
  Booking.aggregate = (pipeline) => ({
    allowDiskUse() { return this; },
    async exec() {
      matches.push(pipeline[0].$match);
      return [{ totals: [], statuses: [], sources: [] }];
    },
  });
  console.error = () => {};
  t.after(() => {
    Booking.aggregate = originalAggregate;
    console.error = originalConsoleError;
  });

  const singleMatchResponse = makeResponse();
  await adminBookingsController.getBookingStats({ query: { ticketCategory: 'ticket:General Pass' } }, singleMatchResponse);
  assert.equal(singleMatchResponse.statusCode, 200);
  assert.deepEqual(matches[0].$and[0], {
    ticketType: 'General Pass',
    $or: [{ nuscSeasonPassType: { $exists: false } }, { nuscSeasonPassType: null }],
  });

  const seasonPassResponse = makeResponse();
  await adminBookingsController.getBookingStats({ query: { ticketCategory: 'season:general-season' } }, seasonPassResponse);
  assert.equal(seasonPassResponse.statusCode, 200);
  assert.deepEqual(matches[1].$and[0], { nuscSeasonPassType: 'general-season' });
});
