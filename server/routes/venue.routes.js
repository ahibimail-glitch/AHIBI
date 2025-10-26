const express = require('express');
const { check } = require('express-validator');
const venueAuthController = require('../controllers/venueAuthController');
const venueController = require('../controllers/venueController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// ============ PUBLIC ROUTES ============

// Venue authentication
router.post('/auth/send-otp', [
  check('phone', 'Phone number is required').matches(/^\d{10}$/),
  check('mode', 'Mode must be signup or login').isIn(['signup', 'login']),
  // Conditional validation for signup
  check('name', 'Venue name is required').if(check('mode').equals('signup')).notEmpty(),
  check('email', 'Please include a valid email').if(check('mode').equals('signup')).isEmail(),
  check('description', 'Description is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.street', 'Street address is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.city', 'City is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.state', 'State is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.pincode', 'Valid pincode is required').if(check('mode').equals('signup')).matches(/^\d{6}$/),
  check('contactInfo.phone', 'Contact phone is required').if(check('mode').equals('signup')).matches(/^\d{10}$/)
], venueAuthController.sendVenueOtp);

router.post('/auth/verify-otp', [
  check('phone', 'Phone number is required').matches(/^\d{10}$/),
  check('otp', 'OTP is required').isLength({ min: 6, max: 6 }),
  check('mode', 'Mode must be signup or login').isIn(['signup', 'login'])
], venueAuthController.verifyVenueOtp);

// ============ VENUE MANAGER PROTECTED ROUTES ============

// Venue profile management
router.get('/profile', protect, venueAuthController.getVenueProfile);
router.put('/profile', protect, venueAuthController.updateVenueProfile);

// Venue manager dashboard
router.get('/manager/stats', protect, venueController.getVenueManagerStats);
router.get('/manager/bookings', protect, venueController.getVenueManagerBookings);
router.put('/manager/bookings/:bookingId', protect, [
  check('status', 'Status is required').isIn(['pending', 'confirmed', 'rejected', 'cancelled', 'completed']),
  check('rejectionReason', 'Rejection reason is required when rejecting').if(
    check('status').equals('rejected')
  ).notEmpty()
], venueController.updateBookingStatus);

router.put('/manager/availability', protect, venueController.updateAvailability);
router.put('/manager/profile', protect, venueController.updateVenueManagerProfile);

// ============ USER PROTECTED ROUTES ============

// User's bookings (fixed prefix to avoid conflict with '/:id')
router.get('/my-bookings', protect, venueController.getUserBookings);
router.get('/bookings/:bookingId', protect, venueController.getBookingById);

// Booking routes (for users) with ':id'
router.post('/:id/bookings/create-order', protect, [
  check('bookingDate', 'Booking date is required').isISO8601(),
  check('startTime', 'Start time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('endTime', 'End time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('guestCount', 'Guest count is required').isInt({ min: 1 })
], venueController.createBookingOrder);

router.post('/:id/bookings/verify-payment', protect, venueController.verifyPayment);

// ============ PUBLIC ROUTES ============

// Public venue listing should be before parameterized routes
router.get('/', venueController.getAllVenues);
router.get('/:id/bookings', venueController.getVenueBookings);
router.get('/:id', venueController.getVenueById);

module.exports = router;
