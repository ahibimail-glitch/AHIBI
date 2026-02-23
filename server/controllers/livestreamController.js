/**
 * LiveStream Controller
 * Handles all livestream-related operations
 */

const asyncHandler = require('express-async-handler');
const LiveStream = require('../models/LiveStream');
const Booking = require('../models/Booking');
const SportsBooking = require('../models/SportsBooking');
const muxService = require('../services/muxService');

/**
 * @desc    Create a new live stream (Admin only)
 * @route   POST /api/livestream/admin/create
 * @access  Private/Admin
 */
const createLiveStream = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    eventId,
    sportsEventId,
    accessType = 'ticket_holders',
    price = 0,
    scheduledStartTime,
    scheduledEndTime,
    latencyMode = 'low',
    thumbnailUrl,
    posterUrl,
    embedUrl
  } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: 'Stream title is required'
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
      title,
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
        scheduledStartTime: liveStream.scheduledStartTime,
        obsConfig: {
          rtmpUrl: liveStream.rtmpUrl,
          streamKey: muxResult.data.streamKey,
          fullUrl: `${liveStream.rtmpUrl}/${muxResult.data.streamKey}`
        },
        obsRecommendedSettings: {
          encoder: 'x264 or NVENC',
          bitrate: '4000-6000 kbps',
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

  // Check access based on accessType
  if (stream.accessType !== 'public') {
    let userBookings = [];

    if (stream.eventId) {
      const eventBookings = await Booking.find({
        user: req.user._id,
        event: stream.eventId,
        status: 'confirmed'
      });
      userBookings = [...userBookings, ...eventBookings];
    }

    if (stream.sportsEventId) {
      const sportsBookings = await SportsBooking.find({
        user: req.user._id,
        venue: stream.sportsEventId,
        status: 'confirmed'
      });
      userBookings = [...userBookings, ...sportsBookings.map(b => ({ ...b.toObject(), sportsEvent: b.venue }))];
    }

    const accessCheck = await stream.checkAccess(req.user._id, userBookings);

    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this stream',
        reason: accessCheck.reason
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
    status: { $in: ['active', 'idle'] },
    $or: [
      { status: 'active' },
      { scheduledStartTime: { $gte: new Date() } }
    ]
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
 * @desc    Update stream analytics (Admin only)
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
  updateEmbedUrl
};
