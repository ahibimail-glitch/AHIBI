const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ArenaPartner = require('../models/ArenaPartner');
const ApiResponse = require('../utils/apiResponse');
const notificationService = require('../services/notificationService');
const smsService = require('../services/smsService');
const adminNotificationController = require('./adminNotificationController');

/**
 * @desc    Send OTP to arena partner phone
 * @route   POST /api/arena-partner/auth/send-otp
 * @access  Public
 */
exports.sendOtp = async (req, res) => {
  try {
    const { phone, mode } = req.body;

    if (!phone) {
      return ApiResponse.badRequest(res, 'Phone number is required');
    }

    if (!/^\d{10}$/.test(phone)) {
      return ApiResponse.badRequest(res, 'Please enter a valid 10-digit phone number');
    }

    const existingPartner = await ArenaPartner.findOne({ phone });

    if (mode === 'signup') {
      if (existingPartner) {
        return ApiResponse.badRequest(res, 'Phone number is already registered as arena partner');
      }
    } else if (mode === 'login') {
      if (!existingPartner) {
        return ApiResponse.notFound(res, 'Arena partner not found. Please sign up first.');
      }
    }

    let partner;
    if (existingPartner) {
      partner = existingPartner;
    } else {
      partner = new ArenaPartner({ phone, name: 'Arena Partner', email: `${phone}@temp.com` });
    }

    const otp = await partner.setOtp();

    try {
      await smsService.sendOtp(phone, otp);
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      return ApiResponse.serverError(res, 'Failed to send OTP. Please try again.');
    }

    return ApiResponse.success(res, 'OTP sent successfully', {
      phone,
      expiresIn: '10 minutes'
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return ApiResponse.serverError(res, 'Error sending OTP', error);
  }
};

/**
 * @desc    Verify OTP and register/login arena partner
 * @route   POST /api/arena-partner/auth/verify-otp
 * @access  Public
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp, mode, name, email, businessName } = req.body;

    if (!phone || !otp) {
      return ApiResponse.badRequest(res, 'Phone number and OTP are required');
    }

    const partner = await ArenaPartner.findOne({ phone });

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    const isValidOtp = await partner.verifyOtp(otp);

    if (!isValidOtp) {
      return ApiResponse.badRequest(res, 'Invalid or expired OTP');
    }

    if (mode === 'signup') {
      if (!name || !email || !businessName) {
        return ApiResponse.badRequest(res, 'Name, email, and business name are required for signup');
      }

      const emailExists = await ArenaPartner.findOne({ email, _id: { $ne: partner._id } });
      if (emailExists) {
        return ApiResponse.badRequest(res, 'Email is already registered');
      }

      partner.name = name;
      partner.email = email;
      partner.businessDetails = {
        businessName,
        businessType: 'individual'
      };
      partner.approvalStatus = 'pending';
      await partner.save();

      // Notify admin about new sports partner registration
      adminNotificationController.notifySportsPartnerRegistration(partner);

      const token = partner.getSignedJwtToken();
      return ApiResponse.success(res, 'Registration successful', {
        token,
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          businessName: partner.businessDetails?.businessName,
          approvalStatus: partner.approvalStatus
        }
      });
    }

    // Login mode — check approval status
    if (partner.approvalStatus === 'pending') {
      return ApiResponse.accepted(res, 'Your account is pending approval', { pending: true });
    }

    if (partner.approvalStatus === 'rejected') {
      return ApiResponse.forbidden(res, 'Your account has been rejected', { rejected: true });
    }

    const partnerWithPw = await ArenaPartner.findOne({ phone }).select('+passwordHash');
    const token = partner.getSignedJwtToken();

    return ApiResponse.success(res, 'Login successful', {
      token,
      hasPassword: partnerWithPw ? partnerWithPw.hasPasswordAuth() : false,
      partner: {
        id: partner._id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        businessName: partner.businessDetails?.businessName,
        approvalStatus: partner.approvalStatus
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return ApiResponse.serverError(res, 'Error verifying OTP', error);
  }
};

/**
 * @desc    Login arena partner with password
 * @route   POST /api/arena-partner/auth/login
 * @access  Public
 */
exports.loginWithPassword = async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !/^\d{10}$/.test(phone)) {
    return ApiResponse.badRequest(res, 'Valid 10-digit phone number is required');
  }
  if (!password || password.length < 6) {
    return ApiResponse.badRequest(res, 'Password must be at least 6 characters');
  }

  try {
    const partner = await ArenaPartner.findOne({ phone }).select('+passwordHash');

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found. Please sign up first.');
    }

    if (!partner.hasPasswordAuth()) {
      return res.status(400).json({
        success: false,
        message: 'No password set. Use "Forgot password?" to set one via OTP.',
        requiresOtp: true
      });
    }

    const isValid = await partner.matchPasswordHash(password);
    if (!isValid) {
      return ApiResponse.badRequest(res, 'Invalid password');
    }

    if (partner.approvalStatus === 'pending') {
      return ApiResponse.accepted(res, 'Your account is pending approval', { pending: true });
    }

    if (partner.approvalStatus === 'rejected') {
      return ApiResponse.forbidden(res, 'Your account has been rejected', { rejected: true });
    }

    const token = partner.getSignedJwtToken();

    return ApiResponse.success(res, 'Login successful', {
      token,
      partner: {
        id: partner._id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        businessName: partner.businessDetails?.businessName,
        approvalStatus: partner.approvalStatus
      }
    });
  } catch (error) {
    console.error('Arena partner password login error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Set or update arena partner password (requires JWT)
 * @route   POST /api/arena-partner/auth/setup-password
 * @access  Private (Arena Partner)
 */
exports.setupPassword = async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    return ApiResponse.badRequest(res, 'Password must be at least 6 characters');
  }

  try {
    const partner = await ArenaPartner.findById(req.user._id || req.user.id);
    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    const salt = await bcrypt.genSalt(10);
    partner.passwordHash = await bcrypt.hash(password, salt);
    await partner.save({ validateBeforeSave: false });

    return ApiResponse.success(res, 'Password set successfully');
  } catch (error) {
    console.error('Setup arena partner password error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Get arena partner profile
 * @route   GET /api/arena-partner/auth/profile
 * @access  Private (Arena Partner)
 */
exports.getProfile = async (req, res) => {
  try {
    const partner = await ArenaPartner.findById(req.user.id)
      .select('-otp -otpExpires');

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    return ApiResponse.success(res, 'Profile retrieved successfully', { partner });

  } catch (error) {
    console.error('Get profile error:', error);
    return ApiResponse.serverError(res, 'Error retrieving profile', error);
  }
};

/**
 * @desc    Update arena partner profile
 * @route   PUT /api/arena-partner/auth/profile
 * @access  Private (Arena Partner)
 */
exports.updateProfile = async (req, res) => {
  try {
    const partner = await ArenaPartner.findById(req.user.id);

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    const allowedFields = ['name', 'email', 'businessDetails', 'bankDetails', 'preferences'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'businessDetails' || field === 'bankDetails' || field === 'preferences') {
          partner[field] = { ...partner[field], ...req.body[field] };
        } else {
          partner[field] = req.body[field];
        }
      }
    });

    await partner.save();

    return ApiResponse.success(res, 'Profile updated successfully', { partner });

  } catch (error) {
    console.error('Update profile error:', error);
    return ApiResponse.serverError(res, 'Error updating profile', error);
  }
};

/**
 * @desc    Upload KYC documents
 * @route   POST /api/arena-partner/auth/kyc-upload
 * @access  Private (Arena Partner)
 */
exports.uploadKycDocuments = async (req, res) => {
  try {
    const partner = await ArenaPartner.findById(req.user.id);

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    const { documentType, url } = req.body;

    if (!documentType || !url) {
      return ApiResponse.badRequest(res, 'Document type and URL are required');
    }

    const validDocTypes = ['aadhaarCard', 'panCard', 'businessLicense', 'gstCertificate', 'bankProof'];

    if (!validDocTypes.includes(documentType)) {
      return ApiResponse.badRequest(res, 'Invalid document type');
    }

    partner.kycDocuments[documentType] = {
      url,
      verified: false
    };

    await partner.save();

    return ApiResponse.success(res, 'KYC document uploaded successfully', {
      kycDocuments: partner.kycDocuments
    });

  } catch (error) {
    console.error('Upload KYC error:', error);
    return ApiResponse.serverError(res, 'Error uploading KYC document', error);
  }
};

/**
 * @desc    Submit for approval
 * @route   POST /api/arena-partner/auth/submit-approval
 * @access  Private (Arena Partner)
 */
exports.submitForApproval = async (req, res) => {
  try {
    const partner = await ArenaPartner.findById(req.user.id);

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    if (partner.approvalStatus === 'approved') {
      return ApiResponse.badRequest(res, 'Partner is already approved');
    }

    if (!partner.businessDetails?.businessName) {
      return ApiResponse.badRequest(res, 'Business details are incomplete');
    }

    if (!partner.bankDetails?.accountNumber) {
      return ApiResponse.badRequest(res, 'Bank details are required for approval');
    }

    partner.approvalStatus = 'pending';
    await partner.save();

    // Send notification to admin
    await notificationService.handleSportsPartnerRegistration(partner);

    return ApiResponse.success(res, 'Submitted for approval successfully', {
      approvalStatus: partner.approvalStatus
    });

  } catch (error) {
    console.error('Submit approval error:', error);
    return ApiResponse.serverError(res, 'Error submitting for approval', error);
  }
};

module.exports = exports;
