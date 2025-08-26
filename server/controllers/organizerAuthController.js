const Organizer = require('../models/Organizer');
const smsService = require('../services/smsService');
const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const tempOtpStore = require('../utils/tempOtpStore'); 

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
      // For login, verify OTP from organizer document
      const organizer = await Organizer.findOne({ phone });
      
      if (!organizer) {
        return ApiResponse.badRequest(res, 'Organizer not found');
      }

      const isOtpValid = await organizer.verifyOtp(otp);
      if (!isOtpValid) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }

      // Check approval status
      if (organizer.approvalStatus === 'pending') {
        return ApiResponse.accepted(res, 'Your organizer account is pending approval', {
          pending: true,
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
      const token = organizer.getSignedJwtToken();

      // Respond with token and user data
      return ApiResponse.success(res, 'OTP verified successfully. Login successful.', {
        token,
        user: {
          _id: organizer._id,
          name: organizer.name,
          email: organizer.email,
          phone: organizer.phone,
          role: 'organizer',
          status: organizer.status
        }
      });

    } else {
      // For signup, verify OTP from temp store
      const stored = tempOtpStore.get(phone);
      if (!stored || stored.otp !== otp) {
        return ApiResponse.badRequest(res, 'Invalid or expired OTP');
      }

      // Clear OTP and data from temp store
      tempOtpStore.delete(phone);

      // Create organizer account from stored data
      const organizer = await Organizer.create(stored.data);

      return ApiResponse.success(res, 'Organizer account created successfully. Pending admin approval.', {
        organizer: {
          id: organizer._id,
          companyName: organizer.companyName,
          approvalStatus: organizer.approvalStatus
        }
      });
    }

  } catch (error) {
    console.error('Verify Organizer OTP Error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
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
    // For login, check if organizer exists and is approved
    if (mode === 'login') {
      const organizer = await Organizer.findOne({ phone });
      if (!organizer) {
        return ApiResponse.notFound(res, 'Organizer not found. Please sign up first.');
      }

      if (organizer.approvalStatus === 'pending') {
        return ApiResponse.forbidden(res, 'Your account is pending approval from the admin.');
      }

      if (organizer.approvalStatus === 'rejected') {
        return ApiResponse.forbidden(res, 'Your account has been rejected. Please contact support.');
      }

      // Generate OTP
      let otp = await organizer.setOtp();
      // Send OTP via SMS service
      const smsResponse = await smsService.sendOtp(phone, otp);

      if (!smsResponse.success) {
        return ApiResponse.serverError(res, 'Failed to send OTP', smsResponse.message);
      }

      return ApiResponse.success(res, 'OTP sent successfully', {
        phone,
        otpSent: true
      });
    }

    // For signup, check if organizer already exists
    if (mode === 'signup' || !mode) {
      let organizer = await Organizer.findOne({ phone });

      if (organizer) {
        return ApiResponse.badRequest(res, 'Number is already registered');
      }

      // Generate OTP
      let otp = Math.floor(100000 + Math.random() * 900000).toString();
      // Store OTP and the full request body for use in verification step
      tempOtpStore.set(phone, { otp, data: req.body });

      // Send OTP via SMS service
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
    console.error('Send organizer OTP error:', error);
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
    const organizer = await Organizer.findById(req.user.id);

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
    const organizer = await Organizer.findById(req.user.id);

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
