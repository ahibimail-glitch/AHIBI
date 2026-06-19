const mongoose = require('mongoose');

const teachingBookingSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: true,
    index: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeachingClass',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  studentName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  studentEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  studentPhone: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  mode: {
    type: String,
    enum: ['online', 'offline'],
    required: true,
  },
  bookingDate: {
    type: Date,
    required: true,
    index: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  durationMinutes: {
    type: Number,
    min: 15,
  },
  pricing: {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
  },
  payment: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    amountPaid: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paidAt: Date,
  },
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'completed', 'cancelled', 'refunded'],
    default: 'pending_payment',
    index: true,
  },
  confirmedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  invoicePdf: {
    type: Buffer,
    select: false,
  },
  invoicePdfContentType: {
    type: String,
    default: 'application/pdf',
  },
  invoiceGeneratedAt: Date,
  invoiceUrl: String,
}, {
  timestamps: true,
});

teachingBookingSchema.pre('save', async function assignInvoiceNumber(next) {
  if (['confirmed', 'completed'].includes(this.status) && !this.invoiceNumber) {
    const TeachingBookingModel = mongoose.model('TeachingBooking');
    const count = await TeachingBookingModel.countDocuments({
      status: { $in: ['confirmed', 'completed'] },
    });
    this.invoiceNumber = `INV-TCH-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

teachingBookingSchema.index({ artistId: 1, bookingDate: 1, status: 1 });
teachingBookingSchema.index({ payment: { razorpayOrderId: 1 } });
teachingBookingSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model('TeachingBooking', teachingBookingSchema);
