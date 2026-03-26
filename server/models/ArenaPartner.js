const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ArenaPartnerSchema = new mongoose.Schema({
  // Basic Authentication
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
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  
  // OTP Authentication
  otp: String,
  otpExpires: Date,

  // Password Authentication
  passwordHash: {
    type: String,
    select: false
  },
  
  // Business Details
  businessDetails: {
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true
    },
    businessType: {
      type: String,
      enum: ['individual', 'partnership', 'private_limited', 'public_limited', 'llp'],
      required: [true, 'Business type is required']
    },
    registrationNumber: {
      type: String,
      trim: true
    },
    gstNumber: {
      type: String,
      trim: true
    },
    panNumber: {
      type: String,
      trim: true
    },
    yearEstablished: {
      type: Number
    }
  },
  
  // KYC Documents
  kycDocuments: {
    aadhaarCard: {
      url: String,
      verified: { type: Boolean, default: false }
    },
    panCard: {
      url: String,
      verified: { type: Boolean, default: false }
    },
    businessLicense: {
      url: String,
      verified: { type: Boolean, default: false }
    },
    gstCertificate: {
      url: String,
      verified: { type: Boolean, default: false }
    },
    bankProof: {
      url: String,
      verified: { type: Boolean, default: false }
    }
  },
  
  // Bank Details for Payouts
  bankDetails: {
    accountHolderName: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    ifscCode: {
      type: String,
      trim: true
    },
    bankName: {
      type: String,
      trim: true
    },
    branchName: {
      type: String,
      trim: true
    },
    accountType: {
      type: String,
      enum: ['savings', 'current']
    },
    verified: {
      type: Boolean,
      default: false
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
  
  // Financial Settings
  commissionSettings: {
    commissionRate: {
      type: Number,
      default: 15, // 15% platform commission
      min: 0,
      max: 100
    },
    customRate: {
      type: Boolean,
      default: false
    }
  },

  // Payment Settings (for booking-time advance/partial payment)
  paymentSettings: {
    advancePaymentPercent: {
      type: Number,
      default: 10,
      min: 1,
      max: 100
    }
  },
  
  // Statistics
  statistics: {
    totalVenues: {
      type: Number,
      default: 0
    },
    totalBookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalPayouts: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  
  // Preferences
  preferences: {
    notificationEmail: {
      type: Boolean,
      default: true
    },
    notificationSms: {
      type: Boolean,
      default: true
    },
    autoAcceptBookings: {
      type: Boolean,
      default: false
    },
    instantPayouts: {
      type: Boolean,
      default: false
    }
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
  },
  lastLoginAt: {
    type: Date
  }
});

// Update timestamp before saving
ArenaPartnerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate and hash OTP
ArenaPartnerSchema.methods.setOtp = async function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = await bcrypt.hash(otp, 10);
  this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await this.save({ validateBeforeSave: false });
  return otp;
};

// Verify OTP
ArenaPartnerSchema.methods.verifyOtp = async function(enteredOtp) {
  if (!this.otp || !this.otpExpires) {
    return false;
  }
  if (this.otpExpires < Date.now()) {
    return false;
  }
  const isMatch = await bcrypt.compare(enteredOtp, this.otp);
  if (isMatch) {
    this.otp = undefined;
    this.otpExpires = undefined;
    this.lastLoginAt = Date.now();
    await this.save({ validateBeforeSave: false });
  }
  return isMatch;
};

// Check if partner has password-based authentication
ArenaPartnerSchema.methods.hasPasswordAuth = function() {
  return !!this.passwordHash;
};

// Compare entered password to hashed password
ArenaPartnerSchema.methods.matchPasswordHash = async function(enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Generate JWT token
ArenaPartnerSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: 'arenaPartner', type: 'arenaPartner' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Index for efficient querying
ArenaPartnerSchema.index({ email: 1 });
ArenaPartnerSchema.index({ phone: 1 });
ArenaPartnerSchema.index({ approvalStatus: 1 });

module.exports = mongoose.model('ArenaPartner', ArenaPartnerSchema);
