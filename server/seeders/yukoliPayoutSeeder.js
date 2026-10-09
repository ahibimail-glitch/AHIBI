const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Payout = require('../models/Payout');

const PARTNER_ID = new mongoose.Types.ObjectId('6979a6d60bc106f0ef99b8d8');

const demoPayouts = [
  {
    arenaPartner: PARTNER_ID,
    period: { startDate: new Date('2026-03-17'), endDate: new Date('2026-03-23') },
    financials: {
      totalRevenue: 18200,
      platformCommission: 0,
      commissionRate: 0,
      taxes: { gst: 0, tds: 1820, total: 1820 },
      adjustments: { refunds: 0, chargebacks: 0, bonuses: 0, penalties: 0, total: 0 },
      netAmount: 16380
    },
    status: 'completed',
    transaction: {
      transactionId: 'TXN17432001001',
      utr: 'UTR2603170001',
      paymentMethod: 'bank_transfer',
      processedAt: new Date('2026-03-24T09:00:00Z'),
      completedAt: new Date('2026-03-24T10:30:00Z')
    },
    createdAt: new Date('2026-03-24T08:00:00Z'),
    scheduledAt: new Date('2026-03-24T08:00:00Z')
  },
  {
    arenaPartner: PARTNER_ID,
    period: { startDate: new Date('2026-03-10'), endDate: new Date('2026-03-16') },
    financials: {
      totalRevenue: 22500,
      platformCommission: 0,
      commissionRate: 0,
      taxes: { gst: 0, tds: 2250, total: 2250 },
      adjustments: { refunds: 500, chargebacks: 0, bonuses: 0, penalties: 0, total: -500 },
      netAmount: 19750
    },
    status: 'completed',
    transaction: {
      transactionId: 'TXN17431001002',
      utr: 'UTR2603100002',
      paymentMethod: 'bank_transfer',
      processedAt: new Date('2026-03-17T09:00:00Z'),
      completedAt: new Date('2026-03-17T11:00:00Z')
    },
    createdAt: new Date('2026-03-17T08:00:00Z'),
    scheduledAt: new Date('2026-03-17T08:00:00Z')
  },
  {
    arenaPartner: PARTNER_ID,
    period: { startDate: new Date('2026-03-03'), endDate: new Date('2026-03-09') },
    financials: {
      totalRevenue: 15800,
      platformCommission: 0,
      commissionRate: 0,
      taxes: { gst: 0, tds: 1580, total: 1580 },
      adjustments: { refunds: 0, chargebacks: 0, bonuses: 0, penalties: 0, total: 0 },
      netAmount: 14220
    },
    status: 'completed',
    transaction: {
      transactionId: 'TXN17430001003',
      utr: 'UTR2603030003',
      paymentMethod: 'bank_transfer',
      processedAt: new Date('2026-03-10T09:00:00Z'),
      completedAt: new Date('2026-03-10T10:45:00Z')
    },
    createdAt: new Date('2026-03-10T08:00:00Z'),
    scheduledAt: new Date('2026-03-10T08:00:00Z')
  },
  {
    arenaPartner: PARTNER_ID,
    period: { startDate: new Date('2026-02-24'), endDate: new Date('2026-03-02') },
    financials: {
      totalRevenue: 19600,
      platformCommission: 0,
      commissionRate: 0,
      taxes: { gst: 0, tds: 1960, total: 1960 },
      adjustments: { refunds: 0, chargebacks: 0, bonuses: 0, penalties: 0, total: 0 },
      netAmount: 17640
    },
    status: 'completed',
    transaction: {
      transactionId: 'TXN17429001004',
      utr: 'UTR2602240004',
      paymentMethod: 'bank_transfer',
      processedAt: new Date('2026-03-03T09:00:00Z'),
      completedAt: new Date('2026-03-03T12:00:00Z')
    },
    createdAt: new Date('2026-03-03T08:00:00Z'),
    scheduledAt: new Date('2026-03-03T08:00:00Z')
  },
  {
    arenaPartner: PARTNER_ID,
    period: { startDate: new Date('2026-03-24'), endDate: new Date('2026-03-26') },
    financials: {
      totalRevenue: 9400,
      platformCommission: 0,
      commissionRate: 0,
      taxes: { gst: 0, tds: 940, total: 940 },
      adjustments: { refunds: 0, chargebacks: 0, bonuses: 0, penalties: 0, total: 0 },
      netAmount: 8460
    },
    status: 'processing',
    transaction: {
      transactionId: 'TXN17433001005',
      paymentMethod: 'bank_transfer',
      processedAt: new Date('2026-03-27T08:00:00Z')
    },
    createdAt: new Date('2026-03-27T08:00:00Z'),
    scheduledAt: new Date('2026-03-27T08:00:00Z')
  },
  {
    arenaPartner: PARTNER_ID,
    period: { startDate: new Date('2026-02-17'), endDate: new Date('2026-02-23') },
    financials: {
      totalRevenue: 11200,
      platformCommission: 0,
      commissionRate: 0,
      taxes: { gst: 0, tds: 1120, total: 1120 },
      adjustments: { refunds: 0, chargebacks: 0, bonuses: 0, penalties: 0, total: 0 },
      netAmount: 10080
    },
    status: 'failed',
    failure: {
      reason: 'Bank account details mismatch. Please verify your bank details.',
      attempts: 2,
      lastAttemptAt: new Date('2026-02-25T10:00:00Z')
    },
    createdAt: new Date('2026-02-24T08:00:00Z'),
    scheduledAt: new Date('2026-02-24T08:00:00Z')
  }
];

const seedPayouts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const deleted = await Payout.deleteMany({ arenaPartner: PARTNER_ID });
    if (deleted.deletedCount > 0) {
      console.log(`🗑️  Cleared ${deleted.deletedCount} existing payout(s) for this partner.`);
    }

    const inserted = [];
    for (const data of demoPayouts) {
      const doc = new Payout(data);
      await doc.save();
      inserted.push(doc);
    }
    console.log(`✅ Inserted ${inserted.length} demo payouts for Yukoli (${PARTNER_ID})`);
    inserted.forEach(p => {
      console.log(`   - ${p.invoiceNumber || p._id} | ${p.status} | ₹${p.financials.netAmount}`);
    });

  } catch (error) {
    console.error('❌ Error seeding payouts:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedPayouts();
