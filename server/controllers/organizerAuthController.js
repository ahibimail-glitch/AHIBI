const mongoose = require('mongoose');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const ArtistBooking = require('../models/ArtistBooking');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');
const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const tempOtpStore = require('../utils/tempOtpStore');
const adminNotificationController = require('./adminNotificationController'); 

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

      // Debug log the verification request
      console.log('Organizer OTP verification request:', { phone, otp: '***', storedData: stored.data });

      // Defensive check to prevent duplicates if data changed between steps
      const { email } = stored.data || {};
      if (!email) {
        return ApiResponse.badRequest(res, 'Email is required');
      }
      // Debug: Check what's in the database
      const phoneCheck = await Organizer.findOne({ phone });
      const emailCheck = await Organizer.findOne({ email });
      const contactEmailCheck = await Organizer.findOne({ 'contactInfo.email': email });
      console.log('Database check results:', {
        phoneExists: !!phoneCheck,
        emailExists: !!emailCheck,
        contactEmailExists: !!contactEmailCheck,
        phoneRecord: phoneCheck ? { phone: phoneCheck.phone, email: phoneCheck.email } : null,
        emailRecord: emailCheck ? { phone: emailCheck.phone, email: emailCheck.email } : null,
        contactEmailRecord: contactEmailCheck ? { phone: contactEmailCheck.phone, email: contactEmailCheck.email, contactEmail: contactEmailCheck.contactInfo?.email } : null
      });

      const existingOrganizer = await Organizer.findOne({ $or: [ { phone }, { email }, { 'contactInfo.email': email } ] });
      if (existingOrganizer) {
        // Add debugging information
        console.log('Organizer conflict found during verification:', {
          requestPhone: phone,
          requestEmail: email,
          existingPhone: existingOrganizer.phone,
          existingEmail: existingOrganizer.email,
          existingContactEmail: existingOrganizer?.contactInfo?.email,
          conflictType: existingOrganizer.email === email ? 'email' : 'phone'
        });
        
        return ApiResponse.badRequest(res, existingOrganizer.email === email ? 'Email is already registered as organizer' : 'Number is already registered as organizer');
      }

      // Clear OTP and data from temp store
      tempOtpStore.delete(phone);

      // Proactively fix legacy unique index on `user` if present (causes dup key on null)
      try {
        const indexes = await Organizer.collection.indexes();
        const hasLegacyUserUnique = Array.isArray(indexes) && indexes.some((idx) => idx.name === 'user_1' && idx.unique);
        if (hasLegacyUserUnique) {
          console.warn('Legacy unique index user_1 found on organizers. Dropping index to proceed.');
          await Organizer.collection.dropIndex('user_1');
        }
      } catch (fixIdxErr) {
        console.error('Index inspection/drop failed (non-fatal):', fixIdxErr?.message || fixIdxErr);
      }

      try {
        // Create organizer account from stored data
        const organizer = await Organizer.create(stored.data);

        // Notify admin about new organizer registration
        adminNotificationController.notifyOrganizerRegistration(organizer);

        // Send welcome email to organizer
        emailService.sendWelcomeEmail(organizer).catch(err => {
          console.error('Error sending organizer welcome email:', err);
        });

        return ApiResponse.success(res, 'Organizer account created successfully. Pending admin approval.', {
          organizer: {
            id: organizer._id,
            companyName: organizer.companyName,
            approvalStatus: organizer.approvalStatus
          }
        });
      } catch (e) {
        if (e && e.code === 11000) {
          const field = e.keyPattern && Object.keys(e.keyPattern)[0];
          console.error('Duplicate key error on organizer create:', {
            keyPattern: e.keyPattern,
            keyValue: e.keyValue,
            message: e.message
          });
          let msg = 'Duplicate value';
          if (field === 'email' || field === 'contactInfo.email') {
            msg = 'Email is already registered as organizer';
          } else if (field === 'phone') {
            msg = 'Number is already registered as organizer';
          }
          return ApiResponse.badRequest(res, msg);
        }
        throw e;
      }
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
      const { email } = req.body;
      
      // Debug log the incoming request
      console.log('Organizer signup request:', { phone, email, mode });
      
      // Check phone, email, and contact email in Organizer collection only
      const existingOrganizer = await Organizer.findOne({ $or: [{ phone }, { email }, { 'contactInfo.email': email }] });

      if (existingOrganizer) {
        // Add debugging information
        console.log('Organizer conflict found:', {
          requestPhone: phone,
          requestEmail: email,
          existingPhone: existingOrganizer.phone,
          existingEmail: existingOrganizer.email,
          conflictType: existingOrganizer.email === email ? 'email' : 'phone'
        });
        
        return ApiResponse.badRequest(res, existingOrganizer.email === email ? 'Email is already registered as organizer' : 'Number is already registered as organizer');
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

/**
 * @desc    Get organizer dashboard statistics
 * @route   GET /api/organizer/dashboard
 * @access  Private (Organizer only)
 */
exports.getOrganizerDashboard = async (req, res) => {
  try {
    const organizerId = req.user.id;

    // Get organizer's events statistics
    const totalEvents = await Event.countDocuments({ organizer: organizerId });
    const activeEvents = await Event.countDocuments({ 
      organizer: organizerId,
      status: 'approved',
      endDate: { $gte: new Date() }
    });
    const pendingEvents = await Event.countDocuments({ 
      organizer: organizerId,
      status: 'pending'
    });
    const completedEvents = await Event.countDocuments({ 
      organizer: organizerId,
      status: 'approved',
      endDate: { $lt: new Date() }
    });

    // Get revenue statistics from bookings
    const revenueStats = await Booking.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'eventData'
        }
      },
      {
        $match: {
          'eventData.organizer': new mongoose.Types.ObjectId(organizerId),
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalTicketsSold: { $sum: '$quantity' }
        }
      }
    ]);

    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;
    const totalTicketsSold = revenueStats.length > 0 ? revenueStats[0].totalTicketsSold : 0;

    console.log('Revenue calculation debug:', {
      organizerId,
      revenueStats: revenueStats.length,
      totalRevenue,
      totalTicketsSold
    });

    // Fallback: Get revenue from Event model if booking aggregation returns 0
    let fallbackRevenue = 0;
    let fallbackTicketsSold = 0;
    if (totalRevenue === 0 || totalTicketsSold === 0) {
      const eventStats = await Event.aggregate([
        { $match: { organizer: new mongoose.Types.ObjectId(organizerId) } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalRevenue' },
            totalTicketsSold: { $sum: '$ticketsSold' }
          }
        }
      ]);
      
      if (eventStats.length > 0) {
        fallbackRevenue = eventStats[0].totalRevenue || 0;
        fallbackTicketsSold = eventStats[0].totalTicketsSold || 0;
      }
      
      console.log('Fallback revenue calculation:', {
        eventStats: eventStats.length,
        fallbackRevenue,
        fallbackTicketsSold
      });
    }

    const finalRevenue = totalRevenue > 0 ? totalRevenue : fallbackRevenue;
    const finalTicketsSold = totalTicketsSold > 0 ? totalTicketsSold : fallbackTicketsSold;

    // Get recent events (last 5)
    const recentEvents = await Event.find({ organizer: organizerId })
      .select('_id title startDate endDate status banner totalTickets ticketsSold')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get upcoming events (next 30 days)
    const upcomingEvents = await Event.find({
      organizer: organizerId,
      status: 'approved',
      startDate: { 
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      }
    })
    .select('_id title startDate endDate banner totalTickets ticketsSold')
    .sort({ startDate: 1 })
    .limit(5);

    // Get artist booking statistics
    const totalBookings = await ArtistBooking.countDocuments({ organizer: organizerId });
    const pendingBookings = await ArtistBooking.countDocuments({ 
      organizer: organizerId,
      'booking.status': 'pending'
    });
    const acceptedBookings = await ArtistBooking.countDocuments({ 
      organizer: organizerId,
      'booking.status': 'accepted'
    });

    // Get recent bookings
    const recentBookings = await ArtistBooking.find({ organizer: organizerId })
      .populate('artist', 'name email phone profilePic')
      .select('_id artist booking.status booking.eventDate booking.venue createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate average rating from organizer ratings
    const organizer = await Organizer.findById(organizerId).select('statistics');
    const averageRating = organizer?.statistics?.averageRating || 0;

    return ApiResponse.success(res, 'Organizer dashboard data retrieved successfully', {
      stats: {
        totalEvents,
        activeEvents,
        pendingEvents,
        completedEvents,
        totalRevenue: finalRevenue,
        totalTicketsSold: finalTicketsSold,
        totalBookings,
        pendingBookings,
        acceptedBookings,
        averageRating
      },
      recentEvents,
      upcomingEvents,
      recentBookings
    });

  } catch (error) {
    console.error('Get organizer dashboard error:', error);
    return ApiResponse.serverError(res, 'Error retrieving dashboard data', error);
  }
};
