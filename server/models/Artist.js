const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ArtistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
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
    trim: true,
    match: [/^\d{10}$/, 'Please add a valid 10 digit phone number']
  },
  city: {
    type: String,
    required: [true, 'City is required']
  },
  profilePic: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'blocked', 'rejected'],
    default: 'pending'
  },
  otp: {
    code: { type: String, default: null },
    expiresAt: { type: Date, default: null }
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
  genres: [{
    type: String
  }],
  languages: [{
    type: String
  }],
  type: {
    type: String,
    enum: ['musician', 'singer', 'dj', 'comedian', 'dancer', 'performer', 'band', 'magician', 'speaker', 'other', 'Band', 'Solo', 'DJ', 'Orchestra', 'Comedian', 'Dancer', 'Other']
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
