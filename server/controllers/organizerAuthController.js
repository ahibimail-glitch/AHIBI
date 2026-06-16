const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const DailyEvent = require('../models/DailyEvent');
const Booking = require('../models/Booking');
const ArtistBooking = require('../models/ArtistBooking');

const COMPLETED_BOOKING_PAYMENT_STATUSES = ['completed', 'free'];

const buildOrganizerScopeFilter = (organizerId, organizerDoc) => {
  const objectId =
    organizerId instanceof mongoose.Types.ObjectId
      ? organizerId
      : new mongoose.Types.ObjectId(organizerId);
  const idCandidates = [organizerId, objectId, String(organizerId)];
  const or = [];

  idCandidates.forEach((id) => {
    or.push({ organizer: id }, { createdBy: id }, { 'organizerInfo.id': id });
  });

  if (organizerDoc?.email) {
    or.push({ 'organizerInfo.email': organizerDoc.email });
  }
  if (organizerDoc?.contactInfo?.email) {
    or.push({ 'organizerInfo.email': organizerDoc.contactInfo.email });
  }
  if (organizerDoc?.name) {
    or.push({ 'organizerInfo.name': organizerDoc.name });
  }
  if (organizerDoc?.companyName) {
    or.push({ 'organizerInfo.name': organizerDoc.companyName });
  }

  return { $or: or };
};

const sumEventModelStats = async (Model, scopeFilter) => {
  const [row] = await Model.aggregate([
    { $match: scopeFilter },
    {
      $addFields: {
        ticketTypesRevenue: {
          $reduce: {
            input: { $ifNull: ['$ticketTypes', []] },
            initialValue: 0,
            in: {
              $add: [
                '$$value',
                {
                  $multiply: [
                    { $ifNull: ['$$this.sold', 0] },
                    { $ifNull: ['$$this.price', 0] },
                  ],
                },
              ],
            },
          },
        },
        ticketTypesSold: {
          $reduce: {
            input: { $ifNull: ['$ticketTypes', []] },
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.sold', 0] }] },
          },
        },
      },
    },
    {
      $addFields: {
        effectiveRevenue: {
          $max: [
            { $ifNull: ['$totalRevenue', 0] },
            { $ifNull: ['$ticketTypesRevenue', 0] },
          ],
        },
        effectiveTicketsSold: {
          $max: [
            { $ifNull: ['$ticketsSold', 0] },
            { $ifNull: ['$ticketTypesSold', 0] },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$effectiveRevenue' },
        totalTicketsSold: { $sum: '$effectiveTicketsSold' },
        eventCount: { $sum: 1 },
      },
    },
  ]);

  return {
    totalRevenue: row?.totalRevenue || 0,
    totalTicketsSold: row?.totalTicketsSold || 0,
    eventCount: row?.eventCount || 0,
  };
};

const sumOrganizerBookingStats = async (organizerId, organizerDoc) => {
  const organizerObjectId = new mongoose.Types.ObjectId(organizerId);
  const organizerIdStr = String(organizerId);
  const ownershipOr = [
    { 'ownerDoc.organizer': organizerObjectId },
    { 'ownerDoc.createdBy': organizerObjectId },
    { 'ownerDoc.organizerInfo.id': organizerObjectId },
    { $expr: { $eq: [{ $toString: '$ownerDoc.organizer' }, organizerIdStr] } },
    { $expr: { $eq: [{ $toString: '$ownerDoc.createdBy' }, organizerIdStr] } },
    { $expr: { $eq: [{ $toString: '$ownerDoc.organizerInfo.id' }, organizerIdStr] } },
  ];

  if (organizerDoc?.email) {
    ownershipOr.push({ 'ownerDoc.organizerInfo.email': organizerDoc.email });
  }
  if (organizerDoc?.name) {
    ownershipOr.push({ 'ownerDoc.organizerInfo.name': organizerDoc.name });
  }

  const [row] = await Booking.aggregate([
    {
      $match: {
        $or: [
          { paymentStatus: { $in: COMPLETED_BOOKING_PAYMENT_STATUSES } },
          { status: 'confirmed' },
        ],
      },
    },
    {
      $lookup: {
        from: 'events',
        localField: 'event',
        foreignField: '_id',
        as: 'eventDoc',
      },
    },
    {
      $lookup: {
        from: 'dailyevents',
        localField: 'dailyEvent',
        foreignField: '_id',
        as: 'dailyDoc',
      },
    },
    {
      $addFields: {
        ownerDoc: {
          $cond: [
            { $eq: ['$isDailyEvent', true] },
            { $arrayElemAt: ['$dailyDoc', 0] },
            { $arrayElemAt: ['$eventDoc', 0] },
          ],
        },
      },
    },
    {
      $match: {
        ownerDoc: { $ne: null },
        $or: ownershipOr,
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalTicketsSold: { $sum: '$quantity' },
      },
    },
  ]);

  return {
    totalRevenue: row?.totalRevenue || 0,
    totalTicketsSold: row?.totalTicketsSold || 0,
  };
};
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
      const organizer_with_pw = await Organizer.findOne({ phone }).select('+passwordHash');
      const token = organizer.getSignedJwtToken();

      // Respond with token and user data
      return ApiResponse.success(res, 'OTP verified successfully. Login successful.', {
        token,
        hasPassword: organizer_with_pw ? organizer_with_pw.hasPasswordAuth() : false,
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
        const { password, mode: _mode, confirmPassword: _confirmPassword, agreeToTerms: _agreeToTerms, ...organizerData } = stored.data || {};

        // Create organizer account from stored data
        const organizer = await Organizer.create(organizerData);

        if (password && password.length >= 6) {
          const salt = await bcrypt.genSalt(10);
          organizer.passwordHash = await bcrypt.hash(password, salt);
          await organizer.save({ validateBeforeSave: false });
        }

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
 * @desc    Set or update organizer password (requires JWT auth)
 * @route   POST /api/organizer/auth/setup-password
 * @access  Private (Organizer)
 */
exports.setupPassword = async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    return ApiResponse.badRequest(res, 'Password must be at least 6 characters');
  }

  try {
    const organizer = await Organizer.findById(req.user._id);
    if (!organizer) {
      return ApiResponse.notFound(res, 'Organizer not found');
    }

    const salt = await bcrypt.genSalt(10);
    organizer.passwordHash = await bcrypt.hash(password, salt);
    await organizer.save({ validateBeforeSave: false });

    return ApiResponse.success(res, 'Password set successfully');
  } catch (error) {
    console.error('Setup organizer password error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Check if organizer exists and whether they have a password set
 * @route   POST /api/organizer/auth/check-organizer
 * @access  Public
 */
exports.checkOrganizerExists = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone } = req.body;

  try {
    const organizer = await Organizer.findOne({ phone }).select('+passwordHash');

    if (!organizer) {
      return ApiResponse.notFound(res, 'Organizer not found. Please sign up first.');
    }

    return ApiResponse.success(res, 'Organizer found', {
      exists: true,
      hasPassword: organizer.hasPasswordAuth()
    });
  } catch (error) {
    console.error('Check organizer exists error:', error);
    return ApiResponse.serverError(res, 'Server error', error);
  }
};

/**
 * @desc    Login organizer with password
 * @route   POST /api/organizer/auth/login
 * @access  Public
 */
exports.loginWithPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, password } = req.body;

  try {
    const organizer = await Organizer.findOne({ phone }).select('+passwordHash');

    if (!organizer) {
      return ApiResponse.notFound(res, 'Organizer not found. Please sign up first.');
    }

    if (!organizer.hasPasswordAuth()) {
      return res.status(400).json({
        success: false,
        message: 'Password not set for this account. Please use OTP login.',
        requiresOtp: true
      });
    }

    const isPasswordValid = await organizer.matchPasswordHash(password);
    if (!isPasswordValid) {
      return ApiResponse.badRequest(res, 'Invalid password');
    }

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

    const token = organizer.getSignedJwtToken();

    return ApiResponse.success(res, 'Login successful', {
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
  } catch (error) {
    console.error('Organizer password login error:', error);
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
    const organizerDoc = await Organizer.findById(organizerId)
      .select('statistics email name companyName contactInfo totalPaidOut pendingPayouts')
      .lean();
    const scopeFilter = buildOrganizerScopeFilter(organizerId, organizerDoc);
    const now = new Date();

    const [
      regularDocStats,
      dailyDocStats,
      bookingStats,
      activeRegularEvents,
      activeDailyEvents,
      pendingRegularEvents,
      pendingDailyEvents,
      completedRegularEvents,
      completedDailyEvents,
    ] = await Promise.all([
      sumEventModelStats(Event, scopeFilter),
      sumEventModelStats(DailyEvent, scopeFilter),
      sumOrganizerBookingStats(organizerId, organizerDoc),
      Event.countDocuments({ ...scopeFilter, status: 'approved', endDate: { $gte: now } }),
      DailyEvent.countDocuments({ ...scopeFilter, status: 'approved' }),
      Event.countDocuments({ ...scopeFilter, status: 'pending' }),
      DailyEvent.countDocuments({ ...scopeFilter, status: 'pending' }),
      Event.countDocuments({ ...scopeFilter, status: 'approved', endDate: { $lt: now } }),
      DailyEvent.countDocuments({ ...scopeFilter, status: 'completed' }),
    ]);

    const totalEvents = regularDocStats.eventCount + dailyDocStats.eventCount;
    const activeEvents = activeRegularEvents + activeDailyEvents;
    const pendingEvents = pendingRegularEvents + pendingDailyEvents;
    const completedEvents = completedRegularEvents + completedDailyEvents;

    const eventDocumentRevenue =
      regularDocStats.totalRevenue + dailyDocStats.totalRevenue;
    const eventDocumentTickets =
      regularDocStats.totalTicketsSold + dailyDocStats.totalTicketsSold;

    // Event documents track cumulative sales; booking rows can be partial (per-ticket docs)
    const liveRevenue = Math.max(eventDocumentRevenue, bookingStats.totalRevenue);
    const liveTicketsSold = Math.max(
      eventDocumentTickets,
      bookingStats.totalTicketsSold
    );
    const ticketSalesRevenue = liveRevenue;
    const totalTicketsSold = liveTicketsSold;
    const totalPaidOut = Number(organizerDoc?.totalPaidOut) || 0;
    const pendingPayouts = Number(organizerDoc?.pendingPayouts) || 0;
    // Lifetime payouts from organizer profile; falls back to current ticket sales
    const totalRevenue = totalPaidOut > 0 ? totalPaidOut : ticketSalesRevenue;

    const getTotalTicketsForEvent = (event) =>
      (event.ticketTypes || []).reduce((sum, ticket) => sum + (ticket.quantity || 0), 0);

    const attachBookingStatsToEvents = async (events) => {
      if (!events.length) return [];

      const ids = events.map((e) => e._id);
      const perEventStats = await Booking.aggregate([
        {
          $match: {
            event: { $in: ids },
            paymentStatus: { $in: COMPLETED_BOOKING_PAYMENT_STATUSES },
          },
        },
        {
          $group: {
            _id: '$event',
            ticketsSold: { $sum: '$quantity' },
            totalRevenue: { $sum: '$total' },
          },
        },
      ]);

      const statsByEventId = new Map(
        perEventStats.map((row) => [row._id.toString(), row])
      );

      return events.map((event) => {
        const stats = statsByEventId.get(event._id.toString());
        return {
          _id: event._id,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status,
          banner: event.banner,
          totalTickets: getTotalTicketsForEvent(event),
          ticketsSold: Math.max(stats?.ticketsSold || 0, event.ticketsSold || 0),
          totalRevenue: Math.max(stats?.totalRevenue || 0, event.totalRevenue || 0),
        };
      });
    };

    // Recent events (last 5 regular) with live booking stats
    const recentEventsRaw = await Event.find(scopeFilter)
      .select('_id title startDate endDate status banner ticketTypes ticketsSold totalRevenue')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    const recentEvents = await attachBookingStatsToEvents(recentEventsRaw);

    // Upcoming events (next 30 days) with live booking stats
    const upcomingEventsRaw = await Event.find({
      ...scopeFilter,
      status: 'approved',
      startDate: {
        $gte: now,
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
      .select('_id title startDate endDate status banner ticketTypes ticketsSold totalRevenue')
      .sort({ startDate: 1 })
      .limit(5)
      .lean();
    const upcomingEvents = await attachBookingStatsToEvents(upcomingEventsRaw);

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

    // Get recent artist bookings (event date/venue live on event subdocument)
    const recentBookingsRaw = await ArtistBooking.find({ organizer: organizerId })
      .populate('artist', 'name email phone profilePic')
      .select('_id artist event booking.status createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentBookings = recentBookingsRaw.map((row) => ({
      _id: row._id,
      artist: row.artist,
      createdAt: row.createdAt,
      booking: {
        status: row.booking?.status,
        eventDate: row.event?.date,
        venue:
          row.event?.venue?.name ||
          row.event?.venue?.address ||
          '',
      },
    }));

    const averageRating = organizerDoc?.statistics?.averageRating || 0;

    return ApiResponse.success(res, 'Organizer dashboard data retrieved successfully', {
      stats: {
        totalEvents,
        activeEvents,
        pendingEvents,
        completedEvents,
        totalRevenue,
        ticketSalesRevenue,
        totalPaidOut,
        pendingPayouts,
        totalTicketsSold,
        totalBookings,
        pendingBookings,
        acceptedBookings,
        averageRating,
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
