const AdminNotification = require('../models/AdminNotification');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Get all admin notifications with filtering and pagination
 * @route   GET /api/admin/notifications
 * @access  Private (Admin)
 */
exports.getNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      type,
      priority,
      actionRequired,
      startDate,
      endDate,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    if (actionRequired === 'true') {
      filter.actionRequired = true;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { 'triggeredBy.name': { $regex: search, $options: 'i' } },
        { 'triggeredBy.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Get notifications with pagination
    const notifications = await AdminNotification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await AdminNotification.countDocuments(filter);

    // Get counts by status
    const unreadCount = await AdminNotification.countDocuments({ status: 'unread' });
    const actionRequiredCount = await AdminNotification.countDocuments({ 
      actionRequired: true, 
      status: { $ne: 'archived' } 
    });

    // Get counts by category
    const categoryCounts = await AdminNotification.aggregate([
      { $match: { status: { $ne: 'archived' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    return ApiResponse.success(res, 'Notifications retrieved successfully', {
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      counts: {
        unread: unreadCount,
        actionRequired: actionRequiredCount,
        byCategory: categoryCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get admin notifications error:', error);
    return ApiResponse.serverError(res, 'Error retrieving notifications', error);
  }
};

/**
 * @desc    Get notification by ID
 * @route   GET /api/admin/notifications/:id
 * @access  Private (Admin)
 */
exports.getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await AdminNotification.findById(id);

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    return ApiResponse.success(res, 'Notification retrieved successfully', notification);
  } catch (error) {
    console.error('Get notification by ID error:', error);
    return ApiResponse.serverError(res, 'Error retrieving notification', error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/admin/notifications/:id/read
 * @access  Private (Admin)
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin?.id || req.user?.id;

    const notification = await AdminNotification.findById(id);

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    notification.status = 'read';
    
    // Add to readBy if not already there
    const alreadyRead = notification.readBy.some(
      r => r.adminId?.toString() === adminId?.toString()
    );
    
    if (!alreadyRead && adminId) {
      notification.readBy.push({ adminId, readAt: new Date() });
    }

    await notification.save();

    return ApiResponse.success(res, 'Notification marked as read', notification);
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return ApiResponse.serverError(res, 'Error marking notification as read', error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/admin/notifications/read-all
 * @access  Private (Admin)
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const { category } = req.query;
    
    const filter = { status: 'unread' };
    if (category && category !== 'all') {
      filter.category = category;
    }

    await AdminNotification.updateMany(filter, { status: 'read' });

    return ApiResponse.success(res, 'All notifications marked as read');
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return ApiResponse.serverError(res, 'Error marking all notifications as read', error);
  }
};

/**
 * @desc    Archive notification
 * @route   PUT /api/admin/notifications/:id/archive
 * @access  Private (Admin)
 */
exports.archiveNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await AdminNotification.findByIdAndUpdate(
      id,
      { status: 'archived' },
      { new: true }
    );

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    return ApiResponse.success(res, 'Notification archived', notification);
  } catch (error) {
    console.error('Archive notification error:', error);
    return ApiResponse.serverError(res, 'Error archiving notification', error);
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/admin/notifications/:id
 * @access  Private (Admin)
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await AdminNotification.findByIdAndDelete(id);

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    return ApiResponse.success(res, 'Notification deleted successfully');
  } catch (error) {
    console.error('Delete notification error:', error);
    return ApiResponse.serverError(res, 'Error deleting notification', error);
  }
};

/**
 * @desc    Get notification statistics
 * @route   GET /api/admin/notifications/stats
 * @access  Private (Admin)
 */
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    // Get various counts
    const [
      totalUnread,
      totalActionRequired,
      todayCount,
      weekCount,
      monthCount,
      byCategory,
      byType,
      byPriority
    ] = await Promise.all([
      AdminNotification.countDocuments({ status: 'unread' }),
      AdminNotification.countDocuments({ actionRequired: true, status: { $ne: 'archived' } }),
      AdminNotification.countDocuments({ createdAt: { $gte: today } }),
      AdminNotification.countDocuments({ createdAt: { $gte: thisWeek } }),
      AdminNotification.countDocuments({ createdAt: { $gte: thisMonth } }),
      AdminNotification.aggregate([
        { $match: { status: { $ne: 'archived' } } },
        { $group: { _id: '$category', count: { $sum: 1 }, unread: { $sum: { $cond: [{ $eq: ['$status', 'unread'] }, 1, 0] } } } }
      ]),
      AdminNotification.aggregate([
        { $match: { status: { $ne: 'archived' } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      AdminNotification.aggregate([
        { $match: { status: { $ne: 'archived' } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ]);

    return ApiResponse.success(res, 'Notification statistics retrieved', {
      totalUnread,
      totalActionRequired,
      todayCount,
      weekCount,
      monthCount,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = { total: item.count, unread: item.unread };
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    return ApiResponse.serverError(res, 'Error retrieving notification statistics', error);
  }
};

/**
 * @desc    Record action taken on notification
 * @route   PUT /api/admin/notifications/:id/action
 * @access  Private (Admin)
 */
exports.recordAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    const notification = await AdminNotification.findById(id);

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    notification.actionTaken = {
      action,
      takenBy: adminId,
      takenAt: new Date(),
      notes
    };
    notification.actionRequired = false;
    notification.status = 'read';

    await notification.save();

    return ApiResponse.success(res, 'Action recorded successfully', notification);
  } catch (error) {
    console.error('Record action error:', error);
    return ApiResponse.serverError(res, 'Error recording action', error);
  }
};

// ==================== HELPER FUNCTIONS FOR CREATING NOTIFICATIONS ====================

/**
 * Create notification for new organizer registration
 */
exports.notifyOrganizerRegistration = async (organizer) => {
  try {
    await AdminNotification.createNotification({
      type: 'organizer_registration',
      title: 'New Organizer Registration',
      message: `${organizer.name} (${organizer.companyName}) has registered as an organizer and is pending approval.`,
      priority: 'high',
      category: 'organizer',
      actionRequired: true,
      actionType: 'approve',
      entityType: 'Organizer',
      entityId: organizer._id,
      triggeredBy: {
        userType: 'Organizer',
        userId: organizer._id,
        name: organizer.name,
        email: organizer.email,
        phone: organizer.phone
      },
      metadata: {
        companyName: organizer.companyName,
        city: organizer.address?.city,
        state: organizer.address?.state
      },
      redirectUrl: `/admin?view=organizer-management`
    });
  } catch (error) {
    console.error('Error creating organizer registration notification:', error);
  }
};

/**
 * Create notification for new artist registration
 */
exports.notifyArtistRegistration = async (artist) => {
  try {
    await AdminNotification.createNotification({
      type: 'artist_registration',
      title: 'New Artist Registration',
      message: `${artist.name}${artist.stageName ? ` (${artist.stageName})` : ''} has registered as an artist and is pending approval.`,
      priority: 'high',
      category: 'artist',
      actionRequired: true,
      actionType: 'approve',
      entityType: 'Artist',
      entityId: artist._id,
      triggeredBy: {
        userType: 'Artist',
        userId: artist._id,
        name: artist.name,
        email: artist.email,
        phone: artist.phone
      },
      metadata: {
        stageName: artist.stageName,
        type: artist.type,
        city: artist.city
      },
      redirectUrl: `/admin?view=artist-approvals`
    });
  } catch (error) {
    console.error('Error creating artist registration notification:', error);
  }
};

/**
 * Create notification for new venue registration
 */
exports.notifyVenueRegistration = async (venue) => {
  try {
    await AdminNotification.createNotification({
      type: 'venue_registration',
      title: 'New Venue Registration',
      message: `${venue.name} has registered as a venue and is pending approval.`,
      priority: 'high',
      category: 'venue',
      actionRequired: true,
      actionType: 'approve',
      entityType: 'Venue',
      entityId: venue._id,
      triggeredBy: {
        userType: 'Venue',
        userId: venue._id,
        name: venue.ownerDetails?.fullName || venue.name,
        email: venue.email,
        phone: venue.phone
      },
      metadata: {
        businessName: venue.ownerDetails?.businessName,
        city: venue.location?.city,
        venueTypes: venue.venueClassification?.venueTypes
      },
      redirectUrl: `/admin?view=venue-management`
    });
  } catch (error) {
    console.error('Error creating venue registration notification:', error);
  }
};

/**
 * Create notification for new event creation
 */
exports.notifyEventCreated = async (event, organizer) => {
  try {
    await AdminNotification.createNotification({
      type: 'event_created',
      title: 'New Event Created',
      message: `"${event.title}" has been created by ${organizer?.name || 'an organizer'} and is pending approval.`,
      priority: 'high',
      category: 'event',
      actionRequired: true,
      actionType: 'approve',
      entityType: 'Event',
      entityId: event._id,
      triggeredBy: {
        userType: 'Organizer',
        userId: organizer?._id,
        name: organizer?.name,
        email: organizer?.email
      },
      metadata: {
        eventTitle: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        category: event.category,
        location: event.location
      },
      redirectUrl: `/admin?view=event-approvals`
    });
  } catch (error) {
    console.error('Error creating event created notification:', error);
  }
};

/**
 * Create notification when an organizer edits/updates an event
 */
exports.notifyEventUpdated = async (event, organizer) => {
  try {
    await AdminNotification.createNotification({
      type: 'event_updated',
      title: 'Event Updated',
      message: `"${event.title}" has been updated by ${organizer?.name || 'an organizer'} and requires review.`,
      priority: 'high',
      category: 'event',
      actionRequired: true,
      actionType: 'review',
      entityType: 'Event',
      entityId: event._id,
      triggeredBy: {
        userType: 'Organizer',
        userId: organizer?._id,
        name: organizer?.name,
        email: organizer?.email
      },
      metadata: {
        eventTitle: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        category: event.category,
        location: event.location
      },
      redirectUrl: `/admin?view=event-approvals`
    });
  } catch (error) {
    console.error('Error creating event updated notification:', error);
  }
};

/**
 * Mark ALL notifications for an entity as completed (archive)
 */
exports.markEntityNotificationsCompleted = async (entityType, entityId, action, adminId) => {
  try {
    await AdminNotification.updateMany(
      { entityType, entityId, status: { $ne: 'archived' } },
      {
        $set: {
          status: 'archived',
          actionRequired: false,
          actionTaken: {
            action,
            takenBy: adminId,
            takenAt: new Date(),
            notes: `${entityType} ${action} by admin`
          }
        }
      }
    );
  } catch (error) {
    console.error('Error marking entity notifications as completed:', error);
  }
};

/**
 * Create notification for sports partner registration
 */
exports.notifySportsPartnerRegistration = async (partner) => {
  try {
    await AdminNotification.createNotification({
      type: 'sports_partner_registration',
      title: 'New Sports Partner Registration',
      message: `${partner.businessName || partner.ownerName} has registered as a sports partner and is pending approval.`,
      priority: 'high',
      category: 'sports',
      actionRequired: true,
      actionType: 'approve',
      entityType: 'ArenaPartner',
      entityId: partner._id,
      triggeredBy: {
        userType: 'ArenaPartner',
        userId: partner._id,
        name: partner.ownerName,
        email: partner.email,
        phone: partner.phone
      },
      metadata: {
        businessName: partner.businessName,
        city: partner.address?.city
      },
      redirectUrl: `/admin/sports/partners`
    });
  } catch (error) {
    console.error('Error creating sports partner registration notification:', error);
  }
};

/**
 * Create notification for sports venue creation
 */
exports.notifySportsVenueCreated = async (venue, partner) => {
  try {
    await AdminNotification.createNotification({
      type: 'sports_venue_created',
      title: 'New Sports Venue Created',
      message: `"${venue.venueName}" has been created by ${partner?.businessName || partner?.ownerName || 'a sports partner'} and is pending approval.`,
      priority: 'medium',
      category: 'sports',
      actionRequired: true,
      actionType: 'approve',
      entityType: 'SportsVenue',
      entityId: venue._id,
      triggeredBy: {
        userType: 'ArenaPartner',
        userId: partner?._id,
        name: partner?.ownerName,
        email: partner?.email
      },
      metadata: {
        venueName: venue.venueName,
        sportsSupported: venue.sportsSupported,
        city: venue.address?.city
      },
      redirectUrl: `/admin/sports/venues`
    });
  } catch (error) {
    console.error('Error creating sports venue notification:', error);
  }
};

/**
 * Create notification for court creation
 */
exports.notifyCourtCreated = async (court, venue, partner) => {
  try {
    await AdminNotification.createNotification({
      type: 'court_created',
      title: 'New Court Created',
      message: `"${court.name}" has been added to ${venue?.venueName || 'a sports venue'}.`,
      priority: 'low',
      category: 'sports',
      actionRequired: false,
      entityType: 'Court',
      entityId: court._id,
      triggeredBy: {
        userType: 'ArenaPartner',
        userId: partner?._id,
        name: partner?.ownerName
      },
      metadata: {
        courtName: court.name,
        sportType: court.sportType,
        venueName: venue?.venueName
      },
      redirectUrl: `/admin/sports/venues`
    });
  } catch (error) {
    console.error('Error creating court notification:', error);
  }
};

/**
 * Create notification for new booking
 */
exports.notifyBookingCreated = async (booking, event, user) => {
  try {
    await AdminNotification.createNotification({
      type: 'booking_created',
      title: 'New Booking',
      message: `${user?.name || 'A user'} booked ${booking.quantity} ticket(s) for "${event?.title || 'an event'}" - ₹${booking.total}`,
      priority: 'low',
      category: 'booking',
      actionRequired: false,
      entityType: 'Booking',
      entityId: booking._id,
      triggeredBy: {
        userType: 'User',
        userId: user?._id,
        name: user?.name,
        email: user?.email,
        phone: user?.phone
      },
      metadata: {
        eventTitle: event?.title,
        ticketType: booking.ticketType,
        quantity: booking.quantity,
        total: booking.total
      },
      redirectUrl: `/admin?view=bookings`
    });
  } catch (error) {
    console.error('Error creating booking notification:', error);
  }
};

/**
 * Create notification for payment failure
 */
exports.notifyPaymentFailed = async (payment, user) => {
  try {
    await AdminNotification.createNotification({
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `Payment of ₹${payment.amount} failed for ${user?.name || 'a user'}. Reason: ${payment.failureReason || 'Unknown'}`,
      priority: 'medium',
      category: 'payment',
      actionRequired: true,
      actionType: 'review',
      entityType: 'Payment',
      entityId: payment._id,
      triggeredBy: {
        userType: 'User',
        userId: user?._id,
        name: user?.name,
        email: user?.email
      },
      metadata: {
        amount: payment.amount,
        failureReason: payment.failureReason,
        paymentId: payment.razorpayPaymentId
      },
      redirectUrl: `/admin?view=failed-payments`
    });
  } catch (error) {
    console.error('Error creating payment failed notification:', error);
  }
};

/**
 * Create notification for support ticket
 */
exports.notifySupportTicketCreated = async (ticket, user) => {
  try {
    await AdminNotification.createNotification({
      type: 'support_ticket_created',
      title: 'New Support Ticket',
      message: `${user?.name || 'A user'} created a support ticket: "${ticket.subject}"`,
      priority: ticket.priority === 'urgent' ? 'urgent' : 'medium',
      category: 'support',
      actionRequired: true,
      actionType: 'respond',
      entityType: 'SupportTicket',
      entityId: ticket._id,
      triggeredBy: {
        userType: 'User',
        userId: user?._id,
        name: user?.name,
        email: user?.email
      },
      metadata: {
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority
      },
      redirectUrl: `/admin?view=support`
    });
  } catch (error) {
    console.error('Error creating support ticket notification:', error);
  }
};

/**
 * Create notification for new user registration
 */
exports.notifyUserRegistration = async (user) => {
  try {
    await AdminNotification.createNotification({
      type: 'user_registered',
      title: 'New User Registration',
      message: `${user.name} has registered on the platform.`,
      priority: 'low',
      category: 'user',
      actionRequired: false,
      entityType: 'User',
      entityId: user._id,
      triggeredBy: {
        userType: 'User',
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      redirectUrl: `/admin?view=users`
    });
  } catch (error) {
    console.error('Error creating user registration notification:', error);
  }
};

/**
 * Create system alert notification
 */
exports.notifySystemAlert = async (title, message, priority = 'high') => {
  try {
    await AdminNotification.createNotification({
      type: 'system_alert',
      title,
      message,
      priority,
      category: 'system',
      actionRequired: priority === 'urgent',
      actionType: priority === 'urgent' ? 'review' : 'none',
      triggeredBy: {
        userType: 'System'
      }
    });
  } catch (error) {
    console.error('Error creating system alert notification:', error);
  }
};

/**
 * Mark notification as completed when admin takes action
 * @param {string} entityType - The entity type (Event, Organizer, Artist, Venue, etc.)
 * @param {string} entityId - The entity ID
 * @param {string} action - The action taken (approved, rejected, etc.)
 * @param {string} adminId - The admin who took the action
 */
exports.markNotificationCompleted = async (entityType, entityId, action, adminId) => {
  try {
    const notification = await AdminNotification.findOne({
      entityType,
      entityId,
      status: { $ne: 'archived' }
    });

    if (notification) {
      notification.status = 'archived';
      notification.actionRequired = false;
      notification.actionTaken = {
        action,
        takenBy: adminId,
        takenAt: new Date(),
        notes: `${entityType} ${action} by admin`
      };
      await notification.save();
    }
  } catch (error) {
    console.error('Error marking notification as completed:', error);
  }
};

module.exports = exports;
