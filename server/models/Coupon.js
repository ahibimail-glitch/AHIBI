const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  event: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true },
  },
  ticketCategory: {
    type: String,
    required: true,
  },
  discountPercentage: {
    type: Number,
    required: false,
    min: 0,
    max: 100,
  },
  discountPrice: {
    type: Number,
    required: false,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'used'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
  },
  usedAt: {
    type: Date,
  },
  timesUsed: {
    type: Number,
    default: 0,
  },
  generatedBy: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    name: { type: String },
    email: { type: String },
  },
});

CouponSchema.pre('validate', function(next) {
  if ((this.discountPercentage === undefined || this.discountPercentage === null) && 
      (this.discountPrice === undefined || this.discountPrice === null)) {
    this.invalidate('discountPercentage', 'Either discountPercentage or discountPrice must be provided');
  }
  if (this.discountPercentage !== undefined && this.discountPercentage !== null && 
      this.discountPrice !== undefined && this.discountPrice !== null) {
    this.invalidate('discountPercentage', 'Cannot have both discountPercentage and discountPrice');
  }
  next();
});

CouponSchema.index({ code: 1 });

module.exports = mongoose.model('Coupon', CouponSchema);


