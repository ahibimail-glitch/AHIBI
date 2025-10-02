const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getAdminBookings, getBookingById, generateRewardCoupon, verifyPaymentClient } = require('../controllers/melitaController');
const { protect, authorize } = require('../middlewares/auth');
const couponController = require('../controllers/couponController');

// @route   POST /api/melita/orders
// @desc    Create a Razorpay order
// @access  Private
router.post('/orders', protect, createOrder);

// @route   POST /api/melita/verify-payment
// @desc    Verify payment and update booking
// @access  Public (Webhook)
router.post('/verify-payment', verifyPayment);

// @route   POST /api/melita/verify-payment-client
// @desc    Verify payment from client and create AHIBI bookings
// @access  Private
router.post('/verify-payment-client', protect, verifyPaymentClient);

// @route   GET /api/melita/admin/bookings
// @desc    Get all Melita bookings
// @access  Admin
router.get('/admin/bookings', protect, authorize('admin'), getAdminBookings);

// @route   GET /api/melita/bookings/:id
// @desc    Get a single Melita booking by ID
// @access  Private
router.get('/bookings/:id', protect, getBookingById);

// @route   POST /api/melita/coupons/validate
// @desc    Validate coupon for Melita purchases
// @access  Private
router.post('/coupons/validate', protect, couponController.validateMelitaCoupon);

// @route   POST /api/melita/rewards/generate
// @desc    Generate reward coupon for AHIBI Fest based on used Melita coupon
// @access  Private
// router.post('/rewards/generate', protect, generateRewardCoupon);

module.exports = router;
