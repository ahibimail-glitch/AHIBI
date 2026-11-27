const mongoose = require('mongoose');

const PassengerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: null, trim: true },
}, { _id: false });

const HeliBookingSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  paymentId: { type: String, default: null, index: true },
  receipt: { type: String, default: null },

  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contact: {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: null, trim: true },
  },

  productId: { type: String, required: true },
  productName: { type: String, required: true },
  sector: { type: String, default: '' },
  slotId: { type: String, required: true },
  slotLabel: { type: String, default: '' },
  date: { type: String, required: true, index: true }, // ISO date of the ride

  pricePerSeat: { type: Number, required: true },
  seats: { type: Number, required: true, min: 1 },
  passengers: { type: [PassengerSchema], default: [] },

  amount: { type: Number, required: true },      // INR
  amountMinor: { type: Number, required: true }, // paise
  currency: { type: String, default: 'INR' },

  seatsApplied: { type: Boolean, default: false }, // guards atomic inventory increment
  bookingRef: { type: String, default: null, index: true },
  qrCode: { type: String, default: null },

  status: {
    type: String,
    enum: ['created', 'settling', 'completed', 'no_seats', 'failed', 'refunded'],
    default: 'created',
    index: true,
  },
  test: { type: Boolean, default: false },
  ticketsEmailed: { type: Boolean, default: false },

  refund: {
    status: { type: String, enum: ['none', 'processed', 'failed'], default: 'none' },
    refundId: { type: String, default: null },
    amountMinor: { type: Number, default: 0 },
    at: { type: Date, default: null },
    reason: { type: String, default: null },
  },
}, { timestamps: true });

HeliBookingSchema.index({ status: 1, date: 1, productId: 1, slotId: 1 });

module.exports = mongoose.model('HeliBooking', HeliBookingSchema);
