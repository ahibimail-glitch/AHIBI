const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Notification title is required']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required']
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  category: {
    type: String,
    enum: ['booking', 'payment', 'event', 'system', 'approval', 'payout', 'support'],
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  data: {
    // Additional data related to the notification
    type: mongoose.Schema.Types.Mixed
  },
  deliveryChannels: {
    // Tracks which channels this notification was sent through
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false,
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date
    },
    sms: {
      type: Boolean,
      default: false,
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date
    },
    push: {
      type: Boolean,
      default: false,
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date
    }
  },
  redirectUrl: {
    // URL to redirect to when notification is clicked (for in-app)
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    // Optional expiry date for temporary notifications
    type: Date
  }
});

// Index for quick user queries and pagination
NotificationSchema.index({ user: 1, createdAt: -1 });

// Index for finding unread notifications
NotificationSchema.index({ user: 1, isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
