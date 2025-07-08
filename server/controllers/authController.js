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

  const { phone } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ phone });

    // Create user if not found (minimal registration)
    if (!user) {
      user = new User({ phone });
      await user.save();
    }

    // Generate and set OTP
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
    // Check if user exists
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
        data: {
          pending: true,
          role: user.role
        }
      });
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
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
    const { name, email } = req.body;
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
