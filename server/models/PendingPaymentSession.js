const mongoose = require('mongoose');

const PendingPaymentSessionSchema = new mongoose.Schema({
  orderId: { type: String, index: true },
  orderIntentId: { type: String },
  settlementVersion: { type: Number, default: 1 },
  paymentId: { type: String },
  settlementLeaseId: { type: String },
  settlementLeaseUntil: { type: Date },
  bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  amount: { type: Number },
  amountPaise: { type: Number },
  currency: { type: String, default: 'INR' },
  bookingDetails: { type: Object },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  status: { type: String, enum: ['creating_order', 'created', 'verified', 'settling', 'paid_no_booking', 'completed', 'failed'], default: 'created', index: true },
  errorMessage: { type: String },
}, { timestamps: true });

PendingPaymentSessionSchema.index(
  { orderIntentId: 1 },
  { unique: true, partialFilterExpression: { orderIntentId: { $type: 'string' } } }
);

module.exports = mongoose.model('PendingPaymentSession', PendingPaymentSessionSchema);


