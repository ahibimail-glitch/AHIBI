const mongoose = require('mongoose');

const SportsVenueSchema = new mongoose.Schema({
  // Arena Partner Reference
  arenaPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArenaPartner',
    required: [true, 'Arena partner is required']
  },
  
  // Basic Information
  venueName: {
    type: String,
    required: [true, 'Venue name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  tagline: {
    type: String,
    trim: true
  },
  
  // Sports Supported
  sportsSupported: [{
    type: String,
    enum: [
      'cricket', 'football', 'basketball', 'badminton', 'tennis',
      'volleyball', 'table_tennis', 'squash', 'swimming', 'gym',
      'yoga', 'boxing', 'martial_arts', 'athletics', 'hockey',
      'kabaddi', 'archery', 'shooting', 'golf', 'other', 'pickleball'
    ],
    required: true
  }],
  otherSport: {
    type: String,
    trim: true
  },
  
  // Location Details
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    area: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
    },
    landmark: {
      type: String,
      trim: true
    }
  },
  
  // GPS Coordinates for distance-based discovery
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
      required: true
    }
  },
  
  // Google Maps Integration
  googleMapsLink: {
    type: String,
    trim: true
  },
  
  // Contact Information
  contactInfo: {
    primaryPhone: {
      type: String,
      required: [true, 'Primary phone is required'],
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    secondaryPhone: {
      type: String,
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    whatsappNumber: {
      type: String,
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    }
  },
  
  // Operating Hours
  operatingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  },
  
  // Facilities & Amenities
  facilities: {
    parking: {
      available: { type: Boolean, default: false },
      capacity: Number,
      twoWheeler: { type: Boolean, default: false },
      fourWheeler: { type: Boolean, default: false },
      free: { type: Boolean, default: false }
    },
    washrooms: {
      available: { type: Boolean, default: false },
      count: Number,
      cleanlinessRating: Number
    },
    changingRooms: {
      available: { type: Boolean, default: false },
      count: Number,
      lockers: { type: Boolean, default: false }
    },
    showers: {
      available: { type: Boolean, default: false },
      hotWater: { type: Boolean, default: false }
    },
    drinkingWater: {
      available: { type: Boolean, default: false },
      purified: { type: Boolean, default: false }
    },
    firstAid: {
      available: { type: Boolean, default: false },
      trainedStaff: { type: Boolean, default: false }
    },
    cafeteria: {
      available: { type: Boolean, default: false },
      description: String
    },
    proShop: {
      available: { type: Boolean, default: false },
      description: String
    },
    wifi: {
      available: { type: Boolean, default: false },
      free: { type: Boolean, default: false }
    },
    floodlights: {
      available: { type: Boolean, default: false }
    },
    seating: {
      available: { type: Boolean, default: false },
      capacity: Number
    },
    wheelchairAccess: {
      available: { type: Boolean, default: false }
    }
  },
  
  // Equipment Rental
  equipmentRental: {
    available: { type: Boolean, default: false },
    items: [{
      name: String,
      price: Number,
      available: { type: Boolean, default: true }
    }]
  },
  
  // Coaching Services
  coachingAvailable: {
    type: Boolean,
    default: false
  },
  coaches: [{
    name: String,
    sport: String,
    experience: Number,
    certification: String,
    pricePerSession: Number,
    available: { type: Boolean, default: true }
  }],
  
  // Media Gallery
  gallery: {
    images: [{
      url: String,
      caption: String,
      isMain: { type: Boolean, default: false },
      uploadedAt: { type: Date, default: Date.now }
    }],
    videos: [{
      url: String,
      caption: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    virtualTour: {
      url: String,
      type: { type: String, enum: ['360', 'video', 'link'] }
    }
  },
  
  // Rules & Policies
  rules: {
    cancellationPolicy: {
      type: String,
      required: true
    },
    refundPolicy: {
      type: String,
      required: true
    },
    dresscode: {
      type: String
    },
    ageRestrictions: {
      type: String
    },
    additionalRules: {
      type: String
    }
  },
  
  // Approval Status
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Ratings & Reviews
  rating: {
    overall: { type: Number, default: 0, min: 0, max: 5 },
    cleanliness: { type: Number, default: 0, min: 0, max: 5 },
    facilities: { type: Number, default: 0, min: 0, max: 5 },
    staff: { type: Number, default: 0, min: 0, max: 5 },
    valueForMoney: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SportsBooking'
    },
    ratings: {
      overall: { type: Number, required: true, min: 1, max: 5 },
      cleanliness: { type: Number, min: 1, max: 5 },
      facilities: { type: Number, min: 1, max: 5 },
      staff: { type: Number, min: 1, max: 5 },
      valueForMoney: { type: Number, min: 1, max: 5 }
    },
    comment: {
      type: String,
      trim: true
    },
    images: [{
      url: String
    }],
    response: {
      text: String,
      respondedAt: Date
    },
    verified: {
      type: Boolean,
      default: false
    },
    helpful: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Statistics
  statistics: {
    totalBookings: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalCourts: { type: Number, default: 0 },
    utilizationRate: { type: Number, default: 0 },
    repeatCustomers: { type: Number, default: 0 }
  },
  
  // Featured & Promoted
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPromoted: {
    type: Boolean,
    default: false
  },
  promotionExpiry: {
    type: Date
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
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
SportsVenueSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate average ratings
SportsVenueSchema.methods.calculateAverageRating = async function() {
  if (!this.reviews || this.reviews.length === 0) {
    this.rating = {
      overall: 0,
      cleanliness: 0,
      facilities: 0,
      staff: 0,
      valueForMoney: 0,
      count: 0
    };
    return;
  }
  
  const totals = this.reviews.reduce((acc, review) => {
    acc.overall += review.ratings.overall || 0;
    acc.cleanliness += review.ratings.cleanliness || 0;
    acc.facilities += review.ratings.facilities || 0;
    acc.staff += review.ratings.staff || 0;
    acc.valueForMoney += review.ratings.valueForMoney || 0;
    return acc;
  }, { overall: 0, cleanliness: 0, facilities: 0, staff: 0, valueForMoney: 0 });
  
  const count = this.reviews.length;
  this.rating = {
    overall: parseFloat((totals.overall / count).toFixed(1)),
    cleanliness: parseFloat((totals.cleanliness / count).toFixed(1)),
    facilities: parseFloat((totals.facilities / count).toFixed(1)),
    staff: parseFloat((totals.staff / count).toFixed(1)),
    valueForMoney: parseFloat((totals.valueForMoney / count).toFixed(1)),
    count: count
  };
};

// Indexes for efficient querying
SportsVenueSchema.index({ arenaPartner: 1 });
SportsVenueSchema.index({ approvalStatus: 1 });
SportsVenueSchema.index({ 'address.city': 1 });
SportsVenueSchema.index({ sportsSupported: 1 });
SportsVenueSchema.index({ 'rating.overall': -1 });
SportsVenueSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SportsVenue', SportsVenueSchema);
