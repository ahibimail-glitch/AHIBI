const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const VenueSchema = new mongoose.Schema({
  // Venue Owner Details
  ownerDetails: {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    primaryContact: {
      type: String,
      required: [true, 'Primary contact is required'],
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    alternateContact: {
      type: String,
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    businessName: {
      type: String,
      required: [true, 'Business/Venue name is required'],
      trim: true
    },
    designation: {
      type: String,
      required: [true, 'Designation/Role is required']
    },
    businessRegistrationNumber: {
      type: String
    },
    gstNumber: {
      type: String
    }
  },
  
  // For backward compatibility
  name: {
    type: String,
    required: [true, 'Venue name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    unique: true,
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  password: {
    type: String,
    select: false
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  otp: String,
  otpExpires: Date,
  description: {
    type: String,
    required: [true, 'Description is required']
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
    venueTypeOther: String,
    indoorOutdoor: {
      type: String,
      enum: ['indoor', 'outdoor', 'hybrid'],
      required: [true, 'Indoor/Outdoor specification is required']
    },
    operationMode: {
      type: String,
      enum: ['seasonal', 'year_round'],
      required: [true, 'Operation mode is required']
    }
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
    },
    landmark: {
      type: String
    },
    googleMapsLink: {
      type: String
    },
    directions: {
      type: String
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  
  // Parking & Accessibility
  parking: {
    carCapacity: {
      type: Number,
      required: [true, 'Car parking capacity is required']
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
  capacity: {
    type: Number,
    required: [true, 'Capacity is required']
  },
  
  // Venue Capacity & Booking Options
  capacityDetails: {
    standingCapacity: {
      type: Number,
      required: [true, 'Standing capacity is required']
    },
    seatingCapacity: {
      theatreStyle: Number,
      roundTable: Number
    },
    minimumBookingCapacity: Number,
    multipleEventsPerDay: {
      type: Boolean,
      default: false
    },
    timeSlots: [{
      type: String,
      enum: ['full_day', 'half_day', 'hourly']
    }],
    peakSeasonRates: {
      type: String
    },
    offSeasonRates: {
      type: String
    },
    advanceBookingDays: {
      type: Number,
      required: [true, 'Advance booking requirement is required']
    }
  },
  facilities: {
    parking: {
      type: Boolean,
      default: false
    },
    ac: {
      type: Boolean,
      default: false
    },
    petFriendly: {
      type: Boolean,
      default: false
    },
    catering: {
      type: Boolean,
      default: false
    },
    accessible: {
      type: Boolean,
      default: false
    },
    wifi: {
      type: Boolean,
      default: false
    },
    soundSystem: {
      type: Boolean,
      default: false
    },
    lighting: {
      type: Boolean,
      default: false
    },
    security: {
      type: Boolean,
      default: false
    },
    alcohol: {
      type: Boolean,
      default: false
    }
  },
  
  // Comprehensive Facilities & Amenities
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
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required']
    },
    hourlyRate: {
      type: Number
    },
    halfDayRate: {
      type: Number
    },
    fullDayRate: {
      type: Number
    },
    cleaningFee: {
      type: Number,
      default: 0
    },
    securityDeposit: {
      type: Number,
      default: 0
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
    paymentModes: [{
      type: String,
      enum: ['online', 'cash', 'bank_transfer', 'upi', 'card_payment']
    }],
    cancellationPolicy: {
      refundable: { type: Boolean, default: false },
      timeFrame: String,
      deductionPercentage: Number
    }
  },
  gallery: [{
    url: {
      type: String
    },
    caption: {
      type: String
    },
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Contact phone is required']
    },
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    website: {
      type: String
    }
  },
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
      type: String
    }
  }],
  
  // Blocked dates and time slots (for offline bookings/internal reservations)
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
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  terms: {
    cancellationPolicy: {
      type: String
    },
    additionalRules: {
      type: String
    }
  },
  
  // Venue Policies
  policies: {
    operatingHours: {
      startTime: String,
      endTime: String
    },
    noiseRestrictions: {
      type: String
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
      type: String
    },
    eventTypeRestrictions: {
      type: String
    }
  },
  
  // Add-on Services & Partnerships
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
    venueVideoTour: {
      url: String
    },
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
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  // FAQs for venue
  faqs: [{
    question: {
      type: String,
    },
    answer: {
      type: String,
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
      type: String
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
});

// Update the updatedAt timestamp before saving
VenueSchema.pre('save', async function(next) {
  try {
    this.updatedAt = Date.now();

    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Calculate average rating when a new review is added
VenueSchema.methods.calculateAverageRating = async function() {
  if (!this.reviews.length) {
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

// Generate and hash OTP
VenueSchema.methods.setOtp = async function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store hashed OTP
  this.otp = await bcrypt.hash(otp, 10);
  this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Save without triggering full validation to avoid legacy records failing on new required fields
  await this.save({ validateBeforeSave: false });

  return otp; // Return unhashed OTP to be sent via SMS
};

// Verify OTP
VenueSchema.methods.verifyOtp = async function(enteredOtp) {
  if (!this.otp || !this.otpExpires) {
    return false;
  }

  if (this.otpExpires < Date.now()) {
    return false; // OTP expired
  }

  const isMatch = await bcrypt.compare(enteredOtp, this.otp);
  if (isMatch) {
    // Clear OTP fields after successful verification
    this.otp = undefined;
    this.otpExpires = undefined;
    // Save without full validation
    await this.save({ validateBeforeSave: false });
  }

  return isMatch;
};

VenueSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(enteredPassword, this.password);
};

// Sign JWT and return
VenueSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id, role: 'venue', type: 'venue' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

module.exports = mongoose.model('Venue', VenueSchema);
