const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donorName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  message: {
    type: String,
    trim: true
  },
  campaign: {
    type: String,
    default: 'The Awakening',
    enum: ['The Awakening']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  razorpayOrderId: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  transactionId: {
    type: String
  },
  paymentMethod: {
    type: String
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  receiptSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
donationSchema.index({ campaign: 1, paymentStatus: 1 });
donationSchema.index({ createdAt: -1 });
donationSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model('Donation', donationSchema);
