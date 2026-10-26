const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateMatchOrderAmountMinor, normalizeTicketSelection } = require('../controllers/nuscHomeMatchController');

test('calculates a combined order from server-resolved prices and quantities below ₹1,00,000', () => {
  const firstMatchTickets = normalizeTicketSelection([
    { ticketType: 'Premium Pass', quantity: 1, price: 1 },
  ], { ticketTypes: [{ name: 'Premium Pass', price: 358.8, basePrice: 299 }] });
  const secondMatchTickets = normalizeTicketSelection([
    { ticketType: 'Special Pass', quantity: 1, price: 1 },
  ], { ticketTypes: [{ name: 'Special Pass', price: 99640.2, basePrice: 90000 }] });
  assert.equal(calculateMatchOrderAmountMinor([
    { ticketLines: firstMatchTickets },
    { ticketLines: secondMatchTickets },
  ]), 9999900);
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
