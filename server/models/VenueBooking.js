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

// Static method to get all bookings for a specific venue and date
VenueBookingSchema.statics.getBookingsForDate = async function(venueId, bookingDate) {
  // Create start and end of day for the given date to handle timezone issues
  const startOfDay = new Date(bookingDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  
  const endOfDay = new Date(bookingDate);
  endOfDay.setUTCHours(23, 59, 59, 999);
  
  console.log('Searching for bookings between:', startOfDay, 'and', endOfDay);
  
  return await this.find({
    venue: venueId,
    bookingDate: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    status: { $in: ['pending', 'confirmed'] }
  }).select('startTime endTime status user guestCount eventType').populate('user', 'name');
};

// Static method to generate available time slots for a specific date
VenueBookingSchema.statics.getAvailableTimeSlots = async function(venueId, bookingDate) {
  const Venue = mongoose.model('Venue');
  const venue = await Venue.findById(venueId);
  
  const existingBookings = await this.getBookingsForDate(venueId, bookingDate);
  
  // Check for blocked slots on this date
  const dateObj = new Date(bookingDate);
  const blockedSlot = venue?.blockedSlots?.find(slot => {
    const slotDate = new Date(slot.date);
    return slotDate.toDateString() === dateObj.toDateString();
  });
  
  // If full day is blocked, return all slots as unavailable
  if (blockedSlot && blockedSlot.isFullDayBlocked) {
    return {
      date: bookingDate,
      isFullDayBlocked: true,
      blockedReason: blockedSlot.reason,
      blockedNotes: blockedSlot.notes,
      existingBookings: [],
      timeSlots: [],
      summary: {
        totalSlots: 0,
        availableSlots: 0,
        bookedSlots: 0
      }
    };
  }
  
  // Generate all possible time slots (30-minute intervals from 00:00 to 23:30)
  const allTimeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      allTimeSlots.push(timeString);
    }
  }
  
  // Mark slots as available or booked
  const timeSlotStatus = allTimeSlots.map(timeSlot => {
    // Check if slot is booked
    const isBooked = existingBookings.some(booking => {
      const bookingStart = booking.startTime;
      const bookingEnd = booking.endTime;
      return timeSlot >= bookingStart && timeSlot < bookingEnd;
    });
    
    // Check if slot is blocked by venue owner
    let isBlocked = false;
    let blockReason = null;
    if (blockedSlot && blockedSlot.timeSlots && blockedSlot.timeSlots.length > 0) {
      isBlocked = blockedSlot.timeSlots.some(slot => {
        return timeSlot >= slot.startTime && timeSlot < slot.endTime;
      });
      if (isBlocked) {
        blockReason = blockedSlot.reason;
      }
    }
    
    return {
      time: timeSlot,
      available: !isBooked && !isBlocked,
      isBooked: isBooked,
      isBlocked: isBlocked,
      blockReason: blockReason,
      bookings: isBooked ? existingBookings.filter(booking => 
        timeSlot >= booking.startTime && timeSlot < booking.endTime
      ) : []
    };
  });
  
  return {
    date: bookingDate,
    isFullDayBlocked: false,
    existingBookings: existingBookings,
    timeSlots: timeSlotStatus,
    summary: {
      totalSlots: allTimeSlots.length,
      availableSlots: timeSlotStatus.filter(slot => slot.available).length,
      bookedSlots: timeSlotStatus.filter(slot => !slot.available).length,
      blockedSlots: timeSlotStatus.filter(slot => slot.isBlocked).length
    }
  };
};

module.exports = mongoose.model('VenueBooking', VenueBookingSchema);
