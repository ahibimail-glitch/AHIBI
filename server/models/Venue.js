const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const venueSchema = new mongoose.Schema({
  // Authentication fields
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Business details
  businessName: {
    type: String,
    required: false,
    trim: true
  },
  
  // Location
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  verificationDocuments: [{
    type: String // URLs
  }],
  
  // Social links
  socialLinks: {
    website: String,
    facebook: String,
    instagram: String,
    twitter: String
  },
  
  // Images
  images: [{
    public_id: String,
    url: String,
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
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: Date
}, {
  timestamps: true
});

// Indexes for better performance
venueSchema.index({ email: 1 });
venueSchema.index({ phone: 1 });
venueSchema.index({ status: 1 });
venueSchema.index({ 'address.city': 1 });

// Password hashing middleware
venueSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
venueSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token method
venueSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      id: this._id, 
      email: this.email,
      type: 'venue'
    }, 
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );
};

// Update last login
venueSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Venue', venueSchema);
