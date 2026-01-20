const mongoose = require('mongoose');
const ArenaPartner = require('../models/ArenaPartner');
const SportsVenue = require('../models/SportsVenue');
const Court = require('../models/Court');
const TimeSlot = require('../models/TimeSlot');
const SportsBooking = require('../models/SportsBooking');
const Payout = require('../models/Payout');
const ApiResponse = require('../utils/apiResponse');

// ============ VENUE MANAGEMENT ============

/**
 * @desc    Create new sports venue
 * @route   POST /api/arena-partner/venues
 * @access  Private (Arena Partner)
 */
exports.createVenue = async (req, res) => {
  try {
    const partner = await ArenaPartner.findById(req.user.id);

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    if (partner.approvalStatus !== 'approved') {
      return ApiResponse.forbidden(res, 'Your account must be approved before creating venues');
    }

    const venueData = {
      ...req.body,
      arenaPartner: req.user.id,
      approvalStatus: 'pending'
    };

    const venue = await SportsVenue.create(venueData);

    partner.statistics.totalVenues += 1;
    await partner.save();

    return ApiResponse.success(res, 'Venue created successfully. Pending admin approval.', { venue });

  } catch (error) {
    console.error('Create venue error:', error);
    return ApiResponse.serverError(res, 'Error creating venue', error);
  }
};

/**
 * @desc    Get all venues for arena partner
 * @route   GET /api/arena-partner/venues
 * @access  Private (Arena Partner)
 */
exports.getMyVenues = async (req, res) => {
  try {
    const { status } = req.query;

    let query = { arenaPartner: req.user.id };

    if (status) {
      query.approvalStatus = status;
    }

    const venues = await SportsVenue.find(query)
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Venues retrieved successfully', {
      venues,
      count: venues.length
    });

  } catch (error) {
    console.error('Get venues error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venues', error);
  }
};

/**
 * @desc    Get venue by ID
 * @route   GET /api/arena-partner/venues/:id
 * @access  Private (Arena Partner)
 */
exports.getVenueById = async (req, res) => {
  try {
    const venue = await SportsVenue.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    });

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    return ApiResponse.success(res, 'Venue retrieved successfully', { venue });

  } catch (error) {
    console.error('Get venue error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venue', error);
  }
};

/**
 * @desc    Update venue
 * @route   PUT /api/arena-partner/venues/:id
 * @access  Private (Arena Partner)
 */
exports.updateVenue = async (req, res) => {
  try {
    const venue = await SportsVenue.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    });

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const allowedFields = [
      'venueName', 'description', 'tagline', 'sportsSupported',
      'address', 'location', 'googleMapsLink', 'contactInfo',
      'operatingHours', 'facilities', 'equipmentRental',
      'coachingAvailable', 'coaches', 'gallery', 'rules',
      'paymentSettings'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        venue[field] = req.body[field];
        // Ensure Mongoose tracks deep changes for nested structures
        if (field === 'gallery') {
          venue.markModified('gallery');
        }
        if (field === 'facilities') {
          venue.markModified('facilities');
        }
        if (field === 'operatingHours') {
          venue.markModified('operatingHours');
        }
        if (field === 'paymentSettings') {
          venue.markModified('paymentSettings');
        }
      }
    });

    await venue.save();

    return ApiResponse.success(res, 'Venue updated successfully', { venue });

  } catch (error) {
    console.error('Update venue error:', error);
    return ApiResponse.serverError(res, 'Error updating venue', error);
  }
};

/**
 * @desc    Delete venue
 * @route   DELETE /api/arena-partner/venues/:id
 * @access  Private (Arena Partner)
 */
exports.deleteVenue = async (req, res) => {
  try {
    const venue = await SportsVenue.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    });

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    // Check for active bookings
    const activeBookings = await SportsBooking.countDocuments({
      venue: venue._id,
      status: { $in: ['confirmed', 'checked_in'] },
      bookingDate: { $gte: new Date() }
    });

    if (activeBookings > 0) {
      return ApiResponse.badRequest(res, 'Cannot delete venue with active bookings');
    }

    await SportsVenue.deleteOne({ _id: venue._id });

    const partner = await ArenaPartner.findById(req.user.id);
    if (partner.statistics.totalVenues > 0) {
      partner.statistics.totalVenues -= 1;
      await partner.save();
    }

    return ApiResponse.success(res, 'Venue deleted successfully');

  } catch (error) {
    console.error('Delete venue error:', error);
    return ApiResponse.serverError(res, 'Error deleting venue', error);
  }
};

// ============ COURT MANAGEMENT ============

/**
 * @desc    Create new court
 * @route   POST /api/arena-partner/venues/:venueId/courts
 * @access  Private (Arena Partner)
 */
exports.createCourt = async (req, res) => {
  try {
    const venue = await SportsVenue.findOne({
      _id: req.params.venueId,
      arenaPartner: req.user.id
    });

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const courtData = {
      ...req.body,
      venue: venue._id,
      arenaPartner: req.user.id
    };

    const court = await Court.create(courtData);

    venue.statistics.totalCourts += 1;
    await venue.save();

    return ApiResponse.success(res, 'Court created successfully', { court });

  } catch (error) {
    console.error('Create court error:', error);
    return ApiResponse.serverError(res, 'Error creating court', error);
  }
};

/**
 * @desc    Get all courts for a venue
 * @route   GET /api/arena-partner/venues/:venueId/courts
 * @access  Private (Arena Partner)
 */
exports.getCourts = async (req, res) => {
  try {
    const venue = await SportsVenue.findOne({
      _id: req.params.venueId,
      arenaPartner: req.user.id
    });

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    const courts = await Court.find({ venue: venue._id })
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Courts retrieved successfully', {
      courts,
      count: courts.length
    });

  } catch (error) {
    console.error('Get courts error:', error);
    return ApiResponse.serverError(res, 'Error retrieving courts', error);
  }
};

/**
 * @desc    Get court by ID
 * @route   GET /api/arena-partner/courts/:id
 * @access  Private (Arena Partner)
 */
exports.getCourtById = async (req, res) => {
  try {
    const court = await Court.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    }).populate('venue', 'venueName address');

    if (!court) {
      return ApiResponse.notFound(res, 'Court not found');
    }

    return ApiResponse.success(res, 'Court retrieved successfully', { court });

  } catch (error) {
    console.error('Get court error:', error);
    return ApiResponse.serverError(res, 'Error retrieving court', error);
  }
};

/**
 * @desc    Update court
 * @route   PUT /api/arena-partner/courts/:id
 * @access  Private (Arena Partner)
 */
exports.updateCourt = async (req, res) => {
  try {
    const court = await Court.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    });

    if (!court) {
      return ApiResponse.notFound(res, 'Court not found');
    }

    const allowedFields = [
      'courtName', 'courtNumber', 'sportType', 'specifications',
      'capacity', 'pricing', 'specialPricing', 'availability',
      'features', 'images', 'status'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        court[field] = req.body[field];
      }
    });

    await court.save();

    return ApiResponse.success(res, 'Court updated successfully', { court });

  } catch (error) {
    console.error('Update court error:', error);
    return ApiResponse.serverError(res, 'Error updating court', error);
  }
};

/**
 * @desc    Delete court
 * @route   DELETE /api/arena-partner/courts/:id
 * @access  Private (Arena Partner)
 */
exports.deleteCourt = async (req, res) => {
  try {
    const court = await Court.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    });

    if (!court) {
      return ApiResponse.notFound(res, 'Court not found');
    }

    // Check for active bookings
    const activeBookings = await SportsBooking.countDocuments({
      court: court._id,
      status: { $in: ['confirmed', 'checked_in'] },
      bookingDate: { $gte: new Date() }
    });

    if (activeBookings > 0) {
      return ApiResponse.badRequest(res, 'Cannot delete court with active bookings');
    }

    const venueId = court.venue;
    await Court.deleteOne({ _id: court._id });

    const venue = await SportsVenue.findById(venueId);
    if (venue && venue.statistics.totalCourts > 0) {
      venue.statistics.totalCourts -= 1;
      await venue.save();
    }

    return ApiResponse.success(res, 'Court deleted successfully');

  } catch (error) {
    console.error('Delete court error:', error);
    return ApiResponse.serverError(res, 'Error deleting court', error);
  }
};

/**
 * @desc    Add blackout dates to court
 * @route   POST /api/arena-partner/courts/:id/blackout
 * @access  Private (Arena Partner)
 */
exports.addBlackoutDates = async (req, res) => {
  try {
    const court = await Court.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    });

    if (!court) {
      return ApiResponse.notFound(res, 'Court not found');
    }

    const { startDate, endDate, reason, notes } = req.body;

    if (!startDate || !endDate || !reason) {
      return ApiResponse.badRequest(res, 'Start date, end date, and reason are required');
    }

    court.blackoutDates.push({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      notes
    });

    await court.save();

    return ApiResponse.success(res, 'Blackout dates added successfully', {
      blackoutDates: court.blackoutDates
    });

  } catch (error) {
    console.error('Add blackout error:', error);
    return ApiResponse.serverError(res, 'Error adding blackout dates', error);
  }
};

/**
 * @desc    Remove blackout dates from court
 * @route   DELETE /api/arena-partner/courts/:id/blackout/:blackoutId
 * @access  Private (Arena Partner)
 */
exports.removeBlackoutDates = async (req, res) => {
  try {
    const court = await Court.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    });

    if (!court) {
      return ApiResponse.notFound(res, 'Court not found');
    }

    court.blackoutDates = court.blackoutDates.filter(
      blackout => blackout._id.toString() !== req.params.blackoutId
    );

    await court.save();

    return ApiResponse.success(res, 'Blackout dates removed successfully', {
      blackoutDates: court.blackoutDates
    });

  } catch (error) {
    console.error('Remove blackout error:', error);
    return ApiResponse.serverError(res, 'Error removing blackout dates', error);
  }
};

// ============ BOOKING MANAGEMENT ============

/**
 * @desc    Get all bookings for arena partner
 * @route   GET /api/arena-partner/bookings
 * @access  Private (Arena Partner)
 */
exports.getBookings = async (req, res) => {
  try {
    const { status, venueId, courtId, startDate, endDate } = req.query;

    let query = { arenaPartner: req.user.id };

    if (status) {
      query.status = status;
    }

    if (venueId) {
      query.venue = venueId;
    }

    if (courtId) {
      query.court = courtId;
    }

    if (startDate && endDate) {
      query.bookingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bookings = await SportsBooking.find(query)
      .populate('user', 'name email phone')
      .populate('venue', 'venueName address')
      .populate('court', 'courtName sportType')
      .sort({ bookingDate: -1, startTime: -1 });

    return ApiResponse.success(res, 'Bookings retrieved successfully', {
      bookings,
      count: bookings.length
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    return ApiResponse.serverError(res, 'Error retrieving bookings', error);
  }
};

/**
 * @desc    Get booking by ID
 * @route   GET /api/arena-partner/bookings/:id
 * @access  Private (Arena Partner)
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await SportsBooking.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    })
      .populate('user', 'name email phone')
      .populate('venue', 'venueName address contactInfo')
      .populate('court', 'courtName sportType specifications')
      .populate('slots');

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    return ApiResponse.success(res, 'Booking retrieved successfully', { booking });

  } catch (error) {
    console.error('Get booking error:', error);
    return ApiResponse.serverError(res, 'Error retrieving booking', error);
  }
};

/**
 * @desc    Check-in booking
 * @route   POST /api/arena-partner/bookings/:id/check-in
 * @access  Private (Arena Partner)
 */
exports.checkInBooking = async (req, res) => {
  try {
    const booking = await SportsBooking.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    if (booking.status !== 'confirmed') {
      return ApiResponse.badRequest(res, 'Only confirmed bookings can be checked in');
    }

    if (booking.checkIn.checkedIn) {
      return ApiResponse.badRequest(res, 'Booking is already checked in');
    }

    booking.checkIn.checkedIn = true;
    booking.checkIn.checkedInAt = Date.now();
    booking.checkIn.checkedInBy = req.user.id;
    booking.status = 'checked_in';

    await booking.save();

    return ApiResponse.success(res, 'Booking checked in successfully', { booking });

  } catch (error) {
    console.error('Check-in error:', error);
    return ApiResponse.serverError(res, 'Error checking in booking', error);
  }
};

/**
 * @desc    Complete booking
 * @route   POST /api/arena-partner/bookings/:id/complete
 * @access  Private (Arena Partner)
 */
exports.completeBooking = async (req, res) => {
  try {
    const booking = await SportsBooking.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    if (booking.status !== 'checked_in') {
      return ApiResponse.badRequest(res, 'Only checked-in bookings can be completed');
    }

    booking.checkOut.checkedOut = true;
    booking.checkOut.checkedOutAt = Date.now();
    booking.status = 'completed';
    booking.completedAt = Date.now();

    await booking.save();

    return ApiResponse.success(res, 'Booking completed successfully', { booking });

  } catch (error) {
    console.error('Complete booking error:', error);
    return ApiResponse.serverError(res, 'Error completing booking', error);
  }
};

/**
 * @desc    Create walk-in booking
 * @route   POST /api/arena-partner/bookings/walk-in
 * @access  Private (Arena Partner)
 */
exports.createWalkInBooking = async (req, res) => {
  try {
    const {
      venueId,
      courtId,
      bookingDate,
      startTime,
      endTime,
      numberOfPlayers,
      contactDetails,
      paymentMethod
    } = req.body;

    const court = await Court.findOne({
      _id: courtId,
      arenaPartner: req.user.id
    }).populate('venue');

    if (!court) {
      return ApiResponse.notFound(res, 'Court not found');
    }

    // Check availability
    const isAvailable = await SportsBooking.checkAvailability(
      courtId,
      bookingDate,
      startTime,
      endTime
    );

    if (!isAvailable) {
      return ApiResponse.badRequest(res, 'Court is not available for the selected time');
    }

    // Calculate pricing
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    const duration = (end - start) / (1000 * 60);

    const pricePerHour = court.getPricing(bookingDate, startTime);
    const baseAmount = Math.round((pricePerHour * duration) / 60);

    const partner = await ArenaPartner.findById(req.user.id);
    const commissionRate = partner.commissionSettings.commissionRate;
    const platformCommission = Math.round((baseAmount * commissionRate) / 100);
    const arenaEarnings = baseAmount - platformCommission;

    // Create booking
    const booking = await SportsBooking.create({
      user: null, // Walk-in booking
      venue: venueId,
      court: courtId,
      arenaPartner: req.user.id,
      bookingDate: new Date(bookingDate),
      startTime,
      endTime,
      duration,
      numberOfPlayers,
      contactDetails,
      pricing: {
        baseAmount,
        totalAmount: baseAmount,
        platformCommission,
        arenaEarnings
      },
      payment: {
        paymentMethod,
        paymentStatus: 'completed',
        paidAt: Date.now()
      },
      status: 'confirmed',
      confirmedAt: Date.now()
    });

    return ApiResponse.success(res, 'Walk-in booking created successfully', { booking });

  } catch (error) {
    console.error('Create walk-in booking error:', error);
    return ApiResponse.serverError(res, 'Error creating walk-in booking', error);
  }
};

// ============ DASHBOARD & ANALYTICS ============

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/arena-partner/dashboard/stats
 * @access  Private (Arena Partner)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const partnerId = req.user.id;

    // Get partner details for advance payment percentage
    const partner = await ArenaPartner.findById(partnerId);
    const advancePaymentPercent = partner?.paymentSettings?.advancePaymentPercent || 10;

    // Total venues
    const totalVenues = await SportsVenue.countDocuments({
      arenaPartner: partnerId,
      approvalStatus: 'approved'
    });

    // Total courts
    const totalCourts = await Court.countDocuments({
      arenaPartner: partnerId,
      status: 'active'
    });

    // Today's bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = await SportsBooking.countDocuments({
      arenaPartner: partnerId,
      bookingDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'checked_in'] }
    });

    // This month's revenue
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthlyRevenue = await SportsBooking.aggregate([
      {
        $match: {
          arenaPartner: new mongoose.Types.ObjectId(partnerId),
          status: { $in: ['completed', 'confirmed'] },
          'payment.paymentStatus': 'completed',
          bookingDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' },
          arenaEarnings: { $sum: '$pricing.arenaEarnings' }
        }
      }
    ]);

    const revenue = monthlyRevenue.length > 0 ? monthlyRevenue[0] : { totalRevenue: 0, arenaEarnings: 0 };

    // Upcoming bookings
    const upcomingBookings = await SportsBooking.find({
      arenaPartner: partnerId,
      status: { $in: ['confirmed', 'checked_in'] },
      bookingDate: { $gte: today }
    })
      .populate('user', 'name phone')
      .populate('venue', 'venueName')
      .populate('court', 'courtName sportType')
      .sort({ bookingDate: 1, startTime: 1 })
      .limit(10);

    return ApiResponse.success(res, 'Dashboard stats retrieved successfully', {
      stats: {
        totalVenues,
        totalCourts,
        todayBookings,
        monthlyRevenue: revenue.totalRevenue,
        monthlyEarnings: revenue.arenaEarnings,
        advancePaymentPercent
      },
      upcomingBookings
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return ApiResponse.serverError(res, 'Error retrieving dashboard stats', error);
  }
};

/**
 * @desc    Get revenue analytics
 * @route   GET /api/arena-partner/analytics/revenue
 * @access  Private (Arena Partner)
 */
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, venueId } = req.query;

    const matchQuery = {
      arenaPartner: new mongoose.Types.ObjectId(req.user.id),
      status: { $in: ['completed', 'confirmed'] },
      'payment.paymentStatus': 'completed'
    };

    if (startDate && endDate) {
      matchQuery.bookingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (venueId) {
      matchQuery.venue = new mongoose.Types.ObjectId(venueId);
    }

    const revenueByDate = await SportsBooking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$bookingDate' } },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          arenaEarnings: { $sum: '$pricing.arenaEarnings' },
          platformCommission: { $sum: '$pricing.platformCommission' },
          bookingCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const revenueByVenue = await SportsBooking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$venue',
          totalRevenue: { $sum: '$pricing.totalAmount' },
          arenaEarnings: { $sum: '$pricing.arenaEarnings' },
          bookingCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'sportsvenues',
          localField: '_id',
          foreignField: '_id',
          as: 'venueDetails'
        }
      },
      { $unwind: '$venueDetails' },
      {
        $project: {
          venueName: '$venueDetails.venueName',
          totalRevenue: 1,
          arenaEarnings: 1,
          bookingCount: 1
        }
      }
    ]);

    return ApiResponse.success(res, 'Revenue analytics retrieved successfully', {
      revenueByDate,
      revenueByVenue
    });

  } catch (error) {
    console.error('Get revenue analytics error:', error);
    return ApiResponse.serverError(res, 'Error retrieving revenue analytics', error);
  }
};

// ============ PAYOUT MANAGEMENT ============

/**
 * @desc    Get payout history
 * @route   GET /api/arena-partner/payouts
 * @access  Private (Arena Partner)
 */
exports.getPayouts = async (req, res) => {
  try {
    const { status } = req.query;

    let query = { arenaPartner: req.user.id };

    if (status) {
      query.status = status;
    }

    const payouts = await Payout.find(query)
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Payouts retrieved successfully', {
      payouts,
      count: payouts.length
    });

  } catch (error) {
    console.error('Get payouts error:', error);
    return ApiResponse.serverError(res, 'Error retrieving payouts', error);
  }
};

/**
 * @desc    Get payout by ID
 * @route   GET /api/arena-partner/payouts/:id
 * @access  Private (Arena Partner)
 */
exports.getPayoutById = async (req, res) => {
  try {
    const payout = await Payout.findOne({
      _id: req.params.id,
      arenaPartner: req.user.id
    }).populate('bookings');

    if (!payout) {
      return ApiResponse.notFound(res, 'Payout not found');
    }

    return ApiResponse.success(res, 'Payout retrieved successfully', { payout });

  } catch (error) {
    console.error('Get payout error:', error);
    return ApiResponse.serverError(res, 'Error retrieving payout', error);
  }
};

module.exports = exports;
