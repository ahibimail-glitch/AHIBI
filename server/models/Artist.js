const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ArtistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  stageName: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^\d{10}$/, 'Please add a valid 10 digit phone number']
  },
  emergencyContact: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required']
  },
  profilePic: {
    type: String,
    default: ''
  },
  performanceRegions: [{
    type: String,
    enum: ['within-state', 'northeast', 'pan-india', 'international']
  }],
  status: {
    type: String,
    enum: ['active', 'pending', 'blocked', 'rejected'],
    default: 'pending'
  },
  otp: {
    code: { type: String, default: null },
    expiresAt: { type: Date, default: null }
  },
  passwordHash: {
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
  bio: {
    type: String
  },
  shortBio: {
    type: String,
    maxlength: 200
  },
  longBio: {
    type: String,
    maxlength: 2000
  },

  languages: [{
    type: String
  }],
  type: {
    type: String,
    enum: ['musician', 'singer', 'dj', 'comedian', 'dancer', 'performer', 'band', 'magician', 'speaker', 'instrumentalist', 'host', 'orchestra', 'comedian', 'dancer', 'other']
  },
  artistCategories: [{
    type: String
  }],
  eventTypes: [{
    type: String,
    enum: ['concerts', 'festivals', 'private-parties-weddings', 'cafes-restaurants', 'corporate-events', 'church-community-events', 'college-events', 'cultural', 'others']
  }],
  eventTypesOther: {
    type: String
  },
  audienceVibe: [{
    type: String,
    enum: ['family-friendly', 'corporate-clean', 'party-nightlife', 'youth-campus-energy', 'cultural-traditional', 'luxury-premium-events']
  }],
  performanceDurations: [{
    type: String,
    enum: ['20-mins', '30-mins', '45-mins', '1-hour', '2-hours', '3-hours', 'full-day', 'other']
  }],
  performanceDurationOther: {
    type: String
  },
  performanceFormats: [{
    type: String,
    enum: ['solo', 'group-band', 'duo', 'trio', 'dj-set', 'dj-live-percussion', 'host-dj', 'with-dancers', 'other']
  }],
  performanceFormatsOther: {
    type: String
  },
  feeRange: {
    min: {
      type: Number
    },
    max: {
      type: Number
    }
  },
  experience: {
    type: String,
    enum: ['beginner', 'intermediate', 'experienced', 'expert']
  },
  basePrice: {
    type: Number
  },
  customPricing: {
    hourlyRate: {
      type: Number
    },
    fullDayRate: {
      type: Number
    },
    specialEventRate: {
      type: Number
    }
  },
  gallery: {
    photos: [{
      url: {
        type: String
      },
      caption: {
        type: String
      },
      isProfileImage: {
        type: Boolean,
        default: false
      },
      isCoverImage: {
        type: Boolean,
        default: false
      }
    }],
    videos: [{
      url: {
        type: String
      },
      thumbnail: {
        type: String
      },
      caption: {
        type: String
      },
      platform: {
        type: String,
        enum: ['youtube', 'vimeo', 'instagram', 'other']
      }
    }]
  },
  accolades: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    year: {
      type: Number
    },
    organization: {
      type: String
    },
    certificate: {
      type: String // URL to certificate image
    }
  }],
  termsAndConditions: {
    content: {
      type: String,
      default: `
1. Payment Terms: 50% advance payment required to confirm booking, remaining 50% to be paid before the event.
2. Cancellation Policy: 
   - 30+ days before event: Full refund minus 10% processing fee
   - 15-29 days before event: 50% refund
   - Less than 15 days: No refund
3. Performance Requirements: Adequate sound system and stage setup to be provided by organizer.
4. Travel & Accommodation: For outstation events, travel and accommodation costs to be borne by organizer.
5. Force Majeure: Artist not liable for cancellations due to natural disasters, illness, or government restrictions.
6. Content: Artist reserves the right to perform original content and covers as per repertoire.
      `.trim()
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  cancellationPolicy: {
    advanceNotice: {
      type: Number,
      default: 48 // hours
    },
    refundPolicy: {
      type: String,
      default: 'Refund as per terms and conditions'
    },
    emergencyContact: {
      type: String
    }
  },
  techRider: {
    soundRequirements: {
      type: String
    },
    lightingRequirements: {
      type: String
    },
    stageRequirements: {
      type: String
    },
    instrumentsEquipmentNeeded: {
      type: String
    },
    powerRequirements: {
      type: String
    },
    specialNotes: {
      type: String
    },
    file: {
      url: {
        type: String
      },
      fileType: {
        type: String,
        enum: ['pdf', 'image']
      },
      uploadedAt: {
        type: Date
      }
    },
    updatedAt: {
      type: Date
    }
  },
  socialLinks: {
    instagram: {
      type: String
    },
    youtube: {
      type: String
    },
    spotify: {
      type: String
    },
    facebook: {
      type: String
    },
    twitter: {
      type: String
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
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
    type: Date
  }
});

// Generate JWT token
ArtistSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: 'artist' }, // Hardcoded role
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Set OTP
ArtistSchema.methods.setOtp = async function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(10);
  const hashedOtp = await bcrypt.hash(otp, salt);
  this.otp = {
    code: hashedOtp,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  };
  await this.save({ validateBeforeSave: false });
  return otp;
};

// Verify OTP
ArtistSchema.methods.verifyOtp = async function(otp) {
  if (!this.otp.code || Date.now() > this.otp.expiresAt) {
    return false;
  }
  const isMatch = await bcrypt.compare(otp, this.otp.code);
  if (isMatch) {
    this.otp = { code: null, expiresAt: null };
    await this.save({ validateBeforeSave: false });
  }
  return isMatch;
};

// Check if artist has password-based authentication
ArtistSchema.methods.hasPasswordAuth = function() {
  return !!this.passwordHash;
};

// Compare entered password to hashed password
ArtistSchema.methods.matchPasswordHash = async function(enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Update the updatedAt timestamp before saving
ArtistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate average rating when a new review is added
ArtistSchema.methods.calculateAverageRating = async function() {
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

module.exports = mongoose.model('Artist', ArtistSchema);
