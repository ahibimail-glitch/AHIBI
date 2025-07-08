const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^\d{10}$/, 'Please add a valid 10 digit phone number']
  },
  name: {
    type: String,
    required: function() {
      return this.role !== 'user'; // Name is required for all roles except basic user
    },
    trim: true
  },
  email: {
    type: String,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
    sparse: true // Allows null/undefined but enforces uniqueness if provided
  },
  role: {
    type: String,
    enum: ['user', 'artist', 'venue', 'organizer', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'rejected', 'blocked'],
    default: function() {
      // Users are active by default, but artists, venues and organizers need approval
      return ['artist', 'venue', 'organizer'].includes(this.role) ? 'pending' : 'active';
    }
  },
  profilePic: {
    type: String,
    default: ''
  },
  otp: {
    code: {
      type: String
    },
    expiresAt: {
      type: Date
    }
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
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
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate JWT token
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Set OTP
UserSchema.methods.setOtp = async function() {
  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash OTP
  const salt = await bcrypt.genSalt(10);
  const hashedOtp = await bcrypt.hash(otp, salt);
  
  // Set OTP and expiry (valid for 10 minutes)
  this.otp = {
    code: hashedOtp,
    expiresAt: Date.now() + 10 * 60 * 1000
  };
  
  await this.save();
  return otp;
};

// Verify OTP
UserSchema.methods.verifyOtp = async function(otp) {
  // Check if OTP is valid and not expired
  if (!this.otp.code || Date.now() > this.otp.expiresAt) {
    return false;
  }
  
  // Compare the provided OTP with the hashed OTP
  const isMatch = await bcrypt.compare(otp, this.otp.code);
  
  // Clear OTP after verification
  if (isMatch) {
    this.otp = {
      code: null,
      expiresAt: null
    };
    await this.save();
  }
  
  return isMatch;
};

module.exports = mongoose.model('User', UserSchema);
