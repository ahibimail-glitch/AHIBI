const test = require('node:test');
const assert = require('node:assert/strict');
const Booking = require('../models/Booking');
const Inventory = require('../models/NuscHomeMatchInventory');
const { postTicketPdf } = require('../controllers/nuscPartnerController');
const { authenticateNuscPartner, signedMessage } = require('../middlewares/nuscPartnerAuth');

const reservationId = `nsp_${'a'.repeat(40)}`;
const otherReservationId = `nsp_${'b'.repeat(40)}`;
const bookingId = '6a1234567890abcdef123456';
const eventId = '6a1234567890abcdef123457';
const attendee = { name: 'NUSC Test Member', email: 'member@example.test', phone: '+91 98765 43210' };

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; },
  };
}

function makeBooking(resId = reservationId) {
  return {
    _id: bookingId,
    event: { _id: eventId, title: 'NUSC Home Match vs Test FC', startDate: new Date('2026-11-14T10:00:00Z'), location: { address: 'Kohima' } },
    eventSnapshot: { _id: eventId, title: 'NUSC Home Match vs Test FC' },
    ticketType: 'Premium Pass',
    quantity: 1,
    price: 0,
    total: 0,
    status: 'confirmed',
    paymentStatus: 'completed',
    nuscPartnerTicket: { partnerId: 'nusc', reservationId: resId, ticketIndex: 1 },
  };
}

function stubReservation(doc) {
  Inventory.findOne = () => ({ lean: async () => doc });
}

function stubBooking(doc, queryLog) {
  Booking.findOne = (query) => {
    queryLog.push(query);
    return {
      populate() { return this; },
      lean: async () => doc,
    };
  };
}

test('partner PDF endpoint returns the branded PDF for an issued booking and does not persist attendee overrides', async (t) => {
  const originalInventoryFindOne = Inventory.findOne;
  const originalBookingFindOne = Booking.findOne;
  t.after(() => { Inventory.findOne = originalInventoryFindOne; Booking.findOne = originalBookingFindOne; });
  const reservation = { reservationId, status: 'issued', bookingIds: [bookingId], eventIds: [eventId], matchDates: ['2026-11-14'], ticketType: 'Premium Pass' };
  stubReservation({ partnerSeasonPassReservations: [reservation] });
  const booking = makeBooking();
  const before = structuredClone(booking);
  const queries = [];
  stubBooking(booking, queries);
  const req = { params: { reservationId, bookingId }, body: { attendee } };
  const res = response();

  await postTicketPdf(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'application/pdf');
  assert.match(res.headers['content-disposition'], /^attachment; filename="ahibi-ticket-[a-f0-9]{24}\.pdf"$/);
  assert.equal(res.headers['cache-control'], 'private, no-store, max-age=0');
  assert.equal(Buffer.isBuffer(res.body), true);
  assert.equal(res.body.subarray(0, 4).toString(), '%PDF');
  assert.deepEqual(booking, before);
  assert.equal(Object.hasOwn(booking, 'customerName'), false);
  assert.equal(queries[0]['nuscPartnerTicket.reservationId'], reservationId);
});

test('partner PDF endpoint returns not found for an unknown booking', async (t) => {
  const originalInventoryFindOne = Inventory.findOne;
  const originalBookingFindOne = Booking.findOne;
  t.after(() => { Inventory.findOne = originalInventoryFindOne; Booking.findOne = originalBookingFindOne; });
  stubReservation({ partnerSeasonPassReservations: [{ reservationId, status: 'issued', bookingIds: [], eventIds: [], matchDates: [] }] });
  let bookingLookup = false;
  Booking.findOne = () => { bookingLookup = true; throw new Error('should not query booking'); };
  const res = response();
  await postTicketPdf({ params: { reservationId, bookingId }, body: { attendee } }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, 'TICKET_NOT_FOUND');
  assert.equal(bookingLookup, false);
});

test('partner PDF endpoint rejects a booking owned by another reservation', async (t) => {
  const originalInventoryFindOne = Inventory.findOne;
  const originalBookingFindOne = Booking.findOne;
  t.after(() => { Inventory.findOne = originalInventoryFindOne; Booking.findOne = originalBookingFindOne; });
  stubReservation({ partnerSeasonPassReservations: [{ reservationId, status: 'issued', bookingIds: [bookingId], eventIds: [], matchDates: [] }] });
  const queries = [];
  stubBooking(null, queries);
  const res = response();
  await postTicketPdf({ params: { reservationId, bookingId }, body: { attendee } }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, 'TICKET_NOT_FOUND');
  assert.equal(queries[0]['nuscPartnerTicket.reservationId'], reservationId);
});

test('partner PDF POST rejects an invalid HMAC for the full endpoint path and body', async () => {
  process.env.NODE_ENV = 'test';
  process.env.NUSC_HOME_MATCH_TEST_MODE = 'true';
  process.env.NUSC_PARTNER_API_ENABLED = 'true';
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/ahibi-test';
  process.env.NUSC_PARTNER_TEST_KEY_ID = 'test-key-id';
  process.env.NUSC_PARTNER_TEST_SECRET = 'test-only-secret';
  const rawBody = Buffer.from(JSON.stringify({ attendee }));
  const timestamp = String(Math.floor(Date.now() / 1000));
  const requestId = 'pdf-request-id-123456';
  const path = `/api/nusc-partner/v1/reservations/${reservationId}/tickets/${bookingId}/pdf`;
  const req = {
    method: 'POST', originalUrl: path, body: rawBody,
    get(name) {
      return {
        'x-ahibi-key-id': 'test-key-id',
        'x-ahibi-timestamp': timestamp,
        'x-ahibi-request-id': requestId,
        'x-ahibi-signature': '0'.repeat(64),
      }[name.toLowerCase()];
    },
    is() { return 'application/json'; },
  };
  const res = response();
  let nextCalled = false;
  await authenticateNuscPartner(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'INVALID_PARTNER_SIGNATURE');
  assert.equal(nextCalled, false);
  assert.notEqual(signedMessage({ timestamp, requestId, method: 'POST', path, rawBody }), '');
});
