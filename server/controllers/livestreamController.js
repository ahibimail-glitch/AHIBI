/**
 * LiveStream Controller
 * Handles all livestream-related operations
 */

const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const LiveStream = require('../models/LiveStream');
const Booking = require('../models/Booking');
const SportsBooking = require('../models/SportsBooking');
const LivestreamPurchase = require('../models/LivestreamPurchase');
const LivestreamSession = require('../models/LivestreamSession');
const muxService = require('../services/muxService');

/**
 * @desc    Create a new live stream (Admin only)
 * @route   POST /api/livestream/admin/create
 * @access  Private/Admin
 */
const createLiveStream = asyncHandler(async (req, res) => {
  const {
    eventTitle,
    description,
    eventId,
    sportsEventId,
    accessType = 'paid',
    price = 0,
    scheduledStartTime,
    scheduledEndTime,
    latencyMode = 'low',
    thumbnailUrl,
    posterUrl,
    embedUrl
  } = req.body;

  if (!eventTitle) {
    return res.status(400).json({
      success: false,
      message: 'Event title is required'
    });
  }

  if (accessType === 'paid' && price <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Price is required for paid access'
    });
  }

  try {
    const muxResult = await muxService.createLiveStream({
      playbackPolicy: 'public',
      latencyMode,
      reconnectWindow: 60,
      maxContinuousDuration: 43200,
      newAssetSettings: {
        playback_policy: ['public'],
        mp4_support: 'standard'
      }
    });

    if (!muxResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create Mux live stream'
      });
    }

    const liveStream = await LiveStream.create({
      title: eventTitle,
      description,
      eventId: eventId || null,
      sportsEventId: sportsEventId || null,
      muxStreamId: muxResult.data.streamId,
      muxStreamKey: muxResult.data.streamKey,
      muxPlaybackId: muxResult.data.playbackId,
      rtmpUrl: muxResult.data.rtmpUrl,
      latencyMode: muxResult.data.latencyMode,
      reconnectWindow: muxResult.data.reconnectWindow,
      maxContinuousDuration: muxResult.data.maxContinuousDuration,
      accessType,
      price,
      scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : null,
      scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : null,
      thumbnailUrl,
      posterUrl,
      embedUrl: embedUrl?.trim() || null,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Live stream created successfully',
      data: {
        id: liveStream._id,
        title: liveStream.title,
        description: liveStream.description,
        status: liveStream.status,
        accessType: liveStream.accessType,
        price: liveStream.price,
        scheduledStartTime: liveStream.scheduledStartTime,
        obsConfig: {
          rtmpUrl: liveStream.rtmpUrl,
          streamKey: muxResult.data.streamKey,
          fullUrl: `${liveStream.rtmpUrl}/${muxResult.data.streamKey}`
        },
        obsRecommendedSettings: {
          encoder: 'x264 or NVENC',
          bitrate: '10000-16000 kbps',
          resolution: '1920x1080',
          framerate: '30 fps',
          keyframeInterval: '2 seconds',
          profile: 'high',
          tune: 'zerolatency'
        }
      }
    });
  } catch (error) {
    console.error('Create live stream error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create live stream'
    });
  }
});

/**
 * @desc    Get all live streams (Admin only)
 * @route   GET /api/livestream/admin/streams
 * @access  Private/Admin
 */
const getAllStreams = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const query = { isDeleted: false };
  if (status) {
    query.status = status;
  }

  const streams = await LiveStream.find(query)
    .select('-muxStreamKey')
    .populate('eventId', 'title')
    .populate('sportsEventId', 'name')
    .populate('createdBy', 'username')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await LiveStream.countDocuments(query);

  res.json({
    success: true,
    data: streams,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get stream details (Admin only - includes sensitive data)
 * @route   GET /api/livestream/admin/streams/:id
 * @access  Private/Admin
 */
const getStreamDetails = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findById(req.params.id)
    .select('+muxStreamKey')
    .populate('eventId', 'title')
    .populate('sportsEventId', 'name')
    .populate('createdBy', 'username');

  if (!stream) {
    return res.status(404).json({
      success: false,
      message: 'Stream not found'
    });
  }

  try {
    const muxStatus = await muxService.getLiveStream(stream.muxStreamId);
    
    res.json({
      success: true,
      data: {
        ...stream.toObject(),
        muxLiveStatus: muxStatus.data,
        obsConfig: {
          rtmpUrl: stream.rtmpUrl,
          streamKey: stream.muxStreamKey,
          fullUrl: `${stream.rtmpUrl}/${stream.muxStreamKey}`
        }
      }
    });
  } catch (error) {
    res.json({
      success: true,
      data: stream,
      muxError: error.message
    });
  }
});

/**
 * @desc    Enable/Start a live stream (Admin only)
 * @route   POST /api/livestream/admin/streams/:id/enable
 * @access  Private/Admin
 */
const enableStream = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findById(req.params.id);

  if (!stream) {
    return res.status(404).json({
      success: false,
      message: 'Stream not found'
    });
  }

  try {
    await muxService.setStreamEnabled(stream.muxStreamId, true);
    
    stream.status = 'idle';
    stream.muxStatus = 'idle';
    await stream.save();

    res.json({
      success: true,
      message: 'Stream enabled successfully',
      data: { status: stream.status }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @desc    Disable/Stop a live stream (Admin only)
 * @route   POST /api/livestream/admin/streams/:id/disable
 * @access  Private/Admin
 */
const disableStream = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findById(req.params.id);

  if (!stream) {
    return res.status(404).json({
      success: false,
      message: 'Stream not found'
    });
  }

  try {
    await muxService.setStreamEnabled(stream.muxStreamId, false);
    
    stream.status = 'disabled';
    stream.muxStatus = 'disabled';
    stream.actualEndTime = new Date();
    await stream.save();

    res.json({
      success: true,
      message: 'Stream disabled successfully',
      data: { status: stream.status }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @desc    Reset stream key (Admin only)
 * @route   POST /api/livestream/admin/streams/:id/reset-key
 * @access  Private/Admin
 */
const resetStreamKey = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findById(req.params.id).select('+muxStreamKey');

  if (!stream) {
    return res.status(404).json({
      success: false,
      message: 'Stream not found'
    });
  }

  try {
    const result = await muxService.resetStreamKey(stream.muxStreamId);
    
    stream.muxStreamKey = result.data.streamKey;
    await stream.save();

    res.json({
      success: true,
      message: 'Stream key reset successfully',
      data: {
        obsConfig: {
          rtmpUrl: stream.rtmpUrl,
          streamKey: result.data.streamKey,
          fullUrl: `${stream.rtmpUrl}/${result.data.streamKey}`
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @desc    Update custom embed URL for a live stream (Admin only)
 * @route   PUT /api/livestream/admin/streams/:id/embed-url
 * @access  Private/Admin
 */
const updateEmbedUrl = asyncHandler(async (req, res) => {
  const { embedUrl } = req.body;

  const stream = await LiveStream.findById(req.params.id);

  if (!stream) {
    return res.status(404).json({
      success: false,
      message: 'Stream not found'
    });
  }

  stream.embedUrl = embedUrl?.trim() || null;
  await stream.save();

  res.json({
    success: true,
    message: 'Embed URL updated successfully',
    data: {
      embedUrl: stream.embedUrl
    }
  });
});

/**
 * @desc    Delete a live stream (Admin only)
 * @route   DELETE /api/livestream/admin/streams/:id
 * @access  Private/Admin
 */
const deleteStream = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findById(req.params.id);

  if (!stream) {
    return res.status(404).json({
      success: false,
      message: 'Stream not found'
    });
  }

  try {
    await muxService.deleteLiveStream(stream.muxStreamId);
    
    stream.isDeleted = true;
    stream.status = 'ended';
    await stream.save();

    res.json({
      success: true,
      message: 'Stream deleted successfully'
    });
  } catch (error) {
    stream.isDeleted = true;
    stream.status = 'ended';
    await stream.save();

    res.json({
      success: true,
      message: 'Stream marked as deleted (Mux cleanup may have failed)',
      warning: error.message
    });
  }
});

/**
 * @desc    Get public stream info (for viewers)
 * @route   GET /api/livestream/streams/:id
 * @access  Public
 */
const getPublicStreamInfo = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findOne({
    _id: req.params.id,
    isDeleted: false
  })
    .select('title description status scheduledStartTime scheduledEndTime thumbnailUrl posterUrl accessType price eventId sportsEventId embedUrl')
    .populate('eventId', 'title')
    .populate('sportsEventId', 'name');

  if (!stream) {
    return res.status(404).json({
      success: false,
      message: 'Stream not found'
    });
  }

  res.json({
    success: true,
    data: stream
  });
});

/**
 * @desc    Get signed playback token (Authenticated users only)
 * @route   GET /api/livestream/streams/:id/playback-token
 * @access  Private
 */
const getPlaybackToken = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findOne({
    _id: req.params.id,
    isDeleted: false
  });

  if (!stream) {
    return res.status(404).json({
      success: false,
      message: 'Stream not found'
    });
  }

  // Check access based on accessType (with name-based logic)
  if (stream.accessType !== 'public') {
    let hasAccess = false;
    let accessReason = '';

    // Check for paid access (with name-based logic)
    if (stream.accessType === 'paid') {
      // First try to find purchase for this specific stream
      const purchase = await LivestreamPurchase.findUserValidAccess(req.user._id, stream._id);
      if (purchase) {
        hasAccess = true;
        accessReason = 'paid_access';
      } else {
        // If no specific purchase, check if user has purchased any livestream with the same title
        const allStreams = await LiveStream.find({ title: stream.title });
        const streamIds = allStreams.map(s => s._id);
        
        if (streamIds.length > 0) {
          const nameBasedPurchase = await LivestreamPurchase.findOne({
            user: req.user._id,
            livestream: { $in: streamIds },
            status: 'completed',
            accessGranted: true,
            $or: [
              { accessExpiresAt: { $exists: false } },
              { accessExpiresAt: { $gt: new Date() } }
            ]
          });
          
          if (nameBasedPurchase) {
            hasAccess = true;
            accessReason = 'paid_access_name_based';
          }
        }
      }
      
      // Admin override
      if (!hasAccess && req.user?.role === 'admin') {
        hasAccess = true;
        accessReason = 'admin';
      }
    }
    // Check for ticket holder access (with name-based logic)
    else if (stream.accessType === 'ticket_holders') {
      let hasValidBooking = false;
      
      // First check specific event ID
      if (stream.eventId) {
        const booking = await Booking.findOne({
          user: req.user._id,
          event: stream.eventId,
          status: 'confirmed'
        });
        hasValidBooking = !!booking;
      }
      
      if (stream.sportsEventId) {
        const sportsBooking = await SportsBooking.findOne({
          user: req.user._id,
          sportsEvent: stream.sportsEventId,
          status: 'confirmed'
        });
        hasValidBooking = hasValidBooking || !!sportsBooking;
      }
      
      // If no specific booking found, check by event name matching
      if (!hasValidBooking && stream.title) {
        // Find events with matching titles
        const Event = require('../models/Event');
        const matchingEvents = await Event.find({ 
          title: { $regex: new RegExp(stream.title, 'i') } 
        });
        
        if (matchingEvents.length > 0) {
          const eventIds = matchingEvents.map(e => e._id);
          const nameBasedBooking = await Booking.findOne({
            user: req.user._id,
            event: { $in: eventIds },
            status: 'confirmed'
          });
          hasValidBooking = !!nameBasedBooking;
        }
        
        // Also check sports events
        const SportsEvent = require('../models/SportsEvent');
        const matchingSportsEvents = await SportsEvent.find({ 
          name: { $regex: new RegExp(stream.title, 'i') } 
        });
        
        if (matchingSportsEvents.length > 0 && !hasValidBooking) {
          const sportsEventIds = matchingSportsEvents.map(e => e._id);
          const nameBasedSportsBooking = await SportsBooking.findOne({
            user: req.user._id,
            sportsEvent: { $in: sportsEventIds },
            status: 'confirmed'
          });
          hasValidBooking = hasValidBooking || !!nameBasedSportsBooking;
        }
      }

      hasAccess = hasValidBooking || req.user?.role === 'admin';
      accessReason = hasValidBooking ? 'ticket_holder' : 'admin';
    }
    // Other access types (subscribers, private)
    else {
      if (stream.accessType === 'private') {
        hasAccess = req.user?.role === 'admin';
        accessReason = hasAccess ? 'admin' : 'private';
      } else if (stream.accessType === 'subscribers') {
        hasAccess = req.user?.role === 'admin' || req.user?.role === 'subscriber';
        accessReason = req.user?.role === 'admin' ? 'admin' : 'subscriber';
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this stream',
        reason: accessReason,
        requiresPurchase: stream.accessType === 'paid'
      });
    }
  }

  // Determine which playback ID to use (live or VOD)
  let playbackId = stream.muxPlaybackId;
  let isVod = false;

  if (stream.status === 'ended' && stream.vodPlaybackId) {
    playbackId = stream.vodPlaybackId;
    isVod = true;
  }

  if (!playbackId) {
    return res.status(400).json({
      success: false,
      message: 'Stream playback not available'
    });
  }

  try {
    const signedUrls = muxService.getSignedPlaybackUrls(playbackId, {
      expirationTime: 3600 // 1 hour
    });

    // Update view count
    stream.totalViews = (stream.totalViews || 0) + 1;
    await stream.save();

    res.json({
      success: true,
      data: {
        playbackId: signedUrls.data.playbackId,
        token: signedUrls.data.token,
        streamUrl: signedUrls.data.streamUrl,
        thumbnailUrl: signedUrls.data.thumbnailUrl,
        posterUrl: signedUrls.data.posterUrl,
        isVod,
        streamStatus: stream.status,
        expiresIn: 3600
      }
    });
  } catch (error) {
    console.error('Get playback token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate playback token'
    });
  }
});

/**
 * @desc    Get active/upcoming streams (Public)
 * @route   GET /api/livestream/active
 * @access  Public
 */
const getActiveStreams = asyncHandler(async (req, res) => {
  const activeStreams = await LiveStream.find({
    isDeleted: false,
    status: { $in: ['active', 'idle'] }
  })
    .select('title description status scheduledStartTime thumbnailUrl posterUrl accessType price eventId sportsEventId')
    .populate('eventId', 'title')
    .populate('sportsEventId', 'name')
    .sort({ scheduledStartTime: 1 })
    .limit(20);

  res.json({
    success: true,
    data: activeStreams
  });
});

/**
 * @desc    Mux webhook handler
 * @route   POST /api/livestream/webhook/mux
 * @access  Public (verified by signature)
 */
const handleMuxWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
  
  // Verify webhook signature if secret is configured
  if (webhookSecret) {
    const signature = req.headers['mux-signature'];
    // In production, verify the signature using Mux's webhook verification
    // For now, we'll trust the webhook if it comes from Mux
  }

  const { type, data } = req.body;

  console.log('Mux webhook received:', type);

  try {
    switch (type) {
      case 'video.live_stream.active':
        await handleStreamActive(data);
        break;
      
      case 'video.live_stream.idle':
        await handleStreamIdle(data);
        break;
      
      case 'video.live_stream.disabled':
        await handleStreamDisabled(data);
        break;
      
      case 'video.asset.ready':
        await handleAssetReady(data);
        break;
      
      default:
        console.log('Unhandled webhook type:', type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook helper functions
async function handleStreamActive(data) {
  const stream = await LiveStream.findOne({ muxStreamId: data.id });
  if (stream) {
    stream.status = 'active';
    stream.muxStatus = 'active';
    if (!stream.actualStartTime) {
      stream.actualStartTime = new Date();
    }
    await stream.save();
    console.log(`Stream ${stream._id} is now active`);
  }
}

async function handleStreamIdle(data) {
  const stream = await LiveStream.findOne({ muxStreamId: data.id });
  if (stream) {
    stream.muxStatus = 'idle';
    if (stream.status === 'active') {
      stream.status = 'idle';
    }
    await stream.save();
    console.log(`Stream ${stream._id} is now idle`);
  }
}

async function handleStreamDisabled(data) {
  const stream = await LiveStream.findOne({ muxStreamId: data.id });
  if (stream) {
    stream.status = 'disabled';
    stream.muxStatus = 'disabled';
    stream.actualEndTime = new Date();
    await stream.save();
    console.log(`Stream ${stream._id} is now disabled`);
  }
}

async function handleAssetReady(data) {
  // Find stream by recent asset ID
  const stream = await LiveStream.findOne({ muxStreamId: data.live_stream_id });
  if (stream && data.playback_ids && data.playback_ids.length > 0) {
    stream.vodAssetId = data.id;
    stream.vodPlaybackId = data.playback_ids[0].id;
    stream.status = 'ended';
    await stream.save();
    console.log(`VOD ready for stream ${stream._id}: ${data.id}`);
  }
}

/**
 * @desc    Update stream access type and price
 * @route   PUT /api/livestream/admin/streams/:id/access
 * @access  Private/Admin
 */
const updateStreamAccess = asyncHandler(async (req, res) => {
  const { accessType, price } = req.body;

  try {
    const stream = await LiveStream.findById(req.params.id);

    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }

    // Update access type and price
    if (accessType) stream.accessType = accessType;
    if (price !== undefined) stream.price = price;

    await stream.save();

    res.json({
      success: true,
      message: 'Stream access updated successfully',
      data: {
        id: stream._id,
        accessType: stream.accessType,
        price: stream.price
      }
    });
  } catch (error) {
    console.error('Update stream access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stream access'
    });
  }
});

/**
 * @desc    Update stream analytics
 * @route   POST /api/livestream/admin/streams/:id/analytics
 * @access  Private/Admin
 */
const updateAnalytics = asyncHandler(async (req, res) => {
  const { peakViewers, totalViews } = req.body;
  
  const stream = await LiveStream.findById(req.params.id);

  if (!stream) {
    return res.status(404).json({
      success: false,
      message: 'Stream not found'
    });
  }

  if (peakViewers !== undefined) {
    stream.peakViewers = Math.max(stream.peakViewers || 0, peakViewers);
  }
  if (totalViews !== undefined) {
    stream.totalViews = totalViews;
  }

  await stream.save();

  res.json({
    success: true,
    data: {
      peakViewers: stream.peakViewers,
      totalViews: stream.totalViews
    }
  });
});

/**
 * @desc    Check user access to a livestream
 * @route   GET /api/livestream/streams/:id/check-access
 * @access  Private
 */
const checkStreamAccess = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const stream = await LiveStream.findById(id);

    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }

    let hasAccess = false;
    let message = '';
    let reason = '';

    // Public streams - accessible to all authenticated users
    if (stream.accessType === 'public') {
      hasAccess = true;
      reason = 'public';
      message = 'Access granted - public stream';
    }
    // Private streams - admin only
    else if (stream.accessType === 'private') {
      if (req.user?.role === 'admin') {
        hasAccess = true;
        reason = 'admin';
        message = 'Access granted - administrator';
      } else {
        hasAccess = false;
        reason = 'private';
        message = 'This stream is private. Only administrators can access it.';
      }
    }
    // Paid streams - require purchase (check by event name)
    else if (stream.accessType === 'paid') {
      // Check if user has purchased access to ANY livestream with the same event name
      const LivestreamPurchase = require('../models/LivestreamPurchase');
      
      // First try to find purchase for this specific stream
      const specificPurchase = await LivestreamPurchase.findUserValidAccess(userId, stream._id);
      
      if (specificPurchase || req.user?.role === 'admin') {
        hasAccess = true;
        reason = specificPurchase ? 'paid_access' : 'admin';
        message = specificPurchase ? 'Access granted - payment confirmed' : 'Access granted - administrator';
      } else {
        // If no specific purchase, check if user has purchased any livestream with the same title
        const allStreams = await LiveStream.find({ title: stream.title });
        const streamIds = allStreams.map(s => s._id);
        
        if (streamIds.length > 0) {
          const nameBasedPurchase = await LivestreamPurchase.findOne({
            user: userId,
            livestream: { $in: streamIds },
            status: 'completed',
            accessGranted: true,
            $or: [
              { accessExpiresAt: { $exists: false } },
              { accessExpiresAt: { $gt: new Date() } }
            ]
          });
          
          if (nameBasedPurchase) {
            hasAccess = true;
            reason = 'paid_access_name_based';
            message = `Access granted - you have purchased access to "${stream.title}" livestream`;
          }
        }
        
        if (!hasAccess) {
          hasAccess = false;
          reason = 'payment_required';
          message = `This is a paid stream. Please purchase a ticket for ₹${stream.price} to access.`;
        }
      }
    }
    // Ticket holders - check valid booking (check by event name)
    else if (stream.accessType === 'ticket_holders') {
      // Check for valid event bookings by name matching
      let hasValidBooking = false;
      
      // First check specific event ID
      if (stream.eventId) {
        const booking = await Booking.findOne({
          user: userId,
          event: stream.eventId,
          status: 'confirmed'
        });
        hasValidBooking = !!booking;
      }
      
      if (stream.sportsEventId) {
        const sportsBooking = await SportsBooking.findOne({
          user: userId,
          sportsEvent: stream.sportsEventId,
          status: 'confirmed'
        });
        hasValidBooking = hasValidBooking || !!sportsBooking;
      }
      
      // If no specific booking found, check by event name matching
      if (!hasValidBooking && stream.title) {
        // Find events with matching titles
        const Event = require('../models/Event');
        const matchingEvents = await Event.find({ 
          title: { $regex: new RegExp(stream.title, 'i') } 
        });
        
        if (matchingEvents.length > 0) {
          const eventIds = matchingEvents.map(e => e._id);
          const nameBasedBooking = await Booking.findOne({
            user: userId,
            event: { $in: eventIds },
            status: 'confirmed'
          });
          hasValidBooking = !!nameBasedBooking;
        }
        
        // Also check sports events
        const SportsEvent = require('../models/SportsEvent');
        const matchingSportsEvents = await SportsEvent.find({ 
          name: { $regex: new RegExp(stream.title, 'i') } 
        });
        
        if (matchingSportsEvents.length > 0 && !hasValidBooking) {
          const sportsEventIds = matchingSportsEvents.map(e => e._id);
          const nameBasedSportsBooking = await SportsBooking.findOne({
            user: userId,
            sportsEvent: { $in: sportsEventIds },
            status: 'confirmed'
          });
          hasValidBooking = hasValidBooking || !!nameBasedSportsBooking;
        }
      }

      if (hasValidBooking || req.user?.role === 'admin') {
        hasAccess = true;
        reason = hasValidBooking ? 'ticket_holder' : 'admin';
        message = hasValidBooking ? 'Access granted - valid ticket' : 'Access granted - administrator';
      } else {
        hasAccess = false;
        reason = 'no_ticket';
        message = 'You need a valid ticket to access this stream.';
      }
    }
    // Subscribers only
    else if (stream.accessType === 'subscribers') {
      if (req.user?.role === 'admin' || req.user?.role === 'subscriber') {
        hasAccess = true;
        reason = req.user?.role === 'admin' ? 'admin' : 'subscriber';
        message = `Access granted - ${req.user?.role}`;
      } else {
        hasAccess = false;
        reason = 'subscription_required';
        message = 'This stream is available to subscribers only.';
      }
    }

    res.json({
      success: true,
      data: {
        hasAccess,
        reason,
        message,
        streamInfo: {
          title: stream.title,
          accessType: stream.accessType,
          price: stream.price,
          eventId: stream.eventId,
          sportsEventId: stream.sportsEventId
        }
      }
    });

  } catch (error) {
    console.error('Error checking stream access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check access'
    });
  }
});

/**
 * @desc    Join a livestream session (one active session per user per stream)
 * @route   POST /api/livestream/streams/:id/join
 * @access  Private
 */
const joinStream = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { force } = req.body;
  const userId = req.user._id;

  const HEARTBEAT_EXPIRY_MS = 35 * 1000;

  // First, clean up any expired sessions for this user and stream
  await LivestreamSession.deleteMany({
    user: userId,
    stream: id,
    lastHeartbeat: { $lte: new Date(Date.now() - HEARTBEAT_EXPIRY_MS) }
  });

  const existingSession = await LivestreamSession.findOne({
    user: userId,
    stream: id,
    lastHeartbeat: { $gt: new Date(Date.now() - HEARTBEAT_EXPIRY_MS) },
  });

  if (existingSession) {
    if (!force) {
      return res.status(409).json({
        success: false,
        message: 'You are already watching this stream on another device or tab.',
        code: 'ALREADY_WATCHING',
        lastSeen: existingSession.lastHeartbeat,
      });
    }
    await LivestreamSession.deleteOne({ _id: existingSession._id });
  }

  await LivestreamSession.deleteMany({ user: userId, stream: id });

  const sessionToken = crypto.randomBytes(32).toString('hex');

  await LivestreamSession.create({
    user: userId,
    stream: id,
    sessionToken,
    lastHeartbeat: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    sessionToken,
  });
});

/**
 * @desc    Send heartbeat to keep session alive
 * @route   POST /api/livestream/streams/:id/heartbeat
 * @access  Private
 */
const heartbeatStream = asyncHandler(async (req, res) => {
  const { sessionToken } = req.body;
  const userId = req.user._id;

  if (!sessionToken) {
    return res.status(400).json({ success: false, message: 'sessionToken is required' });
  }

  // First, clean up any expired sessions for this user
  const HEARTBEAT_EXPIRY_MS = 35 * 1000;
  await LivestreamSession.deleteMany({
    user: userId,
    lastHeartbeat: { $lte: new Date(Date.now() - HEARTBEAT_EXPIRY_MS) }
  });

  const session = await LivestreamSession.findOneAndUpdate(
    { sessionToken, user: userId },
    { lastHeartbeat: new Date() },
    { new: true }
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found or expired.',
      code: 'SESSION_EXPIRED',
    });
  }

  res.json({ success: true });
});

/**
 * @desc    Leave a livestream session
 * @route   POST /api/livestream/streams/:id/leave
 * @access  Private
 */
const leaveStream = asyncHandler(async (req, res) => {
  const { sessionToken } = req.body;
  const userId = req.user._id;

  if (sessionToken) {
    await LivestreamSession.deleteOne({ sessionToken, user: userId });
  }

  res.json({ success: true });
});

module.exports = {
  createLiveStream,
  getAllStreams,
  getStreamDetails,
  enableStream,
  disableStream,
  resetStreamKey,
  deleteStream,
  getPublicStreamInfo,
  getPlaybackToken,
  getActiveStreams,
  handleMuxWebhook,
  updateAnalytics,
  updateEmbedUrl,
  updateStreamAccess,
  checkStreamAccess,
  joinStream,
  heartbeatStream,
  leaveStream,
};
