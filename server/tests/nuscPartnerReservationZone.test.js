const test = require('node:test');
const assert = require('node:assert/strict');
const Inventory = require('../models/NuscHomeMatchInventory');

function reservation({ passId, ticketType, zone }) {
  return new Inventory({
    key: 'nusc-zone-validation-test',
    partnerSeasonPassReservations: [{
      reservationId: 'nsp_' + 'a'.repeat(40),
      partnerOrderId: 'nusc-order-zone-validation',
      memberReferenceHash: 'b'.repeat(64),
      passId,
      ticketType,
      zone,
      matchDates: ['2026-11-14'],
      expiresAt: new Date('2026-11-01T00:00:00.000Z'),
    }],
  });
}

test('Premium partner reservations accept a null zone', () => {
  const error = reservation({ passId: 'premium-season', ticketType: 'Premium Pass', zone: null }).validateSync();
  assert.equal(error, undefined);
});

test('General partner reservations reject a null zone', () => {
  const error = reservation({ passId: 'general-season', ticketType: 'General Pass', zone: null }).validateSync();
  assert.ok(error);
  assert.equal(error.errors['partnerSeasonPassReservations.0.zone'].kind, 'required');
});

test('General partner reservations accept only G-1 through G-5', () => {
  for (const zone of ['G-1', 'G-2', 'G-3', 'G-4', 'G-5']) {
    const error = reservation({ passId: 'general-season', ticketType: 'General Pass', zone }).validateSync();
    assert.equal(error, undefined, `${zone} should be valid`);
  }

  const error = reservation({ passId: 'general-season', ticketType: 'General Pass', zone: 'G-6' }).validateSync();
  assert.ok(error);
  assert.equal(error.errors['partnerSeasonPassReservations.0.zone'].kind, 'user defined');
});

test('Premium partner reservations reject a non-null zone', () => {
  const error = reservation({ passId: 'premium-season', ticketType: 'Premium Pass', zone: 'G-1' }).validateSync();
  assert.ok(error);
  assert.equal(error.errors['partnerSeasonPassReservations.0.zone'].kind, 'user defined');
});
