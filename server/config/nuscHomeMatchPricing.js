// These are the server-controlled AHIBI totals charged by the existing online
// season pass checkout, in rupees and paise for exact payment/audit arithmetic.
module.exports = Object.freeze({
  'general-season': Object.freeze({
    ticketType: 'General Pass',
    amount: 3825.2,
    amountMinor: 382520,
  }),
  'premium-season': Object.freeze({
    ticketType: 'Premium Pass',
    amount: 13500,
    amountMinor: 1350000,
  }),
});
