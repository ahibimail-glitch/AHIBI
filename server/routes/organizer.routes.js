const express = require('express');
const { check } = require('express-validator');
const organizerAuthController = require('../controllers/organizerAuthController');
const eventController = require('../controllers/eventController');
const organizerBookingController = require('../controllers/organizerBookingController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.post('/auth/send-otp', [
  check('phone', 'Phone number is required').matches(/^\d{10}$/),
  check('mode', 'Mode must be signup or login').isIn(['signup', 'login']),
  // Conditional validation for signup
  check('name', 'Name is required').if(check('mode').equals('signup')).notEmpty(),
  check('email', 'Please include a valid email').if(check('mode').equals('signup')).isEmail(),
  check('companyName', 'Company name is required').if(check('mode').equals('signup')).notEmpty(),
  check('description', 'Description is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.street', 'Street address is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.city', 'City is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.state', 'State is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.pincode', 'Valid pincode is required').if(check('mode').equals('signup')).matches(/^\d{6}$/),
  check('contactInfo.email', 'Contact email is required').if(check('mode').equals('signup')).isEmail()
], organizerAuthController.sendOrganizerOtp);

router.post('/auth/verify-otp', [
  check('phone', 'Phone number is required').matches(/^\d{10}$/),
  check('otp', 'OTP is required').isLength({ min: 6, max: 6 }),
  check('mode', 'Mode must be signup or login').isIn(['signup', 'login'])
], organizerAuthController.verifyOrganizerOtp);

// Protected routes (require authentication)
router.get('/dashboard', protect, organizerAuthController.getOrganizerDashboard);
router.get('/profile', protect, organizerAuthController.getOrganizerProfile);
router.put('/profile', [
  protect,
  check('companyName', 'Company name is required').optional().notEmpty(),
  check('description', 'Description is required').optional().notEmpty(),
  check('contactInfo.email', 'Valid contact email is required').optional().isEmail()
], organizerAuthController.updateOrganizerProfile);

// Organizer event routes
router.post('/events', [
  protect,
  check('title', 'Event title is required').notEmpty(),
  check('description', 'Event description is required').notEmpty(),
  check('category', 'Event category is required').notEmpty(),
  check('startDate', 'Start date is required').notEmpty(),
  check('endDate', 'End date is required').notEmpty(),
  check('location.address', 'Venue address is required').notEmpty(),
  check('ticketTypes', 'At least one ticket type is required').isArray({ min: 1 })
], eventController.createOrganizerEvent);

router.get('/events', protect, eventController.getOrganizerEvents);
router.get('/events/:id', protect, eventController.getOrganizerEventById);
router.put('/events/:id', protect, eventController.updateOrganizerEvent);
router.delete('/events/:id', protect, eventController.deleteOrganizerEvent);

// Artist booking routes for organizers
router.get('/artists/search', protect, authorize('organizer'), organizerBookingController.searchArtistsWithAvailability);
router.get('/artists/:artistId/calendar', protect, authorize('organizer'), organizerBookingController.getArtistCalendar);
router.post('/bookings', [
  protect,
  authorize('organizer'),
  check('artistId', 'Artist ID is required').isMongoId(),
  check('event.name', 'Event name is required').notEmpty(),
  check('event.date', 'Event date is required').isISO8601(),
  check('event.startTime', 'Start time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('event.endTime', 'End time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('event.venue.name', 'Venue name is required').notEmpty(),
  check('event.venue.address', 'Venue address is required').notEmpty(),
  check('event.eventType', 'Event type is required').notEmpty(),
  check('requestedAmount', 'Requested amount is required').isNumeric()
], organizerBookingController.createBookingRequest);
router.get('/bookings', protect, authorize('organizer'), organizerBookingController.getOrganizerBookings);
router.get('/bookings/:id', protect, authorize('organizer'), organizerBookingController.getBookingDetails);
router.put('/bookings/:id/accept-counter-offer', protect, authorize('organizer'), organizerBookingController.acceptCounterOffer);
router.put('/bookings/:id/reject-counter-offer', [
  protect,
  authorize('organizer'),
  check('reason', 'Reason is required').optional().notEmpty()
], organizerBookingController.rejectCounterOffer);
router.put('/bookings/:id/cancel', [
  protect,
  authorize('organizer'),
  check('reason', 'Reason is required').optional().notEmpty()
], organizerBookingController.cancelBooking);
router.post('/bookings/:id/message', [
  protect,
  authorize('organizer'),
  check('message', 'Message is required').notEmpty()
], organizerBookingController.addBookingMessage);

module.exports = router;
