const User = require('../models/User');
const Artist = require('../models/Artist');
const Venue = require('../models/Venue');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const ApiResponse = require('../utils/apiResponse');
const { v4: uuidv4 } = require('uuid');

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

/**
 * @desc    Get pending approvals (organizers, artists, venues, events)
 * @route   GET /api/admin/approvals
 * @access  Private (Admin only)
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { type, limit = 10, page = 1, search } = req.query;
    
    // Calculate pagination
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    let results = {};
    let total = 0;
    
    // Search query for user-based approvals
    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};
    
    // Filter by type if provided
    if (type) {
      switch (type) {
        case 'organizers':
          const pendingOrganizers = await Organizer.find({
            approvalStatus: 'pending',
            ...searchQuery
          })
          .select('_id name email phone createdAt companyName')
          .skip(skip)
          .limit(parseInt(limit, 10))
          .sort({ createdAt: -1 });
          
          total = await Organizer.countDocuments({
            approvalStatus: 'pending',
            ...searchQuery
          });
          
          results = { organizers: pendingOrganizers };
          break;
          
        case 'artists':
          const pendingArtists = await Artist.find({
            approvalStatus: 'pending',
            ...searchQuery
          })
          .select('_id name email phone createdAt')
          .skip(skip)
          .limit(parseInt(limit, 10))
          .sort({ createdAt: -1 });
          
          total = await Artist.countDocuments({
            approvalStatus: 'pending',
            ...searchQuery
          });
          
          results = { artists: pendingArtists };
          break;
          
        case 'venues':
          const pendingVenues = await Venue.find({
            approvalStatus: 'pending',
            ...searchQuery
          })
          .select('_id name email phone createdAt')
          .skip(skip)
          .limit(parseInt(limit, 10))
          .sort({ createdAt: -1 });
          
          total = await Venue.countDocuments({
            approvalStatus: 'pending',
            ...searchQuery
          });
          
          results = { venues: pendingVenues };
          break;
          
        case 'events':
          // For events, we search in event title and description
          const eventSearchQuery = search ? {
            $or: [
              { title: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ]
          } : {};
          
          const pendingEvents = await Event.find({
            status: 'pending',
            ...eventSearchQuery
          })
          .select('_id title organizer startDate endDate createdAt')
          .populate('organizer', 'name email phone')
          .skip(skip)
          .limit(parseInt(limit, 10))
          .sort({ createdAt: -1 });
          
          total = await Event.countDocuments({
            status: 'pending',
            ...eventSearchQuery
          });
          
          results = { events: pendingEvents };
          break;
          
        default:
          return ApiResponse.error(res, 'Invalid approval type', { validTypes: ['organizers', 'artists', 'venues', 'events'] });
      }
    } else {
      // If no type is provided, get all pending approvals
      const [organizers, artists, venues, events] = await Promise.all([
        Organizer.find({ approvalStatus: 'pending' })
          .select('_id name email phone createdAt companyName')
          .sort({ createdAt: -1 })
          .limit(5),
        Artist.find({ approvalStatus: 'pending' })
          .select('_id name email phone createdAt')
          .sort({ createdAt: -1 })
          .limit(5),
        Venue.find({ approvalStatus: 'pending' })
          .select('_id name email phone createdAt')
          .sort({ createdAt: -1 })
          .limit(5),
        Event.find({ status: 'pending' })
          .select('_id title organizer startDate endDate createdAt')
          .populate('organizer', 'name email phone')
          .sort({ createdAt: -1 })
          .limit(5)
      ]);
      
      results = { organizers, artists, venues, events };
      total = organizers.length + artists.length + venues.length + events.length;
    }
    
    return ApiResponse.success(res, 'Pending approvals retrieved successfully', {
      ...results,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    return ApiResponse.serverError(res, 'Error retrieving pending approvals', error);
  }
};

/**
 * @desc    Approve/reject organizer
 * @route   PUT /api/admin/approvals/organizer/:id
 * @access  Private (Admin only)
 */
exports.processOrganizerApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return ApiResponse.error(res, 'Invalid status value', { validStatus: ['approved', 'rejected'] });
    }
    
    // Find the organizer
    const organizer = await Organizer.findOne({ _id: id, approvalStatus: 'pending' });
    
    if (!organizer) {
      return ApiResponse.notFound(res, 'Pending organizer not found or already processed');
    }
    
    // Update organizer approval status
    organizer.approvalStatus = status;
    organizer.status = status === 'approved' ? 'active' : 'rejected';

    if (status === 'approved') {
      organizer.approvalDate = new Date();
      organizer.approvedBy = req.user.id;
    } else if (status === 'rejected') {
      organizer.rejectionDate = new Date();
      organizer.rejectedBy = req.user.id;
      organizer.rejectionReason = rejectionReason;
    }
    
    // Save organizer
    await organizer.save();
    
    // TODO: Send notification to organizer about approval/rejection
    
    return ApiResponse.success(res, `Organizer has been ${status}`, {
      organizer: {
        id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        phone: organizer.phone,
        status: organizer.status,
        approvalStatus: organizer.approvalStatus
      }
    });
  } catch (error) {
    console.error('Process organizer approval error:', error);
    return ApiResponse.serverError(res, 'Error processing organizer approval', error);
  }
};

/**
 * @desc    Approve/reject artist
 * @route   PUT /api/admin/approvals/artist/:id
 * @access  Private (Admin only)
 */
exports.processArtistApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return ApiResponse.error(res, 'Invalid status value', { validStatus: ['approved', 'rejected'] });
    }

    const artist = await Artist.findOne({ _id: id, approvalStatus: 'pending' });

    if (!artist) {
      return ApiResponse.notFound(res, 'Pending artist not found or already processed');
    }

    artist.approvalStatus = status;
    artist.status = status === 'approved' ? 'active' : 'rejected';

    if (status === 'approved') {
      artist.approvalDate = new Date();
      artist.approvedBy = req.user.id; // Assuming admin user is available in req.user
      artist.rejectionReason = undefined;
    } else if (status === 'rejected') {
      if (!rejectionReason) {
        return ApiResponse.badRequest(res, 'Rejection reason is required when rejecting an artist.');
      }
      artist.rejectionDate = new Date();
      artist.rejectedBy = req.user.id;
      artist.rejectionReason = rejectionReason;
    }

    await artist.save();

    // TODO: Send notification to artist about approval/rejection

    return ApiResponse.success(res, `Artist has been ${status}`, {
      artist: {
        id: artist._id,
        name: artist.name,
        email: artist.email,
        phone: artist.phone,
        status: artist.status,
        approvalStatus: artist.approvalStatus
      }
    });
  } catch (error) {
    console.error('Process artist approval error:', error);
    return ApiResponse.serverError(res, 'Error processing artist approval', error);
  }
};

/**
 * @desc    Approve/reject venue
 * @route   PUT /api/admin/approvals/venue/:id
 * @access  Private (Admin only)
 */
exports.processVenueApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return ApiResponse.error(res, 'Invalid status value', { validStatus: ['approved', 'rejected'] });
    }
    
    // Find the user
    const user = await User.findOne({ _id: id, role: 'venue', status: 'pending' });
    
    if (!user) {
      return ApiResponse.notFound(res, 'Pending venue not found');
    }
    
    // Update user status
    user.status = status === 'approved' ? 'active' : 'rejected';
    
    // Handle rejection
    if (status === 'rejected' && rejectionReason) {
      // TODO: Send notification to user about rejection with reason
    }
    
    await user.save();
    
    return ApiResponse.success(res, `Venue has been ${status}`, {
      venue: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Process venue approval error:', error);
    return ApiResponse.serverError(res, 'Error processing venue approval', error);
  }
};

/**
 * @desc    Approve/reject event
 * @route   PUT /api/admin/approvals/event/:id
 * @access  Private (Admin only)
 */
exports.processEventApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return ApiResponse.error(res, 'Invalid status value', { validStatus: ['approved', 'rejected'] });
    }
    
    // Find the event with organizer info
    const event = await Event.findOne({ _id: id, status: 'pending' })
      .populate('organizer', 'name email phone');
    
    if (!event) {
      return ApiResponse.notFound(res, 'Pending event not found');
    }
    
    // Fix coordinates if they are incomplete
    if (event.location && event.location.coordinates) {
      if (!event.location.coordinates.coordinates || !Array.isArray(event.location.coordinates.coordinates)) {
        event.location.coordinates = {
          type: 'Point',
          coordinates: [0, 0] // Default coordinates
        };
      }
    }
    
    // Update event status and approval status
    event.status = status;
    event.approvalStatus = status;
    
    // Handle approval
    if (status === 'approved') {
      event.approvedBy = req.user.id;
      event.approvedAt = new Date();
      event.rejectionReason = undefined; // Clear any previous rejection reason
    }
    
    // Handle rejection
    if (status === 'rejected') {
      event.rejectionReason = rejectionReason;
      event.approvedBy = undefined;
      event.approvedAt = undefined;
    }
    
    await event.save();
    
    // TODO: Send notification to organizer about approval/rejection
    // This could be implemented with a notification service
    
    return ApiResponse.success(res, `Event "${event.title}" has been ${status}`, {
      event: {
        id: event._id,
        title: event.title,
        status: event.status,
        approvalStatus: event.approvalStatus,
        rejectionReason: event.rejectionReason,
        approvedBy: event.approvedBy,
        approvedAt: event.approvedAt,
        organizer: event.organizer
      }
    });
  } catch (error) {
    console.error('Process event approval error:', error);
    return ApiResponse.serverError(res, 'Error processing event approval', error);
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
    
    // Calculate pagination
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    // Build search query
    const searchQuery = search ? {
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ]
    } : {};
    
    // Get pending events with organizer details
    const pendingEvents = await Event.find({
      status: 'pending',
      ...searchQuery
    })
    .populate('organizer', 'name email phone')
    .select('_id title description banner category startDate endDate location ticketTypes createdAt')
    .skip(skip)
    .limit(parseInt(limit, 10))
    .sort({ createdAt: -1 });
    
    // Get total count
    const total = await Event.countDocuments({
      status: 'pending',
      ...searchQuery
    });
    
    return ApiResponse.success(res, 'Pending events retrieved successfully', {
      events: pendingEvents,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get pending events error:', error);
    return ApiResponse.serverError(res, 'Error retrieving pending events', error);
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
    
    // Calculate pagination
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    // Get users - if limit is 1000 or higher, return all users (no limit)
    let query = User.find(filter)
      .select('-otp -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 });
      
    // Apply pagination only if limit is less than 1000
    if (parseInt(limit, 10) < 1000) {
      query = query.skip(skip).limit(parseInt(limit, 10));
    }
    
    const users = await query;
    
    // Get total count
    const total = await User.countDocuments(filter);
    
    return ApiResponse.success(res, 'Users retrieved successfully', {
      users,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10) < 1000 ? parseInt(limit, 10) : total,
        pages: parseInt(limit, 10) < 1000 ? Math.ceil(total / parseInt(limit, 10)) : 1
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

    return ApiResponse.success(res, "Venue rejected successfully", venue);
  } catch (error) {
    return ApiResponse.serverError(res, "Error rejecting venue", error.message);
  }
};
