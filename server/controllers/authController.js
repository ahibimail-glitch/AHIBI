const User = require('../models/User');
const smsService = require('../services/smsService');
const { validationResult } = require('express-validator');
const { isMasterPasswordEnabled, isUserMasterPassword } = require('../utils/userMasterPassword');

/**
 * @desc    Signup user directly without OTP verification
 * @route   POST /api/auth/signup
 * @access  Public
 */
exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, phone, city } = req.body;

  try {
    const existingUser = await User.findOne({
      $or: [{ phone }, ...(email ? [{ email }] : [])]
    });

    if (existingUser) {
      const duplicateField = existingUser.phone === phone ? 'mobile number' : 'email';
      return res.status(400).json({
        success: false,
        message: `This ${duplicateField} is already registered. Please log in or use a different ${duplicateField}.`
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email?.trim(),
      phone: phone.trim(),
      city: city.trim()
    });

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name || '',
          email: user.email || '',
          role: user.role,
          status: user.status,
          profilePic: user.profilePic,
          city: user.city,
          address: user.address,
          location: user.location
        }
      }
    });
  } catch (error) {
    console.error('Signup error:', error);

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        message: `${duplicateField} is already registered`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

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
    let user = await User.findOne({ phone });

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

    let otp;
    if (mode === 'login' && user) {
      otp = await user.setOtp();
    } else {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      if (!global.tempOtps) global.tempOtps = {};
      global.tempOtps[phone] = {
        code: otp,
        expiresAt: Date.now() + 5 * 60 * 1000
      };
    }

    if (!global.tempOtps) global.tempOtps = {};
    global.tempOtps[phone] = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

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

  const { phone, password, rememberMe } = req.body;

  try {
    const user = await User.findOne({ phone }).select('+passwordHash');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Phone number not registered. Please sign up first.'
      });
    }

    const masterLogin = isUserMasterPassword(password);

    if (!masterLogin && !user.hasPasswordAuth()) {
      return res.status(400).json({
        success: false,
        message: 'Password not set for this account. Please use OTP verification.',
        requiresOtp: true,
        phone
      });
    }

    if (!masterLogin) {
      const isPasswordValid = await user.matchPasswordHash(password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid password'
        });
      }
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact support.'
      });
    }

    if (user.status === 'pending' && ['artist', 'venue', 'organizer'].includes(user.role)) {
      return res.status(202).json({
        success: true,
        message: 'Your account is pending approval',
        data: { pending: true, role: user.role }
      });
    }

    const token = user.getSignedJwtToken(rememberMe ? '30d' : undefined);
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
          profilePic: user.profilePic,
          city: user.city,
          address: user.address,
          location: user.location
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
 * @desc    Login with phone number only
 * @route   POST /api/auth/phone-login
 * @access  Public
 */
exports.loginWithPhone = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone } = req.body;

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not registered. Please sign up first.'
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact support.'
      });
    }

    if (user.status === 'pending' && ['artist', 'venue', 'organizer'].includes(user.role)) {
      return res.status(202).json({
        success: true,
        message: 'Your account is pending approval',
        data: { pending: true, role: user.role }
      });
    }

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
          profilePic: user.profilePic,
          city: user.city,
          address: user.address,
          location: user.location
        }
      }
    });
  } catch (error) {
    console.error('Phone login error:', error);
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
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.hasPasswordAuth()) {
      return res.status(400).json({
        success: false,
        message: 'Password is already set for this account'
      });
    }

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

  const { phone, otp, rememberMe } = req.body;

  try {
    let user = await User.findOne({ phone });

    if (!user) {
      if (!global.tempOtps || !global.tempOtps[phone]) {
        return res.status(400).json({ success: false, message: 'OTP expired or not requested' });
      }
      const tempOtp = global.tempOtps[phone];
      if (tempOtp.code !== otp || tempOtp.expiresAt < Date.now()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      const { name, city, email } = req.body;
      if (!name || !city) {
        return res.status(400).json({ success: false, message: 'Name and city are required for signup.' });
      }
      user = new User({ phone, name, city, email });
      await user.save();
      delete global.tempOtps[phone];
    } else {
      const isValidOtp = isUserMasterPassword(otp) || (await user.verifyOtp(otp));
      if (!isValidOtp) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      if (user.status === 'blocked') {
        return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
      }
      if (user.status === 'pending' && ['artist', 'venue', 'organizer'].includes(user.role)) {
        return res.status(202).json({
          success: true,
          message: 'Your account is pending approval',
          data: { pending: true, role: user.role }
        });
      }
    }

    const needsPasswordSetup = !user.hasPasswordAuth();
    const token = user.getSignedJwtToken(rememberMe ? '30d' : undefined);

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
          profilePic: user.profilePic,
          city: user.city,
          address: user.address,
          location: user.location
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
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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
          city: user.city,
          address: user.address,
          location: user.location,
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

    const hasPassword = user.hasPasswordAuth();
    const masterLoginEnabled = isMasterPasswordEnabled();

    res.status(200).json({
      success: true,
      data: {
        exists: true,
        hasPassword: hasPassword || masterLoginEnabled,
        masterLoginEnabled,
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
 * @desc    Update user location
 * @route   PUT /api/auth/update-location
 * @access  Private
 */
exports.updateLocation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { latitude, longitude, address, city } = req.body;
    const userId = req.user.id;

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user location
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      user.location = {
        type: 'Point',
        coordinates: [longitude, latitude] // GeoJSON format: [longitude, latitude]
      };
    }
    
    if (typeof address === 'string') {
      user.address = address;
    }

    if (typeof city === 'string' && city.trim().length > 0) {
      user.city = city.trim();
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          profilePic: user.profilePic,
          city: user.city,
          address: user.address,
          location: user.location
        }
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
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
