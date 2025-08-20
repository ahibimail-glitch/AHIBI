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
    required: function() {
      return this.role === 'admin'; // Email required for admin
    },
    unique: function() {
      return !!this.email;
    },
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
    sparse: true // Allows null/undefined but enforces uniqueness if provided
  },
  password: {
    type: String,
    required: function() {
      return this.role === 'admin'; // Password required for admin
    },
    minlength: 6,
    select: false // Don't return password by default
  },
  // New field for password-based authentication
  passwordHash: {
    type: String,
    required: false,
    default: null,
    select: false // Don't return passwordHash by default
  },
  
  profilePic: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    required: [true, 'City is required']
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'artist', 'venue', 'organizer'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'blocked', 'rejected'],
    default: 'active'
  },
  otp: {
    code: { type: String, default: null },
    expiresAt: { type: Date, default: null }
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

// Hash password before saving (only if modified)
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password to hashed password (for backward compatibility)
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user has password-based authentication
UserSchema.methods.hasPasswordAuth = function() {
  return !!this.passwordHash;
};

// Compare entered password to hashed password
UserSchema.methods.matchPasswordHash = async function(enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Virtual populate for organizer profile
UserSchema.virtual('organizer', {
  ref: 'Organizer',
  localField: '_id',
  foreignField: 'user',
  justOne: true
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// Compare entered password to hashed passwordHash (new method)
UserSchema.methods.matchPasswordHash = async function(enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Check if user has password-based authentication
UserSchema.methods.hasPasswordAuth = function() {
  return this.passwordHash && this.passwordHash !== null && this.passwordHash !== '';
};

// Set password hash (for new password-based auth)
UserSchema.methods.setPassword = async function(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
  await this.save();
};

module.exports = mongoose.model('User', UserSchema);
