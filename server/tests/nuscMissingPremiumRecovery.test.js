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
    paymentId: 'nusc-original-payment',
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
    paymentStatus: 'completed',
    paymentProvider: 'nusc-partner',
    externalPaymentId: oldReservation.paymentId,
    entryVerified: false,
    ticketType: 'General Pass',
    nuscSeasonMatchIndex: index + 1,
    nuscPartnerTicket: {
      partnerId: 'nusc', reservationId: oldReservationId, partnerOrderId: oldReservation.partnerOrderId,
      memberReferenceHash: oldReservation.memberReferenceHash,
      ...(index >= 2 && { replacedByReservationId: premiumReservationId }),
    },
  }));
  const premiumBookings = Array.from({ length: 8 }, (_, offset) => {
    const index = offset + 3;
    return {
      _id: `premium-${index}`,
      event: ids[index - 1],
      status: index === 3 ? 'checked-in' : 'confirmed',
      paymentStatus: 'completed',
      ticketType: 'Premium Pass',
      nuscSeasonMatchIndex: index,
      nuscPartnerTicket: {
        partnerId: 'nusc', reservationId: premiumReservationId, partnerOrderId: premiumReservation.partnerOrderId,
        memberReferenceHash: premiumReservation.memberReferenceHash,
      },
      paymentProvider: 'nusc-partner',
      externalPaymentId: paymentId,
    };
  });
  return {
    state: { partnerSeasonPassReservations: [oldReservation, premiumReservation] },
    oldReservation,
    premiumReservation,
    oldBookings,
    premiumBookings,
    scans: [
      { ticket: 'old-1', event: ids[0], partnerId: 'nusc' },
      { ticket: 'old-2', event: ids[1], partnerId: 'nusc' },
      { ticket: 'premium-3', event: ids[2], partnerId: 'nusc' },
    ],
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
    if (filter?.['nuscPartnerTicket.partnerOrderId'] === data.premiumReservation.partnerOrderId) return query(data.premiumBookings);
    if (filter?._id?.$in) return query([...data.oldBookings, ...data.premiumBookings]
      .filter((booking) => filter._id.$in.map(String).includes(String(booking._id))));
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
  homeMatchInventory.beginPartnerMissingTicketRecovery = async ({ matchIndices, missingMatchIndices }) => {
    assert.deepEqual(matchIndices, data.premiumReservation.replacementMatchIndices);
    const expectedMissing = data.expectedMissingIndices || matchIndices.filter((index) => (
      !data.premiumBookings.some((booking) => Number(booking.nuscSeasonMatchIndex) === index)
    ));
    assert.deepEqual(missingMatchIndices, expectedMissing);
    if (data.beginError) throw Object.assign(new Error(data.beginError), { code: data.beginError });
    if (data.premiumReservation.recoveryStatus !== 'issuing') {
      data.premiumReservation.recoveryStatus = 'issuing';
      data.premiumReservation.recoveryMatchIndices = [...matchIndices];
    }
    return { alreadyIssued: false };
  };
  homeMatchInventory.completePartnerMissingTicketRecovery = async (_premiumId, _oldId, recoveryIds, allIds, matchIndices, usedCount, cancelledCount) => {
    assert.deepEqual(matchIndices, data.premiumReservation.replacementMatchIndices);
    assert.equal(recoveryIds.length, matchIndices.length);
    assert.equal(allIds.length, 10);
    if (data.premiumReservation.recoveryStatus !== 'issued') {
      data.premiumReservation.recoveryBookingIds = recoveryIds;
      data.premiumReservation.bookingIds = allIds;
      data.premiumReservation.replacementMatchIndices = [...new Set([...data.premiumReservation.replacementMatchIndices, ...matchIndices])].sort((a, b) => a - b);
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
          paymentStatus: 'completed',
          ticketType: 'Premium Pass',
          nuscSeasonMatchIndex: fixture.matchIndex,
          nuscPartnerTicket: {
            partnerId: 'nusc', reservationId: premiumReservationId, partnerOrderId: data.premiumReservation.partnerOrderId,
            memberReferenceHash: data.premiumReservation.memberReferenceHash,
          },
          paymentProvider: 'nusc-partner',
          externalPaymentId: paymentId,
        };
        data.premiumBookings.push(booking);
      }
      if (data.failCreateOnce) {
        data.failCreateOnce = false;
        throw new Error('simulated partial Premium replacement issuance');
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

test('relinks two used General matches and eight Premium matches without issuing tickets, and is idempotent', async () => {
  const data = fixture();
  await withMocks(data, async () => {
    const input = { premiumReservationId, oldReservationId, paymentId };
    const first = await recoverMissingGeneralReplacementTickets(input);
    assert.equal(first.alreadyIssued, false);
    assert.deepEqual(first.recoveredMatchIndices, []);
    assert.deepEqual(first.relinkedMatchIndices, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(first.reservation.bookingIds.length, 10);
    assert.equal(first.retainedUsedTicketCount, 2);
    assert.deepEqual(data.oldBookings.slice(0, 2).map((booking) => booking.status), ['confirmed', 'confirmed']);
    const retry = await recoverMissingGeneralReplacementTickets(input);
    assert.equal(retry.alreadyIssued, true);
    assert.equal(retry.issuedBookingIds.length, 8);
  });
  assert.equal(data.createCount, 0);
});

test('recovers all missing Premium replacement tickets while retaining the two scanned original matches', async () => {
  const data = fixture();
  data.premiumBookings.length = 0;
  data.scans = data.scans.filter((scan) => scan.ticket.startsWith('old-'));
  data.expectedMissingIndices = [3, 4, 5, 6, 7, 8, 9, 10];
  await withMocks(data, async () => {
    const first = await recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId });
    assert.deepEqual(first.recoveredMatchIndices, [3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(first.relinkedMatchIndices, [1, 2]);
    assert.equal(first.reservation.bookingIds.length, 10);
    assert.equal(data.oldBookings.filter((booking) => booking.status === 'confirmed').length, 2);
    const retry = await recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId });
    assert.equal(retry.alreadyIssued, true);
    assert.equal(retry.issuedBookingIds.length, 8);
  });
  assert.equal(data.createCount, 1);
});

test('recovers only missing Premium matches when the replacement set is partial', async () => {
  const data = fixture();
  data.premiumBookings = data.premiumBookings.filter((booking) => ![5, 8].includes(booking.nuscSeasonMatchIndex));
  data.expectedMissingIndices = [5, 8];
  await withMocks(data, async () => {
    const result = await recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId });
    assert.deepEqual(result.recoveredMatchIndices, [5, 8]);
    assert.equal(result.reservation.bookingIds.length, 10);
    assert.equal(data.premiumBookings.length, 8);
  });
  assert.equal(data.createCount, 1);
});

test('partial issuance retries only uncreated matches and does not duplicate the first ticket', async () => {
  const data = fixture();
  data.premiumBookings.length = 0;
  data.scans = data.scans.filter((scan) => scan.ticket.startsWith('old-'));
  data.failCreateOnce = true;
  await withMocks(data, async () => {
    await assert.rejects(
      recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId }),
      /simulated partial Premium replacement issuance/,
    );
    assert.equal(data.premiumReservation.recoveryStatus, 'issuing');
    assert.deepEqual(data.premiumBookings.map((booking) => booking.nuscSeasonMatchIndex), [3]);
    const result = await recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId });
    assert.equal(data.premiumReservation.recoveryStatus, 'issued');
    assert.deepEqual(result.recoveredMatchIndices, [4, 5, 6, 7, 8, 9, 10]);
    assert.equal(data.premiumBookings.length, 8);
    assert.equal(data.premiumReservation.bookingIds.length, 10);
  });
  assert.equal(data.createCount, 2);
});

test('missing original General records stay in manual review instead of rebuilding uncertain matches', async () => {
  const data = fixture();
  data.oldBookings.pop();
  await withMocks(data, async () => {
    await assert.rejects(
      recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId }),
      (error) => error.code === 'OLD_TICKET_SET_INCOMPLETE',
    );
  });
  assert.equal(data.createCount, 0);
  assert.equal(data.premiumReservation.recoveryStatus, undefined);
});

test('replacement counts that disagree with the original match set stay in manual review', async () => {
  const data = fixture();
  data.premiumReservation.replacementUsedTicketCount = 1;
  await withMocks(data, async () => {
    await assert.rejects(
      recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId }),
      (error) => error.code === 'REPLACEMENT_LINEAGE_COUNTS_INVALID',
    );
  });
  assert.equal(data.createCount, 0);
  assert.equal(data.premiumReservation.recoveryStatus, undefined);
});

test('an entry-verified replaced original ticket is never reissued', async () => {
  const data = fixture();
  data.oldBookings[2].entryVerified = true;
  data.scans = data.scans.filter((scan) => scan.ticket !== 'old-3');
  data.premiumBookings = data.premiumBookings.filter((booking) => booking.nuscSeasonMatchIndex !== 3);
  data.expectedMissingIndices = [3];
  await withMocks(data, async () => {
    await assert.rejects(
      recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId }),
      (error) => error.code === 'TARGET_MATCH_ALREADY_CHECKED_IN',
    );
    assert.equal(data.premiumReservation.recoveryStatus, undefined);
    assert.equal(data.premiumBookings.length, 7);
  });
  assert.equal(data.createCount, 0);
});

test('an already-issued Premium ticket cannot overlap an active original General ticket', async () => {
  const data = fixture();
  data.oldBookings[2].status = 'confirmed';
  data.premiumReservation.recoveryStatus = 'issued';
  data.premiumReservation.replacementMatchIndices = Array.from({ length: 10 }, (_, index) => index + 1);
  data.premiumReservation.replacementUsedTicketCount = 0;
  data.premiumReservation.replacementCancelledTicketCount = 10;
  for (const index of [1, 2]) {
    data.premiumBookings.push({
      _id: `premium-${index}`,
      event: ids[index - 1],
      status: 'confirmed',
      paymentStatus: 'completed',
      ticketType: 'Premium Pass',
      nuscSeasonMatchIndex: index,
      nuscPartnerTicket: {
        partnerId: 'nusc', reservationId: premiumReservationId, partnerOrderId: data.premiumReservation.partnerOrderId,
        memberReferenceHash: data.premiumReservation.memberReferenceHash,
      },
      paymentProvider: 'nusc-partner',
      externalPaymentId: paymentId,
    });
  }
  data.premiumReservation.bookingIds = data.premiumBookings.map((booking) => booking._id);
  await withMocks(data, async () => {
    await assert.rejects(
      recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId }),
      (error) => error.code === 'REPLACEMENT_DUPLICATE_ACTIVE_TICKETS',
    );
    assert.equal(data.oldBookings[2].status, 'confirmed');
    assert.equal(data.premiumReservation.recoveryStatus, 'issued');
  });
  assert.equal(data.createCount, 0);
});

test('a matching ticket-and-event Scan blocks replacement recovery even when no flag is relied on', async () => {
  const data = fixture();
  data.scans.push({ ticket: 'old-3', event: ids[2], partnerId: 'nusc' });
  data.premiumBookings = data.premiumBookings.filter((booking) => booking.nuscSeasonMatchIndex !== 3);
  data.expectedMissingIndices = [3];
  await withMocks(data, async () => {
    await assert.rejects(
      recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId }),
      (error) => error.code === 'TARGET_MATCH_ALREADY_CHECKED_IN',
    );
    assert.notEqual(data.premiumReservation.recoveryStatus, 'issuing');
    assert.equal(data.premiumBookings.length, 7);
  });
  assert.equal(data.createCount, 0);
});

test('a Scan for the wrong event does not count as check-in evidence for the target booking', async () => {
  const data = fixture();
  data.scans.push({ ticket: 'old-3', event: 'some-other-event', partnerId: 'nusc' });
  data.premiumBookings = data.premiumBookings.filter((booking) => booking.nuscSeasonMatchIndex !== 3);
  data.expectedMissingIndices = [3];
  await withMocks(data, async () => {
    const result = await recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId });
    assert.equal(result.alreadyIssued, false);
    assert.equal(result.reservation.bookingIds.length, 10);
    assert.deepEqual(result.recoveredMatchIndices, [3]);
  });
});

test('sold-out recovery leaves both old General tickets and the Premium reservation unchanged', async () => {
  const data = fixture();
  data.beginError = 'PREMIUM_INVENTORY_UNAVAILABLE';
  data.premiumBookings = data.premiumBookings.filter((booking) => booking.nuscSeasonMatchIndex !== 3);
  data.expectedMissingIndices = [3];
  await withMocks(data, async () => {
    await assert.rejects(
      recoverMissingGeneralReplacementTickets({ premiumReservationId, oldReservationId, paymentId }),
      (error) => error.code === 'PREMIUM_INVENTORY_UNAVAILABLE',
    );
    assert.deepEqual(data.oldBookings.slice(0, 2).map((booking) => booking.status), ['confirmed', 'confirmed']);
    assert.deepEqual(data.oldBookings.slice(0, 2).map((booking) => booking.entryVerified), [false, false]);
    assert.notEqual(data.premiumReservation.recoveryStatus, 'issuing');
    assert.equal(data.premiumReservation.bookingIds.length, 8);
    assert.equal(data.premiumBookings.length, 7);
  });
  assert.equal(data.createCount, 0);
});
