/**
 * LiveStream Model
 * Stores live stream metadata and links to sports events
 */

const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema({
  // Event reference (e.g., wrestling championship)
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    index: true
  },
  
  // Sports event reference (for sports-specific events)
  sportsEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SportsVenue',
    index: true
  },

  // Stream metadata
  title: {
    type: String,
    required: [true, 'Stream title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },

  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  // Mux stream identifiers (stored securely, never exposed to frontend)
  muxStreamId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Stream key is sensitive - only shown to admin once
  muxStreamKey: {
    type: String,
    required: true,
    select: false // Never returned in queries by default
  },

  // Playback ID for generating signed tokens
  muxPlaybackId: {
    type: String,
    required: true,
    index: true
  },

  // RTMP ingest URL
  rtmpUrl: {
    type: String,
    default: 'rtmps://global-live.mux.com:443/app'
  },

  // Stream status
  status: {
    type: String,
    enum: ['idle', 'active', 'disabled', 'ended'],
    default: 'idle'
  },

  // Mux status (from Mux API)
  muxStatus: {
    type: String,
    enum: ['idle', 'active', 'disabled'],
    default: 'idle'
  },

  // Stream configuration
  latencyMode: {
    type: String,
    enum: ['low', 'reduced', 'standard'],
    default: 'low'
  },

  reconnectWindow: {
    type: Number,
    default: 60 // seconds
  },

  maxContinuousDuration: {
    type: Number,
    default: 43200 // 12 hours in seconds
  },

  // VOD asset ID (created after stream ends)
  vodAssetId: {
    type: String,
    default: null
  },

  vodPlaybackId: {
    type: String,
    default: null
  },

  // Access control
  accessType: {
    type: String,
    enum: ['public', 'ticket_holders', 'subscribers', 'private'],
    default: 'ticket_holders'
  },

  // Price for pay-per-view (if applicable)
  price: {
    type: Number,
    default: 0,
    min: 0
  },

  currency: {
    type: String,
    default: 'INR'
  },

  // Scheduling
  scheduledStartTime: {
    type: Date,
    index: true
  },

  scheduledEndTime: {
    type: Date
  },

  actualStartTime: {
    type: Date
  },

  actualEndTime: {
    type: Date
  },

  // Thumbnail/poster
  thumbnailUrl: {
    type: String
  },

  posterUrl: {
    type: String
  },

  // Analytics
  peakViewers: {
    type: Number,
    default: 0
  },

  totalViews: {
    type: Number,
    default: 0
  },

  // Admin who created the stream
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for common queries
liveStreamSchema.index({ status: 1, scheduledStartTime: 1 });
liveStreamSchema.index({ createdAt: -1 });
liveStreamSchema.index({ isDeleted: 1, status: 1 });

// Virtual for checking if stream is currently live
liveStreamSchema.virtual('isLive').get(function() {
  return this.status === 'active' && this.muxStatus === 'active';
});

// Virtual for checking if VOD is available
liveStreamSchema.virtual('hasVod').get(function() {
  return !!this.vodAssetId && !!this.vodPlaybackId;
});

// Method to check if user has access to stream
liveStreamSchema.methods.checkAccess = async function(userId, userBookings = []) {
  // Public streams are accessible to all
  if (this.accessType === 'public') {
    return { hasAccess: true, reason: 'public' };
  }

  // Private streams require admin access
  if (this.accessType === 'private') {
    return { hasAccess: false, reason: 'private' };
  }

  // Ticket holders need valid booking
  if (this.accessType === 'ticket_holders') {
    const hasValidBooking = userBookings.some(booking => {
      const eventMatch = this.eventId && 
        booking.event?.toString() === this.eventId.toString();
      const sportsMatch = this.sportsEventId && 
        booking.sportsEvent?.toString() === this.sportsEventId.toString();
      return (eventMatch || sportsMatch) && booking.status === 'confirmed';
    });

    if (hasValidBooking) {
      return { hasAccess: true, reason: 'ticket_holder' };
    }
    return { hasAccess: false, reason: 'no_ticket' };
  }

  return { hasAccess: false, reason: 'unknown' };
};

// Static method to find active streams
liveStreamSchema.statics.findActiveStreams = function() {
  return this.find({
    isDeleted: false,
    status: 'active',
    muxStatus: 'active'
  }).sort({ actualStartTime: -1 });
};

// Static method to find upcoming streams
liveStreamSchema.statics.findUpcomingStreams = function(limit = 10) {
  return this.find({
    isDeleted: false,
    status: 'idle',
    scheduledStartTime: { $gte: new Date() }
  })
  .sort({ scheduledStartTime: 1 })
  .limit(limit);
};

// Pre-save middleware
liveStreamSchema.pre('save', function(next) {
  // Update status based on muxStatus
  if (this.isModified('muxStatus')) {
    if (this.muxStatus === 'active') {
      this.status = 'active';
      if (!this.actualStartTime) {
        this.actualStartTime = new Date();
      }
    } else if (this.muxStatus === 'disabled') {
      this.status = 'disabled';
    }
  }
  next();
});

// Ensure virtuals are included in JSON output
liveStreamSchema.set('toJSON', { virtuals: true });
liveStreamSchema.set('toObject', { virtuals: true });

const LiveStream = mongoose.model('LiveStream', liveStreamSchema);

module.exports = LiveStream;
