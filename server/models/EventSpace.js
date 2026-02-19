const mongoose = require('mongoose');

const eventSpaceSchema = new mongoose.Schema({
  // Parent venue reference
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: [true, 'Venue reference is required']
  },

  // Basic Information
  name: {
    type: String,
    required: [true, 'Space name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  tagline: {
    type: String,
    trim: true,
    maxlength: [200, 'Tagline cannot exceed 200 characters']
  },

  // Venue Classification
  venueClassification: {
    venueTypes: [{
      type: String,
      enum: [
        'restaurant_cafe_lounge',
        'banquet_hall',
        'event_hall_multipurpose',
        'auditorium_convention_centre',
        'resort_hotel_event_space',
        'outdoor_venue',
        'rooftop_venue',
        'sports_complex',
        'conference_meeting_room',
        'wedding_venue',
        'others'
      ]
    }],
    venueTypeOther: {
      type: String,
      trim: true,
      maxlength: [100, 'Other venue type cannot exceed 100 characters']
    },
    indoorOutdoor: {
      type: String,
      enum: ['indoor', 'outdoor', 'hybrid'],
      required: [true, 'Indoor/Outdoor specification is required']
    }
  },

  // Location Details (inherits from parent venue but can be overridden)
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
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
    },
    googleMapsLink: {
      type: String,
      trim: true
    },
    directions: {
      type: String,
      trim: true
    }
  },

  // Capacity Details
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1']
  },
  capacityDetails: {
    standingCapacity: {
      type: Number,
      required: [true, 'Standing capacity is required'],
      min: [1, 'Standing capacity must be at least 1']
    },
    seatingCapacity: {
      theatreStyle: {
        type: Number,
        min: 0
      },
      roundTable: {
        type: Number,
        min: 0
      }
    },
    minimumBookingCapacity: {
      type: Number,
      required: [true, 'Minimum booking capacity is required'],
      min: [1, 'Minimum booking capacity must be at least 1']
    },
    peakSeasonRates: {
      type: String
    },
    offSeasonRates: {
      type: String
    },
    advanceBookingDays: {
      type: Number,
      required: [true, 'Advance booking requirement is required'],
      min: [0, 'Advance booking days must be non-negative']
    }
  },

  // Parking & Accessibility
  parking: {
    carCapacity: {
      type: Number,
      required: [true, 'Car parking capacity is required'],
      min: [0, 'Car parking capacity must be non-negative']
    },
    twoWheelerAvailable: {
      type: Boolean,
      default: false
    }
  },
  accessibility: {
    wheelchairAccess: {
      type: Boolean,
      default: false
    },
    liftElevator: {
      type: Boolean,
      default: false
    },
    nearbyTransport: {
      airport: Boolean,
      railwayStation: Boolean,
      taxiService: Boolean
    }
  },

  // Facilities
  facilities: {
    parking: { type: Boolean, default: false },
    ac: { type: Boolean, default: false },
    petFriendly: { type: Boolean, default: false },
    catering: { type: Boolean, default: false },
    accessible: { type: Boolean, default: false },
    wifi: { type: Boolean, default: false },
    soundSystem: { type: Boolean, default: false },
    lighting: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
    alcohol: { type: Boolean, default: false }
  },

  // Comprehensive Amenities
  amenities: {
    stage: {
      available: { type: Boolean, default: false },
      description: String
    },
    airConditioning: {
      available: { type: Boolean, default: false },
      description: String
    },
    inHouseCatering: {
      available: { type: Boolean, default: false },
      description: String
    },
    cateringFlexibility: {
      outsideCateringAllowed: { type: Boolean, default: false },
      description: String
    },
    lightingSystem: {
      available: { type: Boolean, default: false },
      description: String
    },
    professionalSoundSystem: {
      available: { type: Boolean, default: false },
      description: String
    },
    ledScreenProjection: {
      available: { type: Boolean, default: false },
      description: String
    },
    wifiAvailability: {
      available: { type: Boolean, default: false },
      description: String
    },
    dressingRooms: {
      available: { type: Boolean, default: false },
      description: String
    },
    changingRooms: {
      available: { type: Boolean, default: false },
      description: String
    },
    washrooms: {
      count: Number,
      cleanlinessStandards: String
    },
    powerBackup: {
      available: { type: Boolean, default: false },
      generatorCapacity: String
    },
    securityCctv: {
      available: { type: Boolean, default: false },
      description: String
    },
    alcoholPermission: {
      available: { type: Boolean, default: false },
      description: String
    },
    liveMusicPermission: {
      available: { type: Boolean, default: false },
      soundRestrictions: String
    },
    sportsEquipment: {
      available: { type: Boolean, default: false },
      description: String
    },
    accommodation: {
      available: { type: Boolean, default: false },
      roomsCount: Number
    },
    decorationServices: {
      available: { type: Boolean, default: false },
      description: String
    },
    valetService: {
      available: { type: Boolean, default: false },
      description: String
    }
  },

  // Pricing
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price must be non-negative']
    },
    hourlyRate: {
      type: Number,
      min: [0, 'Hourly rate must be non-negative']
    },
    halfDayRate: {
      type: Number,
      min: [0, 'Half day rate must be non-negative']
    },
    fullDayRate: {
      type: Number,
      min: [0, 'Full day rate must be non-negative']
    },
    cleaningFee: {
      type: Number,
      default: 0,
      min: [0, 'Cleaning fee must be non-negative']
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: [0, 'Security deposit must be non-negative']
    },
    rentalIncludes: [{
      type: String,
      enum: [
        'space_only',
        'chairs_tables',
        'basic_lighting',
        'sound_system',
        'cleaning_staff',
        'generator_backup_power',
        'other_equipment'
      ]
    }],
    otherEquipmentDetails: String,
    securityDepositRequired: {
      type: Boolean,
      default: false
    },
    cancellationPolicy: {
      refundable: { type: Boolean, default: false },
      timeFrame: String,
      deductionPercentage: Number
    }
  },

  // Gallery
  gallery: [{
    public_id: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    width: Number,
    height: Number,
    format: String,
    size: Number,
    created_at: String
  }],

  // Cover image (stores public_id of the cover image)
  coverImage: {
    type: String,
    default: null
  },

  // Contact Info (inherits from parent but can be overridden)
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    website: {
      type: String,
      trim: true
    }
  },

  // Availability & Blocked Slots
  availability: [{
    date: {
      type: Date,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    note: {
      type: String,
      trim: true
    }
  }],
  blockedSlots: [{
    date: {
      type: Date,
      required: true
    },
    isFullDayBlocked: {
      type: Boolean,
      default: false
    },
    timeSlots: [{
      startTime: String, // Format: "HH:MM" (24-hour)
      endTime: String,   // Format: "HH:MM" (24-hour)
    }],
    reason: {
      type: String,
      enum: ['offline_booking', 'internal_event', 'maintenance', 'holiday', 'other'],
      default: 'offline_booking'
    },
    notes: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Bookings (confirmed space bookings from customers)
  bookings: [{
    _id: { type: mongoose.Schema.Types.Mixed },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'EventSpace' },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
    bookingDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    guestCount: { type: Number, default: 1 },
    eventType: { type: String, trim: true },
    specialRequirements: { type: String, trim: true },
    pricing: {
      basePrice: Number,
      hourlyRate: Number,
      totalAmount: { type: Number, required: true },
      cleaningFee: Number,
      securityDeposit: Number
    },
    payment: {
      razorpay_payment_id: String,
      razorpay_order_id: String,
      razorpay_signature: String,
      status: { type: String, default: 'completed' },
      paidAt: Date
    },
    status: { type: String, default: 'confirmed', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
    createdAt: { type: Date, default: Date.now }
  }],

  // Terms & Policies
  terms: {
    cancellationPolicy: {
      type: String,
      trim: true
    },
    additionalRules: {
      type: String,
      trim: true
    }
  },
  policies: {
    operatingHours: {
      startTime: String,
      endTime: String
    },
    noiseRestrictions: {
      type: String,
      trim: true
    },
    smokingPolicy: {
      type: String,
      enum: ['allowed', 'not_allowed', 'designated_areas']
    },
    alcoholServingPermission: {
      type: Boolean,
      default: false
    },
    requiredPermissions: {
      type: String,
      trim: true
    },
    eventTypeRestrictions: {
      type: String,
      trim: true
    }
  },

  // Add-on Services
  addOnServices: {
    cateringPackages: {
      available: { type: Boolean, default: false },
      menuUrl: String
    },
    eventManagementServices: {
      available: { type: Boolean, default: false },
      description: String
    },
    vendorTieUps: {
      available: { type: Boolean, default: false },
      description: String
    },
    photographyDecorPackages: {
      available: { type: Boolean, default: false },
      description: String
    },
    accommodationBundle: {
      available: { type: Boolean, default: false },
      description: String
    },
    specialDiscounts: {
      repeatBookings: { type: Boolean, default: false },
      offPeakDays: { type: Boolean, default: false },
      description: String
    }
  },

  // Document Uploads
  documents: {
    venueImages: [{
      url: String,
      caption: String,
      isMain: { type: Boolean, default: false }
    }],
    menuCards: [{
      url: String,
      name: String
    }],
    rateCard: {
      url: String
    },
    businessLicense: [{
      url: String,
      name: String
    }]
  },

  // Final Confirmation
  authorizations: {
    publicListingAuthorized: {
      type: Boolean,
      default: false
    },
    onlineBookingEnabled: {
      type: Boolean,
      default: false
    },
    preferredCommunication: {
      type: String,
      enum: ['whatsapp', 'email', 'phone_call'],
      default: 'email'
    },
    informationAccuracyConfirmed: {
      type: Boolean,
      default: false
    }
  },

  // Statistics
  totalBookings: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },

  // FAQs
  faqs: [{
    question: {
      type: String,
      required: true,
      trim: true
    },
    answer: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Reviews
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: {
      type: String
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
eventSpaceSchema.index({ venueId: 1 });
eventSpaceSchema.index({ 'address.city': 1 });
eventSpaceSchema.index({ 'venueClassification.venueTypes': 1 });
eventSpaceSchema.index({ 'rating.average': -1 });
eventSpaceSchema.index({ capacity: 1 });

// Update timestamp before saving
eventSpaceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate average rating
eventSpaceSchema.methods.calculateAverageRating = async function() {
  if (!this.reviews || this.reviews.length === 0) {
    this.rating = {
      average: 0,
      count: 0
    };
    return;
  }
  
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating = {
    average: (totalRating / this.reviews.length).toFixed(1),
    count: this.reviews.length
  };
};

module.exports = mongoose.model('EventSpace', eventSpaceSchema);
