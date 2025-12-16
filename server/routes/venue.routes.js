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
  // Minimal validation for signup; remaining details will be captured later in admin panel
  check('email', 'Please include a valid email').if(check('mode').equals('signup')).isEmail().optional({ nullable: true })
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

// Separate section update endpoints
router.put('/details/owner-details', protect, venueAuthController.updateOwnerDetails);
router.put('/details/venue-classification', protect, venueAuthController.updateVenueClassification);
router.put('/details/location', protect, venueAuthController.updateLocation);
router.put('/details/capacity', protect, venueAuthController.updateCapacity);
router.put('/details/pricing', protect, venueAuthController.updatePricing);
router.put('/details/amenities', protect, venueAuthController.updateAmenities);
router.put('/details/policies', protect, venueAuthController.updatePolicies);
router.put('/details/addon-services', protect, venueAuthController.updateAddOnServices);
router.put('/details/documents', protect, venueAuthController.updateDocuments);
router.put('/details/authorizations', protect, venueAuthController.updateAuthorizations);

// FAQs management (venue-owned)
router.get('/faqs', protect, venueAuthController.getFaqs);
router.post('/faqs', protect, venueAuthController.createFaq);
router.put('/faqs/:faqId', protect, venueAuthController.updateFaq);
router.delete('/faqs/:faqId', protect, venueAuthController.deleteFaq);

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

// Booking routes (for users) with ':id' - MUST come BEFORE the general /:id routes
router.post('/:id/bookings/create-order', (req, res, next) => {
  console.log('=== ROUTE HIT: POST /:id/bookings/create-order ===');
  console.log('Venue ID from route:', req.params.id);
  console.log('Request body:', req.body);
  next();
}, protect, [
  check('bookingDate', 'Booking date is required').isISO8601(),
  check('startTime', 'Start time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('endTime', 'End time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('guestCount', 'Guest count is required').isInt({ min: 1 })
], venueController.createBookingOrder);

router.post('/:id/bookings/verify-payment', protect, venueController.verifyPayment);

// ============ PUBLIC ROUTES ============

// Debug route (should be before parameterized routes)
router.get('/debug/list-all', venueController.debugListAllVenues);

// Public venue listing should be before parameterized routes
router.get('/', venueController.getAllVenues);

// Specific routes with parameters - MUST come before general /:id routes
router.get('/:id/availability/:date', venueController.getTimeSlotAvailability);
router.get('/:id/bookings', venueController.getVenueBookings);
router.post('/:id/reviews', protect, venueController.addVenueReview);

// General /:id routes - MUST come after specific routes
router.get('/:id', venueController.getVenueById);

module.exports = router;
