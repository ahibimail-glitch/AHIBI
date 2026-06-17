const mongoose = require('mongoose');

const ArtistAvailabilitySchema = new mongoose.Schema({
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlots: [{
    startTime: {
      type: String,
      required: true // Format: "HH:MM" (24-hour format)
    },
    endTime: {
      type: String,
      required: true // Format: "HH:MM" (24-hour format)
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    isBooked: {
      type: Boolean,
      default: false
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArtistBooking'
    },
    price: {
      type: Number // Custom price for this time slot
    },
    note: {
      type: String
    }
  }],
  dayStatus: {
    type: String,
    enum: ['available', 'unavailable', 'partially_booked', 'fully_booked'],
    default: 'available'
  },
  recurringPattern: {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none'
    },
    endDate: {
      type: Date
    },
    daysOfWeek: [{
      type: Number, // 0-6 (Sunday-Saturday)
      min: 0,
      max: 6
    }]
  },
  specialPricing: {
    isSpecialDay: {
      type: Boolean,
      default: false
    },
    multiplier: {
      type: Number,
      default: 1 // 1.5 means 50% more than base price
    },
    fixedPrice: {
      type: Number
    },
    reason: {
      type: String // e.g., "Holiday", "Weekend", "Peak Season"
    }
  },
  minimumBookingDuration: {
    type: Number,
    default: 2 // minimum hours
  },
  maximumBookingDuration: {
    type: Number,
    default: 8 // maximum hours
  },
  advanceBookingDays: {
    type: Number,
    default: 7 // how many days in advance booking is required
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries
ArtistAvailabilitySchema.index({ artist: 1, date: 1 }, { unique: true });
ArtistAvailabilitySchema.index({ artist: 1, date: 1, 'timeSlots.isAvailable': 1 });

// Update timestamp on save
ArtistAvailabilitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if a time slot is available
ArtistAvailabilitySchema.methods.isTimeSlotAvailable = function(startTime, endTime) {
  return this.timeSlots.some(slot => 
    slot.startTime <= startTime && 
    slot.endTime >= endTime && 
    slot.isAvailable && 
    !slot.isBooked
  );
};

// Method to book a time slot
ArtistAvailabilitySchema.methods.bookTimeSlot = function(startTime, endTime, bookingId) {
  const slot = this.timeSlots.find(slot => 
    slot.startTime <= startTime && 
    slot.endTime >= endTime && 
    slot.isAvailable && 
    !slot.isBooked
  );
  
  if (slot) {
    slot.isBooked = true;
    slot.bookingId = bookingId;
    this.updateDayStatus();
    return true;
  }
  return false;
};

// Method to update day status based on time slots
ArtistAvailabilitySchema.methods.updateDayStatus = function() {
  if (!this.timeSlots || this.timeSlots.length === 0) {
    this.dayStatus = 'available';
    return;
  }

  const availableSlots = this.timeSlots.filter(slot => slot.isAvailable && !slot.isBooked);
  const bookedSlots = this.timeSlots.filter(slot => slot.isBooked);
  
  if (bookedSlots.length === this.timeSlots.length && this.timeSlots.length > 0) {
    this.dayStatus = 'fully_booked';
  } else if (bookedSlots.length > 0) {
    this.dayStatus = 'partially_booked';
  } else if (availableSlots.length === 0) {
    this.dayStatus = 'unavailable';
  } else {
    this.dayStatus = 'available';
  }
};

// Method to get available time slots for a date
ArtistAvailabilitySchema.methods.getAvailableSlots = function() {
  return this.timeSlots.filter(slot => slot.isAvailable && !slot.isBooked);
};

// Method to calculate price for a time slot
ArtistAvailabilitySchema.methods.calculatePrice = function(startTime, endTime, basePrice) {
  const slot = this.timeSlots.find(slot => 
    slot.startTime <= startTime && slot.endTime >= endTime
  );
  
  let price = basePrice;
  
  // Use slot-specific price if available
  if (slot && slot.price) {
    price = slot.price;
  }
  
  // Apply special pricing if it's a special day
  if (this.specialPricing.isSpecialDay) {
    if (this.specialPricing.fixedPrice) {
      price = this.specialPricing.fixedPrice;
    } else if (this.specialPricing.multiplier) {
      price = price * this.specialPricing.multiplier;
    }
  }
  
  return price;
};

module.exports = mongoose.model('ArtistAvailability', ArtistAvailabilitySchema);
