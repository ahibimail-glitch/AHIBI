const mongoose = require('mongoose');

const NuscHomeMatchOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  checkoutRequestId: { type: String, default: null },
  checkoutRequestHash: { type: String, default: null },
  paymentId: { type: String, default: null, index: true },
  orderType: { type: String, enum: ['match', 'seasonPass'], default: 'match', index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookingDetails: { type: Object, required: true },
  amount: { type: Number, required: true },
  amountMinor: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['created', 'settling', 'completed', 'paid_no_booking', 'failed', 'refund_pending', 'refunded'],
    default: 'created',
    index: true,
  },
  settlementLeaseUntil: { type: Date, default: null },
  bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  errorMessage: { type: String },
  refundStatus: {
    type: String,
    enum: ['not_requested', 'requested', 'pending', 'processed', 'failed_review'],
    default: 'not_requested',
  },
  refundId: { type: String, default: null },
  refundedAmountMinor: { type: Number, default: 0 },
  refundedAt: { type: Date, default: null },
  refundRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  operationsAudit: [{
    action: { type: String, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    at: { type: Date, default: Date.now },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }],
}, { timestamps: true });

NuscHomeMatchOrderSchema.index(
  { user: 1, checkoutRequestId: 1 },
  { unique: true, partialFilterExpression: { checkoutRequestId: { $type: 'string' } } }
);

module.exports = mongoose.model('NuscHomeMatchOrder', NuscHomeMatchOrderSchema);
