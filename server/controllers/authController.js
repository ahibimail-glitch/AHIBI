const User = require('../models/User');
const axios = require('axios');
const emailService = require('../services/emailService');
const { validationResult } = require('express-validator');

const sendOtpEmail = async (email, name, otp) => {
  if (!email) {
    return {
      success: false,
      error: 'Email address is required to send OTP.'
    };
  }

  return emailService.sendOtpEmail(
    {
      email,
      name: name || 'there'
    },
    otp
  );
};

const buildAuthSuccessResponse = (user, token, message, extraData = {}) => ({
  success: true,
  message,
  data: {
    token,
    ...extraData,
    user: {
      id: user._id,
      phone: user.phone || '',
      name: user.name || '',
      email: user.email || '',
      role: user.role,
      status: user.status,
      profilePic: user.profilePic,
      city: user.city || '',
      address: user.address,
      location: user.location,
      authProvider: user.authProvider || 'phone_otp'
    }
  }
});

const verifyGoogleIdToken = async (idToken) => {
  const response = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
    params: {
      id_token: idToken
    }
  });

  const payload = response.data;
  const allowedClientIds = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  ].filter(Boolean);

  if (!allowedClientIds.length) {
    throw new Error('Google auth is not configured. GOOGLE_CLIENT_ID is missing.');
  }

  if (!allowedClientIds.includes(payload.aud)) {
    throw new Error('Invalid Google token audience.');
  }

  if (!payload.email || payload.email_verified !== 'true') {
    throw new Error('Google account email is not verified.');
  }

  return payload;
};

/**
 * @desc    Authenticate user with Google
 * @route   POST /api/auth/google
 * @access  Public
 */
exports.googleAuth = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { idToken } = req.body;

  try {
    const googlePayload = await verifyGoogleIdToken(idToken);
    const email = googlePayload.email.toLowerCase();

    let user = await User.findOne({
      $or: [
        { googleId: googlePayload.sub },
        { email }
      ]
    }).select('+passwordHash');

    if (!user) {
      user = new User({
        email,
        name: googlePayload.name || email.split('@')[0],
        profilePic: googlePayload.picture || '',
        googleId: googlePayload.sub,
        authProvider: 'google',
        city: ''
      });
    } else {
      user.email = email;
      user.googleId = googlePayload.sub;
      user.name = user.name || googlePayload.name || email.split('@')[0];
      user.profilePic = user.profilePic || googlePayload.picture || '';
      user.authProvider = user.authProvider === 'phone_otp' ? 'mixed' : (user.authProvider || 'google');
    }

    await user.save();

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
    return res.status(200).json(
      buildAuthSuccessResponse(user, token, 'Google authentication successful', {
        needsPasswordSetup: false
      })
    );
  } catch (error) {
    console.error('Google auth error:', error.response?.data || error.message);
    return res.status(400).json({
      success: false,
      message: 'Google authentication failed',
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

  const { phone, mode, email, name } = req.body;

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

    if ((mode === 'signup' || !mode) && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to send OTP'
      });
    }

    if (mode === 'login' && user && !user.email) {
      return res.status(400).json({
        success: false,
        message: 'No email is linked to this account. Please contact support.'
      });
    }

    // For login, generate OTP using user.setOtp() and store on user document
    let otp;
    let recipientEmail;
    let recipientName;

    if (mode === 'login' && user) {
      otp = await user.setOtp();
      recipientEmail = user.email;
      recipientName = user.name;
    } else {
      // For signup, use in-memory temp store
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      if (!global.tempOtps) global.tempOtps = {};
      global.tempOtps[phone] = {
        code: otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        email,
        name,
        city: req.body.city
      };
      recipientEmail = email;
      recipientName = name;
    }

    // Store OTP and expiry in a temp store (in-memory, Redis, or DB). For now, use a simple in-memory store (for demo, not production safe)
    if (!global.tempOtps) global.tempOtps = {};
    global.tempOtps[phone] = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      ...(mode === 'login'
        ? {}
        : {
            email,
            name,
            city: req.body.city
          })
    };

    const emailResponse = await sendOtpEmail(recipientEmail, recipientName, otp);

    if (!emailResponse.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP',
        error: emailResponse.error || 'Email OTP could not be sent'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
      data: {
        phone,
        otpSent: true,
        email: recipientEmail
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
      user = new User({
        phone,
        name,
        city,
        email: email || tempOtp.email
      });
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
    res.status(200).json(
      buildAuthSuccessResponse(user, token, 'OTP verified successfully', {
        needsPasswordSetup
      })
    );
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

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: 'No email is linked to this account. Please contact support.'
      });
    }

    // Generate OTP for password reset
    const otp = await user.setOtp();

    const emailResponse = await sendOtpEmail(user.email, user.name, otp);

    if (!emailResponse.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP',
        error: emailResponse.error || 'Email OTP could not be sent'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email for password reset',
      data: {
        phone,
        otpSent: true,
        email: user.email
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
