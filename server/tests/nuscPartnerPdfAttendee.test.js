const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePdfAttendee } = require('../controllers/nuscPartnerController');

test('partner PDF attendee accepts and trims valid name, email, and phone fields', () => {
  assert.deepEqual(validatePdfAttendee({
    name: '  Test Member  ',
    email: ' member@example.test ',
    phone: ' +91 98765 43210 ',
  }), {
    name: 'Test Member',
    email: 'member@example.test',
    phone: '+91 98765 43210',
  });
});

test('partner PDF attendee rejects missing, malformed, extra, or oversized fields', () => {
  assert.equal(validatePdfAttendee(null), null);
  assert.equal(validatePdfAttendee({ name: 'Test Member', email: 'member@example.test' }), null);
  assert.equal(validatePdfAttendee({ name: 'Test Member', email: 'invalid', phone: '1234567890' }), null);
  assert.equal(validatePdfAttendee({ name: 'Test Member', email: 'member@example.test', phone: 'call me' }), null);
  assert.equal(validatePdfAttendee({ name: 'x'.repeat(101), email: 'member@example.test', phone: '1234567890' }), null);
  assert.equal(validatePdfAttendee({ name: 'Test Member', email: 'x'.repeat(250) + '@example.test', phone: '1234567890' }), null);
  assert.equal(validatePdfAttendee({ name: 'Test Member', email: 'member@example.test', phone: '1'.repeat(41) }), null);
  assert.equal(validatePdfAttendee({ name: 'Test Member', email: 'member@example.test', phone: '1234567890', extra: 'ignored' }), null);
});
