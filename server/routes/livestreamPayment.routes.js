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
  handleWebhook
} = require('../controllers/livestreamPaymentController');

const { protect } = require('../middlewares/auth');

// Protected routes
router.use(protect);

router.post('/create-order', createPurchaseOrder);
router.post('/verify', verifyPayment);
router.get('/history', getUserPurchases);
router.get('/check-access/:livestreamId', checkAccess);

// Public webhook route
router.post('/webhook', handleWebhook);

module.exports = router;
