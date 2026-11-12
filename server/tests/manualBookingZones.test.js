const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getManualBookingZoneError,
  normalizeManualBookingZone,
} = require('../services/manualBookingZones');

test('manual NUSC General Pass accepts and normalizes all five seating zones', () => {
  for (const zone of ['G-1', 'G-2', 'G-3', 'G-4', 'G-5']) {
    assert.equal(normalizeManualBookingZone(` ${zone.toLowerCase()} `), zone);
    assert.equal(getManualBookingZoneError('nusc-home-match-20261114', [{ ticketType: 'General Pass', zone }]), null);
  }
});

test('manual NUSC General Pass requires a valid seating zone', () => {
  for (const zone of [undefined, '', 'G-6']) {
    assert.ok(getManualBookingZoneError('nusc-home-match-20261114', [{ ticketType: 'General Pass', zone }]));
  }
});

test('seating zones are rejected for other events and ticket types', () => {
  assert.ok(getManualBookingZoneError('other-event', [{ ticketType: 'General Pass', zone: 'G-1' }]));
  assert.ok(getManualBookingZoneError('nusc-home-match-20261114', [{ ticketType: 'Premium Pass', zone: 'G-1' }]));
});

test('zone is optional for non-NUSC manual tickets', () => {
  assert.equal(getManualBookingZoneError('other-event', [{ ticketType: 'General Pass' }]), null);
  assert.equal(getManualBookingZoneError('nusc-home-match-20261114', [{ ticketType: 'Premium Pass' }]), null);
});
