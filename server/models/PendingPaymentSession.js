const mongoose = require('mongoose');

const PendingPaymentSessionSchema = new mongoose.Schema({
  orderId: { type: String, index: true },
  orderIntentId: { type: String },
  settlementVersion: { type: Number, default: 1 },
  fulfillmentType: { type: String, enum: ['event_tickets', 'daily_event_tickets'], default: 'event_tickets' },
  paymentId: { type: String },
  settlementLeaseId: { type: String },
  settlementLeaseUntil: { type: Date },
  reconciliationLeaseId: { type: String },
  reconciliationLeaseUntil: { type: Date },
  settlementAttemptCount: { type: Number, default: 0 },
  reconciliationAttemptCount: { type: Number, default: 0 },
  lastSettlementAttemptAt: { type: Date },
  lastReconciliationAt: { type: Date },
  nextSettlementAttemptAt: { type: Date, default: Date.now },
  nextIntegrityCheckAt: { type: Date },
  lastSettlementErrorCode: { type: String },
  lastSettlementError: { type: String },
  capturedAt: { type: Date },
  needsAdminIntervention: { type: Boolean, default: false, index: true },
  bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  legacyBookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  amount: { type: Number },
  amountPaise: { type: Number },
  currency: { type: String, default: 'INR' },
  bookingDetails: { type: Object },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  dailyEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyEvent' },
  status: { type: String, enum: ['creating_order', 'created', 'verified', 'settling', 'paid_no_booking', 'completed', 'failed'], default: 'created', index: true },
  errorMessage: { type: String },
}, { timestamps: true });

PendingPaymentSessionSchema.index(
  { orderIntentId: 1 },
  { unique: true, partialFilterExpression: { orderIntentId: { $type: 'string' } } }
);
PendingPaymentSessionSchema.index({ settlementVersion: 1, status: 1, nextSettlementAttemptAt: 1 });

module.exports = mongoose.model('PendingPaymentSession', PendingPaymentSessionSchema);


