const express = require('express');
const { check } = require('express-validator');
const aikoHallController = require('../controllers/aikoHallController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.get('/', aikoHallController.getAikoHallDetails);
router.get('/bookings', aikoHallController.getBookings);
router.get('/bookings/:id', aikoHallController.getBookingById);

// Create booking with validation
router.post('/bookings', [
  check('customer.name', 'Customer name is required').notEmpty().trim(),
  check('customer.phone', 'Valid phone number is required').matches(/^\d{10}$/),
  check('customer.email', 'Valid email is required').isEmail(),
  check('bookingDate', 'Booking date is required').isISO8601(),
  check('startTime', 'Start time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('endTime', 'End time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('guestCount', 'Guest count is required').isInt({ min: 1, max: 250 }),
  check('specialNotes', 'Special notes must be a string').optional().isString()
], aikoHallController.createBooking);

// Admin protected routes
router.get('/stats', protect, aikoHallController.getBookingStats);
router.put('/settings', protect, aikoHallController.updateSettings);
router.put('/bookings/:id/status', [
  protect,
  check('status', 'Status is required').isIn(['pending', 'approved', 'rejected', 'cancelled', 'completed']),
  check('rejectionReason', 'Rejection reason is required when rejecting').if(
    check('status').equals('rejected')
  ).notEmpty(),
  check('adminNotes', 'Admin notes must be a string').optional().isString()
], aikoHallController.updateBookingStatus);

module.exports = router;
