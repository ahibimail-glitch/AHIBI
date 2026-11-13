const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Scan = require('../models/Scan');
const { CheckOutError, checkOutBooking } = require('../services/bookingCheckOutService');

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value);
  if (value instanceof mongoose.Types.ObjectId) return new mongoose.Types.ObjectId(String(value));
  if (Array.isArray(value)) return value.map(clone);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
}

function query(value) {
  return {
    session() { return this; },
    sort() { return this; },
    limit() { return this; },
    select() { return this; },
    lean() { return Promise.resolve(clone(value)); },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}

function setupModels(t, { capacity = 2, scans: initialScans = [] } = {}) {
  const ids = {
    booking: new mongoose.Types.ObjectId(),
    bookingEvent: new mongoose.Types.ObjectId(),
    selectedEvent: new mongoose.Types.ObjectId(),
    otherEvent: new mongoose.Types.ObjectId(),
    firstScan: new mongoose.Types.ObjectId(),
    targetScan: new mongoose.Types.ObjectId(),
    laterScan: new mongoose.Types.ObjectId(),
  };
  const booking = {
    _id: ids.booking,
    event: ids.bookingEvent,
    ticketType: 'General Season Pass',
    status: 'checked-in',
    async save() { bookings.set(String(this._id), clone(this)); },
  };
  const bookings = new Map([[String(ids.booking), booking]]);
  const scans = clone(initialScans.length ? initialScans : [
    { _id: ids.firstScan, ticket: ids.booking, event: ids.selectedEvent, timestamp: new Date('2026-11-12T10:00:00.000Z') },
    { _id: ids.targetScan, ticket: ids.booking, event: ids.selectedEvent, timestamp: new Date('2026-11-12T10:01:00.000Z') },
    { _id: new mongoose.Types.ObjectId(), ticket: ids.booking, event: ids.otherEvent, timestamp: new Date('2026-11-12T10:02:00.000Z') },
  ]);
  let transactionQueue = Promise.resolve();

  const original = {
    startSession: mongoose.startSession,
    bookingFindById: Booking.findById,
    eventFindById: Event.findById,
    scanFindOneAndDelete: Scan.findOneAndDelete,
    scanCountDocuments: Scan.countDocuments,
  };
  mongoose.startSession = async () => ({
    async withTransaction(callback) {
      let release;
      const previous = transactionQueue;
      transactionQueue = new Promise((resolve) => { release = resolve; });
      await previous;
      const bookingsBefore = new Map([...bookings].map(([id, value]) => [id, clone(value)]));
      const scansBefore = clone(scans);
      try {
        await callback();
      } catch (error) {
        bookings.clear();
        for (const [id, value] of bookingsBefore) bookings.set(id, value);
        scans.splice(0, scans.length, ...scansBefore);
        throw error;
      } finally {
        release();
      }
    },
    async endSession() {},
  });
  Booking.findById = (id) => {
    const source = bookings.get(String(id));
    if (!source) return query(null);
    const document = clone(source);
    document.increment = () => { document.__v = (document.__v || 0) + 1; };
    document.save = async () => bookings.set(String(document._id), clone(document));
    return query(document);
  };
  Event.findById = (id) => query(String(id) === String(ids.selectedEvent)
    ? { ticketTypes: [{ name: 'General Season Pass', capacity }] }
    : { ticketTypes: [{ name: 'General Season Pass', capacity }] });
  Scan.findOneAndDelete = (filter) => {
    const index = scans.findIndex((scan) =>
      String(scan._id) === String(filter._id) &&
      String(scan.ticket) === String(filter.ticket) &&
      (!filter.event || String(scan.event) === String(filter.event))
    );
    if (index === -1) return query(null);
    return query(scans.splice(index, 1)[0]);
  };
  Scan.countDocuments = (filter) => query(scans.filter((scan) =>
    String(scan.ticket) === String(filter.ticket) &&
    (!filter.event || String(scan.event) === String(filter.event))
  ).length);

  t.after(() => {
    mongoose.startSession = original.startSession;
    Booking.findById = original.bookingFindById;
    Event.findById = original.eventFindById;
    Scan.findOneAndDelete = original.scanFindOneAndDelete;
    Scan.countDocuments = original.scanCountDocuments;
  });
  return { ids, bookings, scans };
}

test('season-pass check-out atomically releases only the selected scan and same-target retries do not release another', async (t) => {
  const db = setupModels(t);
  const input = {
    bookingId: String(db.ids.booking),
    eventId: String(db.ids.selectedEvent),
    scanId: String(db.ids.targetScan),
  };

  const results = await Promise.all([checkOutBooking(input), checkOutBooking(input)]);

  assert.equal(db.scans.length, 2);
  assert.ok(db.scans.some((scan) => String(scan._id) === String(db.ids.firstScan)));
  assert.ok(db.scans.some((scan) => String(scan.event) === String(db.ids.otherEvent)));
  assert.equal(results.filter((result) => result.idempotentReplay).length, 1);
  assert.equal(results.every((result) => result.status === 'VALID'), true);
  assert.equal(results.find((result) => result.idempotentReplay).usedEntries, 1);
  assert.equal(db.bookings.get(String(db.ids.booking)).status, 'checked-in');
});

test('a stale checkout retry does not delete a later scan for the same ticket', async (t) => {
  const db = setupModels(t, { scans: [
    { _id: new mongoose.Types.ObjectId(), ticket: null, event: null, timestamp: new Date() },
  ] });
  db.scans[0].ticket = db.ids.booking;
  db.scans[0].event = db.ids.selectedEvent;
  db.scans[0]._id = db.ids.targetScan;

  const input = {
    bookingId: String(db.ids.booking),
    eventId: String(db.ids.selectedEvent),
    scanId: String(db.ids.targetScan),
  };
  await checkOutBooking(input);
  db.scans.push({ _id: db.ids.laterScan, ticket: db.ids.booking, event: db.ids.selectedEvent, timestamp: new Date() });

  const retry = await checkOutBooking(input);

  assert.equal(retry.idempotentReplay, true);
  assert.equal(db.scans.length, 1);
  assert.equal(String(db.scans[0]._id), String(db.ids.laterScan));
});

test('ordinary-ticket check-out still rejects a different event', async (t) => {
  const db = setupModels(t);
  const booking = db.bookings.get(String(db.ids.booking));
  booking.ticketType = 'General Pass';

  await assert.rejects(
    checkOutBooking({
      bookingId: String(db.ids.booking),
      eventId: String(new mongoose.Types.ObjectId()),
      scanId: String(new mongoose.Types.ObjectId()),
    }),
    (error) => error instanceof CheckOutError && error.code === 'EVENT_MISMATCH',
  );
});

test('check-out requires the specific verified scan record', async () => {
  await assert.rejects(
    checkOutBooking({ bookingId: String(new mongoose.Types.ObjectId()), eventId: String(new mongoose.Types.ObjectId()) }),
    (error) => error instanceof CheckOutError && error.code === 'INVALID_SCAN_ID',
  );
});
