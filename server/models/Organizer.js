const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const OrganizerSchema = new mongoose.Schema({
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
    unique: true,
    trim: true,
    match: [/^\d{10}$/, 'Please add a valid 10 digit phone number']
  },
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  logo: {
    type: String
  },
  bannerImage: {
    type: String
  },
  contactInfo: {
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    alternatePhone: {
      type: String
    },
    website: {
      type: String
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
    }
  },
  // Approval status fields
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvalDate: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectionReason: {
    type: String
  },
  rejectionDate: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  documents: {
    gst: {
      number: {
        type: String,
        match: [/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, 'Please enter a valid GST number']
      },
      verified: {
        type: Boolean,
        default: false
      },
      documentUrl: {
        type: String
      }
    },
    pan: {
      number: {
        type: String,
        match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number']
      },
      verified: {
        type: Boolean,
        default: false
      },
      documentUrl: {
        type: String
      }
    },
    businessRegistration: {
      documentUrl: {
        type: String
      },
      verified: {
        type: Boolean,
        default: false
      }
    }
  },
  bankDetails: {
    accountName: {
      type: String
    },
    accountNumber: {
      type: String
    },
    ifscCode: {
      type: String,
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please enter a valid IFSC code']
    },
    bankName: {
      type: String
    },
    branch: {
      type: String
    }
  },
  socialLinks: {
    facebook: {
      type: String
    },
    instagram: {
      type: String
    },
    twitter: {
      type: String
    },
    linkedin: {
      type: String
    }
  },
  eventCategories: [{
    type: String
  }],
  eventsCreated: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  statistics: {
    totalEvents: {
      type: Number,
      default: 0
    },
    totalTicketsSold: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    }
  },
  ratings: [{
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
  pendingPayouts: {
    type: Number,
    default: 0
  },
  totalPaidOut: {
    type: Number,
    default: 0
  },
  payoutHistory: [{
    amount: {
      type: Number,
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    transactionId: {
      type: String
    },
    processedAt: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  otp: {
    code: { type: String, default: null },
    expiresAt: { type: Date, default: null }
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate JWT token
OrganizerSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: 'organizer' }, // Hardcoded role
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Set OTP
OrganizerSchema.methods.setOtp = async function() {
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
OrganizerSchema.methods.verifyOtp = async function(otp) {
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
OrganizerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate average rating when a new review is added
OrganizerSchema.methods.calculateAverageRating = async function() {
  if (!this.ratings.length) {
    this.statistics.averageRating = 0;
    return;
  }
  
  const totalRating = this.ratings.reduce((sum, rating) => sum + rating.rating, 0);
  this.statistics.averageRating = (totalRating / this.ratings.length).toFixed(1);
};

module.exports = mongoose.model('Organizer', OrganizerSchema);
