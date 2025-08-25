const User = require('../models/User');
const Artist = require('../models/Artist');
const smsService = require('../services/smsService');
const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Artist signup
 * @route   POST /api/artist/auth/signup
 * @access  Public
 */
exports.artistSignup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    name,
    email,
    phone,
    bio,
    genres,
    type,
    basePrice,
    city,
    specialization,
    experience
  } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ phone }, { email }] 
    });

    if (existingUser) {
      return ApiResponse.badRequest(res, 'User with this phone or email already exists');
    }

    // Create user account
    const user = await User.create({
      name,
      email,
      phone,
      city,
      role: 'artist',
      status: 'pending' // Set to pending until approved by admin
    });

    // Create artist profile
    const artist = await Artist.create({
      user: user._id,
      bio,
      genres,
      type: type || specialization, // Use type if provided, otherwise use specialization
      basePrice,
      experience,
      approvalStatus: 'pending'
    });

    // Send OTP for verification
    const otp = await user.setOtp();
    const smsResponse = await smsService.sendOtp(phone, otp);

    if (!smsResponse.success) {
      return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
    }

    return ApiResponse.success(res, 'Artist account created successfully. Pending admin approval.', {
      artist: {
        id: artist._id,
        name: user.name,
        type: artist.type || specialization,
        approvalStatus: artist.approvalStatus
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Artist signup error:', error);
    return ApiResponse.serverError(res, 'Error creating artist account', error);
  }
};

/**
 * @desc    Artist login
 * @route   POST /api/artist/auth/login
 * @access  Public
 */
exports.artistLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, password } = req.body;

  try {
    // Find user by phone
    const user = await User.findOne({ phone }).select('+passwordHash');

    if (!user) {
      return ApiResponse.badRequest(res, 'Phone number not registered. Please sign up first.');
    }

    // Check if user is an artist
    if (user.role !== 'artist') {
      return ApiResponse.badRequest(res, 'This account is not registered as an artist.');
    }

    // Check if user has password-based authentication
    if (!user.hasPasswordAuth()) {
      return ApiResponse.badRequest(res, 'Password not set for this account. Please use OTP verification.', {
        requiresOtp: true,
        phone: phone
      });
    }

    // Verify password
    const isPasswordValid = await user.matchPasswordHash(password);
    if (!isPasswordValid) {
      return ApiResponse.badRequest(res, 'Invalid password');
    }

    // Check if user is blocked
    if (user.status === 'blocked') {
      return ApiResponse.forbidden(res, 'Your account has been blocked. Please contact support.');
    }

    // Check if artist is approved
    const artist = await Artist.findOne({ user: user._id });
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist profile not found');
    }

    if (artist.approvalStatus === 'pending') {
      return ApiResponse.accepted(res, 'Your artist account is pending approval', {
        pending: true,
        role: user.role,
        approvalStatus: artist.approvalStatus
      });
    }

    if (artist.approvalStatus === 'rejected') {
      return ApiResponse.forbidden(res, 'Your artist account has been rejected', {
        rejected: true,
        reason: artist.rejectionReason
      });
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    return ApiResponse.success(res, 'Login successful', {
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name || '',
        email: user.email || '',
        role: user.role,
        status: user.status,
        profilePic: user.profilePic
      },
      artist: {
        id: artist._id,
        type: artist.type,
        approvalStatus: artist.approvalStatus
      }
    });

  } catch (error) {
    console.error('Artist login error:', error);
    return ApiResponse.serverError(res, 'Error during login', error);
  }
};

/**
 * @desc    Send OTP for artist
 * @route   POST /api/artist/auth/send-otp
 * @access  Public
 */
exports.sendArtistOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, mode } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ phone });

    // OTP logic for signup or login
    if ((mode === 'signup' || !mode) && user) {
      return ApiResponse.badRequest(res, 'Number is already registered');
    }
    if (mode === 'login' && !user) {
      return ApiResponse.badRequest(res, 'Number is not registered');
    }

    // For login, check if user is an artist
    if (mode === 'login' && user && user.role !== 'artist') {
      return ApiResponse.badRequest(res, 'This account is not registered as an artist');
    }

    // Generate OTP
    let otp;
    if (mode === 'login' && user) {
      otp = await user.setOtp();
    } else {
      // For signup, use in-memory temp store
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      if (!global.tempOtps) global.tempOtps = {};
      global.tempOtps[phone] = {
        code: otp,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      };
    }

    // Send OTP via SMS service
    const smsResponse = await smsService.sendOtp(phone, otp);

    if (!smsResponse.success) {
      return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
    }

    return ApiResponse.success(res, 'OTP sent successfully', {
      phone,
      otpSent: true
    });

  } catch (error) {
    console.error('Send artist OTP error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Verify OTP for artist
 * @route   POST /api/artist/auth/verify-otp
 * @access  Public
 */
exports.verifyArtistOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, otp, mode } = req.body;

  try {
    if (mode === 'login') {
      // For login, verify OTP from user document
      const user = await User.findOne({ phone });
      
      if (!user) {
        return ApiResponse.badRequest(res, 'User not found');
      }

      if (user.role !== 'artist') {
        return ApiResponse.badRequest(res, 'This account is not registered as an artist');
      }

      const isOtpValid = await user.verifyOtp(otp);
      if (!isOtpValid) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }

      // Check approval status
      const artist = await Artist.findOne({ user: user._id });
      if (!artist) {
        return ApiResponse.notFound(res, 'Artist profile not found');
      }

      if (artist.approvalStatus === 'pending') {
        return ApiResponse.accepted(res, 'Your artist account is pending approval', {
          pending: true,
          role: user.role,
          approvalStatus: artist.approvalStatus
        });
      }

      if (artist.approvalStatus === 'rejected') {
        return ApiResponse.forbidden(res, 'Your artist account has been rejected', {
          rejected: true,
          reason: artist.rejectionReason
        });
      }

      // Generate JWT token
      const token = user.getSignedJwtToken();

      return ApiResponse.success(res, 'Login successful', {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name || '',
          email: user.email || '',
          role: user.role,
          status: user.status,
          profilePic: user.profilePic
        },
        artist: {
          id: artist._id,
          type: artist.type,
          approvalStatus: artist.approvalStatus
        }
      });

    } else {
      // For signup, verify OTP from temp store
      if (!global.tempOtps || !global.tempOtps[phone]) {
        return ApiResponse.badRequest(res, 'OTP not found or expired');
      }

      const storedOtp = global.tempOtps[phone];
      if (storedOtp.code !== otp || Date.now() > storedOtp.expiresAt) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }

      // Clear OTP from temp store
      delete global.tempOtps[phone];

      return ApiResponse.success(res, 'OTP verified successfully', {
        phone,
        verified: true
      });
    }

  } catch (error) {
    console.error('Verify artist OTP error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Get artist profile
 * @route   GET /api/artist/profile
 * @access  Private (Artist only)
 */
exports.getArtistProfile = async (req, res) => {
  try {
    const artist = await Artist.findOne({ user: req.user.id })
      .populate('user', 'name email phone profilePic');

    if (!artist) {
      return ApiResponse.notFound(res, 'Artist profile not found');
    }

    return ApiResponse.success(res, 'Artist profile retrieved successfully', {
      artist
    });

  } catch (error) {
    console.error('Get artist profile error:', error);
    return ApiResponse.serverError(res, 'Error retrieving artist profile', error);
  }
};

/**
 * @desc    Update artist profile
 * @route   PUT /api/artist/profile
 * @access  Private (Artist only)
 */
exports.updateArtistProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const artist = await Artist.findOne({ user: req.user.id });

    if (!artist) {
      return ApiResponse.notFound(res, 'Artist profile not found');
    }

    // Update allowed fields
    const allowedFields = [
      'bio', 'genres', 'languages', 'type', 'basePrice', 
      'customPricing', 'gallery', 'socialLinks', 'availability'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        artist[field] = req.body[field];
      }
    });

    await artist.save();

    return ApiResponse.success(res, 'Artist profile updated successfully', {
      artist
    });

  } catch (error) {
    console.error('Update artist profile error:', error);
    return ApiResponse.serverError(res, 'Error updating artist profile', error);
  }
};
