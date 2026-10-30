const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canUpdateRsvpStatus,
  isRsvpBookingType,
  parseRsvpSubmission,
} = require('../services/dailyEventRsvpService');

const activeDates = [new Date('2026-11-14T18:30:00.000Z')];
const validSubmission = {
  name: 'Asha Naro',
  email: 'ASHA@example.com',
  phone: '+91 98765 43210',
  partySize: '3',
  requestedDate: '2026-11-15',
  address: '12 Kohima Road, Dimapur',
};

test('RSVP submission trims fields, normalizes email, and stores the requested date and party size', () => {
  const result = parseRsvpSubmission({
    ...validSubmission,
    name: '  Asha Naro  ',
    address: '  12 Kohima Road, Dimapur  ',
    ignored: 'discarded',
  }, activeDates);

  assert.deepEqual(result, {
    name: 'Asha Naro',
    email: 'asha@example.com',
    phone: '+91 98765 43210',
    partySize: 3,
    address: '12 Kohima Road, Dimapur',
    requestedDate: '2026-11-15',
  });
});

test('RSVP submission rejects invalid contact details and party sizes', () => {
  assert.throws(() => parseRsvpSubmission({ ...validSubmission, email: 'invalid' }, activeDates), /valid email/i);
  assert.throws(() => parseRsvpSubmission({ ...validSubmission, phone: '123' }, activeDates), /valid phone/i);
  assert.throws(() => parseRsvpSubmission({ ...validSubmission, partySize: 101 }, activeDates), /1 to 100/i);
  assert.throws(() => parseRsvpSubmission({ ...validSubmission, address: 'x' }, activeDates), /address/i);
});

test('RSVP submission only accepts active event dates and calendar-valid dates', () => {
  assert.throws(() => parseRsvpSubmission({ ...validSubmission, requestedDate: '2026-11-16' }, activeDates), /not available/i);
  assert.throws(() => parseRsvpSubmission({ ...validSubmission, requestedDate: '2026-02-30' }, activeDates), /valid event date/i);
});

test('legacy call-to-book events retain RSVP behavior and closed requests cannot be reopened', () => {
  assert.equal(isRsvpBookingType('rsvp'), true);
  assert.equal(isRsvpBookingType('call_to_book'), true);
  assert.equal(isRsvpBookingType('ticketed'), false);
  assert.equal(canUpdateRsvpStatus('pending', 'contacted'), true);
  assert.equal(canUpdateRsvpStatus('contacted', 'booked'), true);
  assert.equal(canUpdateRsvpStatus('pending', 'declined'), true);
  assert.equal(canUpdateRsvpStatus('booked', 'declined'), false);
  assert.equal(canUpdateRsvpStatus('declined', 'contacted'), false);
});
