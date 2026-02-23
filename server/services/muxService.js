/**
 * Mux Live Streaming Service
 * Handles all Mux API interactions for live streaming
 */

const Mux = require('@mux/mux-node');
const jwt = require('jsonwebtoken');

// Initialize Mux client
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET
});

const getMuxApis = () => {
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
    throw new Error('Mux credentials missing: set MUX_TOKEN_ID and MUX_TOKEN_SECRET');
  }

  // Support multiple @mux/mux-node API shapes across versions
  const video = muxClient.video || muxClient.Video || muxClient?.Video;
  const liveStreams = video?.liveStreams || video?.LiveStreams;
  const assets = video?.assets || video?.Assets;

  if (!video || !liveStreams || !assets) {
    throw new Error('Unsupported @mux/mux-node API shape: expected mux.video.liveStreams/assets (or mux.Video.*)');
  }

  return { video, liveStreams, assets };
};

const callApi = async (obj, methodNames, ...args) => {
  for (const name of methodNames) {
    if (obj && typeof obj[name] === 'function') {
      return obj[name](...args);
    }
  }
  throw new Error(`Mux SDK method not found. Tried: ${methodNames.join(', ')}`);
};

/**
 * Create a new live stream with RTMP ingest
 * @param {Object} options - Stream configuration options
 * @returns {Object} - Created live stream details
 */
const createLiveStream = async (options = {}) => {
  try {
    const { liveStreams } = getMuxApis();

    const {
      playbackPolicy = 'public', // 'signed' for protected, 'public' for open
      latencyMode = 'low', // 'low', 'reduced', 'standard'
      reconnectWindow = 60, // seconds to wait for reconnection
      maxContinuousDuration = 43200, // 12 hours max
      newAssetSettings = {
        playback_policy: ['public'], // VOD will also be signed
        mp4_support: 'standard' // Enable MP4 download for VOD
      }
    } = options;

    const liveStream = await callApi(liveStreams, ['create'], {
      playback_policy: [playbackPolicy],
      latency_mode: latencyMode,
      reconnect_window: reconnectWindow,
      max_continuous_duration: maxContinuousDuration,
      new_asset_settings: newAssetSettings,
      // Enable recording for VOD
      test: process.env.NODE_ENV !== 'production'
    });

    return {
      success: true,
      data: {
        streamId: liveStream.id,
        streamKey: liveStream.stream_key,
        rtmpUrl: 'rtmps://global-live.mux.com:443/app',
        playbackId: liveStream.playback_ids?.[0]?.id,
        status: liveStream.status,
        latencyMode: liveStream.latency_mode,
        reconnectWindow: liveStream.reconnect_window,
        maxContinuousDuration: liveStream.max_continuous_duration,
        createdAt: liveStream.created_at
      }
    };
  } catch (error) {
    console.error('Mux createLiveStream error:', error);
    throw new Error(`Failed to create live stream: ${error.message}`);
  }
};

/**
 * Get live stream details by ID
 * @param {string} streamId - Mux live stream ID
 * @returns {Object} - Live stream details
 */
const getLiveStream = async (streamId) => {
  try {
    const { liveStreams } = getMuxApis();
    const liveStream = await callApi(liveStreams, ['retrieve', 'get'], streamId);
    
    return {
      success: true,
      data: {
        streamId: liveStream.id,
        status: liveStream.status,
        playbackId: liveStream.playback_ids?.[0]?.id,
        activeAssetId: liveStream.active_asset_id,
        recentAssetIds: liveStream.recent_asset_ids,
        latencyMode: liveStream.latency_mode,
        reconnectWindow: liveStream.reconnect_window,
        maxContinuousDuration: liveStream.max_continuous_duration,
        createdAt: liveStream.created_at
      }
    };
  } catch (error) {
    console.error('Mux getLiveStream error:', error);
    throw new Error(`Failed to get live stream: ${error.message}`);
  }
};

/**
 * List all live streams
 * @param {Object} options - Pagination options
 * @returns {Array} - List of live streams
 */
const listLiveStreams = async (options = {}) => {
  try {
    const { liveStreams } = getMuxApis();
    const { limit = 25, page = 1 } = options;
    
    const response = await callApi(liveStreams, ['list'], {
      limit,
      page
    });

    const items = Array.isArray(response) ? response : (response?.data || []);

    return {
      success: true,
      data: items.map(stream => ({
        streamId: stream.id,
        status: stream.status,
        playbackId: stream.playback_ids?.[0]?.id,
        latencyMode: stream.latency_mode,
        createdAt: stream.created_at
      }))
    };
  } catch (error) {
    console.error('Mux listLiveStreams error:', error);
    throw new Error(`Failed to list live streams: ${error.message}`);
  }
};

/**
 * Delete a live stream
 * @param {string} streamId - Mux live stream ID
 * @returns {Object} - Deletion confirmation
 */
const deleteLiveStream = async (streamId) => {
  try {
    const { liveStreams } = getMuxApis();
    await callApi(liveStreams, ['delete', 'del'], streamId);
    
    return {
      success: true,
      message: 'Live stream deleted successfully'
    };
  } catch (error) {
    // If Mux already removed the stream, treat it as a success so backend cleanup can continue
    if (error?.status === 404 || error?.error?.error?.type === 'not_found') {
      console.warn(`Mux stream ${streamId} already deleted.`);
      return {
        success: true,
        message: 'Live stream already removed from Mux'
      };
    }

    console.error('Mux deleteLiveStream error:', error);
    throw new Error(`Failed to delete live stream: ${error.message}`);
  }
};

/**
 * Reset stream key (useful if key is compromised)
 * @param {string} streamId - Mux live stream ID
 * @returns {Object} - New stream key
 */
const resetStreamKey = async (streamId) => {
  try {
    const { liveStreams } = getMuxApis();
    const liveStream = await callApi(liveStreams, ['resetStreamKey'], streamId);
    
    return {
      success: true,
      data: {
        streamId: liveStream.id,
        streamKey: liveStream.stream_key
      }
    };
  } catch (error) {
    console.error('Mux resetStreamKey error:', error);
    throw new Error(`Failed to reset stream key: ${error.message}`);
  }
};

/**
 * Enable/disable a live stream
 * @param {string} streamId - Mux live stream ID
 * @param {boolean} enabled - Enable or disable
 * @returns {Object} - Updated stream status
 */
const setStreamEnabled = async (streamId, enabled) => {
  try {
    const { liveStreams } = getMuxApis();
    let liveStream;
    if (enabled) {
      liveStream = await callApi(liveStreams, ['enable'], streamId);
    } else {
      liveStream = await callApi(liveStreams, ['disable'], streamId);
    }
    
    return {
      success: true,
      data: {
        streamId: liveStream.id,
        status: liveStream.status
      }
    };
  } catch (error) {
    console.error('Mux setStreamEnabled error:', error);
    throw new Error(`Failed to ${enabled ? 'enable' : 'disable'} stream: ${error.message}`);
  }
};

/**
 * Get asset details (for VOD playback after stream ends)
 * @param {string} assetId - Mux asset ID
 * @returns {Object} - Asset details
 */
const getAsset = async (assetId) => {
  try {
    const { assets } = getMuxApis();
    const asset = await callApi(assets, ['retrieve', 'get'], assetId);
    
    return {
      success: true,
      data: {
        assetId: asset.id,
        status: asset.status,
        playbackId: asset.playback_ids?.[0]?.id,
        duration: asset.duration,
        aspectRatio: asset.aspect_ratio,
        createdAt: asset.created_at
      }
    };
  } catch (error) {
    console.error('Mux getAsset error:', error);
    throw new Error(`Failed to get asset: ${error.message}`);
  }
};

/**
 * Generate a signed playback token for secure video access
 * @param {string} playbackId - Mux playback ID
 * @param {Object} options - Token options
 * @returns {string} - Signed JWT token
 */
const generateSignedPlaybackToken = (playbackId, options = {}) => {
  try {
    const {
      expirationTime = 3600, // 1 hour default
      type = 'video' // 'video', 'thumbnail', 'gif', 'storyboard'
    } = options;

    // Get the signing key from environment
    const signingKeyId = process.env.MUX_SIGNING_KEY_ID;
    const signingKeySecret = process.env.MUX_SIGNING_KEY_SECRET;

    if (!signingKeyId || !signingKeySecret) {
      throw new Error('Mux signing keys not configured');
    }

    // Decode the base64 private key
    const privateKey = Buffer.from(signingKeySecret, 'base64').toString('ascii');

    // Create the token payload
    const payload = {
      sub: playbackId,
      aud: type,
      exp: Math.floor(Date.now() / 1000) + expirationTime
    };

    // Sign the token with RS256
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      keyid: signingKeyId
    });

    return token;
  } catch (error) {
    console.error('Mux generateSignedPlaybackToken error:', error);
    throw new Error(`Failed to generate signed token: ${error.message}`);
  }
};

/**
 * Get signed playback URL
 * @param {string} playbackId - Mux playback ID
 * @param {Object} options - Token options
 * @returns {Object} - Signed URLs for different formats
 */
const getSignedPlaybackUrls = (playbackId, options = {}) => {
  try {
    const token = generateSignedPlaybackToken(playbackId, { ...options, type: 'video' });
    const thumbnailToken = generateSignedPlaybackToken(playbackId, { ...options, type: 'thumbnail' });

    return {
      success: true,
      data: {
        playbackId,
        token,
        streamUrl: `https://stream.mux.com/${playbackId}.m3u8?token=${token}`,
        thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg?token=${thumbnailToken}`,
        posterUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg?token=${thumbnailToken}&width=1920&height=1080`
      }
    };
  } catch (error) {
    console.error('Mux getSignedPlaybackUrls error:', error);
    throw new Error(`Failed to get signed URLs: ${error.message}`);
  }
};

/**
 * Create a simulcast target (for streaming to multiple platforms)
 * @param {string} streamId - Mux live stream ID
 * @param {Object} target - Simulcast target configuration
 * @returns {Object} - Created simulcast target
 */
const createSimulcastTarget = async (streamId, target) => {
  try {
    const { liveStreams } = getMuxApis();
    const { url, streamKey, passthrough } = target;

    const simulcastTarget = await callApi(liveStreams, ['createSimulcastTarget'], streamId, {
      url,
      stream_key: streamKey,
      passthrough
    });

    return {
      success: true,
      data: {
        targetId: simulcastTarget.id,
        url: simulcastTarget.url,
        passthrough: simulcastTarget.passthrough
      }
    };
  } catch (error) {
    console.error('Mux createSimulcastTarget error:', error);
    throw new Error(`Failed to create simulcast target: ${error.message}`);
  }
};

/**
 * Delete a simulcast target
 * @param {string} streamId - Mux live stream ID
 * @param {string} targetId - Simulcast target ID
 * @returns {Object} - Deletion confirmation
 */
const deleteSimulcastTarget = async (streamId, targetId) => {
  try {
    const { liveStreams } = getMuxApis();
    await callApi(liveStreams, ['deleteSimulcastTarget'], streamId, targetId);
    
    return {
      success: true,
      message: 'Simulcast target deleted successfully'
    };
  } catch (error) {
    console.error('Mux deleteSimulcastTarget error:', error);
    throw new Error(`Failed to delete simulcast target: ${error.message}`);
  }
};

module.exports = {
  createLiveStream,
  getLiveStream,
  listLiveStreams,
  deleteLiveStream,
  resetStreamKey,
  setStreamEnabled,
  getAsset,
  generateSignedPlaybackToken,
  getSignedPlaybackUrls,
  createSimulcastTarget,
  deleteSimulcastTarget
};
