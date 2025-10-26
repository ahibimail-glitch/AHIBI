const mongoose = require('mongoose');

const VenueBookingSchema = new mongoose.Schema({
  // Venue reference
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: [true, 'Venue is required']
  },
  // User information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  // Booking details
  bookingDate: {
    type: Date,
    required: [true, 'Booking date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
  },
  duration: {
    type: Number, // in hours
    required: true
  },
  guestCount: {
    type: Number,
    required: [true, 'Guest count is required'],
    min: [1, 'Guest count must be at least 1']
  },
  eventType: {
    type: String,
    trim: true
  },
  specialRequirements: {
    type: String,
    trim: true
  },
  // Booking status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  // Pricing
  pricing: {
    basePrice: {
      type: Number,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    }
  },
  // Payment details
  paymentDetails: {
    razorpayOrderId: {
      type: String
    },
    paymentId: {
      type: String
    },
    signature: {
      type: String
    }
  },
  // Venue manager notes
  venueNotes: {
    type: String,
    trim: true
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
VenueBookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate duration from start and end time
VenueBookingSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const start = new Date(`2000-01-01T${this.startTime}:00`);
    const end = new Date(`2000-01-01T${this.endTime}:00`);
    
    // Handle overnight bookings
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    
    this.duration = (end - start) / (1000 * 60 * 60); // Convert to hours
  }
  next();
});

// Index for efficient querying
VenueBookingSchema.index({ venue: 1, bookingDate: 1, status: 1 });
VenueBookingSchema.index({ user: 1, status: 1 });
VenueBookingSchema.index({ bookingDate: 1 });

// Static method to check availability for a specific venue, date and time
VenueBookingSchema.statics.checkAvailability = async function(venueId, bookingDate, startTime, endTime, excludeBookingId = null) {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  
  // Handle overnight bookings
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  
  const query = {
    venue: venueId,
    bookingDate: new Date(bookingDate),
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      // New booking starts during existing booking
      {
        startTime: { $lte: startTime },
        endTime: { $gt: startTime }
      },
      // New booking ends during existing booking
      {
        startTime: { $lt: endTime },
        endTime: { $gte: endTime }
      },
      // New booking completely contains existing booking
      {
        startTime: { $gte: startTime },
        endTime: { $lte: endTime }
      },
      // Existing booking completely contains new booking
      {
        startTime: { $lte: startTime },
        endTime: { $gte: endTime }
      }
    ]
  };
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  const conflictingBookings = await this.find(query);
  return conflictingBookings.length === 0;
};

module.exports = mongoose.model('VenueBooking', VenueBookingSchema);
