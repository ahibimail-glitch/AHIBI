/**
 * LiveStream Routes
 * Handles all livestream-related API endpoints
 */

const express = require('express');
const router = express.Router();
const livestreamController = require('../controllers/livestreamController');
const { protect, adminOnly } = require('../middlewares/auth');

// ==================== PUBLIC ROUTES ====================

// Get active/upcoming streams
router.get('/active', livestreamController.getActiveStreams);

// Get public stream info
router.get('/streams/:id', livestreamController.getPublicStreamInfo);

// Mux webhook (must be before auth middleware)
router.post('/webhook/mux', livestreamController.handleMuxWebhook);

// ==================== AUTHENTICATED USER ROUTES ====================

// Get signed playback token (requires authentication)
router.get('/streams/:id/playback-token', protect, livestreamController.getPlaybackToken);

// Check user access to stream (requires authentication)
router.get('/streams/:id/check-access', protect, livestreamController.checkStreamAccess);

// ==================== ADMIN ROUTES ====================

// Create new live stream
router.post('/admin/create', protect, adminOnly, livestreamController.createLiveStream);

// Get all streams
router.get('/admin/streams', protect, adminOnly, livestreamController.getAllStreams);

// Get stream details (includes sensitive data)
router.get('/admin/streams/:id', protect, adminOnly, livestreamController.getStreamDetails);

// Enable stream
router.post('/admin/streams/:id/enable', protect, adminOnly, livestreamController.enableStream);

// Disable stream
router.post('/admin/streams/:id/disable', protect, adminOnly, livestreamController.disableStream);

// Reset stream key
router.post('/admin/streams/:id/reset-key', protect, adminOnly, livestreamController.resetStreamKey);

// Update custom embed URL
router.put('/admin/streams/:id/embed-url', protect, adminOnly, livestreamController.updateEmbedUrl);

// Update stream access type and price
router.put('/admin/streams/:id/access', protect, adminOnly, livestreamController.updateStreamAccess);

// Delete stream
router.delete('/admin/streams/:id', protect, adminOnly, livestreamController.deleteStream);

// Update analytics
router.post('/admin/streams/:id/analytics', protect, adminOnly, livestreamController.updateAnalytics);

module.exports = router;
