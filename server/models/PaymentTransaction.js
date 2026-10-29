const mongoose = require('mongoose');

const PaymentTransactionSchema = new mongoose.Schema({
  orderId: { type: String, index: true },
  paymentId: { type: String, index: true },
  signature: { type: String },
  amount: { type: Number },
  amountPaise: { type: Number },
  currency: { type: String, default: 'INR' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userSnapshot: {
    name: String,
    email: String,
    phone: String,
    id: String,
  },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  dailyEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyEvent' },
  bookingDetails: {
    type: Object,
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'paid_no_booking', 'resolved'],
    default: 'processing',
    index: true,
  },
  errorMessage: { type: String },
  bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  couponUsageApplied: { type: Boolean, default: false },
  reconciliationLeaseId: { type: String },
  reconciliationLeaseUntil: { type: Date },
  reconciliationAttemptCount: { type: Number, default: 0 },
  nextReconciliationAt: { type: Date, default: Date.now },
  needsAdminIntervention: { type: Boolean, default: false, index: true },
}, { timestamps: true });

PaymentTransactionSchema.index({ orderId: 1, paymentId: 1 }, { unique: false });
PaymentTransactionSchema.index({ status: 1, nextReconciliationAt: 1 });

module.exports = mongoose.model('PaymentTransaction', PaymentTransactionSchema);


