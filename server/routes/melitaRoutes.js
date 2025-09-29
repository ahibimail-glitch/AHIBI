const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getAdminBookings, getBookingById } = require('../controllers/melitaController');
const { protect, authorize } = require('../middlewares/auth');

// @route   POST /api/melita/orders
// @desc    Create a Razorpay order
// @access  Private
router.post('/orders', protect, createOrder);

// @route   POST /api/melita/verify-payment
// @desc    Verify payment and update booking
// @access  Public (Webhook)
router.post('/verify-payment', verifyPayment);

// @route   GET /api/melita/admin/bookings
// @desc    Get all Melita bookings
// @access  Admin
router.get('/admin/bookings', protect, authorize('admin'), getAdminBookings);

// @route   GET /api/melita/bookings/:id
// @desc    Get a single Melita booking by ID
// @access  Private
router.get('/bookings/:id', protect, getBookingById);

module.exports = router;
