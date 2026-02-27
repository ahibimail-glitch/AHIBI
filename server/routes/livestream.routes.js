/**
 * LiveStream Routes
 * Handles all livestream-related API endpoints
 */

const express = require('express');
const router = express.Router();
const livestreamController = require('../controllers/livestreamController');
const livestreamAdminController = require('../controllers/livestreamAdminController');
const { protect, adminOnly } = require('../middlewares/auth');

// ==================== PUBLIC ROUTES ====================

// Get active/upcoming streams
router.get('/active', livestreamController.getActiveStreams);

// Get public stream info
router.get('/streams/:id', livestreamController.getPublicStreamInfo);

// Public test endpoint
router.get('/public-test', livestreamAdminController.publicTestEndpoint);

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

// Get all livestreams for admin selection (must come before :id route)
router.get('/admin/streams/list', protect, adminOnly, livestreamAdminController.getLivestreamsList);

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

// ==================== ADMIN USER MANAGEMENT ROUTES ====================

// Test endpoint
router.get('/admin/test', protect, adminOnly, livestreamAdminController.testEndpoint);

// Search users for manual purchase
router.get('/admin/users/search', protect, adminOnly, livestreamAdminController.searchUsers);

// Create manual livestream purchase for user
router.post('/admin/manual-purchase', protect, adminOnly, livestreamAdminController.createManualPurchase);

// Get all livestream purchases with user management
router.get('/admin/purchases', protect, adminOnly, livestreamAdminController.getAllPurchases);

// Delete a livestream purchase
router.delete('/admin/purchases/:purchaseId', protect, adminOnly, livestreamAdminController.deletePurchase);

// Get user's livestream purchase history
router.get('/admin/users/:userId/purchases', protect, adminOnly, livestreamAdminController.getUserPurchaseHistory);

module.exports = router;
