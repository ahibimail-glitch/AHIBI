const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Scan = require('../models/Scan');
const Inventory = require('../models/NuscHomeMatchInventory');
const { checkInBooking } = require('../services/bookingCheckInService');

test('scan request IDs have a unique partial index scoped to ticket and event', () => {
  const requestIndex = Scan.schema.indexes().find(([keys]) =>
    keys.ticket === 1 && keys.event === 1 && keys.requestId === 1
  );
  assert.ok(requestIndex, 'check-in idempotency requires the compound Scan index');
  assert.equal(requestIndex[1].unique, true);
  assert.deepEqual(requestIndex[1].partialFilterExpression, { requestId: { $type: 'string' } });
});

const ids = {
  event: new mongoose.Types.ObjectId(),
  otherEvent: new mongoose.Types.ObjectId(),
  reservation: 'test-reservation',
  partnerBooking: new mongoose.Types.ObjectId(),
  partnerFailureBooking: new mongoose.Types.ObjectId(),
  ordinaryBooking: new mongoose.Types.ObjectId(),
  seasonBooking: new mongoose.Types.ObjectId(),
  cancelledBooking: new mongoose.Types.ObjectId(),
  ordinaryUser: new mongoose.Types.ObjectId(),
  seasonUser: new mongoose.Types.ObjectId(),
  scannerStaff: new mongoose.Types.ObjectId(),
  staff: new mongoose.Types.ObjectId(),
};

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value);
  if (value instanceof mongoose.Types.ObjectId) return new mongoose.Types.ObjectId(String(value));
  if (Array.isArray(value)) return value.map(clone);
  return Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item !== 'function').map(([key, item]) => [key, clone(item)]));
}

function query(value) {
  return {
    session() { return this; },
    select() { return this; },
    lean() { return Promise.resolve(clone(value)); },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}

function setupModels(t) {
  const event = { _id: ids.event, ticketTypes: [{ name: 'General Pass', capacity: 600 }] };
  const otherEvent = { _id: ids.otherEvent, ticketTypes: [
    { name: 'General Pass', capacity: 600 },
    { name: 'General Season Pass', capacity: 5 },
  ] };
  const bookings = new Map([
    [String(ids.partnerBooking), {
      _id: ids.partnerBooking, event: ids.event, user: undefined, ticketType: 'General Pass', status: 'confirmed',
      paymentStatus: 'completed', entryVerified: false, nuscSeasonMatchIndex: 1, nuscGeneralZone: 'G-1',
    nuscPartnerTicket: { partnerId: 'nusc', memberReferenceHash: 'hash', reservationId: ids.reservation },
      async save() { bookings.set(String(this._id), this); },
    }],
    [String(ids.partnerFailureBooking), {
      _id: ids.partnerFailureBooking, event: ids.event, user: undefined, ticketType: 'General Pass', status: 'confirmed',
      paymentStatus: 'completed', entryVerified: false, nuscSeasonMatchIndex: 1, nuscGeneralZone: 'G-1',
    nuscPartnerTicket: { partnerId: 'nusc', memberReferenceHash: 'hash', reservationId: ids.reservation },
      async save() { bookings.set(String(this._id), this); },
    }],
    [String(ids.ordinaryBooking), {
      _id: ids.ordinaryBooking, event: ids.event, user: ids.ordinaryUser, ticketType: 'General Pass', status: 'confirmed',
      paymentStatus: 'completed',
      async save() { bookings.set(String(this._id), this); },
    }],
    [String(ids.seasonBooking), {
      _id: ids.seasonBooking, event: ids.event, user: ids.seasonUser, ticketType: 'General Season Pass', status: 'confirmed',
      paymentStatus: 'completed',
      async save() { bookings.set(String(this._id), this); },
    }],
    [String(ids.cancelledBooking), {
      _id: ids.cancelledBooking, event: ids.event, user: ids.ordinaryUser, ticketType: 'General Pass', status: 'cancelled',
      paymentStatus: 'refunded',
      async save() { bookings.set(String(this._id), this); },
    }],
  ]);
  const scans = [];
  let transactionQueue = Promise.resolve();
  const reservation = {
    reservationId: ids.reservation, status: 'issued', ticketType: 'General Pass', zone: 'G-1', memberReferenceHash: 'hash',
    bookingIds: [ids.partnerBooking, ids.partnerFailureBooking], eventIds: [ids.event],
  };
  const inventoryDoc = { partnerSeasonPassReservations: [reservation] };

  const original = {
    startSession: mongoose.startSession,
    bookingFindById: Booking.findById,
    eventFindById: Event.findById,
    inventoryFindOne: Inventory.findOne,
    scanFindOne: Scan.findOne,
    scanCountDocuments: Scan.countDocuments,
    scanCreate: Scan.create,
  };
  mongoose.startSession = async () => ({
    async withTransaction(callback) {
      let releaseTransaction;
      const previousTransaction = transactionQueue;
      transactionQueue = new Promise((resolve) => { releaseTransaction = resolve; });
      await previousTransaction;
      const snapshotBookings = new Map([...bookings].map(([id, value]) => [id, clone(value)]));
      const snapshotScans = clone(scans);
      try {
        await callback();
      } catch (error) {
        bookings.clear();
        for (const [id, value] of snapshotBookings) bookings.set(id, value);
        scans.splice(0, scans.length, ...snapshotScans);
        throw error;
      } finally {
        releaseTransaction();
      }
    },
    async endSession() {},
  });
  Booking.findById = (id) => {
    const source = bookings.get(String(id));
    if (!source) return query(null);
    const document = clone(source);
    document.increment = () => { document.__v = (document.__v || 0) + 1; };
    document.save = async () => bookings.set(String(document._id), document);
    return query(document);
  };
  Event.findById = (id) => query(String(id) === String(event._id) ? event : String(id) === String(otherEvent._id) ? otherEvent : null);
  Inventory.findOne = () => query(inventoryDoc);
  Scan.findOne = (filter) => query(scans.find((scan) =>
    String(scan.ticket) === String(filter.ticket) &&
    String(scan.event) === String(filter.event) &&
    scan.requestId === filter.requestId
  ) || null);
  Scan.countDocuments = (filter) => query(scans.filter((scan) =>
    String(scan.ticket) === String(filter.ticket) && String(scan.event) === String(filter.event)
  ).length);
  Scan.create = async (docs) => {
    const created = docs.map((doc) => ({ ...doc, _id: new mongoose.Types.ObjectId(), timestamp: new Date() }));
    scans.push(...created);
    return created;
  };

  t.after(() => {
    mongoose.startSession = original.startSession;
    Booking.findById = original.bookingFindById;
    Event.findById = original.eventFindById;
    Inventory.findOne = original.inventoryFindOne;
    Scan.findOne = original.scanFindOne;
    Scan.countDocuments = original.scanCountDocuments;
    Scan.create = original.scanCreate;
  });
  return { bookings, scans, event, otherEvent, ids };
}

test('accountless NUSC partner ticket checks in through its issued reservation', async (t) => {
  const db = setupModels(t);
  const result = await checkInBooking({
    bookingId: String(ids.partnerBooking), eventId: String(ids.event), requestId: 'partner-checkin-0001', staffId: ids.staff,
  });
  const booking = db.bookings.get(String(ids.partnerBooking));
  assert.equal(result.status, 'CHECKED_IN');
  assert.equal(booking.user, undefined);
  assert.equal(booking.entryVerified, true);
  assert.equal(booking.status, 'checked-in');
  assert.equal(db.scans.length, 1);
  assert.equal(db.scans[0].partnerId, 'nusc');
});

test('ordinary AHIBI booking retains its user-linked check-in', async (t) => {
  const db = setupModels(t);
  const result = await checkInBooking({
    bookingId: String(ids.ordinaryBooking), eventId: String(ids.event), requestId: 'ordinary-checkin-0001', staffId: ids.staff,
  });
  assert.equal(result.status, 'CHECKED_IN');
  assert.equal(db.bookings.get(String(ids.ordinaryBooking)).status, 'checked-in');
  assert.equal(String(db.scans[0].user), String(ids.ordinaryUser));
  assert.equal(db.scans[0].partnerId, undefined);
  assert.equal(db.bookings.get(String(ids.ordinaryBooking)).scannerCheckInRequests[0].requestId, 'ordinary-checkin-0001');
});

test('season-pass booking checks in against a selected event different from its booking event', async (t) => {
  const db = setupModels(t);
  const result = await checkInBooking({
    bookingId: String(ids.seasonBooking), eventId: String(ids.otherEvent), requestId: 'season-checkin-0001',
  });
  assert.equal(result.status, 'CHECKED_IN');
  assert.equal(String(db.scans[0].ticket), String(ids.seasonBooking));
  assert.equal(String(db.scans[0].event), String(ids.otherEvent));
  assert.equal(String(db.bookings.get(String(ids.seasonBooking)).scannerCheckInRequests[0].event), String(ids.otherEvent));
  assert.equal(db.scans.length, 1);
});

test('scanner check-ins are attributed to the scanner account on the scan record', async (t) => {
  const db = setupModels(t);
  const result = await checkInBooking({
    bookingId: String(ids.ordinaryBooking), eventId: String(ids.event), requestId: 'scanner-checkin-0001',
    scannerStaffId: String(ids.scannerStaff),
  });
  assert.equal(result.status, 'CHECKED_IN');
  assert.equal(String(db.scans[0].scannerStaff), String(ids.scannerStaff));
});

test('cancelled bookings cannot be checked in', async (t) => {
  const db = setupModels(t);
  await assert.rejects(
    checkInBooking({
      bookingId: String(ids.cancelledBooking), eventId: String(ids.event), requestId: 'cancelled-checkin-0001',
    }),
    (error) => error.code === 'BOOKING_NOT_ACTIVE',
  );
  assert.equal(db.scans.length, 0);
});

test('wrong-event scans are rejected without a scan write', async (t) => {
  const db = setupModels(t);
  await assert.rejects(
    checkInBooking({ bookingId: String(ids.partnerBooking), eventId: String(ids.otherEvent), requestId: 'wrong-event-0001' }),
    (error) => error.code === 'EVENT_MISMATCH',
  );
  assert.equal(db.scans.length, 0);
});

test('retries with the same request ID return the original scan and partner tickets reject a new second-entry request', async (t) => {
  const db = setupModels(t);
  const input = { bookingId: String(ids.partnerBooking), eventId: String(ids.event), requestId: 'repeat-checkin-0001' };
  const first = await checkInBooking(input);
  const retry = await checkInBooking(input);
  assert.equal(retry.idempotentReplay, true);
  assert.equal(retry.checkedInAt.toISOString(), first.checkedInAt.toISOString());
  assert.equal(db.scans.length, 1);
  await assert.rejects(
    checkInBooking({ ...input, requestId: 'repeat-checkin-0002' }),
    (error) => error.code === 'TICKET_ALREADY_USED',
  );
  assert.equal(db.scans.length, 1);
});

test('a same-ID retry after checkout cannot recreate the deleted attendance scan', async (t) => {
  const db = setupModels(t);
  const input = {
    bookingId: String(ids.ordinaryBooking),
    eventId: String(ids.event),
    requestId: 'retry-after-checkout-0001',
  };
  await checkInBooking(input);
  db.scans.splice(0, db.scans.length);

  await assert.rejects(
    checkInBooking(input),
    (error) => error.code === 'CHECK_IN_REQUEST_NO_LONGER_ACTIVE',
  );
  assert.equal(db.scans.length, 0);
});

test('parallel attempts with the same request ID create only one scan', async (t) => {
  const db = setupModels(t);
  const input = { bookingId: String(ids.ordinaryBooking), eventId: String(ids.event), requestId: 'parallel-checkin-0001' };
  const results = await Promise.all([checkInBooking(input), checkInBooking(input)]);

  assert.equal(db.scans.length, 1);
  assert.deepEqual(results.map((result) => result.status), ['CHECKED_IN', 'CHECKED_IN']);
  assert.equal(results.filter((result) => result.idempotentReplay).length, 1);
});

test('concurrent distinct request IDs cannot exceed a single-entry ticket capacity', async (t) => {
  const db = setupModels(t);
  db.event.ticketTypes[0].capacity = 1;
  const attempts = await Promise.allSettled([
    checkInBooking({
      bookingId: String(ids.ordinaryBooking), eventId: String(ids.event), requestId: 'capacity-checkin-0001',
    }),
    checkInBooking({
      bookingId: String(ids.ordinaryBooking), eventId: String(ids.event), requestId: 'capacity-checkin-0002',
    }),
  ]);

  assert.equal(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
  assert.equal(attempts.filter((attempt) => attempt.status === 'rejected' && attempt.reason.code === 'TICKET_EXHAUSTED').length, 1);
  assert.equal(db.scans.length, 1);
});

test('failure after scan insertion rolls back scan and booking updates', async (t) => {
  const db = setupModels(t);
  const before = clone(db.bookings.get(String(ids.partnerFailureBooking)));
  await assert.rejects(
    checkInBooking({
      bookingId: String(ids.partnerFailureBooking), eventId: String(ids.event), requestId: 'failure-checkin-0001',
    }, { afterScan: async () => { throw new Error('injected failure'); } }),
    /injected failure/,
  );
  assert.equal(db.scans.length, 0);
  assert.equal(db.bookings.get(String(ids.partnerFailureBooking)).status, before.status);
  assert.equal(db.bookings.get(String(ids.partnerFailureBooking)).entryVerified, before.entryVerified);
});
