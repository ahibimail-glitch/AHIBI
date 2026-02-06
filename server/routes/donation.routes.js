const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const { protect, adminOnly } = require('../middlewares/auth');

// Public routes
router.post('/create-order', donationController.createDonationOrder);
router.post('/verify-payment', donationController.verifyDonationPayment);
router.post('/webhook', donationController.handleDonationWebhook);
router.get('/stats', donationController.getDonationStats);

// Admin routes
router.get('/admin/donations', protect, adminOnly, donationController.getAdminDonations);

module.exports = router;
