const mongoose = require('mongoose');

const PendingPaymentSessionSchema = new mongoose.Schema({
  orderId: { type: String, index: true },
  amount: { type: Number },
  currency: { type: String, default: 'INR' },
  bookingDetails: { type: Object },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  status: { type: String, enum: ['created', 'verified', 'completed', 'failed'], default: 'created', index: true },
  errorMessage: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('PendingPaymentSession', PendingPaymentSessionSchema);


