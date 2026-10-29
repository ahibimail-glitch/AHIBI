require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const PendingPaymentSession = require('../models/PendingPaymentSession');
const AdminNotification = require('../models/AdminNotification');

const uniqueFieldChecks = [
  { label: 'booking payment ticket keys', model: Booking, field: 'paymentTicketKey' },
  { label: 'pending checkout intent IDs', model: PendingPaymentSession, field: 'orderIntentId' },
  { label: 'admin alert dedupe keys', model: AdminNotification, field: 'metadata.dedupeKey' },
];

async function countDuplicateKeys({ model, field }) {
  const results = await model.collection.aggregate([
    { $match: { [field]: { $type: 'string' } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: 'duplicateKeys' },
  ]).toArray();
  return Number(results[0]?.duplicateKeys || 0);
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

  let hasDuplicates = false;
  for (const check of uniqueFieldChecks) {
    const duplicateCount = await countDuplicateKeys(check);
    if (duplicateCount > 0) {
      hasDuplicates = true;
      console.error(`FAIL: ${check.label} contain ${duplicateCount} duplicate key group(s).`);
    } else {
      console.log(`PASS: no duplicate ${check.label}.`);
    }
  }

  if (hasDuplicates) process.exitCode = 1;
  else console.log('Payment idempotency index preflight passed.');
}

main()
  .catch((error) => {
    console.error('Payment index preflight failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
