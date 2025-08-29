const Venue = require('../models/Venue');
const smsService = require('../services/smsService');
const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const tempOtpStore = require('../utils/tempOtpStore');

/**
 * @desc    Send OTP for venue
 * @route   POST /api/venue/auth/send-otp
 * @access  Public
 */
exports.sendVenueOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, mode } = req.body;

  try {
    if (mode === 'login') {
      const venue = await Venue.findOne({ phone });
      if (!venue) {
        return ApiResponse.notFound(res, 'Venue not found. Please sign up first.');
      }

      if (venue.approvalStatus === 'pending') {
        return ApiResponse.forbidden(res, 'Your account is pending approval from the admin.');
      }

      if (venue.approvalStatus === 'rejected') {
        return ApiResponse.forbidden(res, 'Your account has been rejected. Please contact support.');
      }

      let otp = await venue.setOtp();
      const smsResponse = await smsService.sendOtp(phone, otp);

      if (!smsResponse.success) {
        return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
      }

      return ApiResponse.success(res, 'OTP sent successfully', {
        phone,
        otpSent: true
      });
    }

    if (mode === 'signup' || !mode) {
      let venue = await Venue.findOne({ phone });

      if (venue) {
        return ApiResponse.badRequest(res, 'Number is already registered');
      }

      let otp = Math.floor(100000 + Math.random() * 900000).toString();
      tempOtpStore.set(phone, { otp, data: req.body });

      const smsResponse = await smsService.sendOtp(phone, otp);

      if (!smsResponse.success) {
        return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
      }

      return ApiResponse.success(res, 'OTP sent successfully', {
        phone,
        otpSent: true
      });
    }

  } catch (error) {
    console.error('Send venue OTP error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Verify OTP for venue
 * @route   POST /api/venue/auth/verify-otp
 * @access  Public
 */
exports.verifyVenueOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, otp, mode } = req.body;

  try {
    if (mode === 'login') {
      const venue = await Venue.findOne({ phone });
      
      if (!venue) {
        return ApiResponse.badRequest(res, 'Venue not found');
      }

      const isOtpValid = await venue.verifyOtp(otp);
      if (!isOtpValid) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }

      if (venue.approvalStatus === 'pending') {
        return ApiResponse.accepted(res, 'Your venue account is pending approval', {
          pending: true,
          approvalStatus: venue.approvalStatus
        });
      }

      if (venue.approvalStatus === 'rejected') {
        return ApiResponse.forbidden(res, 'Your venue account has been rejected', {
          rejected: true,
          reason: venue.rejectionReason
        });
      }

      const token = venue.getSignedJwtToken();

      return ApiResponse.success(res, 'OTP verified successfully. Login successful.', {
        token,
        user: {
          _id: venue._id,
          name: venue.name,
          email: venue.email,
          phone: venue.phone,
          role: 'venue',
        }
      });

    } else {
      const stored = tempOtpStore.get(phone);
      if (!stored || stored.otp !== otp) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }

      tempOtpStore.delete(phone);

      const venue = await Venue.create(stored.data);

      return ApiResponse.success(res, 'Venue account created successfully. Pending admin approval.', {
        venue: {
          id: venue._id,
          name: venue.name,
          approvalStatus: venue.approvalStatus
        }
      });
    }

  } catch (error) {
    console.error('Verify Venue OTP Error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Get venue profile
 * @route   GET /api/venue/profile
 * @access  Private (Venue only)
 */
exports.getVenueProfile = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue profile not found');
    }

    return ApiResponse.success(res, 'Venue profile retrieved successfully', {
      venue
    });

  } catch (error) {
    console.error('Get venue profile error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venue profile', error);
  }
};

/**
 * @desc    Update venue profile
 * @route   PUT /api/venue/profile
 * @access  Private (Venue only)
 */
exports.updateVenueProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const venue = await Venue.findById(req.user.id);

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue profile not found');
    }

    const allowedFields = [
      'name', 'description', 'address', 'location', 'capacity', 
      'facilities', 'pricing', 'gallery', 'contactInfo', 
      'availability', 'terms'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        venue[field] = req.body[field];
      }
    });

    await venue.save();

    return ApiResponse.success(res, 'Venue profile updated successfully', {
      venue
    });

  } catch (error) {
    console.error('Update venue profile error:', error);
    return ApiResponse.serverError(res, 'Error updating venue profile', error);
  }
};
