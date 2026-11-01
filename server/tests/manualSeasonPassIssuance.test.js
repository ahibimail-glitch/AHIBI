const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const server = path.resolve(__dirname, '..');

function query(value) {
  return {
    select() { return this; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}

test('existing season pass issuance creates exactly ten idempotent offline Booking rows', async (t) => {
  const events = Array.from({ length: 10 }, (_, index) => ({
    _id: `event-${index + 1}`,
    slug: `nusc-home-match-2026${String(index + 1).padStart(2, '0')}14`,
    title: `NUSC home match ${index + 1}`,
    banner: '',
    startDate: new Date('2027-01-01T12:00:00Z'),
    location: { address: 'Stadium', city: 'Kohima' },
    ticketTypes: [{ name: 'General Pass', sold: 0 }],
    async save() {},
  }));
  const bookings = [];
  let nextId = 1;
  class MockBooking {
    constructor(data) { Object.assign(this, data); this._id = `booking-${nextId++}`; }
    async save() {
      if (bookings.some((item) => item.manualSeasonPassOrderId === this.manualSeasonPassOrderId
        && item.manualSeasonPassMatchIndex === this.manualSeasonPassMatchIndex)) {
        const error = new Error('duplicate key'); error.code = 11000; throw error;
      }
      bookings.push(this);
    }
  }
  MockBooking.init = async () => {};
  MockBooking.findOne = (filter) => query(bookings.find((booking) =>
    booking.manualSeasonPassOrderId === filter.manualSeasonPassOrderId
      && booking.manualSeasonPassMatchIndex === filter.manualSeasonPassMatchIndex
  ) || null);
  MockBooking.countDocuments = async (filter) => bookings.filter((booking) =>
    String(booking.event) === String(filter.event)
      && booking.ticketType === filter.ticketType
      && filter.status.$in.includes(booking.status)
      && booking.paymentStatus === filter.paymentStatus
  ).length;
  MockBooking.updateMany = async (filter, update) => {
    let modifiedCount = 0;
    for (const booking of bookings) {
      if (booking.manualSeasonPassOrderId === filter.manualSeasonPassOrderId
        && booking._id !== filter._id.$ne && !booking.parentBookingId) {
        Object.assign(booking, update.$set);
        modifiedCount += 1;
      }
    }
    return { modifiedCount };
  };
  const MockEvent = { findById: (id) => query(events.find((event) => event._id === id) || null) };

  const modulePaths = [
    require.resolve(path.join(server, 'models/Booking')),
    require.resolve(path.join(server, 'models/Event')),
  ];
  const originals = new Map();
  for (const [filename, exports] of [[modulePaths[0], MockBooking], [modulePaths[1], MockEvent]]) {
    originals.set(filename, require.cache[filename]);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
  }
  const issuerPath = require.resolve(path.join(server, 'services/nuscSeasonPassBookingService'));
  originals.set(issuerPath, require.cache[issuerPath]);
  delete require.cache[issuerPath];
  const { createSeasonPassTicketRecords } = require(issuerPath);
  t.after(() => {
    for (const [filename, cached] of originals) {
      if (cached) require.cache[filename] = cached;
      else delete require.cache[filename];
    }
  });

  const fixtures = events.map((event, index) => ({
    eventId: event._id,
    matchDate: `2026-${String(index + 1).padStart(2, '0')}-14`,
    matchIndex: index + 1,
    ticketType: 'General Pass',
  }));
  const input = {
    orderId: 'manual-order-1',
    userId: 'user-1',
    fixtures,
    passId: 'general-season',
    quantity: 1,
    paymentProvider: 'manual',
    zone: 'G-1',
    manualOrderId: 'manual-order-1',
    pricePerMatch: 382.52,
    settlementType: 'paid',
    modeOfPayment: 'UPI',
  };

  const first = await createSeasonPassTicketRecords(input);
  const retry = await createSeasonPassTicketRecords(input);
  assert.equal(first.bookings.length, 10);
  assert.deepEqual(retry.bookingIds, first.bookingIds);
  assert.equal(bookings.length, 10);
  assert.equal(new Set(bookings.map((booking) => booking.event)).size, 10);
  assert.equal(bookings.every((booking) => booking.paymentProvider === 'manual'), true);
  assert.equal(bookings.every((booking) => booking.price === 382.52 && booking.modeOfPayment === 'UPI'), true);
  assert.equal(bookings.every((booking) => booking.nuscGeneralZone === 'G-1'), true);
  assert.equal(bookings.every((booking) => !Object.hasOwn(booking, 'paymentId')
    && !Object.hasOwn(booking, 'razorpayPaymentId')
    && !Object.hasOwn(booking, 'razorpayOrderId')), true);
});
