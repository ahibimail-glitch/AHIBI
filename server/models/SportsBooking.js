const mongoose = require('mongoose');

const SportsBookingSchema = new mongoose.Schema({
  // User Reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Venue & Court References
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SportsVenue',
    required: [true, 'Venue is required']
  },
  court: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Court',
    required: [true, 'Court is required']
  },
  
  // Arena Partner Reference
  arenaPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArenaPartner',
    required: [true, 'Arena partner is required']
  },
  
  // Booking Details
  bookingDate: {
    type: Date,
    required: [true, 'Booking date is required']
  },
  
  // Time Slots
  slots: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeSlot'
  }],
  
  // Consolidated Time Range
  startTime: {
    type: String,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required']
  },
  
  // Duration in minutes
  duration: {
    type: Number,
    required: true
  },
  
  // Player Details
  numberOfPlayers: {
    type: Number,
    required: [true, 'Number of players is required'],
    min: 1
  },
  
  // Contact Details
  contactDetails: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String
    }
  },
  
  // Special Requests
  specialRequests: {
    type: String,
    trim: true
  },
  
  // Pricing Breakdown
  pricing: {
    baseAmount: {
      type: Number,
      required: true
    },
    equipmentRental: {
      type: Number,
      default: 0
    },
    coachingFee: {
      type: Number,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    platformFee: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    
    // Commission Breakdown
    platformCommission: {
      type: Number,
      required: true
    },
    arenaEarnings: {
      type: Number,
      required: true
    }
  },
  
  // Payment Details
  payment: {
    razorpayOrderId: {
      type: String
    },
    razorpayPaymentId: {
      type: String
    },
    razorpaySignature: {
      type: String
    },
    amountPaid: {
      type: Number,
      default: 0
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'cash', 'wallet', 'upi']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: {
      type: Date
    }
  },
  
  // Booking Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },
  
  // Check-in Details
  checkIn: {
    checkedIn: {
      type: Boolean,
      default: false
    },
    checkedInAt: {
      type: Date
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArenaPartner'
    }
  },
  
  // Check-out Details
  checkOut: {
    checkedOut: {
      type: Boolean,
      default: false
    },
    checkedOutAt: {
      type: Date
    }
  },
  
  // Cancellation Details
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['user', 'arena', 'admin']
    },
    cancelledAt: {
      type: Date
    },
    reason: {
      type: String
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending'
    },
    refundedAt: {
      type: Date
    }
  },
  
  // Equipment Rental
  equipmentRented: [{
    itemName: String,
    quantity: Number,
    price: Number
  }],
  
  // Coaching
  coachingBooked: {
    coach: {
      type: String
    },
    duration: {
      type: Number
    },
    price: {
      type: Number
    }
  },
  
  // Invoice
  invoiceNumber: {
    type: String,
    unique: true
  },
  invoiceUrl: {
    type: String
  },
  
  // Notifications
  notifications: {
    bookingConfirmation: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    },
    reminder: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    },
    checkInReminder: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    }
  },
  
  // Rating & Review
  review: {
    submitted: {
      type: Boolean,
      default: false
    },
    submittedAt: {
      type: Date
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp before saving
SportsBookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate invoice number before saving
SportsBookingSchema.pre('save', async function(next) {
  if (!this.invoiceNumber && this.status === 'confirmed') {
    const count = await mongoose.model('SportsBooking').countDocuments();
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    this.invoiceNumber = `AHIBI-SPT-${year}${month}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Calculate duration from slots
SportsBookingSchema.pre('save', function(next) {
  if (this.startTime && this.endTime && !this.duration) {
    const start = new Date(`2000-01-01T${this.startTime}:00`);
    const end = new Date(`2000-01-01T${this.endTime}:00`);
    
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    
    this.duration = (end - start) / (1000 * 60); // Convert to minutes
  }
  next();
});

// Static method to check availability
SportsBookingSchema.statics.checkAvailability = async function(courtId, date, startTime, endTime) {
  const TimeSlot = mongoose.model('TimeSlot');
  
  const conflictingSlots = await TimeSlot.find({
    court: courtId,
    date: new Date(date),
    status: { $in: ['booked', 'held'] },
    $or: [
      {
        startTime: { $lte: startTime },
        endTime: { $gt: startTime }
      },
      {
        startTime: { $lt: endTime },
        endTime: { $gte: endTime }
      },
      {
        startTime: { $gte: startTime },
        endTime: { $lte: endTime }
      }
    ]
  });
  
  return conflictingSlots.length === 0;
};

// Method to calculate refund amount based on cancellation policy
SportsBookingSchema.methods.calculateRefund = function() {
  const now = new Date();
  const bookingDateTime = new Date(this.bookingDate);
  bookingDateTime.setHours(parseInt(this.startTime.split(':')[0]));
  bookingDateTime.setMinutes(parseInt(this.startTime.split(':')[1]));
  
  const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
  
  let refundPercentage = 0;
  
  if (hoursUntilBooking >= 24) {
    refundPercentage = 90; // 90% refund if cancelled 24+ hours before
  } else if (hoursUntilBooking >= 12) {
    refundPercentage = 50; // 50% refund if cancelled 12-24 hours before
  } else if (hoursUntilBooking >= 6) {
    refundPercentage = 25; // 25% refund if cancelled 6-12 hours before
  } else {
    refundPercentage = 0; // No refund if cancelled less than 6 hours before
  }
  
  return Math.round((this.pricing.totalAmount * refundPercentage) / 100);
};

// Indexes for efficient querying
SportsBookingSchema.index({ user: 1, status: 1 });
SportsBookingSchema.index({ venue: 1, bookingDate: 1 });
SportsBookingSchema.index({ court: 1, bookingDate: 1 });
SportsBookingSchema.index({ arenaPartner: 1, status: 1 });
SportsBookingSchema.index({ status: 1, bookingDate: 1 });
SportsBookingSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model('SportsBooking', SportsBookingSchema);
