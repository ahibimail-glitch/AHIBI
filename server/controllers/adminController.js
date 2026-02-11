const User = require('../models/User');
const Artist = require('../models/Artist');
const Venue = require('../models/Venue');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const ArtistAvailability = require('../models/ArtistAvailability');
const ArtistBooking = require('../models/ArtistBooking');
const ApiResponse = require('../utils/apiResponse');
const { v4: uuidv4 } = require('uuid');
const adminNotificationController = require('./adminNotificationController');
const emailService = require('../services/emailService');

/**
 * @desc    Dashboard statistics for admin
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get user counts by role
    const userCounts = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format user counts into an object
    const userCountsByRole = {};
    userCounts.forEach(item => {
      userCountsByRole[item._id] = item.count;
    });

    // Get pending approvals counts
    const pendingOrganizers = await Organizer.countDocuments({ 
      approvalStatus: 'pending' 
    });
    
    const pendingArtists = await Artist.countDocuments({ 
      approvalStatus: 'pending' 
    });
    
    const pendingVenues = await Venue.countDocuments({ 
      approvalStatus: 'pending' 
    });
    
    const pendingEvents = await Event.countDocuments({ 
      status: 'pending' 
    });

    // Get event statistics
    const totalEvents = await Event.countDocuments();
    const totalActiveEvents = await Event.countDocuments({ 
      status: 'approved',
      endDate: { $gte: new Date() }
    });

    // Get ticket statistics
    const ticketStats = await Ticket.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Format ticket stats
    const ticketStatsByStatus = {};
    let totalRevenue = 0;
    let totalTicketsSold = 0;
    
    ticketStats.forEach(item => {
      ticketStatsByStatus[item._id] = {
        count: item.count,
        revenue: item.revenue
      };
      
      if (item._id === 'completed') {
        totalRevenue = item.revenue;
        totalTicketsSold = item.count;
      }
    });

    // Get revenue by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const revenueByDate = await Ticket.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          purchaseDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$purchaseDate' },
            month: { $month: '$purchaseDate' },
            day: { $dayOfMonth: '$purchaseDate' }
          },
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Format revenue by date
    const formattedRevenueByDate = revenueByDate.map(item => ({
      date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
      revenue: item.totalRevenue,
      tickets: item.count
    }));

    return ApiResponse.success(res, 'Dashboard statistics retrieved successfully', {
      users: {
        total: userCountsByRole.user || 0,
        artists: userCountsByRole.artist || 0,
        venues: userCountsByRole.venue || 0,
        organizers: userCountsByRole.organizer || 0,
        admins: userCountsByRole.admin || 0
      },
      pendingApprovals: {
        organizers: pendingOrganizers,
        artists: pendingArtists,
        venues: pendingVenues,
        events: pendingEvents,
        total: pendingOrganizers + pendingArtists + pendingVenues + pendingEvents
      },
      events: {
        total: totalEvents,
        active: totalActiveEvents
      },
      tickets: {
        sold: totalTicketsSold,
        revenue: totalRevenue,
        statsByStatus: ticketStatsByStatus
      },
      revenueChart: formattedRevenueByDate
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return ApiResponse.serverError(res, 'Error retrieving dashboard statistics', error);
  }
};

// Decoupled Organizer Management Functions

/**
 * @desc    Get all organizers with detailed information
 * @route   GET /api/admin/organizers
 * @access  Private (Admin only)
 */
exports.getAllOrganizers = async (req, res) => {
  try {
    const { status, limit = 50, page = 1, search } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    let query = {};
    
    // Filter by approval status if provided
    if (status) {
      query.approvalStatus = status;
    }
    
    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const organizers = await Organizer.find(query)
      .select('_id name email phone companyName approvalStatus createdAt bio description address contactInfo website socialMedia experience')
      .skip(skip)
      .limit(parseInt(limit, 10))
      .sort({ createdAt: -1 });
    
    const total = await Organizer.countDocuments(query);
    
    return ApiResponse.success(res, 'Organizers retrieved successfully', {
      organizers,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get organizers error:', error);
    return ApiResponse.serverError(res, 'Error retrieving organizers', error);
  }
};

/**
 * @desc    Get organizer by ID with full details
 * @route   GET /api/admin/organizers/:id
 * @access  Private (Admin only)
 */
exports.getOrganizerById = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id)
      .select('_id name email phone companyName approvalStatus createdAt updatedAt bio description address contactInfo website socialMedia experience rejectionReason');
    
    if (!organizer) {
      return ApiResponse.notFound(res, 'Organizer not found');
    }
    
    return ApiResponse.success(res, 'Organizer details retrieved successfully', { organizer });
  } catch (error) {
    console.error('Get organizer by ID error:', error);
    return ApiResponse.serverError(res, 'Error retrieving organizer details', error);
  }
};

/**
 * @desc    Approve organizer
 * @route   PUT /api/admin/organizers/:id/approve
 * @access  Private (Admin only)
 */
exports.approveOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findByIdAndUpdate(
      req.params.id,
      { 
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user._id
      },
      { new: true }
    );
    
    if (!organizer) {
      return ApiResponse.notFound(res, 'Organizer not found');
    }

    // Mark related notification as completed
    adminNotificationController.markNotificationCompleted('Organizer', req.params.id, 'approved', req.user._id);
    
    // Send approval email to organizer
    emailService.sendOrganizerApprovalNotification(organizer, true).catch(err => {
      console.error('Error sending organizer approval email:', err);
    });
    
    return ApiResponse.success(res, 'Organizer approved successfully', { organizer });
  } catch (error) {
    console.error('Approve organizer error:', error);
    return ApiResponse.serverError(res, 'Error approving organizer', error);
  }
};

/**
 * @desc    Reject organizer
 * @route   PUT /api/admin/organizers/:id/reject
 * @access  Private (Admin only)
 */
exports.rejectOrganizer = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    const organizer = await Organizer.findByIdAndUpdate(
      req.params.id,
      { 
        approvalStatus: 'rejected',
        rejectionReason,
        rejectedAt: new Date(),
        rejectedBy: req.user._id
      },
      { new: true }
    );
    
    if (!organizer) {
      return ApiResponse.notFound(res, 'Organizer not found');
    }

    // Mark related notification as completed
    adminNotificationController.markNotificationCompleted('Organizer', req.params.id, 'rejected', req.user._id);
    
    return ApiResponse.success(res, 'Organizer rejected successfully', { organizer });
  } catch (error) {
    console.error('Reject organizer error:', error);
    return ApiResponse.serverError(res, 'Error rejecting organizer', error);
  }
};

// Decoupled Artist Management Functions

/**
 * @desc    Get all artists with detailed information
 * @route   GET /api/admin/artists
 * @access  Private (Admin only)
 */
exports.getAllArtists = async (req, res) => {
  try {
    const { status, limit = 50, page = 1, search } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    let query = {};
    
    if (status) {
      query.approvalStatus = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { stageName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }
    
    const artists = await Artist.find(query)
      .select('_id name stageName email phone city type experience approvalStatus status createdAt profilePic')
      .skip(skip)
      .limit(parseInt(limit, 10))
      .sort({ createdAt: -1 });
    
    const total = await Artist.countDocuments(query);
    
    return ApiResponse.success(res, 'Artists retrieved successfully', {
      artists,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get artists error:', error);
    return ApiResponse.serverError(res, 'Error retrieving artists', error);
  }
};

/**
 * @desc    Get artist by ID with full details
 * @route   GET /api/admin/artists/:id
 * @access  Private (Admin only)
 */
exports.getArtistById = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id)
      .select('_id name stageName gender email phone emergencyContact city profilePic performanceRegions status approvalStatus rejectionReason bio shortBio longBio languages type artistCategories eventTypes eventTypesOther audienceVibe performanceDurations performanceDurationOther performanceFormats performanceFormatsOther feeRange experience basePrice customPricing gallery accolades termsAndConditions cancellationPolicy techRider socialLinks availability totalBookings totalEarnings rating createdAt updatedAt');
    
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }
    
    return ApiResponse.success(res, 'Artist details retrieved successfully', { artist });
  } catch (error) {
    console.error('Get artist by ID error:', error);
    return ApiResponse.serverError(res, 'Error retrieving artist details', error);
  }
};

/**
 * @desc    Approve artist
 * @route   PUT /api/admin/artists/:id/approve
 * @access  Private (Admin only)
 */
exports.approveArtist = async (req, res) => {
  try {
    const artist = await Artist.findByIdAndUpdate(
      req.params.id,
      { 
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user._id
      },
      { new: true }
    );
    
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    // Mark related notification as completed
    adminNotificationController.markNotificationCompleted('Artist', req.params.id, 'approved', req.user._id);
    
    return ApiResponse.success(res, 'Artist approved successfully', { artist });
  } catch (error) {
    console.error('Approve artist error:', error);
    return ApiResponse.serverError(res, 'Error approving artist', error);
  }
};

/**
 * @desc    Reject artist
 * @route   PUT /api/admin/artists/:id/reject
 * @access  Private (Admin only)
 */
exports.rejectArtist = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    const artist = await Artist.findByIdAndUpdate(
      req.params.id,
      { 
        approvalStatus: 'rejected',
        rejectionReason,
        rejectedAt: new Date(),
        rejectedBy: req.user._id
      },
      { new: true }
    );
    
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    // Mark related notification as completed
    adminNotificationController.markNotificationCompleted('Artist', req.params.id, 'rejected', req.user._id);
    
    return ApiResponse.success(res, 'Artist rejected successfully', { artist });
  } catch (error) {
    console.error('Reject artist error:', error);
    return ApiResponse.serverError(res, 'Error rejecting artist', error);
  }
};

/**
 * @desc    Delete artist and related records
 * @route   DELETE /api/admin/artists/:id
 * @access  Private (Admin only)
 */
exports.deleteArtist = async (req, res) => {
  try {
    const artistId = req.params.id;

    const artist = await Artist.findById(artistId);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    await Promise.all([
      ArtistAvailability.deleteMany({ artist: artistId }),
      ArtistBooking.deleteMany({ artist: artistId }),
      Event.updateMany(
        { artists: artistId },
        { $pull: { artists: artistId } }
      )
    ]);

    await Artist.findByIdAndDelete(artistId);

    return ApiResponse.success(res, 'Artist deleted successfully', { artistId });
  } catch (error) {
    console.error('Delete artist error:', error);
    return ApiResponse.serverError(res, 'Error deleting artist', error);
  }
};

// Decoupled Venue Management Functions

/**
 * @desc    Get all venues with detailed information
 * @route   GET /api/admin/venues
 * @access  Private (Admin only)
 */
exports.getAllVenues = async (req, res) => {
  try {
    const { status, limit = 50, page = 1, search } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    let query = {};
    
    if (status) {
      query.approvalStatus = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }
    
    const venues = await Venue.find(query)
      .select('_id name email phone approvalStatus createdAt description address capacity amenities contactInfo website')
      .skip(skip)
      .limit(parseInt(limit, 10))
      .sort({ createdAt: -1 });
    
    const total = await Venue.countDocuments(query);
    
    return ApiResponse.success(res, 'Venues retrieved successfully', {
      venues,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get venues error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venues', error);
  }
};

/**
 * @desc    Get venue by ID with full details
 * @route   GET /api/admin/venues/:id
 * @access  Private (Admin only)
 */
exports.getVenueById = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id)
      .select('_id name email phone approvalStatus createdAt updatedAt description address capacity amenities contactInfo website images rejectionReason');
    
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }
    
    return ApiResponse.success(res, 'Venue details retrieved successfully', { venue });
  } catch (error) {
    console.error('Get venue by ID error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venue details', error);
  }
};

/**
 * @desc    Get all events with detailed information
 * @route   GET /api/admin/events/all
 * @access  Private (Admin only)
 */
exports.getAllEvents = async (req, res) => {
  try {
    const { status, limit = 50, page = 1, search } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    const events = await Event.find(query)
      .populate('organizer', 'name email phone companyName')
      .populate('venue', 'name address contactInfo')
      .skip(skip)
      .limit(parseInt(limit, 10))
      .sort({ createdAt: -1 });
    
    const total = await Event.countDocuments(query);
    
    return ApiResponse.success(res, 'Events retrieved successfully', {
      events,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    return ApiResponse.serverError(res, 'Error retrieving events', error);
  }
};

/**
 * @desc    Get event by ID with full details
 * @route   GET /api/admin/events/:id/details
 * @access  Private (Admin only)
 */
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email phone companyName')
      .populate('venue', 'name address contactInfo')
      .select('_id title description banner category startDate endDate bookingEndTime status createdAt updatedAt location ticketTypes maxAttendees images rejectionReason');
    
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }
    
    return ApiResponse.success(res, 'Event details retrieved successfully', { event });
  } catch (error) {
    console.error('Get event by ID error:', error);
    return ApiResponse.serverError(res, 'Error retrieving event details', error);
  }
};

/**
 * @desc    Approve event
 * @route   PUT /api/admin/events/:id/approve
 * @access  Private (Admin only)
 */
exports.approveEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user._id
      },
      { new: true }
    ).populate('organizer', 'name email phone');
    
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    // Mark related notification as completed
    adminNotificationController.markNotificationCompleted('Event', req.params.id, 'approved', req.user._id);
    
    // Send approval email to organizer with event details
    if (event.organizer) {
      emailService.sendEventApprovalNotification(event, true).catch(err => {
        console.error('Error sending event approval email:', err);
      });
    }
    
    return ApiResponse.success(res, 'Event approved successfully', { event });
  } catch (error) {
    console.error('Approve event error:', error);
    return ApiResponse.serverError(res, 'Error approving event', error);
  }
};

/**
 * @desc    Reject event
 * @route   PUT /api/admin/events/:id/reject
 * @access  Private (Admin only)
 */
exports.rejectEvent = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected',
        rejectionReason,
        rejectedAt: new Date(),
        rejectedBy: req.user._id
      },
      { new: true }
    );
    
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    // Mark related notification as completed
    adminNotificationController.markNotificationCompleted('Event', req.params.id, 'rejected', req.user._id);
    
    return ApiResponse.success(res, 'Event rejected successfully', { event });
  } catch (error) {
    console.error('Reject event error:', error);
    return ApiResponse.serverError(res, 'Error rejecting event', error);
  }
};

/**
 * @desc    Get pending events for admin review
 * @route   GET /api/admin/events/pending
 * @access  Private (Admin only)
 */
exports.getPendingEvents = async (req, res) => {
  try {
    const { limit = 10, page = 1, search } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const searchQuery = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [events, total] = await Promise.all([
      Event.find({ status: 'pending', ...searchQuery })
        .populate('organizer', 'name email phone')
        .select(
          '_id title description category startDate endDate status createdAt organizer'
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Event.countDocuments({ status: 'pending', ...searchQuery }),
    ]);

    return ApiResponse.success(res, 'Pending events retrieved successfully', {
      events,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    console.error('Get pending events error:', error);
    return ApiResponse.serverError(
      res,
      'Error retrieving pending events',
      error
    );
  }
};

/**
 * @desc    Get all approvals (legacy - for backward compatibility)
 * @route   GET /api/admin/approvals
 * @access  Private (Admin only)
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    const organizers = await Organizer.find({})
      .select('_id name email phone companyName approvalStatus createdAt description address contactInfo')
      .sort({ createdAt: -1 });
    
    const artists = await Artist.find({})
      .select('_id name email phone approvalStatus createdAt artistType bio experience')
      .sort({ createdAt: -1 });
    
    const venues = await Venue.find({})
      .select('_id name email phone approvalStatus createdAt address capacity amenities')
      .sort({ createdAt: -1 });
    
    const events = await Event.find({})
      .populate('organizer', 'name email phone companyName')
      .select('_id title description startDate endDate category location status createdAt banner organizerInfo ticketTypes totalTickets ticketsSold')
      .sort({ createdAt: -1 });
    
    // Transform events to include organizer details
    const transformedEvents = events.map(event => ({
      _id: event._id,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      category: event.category,
      location: event.location,
      status: event.status,
      createdAt: event.createdAt,
      banner: event.banner,
      ticketTypes: event.ticketTypes,
      totalTickets: event.totalTickets,
      ticketsSold: event.ticketsSold,
      organizerInfo: {
        name: event.organizer?.name || event.organizerInfo?.name || 'Unknown',
        email: event.organizer?.email || 'No email',
        phone: event.organizer?.phone || 'No phone',
        companyName: event.organizer?.companyName || 'No company'
      }
    }));
    
    return ApiResponse.success(res, 'All approvals retrieved successfully', {
      organizers,
      artists,
      venues,
      events: transformedEvents,
      pagination: {
        total: organizers.length + artists.length + venues.length + events.length,
        page: 1,
        limit: 1000,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    return ApiResponse.serverError(res, 'Error retrieving approvals', error);
  }
};

/**
 * @desc    Get all users with pagination and filtering
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
exports.getUsers = async (req, res) => {
  try {
    // Get query parameters
    const { role, status, limit = 10, page = 1, search } = req.query;
    
    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    
    // Build search query
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Parse limit and page
    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    
    // Get total count
    const total = await User.countDocuments(filter);
    
    // Get users - if limit is 10000 or higher, return all users (no limit)
    let users;
    if (parsedLimit >= 10000) {
      users = await User.find(filter)
        .select('-otp -passwordResetToken -passwordResetExpires')
        .sort({ createdAt: -1 });
    } else {
      // Calculate pagination
      const skip = (parsedPage - 1) * parsedLimit;
      
      users = await User.find(filter)
        .select('-otp -passwordResetToken -passwordResetExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit);
    }
    
    return ApiResponse.success(res, 'Users retrieved successfully', {
      users,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit >= 10000 ? total : parsedLimit,
        pages: parsedLimit >= 10000 ? 1 : Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return ApiResponse.serverError(res, 'Error retrieving users', error);
  }
};

/**
 * @desc    Update user status (block/unblock)
 * @route   PUT /api/admin/users/:id/status
 * @access  Private (Admin only)
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!['active', 'blocked'].includes(status)) {
      return ApiResponse.error(res, 'Invalid status value', { validStatus: ['active', 'blocked'] });
    }
    
    // Find the user
    const user = await User.findById(id);
    
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }
    
    // Prevent blocking admin users
    if (user.role === 'admin') {
      return ApiResponse.forbidden(res, 'Cannot change status of admin users');
    }
    
    // Update user status
    user.status = status;
    await user.save();
    
    return ApiResponse.success(res, `User status updated to ${status}`, {
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return ApiResponse.serverError(res, 'Error updating user status', error);
  }
};

/**
 * @desc    Get admin settings
 * @route   GET /api/admin/settings
 * @access  Private (Admin only)
 */
exports.getSettings = async (req, res) => {
  try {
    // TODO: Implement settings model and fetch from database
    // For now, return default settings
    const settings = {
      convenience: {
        percentage: 5,
        minAmount: 20,
        maxAmount: 200
      },
      tax: {
        gst: 18
      },
      payouts: {
        minThreshold: 500,
        processingDays: 7
      },
      notifications: {
        email: true,
        sms: true,
        push: true
      }
    };
    
    return ApiResponse.success(res, 'Settings retrieved successfully', { settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return ApiResponse.serverError(res, 'Error retrieving settings', error);
  }
};

/**
 * @desc    Update admin settings
 * @route   PUT /api/admin/settings
 * @access  Private (Admin only)
 */
exports.updateSettings = async (req, res) => {
  try {
    const { convenience, tax, payouts, notifications } = req.body;
    
    // TODO: Implement settings model and update in database
    // For now, just return the received settings
    const settings = {
      convenience: convenience || {
        percentage: 5,
        minAmount: 20,
        maxAmount: 200
      },
      tax: tax || {
        gst: 18
      },
      payouts: payouts || {
        minThreshold: 500,
        processingDays: 7
      },
      notifications: notifications || {
        email: true,
        sms: true,
        push: true
      }
    };
    
    return ApiResponse.success(res, 'Settings updated successfully', { settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return ApiResponse.serverError(res, 'Error updating settings', error);
  }
};

/**
 * @desc    Approve a venue
 * @route   PUT /api/admin/venues/:id/approve
 * @access  Private (Admin only)
 */
exports.approveVenue = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      return ApiResponse.notFound(res, "Venue not found");
    }

    venue.approvalStatus = 'approved';
    await venue.save();

    // Also update the user status if there's an associated user
    if (venue.user) {
      await User.findByIdAndUpdate(venue.user, { approvalStatus: 'approved' });
    }

    // Send approval email to venue organizer
    try {
      await emailService.sendVenueApprovalNotification(venue, true);
    } catch (emailError) {
      console.error('Failed to send venue approval email:', emailError);
    }

    // Mark related notification as completed
    adminNotificationController.markNotificationCompleted('Venue', req.params.id, 'approved', req.user._id);

    return ApiResponse.success(res, "Venue approved successfully", venue);
  } catch (error) {
    return ApiResponse.serverError(res, "Error approving venue", error.message);
  }
};

/**
 * @desc    Reject a venue
 * @route   PUT /api/admin/venues/:id/reject
 * @access  Private (Admin only)
 */
exports.rejectVenue = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) {
      return ApiResponse.badRequest(res, "Rejection reason is required");
    }

    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      return ApiResponse.notFound(res, "Venue not found");
    }

    venue.approvalStatus = 'rejected';
    venue.rejectionReason = rejectionReason;
    await venue.save();

    // Also update the user status
    if (venue.user) {
      await User.findByIdAndUpdate(venue.user, { approvalStatus: 'rejected' });
    }

    // Send rejection email to venue organizer
    try {
      await emailService.sendVenueApprovalNotification(venue, false, rejectionReason);
    } catch (emailError) {
      console.error('Failed to send venue rejection email:', emailError);
    }

    // Mark related notification as completed
    adminNotificationController.markNotificationCompleted('Venue', req.params.id, 'rejected', req.user._id);

    return ApiResponse.success(res, "Venue rejected successfully", venue);
  } catch (error) {
    return ApiResponse.serverError(res, "Error rejecting venue", error.message);
  }
};
