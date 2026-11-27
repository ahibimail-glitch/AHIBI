const mongoose = require('mongoose');

// One check-in per festival day per ticket.
const CheckInSchema = new mongoose.Schema({
  day: { type: String, required: true }, // ISO date, e.g. '2026-12-11'
  at: { type: Date, default: Date.now },
  by: { type: String, default: null }, // scanner staff / admin id (string)
  byName: { type: String, default: null },
}, { _id: false });

// One ticket per person per line item (entry or camping).
const EuphoriaTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, index: true },
  type: { type: String, enum: ['entry', 'camping'], required: true },
  personIndex: { type: Number, required: true, min: 1 },
  campingType: { type: String, enum: ['tent', 'no-tent', null], default: null },
  // Festival days this ticket is valid for (ISO date strings).
  validDays: { type: [String], default: [] },
  // Whether this ticket admits the holder through the festival entry gate on its validDays.
  // Entry tickets: always true. Camping tickets: snapshot of campingIncludesEntry at issue time.
  admitsEntry: { type: Boolean, default: true },
  qrCode: { type: String, default: null }, // base64 data URL
  status: { type: String, enum: ['active', 'cancelled', 'refunded'], default: 'active' },
  checkIns: { type: [CheckInSchema], default: [] },
}, { _id: true });

const EuphoriaBookingSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true }, // razorpay order id
  paymentId: { type: String, default: null, index: true },
  receipt: { type: String, default: null },

  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contact: {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: null, trim: true },
  },

  // Festival entry line (people attending on a chosen set of days).
  entry: {
    days: { type: [String], default: [] },
    people: { type: Number, default: 0, min: 0 },
    unitPrice: { type: Number, default: 0 }, // price per person for this day-count
    amount: { type: Number, default: 0 },
  },

  // Camping line (people, chosen nights, tent/no-tent).
  camping: {
    type: { type: String, enum: ['tent', 'no-tent', 'none'], default: 'none' },
    days: { type: [String], default: [] },
    people: { type: Number, default: 0, min: 0 },
    unitPrice: { type: Number, default: 0 }, // price per person for this configuration
    amount: { type: Number, default: 0 },
  },

  amount: { type: Number, required: true }, // INR (rupees)
  amountMinor: { type: Number, required: true }, // paise
  currency: { type: String, default: 'INR' },

  // People counted against the shared camping capacity for this order.
  campingPeople: { type: Number, default: 0, min: 0 },
  // Guards the atomic capacity increment so it happens exactly once.
  campingApplied: { type: Boolean, default: false },

  status: {
    type: String,
    enum: ['created', 'settling', 'completed', 'paid_no_camping', 'failed', 'refunded'],
    default: 'created',
    index: true,
  },

  test: { type: Boolean, default: false }, // true when created with Razorpay test keys
  ticketsEmailed: { type: Boolean, default: false },

  tickets: { type: [EuphoriaTicketSchema], default: [] },

  refund: {
    status: { type: String, enum: ['none', 'processed', 'failed'], default: 'none' },
    refundId: { type: String, default: null },
    amountMinor: { type: Number, default: 0 },
    at: { type: Date, default: null },
    reason: { type: String, default: null },
  },

  errorMessage: { type: String, default: null },
}, { timestamps: true });

EuphoriaBookingSchema.index({ 'tickets.ticketNumber': 1 });
EuphoriaBookingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('EuphoriaBooking', EuphoriaBookingSchema);
