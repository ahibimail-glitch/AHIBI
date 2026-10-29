const mongoose = require('mongoose');

const AdminNotificationSchema = new mongoose.Schema({
  // Notification type/category
  type: {
    type: String,
    enum: [
      'organizer_registration',
      'organizer_approved',
      'organizer_rejected',
      'artist_registration',
      'artist_approved',
      'artist_rejected',
      'venue_registration',
      'venue_approved',
      'venue_rejected',
      'event_created',
      'event_updated',
      'event_approved',
      'event_rejected',
      'event_paused',
      'event_resumed',
      'sports_partner_registration',
      'sports_partner_approved',
      'sports_partner_rejected',
      'sports_venue_created',
      'sports_venue_approved',
      'sports_venue_rejected',
      'court_created',
      'court_approved',
      'court_rejected',
      'booking_created',
      'booking_cancelled',
      'payment_received',
      'payment_failed',
      'refund_requested',
      'refund_processed',
      'support_ticket_created',
      'support_ticket_resolved',
      'user_registered',
      'user_blocked',
      'payout_requested',
      'payout_processed',
      'system_alert',
      'other'
    ],
    required: true
  },
  
  // Title for the notification
  title: {
    type: String,
    required: [true, 'Notification title is required']
  },
  
  // Detailed message
  message: {
    type: String,
    required: [true, 'Notification message is required']
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Category for filtering
  category: {
    type: String,
    enum: ['organizer', 'artist', 'venue', 'event', 'sports', 'booking', 'payment', 'support', 'user', 'system'],
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  
  // Action required flag
  actionRequired: {
    type: Boolean,
    default: false
  },
  
  // Action type if action is required
  actionType: {
    type: String,
    enum: ['approve', 'reject', 'review', 'respond', 'process', 'none'],
    default: 'none'
  },
  
  // Reference to the related entity
  entityType: {
    type: String,
    enum: ['Organizer', 'Artist', 'Venue', 'Event', 'SportsVenue', 'Court', 'ArenaPartner', 'Booking', 'User', 'SupportTicket', 'Payout', 'Payment']
  },
  
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entityType'
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Who triggered this notification (if applicable)
  triggeredBy: {
    userType: {
      type: String,
      enum: ['User', 'Organizer', 'Artist', 'Venue', 'ArenaPartner', 'Admin', 'System']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId
    },
    name: String,
    email: String,
    phone: String
  },
  
  // Read by which admins
  readBy: [{
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Action taken
  actionTaken: {
    action: String,
    takenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    takenAt: Date,
    notes: String
  },
  
  // Redirect URL for quick navigation
  redirectUrl: {
    type: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date
  }
});

// Indexes for efficient querying
AdminNotificationSchema.index({ status: 1, createdAt: -1 });
AdminNotificationSchema.index({ category: 1, createdAt: -1 });
AdminNotificationSchema.index({ type: 1, createdAt: -1 });
AdminNotificationSchema.index({ actionRequired: 1, status: 1 });
AdminNotificationSchema.index({ priority: 1, createdAt: -1 });
AdminNotificationSchema.index(
  { 'metadata.dedupeKey': 1 },
  {
    name: 'admin_notification_dedupe_key_unique',
    unique: true,
    partialFilterExpression: { 'metadata.dedupeKey': { $type: 'string' } },
  }
);

// Static method to create notification
AdminNotificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating admin notification:', error);
    throw error;
  }
};

// Static method to get unread count
AdminNotificationSchema.statics.getUnreadCount = async function() {
  return await this.countDocuments({ status: 'unread' });
};

// Static method to get action required count
AdminNotificationSchema.statics.getActionRequiredCount = async function() {
  return await this.countDocuments({ actionRequired: true, status: { $ne: 'archived' } });
};

module.exports = mongoose.model('AdminNotification', AdminNotificationSchema);
