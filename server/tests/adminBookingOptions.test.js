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
  const originalEventFind = Event.find;
  const originalConsoleError = console.error;
  const distinctCalls = [];
  const eventId = new mongoose.Types.ObjectId(EVENT_ID);

  Booking.distinct = async (field, match) => {
    distinctCalls.push({ field, match });
    if (field === 'event') return [eventId];
    if (field === 'eventSnapshot._id') return [];
    if (field === 'ticketType') {
      return match.$and?.some((clause) => clause.$or) ? ['General Pass'] : ['Annie Musical Seat', 'General Pass'];
    }
    return [];
  };

  Event.find = () => ({
    select() { return this; },
    sort() { return this; },
    async lean() { return [{ _id: eventId, title: 'NUSC Home Match vs Dempo SC', category: 'Sports' }]; },
  });

  t.after(() => {
    Booking.distinct = originalDistinct;
    Event.find = originalEventFind;
    console.error = originalConsoleError;
  });

  const allEventsResponse = makeResponse();
  await adminBookingsController.getBookingOptions({ query: {} }, allEventsResponse);
  assert.deepEqual(allEventsResponse.body.ticketTypes, ['Annie Musical Seat', 'General Pass']);

  distinctCalls.length = 0;
  const selectedEventResponse = makeResponse();
  await adminBookingsController.getBookingOptions({ query: { ticketTypeEventId: EVENT_ID } }, selectedEventResponse);

  assert.equal(selectedEventResponse.statusCode, 200);
  assert.deepEqual(selectedEventResponse.body.ticketTypes, ['General Pass']);
  const ticketTypeCall = distinctCalls.find(({ field }) => field === 'ticketType');
  assert.equal(ticketTypeCall.match.$and[0].$or[0].event.toString(), EVENT_ID);
  assert.equal(ticketTypeCall.match.$and[0].$or[1]['eventSnapshot._id'].toString(), EVENT_ID);
  assert.equal(distinctCalls.find(({ field }) => field === 'event').match.$and, undefined);

  const invalidEventResponse = makeResponse();
  console.error = () => {};
  await adminBookingsController.getBookingOptions({ query: { ticketTypeEventId: 'invalid-id' } }, invalidEventResponse);
  assert.equal(invalidEventResponse.statusCode, 400);
});
