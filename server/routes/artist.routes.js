const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const artistAuthController = require('../controllers/artistAuthController');
const artistBookingController = require('../controllers/artistBookingController');
const artistProfileController = require('../controllers/artistProfileController');
const artistAvailabilityController = require('../controllers/artistAvailabilityController');
const artistAnalyticsController = require('../controllers/artistAnalyticsController');
const artistPaymentController = require('../controllers/artistPaymentController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.post('/auth/signup', [
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('phone', 'Please include a valid phone number').isMobilePhone('any'),
  check('city', 'City is required').not().isEmpty(),
  check('specialization', 'Specialization is required').not().isEmpty(),
  check('experience', 'Experience level is required').not().isEmpty()
], artistAuthController.artistSignup);

router.post('/auth/send-otp', [
  check('phone', 'Please include a valid phone number').isMobilePhone('any'),
  check('mode', 'Mode must be either login or signup').isIn(['login', 'signup'])
], artistAuthController.sendArtistOtp);

router.post('/auth/verify-otp', [
  check('phone', 'Please include a valid phone number').isMobilePhone('any'),
  check('otp', 'OTP is required').isLength({ min: 6, max: 6 }),
  check('mode', 'Mode must be either login or signup').isIn(['login', 'signup'])
], artistAuthController.verifyArtistOtp);

// Public artist profiles
router.get('/public', artistProfileController.getApprovedArtists);
router.get('/public/:artistId', artistProfileController.getPublicArtistProfile);

// Protected routes - artist only
router.get('/profile', protect, authorize('artist'), artistAuthController.getArtistProfile);
router.put('/profile', [
  protect,
  authorize('artist'),
  check('bio', 'Bio cannot exceed 1000 characters').optional().isLength({ max: 1000 })
], artistAuthController.updateArtistProfile);

// Booking management routes
router.get('/bookings', protect, authorize('artist'), artistBookingController.getArtistBookings);
router.get('/bookings/:id', protect, authorize('artist'), artistBookingController.getBookingDetails);
router.put('/bookings/:id/accept', protect, authorize('artist'), artistBookingController.acceptBooking);
router.put('/bookings/:id/decline', protect, authorize('artist'), artistBookingController.declineBooking);
router.put('/bookings/:id/counter-offer', [
  protect,
  authorize('artist'),
  check('amount', 'Amount is required and must be a number').isNumeric(),
  check('message', 'Message cannot exceed 500 characters').optional().isLength({ max: 500 })
], artistBookingController.sendCounterOffer);
router.post('/bookings/:id/message', [
  protect,
  authorize('artist'),
  check('message', 'Message is required').not().isEmpty()
], artistBookingController.addBookingMessage);

// Terms and conditions management
router.get('/terms', protect, authorize('artist'), artistBookingController.getArtistTerms);
router.put('/terms', protect, authorize('artist'), artistBookingController.updateArtistTerms);
router.put('/cancellation-policy', protect, authorize('artist'), artistBookingController.updateCancellationPolicy);

// Gallery management routes
router.put('/gallery', protect, authorize('artist'), artistProfileController.updateGallery);
router.post('/gallery/photo', protect, authorize('artist'), artistProfileController.addPhoto);
router.post('/gallery/video', protect, authorize('artist'), artistProfileController.addVideo);
router.delete('/gallery/photo/:photoId', protect, authorize('artist'), artistProfileController.removePhoto);
router.delete('/gallery/video/:videoId', protect, authorize('artist'), artistProfileController.removeVideo);

// Accolades management routes
router.post('/accolades', [
  protect,
  authorize('artist'),
  check('title', 'Title is required').not().isEmpty()
], artistProfileController.addAccolade);
router.put('/accolades/:accoladeId', protect, authorize('artist'), artistProfileController.updateAccolade);
router.delete('/accolades/:accoladeId', protect, authorize('artist'), artistProfileController.removeAccolade);

// Social links management
router.put('/social-links', protect, authorize('artist'), artistProfileController.updateSocialLinks);

// Availability management routes
router.get('/availability', protect, authorize('artist'), artistAvailabilityController.getArtistAvailability);
router.post('/availability', [
  protect,
  authorize('artist'),
  check('date', 'Date is required').isISO8601(),
  check('timeSlots', 'Time slots are required').isArray({ min: 1 })
], artistAvailabilityController.setArtistAvailability);
router.put('/availability/:id', protect, authorize('artist'), artistAvailabilityController.updateArtistAvailability);
router.delete('/availability/:id', protect, authorize('artist'), artistAvailabilityController.deleteArtistAvailability);
router.post('/availability/bulk', [
  protect,
  authorize('artist'),
  check('dates', 'Dates array is required').isArray({ min: 1 }),
  check('timeSlots', 'Time slots are required').isArray({ min: 1 })
], artistAvailabilityController.bulkSetAvailability);
router.get('/calendar-overview', protect, authorize('artist'), artistAvailabilityController.getCalendarOverview);

// Analytics routes
router.get('/analytics/dashboard', protect, authorize('artist'), artistAnalyticsController.getDashboardStats);
router.get('/analytics/performance', protect, authorize('artist'), artistAnalyticsController.getPerformanceMetrics);
router.get('/analytics/event-types', protect, authorize('artist'), artistAnalyticsController.getEventTypeAnalytics);
router.get('/analytics/availability', protect, authorize('artist'), artistAnalyticsController.getAvailabilityMetrics);
router.get('/analytics/clients', protect, authorize('artist'), artistAnalyticsController.getClientAnalytics);
router.get('/analytics/report', protect, authorize('artist'), artistAnalyticsController.generateAnalyticsReport);

// Notification routes
router.get('/notifications', protect, authorize('artist'), artistAnalyticsController.getNotifications);
router.put('/notifications/mark-read', [
  protect,
  authorize('artist'),
  check('notificationIds', 'Notification IDs array is required').isArray()
], artistAnalyticsController.markNotificationsAsRead);

// Payment routes
router.get('/payments/history', protect, authorize('artist'), artistPaymentController.getPaymentHistory);
router.get('/payments/earnings', protect, authorize('artist'), artistPaymentController.getEarningsSummary);
router.get('/payments/invoice/:bookingId', protect, authorize('artist'), artistPaymentController.generatePaymentInvoice);

// Payment processing routes (webhooks)
router.post('/payments/advance-payment', [
  check('bookingId', 'Booking ID is required').isMongoId(),
  check('paymentData', 'Payment data is required').notEmpty()
], artistPaymentController.processAdvancePayment);
router.post('/payments/full-payment', [
  check('bookingId', 'Booking ID is required').isMongoId(),
  check('paymentData', 'Payment data is required').notEmpty()
], artistPaymentController.processFullPayment);

// Public availability routes (for organizers to view)
router.get('/:artistId/availability/:date', artistAvailabilityController.getAvailableSlots);

module.exports = router;
