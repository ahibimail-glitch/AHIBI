const test = require('node:test');
const assert = require('node:assert/strict');

const Inventory = require('../models/NuscHomeMatchInventory');
const Booking = require('../models/Booking');
const homeMatchInventory = require('../services/nuscHomeMatchInventoryService');

function query(value) {
  return {
    session() { return this; },
    lean: async () => value,
  };
}

function makeInventory({ sold = 185, liveSold = 184, otherHold = false } = {}) {
  const premiumId = 'premium-reservation';
  const originalId = 'general-reservation';
  const date = homeMatchInventory.FIXTURE_DATES[2];
  const eventIds = Array.from({ length: 10 }, (_, index) => `event-${index + 1}`);
  return {
    premiumId,
    originalId,
    date,
    eventIds,
    sold,
    liveSold,
    updateCount: 0,
    state: {
      _id: 'inventory-doc',
      __v: 0,
      key: 'nusc-il-2026-27',
      seasonPassHistoryInitializedAt: new Date(),
      orders: [],
      generalZoneSales: [],
      seasonPassOrders: otherHold ? [{
        orderId: 'another-premium-hold',
        userId: 'other-member',
        ticketType: 'Premium Pass',
        quantity: 1,
        matchDates: [date],
        status: 'held',
        expiresAt: new Date(Date.now() + 60_000),
      }] : [],
      partnerSeasonPassReservations: [
        {
          reservationId: originalId,
          passId: 'general-season',
          ticketType: 'General Pass',
          status: 'replaced',
          replacedByReservationId: premiumId,
          memberReferenceHash: 'member-hash',
          eventIds,
          matchDates: homeMatchInventory.FIXTURE_DATES,
        },
        {
          reservationId: premiumId,
          partnerOrderId: 'rise-order',
          passId: 'premium-season',
          ticketType: 'Premium Pass',
          status: 'issued',
          paymentId: 'nusc-payment',
          replacesReservationId: originalId,
          memberReferenceHash: 'member-hash',
          eventIds,
          matchDates: homeMatchInventory.FIXTURE_DATES,
          recoveryStatus: 'none',
          recoveryMatchIndices: [],
        },
      ],
      seasonReservations: [],
    },
  };
}

async function withInventory(data, callback) {
  const originals = { findOne: Inventory.findOne, updateOne: Inventory.updateOne, countDocuments: Booking.countDocuments };
  Inventory.findOne = () => query(data.state);
  Inventory.updateOne = async (_filter, update) => {
    data.updateCount += 1;
    Object.assign(data.state, update.$set || {});
    data.state.__v = Number(data.state.__v || 0) + Number(update.$inc?.__v || 0);
    return { modifiedCount: 1 };
  };
  Booking.countDocuments = async () => data.liveSold;
  try {
    return await callback();
  } finally {
    Inventory.findOne = originals.findOne;
    Inventory.updateOne = originals.updateOne;
    Booking.countDocuments = originals.countDocuments;
  }
}

function recoveryInput(data) {
  return {
    orderId: data.premiumId,
    oldReservationId: data.originalId,
    paymentId: 'nusc-payment',
    matchIndices: [3],
    missingMatchIndices: [3],
    matchDates: [data.date],
    matches: [{
      eventId: data.eventIds[2],
      matchDate: data.date,
      ticketTypes: [{ name: 'Premium Pass', quantity: 185, sold: data.sold }],
    }],
  };
}

test('uses the already-counted replacement allocation and keeps one temporary hold across retries', async () => {
  const data = makeInventory();
  await withInventory(data, async () => {
    const first = await homeMatchInventory.beginPartnerMissingTicketRecovery(recoveryInput(data));
    assert.equal(first.alreadyIssued, false);
    assert.equal(data.state.partnerSeasonPassReservations[1].recoveryStatus, 'issuing');
    assert.equal(data.state.seasonPassOrders.filter((item) => item.orderId === `nusc-recovery:${data.premiumId}`).length, 1);

    await homeMatchInventory.beginPartnerMissingTicketRecovery(recoveryInput(data));
    assert.equal(data.state.seasonPassOrders.filter((item) => item.orderId === `nusc-recovery:${data.premiumId}`).length, 1);
  });
});

test('holds recovery for manual review when sold inventory no longer accounts for the missing seat', async () => {
  const data = makeInventory({ sold: 274, liveSold: 274 });
  await withInventory(data, async () => {
    await assert.rejects(
      homeMatchInventory.beginPartnerMissingTicketRecovery(recoveryInput(data)),
      (error) => error.code === 'RECOVERY_INVENTORY_RECONCILIATION_REQUIRED',
    );
    assert.equal(data.updateCount, 0);
    assert.equal(data.state.partnerSeasonPassReservations[1].recoveryStatus, 'none');
    assert.equal(data.state.seasonPassOrders.length, 0);
  });
});

test('does not restore a previously counted seat when current holds already exceed capacity', async () => {
  const data = makeInventory({ otherHold: true });
  await withInventory(data, async () => {
    await assert.rejects(
      homeMatchInventory.beginPartnerMissingTicketRecovery(recoveryInput(data)),
      (error) => error.code === 'PREMIUM_INVENTORY_UNAVAILABLE',
    );
    assert.equal(data.updateCount, 0);
    assert.equal(data.state.partnerSeasonPassReservations[1].recoveryStatus, 'none');
  });
});
