const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateMatchOrderAmountMinor, normalizeTicketSelection } = require('../controllers/nuscHomeMatchController');

test('calculates a one-date order with Single Match from server-resolved prices below ₹1,00,000', () => {
  const tickets = normalizeTicketSelection([
    { ticketType: 'Premium Pass', quantity: 1, price: 1500 },
    { ticketType: 'United Suite - Single Match', quantity: 1, price: 84000 },
  ], { ticketTypes: [{ name: 'Premium Pass', price: 1500, basePrice: 1250 }] });
  assert.equal(calculateMatchOrderAmountMinor([{ ticketLines: tickets }]), 8550000);
});

test('rejects a combined order at exactly ₹1,00,000', () => {
  assert.throws(() => calculateMatchOrderAmountMinor([
    { ticketLines: [{ price: 50000, quantity: 1 }] },
    { ticketLines: [{ price: 50000, quantity: 1 }] },
  ]), { code: 'ORDER_AMOUNT_LIMIT' });
});

test('rejects invalid server-resolved totals', () => {
  assert.throws(() => calculateMatchOrderAmountMinor([
    { ticketLines: [{ price: Number.NaN, quantity: 1 }] },
  ]), { code: 'INVALID_TICKET_TOTAL' });
});
