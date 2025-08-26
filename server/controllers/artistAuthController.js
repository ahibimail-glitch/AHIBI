const Artist = require('../models/Artist');
const smsService = require('../services/smsService');
const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const tempOtpStore = require('../utils/tempOtpStore');

/**
 * @desc    Register a new artist
 * @route   POST /api/auth/artist/signup
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
    city,
    bio,
    genres,
    type,
    specialization,
    basePrice,
    experience
  } = req.body;

  try {
    // Check if artist already exists
    const existingArtist = await Artist.findOne({ 
      $or: [{ phone }, { email }] 
    });

    if (existingArtist) {
      return ApiResponse.badRequest(res, 'Artist with this phone or email already exists');
    }

    // Create artist account
    const artist = await Artist.create({
      name,
      email,
      phone,
      city,
      bio,
      genres,
      type: type || specialization,
      basePrice,
      experience,
      approvalStatus: 'pending'
    });

    // For OTP-based signup, we don't send a token here.
    // The user will verify OTP to complete registration and get a token.
    return ApiResponse.success(res, 'Artist registered. Please verify OTP to complete signup.');

  } catch (error) {
    console.error('Artist Signup Error:', error);
    return ApiResponse.serverError(res, 'Error creating artist account', error.message);
  }
};

/**
 * @desc    Send OTP to artist for login or signup
 * @route   POST /api/auth/artist/send-otp
 * @access  Public
 */
exports.sendArtistOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, mode } = req.body;

  try {
    // For login, check if artist exists and is approved
    if (mode === 'login') {
      const artist = await Artist.findOne({ phone });
      if (!artist) {
        return ApiResponse.notFound(res, 'Artist not found. Please sign up first.');
      }

      if (artist.approvalStatus === 'pending') {
        return ApiResponse.forbidden(res, 'Your account is pending approval from the admin.');
      }

      if (artist.approvalStatus === 'rejected') {
        return ApiResponse.forbidden(res, 'Your account has been rejected. Please contact support.');
      }

      // Set and send OTP
      let otp = await artist.setOtp();
      const smsResponse = await smsService.sendOtp(phone, otp);

      if (!smsResponse.success) {
        return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
      }

      return ApiResponse.success(res, 'Login OTP sent successfully');

    } else {
      // For signup, check if artist already exists
      let artist = await Artist.findOne({ phone });
      if (artist) {
        return ApiResponse.badRequest(res, 'Number is already registered');
      }

      // Generate OTP
      let otp = Math.floor(100000 + Math.random() * 900000).toString();
      tempOtpStore.set(phone, otp);

      // Send OTP via SMS
      const smsResponse = await smsService.sendOtp(phone, otp);

      if (!smsResponse.success) {
        return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
      }

      return ApiResponse.success(res, 'OTP sent successfully');
    }

  } catch (error) {
    console.error('Send Artist OTP Error:', error);
    return ApiResponse.serverError(res, 'Error sending OTP', error.message);
  }
};

/**
 * @desc    Verify OTP for artist login or signup
 * @route   POST /api/auth/artist/verify-otp
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
      // For login, verify OTP from artist document
      const artist = await Artist.findOne({ phone });
      
      if (!artist) {
        return ApiResponse.badRequest(res, 'Artist not found');
      }

      const isOtpValid = await artist.verifyOtp(otp);
      if (!isOtpValid) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }

      // Check approval status
      if (artist.approvalStatus === 'pending') {
        return ApiResponse.accepted(res, 'Your artist account is pending approval', {
          pending: true,
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
      const token = artist.getSignedJwtToken();

      // Respond with token
      return ApiResponse.success(res, 'OTP verified successfully. Login successful.', {
        token,
        user: {
          _id: artist._id,
          name: artist.name,
          email: artist.email,
          phone: artist.phone,
          role: 'artist',
          status: artist.status
        }
      });

    } else {
      // For signup, verify OTP from temp store
      const storedOtp = tempOtpStore.get(phone);
      if (!storedOtp || storedOtp !== otp) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }
      tempOtpStore.delete(phone);
      return ApiResponse.success(res, 'OTP verified successfully. Please complete your profile.');
    }

  } catch (error) {
    console.error('Verify Artist OTP Error:', error);
    return ApiResponse.serverError(res, 'Error verifying OTP', error.message);
  }
};

/**
 * @desc    Get current artist profile
 * @route   GET /api/auth/artist/profile
 * @access  Private (Artist only)
 */
exports.getArtistProfile = async (req, res) => {
  try {
    const artist = await Artist.findById(req.user.id);

    if (!artist) {
      return ApiResponse.notFound(res, 'Artist profile not found');
    }

    return ApiResponse.success(res, 'Artist profile retrieved successfully', {
      artist
    });

  } catch (error) {
    console.error('Get Artist Profile Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving artist profile', error.message);
  }
};

/**
 * @desc    Update artist profile
 * @route   PUT /api/auth/artist/profile
 * @access  Private (Artist only)
 */
exports.updateArtistProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const artist = await Artist.findById(req.user.id);

    if (!artist) {
      return ApiResponse.notFound(res, 'Artist profile not found');
    }

    // Update allowed fields
    const { name, email, city, bio, genres, type, specialization, basePrice, experience, socialLinks, profilePic } = req.body;
    
    if (name) artist.name = name;
    if (email) artist.email = email;
    if (city) artist.city = city;
    if (bio) artist.bio = bio;
    if (genres) artist.genres = genres;
    if (type || specialization) artist.type = type || specialization;
    if (basePrice) artist.basePrice = basePrice;
    if (experience) artist.experience = experience;
    if (socialLinks) artist.socialLinks = socialLinks;
    if (profilePic) artist.profilePic = profilePic;

    const updatedArtist = await artist.save();

    return ApiResponse.success(res, 'Artist profile updated successfully', {
      artist: updatedArtist
    });

  } catch (error) {
    console.error('Update Artist Profile Error:', error);
    return ApiResponse.serverError(res, 'Error updating artist profile', error.message);
  }
};