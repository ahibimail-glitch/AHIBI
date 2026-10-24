const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: function() {
      return !this.dailyEvent;
    }
  },
  dailyEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyEvent'
  },
  isDailyEvent: {
    type: Boolean,
    default: false
  },
  selectedDate: {
    type: Date
  },
  // Snapshot of event details at the time of booking to preserve info if the event is later deleted/changed
  eventSnapshot: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    title: {
      type: String
    },
    banner: {
      type: String
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    location: {
      address: { type: String },
      city: { type: String }
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketType: {
    type: String,
    required: true
  },
  ticketTypeId: {
    type: mongoose.Schema.Types.ObjectId
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'refunded', 'checked-in'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String
  },
  nuscOrderId: {
    type: String,
  },
  nuscTicketIndex: {
    type: Number,
  },
  nuscSuiteBoxNumber: {
    type: Number,
    min: 1,
    max: 4,
  },
  nuscSeasonPassType: {
    type: String,
    enum: ['general-season', 'premium-season'],
  },
  nuscSeasonMatchIndex: {
    type: Number,
    min: 1,
    max: 10,
  },
  // QR code verification fields
  entryVerified: {
    type: Boolean,
    default: false
  },
  entryVerifiedAt: {
    type: Date
  },
  entryVerifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Ticket-specific fields for multiple ticket bookings
  ticketIndex: {
    type: Number,
    default: 1
  },
  totalTickets: {
    type: Number,
    default: 1
  },
  // Optional customer details when booking is created manually or for guests
  customerName: {
    type: String,
  },
  customerPhone: {
    type: String,
  },
  // GE Blaster: number of players in the exclusive slot booking (2-6)
  playerCount: {
    type: Number,
  },
  // GE Blaster: whether the group requested special bullets
  needSpecialBullets: {
    type: Boolean,
    default: false,
  },
  // Razorpay identifiers (set on verify)
  razorpayPaymentId: {
    type: String,
  },
  razorpayOrderId: {
    type: String,
  },
  qrCode: {
    type: String,
  },
  // Country selection for HMF events
  country: {
    type: String,
    default: 'India'
  },
  // State/Province selection for HMF events
  state: {
    type: String,
  },
  // Mode of payment for manual HMF bookings
  modeOfPayment: {
    type: String,
    enum: ['Cash', 'Card', 'UPI'],
  },
  // Visitor type for manual bookings
  visitorType: {
    type: String,
    enum: ['Local', 'Domestic', 'International'],
  },
  parentBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  bookedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
BookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Add index for better query performance
BookingSchema.index({ event: 1, user: 1, status: 1 });
BookingSchema.index(
  { nuscOrderId: 1, nuscTicketIndex: 1 },
  { unique: true, partialFilterExpression: { nuscOrderId: { $type: 'string' } } }
);

module.exports = mongoose.model('Booking', BookingSchema);
