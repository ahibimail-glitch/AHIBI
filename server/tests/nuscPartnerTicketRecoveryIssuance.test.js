const test = require('node:test');
const assert = require('node:assert/strict');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const InventoryModel = require('../models/NuscHomeMatchInventory');
const inventory = require('../services/nuscHomeMatchInventoryService');
const bookingService = require('../services/nuscSeasonPassBookingService');
const partnerController = require('../controllers/nuscPartnerController');

function makeReadbackBooking(index, bookingId, reservation) {
  return {
    _id: bookingId,
    event: reservation.eventIds[index - 1],
    ticketType: reservation.ticketType,
    status: 'confirmed',
    paymentStatus: 'completed',
    paymentProvider: 'nusc-partner',
    externalPaymentId: reservation.paymentId,
    nuscSeasonMatchIndex: index,
    nuscSeasonPassType: reservation.passId,
    nuscPartnerTicket: {
      partnerId: 'nusc',
      memberReferenceHash: reservation.memberReferenceHash,
      reservationId: reservation.reservationId,
      partnerOrderId: reservation.partnerOrderId,
      ticketIndex: index,
    },
  };
}

test('signed reservation readback accepts only the complete saved same-order reference set', async () => {
  const originalFind = Booking.find;
  const reservation = {
    reservationId: 'nsp-readback-test',
    partnerOrderId: 'nusc-order-readback-test',
    paymentId: 'payment-readback-test',
    ticketType: 'Premium Pass',
    passId: 'premium-season',
    memberReferenceHash: 'c'.repeat(64),
    eventIds: inventory.FIXTURE_MATCHES.map((_, index) => `event-${index + 1}`),
    replacesReservationId: 'nsp-old-readback-test',
    replacementMatchIndices: inventory.FIXTURE_MATCHES.map((_, index) => index + 1),
    bookingIds: inventory.FIXTURE_MATCHES.map((_, index) => String(index + 401).padStart(24, '0')),
  };
  const bookings = reservation.bookingIds.map((id, index) => makeReadbackBooking(index + 1, id, reservation));
  Booking.find = () => ({
    sort() { return this; },
    lean: async () => bookings,
  });
  try {
    const complete = await bookingService.getPartnerReservationTicketReadback(reservation);
    assert.equal(complete.complete, true);
    bookings.pop();
    const missing = await bookingService.getPartnerReservationTicketReadback(reservation);
    assert.equal(missing.complete, false);
    bookings.push(makeReadbackBooking(10, reservation.bookingIds[9], reservation));
    bookings[0] = { ...bookings[0], event: 'wrong-event' };
    const conflicting = await bookingService.getPartnerReservationTicketReadback(reservation);
    assert.equal(conflicting.complete, false);
  } finally {
    Booking.find = originalFind;
  }
});

test('signed NUSC replacement endpoint serves only a complete saved reference set', async (t) => {
  const originalInventoryFindOne = InventoryModel.findOne;
  const originalBookingFind = Booking.find;
  const reservation = {
    reservationId: 'nsp-signed-refresh-test',
    partnerOrderId: 'nusc-order-signed-refresh-test',
    paymentId: 'payment-signed-refresh-test',
    ticketType: 'Premium Pass',
    passId: 'premium-season',
    memberReferenceHash: 'd'.repeat(64),
    eventIds: inventory.FIXTURE_MATCHES.map((_, index) => `event-${index + 1}`),
    matchDates: inventory.FIXTURE_MATCHES.map((fixture) => fixture.date),
    status: 'issued',
    replacesReservationId: 'nsp-old-signed-refresh-test',
    replacementMatchIndices: [2, 4],
    bookingIds: ['000000000000000000000402', '000000000000000000000404'],
  };
  const makeBooking = (index, id) => ({
    _id: id,
    event: reservation.eventIds[index - 1],
    ticketType: reservation.ticketType,
    status: 'confirmed',
    paymentStatus: 'completed',
    paymentProvider: 'nusc-partner',
    externalPaymentId: reservation.paymentId,
    nuscSeasonMatchIndex: index,
    nuscSeasonPassType: reservation.passId,
    nuscPartnerTicket: {
      partnerId: 'nusc', memberReferenceHash: reservation.memberReferenceHash,
      reservationId: reservation.reservationId, partnerOrderId: reservation.partnerOrderId, ticketIndex: index,
    },
  });
  const bookings = [makeBooking(2, reservation.bookingIds[0]), makeBooking(4, reservation.bookingIds[1])];
  InventoryModel.findOne = () => ({ lean: async () => ({ partnerSeasonPassReservations: [reservation] }) });
  Booking.find = () => ({ sort() { return this; }, lean: async () => bookings });
  t.after(() => {
    InventoryModel.findOne = originalInventoryFindOne;
    Booking.find = originalBookingFind;
  });

  const makeResponse = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  });
  const response = makeResponse();
  await partnerController.getReservation({ params: { reservationId: reservation.reservationId } }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.tickets.map((ticket) => ticket.ticketId), reservation.bookingIds);

  bookings[0] = { ...bookings[0], externalPaymentId: 'conflicting-payment' };
  const conflictResponse = makeResponse();
  await partnerController.getReservation({ params: { reservationId: reservation.reservationId } }, conflictResponse);
  assert.equal(conflictResponse.statusCode, 500);
  assert.equal(conflictResponse.body.code, 'ISSUANCE_PENDING');
});

test('partner recovery preserves the saved Booking ID and recalculates only Premium sold inventory', async () => {
  const originalInit = Booking.init;
  const originalFindOne = Booking.findOne;
  const originalFindById = Booking.findById;
  const originalCountDocuments = Booking.countDocuments;
  const originalSave = Booking.prototype.save;
  const originalEventFindById = Event.findById;
  const bookings = new Map();
  const event = {
    _id: '000000000000000000000888',
    slug: 'nusc-home-match-20270114',
    title: 'NUSC home match',
    ticketTypes: [{ name: 'Premium Pass', sold: 0 }, { name: 'General Pass', sold: 7 }],
    async save() {},
  };
  const query = (value) => ({ select() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
  Booking.init = async () => {};
  Booking.findOne = async (filter) => [...bookings.values()].find((booking) => (
    booking.nuscPartnerTicket?.partnerOrderId === filter['nuscPartnerTicket.partnerOrderId'] &&
    Number(booking.nuscPartnerTicket?.ticketIndex) === Number(filter['nuscPartnerTicket.ticketIndex'])
  )) || null;
  Booking.findById = async (id) => bookings.get(String(id)) || null;
  Booking.countDocuments = async (filter) => [...bookings.values()].filter((booking) => (
    String(booking.event) === String(filter.event) && booking.ticketType === filter.ticketType &&
    filter.status.$in.includes(booking.status) && booking.paymentStatus === filter.paymentStatus
  )).length;
  Booking.prototype.save = async function save() {
    bookings.set(String(this._id), this);
  };
  Event.findById = () => query(event);

  try {
    const input = {
      orderId: 'nusc-order-issuance-test',
      fixtures: [{ eventId: event._id, matchDate: '2027-01-14', matchIndex: 1, ticketType: 'Premium Pass', bookingId: '000000000000000000000777' }],
      passId: 'premium-season',
      quantity: 1,
      paymentId: 'original-nusc-payment',
      paymentProvider: 'nusc-partner',
      memberReferenceHash: 'b'.repeat(64),
      reservationId: 'nsp-existing-reservation',
      partnerId: 'nusc',
      preserveUnrelatedTicketAllocations: true,
    };
    const first = await bookingService.createSeasonPassTicketRecords(input);
    const retry = await bookingService.createSeasonPassTicketRecords(input);
    assert.equal(first.bookings.length, 1);
    assert.equal(String(first.bookingIds[0]), input.fixtures[0].bookingId);
    assert.deepEqual(retry.bookingIds.map(String), first.bookingIds.map(String));
    assert.equal(bookings.size, 1);
    assert.equal(event.ticketTypes.find((ticket) => ticket.name === 'Premium Pass').sold, 1);
    assert.equal(event.ticketTypes.find((ticket) => ticket.name === 'General Pass').sold, 7);
    assert.equal(first.bookings[0].paymentId, undefined);
    assert.equal(first.bookings[0].externalPaymentId, input.paymentId);
  } finally {
    Booking.init = originalInit;
    Booking.findOne = originalFindOne;
    Booking.findById = originalFindById;
    Booking.countDocuments = originalCountDocuments;
    Booking.prototype.save = originalSave;
    Event.findById = originalEventFindById;
  }
});

test('replacement recovery inventory claim is atomic and completes partial eligible fixture sets', async (t) => {
  const originalFindOne = InventoryModel.findOne;
  const originalUpdateOne = InventoryModel.updateOne;
  const reservationId = 'nsp-partial-inventory-claim-test';
  const state = {
    _id: 'inventory-partial-claim-test',
    __v: 0,
    key: 'nusc-il-2026-27',
    orders: [],
    generalZoneSales: [],
    seasonPassOrders: [],
    seasonReservations: [],
    seasonPassHistoryInitializedAt: new Date().toISOString(),
    partnerSeasonPassReservations: [{
      reservationId,
      status: 'issued',
      passId: 'premium-season',
      replacesReservationId: 'nsp-old-partial-inventory-claim-test',
      replacementMatchIndices: [2, 4],
      bookingIds: ['old-booking-2', 'old-booking-4'],
      adminTicketRecovery: {},
      adminTicketRecoveryAudit: [],
    }],
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  InventoryModel.findOne = () => ({ lean: async () => clone(state) });
  InventoryModel.updateOne = async (filter, update) => {
    if (String(filter._id) !== String(state._id) || Number(filter.__v) !== state.__v) return { modifiedCount: 0 };
    Object.assign(state, clone(update.$set));
    state.__v += Number(update.$inc?.__v || 0);
    return { modifiedCount: 1 };
  };
  t.after(() => {
    InventoryModel.findOne = originalFindOne;
    InventoryModel.updateOne = originalUpdateOne;
  });

  const claims = await Promise.all([
    inventory.claimPartnerSeasonPassRecovery({ reservationId, token: 'attempt-a', adminId: 'admin-a' }),
    inventory.claimPartnerSeasonPassRecovery({ reservationId, token: 'attempt-b', adminId: 'admin-b' }),
  ]);
  assert.equal(claims.filter((claim) => claim.claimed).length, 1);
  const token = claims[0].claimed ? 'attempt-a' : 'attempt-b';
  const finished = await inventory.finishPartnerSeasonPassRecovery({
    reservationId,
    token,
    adminId: token === 'attempt-a' ? 'admin-a' : 'admin-b',
    bookingIds: ['booking-2', 'booking-4'],
    auditDetails: { result: 'completed', recoveredMatchIndices: [2, 4], restoredTicketCount: 2 },
  });

  assert.equal(finished, true);
  const reservation = state.partnerSeasonPassReservations[0];
  assert.equal(reservation.adminTicketRecovery.status, 'completed');
  assert.deepEqual(reservation.bookingIds, ['booking-2', 'booking-4']);
  assert.equal(reservation.adminTicketRecoveryAudit.at(-1).action, 'recovered');
  assert.deepEqual(reservation.adminTicketRecoveryAudit.at(-1).details.recoveredMatchIndices, [2, 4]);
});
