const ArtistAnalyticsService = require('../services/artistAnalyticsService');
const ArtistNotificationService = require('../services/artistNotificationService');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Get artist dashboard statistics
 * @route   GET /api/artist/analytics/dashboard
 * @access  Private (Artist only)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {};
    
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;
    
    const stats = await ArtistAnalyticsService.getDashboardStats(req.user.id, dateRange);
    
    return ApiResponse.success(res, 'Dashboard statistics retrieved successfully', {
      stats
    });

  } catch (error) {
    console.error('Get Dashboard Stats Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving dashboard statistics', error.message);
  }
};

/**
 * @desc    Get artist performance metrics
 * @route   GET /api/artist/analytics/performance
 * @access  Private (Artist only)
 */
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const metrics = await ArtistAnalyticsService.getPerformanceMetrics(req.user.id);
    
    return ApiResponse.success(res, 'Performance metrics retrieved successfully', {
      metrics
    });

  } catch (error) {
    console.error('Get Performance Metrics Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving performance metrics', error.message);
  }
};

/**
 * @desc    Get event type analytics
 * @route   GET /api/artist/analytics/event-types
 * @access  Private (Artist only)
 */
exports.getEventTypeAnalytics = async (req, res) => {
  try {
    const analytics = await ArtistAnalyticsService.getEventTypeAnalytics(req.user.id);
    
    return ApiResponse.success(res, 'Event type analytics retrieved successfully', {
      analytics
    });

  } catch (error) {
    console.error('Get Event Type Analytics Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving event type analytics', error.message);
  }
};

/**
 * @desc    Get availability metrics
 * @route   GET /api/artist/analytics/availability
 * @access  Private (Artist only)
 */
exports.getAvailabilityMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {};
    
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;
    
    const metrics = await ArtistAnalyticsService.getAvailabilityMetrics(req.user.id, dateRange);
    
    return ApiResponse.success(res, 'Availability metrics retrieved successfully', {
      metrics
    });

  } catch (error) {
    console.error('Get Availability Metrics Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving availability metrics', error.message);
  }
};

/**
 * @desc    Get client analytics
 * @route   GET /api/artist/analytics/clients
 * @access  Private (Artist only)
 */
exports.getClientAnalytics = async (req, res) => {
  try {
    const analytics = await ArtistAnalyticsService.getClientAnalytics(req.user.id);
    
    return ApiResponse.success(res, 'Client analytics retrieved successfully', {
      analytics
    });

  } catch (error) {
    console.error('Get Client Analytics Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving client analytics', error.message);
  }
};

/**
 * @desc    Generate comprehensive analytics report
 * @route   GET /api/artist/analytics/report
 * @access  Private (Artist only)
 */
exports.generateAnalyticsReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const options = {};
    
    if (startDate || endDate) {
      options.dateRange = {};
      if (startDate) options.dateRange.startDate = startDate;
      if (endDate) options.dateRange.endDate = endDate;
    }
    
    const report = await ArtistAnalyticsService.generateAnalyticsReport(req.user.id, options);
    
    return ApiResponse.success(res, 'Analytics report generated successfully', {
      report
    });

  } catch (error) {
    console.error('Generate Analytics Report Error:', error);
    return ApiResponse.serverError(res, 'Error generating analytics report', error.message);
  }
};

/**
 * @desc    Get artist notifications
 * @route   GET /api/artist/notifications
 * @access  Private (Artist only)
 */
exports.getNotifications = async (req, res) => {
  try {
    const { limit = 10, unreadOnly = false } = req.query;
    
    let notifications;
    if (unreadOnly === 'true') {
      notifications = await ArtistNotificationService.getUnreadNotifications(req.user.id, parseInt(limit));
    } else {
      // Get all notifications (you might want to implement this method)
      notifications = await ArtistNotificationService.getUnreadNotifications(req.user.id, parseInt(limit));
    }
    
    return ApiResponse.success(res, 'Notifications retrieved successfully', {
      notifications
    });

  } catch (error) {
    console.error('Get Notifications Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving notifications', error.message);
  }
};

/**
 * @desc    Mark notifications as read
 * @route   PUT /api/artist/notifications/mark-read
 * @access  Private (Artist only)
 */
exports.markNotificationsAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return ApiResponse.badRequest(res, 'Notification IDs array is required');
    }
    
    await ArtistNotificationService.markNotificationsAsRead(req.user.id, notificationIds);
    
    return ApiResponse.success(res, 'Notifications marked as read successfully');

  } catch (error) {
    console.error('Mark Notifications Read Error:', error);
    return ApiResponse.serverError(res, 'Error marking notifications as read', error.message);
  }
};

module.exports = {
  getDashboardStats: exports.getDashboardStats,
  getPerformanceMetrics: exports.getPerformanceMetrics,
  getEventTypeAnalytics: exports.getEventTypeAnalytics,
  getAvailabilityMetrics: exports.getAvailabilityMetrics,
  getClientAnalytics: exports.getClientAnalytics,
  generateAnalyticsReport: exports.generateAnalyticsReport,
  getNotifications: exports.getNotifications,
  markNotificationsAsRead: exports.markNotificationsAsRead
};
