const Venue = require('../models/Venue');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const AdminNotification = require('../models/AdminNotification');

// Helper to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP for signup
const sendSignupOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    console.log('Received signup data:', req.body);
    const { phone, email } = req.body;

    // Check if venue already exists with this phone or email
    const existingVenue = await Venue.findOne({
      $or: [{ phone }, { email }]
    });

    if (existingVenue) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or email is already registered'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // For now, store OTP in memory (in production, use Redis or database)
    // This is a simplified approach - you might want to store this in the database
    const tempOTPStore = global.tempOTPStore || {};
    tempOTPStore[phone] = {
      otp,
      expiry: otpExpiry,
      email,
      ...req.body // Store other signup data
    };
    global.tempOTPStore = tempOTPStore;

    // Send OTP via SMS (using your existing SMS service)
    try {
      const smsService = require('../services/smsService');
      await smsService.sendOtp(phone, otp);
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // For development, you might want to log the OTP
      console.log(`Venue Signup OTP for ${phone}: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      // For development only
      devMode: process.env.NODE_ENV !== 'production',
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });

  } catch (error) {
    console.error('Send signup OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

// Verify OTP and complete signup
const verifySignupOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone, otp } = req.body;
    const tempOTPStore = global.tempOTPStore || {};

    // Check if OTP exists and is valid
    const storedData = tempOTPStore[phone];
    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired'
      });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (new Date() > storedData.expiry) {
      delete tempOTPStore[phone];
      global.tempOTPStore = tempOTPStore;
      return res.status(400).json({
        success: false,
        message: 'OTP expired'
      });
    }

    // Create venue account
    const venueData = {
      ...storedData,
      phone,
      status: 'pending' // Requires admin approval
    };

    const venue = new Venue(venueData);
    await venue.save();

    // Create admin notification for new venue registration
    try {
      await AdminNotification.create({
        type: 'venue_registration',
        title: 'New Venue Registration',
        message: `${venue.name} has registered a new venue "${venue.businessName || 'Unnamed Venue'}" and is awaiting approval.`,
        priority: 'high',
        metadata: {
          venueId: venue._id,
          venueName: venue.name,
          businessName: venue.businessName,
          email: venue.email,
          phone: venue.phone,
          status: venue.status
        },
        actionUrl: `/admin/venues/${venue._id}`
      });
    } catch (notificationError) {
      console.error('Failed to create admin notification:', notificationError);
      // Don't fail the signup if notification fails
    }

    // Clear OTP from temporary store
    delete tempOTPStore[phone];
    global.tempOTPStore = tempOTPStore;

    // Generate JWT token
    const token = venue.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Venue account created successfully. Please wait for admin approval.',
      data: {
        venue: {
          id: venue._id,
          name: venue.name,
          email: venue.email,
          phone: venue.phone,
          businessName: venue.businessName,
          status: venue.status,
          isVerified: venue.isVerified,
          address: venue.address,
          socialLinks: venue.socialLinks || {},
          images: venue.images || []
        },
        token
      }
    });

  } catch (error) {
    console.error('Verify signup OTP error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} is already registered`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create venue account'
    });
  }
};

// Send OTP for login
const sendLoginOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone } = req.body;

    // Check if venue exists
    const venue = await Venue.findOne({ phone });
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found with this phone number'
      });
    }

    // Check if venue is approved
    if (venue.status !== 'approved' && venue.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Venue account is not approved. Please contact admin.'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in memory
    const tempOTPStore = global.tempOTPStore || {};
    tempOTPStore[`login_${phone}`] = {
      otp,
      expiry: otpExpiry,
      venueId: venue._id
    };
    global.tempOTPStore = tempOTPStore;

    // Send OTP via SMS
    try {
      const smsService = require('../services/smsService');
      await smsService.sendOtp(phone, otp);
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      console.log(`Venue Login OTP for ${phone}: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      devMode: process.env.NODE_ENV !== 'production',
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });

  } catch (error) {
    console.error('Send login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

// Verify OTP and login
const verifyLoginOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone, otp } = req.body;
    const tempOTPStore = global.tempOTPStore || {};

    // Check OTP
    const storedData = tempOTPStore[`login_${phone}`];
    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired'
      });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (new Date() > storedData.expiry) {
      delete tempOTPStore[`login_${phone}`];
      global.tempOTPStore = tempOTPStore;
      return res.status(400).json({
        success: false,
        message: 'OTP expired'
      });
    }

    // Get venue
    const venue = await Venue.findById(storedData.venueId);
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    // Check status
    if (venue.status !== 'approved' && venue.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Venue account is not approved'
      });
    }

    // Update last login
    await venue.updateLastLogin();

    // Clear OTP
    delete tempOTPStore[`login_${phone}`];
    global.tempOTPStore = tempOTPStore;

    // Generate token
    const token = venue.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        venue: {
          id: venue._id,
          name: venue.name,
          email: venue.email,
          phone: venue.phone,
          businessName: venue.businessName,
          status: venue.status,
          isVerified: venue.isVerified,
          isActive: venue.isActive,
          address: venue.address,
          socialLinks: venue.socialLinks || {},
          images: venue.images || []
        },
        token
      }
    });

  } catch (error) {
    console.error('Verify login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login'
    });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const allowedFields = [
      'name', 'email', 'phone', 'businessName', 'address', 
      'socialLinks', 'images'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const venue = await Venue.findById(req.venue.id);
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    // Update fields
    Object.keys(updateData).forEach(field => {
      venue[field] = updateData[field];
      // Mark nested arrays as modified for proper saving
      if (field === 'images') {
        venue.markModified('images');
      }
      if (field === 'address') {
        venue.markModified('address');
      }
      if (field === 'socialLinks') {
        venue.markModified('socialLinks');
      }
    });

    await venue.save();

    // Return updated venue without password
    const updatedVenue = venue.toObject();
    delete updatedVenue.password;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { venue: updatedVenue }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Password-based login
const passwordLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone, password } = req.body;

    // Find venue by phone
    const venue = await Venue.findOne({ phone });
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found with this phone number'
      });
    }

    // Check if venue is approved
    if (venue.status !== 'approved' && venue.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Venue account is not approved. Please contact admin.'
      });
    }

    // Verify password
    const isPasswordValid = await venue.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }

    // Update last login
    await venue.updateLastLogin();

    // Generate token
    const token = venue.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        venue: {
          id: venue._id,
          name: venue.name,
          email: venue.email,
          phone: venue.phone,
          businessName: venue.businessName,
          status: venue.status,
          isVerified: venue.isVerified,
          isActive: venue.isActive,
          address: venue.address,
          socialLinks: venue.socialLinks || {},
          images: venue.images || []
        },
        token
      }
    });

  } catch (error) {
    console.error('Password login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login'
    });
  }
};

// Get venue profile
const getProfile = async (req, res) => {
  try {
    const venue = await Venue.findById(req.venue.id).select('-password');
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    // Check if venue is approved
    if (venue.status !== 'approved' && venue.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Venue not approved by admin'
      });
    }

    // Transform venue data to be consistent with login endpoints
    const venueData = {
      id: venue._id,
      name: venue.name,
      email: venue.email,
      phone: venue.phone,
      businessName: venue.businessName,
      status: venue.status,
      isVerified: venue.isVerified,
      isActive: venue.isActive,
      address: venue.address,
      socialLinks: venue.socialLinks || {},
      images: venue.images || [],
      createdAt: venue.createdAt,
      updatedAt: venue.updatedAt
    };

    res.status(200).json({
      success: true,
      data: { venue: venueData }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

module.exports = {
  sendSignupOTP,
  verifySignupOTP,
  sendLoginOTP,
  verifyLoginOTP,
  passwordLogin,
  getProfile,
  updateProfile
};
