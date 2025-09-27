const mongoose = require('mongoose');

const AikoHallBookingSchema = new mongoose.Schema({
  // Customer information
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    }
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
    min: [1, 'Guest count must be at least 1'],
    max: [250, 'Guest count cannot exceed 250']
  },
  specialNotes: {
    type: String,
    trim: true
  },
  // Booking status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  // Admin notes
  adminNotes: {
    type: String,
    trim: true
  },
  // Pricing (if applicable in future)
  pricing: {
    basePrice: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    }
  },
  // Timestamps
  bookedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
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
AikoHallBookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate duration from start and end time
AikoHallBookingSchema.pre('save', function(next) {
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
AikoHallBookingSchema.index({ bookingDate: 1, status: 1 });
AikoHallBookingSchema.index({ 'customer.phone': 1 });
AikoHallBookingSchema.index({ 'customer.email': 1 });

// Static method to check availability for a specific date and time
AikoHallBookingSchema.statics.checkAvailability = async function(bookingDate, startTime, endTime, excludeBookingId = null) {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  
  // Handle overnight bookings
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  
  const query = {
    bookingDate: new Date(bookingDate),
    status: { $in: ['pending', 'approved'] },
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

module.exports = mongoose.model('AikoHallBooking', AikoHallBookingSchema);
