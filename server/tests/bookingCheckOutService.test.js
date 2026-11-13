const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Scan = require('../models/Scan');
const { CheckOutError, checkOutBooking } = require('../services/bookingCheckOutService');

const ids = {
  booking: new mongoose.Types.ObjectId(),
  event: new mongoose.Types.ObjectId(),
  otherEvent: new mongoose.Types.ObjectId(),
};

function setupModels(t, { scans = [] } = {}) {
  const booking = {
    _id: ids.booking,
    event: ids.event,
    ticketType: 'General Pass',
    status: 'checked-in',
    async save() {},
  };
  const event = { ticketTypes: [{ name: 'General Pass', capacity: 2 }] };
  const original = {
    bookingFindById: Booking.findById,
    eventFindById: Event.findById,
    scanFind: Scan.find,
    scanFindByIdAndDelete: Scan.findByIdAndDelete,
    scanCountDocuments: Scan.countDocuments,
  };

  Booking.findById = async (bookingId) => String(bookingId) === String(ids.booking) ? booking : null;
  Event.findById = async (eventId) => String(eventId) === String(ids.event) ? event : null;
  Scan.find = (filter) => {
    const matchingScans = scans.filter((scan) =>
      String(scan.ticket) === String(filter.ticket) &&
      (!filter.event || String(scan.event) === String(filter.event))
    );
    return {
      sort(sortOrder) {
        assert.deepEqual(sortOrder, { timestamp: -1 });
        matchingScans.sort((left, right) => right.timestamp - left.timestamp);
        return this;
      },
      async limit(count) { return matchingScans.slice(0, count); },
    };
  };
  Scan.findByIdAndDelete = async (scanId) => {
    const index = scans.findIndex((scan) => String(scan._id) === String(scanId));
    if (index >= 0) scans.splice(index, 1);
  };
  Scan.countDocuments = async (filter) => scans.filter((scan) =>
    String(scan.ticket) === String(filter.ticket) &&
    (!filter.event || String(scan.event) === String(filter.event))
  ).length;

  t.after(() => {
    Booking.findById = original.bookingFindById;
    Event.findById = original.eventFindById;
    Scan.find = original.scanFind;
    Scan.findByIdAndDelete = original.scanFindByIdAndDelete;
    Scan.countDocuments = original.scanCountDocuments;
  });
  return { booking, scans };
}

test('check-out frees the latest entry only for the selected event', async (t) => {
  const now = Date.now();
  const db = setupModels(t, { scans: [
    { _id: new mongoose.Types.ObjectId(), ticket: ids.booking, event: ids.event, timestamp: new Date(now - 2000) },
    { _id: new mongoose.Types.ObjectId(), ticket: ids.booking, event: ids.event, timestamp: new Date(now - 1000) },
    { _id: new mongoose.Types.ObjectId(), ticket: ids.booking, event: ids.otherEvent, timestamp: new Date(now) },
  ] });
  const mostRecentForSelectedEvent = db.scans[1]._id;

  const result = await checkOutBooking({ bookingId: String(ids.booking), eventId: String(ids.event) });

  assert.equal(result.status, 'VALID');
  assert.equal(result.capacity, 2);
  assert.equal(result.usedEntries, 1);
  assert.equal(result.remainingEntries, 1);
  assert.equal(db.scans.some((scan) => String(scan._id) === String(mostRecentForSelectedEvent)), false);
  assert.equal(db.scans.length, 2);
  assert.equal(db.booking.status, 'checked-in');
  assert.ok(db.booking.checkedOutAt instanceof Date);
});

test('check-out rejects an event that does not own the booking', async (t) => {
  const db = setupModels(t, { scans: [
    { _id: new mongoose.Types.ObjectId(), ticket: ids.booking, event: ids.event, timestamp: new Date() },
  ] });

  await assert.rejects(
    checkOutBooking({ bookingId: String(ids.booking), eventId: String(ids.otherEvent) }),
    (error) => error instanceof CheckOutError && error.status === 409 && error.code === 'EVENT_MISMATCH'
  );
  assert.equal(db.scans.length, 1);
});
