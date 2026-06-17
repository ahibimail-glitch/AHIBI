const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const artistAuthController = require('../controllers/artistAuthController');
const artistBookingController = require('../controllers/artistBookingController');
const artistProfileController = require('../controllers/artistProfileController');
const artistAvailabilityController = require('../controllers/artistAvailabilityController');
const merchController = require('../controllers/merchController');
const artistTeachingController = require('../controllers/artistTeachingController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.post('/auth/signup', [
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('phone', 'Please include a valid phone number').isMobilePhone('any'),
  check('city', 'City is required').not().isEmpty(),
  check('specialization', 'Specialization is required').not().isEmpty(),
  check('experience', 'Experience level is required').not().isEmpty(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
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

router.post('/auth/check-artist', [
  check('phone', 'Please include a valid phone number').isMobilePhone('any')
], artistAuthController.checkArtistExists);

router.post('/auth/login', [
  check('phone', 'Please include a valid phone number').isMobilePhone('any'),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], artistAuthController.loginWithPassword);

router.post('/auth/setup-password', [
  protect,
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], artistAuthController.setupPassword);

// Public artist profiles
router.get('/public', artistProfileController.getApprovedArtists);
router.get('/public/:artistId', artistProfileController.getPublicArtistProfile);
router.get('/public/:artistId/teaching/classes', artistTeachingController.getPublicClasses);
router.post('/public/:artistId/teaching/inquiries', [
  check('studentName', 'Student name is required').not().isEmpty(),
  check('studentPhone', 'Student phone is required').not().isEmpty(),
], artistTeachingController.submitPublicInquiry);

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
router.put('/bookings/:id/final-price', [
  protect,
  authorize('artist'),
  check('finalAmount', 'Final amount is required and must be a number').isNumeric()
], artistBookingController.setFinalPrice);
router.post('/bookings/:id/message', [
  protect,
  authorize('artist'),
  check('message', 'Message is required').not().isEmpty()
], artistBookingController.addBookingMessage);
router.get('/earnings', protect, authorize('artist'), artistBookingController.getEarnings);

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
router.put('/gallery/photo/:photoId/profile', protect, authorize('artist'), artistProfileController.setProfilePhoto);
router.put('/gallery/photo/:photoId/cover', protect, authorize('artist'), artistProfileController.setCoverPhoto);

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

// Public availability routes (for organizers to view)
router.get('/:artistId/availability/:date', artistAvailabilityController.getAvailableSlots);

// Artist merch product routes
router.post('/merch/products', protect, authorize('artist'), merchController.createProduct);
router.get('/merch/products', protect, authorize('artist'), merchController.getProducts);
router.get('/merch/products/:productId', protect, authorize('artist'), merchController.getProductById);
router.put('/merch/products/:productId', protect, authorize('artist'), merchController.updateProduct);
router.delete('/merch/products/:productId', protect, authorize('artist'), merchController.deleteProduct);
router.get('/merch/orders', protect, authorize('artist'), merchController.getArtistOrders);
router.put('/merch/orders/:orderId/status', protect, authorize('artist'), merchController.updateArtistOrderStatus);

// Teaching CRM routes
router.get('/teaching/overview', protect, authorize('artist'), artistTeachingController.getTeachingOverview);
router.get('/teaching/classes', protect, authorize('artist'), artistTeachingController.getClasses);
router.post('/teaching/classes', [
  protect,
  authorize('artist'),
  check('title', 'Title is required').not().isEmpty(),
  check('mode', 'Mode must be online, offline, or both').isIn(['online', 'offline', 'both']),
], artistTeachingController.createClass);
router.put('/teaching/classes/:classId', protect, authorize('artist'), artistTeachingController.updateClass);
router.delete('/teaching/classes/:classId', protect, authorize('artist'), artistTeachingController.deleteClass);
router.get('/teaching/inquiries', protect, authorize('artist'), artistTeachingController.getInquiries);
router.post('/teaching/inquiries', [
  protect,
  authorize('artist'),
  check('studentName', 'Student name is required').not().isEmpty(),
  check('studentPhone', 'Student phone is required').not().isEmpty(),
], artistTeachingController.createInquiry);
router.put('/teaching/inquiries/:inquiryId', protect, authorize('artist'), artistTeachingController.updateInquiry);
router.delete('/teaching/inquiries/:inquiryId', protect, authorize('artist'), artistTeachingController.deleteInquiry);

module.exports = router;
