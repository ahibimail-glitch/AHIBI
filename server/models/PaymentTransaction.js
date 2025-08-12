const mongoose = require('mongoose');

const PaymentTransactionSchema = new mongoose.Schema({
  orderId: { type: String, index: true },
  paymentId: { type: String, index: true },
  signature: { type: String },
  amount: { type: Number },
  currency: { type: String, default: 'INR' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userSnapshot: {
    name: String,
    email: String,
    phone: String,
    id: String,
  },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
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
}, { timestamps: true });

PaymentTransactionSchema.index({ orderId: 1, paymentId: 1 }, { unique: false });

module.exports = mongoose.model('PaymentTransaction', PaymentTransactionSchema);


