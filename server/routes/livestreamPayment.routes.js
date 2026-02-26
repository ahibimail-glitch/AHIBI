/**
 * Livestream Payment Routes
 * Handles payment-related routes for livestream access
 */

const express = require('express');
const router = express.Router();

const {
  createPurchaseOrder,
  verifyPayment,
  getUserPurchases,
  checkAccess,
  handleWebhook,
  getAdminBookings
} = require('../controllers/livestreamPaymentController');

const { protect, adminOnly } = require('../middlewares/auth');

// Protected routes
router.use(protect);

router.post('/create-order', createPurchaseOrder);
router.post('/verify', verifyPayment);
router.get('/history', getUserPurchases);
router.get('/check-access/:livestreamId', checkAccess);

// Admin routes
router.get('/admin/bookings', adminOnly, getAdminBookings);

// Public webhook route
router.post('/webhook', handleWebhook);

module.exports = router;
