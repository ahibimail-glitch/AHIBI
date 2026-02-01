const User = require('../models/User');
const smsService = require('../services/smsService');
const { validationResult } = require('express-validator');

/**
 * @desc    Send OTP to user's phone number
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
exports.sendOtp = async (req, res) => {
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
      return res.status(400).json({
        success: false,
        message: 'Number is already registered'
      });
    }
    if (mode === 'login' && !user) {
      return res.status(400).json({
        success: false,
        message: 'Number is not registered'
      });
    }
    // For login, generate OTP using user.setOtp() and store on user document
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

    // Store OTP and expiry in a temp store (in-memory, Redis, or DB). For now, use a simple in-memory store (for demo, not production safe)
    if (!global.tempOtps) global.tempOtps = {};
    global.tempOtps[phone] = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    };

    // Send OTP via SMS service
    const smsResponse = await smsService.sendOtp(phone, otp);

    if (!smsResponse.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP',
        error: smsResponse.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone,
        otpSent: true
      }
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Login with password (new method)
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.loginWithPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, password } = req.body;

  try {
    // First check if user exists
    const user = await User.findOne({ phone }).select('+passwordHash');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Phone number not registered. Please sign up first.'
      });
    }

    // Check if user has password-based authentication
    if (!user.hasPasswordAuth()) {
      return res.status(400).json({
        success: false,
        message: 'Password not set for this account. Please use OTP verification.',
        requiresOtp: true,
        phone: phone
      });
    }
    

    // Verify password
    const isPasswordValid = await user.matchPasswordHash(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check if user is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been blocked. Please contact support.' 
      });
    }

    // Check if user requires approval
    if (user.status === 'pending' && ['artist', 'venue', 'organizer'].includes(user.role)) {
      return res.status(202).json({
        success: true,
        message: 'Your account is pending approval',
        data: { pending: true, role: user.role }
      });
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name || '',
          email: user.email || '',
          role: user.role,
          status: user.status,
          profilePic: user.profilePic
        }
      }
    });
  } catch (error) {
    console.error('Password login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Setup password for user (after OTP verification)
 * @route   POST /api/auth/setup-password
 * @access  Private
 */
exports.setupPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { password } = req.body;
    const userId = req.user.id;

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has a password
    if (user.hasPasswordAuth()) {
      return res.status(400).json({
        success: false,
        message: 'Password is already set for this account'
      });
    }

    // Set the password
    await user.setPassword(password);

    res.status(200).json({
      success: true,
      message: 'Password set successfully',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          profilePic: user.profilePic
        }
      }
    });
  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Verify OTP and login user
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, otp } = req.body;

  try {
    let user = await User.findOne({ phone });

    // If user does not exist, check OTP in temp store and create user
    if (!user) {
      if (!global.tempOtps || !global.tempOtps[phone]) {
        return res.status(400).json({ success: false, message: 'OTP expired or not requested' });
      }
      const tempOtp = global.tempOtps[phone];
      if (tempOtp.code !== otp || tempOtp.expiresAt < Date.now()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      // OTP is valid, create user
      const { name, city, email } = req.body;
      if (!name || !city) {
        return res.status(400).json({ success: false, message: 'Name and city are required for signup.' });
      }
      user = new User({ phone, name, city, email });
      await user.save();
      delete global.tempOtps[phone];
    } else {
      // If user exists, verify OTP using user's method (for login)
      const isValidOtp = await user.verifyOtp(otp);
      if (!isValidOtp) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      // Check if user is blocked
      if (user.status === 'blocked') {
        return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
      }
      // Check if user requires approval
      if (user.status === 'pending' && ['artist', 'venue', 'organizer'].includes(user.role)) {
        return res.status(202).json({
          success: true,
          message: 'Your account is pending approval',
          data: { pending: true, role: user.role }
        });
      }
    }

    // Check if user needs password setup
    const needsPasswordSetup = !user.hasPasswordAuth();

    // Generate JWT token
    const token = user.getSignedJwtToken();
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token,
        needsPasswordSetup,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name || '',
          email: user.email || '',
          role: user.role,
          status: user.status,
          profilePic: user.profilePic
        }
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, email, profilePic } = req.body;
    const userId = req.user.id;

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user profile
    if (name) user.name = name;
    if (email) user.email = email;
    if (typeof profilePic === 'string') user.profilePic = profilePic;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          profilePic: user.profilePic
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-otp -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          profilePic: user.profilePic,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Check if user exists and has password
 * @route   POST /api/auth/check-user
 * @access  Public
 */
exports.checkUserExists = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ phone }).select('+passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not registered. Please sign up first.'
      });
    }

    // Check if user has password-based authentication
    const hasPassword = user.hasPasswordAuth();

    res.status(200).json({
      success: true,
      data: {
        exists: true,
        hasPassword,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Send OTP for password reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not registered. Please sign up first.'
      });
    }

    // Generate OTP for password reset
    const otp = await user.setOtp();

    // Send OTP via SMS service
    const smsResponse = await smsService.sendOtp(phone, otp);

    if (!smsResponse.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP',
        error: smsResponse.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully for password reset',
      data: {
        phone,
        otpSent: true
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Reset password with OTP verification
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, otp, newPassword } = req.body;

  try {
    // Find user by phone number
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify OTP
    const isValidOtp = await user.verifyOtp(otp);
    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Set the new password
    await user.setPassword(newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          profilePic: user.profilePic
        }
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
