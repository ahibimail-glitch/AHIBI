const mongoose = require('mongoose');

const CourtSchema = new mongoose.Schema({
  // Venue Reference
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SportsVenue',
    required: [true, 'Venue is required']
  },
  
  // Arena Partner Reference (for quick access)
  arenaPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArenaPartner',
    required: [true, 'Arena partner is required']
  },
  
  // Court Details
  courtName: {
    type: String,
    required: [true, 'Court name is required'],
    trim: true
  },
  courtNumber: {
    type: String,
    trim: true
  },
  
  // Sport Type
  sportType: {
    type: String,
    enum: [
      'cricket', 'football', 'basketball', 'badminton', 'tennis',
      'volleyball', 'table_tennis', 'squash', 'swimming', 'gym',
      'yoga', 'boxing', 'martial_arts', 'athletics', 'hockey',
      'kabaddi', 'archery', 'shooting', 'golf', 'other'
    ],
    required: [true, 'Sport type is required']
  },
  
  // Court Specifications
  specifications: {
    surfaceType: {
      type: String,
      enum: ['grass', 'turf', 'concrete', 'wood', 'clay', 'synthetic', 'tiles', 'mat', 'other']
    },
    dimensions: {
      length: Number,
      width: Number,
      unit: { type: String, enum: ['meters', 'feet'], default: 'meters' }
    },
    indoor: {
      type: Boolean,
      default: false
    },
    covered: {
      type: Boolean,
      default: false
    },
    airConditioned: {
      type: Boolean,
      default: false
    }
  },
  
  // Capacity
  capacity: {
    players: {
      type: Number,
      required: [true, 'Player capacity is required']
    },
    spectators: {
      type: Number,
      default: 0
    }
  },
  
  // Pricing Structure
  pricing: {
    // Weekday Pricing
    weekday: {
      offPeak: {
        pricePerHour: { type: Number, required: true },
        timeRange: { start: String, end: String }
      },
      peak: {
        pricePerHour: { type: Number, required: true },
        timeRange: { start: String, end: String }
      }
    },
    // Weekend Pricing
    weekend: {
      offPeak: {
        pricePerHour: { type: Number, required: true },
        timeRange: { start: String, end: String }
      },
      peak: {
        pricePerHour: { type: Number, required: true },
        timeRange: { start: String, end: String }
      }
    },
    // Minimum booking duration in minutes
    minimumDuration: {
      type: Number,
      default: 60,
      required: true
    },
    // Maximum booking duration in minutes
    maximumDuration: {
      type: Number,
      default: 180
    },
    // Slot interval in minutes (e.g., 30, 60)
    slotInterval: {
      type: Number,
      default: 60,
      enum: [30, 60, 90, 120]
    }
  },
  
  // Special Pricing (Holidays, Events)
  specialPricing: [{
    name: String,
    date: Date,
    pricePerHour: Number,
    isActive: { type: Boolean, default: true }
  }],
  
  // Availability Settings
  availability: {
    monday: { available: { type: Boolean, default: true }, slots: [] },
    tuesday: { available: { type: Boolean, default: true }, slots: [] },
    wednesday: { available: { type: Boolean, default: true }, slots: [] },
    thursday: { available: { type: Boolean, default: true }, slots: [] },
    friday: { available: { type: Boolean, default: true }, slots: [] },
    saturday: { available: { type: Boolean, default: true }, slots: [] },
    sunday: { available: { type: Boolean, default: true }, slots: [] }
  },
  
  // Blackout Dates (Maintenance, Private Events)
  blackoutDates: [{
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: {
      type: String,
      enum: ['maintenance', 'private_event', 'tournament', 'renovation', 'other'],
      required: true
    },
    notes: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Court Features
  features: {
    lighting: { type: Boolean, default: false },
    scoreboard: { type: Boolean, default: false },
    nets: { type: Boolean, default: false },
    goals: { type: Boolean, default: false },
    seating: { type: Boolean, default: false },
    soundSystem: { type: Boolean, default: false },
    cctv: { type: Boolean, default: false }
  },
  
  // Images
  images: [{
    url: String,
    caption: String,
    isMain: { type: Boolean, default: false }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'under_renovation'],
    default: 'active'
  },
  
  // Statistics
  statistics: {
    totalBookings: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    utilizationRate: { type: Number, default: 0 },
    averageBookingDuration: { type: Number, default: 0 }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp before saving
CourtSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if court is available on a specific date
CourtSchema.methods.isAvailableOnDate = function(date) {
  const checkDate = new Date(date);
  
  // Check blackout dates
  const isBlackedOut = this.blackoutDates.some(blackout => {
    const start = new Date(blackout.startDate);
    const end = new Date(blackout.endDate);
    return checkDate >= start && checkDate <= end;
  });
  
  if (isBlackedOut) {
    return false;
  }
  
  // Check day-wise availability
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[checkDate.getDay()];
  
  return this.availability[dayName]?.available !== false;
};

// Method to get pricing for a specific date and time
CourtSchema.methods.getPricing = function(date, startTime) {
  const checkDate = new Date(date);
  
  // Check for special pricing first
  const specialPrice = this.specialPricing.find(sp => {
    const spDate = new Date(sp.date);
    return spDate.toDateString() === checkDate.toDateString() && sp.isActive;
  });
  
  if (specialPrice) {
    return specialPrice.pricePerHour;
  }
  
  // Determine if weekend or weekday
  const dayOfWeek = checkDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  const pricingCategory = isWeekend ? this.pricing.weekend : this.pricing.weekday;
  
  // Determine peak or off-peak based on time
  const timeStr = startTime.replace(':', '');
  const peakStart = pricingCategory.peak.timeRange?.start?.replace(':', '') || '0000';
  const peakEnd = pricingCategory.peak.timeRange?.end?.replace(':', '') || '2359';
  
  if (timeStr >= peakStart && timeStr <= peakEnd) {
    return pricingCategory.peak.pricePerHour;
  } else {
    return pricingCategory.offPeak.pricePerHour;
  }
};

// Indexes for efficient querying
CourtSchema.index({ venue: 1 });
CourtSchema.index({ arenaPartner: 1 });
CourtSchema.index({ sportType: 1 });
CourtSchema.index({ status: 1 });

module.exports = mongoose.model('Court', CourtSchema);
