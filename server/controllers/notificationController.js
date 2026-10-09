const Notification = require('../models/Notification');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

/**
 * @desc    Get all notifications for a user
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, unreadOnly } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter = { user: req.user.id };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }
    
    // Get notifications with pagination
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const total = await Notification.countDocuments(filter);
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false
    });
    
    return ApiResponse.success(res, 'Notifications retrieved successfully', {
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return ApiResponse.serverError(res, 'Error retrieving notifications', error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({
      _id: id,
      user: req.user.id
    });
    
    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }
    
    notification.isRead = true;
    await notification.save();
    
    return ApiResponse.success(res, 'Notification marked as read');
  } catch (error) {
    console.error('Mark notification read error:', error);
    return ApiResponse.serverError(res, 'Error marking notification as read', error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
exports.markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );
    
    return ApiResponse.success(res, 'All notifications marked as read');
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return ApiResponse.serverError(res, 'Error marking all notifications as read', error);
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({
      _id: id,
      user: req.user.id
    });
    
    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }
    
    await notification.deleteOne();
    
    return ApiResponse.success(res, 'Notification deleted successfully');
  } catch (error) {
    console.error('Delete notification error:', error);
    return ApiResponse.serverError(res, 'Error deleting notification', error);
  }
};

/**
 * @desc    Create and send a notification
 * @param   {Object} options - Notification options
 * @param   {String} options.userId - User ID to notify
 * @param   {String} options.title - Notification title
 * @param   {String} options.message - Notification message
 * @param   {String} options.type - Notification type (info, success, warning, error)
 * @param   {String} options.category - Notification category
 * @param   {Object} options.data - Additional data
 * @param   {String} options.redirectUrl - URL to redirect to when clicked
 * @param   {Boolean} options.sendEmail - Whether to send an email
 * @param   {Boolean} options.sendSms - Whether to send an SMS
 * @param   {Boolean} options.sendPush - Whether to send a push notification
 * @returns {Promise<Object>} - Created notification
 */
exports.sendNotification = async (options) => {
  try {
    const {
      userId,
      title,
      message,
      type = 'info',
      category,
      data = {},
      redirectUrl,
      sendEmail = false,
      sendSms = false,
      sendPush = false
    } = options;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Create notification
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      category,
      data,
      redirectUrl,
      deliveryChannels: {
        inApp: true,
        email: sendEmail,
        sms: sendSms,
        push: sendPush
      }
    });
    
    await notification.save();
    
    // Send email if requested and email exists
    if (sendEmail && user.email) {
      // Use appropriate email template based on category
      let emailResult;
      
      // Generic email for now, but in production would use specific templates
      const emailOptions = {
        to: user.email,
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <img src="https://ahibi.com/logo.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
            <h1 style="color: #4a154b; margin-bottom: 20px;">${title}</h1>
            <p>${message}</p>
            ${redirectUrl ? `<p><a href="${redirectUrl}" style="background-color: #4a154b; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">View Details</a></p>` : ''}
            <p>Best regards,<br>The Ahibi Team</p>
          </div>
        `
      };
      
      emailResult = await emailService.sendMail(emailOptions);
      
      if (emailResult.success) {
        notification.deliveryChannels.email.sent = true;
        notification.deliveryChannels.email.sentAt = new Date();
        await notification.save();
      }
    }
    
    // Send SMS if requested
    if (sendSms && user.phone) {
      // For SMS we need a shorter message
      const smsMessage = `${title}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;
      
      const smsResult = await smsService.sendSms(user.phone, smsMessage);
      
      if (smsResult.success) {
        notification.deliveryChannels.sms.sent = true;
        notification.deliveryChannels.sms.sentAt = new Date();
        await notification.save();
      }
    }
    
    // Push notification would be implemented with a push notification service
    if (sendPush) {
      // TODO: Implement push notifications when required
    }
    
    return notification;
  } catch (error) {
    console.error('Send notification error:', error);
    throw error;
  }
};

/**
 * @desc    Send notification to multiple users
 * @param   {Object} options - Notification options
 * @param   {Array} options.userIds - User IDs to notify
 * @param   {String} options.title - Notification title
 * @param   {String} options.message - Notification message
 * @param   {String} options.type - Notification type
 * @param   {String} options.category - Notification category
 * @param   {Object} options.data - Additional data
 * @param   {String} options.redirectUrl - URL to redirect to when clicked
 * @param   {Boolean} options.sendEmail - Whether to send an email
 * @param   {Boolean} options.sendSms - Whether to send an SMS
 * @param   {Boolean} options.sendPush - Whether to send a push notification
 * @returns {Promise<Array>} - Created notifications
 */
exports.sendBulkNotifications = async (options) => {
  const { userIds, ...notificationOptions } = options;
  
  const notifications = [];
  
  for (const userId of userIds) {
    try {
      const notification = await this.sendNotification({
        userId,
        ...notificationOptions
      });
      
      notifications.push(notification);
    } catch (error) {
      console.error(`Error sending notification to user ${userId}:`, error);
    }
  }
  
  return notifications;
};
