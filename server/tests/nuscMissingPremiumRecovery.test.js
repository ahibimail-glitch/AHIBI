const test = require('node:test');
const assert = require('node:assert/strict');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Inventory = require('../models/NuscHomeMatchInventory');
const Scan = require('../models/Scan');
const homeMatchInventory = require('../services/nuscHomeMatchInventoryService');
const seasonPassBookingService = require('../services/nuscSeasonPassBookingService');
const { recoverMissingGeneralReplacementTickets } = require('../services/nuscSeasonPassReplacementService');

const ids = Array.from({ length: 10 }, (_, index) => `event-${index + 1}`);
const oldReservationId = `nsp_${'a'.repeat(40)}`;
const premiumReservationId = `nsp_${'b'.repeat(40)}`;
const paymentId = 'nusc-payment-recovery-test';

function query(value) {
  return {
    select() { return this; },
    session() { return this; },
    lean: async () => value,
  };
}

function fixture() {
  const oldReservation = {
    reservationId: oldReservationId,
    partnerOrderId: 'general-order',
    memberReferenceHash: 'member-hash',
    passId: 'general-season',
    ticketType: 'General Pass',
    status: 'replaced',
    replacedByReservationId: premiumReservationId,
    matchDates: Array.from({ length: 10 }, (_, index) => `2026-11-${String(index + 14).padStart(2, '0')}`),
    eventIds: ids,
    bookingIds: Array.from({ length: 10 }, (_, index) => `old-${index + 1}`),
  };
  const premiumReservation = {
    reservationId: premiumReservationId,
    partnerOrderId: 'premium-order',
    memberReferenceHash: 'member-hash',
    passId: 'premium-season',
    ticketType: 'Premium Pass',
    status: 'issued',
    replacesReservationId: oldReservationId,
    paymentId,
    matchDates: oldReservation.matchDates,
    eventIds: [...ids],
    replacementMatchIndices: [3, 4, 5, 6, 7, 8, 9, 10],
    replacementUsedTicketCount: 2,
    replacementCancelledTicketCount: 8,
    bookingIds: Array.from({ length: 8 }, (_, index) => `premium-${index + 3}`),
  };
  const oldBookings = Array.from({ length: 10 }, (_, index) => ({
    _id: `old-${index + 1}`,
    event: ids[index],
    status: index < 2 ? 'confirmed' : 'cancelled',
    entryVerified: index < 2,
    ticketType: 'General Pass',
    nuscSeasonMatchIndex: index + 1,
    nuscPartnerTicket: {
      partnerId: 'nusc', reservationId: oldReservationId, partnerOrderId: oldReservation.partnerOrderId,
      memberReferenceHash: oldReservation.memberReferenceHash,
    },
  }));
  const premiumBookings = Array.from({ length: 8 }, (_, offset) => {
    const index = offset + 3;
    return {
      _id: `premium-${index}`,
      event: ids[index - 1],
      status: index === 3 ? 'checked-in' : 'confirmed',
      ticketType: 'Premium Pass',
      nuscSeasonMatchIndex: index,
      nuscPartnerTicket: {
        partnerId: 'nusc', reservationId: premiumReservationId, partnerOrderId: premiumReservation.partnerOrderId,
        memberReferenceHash: premiumReservation.memberReferenceHash,
      },
      paymentProvider: 'nusc-partner',
    };
  });
  return {
    state: { partnerSeasonPassReservations: [oldReservation, premiumReservation] },
    oldReservation,
    premiumReservation,
    oldBookings,
    premiumBookings,
    scans: [{ ticket: 'premium-3', event: ids[2], partnerId: 'nusc' }],
  };
}

function withMocks(data, callback) {
  const originals = {
    inventoryFindOne: Inventory.findOne,
    bookingFind: Booking.find,
    bookingUpdateMany: Booking.updateMany,
    scanFind: Scan.find,
    eventFind: Event.find,
    beginRecovery: homeMatchInventory.beginPartnerMissingTicketRecovery,
    completeRecovery: homeMatchInventory.completePartnerMissingTicketRecovery,
    createTickets: seasonPassBookingService.createSeasonPassTicketRecords,
  };
  let createCount = 0;
  Inventory.findOne = () => query(data.state);
  Booking.find = (filter) => {
    if (filter?.['nuscPartnerTicket.reservationId'] === oldReservationId) return query(data.oldBookings);
    if (filter?.['nuscPartnerTicket.reservationId'] === premiumReservationId) return query(data.premiumBookings);
    if (filter?._id?.$in) return query(data.oldBookings.filter((booking) => filter._id.$in.includes(booking._id)));
    throw new Error('Unexpected Booking.find query in recovery unit test');
  };
  Booking.updateMany = async (filter, update) => {
    const targets = data.oldBookings.filter((booking) => filter._id.$in.includes(booking._id) && booking.status === 'confirmed');
    for (const booking of targets) {
      booking.status = update.$set.status;
      booking.nuscPartnerTicket.replacedByReservationId = update.$set['nuscPartnerTicket.replacedByReservationId'];
    }
    return { modifiedCount: targets.length };
  };
  Scan.find = () => query(data.scans.filter((scan) => scan.partnerId === 'nusc'));
  Event.find = (filter) => ({
    select: async () => filter._id.$in.map((id) => ({ _id: id, ticketTypes: [{ name: 'Premium Pass', quantity: 250, sold: 0 }] })),
  });
  homeMatchInventory.beginPartnerMissingTicketRecovery = async ({ matchIndices }) => {
    assert.deepEqual(matchIndices, [1, 2]);
    if (data.beginError) throw Object.assign(new Error(data.beginError), { code: data.beginError });
    if (!data.premiumReservation.recoveryStatus || data.premiumReservation.recoveryStatus === 'none') {
      data.premiumReservation.recoveryStatus = 'issuing';
      data.premiumReservation.recoveryMatchIndices = [1, 2];
    }
    return { alreadyIssued: false };
  };
  homeMatchInventory.completePartnerMissingTicketRecovery = async (_premiumId, _oldId, recoveryIds, allIds, matchIndices, usedCount, cancelledCount) => {
    assert.deepEqual(matchIndices, [1, 2]);
    if (data.premiumReservation.recoveryStatus !== 'issued') {
      data.premiumReservation.recoveryBookingIds = recoveryIds;
      data.premiumReservation.bookingIds = allIds;
      data.premiumReservation.replacementMatchIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      data.premiumReservation.replacementUsedTicketCount = usedCount;
      data.premiumReservation.replacementCancelledTicketCount = cancelledCount;
      data.premiumReservation.recoveryStatus = 'issued';
    }
    return data.premiumReservation;
  };
  seasonPassBookingService.createSeasonPassTicketRecords = async ({ fixtures }) => {
    createCount += 1;
    for (const fixture of fixtures) {
      let booking = data.premiumBookings.find((item) => item.nuscSeasonMatchIndex === fixture.matchIndex);
      if (!booking) {
        booking = {
          _id: `premium-${fixture.matchIndex}`,
          event: fixture.eventId,
          status: 'confirmed',
          ticketType: 'Premium Pass',
          nuscSeasonMatchIndex: fixture.matchIndex,
          nuscPartnerTicket: {
            partnerId: 'nusc', reservationId: premiumReservationId, partnerOrderId: data.premiumReservation.partnerOrderId,
            memberReferenceHash: data.premiumReservation.memberReferenceHash,
          },
          paymentProvider: 'nusc-partner',
        };
        data.premiumBookings.push(booking);
      }
    }
    const bookings = fixtures.map((fixture) => data.premiumBookings.find((item) => item.nuscSeasonMatchIndex === fixture.matchIndex));
    return { bookings, bookingIds: bookings.map((booking) => booking._id) };
  };
  return Promise.resolve().then(callback).finally(() => {
    Inventory.findOne = originals.inventoryFindOne;
    Booking.find = originals.bookingFind;
    Booking.updateMany = originals.bookingUpdateMany;
    Scan.find = originals.scanFind;
    Event.find = originals.eventFind;
    homeMatchInventory.beginPartnerMissingTicketRecovery = originals.beginRecovery;
    homeMatchInventory.completePartnerMissingTicketRecovery = originals.completeRecovery;
    seasonPassBookingService.createSeasonPassTicketRecords = originals.createTickets;
    data.createCount = createCount;
  });
}

test('recovers two stale-flag matches, preserves eight Premium IDs and Scan history, and is idempotent', async () => {
  const data = fixture();
  await withMocks(data, async () => {
    const input = { premiumReservationId, oldReservationId, paymentId };
    const first = await recoverMissingGeneralReplacementTickets(input);
    assert.equal(first.alreadyIssued, false);
    assert.deepEqual(first.issuedBookingIds.map(String), ['premium-1', 'premium-2']);
    assert.equal(first.reservation.bookingIds.length, 10);
    assert.equal(first.retainedUsedTicketCount, 0);
    assert.deepEqual(data.oldBookings.slice(0, 2).map((booking) => booking.status), ['cancelled', 'cancelled']);
    assert.deepEqual(data.scans, [{ ticket: 'premium-3', event: ids[2], partnerId: 'nusc' }]);
    const retry = await recoverMissingGeneralReplacementTickets(input);
    assert.equal(retry.alreadyIssued, true);
    assert.deepEqual(retry.issuedBookingIds.map(String), ['premium-1', 'premium-2']);
  });
  assert.equal(data.createCount, 1);
});

test('a matching ticket-and-event Scan blocks the whole recovery even when no flag is relied on', async () => {
  const data = fixture();
  data.scans.push({ ticket: 'old-1', event: ids[0], partnerId: 'nusc' });
  await withMocks(data, async () => {
    await assert.rejects(
      recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId }),
      (error) => error.code === 'TARGET_MATCH_ALREADY_CHECKED_IN',
    );
    assert.notEqual(data.premiumReservation.recoveryStatus, 'issuing');
    assert.equal(data.premiumBookings.length, 8);
  });
  assert.equal(data.createCount, 0);
});

test('a Scan for the wrong event does not count as check-in evidence for the target booking', async () => {
  const data = fixture();
  data.scans.push({ ticket: 'old-1', event: 'some-other-event', partnerId: 'nusc' });
  await withMocks(data, async () => {
    const result = await recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId });
    assert.equal(result.alreadyIssued, false);
    assert.equal(result.reservation.bookingIds.length, 10);
  });
});

test('sold-out recovery leaves both old General tickets and the Premium reservation unchanged', async () => {
  const data = fixture();
  data.beginError = 'PREMIUM_INVENTORY_UNAVAILABLE';
  await withMocks(data, async () => {
    await assert.rejects(
      recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId }),
      (error) => error.code === 'PREMIUM_INVENTORY_UNAVAILABLE',
    );
    assert.deepEqual(data.oldBookings.slice(0, 2).map((booking) => booking.status), ['confirmed', 'confirmed']);
    assert.deepEqual(data.oldBookings.slice(0, 2).map((booking) => booking.entryVerified), [true, true]);
    assert.notEqual(data.premiumReservation.recoveryStatus, 'issuing');
    assert.equal(data.premiumReservation.bookingIds.length, 8);
    assert.equal(data.premiumBookings.length, 8);
  });
  assert.equal(data.createCount, 0);
});
