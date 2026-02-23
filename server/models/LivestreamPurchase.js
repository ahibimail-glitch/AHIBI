/**
 * LivestreamPurchase Model
 * Tracks payments for livestream access
 */

const mongoose = require('mongoose');

const livestreamPurchaseSchema = new mongoose.Schema({
  // User who made the purchase
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Live stream reference
  livestream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiveStream',
    required: true,
    index: true
  },

  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'INR'
  },

  // Razorpay payment details
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  razorpayPaymentId: {
    type: String,
    index: true
  },

  razorpaySignature: {
    type: String
  },

  // Payment status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },

  // Payment timestamps
  paymentDate: {
    type: Date
  },

  // Access granted
  accessGranted: {
    type: Boolean,
    default: false
  },

  // Access expiry (if any)
  accessExpiresAt: {
    type: Date
  },

  // Refund details (if applicable)
  refundAmount: {
    type: Number,
    default: 0
  },

  refundDate: {
    type: Date
  },

  refundReason: {
    type: String
  },

  // Metadata
  ipAddress: {
    type: String
  },

  userAgent: {
    type: String
  }

}, {
  timestamps: true
});

// Indexes for common queries
livestreamPurchaseSchema.index({ user: 1, livestream: 1 });
livestreamPurchaseSchema.index({ status: 1, createdAt: -1 });
livestreamPurchaseSchema.index({ razorpayOrderId: 1 });

// Virtual for checking if access is still valid
livestreamPurchaseSchema.virtual('hasValidAccess').get(function() {
  if (this.status !== 'completed' || !this.accessGranted) {
    return false;
  }
  
  if (this.accessExpiresAt && new Date() > this.accessExpiresAt) {
    return false;
  }
  
  return true;
});

// Static method to find user's valid purchases for a livestream
livestreamPurchaseSchema.statics.findUserValidAccess = function(userId, livestreamId) {
  return this.findOne({
    user: userId,
    livestream: livestreamId,
    status: 'completed',
    accessGranted: true,
    $or: [
      { accessExpiresAt: { $exists: false } },
      { accessExpiresAt: { $gt: new Date() } }
    ]
  });
};

// Static method to get user's purchase history
livestreamPurchaseSchema.statics.getUserPurchaseHistory = function(userId, options = {}) {
  const { page = 1, limit = 20, status } = options;
  
  const query = { user: userId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('livestream', 'title description status scheduledStartTime')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
};

// Pre-save middleware
livestreamPurchaseSchema.pre('save', function(next) {
  // Set payment date when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.paymentDate) {
    this.paymentDate = new Date();
  }
  
  // Grant access when payment is completed
  if (this.isModified('status') && this.status === 'completed') {
    this.accessGranted = true;
  }
  
  next();
});

// Ensure virtuals are included in JSON output
livestreamPurchaseSchema.set('toJSON', { virtuals: true });
livestreamPurchaseSchema.set('toObject', { virtuals: true });

const LivestreamPurchase = mongoose.model('LivestreamPurchase', livestreamPurchaseSchema);

module.exports = LivestreamPurchase;
