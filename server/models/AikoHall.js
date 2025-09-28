const mongoose = require('mongoose');

const AikoHallSchema = new mongoose.Schema({
  // Fixed venue information
  name: {
    type: String,
    default: 'Aiko Hall',
    required: true
  },
  address: {
    street: {
      type: String,
      default: 'Aiko Greens, Jorepukhri, purana bazaar'
    },
    city: {
      type: String,
      default: 'Dimapur'
    },
    state: {
      type: String,
      default: 'Nagaland'
    },
    pincode: {
      type: String,
      default: '797112'
    }
  },
  contactPerson: {
    name: {
      type: String,
      default: 'Aren, Dimapur'
    },
    phone: {
      type: [String],
      default: ['+91 90894 40443', '+91 96126 50551']
    },
    email: {
      type: String,
      default: null
    }
  },
  venueType: {
    type: [String],
    default: ['Concert/Event Hall', 'Private Banquet Hall']
  },
  venueCategory: {
    type: String,
    default: 'Indoor'
  },
  maxCapacity: {
    type: Number,
    default: 250,
    required: true
  },
  minBookingHours: {
    type: Number,
    default: 6,
    required: true
  },
  facilities: {
    inHouseCatering: {
      type: Boolean,
      default: true
    },
    parking: {
      type: Boolean,
      default: true
    },
    soundSystem: {
      type: Boolean,
      default: true
    },
    stage: {
      type: Boolean,
      default: true
    },
    powerBackup: {
      type: Boolean,
      default: true
    },
    accommodation: {
      type: Boolean,
      default: true
    },
    airConditioned: {
      type: Boolean,
      default: true
    }
  },
  inHouseEventManager: {
    type: Boolean,
    default: false
  },
  externalVendorsAllowed: {
    type: Boolean,
    default: true
  },
  marketingWithAhibi: {
    type: Boolean,
    default: true
  },
  advancePayment: {
    type: Boolean,
    default: false
  },
  bookingTerms: {
    type: String,
    default: 'nil'
  },
  notes: {
    type: String,
    default: 'nil'
  },
  // Admin configurable settings
  adminSettings: {
    capacity: {
      type: Number,
      default: 250
    },
    facilities: {
      inHouseCatering: { type: Boolean, default: true },
      parking: { type: Boolean, default: true },
      soundSystem: { type: Boolean, default: true },
      stage: { type: Boolean, default: true },
      powerBackup: { type: Boolean, default: true },
      accommodation: { type: Boolean, default: true },
      airConditioned: { type: Boolean, default: true }
    },
    terms: {
      type: String,
      default: 'nil'
    },
    minBookingHours: {
      type: Number,
      default: 6
    },
    pricePerHour: {
      type: Number,
      default: 2000 // Default price per hour
    }
  },
  // Statistics
  totalBookings: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
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

// Update the updatedAt timestamp before saving
AikoHallSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get or create the single Aiko Hall instance
AikoHallSchema.statics.getAikoHall = async function() {
  let aikoHall = await this.findOne();
  if (!aikoHall) {
    aikoHall = new this();
    await aikoHall.save();
  }
  return aikoHall;
};

module.exports = mongoose.model('AikoHall', AikoHallSchema);
