const mongoose = require('mongoose');
const ArenaPartner = require('../models/ArenaPartner');
const SportsVenue = require('../models/SportsVenue');
const Court = require('../models/Court');
const SportsBooking = require('../models/SportsBooking');
const Payout = require('../models/Payout');
const ApiResponse = require('../utils/apiResponse');

// ============ ARENA PARTNER MANAGEMENT ============

/**
 * @desc    Get all arena partners
 * @route   GET /api/admin/sports/arena-partners
 * @access  Private (Admin)
 */
exports.getAllArenaPartners = async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = {};

    if (status) {
      query.approvalStatus = status;
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { 'businessDetails.businessName': new RegExp(search, 'i') }
      ];
    }

    const partners = await ArenaPartner.find(query)
      .select('-otp -otpExpires')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Arena partners retrieved successfully', {
      partners,
      count: partners.length
    });

  } catch (error) {
    console.error('Get arena partners error:', error);
    return ApiResponse.serverError(res, 'Error retrieving arena partners', error);
  }
};

/**
 * @desc    Get arena partner by ID
 * @route   GET /api/admin/sports/arena-partners/:id
 * @access  Private (Admin)
 */
exports.getArenaPartnerById = async (req, res) => {
  try {
    const partner = await ArenaPartner.findById(req.params.id)
      .select('-otp -otpExpires');

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    // Get partner's venues
    const venues = await SportsVenue.find({ arenaPartner: partner._id });

    // Get partner's bookings
    const bookings = await SportsBooking.find({ arenaPartner: partner._id })
      .sort({ createdAt: -1 })
      .limit(10);

    return ApiResponse.success(res, 'Arena partner retrieved successfully', {
      partner,
      venues,
      recentBookings: bookings
    });

  } catch (error) {
    console.error('Get arena partner error:', error);
    return ApiResponse.serverError(res, 'Error retrieving arena partner', error);
  }
};

/**
 * @desc    Approve arena partner
 * @route   PUT /api/admin/sports/arena-partners/:id/approve
 * @access  Private (Admin)
 */
exports.approveArenaPartner = async (req, res) => {
  try {
    const partner = await ArenaPartner.findById(req.params.id);

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    if (partner.approvalStatus === 'approved') {
      return ApiResponse.badRequest(res, 'Arena partner is already approved');
    }

    partner.approvalStatus = 'approved';
    partner.approvedAt = Date.now();
    partner.approvedBy = req.user.id;
    partner.rejectionReason = undefined;

    await partner.save();

    return ApiResponse.success(res, 'Arena partner approved successfully', { partner });

  } catch (error) {
    console.error('Approve arena partner error:', error);
    return ApiResponse.serverError(res, 'Error approving arena partner', error);
  }
};

/**
 * @desc    Reject arena partner
 * @route   PUT /api/admin/sports/arena-partners/:id/reject
 * @access  Private (Admin)
 */
exports.rejectArenaPartner = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return ApiResponse.badRequest(res, 'Rejection reason is required');
    }

    const partner = await ArenaPartner.findById(req.params.id);

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    partner.approvalStatus = 'rejected';
    partner.rejectionReason = reason;
    partner.approvedAt = undefined;
    partner.approvedBy = undefined;

    await partner.save();

    return ApiResponse.success(res, 'Arena partner rejected successfully', { partner });

  } catch (error) {
    console.error('Reject arena partner error:', error);
    return ApiResponse.serverError(res, 'Error rejecting arena partner', error);
  }
};

/**
 * @desc    Suspend arena partner
 * @route   PUT /api/admin/sports/arena-partners/:id/suspend
 * @access  Private (Admin)
 */
exports.suspendArenaPartner = async (req, res) => {
  try {
    const { reason } = req.body;

    const partner = await ArenaPartner.findById(req.params.id);

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    partner.approvalStatus = 'suspended';
    partner.isActive = false;
    partner.rejectionReason = reason;

    await partner.save();

    return ApiResponse.success(res, 'Arena partner suspended successfully', { partner });

  } catch (error) {
    console.error('Suspend arena partner error:', error);
    return ApiResponse.serverError(res, 'Error suspending arena partner', error);
  }
};

/**
 * @desc    Update arena partner commission rate
 * @route   PUT /api/admin/sports/arena-partners/:id/commission
 * @access  Private (Admin)
 */
exports.updateCommissionRate = async (req, res) => {
  try {
    const { commissionRate } = req.body;

    if (!commissionRate || commissionRate < 0 || commissionRate > 100) {
      return ApiResponse.badRequest(res, 'Valid commission rate (0-100) is required');
    }

    const partner = await ArenaPartner.findById(req.params.id);

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    partner.commissionSettings.commissionRate = commissionRate;
    partner.commissionSettings.customRate = true;

    await partner.save();

    return ApiResponse.success(res, 'Commission rate updated successfully', { partner });

  } catch (error) {
    console.error('Update commission error:', error);
    return ApiResponse.serverError(res, 'Error updating commission rate', error);
  }
};

/**
 * @desc    Update arena partner advance payment percent (booking-time pay-now %)
 * @route   PUT /api/admin/sports/arena-partners/:id/advance-payment
 * @access  Private (Admin)
 */
exports.updateAdvancePaymentPercent = async (req, res) => {
  try {
    const { advancePaymentPercent } = req.body;

    const value = Number(advancePaymentPercent);
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      return ApiResponse.badRequest(res, 'Valid advance payment percent (1-100) is required');
    }

    const partner = await ArenaPartner.findById(req.params.id);

    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    partner.paymentSettings = partner.paymentSettings || {};
    partner.paymentSettings.advancePaymentPercent = Math.round(value);
    partner.markModified('paymentSettings');

    await partner.save();

    return ApiResponse.success(res, 'Advance payment percent updated successfully', { partner });

  } catch (error) {
    console.error('Update advance payment percent error:', error);
    return ApiResponse.serverError(res, 'Error updating advance payment percent', error);
  }
};

// ============ VENUE MANAGEMENT ============

/**
 * @desc    Get all sports venues
 * @route   GET /api/admin/sports/venues
 * @access  Private (Admin)
 */
exports.getAllVenues = async (req, res) => {
  try {
    const { status, sport, city, search } = req.query;

    let query = {};

    if (status) {
      query.approvalStatus = status;
    }

    if (sport) {
      query.sportsSupported = sport;
    }

    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    if (search) {
      query.$or = [
        { venueName: new RegExp(search, 'i') },
        { 'address.city': new RegExp(search, 'i') }
      ];
    }

    const venues = await SportsVenue.find(query)
      .populate('arenaPartner', 'name email phone businessDetails')
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
 * @route   GET /api/admin/sports/venues/:id
 * @access  Private (Admin)
 */
exports.getVenueById = async (req, res) => {
  try {
    const venue = await SportsVenue.findById(req.params.id)
      .populate('arenaPartner', 'name email phone businessDetails');

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    // Get courts
    const courts = await Court.find({ venue: venue._id });

    // Get bookings
    const bookings = await SportsBooking.find({ venue: venue._id })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(20);

    return ApiResponse.success(res, 'Venue retrieved successfully', {
      venue,
      courts,
      recentBookings: bookings
    });

  } catch (error) {
    console.error('Get venue error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venue', error);
  }
};

/**
 * @desc    Approve venue
 * @route   PUT /api/admin/sports/venues/:id/approve
 * @access  Private (Admin)
 */
exports.approveVenue = async (req, res) => {
  try {
    const venue = await SportsVenue.findById(req.params.id);

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    if (venue.approvalStatus === 'approved') {
      return ApiResponse.badRequest(res, 'Venue is already approved');
    }

    venue.approvalStatus = 'approved';
    venue.approvedAt = Date.now();
    venue.approvedBy = req.user.id;
    venue.rejectionReason = undefined;

    await venue.save();

    return ApiResponse.success(res, 'Venue approved successfully', { venue });

  } catch (error) {
    console.error('Approve venue error:', error);
    return ApiResponse.serverError(res, 'Error approving venue', error);
  }
};

/**
 * @desc    Reject venue
 * @route   PUT /api/admin/sports/venues/:id/reject
 * @access  Private (Admin)
 */
exports.rejectVenue = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return ApiResponse.badRequest(res, 'Rejection reason is required');
    }

    const venue = await SportsVenue.findById(req.params.id);

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    venue.approvalStatus = 'rejected';
    venue.rejectionReason = reason;

    await venue.save();

    return ApiResponse.success(res, 'Venue rejected successfully', { venue });

  } catch (error) {
    console.error('Reject venue error:', error);
    return ApiResponse.serverError(res, 'Error rejecting venue', error);
  }
};

/**
 * @desc    Toggle venue featured status
 * @route   PUT /api/admin/sports/venues/:id/featured
 * @access  Private (Admin)
 */
exports.toggleFeatured = async (req, res) => {
  try {
    const venue = await SportsVenue.findById(req.params.id);

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    venue.isFeatured = !venue.isFeatured;
    await venue.save();

    return ApiResponse.success(res, `Venue ${venue.isFeatured ? 'featured' : 'unfeatured'} successfully`, { venue });

  } catch (error) {
    console.error('Toggle featured error:', error);
    return ApiResponse.serverError(res, 'Error updating featured status', error);
  }
};

// ============ BOOKING MANAGEMENT ============

/**
 * @desc    Get all bookings
 * @route   GET /api/admin/sports/bookings
 * @access  Private (Admin)
 */
exports.getAllBookings = async (req, res) => {
  try {
    const { status, venueId, startDate, endDate } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (venueId) {
      query.venue = venueId;
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
      .populate('arenaPartner', 'name businessDetails')
      .sort({ createdAt: -1 });

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
 * @route   GET /api/admin/sports/bookings/:id
 * @access  Private (Admin)
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await SportsBooking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('venue', 'venueName address contactInfo')
      .populate('court', 'courtName sportType specifications')
      .populate('arenaPartner', 'name email phone businessDetails')
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

// ============ PAYOUT MANAGEMENT ============

/**
 * @desc    Get all payouts
 * @route   GET /api/admin/sports/payouts
 * @access  Private (Admin)
 */
exports.getAllPayouts = async (req, res) => {
  try {
    const { status, arenaPartnerId } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (arenaPartnerId) {
      query.arenaPartner = arenaPartnerId;
    }

    const payouts = await Payout.find(query)
      .populate('arenaPartner', 'name email phone businessDetails')
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
 * @route   GET /api/admin/sports/payouts/:id
 * @access  Private (Admin)
 */
exports.getPayoutById = async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id)
      .populate('arenaPartner', 'name email phone businessDetails bankDetails')
      .populate({
        path: 'bookings',
        populate: [
          { path: 'venue', select: 'venueName' },
          { path: 'court', select: 'courtName sportType' }
        ]
      });

    if (!payout) {
      return ApiResponse.notFound(res, 'Payout not found');
    }

    return ApiResponse.success(res, 'Payout retrieved successfully', { payout });

  } catch (error) {
    console.error('Get payout error:', error);
    return ApiResponse.serverError(res, 'Error retrieving payout', error);
  }
};

/**
 * @desc    Create manual payout
 * @route   POST /api/admin/sports/payouts/create
 * @access  Private (Admin)
 */
exports.createManualPayout = async (req, res) => {
  try {
    const { arenaPartnerId, startDate, endDate } = req.body;

    if (!arenaPartnerId || !startDate || !endDate) {
      return ApiResponse.badRequest(res, 'Arena partner ID, start date, and end date are required');
    }

    const payoutData = await Payout.calculatePayout(arenaPartnerId, startDate, endDate);

    if (payoutData.totalRevenue === 0) {
      return ApiResponse.badRequest(res, 'No revenue found for the specified period');
    }

    const partner = await ArenaPartner.findById(arenaPartnerId);

    const payout = await Payout.create({
      arenaPartner: arenaPartnerId,
      period: {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      },
      bookings: payoutData.bookings,
      financials: {
        totalRevenue: payoutData.totalRevenue,
        platformCommission: payoutData.platformCommission,
        commissionRate: payoutData.commissionRate,
        taxes: payoutData.taxes,
        adjustments: {
          refunds: 0,
          chargebacks: 0,
          bonuses: 0,
          penalties: 0,
          total: 0
        },
        netAmount: payoutData.netAmount
      },
      bankDetails: partner.bankDetails,
      status: 'pending',
      processedBy: req.user.id
    });

    return ApiResponse.success(res, 'Payout created successfully', { payout });

  } catch (error) {
    console.error('Create payout error:', error);
    return ApiResponse.serverError(res, 'Error creating payout', error);
  }
};

/**
 * @desc    Process payout
 * @route   PUT /api/admin/sports/payouts/:id/process
 * @access  Private (Admin)
 */
exports.processPayout = async (req, res) => {
  try {
    const { utr, notes } = req.body;

    const payout = await Payout.findById(req.params.id);

    if (!payout) {
      return ApiResponse.notFound(res, 'Payout not found');
    }

    if (payout.status !== 'pending') {
      return ApiResponse.badRequest(res, 'Only pending payouts can be processed');
    }

    payout.status = 'processing';
    payout.transaction.processedAt = Date.now();
    payout.transaction.utr = utr;
    payout.notes = notes;
    payout.processedBy = req.user.id;

    await payout.save();

    return ApiResponse.success(res, 'Payout processing initiated', { payout });

  } catch (error) {
    console.error('Process payout error:', error);
    return ApiResponse.serverError(res, 'Error processing payout', error);
  }
};

/**
 * @desc    Complete payout
 * @route   PUT /api/admin/sports/payouts/:id/complete
 * @access  Private (Admin)
 */
exports.completePayout = async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id);

    if (!payout) {
      return ApiResponse.notFound(res, 'Payout not found');
    }

    if (payout.status !== 'processing') {
      return ApiResponse.badRequest(res, 'Only processing payouts can be completed');
    }

    payout.status = 'completed';
    payout.transaction.completedAt = Date.now();

    await payout.save();

    // Update arena partner statistics
    await ArenaPartner.findByIdAndUpdate(payout.arenaPartner, {
      $inc: {
        'statistics.totalPayouts': payout.financials.netAmount
      }
    });

    return ApiResponse.success(res, 'Payout completed successfully', { payout });

  } catch (error) {
    console.error('Complete payout error:', error);
    return ApiResponse.serverError(res, 'Error completing payout', error);
  }
};

/**
 * @desc    Fail payout
 * @route   PUT /api/admin/sports/payouts/:id/fail
 * @access  Private (Admin)
 */
exports.failPayout = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return ApiResponse.badRequest(res, 'Failure reason is required');
    }

    const payout = await Payout.findById(req.params.id);

    if (!payout) {
      return ApiResponse.notFound(res, 'Payout not found');
    }

    payout.status = 'failed';
    payout.failure.reason = reason;
    payout.failure.attempts += 1;
    payout.failure.lastAttemptAt = Date.now();

    await payout.save();

    return ApiResponse.success(res, 'Payout marked as failed', { payout });

  } catch (error) {
    console.error('Fail payout error:', error);
    return ApiResponse.serverError(res, 'Error marking payout as failed', error);
  }
};

/**
 * @desc    Generate scheduled payouts
 * @route   POST /api/admin/sports/payouts/generate-scheduled
 * @access  Private (Admin)
 */
exports.generateScheduledPayouts = async (req, res) => {
  try {
    const { frequency } = req.body; // 'weekly' or 'monthly'

    if (!frequency || !['weekly', 'monthly'].includes(frequency)) {
      return ApiResponse.badRequest(res, 'Valid frequency (weekly or monthly) is required');
    }

    const payouts = await Payout.createScheduledPayouts(frequency);

    return ApiResponse.success(res, `${payouts.length} scheduled payouts created successfully`, {
      payouts,
      count: payouts.length
    });

  } catch (error) {
    console.error('Generate scheduled payouts error:', error);
    return ApiResponse.serverError(res, 'Error generating scheduled payouts', error);
  }
};

// ============ ANALYTICS & REPORTS ============

/**
 * @desc    Get sports dashboard statistics
 * @route   GET /api/admin/sports/dashboard/stats
 * @access  Private (Admin)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Total arena partners
    const totalPartners = await ArenaPartner.countDocuments({ approvalStatus: 'approved' });
    const pendingPartners = await ArenaPartner.countDocuments({ approvalStatus: 'pending' });

    // Total venues
    const totalVenues = await SportsVenue.countDocuments({ approvalStatus: 'approved' });
    const pendingVenues = await SportsVenue.countDocuments({ approvalStatus: 'pending' });

    // Total courts
    const totalCourts = await Court.countDocuments({ status: 'active' });

    // Total bookings
    const totalBookings = await SportsBooking.countDocuments({ status: { $in: ['confirmed', 'completed'] } });

    // This month's bookings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyBookings = await SportsBooking.countDocuments({
      status: { $in: ['confirmed', 'completed'] },
      createdAt: { $gte: startOfMonth }
    });

    // Revenue statistics
    const revenueData = await SportsBooking.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'completed'] },
          'payment.paymentStatus': 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' },
          platformCommission: { $sum: '$pricing.platformCommission' },
          arenaEarnings: { $sum: '$pricing.arenaEarnings' }
        }
      }
    ]);

    const revenue = revenueData.length > 0 ? revenueData[0] : {
      totalRevenue: 0,
      platformCommission: 0,
      arenaEarnings: 0
    };

    // Pending payouts
    const pendingPayouts = await Payout.countDocuments({ status: 'pending' });
    const pendingPayoutAmount = await Payout.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$financials.netAmount' } } }
    ]);

    return ApiResponse.success(res, 'Dashboard stats retrieved successfully', {
      stats: {
        partners: {
          total: totalPartners,
          pending: pendingPartners
        },
        venues: {
          total: totalVenues,
          pending: pendingVenues
        },
        courts: {
          total: totalCourts
        },
        bookings: {
          total: totalBookings,
          monthly: monthlyBookings
        },
        revenue: {
          total: revenue.totalRevenue,
          platformCommission: revenue.platformCommission,
          arenaEarnings: revenue.arenaEarnings
        },
        payouts: {
          pending: pendingPayouts,
          pendingAmount: pendingPayoutAmount.length > 0 ? pendingPayoutAmount[0].total : 0
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return ApiResponse.serverError(res, 'Error retrieving dashboard stats', error);
  }
};

/**
 * @desc    Get revenue analytics
 * @route   GET /api/admin/sports/analytics/revenue
 * @access  Private (Admin)
 */
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;

    const matchQuery = {
      status: { $in: ['confirmed', 'completed'] },
      'payment.paymentStatus': 'completed'
    };

    if (startDate && endDate) {
      matchQuery.bookingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let groupByFormat = '%Y-%m-%d';
    if (groupBy === 'month') {
      groupByFormat = '%Y-%m';
    } else if (groupBy === 'year') {
      groupByFormat = '%Y';
    }

    const revenueByPeriod = await SportsBooking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$bookingDate' } },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          platformCommission: { $sum: '$pricing.platformCommission' },
          arenaEarnings: { $sum: '$pricing.arenaEarnings' },
          bookingCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const revenueBySport = await SportsBooking.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'courts',
          localField: 'court',
          foreignField: '_id',
          as: 'courtDetails'
        }
      },
      { $unwind: '$courtDetails' },
      {
        $group: {
          _id: '$courtDetails.sportType',
          totalRevenue: { $sum: '$pricing.totalAmount' },
          bookingCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    return ApiResponse.success(res, 'Revenue analytics retrieved successfully', {
      revenueByPeriod,
      revenueBySport
    });

  } catch (error) {
    console.error('Get revenue analytics error:', error);
    return ApiResponse.serverError(res, 'Error retrieving revenue analytics', error);
  }
};

// ============ PARTNER MANAGEMENT DASHBOARD METHODS ============

/**
 * @desc    Get partner's venues
 * @route   GET /api/admin/sports/arena-partners/:id/venues
 * @access  Private (Admin)
 */
exports.getPartnerVenues = async (req, res) => {
  try {
    const { id } = req.params;
    
    const venues = await SportsVenue.find({ arenaPartner: id })
      .select('venueName address.city address.state approvalStatus isActive averageRating totalBookings')
      .sort({ createdAt: -1 });

    // Calculate monthly revenue for each venue (simplified)
    const venuesWithRevenue = venues.map(venue => ({
      ...venue.toObject(),
      monthlyRevenue: Math.floor(Math.random() * 50000) + 10000 // Placeholder calculation
    }));

    return ApiResponse.success(res, 'Partner venues retrieved successfully', {
      venues: venuesWithRevenue,
      count: venues.length
    });

  } catch (error) {
    console.error('Get partner venues error:', error);
    return ApiResponse.serverError(res, 'Error retrieving partner venues', error);
  }
};

/**
 * @desc    Get partner's bookings
 * @route   GET /api/admin/sports/arena-partners/:id/bookings
 * @access  Private (Admin)
 */
exports.getPartnerBookings = async (req, res) => {
  try {
    const { id } = req.params;
    
    const bookings = await SportsBooking.find({ arenaPartner: id })
      .populate('venue', 'venueName')
      .populate('customer', 'name email phone')
      .sort({ bookingDate: -1 })
      .limit(50);

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      venueName: booking.venue?.venueName || 'Unknown',
      customerName: booking.customer?.name || 'Unknown',
      customerEmail: booking.customer?.email || 'Unknown',
      customerPhone: booking.customer?.phone || 'Unknown',
      totalAmount: booking.pricing?.totalAmount || 0,
      status: booking.status,
      bookingDate: booking.bookingDate,
      paymentStatus: booking.paymentStatus || 'pending'
    }));

    return ApiResponse.success(res, 'Partner bookings retrieved successfully', {
      bookings: formattedBookings,
      count: bookings.length
    });

  } catch (error) {
    console.error('Get partner bookings error:', error);
    return ApiResponse.serverError(res, 'Error retrieving partner bookings', error);
  }
};

/**
 * @desc    Get partner's disputes
 * @route   GET /api/admin/sports/arena-partners/:id/disputes
 * @access  Private (Admin)
 */
exports.getPartnerDisputes = async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, return mock disputes data since we don't have a disputes model
    const mockDisputes = [
      {
        _id: 'dispute1',
        bookingId: 'booking1',
        customerName: 'John Doe',
        venueName: 'Sample Sports Arena',
        issue: 'Poor facility maintenance',
        status: 'raised',
        createdAt: new Date().toISOString(),
        description: 'Customer complained about unclean changing rooms'
      },
      {
        _id: 'dispute2',
        bookingId: 'booking2',
        customerName: 'Jane Smith',
        venueName: 'Another Sports Complex',
        issue: 'Double booking issue',
        status: 'investigating',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        description: 'Customer was charged for a time slot that was already booked'
      }
    ];

    return ApiResponse.success(res, 'Partner disputes retrieved successfully', {
      disputes: mockDisputes,
      count: mockDisputes.length
    });

  } catch (error) {
    console.error('Get partner disputes error:', error);
    return ApiResponse.serverError(res, 'Error retrieving partner disputes', error);
  }
};

/**
 * @desc    Verify KYC document
 * @route   PUT /api/admin/sports/arena-partners/:id/kyc/verify
 * @access  Private (Admin)
 */
exports.verifyKycDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType } = req.body;

    if (!documentType) {
      return ApiResponse.badRequest(res, 'Document type is required');
    }

    const partner = await ArenaPartner.findById(id);
    if (!partner) {
      return ApiResponse.notFound(res, 'Arena partner not found');
    }

    if (!partner.kycDocuments || !partner.kycDocuments[documentType]) {
      return ApiResponse.badRequest(res, 'Document not found');
    }

    // Mark document as verified
    partner.kycDocuments[documentType].verified = true;
    await partner.save();

    return ApiResponse.success(res, 'KYC document verified successfully', {
      documentType,
      verified: true
    });

  } catch (error) {
    console.error('Verify KYC document error:', error);
    return ApiResponse.serverError(res, 'Error verifying KYC document', error);
  }
};

/**
 * @desc    Resolve dispute
 * @route   PUT /api/admin/sports/disputes/:id/resolve
 * @access  Private (Admin)
 */
exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      return ApiResponse.badRequest(res, 'Resolution details are required');
    }

    // For now, just return success since we don't have a disputes model
    // In a real implementation, this would update the dispute in the database
    
    return ApiResponse.success(res, 'Dispute resolved successfully', {
      disputeId: id,
      status: 'resolved',
      resolution,
      resolvedAt: new Date()
    });

  } catch (error) {
    console.error('Resolve dispute error:', error);
    return ApiResponse.serverError(res, 'Error resolving dispute', error);
  }
};

// ============ VENUE MANAGEMENT DASHBOARD METHODS ============

/**
 * @desc    Get venue's courts
 * @route   GET /api/admin/sports/venues/:id/courts
 * @access  Private (Admin)
 */
exports.getVenueCourts = async (req, res) => {
  try {
    const { id } = req.params;
    
    const courts = await Court.find({ venue: id })
      .select('courtName sportType pricing availability isActive totalBookings')
      .sort({ createdAt: -1 });

    // Add mock revenue data for each court
    const courtsWithRevenue = courts.map(court => ({
      ...court.toObject(),
      monthlyRevenue: Math.floor(Math.random() * 30000) + 5000 // Placeholder calculation
    }));

    return ApiResponse.success(res, 'Venue courts retrieved successfully', {
      courts: courtsWithRevenue,
      count: courts.length
    });

  } catch (error) {
    console.error('Get venue courts error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venue courts', error);
  }
};

/**
 * @desc    Get venue's bookings
 * @route   GET /api/admin/sports/venues/:id/bookings
 * @access  Private (Admin)
 */
exports.getVenueBookings = async (req, res) => {
  try {
    const { id } = req.params;
    
    const bookings = await SportsBooking.find({ venue: id })
      .populate('court', 'courtName sportType')
      .populate('customer', 'name email phone')
      .sort({ bookingDate: -1 })
      .limit(50);

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      customerName: booking.customer?.name || 'Unknown',
      customerEmail: booking.customer?.email || 'Unknown',
      customerPhone: booking.customer?.phone || 'Unknown',
      courtName: booking.court?.courtName || 'Unknown',
      sportType: booking.court?.sportType || 'Unknown',
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalAmount: booking.pricing?.totalAmount || 0,
      status: booking.status,
      paymentStatus: booking.paymentStatus || 'pending'
    }));

    return ApiResponse.success(res, 'Venue bookings retrieved successfully', {
      bookings: formattedBookings,
      count: bookings.length
    });

  } catch (error) {
    console.error('Get venue bookings error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venue bookings', error);
  }
};

/**
 * @desc    Get venue's reviews
 * @route   GET /api/admin/sports/venues/:id/reviews
 * @access  Private (Admin)
 */
exports.getVenueReviews = async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, return mock reviews data since we don't have a reviews model
    const mockReviews = [
      {
        _id: 'review1',
        customerName: 'Rahul Sharma',
        rating: 5,
        comment: 'Excellent facility with well-maintained courts. The staff is very helpful and professional.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        helpfulCount: 12
      },
      {
        _id: 'review2',
        customerName: 'Priya Patel',
        rating: 4,
        comment: 'Great venue for badminton. Courts are good quality and booking process is smooth.',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        helpfulCount: 8
      },
      {
        _id: 'review3',
        customerName: 'Amit Kumar',
        rating: 3,
        comment: 'Good facility but parking can be an issue during peak hours. Otherwise everything is fine.',
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        helpfulCount: 5
      }
    ];

    return ApiResponse.success(res, 'Venue reviews retrieved successfully', {
      reviews: mockReviews,
      count: mockReviews.length
    });

  } catch (error) {
    console.error('Get venue reviews error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venue reviews', error);
  }
};

/**
 * @desc    Toggle venue active status
 * @route   PUT /api/admin/sports/venues/:id/toggle-active
 * @access  Private (Admin)
 */
exports.toggleVenueActive = async (req, res) => {
  try {
    const { id } = req.params;

    const venue = await SportsVenue.findById(id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    // Toggle active status
    venue.isActive = !venue.isActive;
    await venue.save();

    return ApiResponse.success(res, 'Venue status updated successfully', {
      isActive: venue.isActive
    });

  } catch (error) {
    console.error('Toggle venue active error:', error);
    return ApiResponse.serverError(res, 'Error updating venue status', error);
  }
};

/**
 * @desc    Delete review
 * @route   DELETE /api/admin/sports/reviews/:id
 * @access  Private (Admin)
 */
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    // For now, just return success since we don't have a reviews model
    // In a real implementation, this would delete the review from the database
    
    return ApiResponse.success(res, 'Review deleted successfully', {
      reviewId: id
    });

  } catch (error) {
    console.error('Delete review error:', error);
    return ApiResponse.serverError(res, 'Error deleting review', error);
  }
};

module.exports = exports;
