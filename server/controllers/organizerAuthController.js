const User = require('../models/User');
const Organizer = require('../models/Organizer');
const smsService = require('../services/smsService');
const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Organizer signup
 * @route   POST /api/organizer/auth/signup
 * @access  Public
 */
exports.organizerSignup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    name,
    email,
    phone,
    password,
    city,
    companyName,
    description,
    address,
    contactInfo
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
      password,
      city: city || (address && address.city) || undefined,
      role: 'organizer',
      status: 'pending' // Set to pending until approved by admin
    });

    // Create organizer profile
    const organizer = await Organizer.create({
      user: user._id,
      companyName,
      description,
      address,
      contactInfo,
      approvalStatus: 'pending'
    });

    // Send OTP for verification
    const otp = await user.setOtp();
    const smsResponse = await smsService.sendOtp(phone, otp);

    if (!smsResponse.success) {
      return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
    }

    return ApiResponse.success(res, 'Organizer account created successfully. Pending admin approval.', {
      organizer: {
        id: organizer._id,
        companyName: organizer.companyName,
        approvalStatus: organizer.approvalStatus
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
    console.error('Organizer signup error:', error);
    return ApiResponse.serverError(res, 'Error creating organizer account', error);
  }
};

/**
 * @desc    Organizer login
 * @route   POST /api/organizer/auth/login
 * @access  Public
 */
exports.organizerLogin = async (req, res) => {
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

    // Check if user is an organizer
    if (user.role !== 'organizer') {
      return ApiResponse.badRequest(res, 'This account is not registered as an organizer.');
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

    // Check if organizer is approved
    const organizer = await Organizer.findOne({ user: user._id });
    if (!organizer) {
      return ApiResponse.notFound(res, 'Organizer profile not found');
    }

    if (organizer.approvalStatus === 'pending') {
      return ApiResponse.accepted(res, 'Your organizer account is pending approval', {
        pending: true,
        role: user.role,
        approvalStatus: organizer.approvalStatus
      });
    }

    if (organizer.approvalStatus === 'rejected') {
      return ApiResponse.forbidden(res, 'Your organizer account has been rejected', {
        rejected: true,
        reason: organizer.rejectionReason
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
      organizer: {
        id: organizer._id,
        companyName: organizer.companyName,
        approvalStatus: organizer.approvalStatus
      }
    });

  } catch (error) {
    console.error('Organizer login error:', error);
    return ApiResponse.serverError(res, 'Error during login', error);
  }
};

/**
 * @desc    Send OTP for organizer
 * @route   POST /api/organizer/auth/send-otp
 * @access  Public
 */
exports.sendOrganizerOtp = async (req, res) => {
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

    // For login, check if user is an organizer
    if (mode === 'login' && user && user.role !== 'organizer') {
      return ApiResponse.badRequest(res, 'This account is not registered as an organizer');
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
    console.error('Send organizer OTP error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Verify OTP for organizer
 * @route   POST /api/organizer/auth/verify-otp
 * @access  Public
 */
exports.verifyOrganizerOtp = async (req, res) => {
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

      if (user.role !== 'organizer') {
        return ApiResponse.badRequest(res, 'This account is not registered as an organizer');
      }

      const isOtpValid = await user.verifyOtp(otp);
      if (!isOtpValid) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }

      // Check approval status
      const organizer = await Organizer.findOne({ user: user._id });
      if (!organizer) {
        return ApiResponse.notFound(res, 'Organizer profile not found');
      }

      if (organizer.approvalStatus === 'pending') {
        return ApiResponse.accepted(res, 'Your organizer account is pending approval', {
          pending: true,
          role: user.role,
          approvalStatus: organizer.approvalStatus
        });
      }

      if (organizer.approvalStatus === 'rejected') {
        return ApiResponse.forbidden(res, 'Your organizer account has been rejected', {
          rejected: true,
          reason: organizer.rejectionReason
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
        organizer: {
          id: organizer._id,
          companyName: organizer.companyName,
          approvalStatus: organizer.approvalStatus
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
    console.error('Verify organizer OTP error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Get organizer profile
 * @route   GET /api/organizer/profile
 * @access  Private (Organizer only)
 */
exports.getOrganizerProfile = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ user: req.user.id })
      .populate('user', 'name email phone profilePic');

    if (!organizer) {
      return ApiResponse.notFound(res, 'Organizer profile not found');
    }

    return ApiResponse.success(res, 'Organizer profile retrieved successfully', {
      organizer
    });

  } catch (error) {
    console.error('Get organizer profile error:', error);
    return ApiResponse.serverError(res, 'Error retrieving organizer profile', error);
  }
};

/**
 * @desc    Update organizer profile
 * @route   PUT /api/organizer/profile
 * @access  Private (Organizer only)
 */
exports.updateOrganizerProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const organizer = await Organizer.findOne({ user: req.user.id });

    if (!organizer) {
      return ApiResponse.notFound(res, 'Organizer profile not found');
    }

    // Update allowed fields
    const allowedFields = [
      'companyName', 'description', 'logo', 'bannerImage',
      'contactInfo', 'address', 'documents', 'bankDetails',
      'socialLinks', 'eventCategories'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        organizer[field] = req.body[field];
      }
    });

    await organizer.save();

    return ApiResponse.success(res, 'Organizer profile updated successfully', {
      organizer
    });

  } catch (error) {
    console.error('Update organizer profile error:', error);
    return ApiResponse.serverError(res, 'Error updating organizer profile', error);
  }
};
