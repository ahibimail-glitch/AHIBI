const express = require('express');
const { check } = require('express-validator');
const organizerAuthController = require('../controllers/organizerAuthController');
const eventController = require('../controllers/eventController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.post('/auth/signup', [
  check('name', 'Name is required').notEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('phone', 'Phone number is required').matches(/^\d{10}$/),
  check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  check('companyName', 'Company name is required').notEmpty(),
  check('description', 'Description is required').notEmpty(),
  check('address.street', 'Street address is required').notEmpty(),
  check('address.city', 'City is required').notEmpty(),
  check('address.state', 'State is required').notEmpty(),
  check('address.pincode', 'Valid pincode is required').matches(/^\d{6}$/),
  check('contactInfo.email', 'Contact email is required').isEmail()
], organizerAuthController.organizerSignup);

router.post('/auth/login', [
  check('phone', 'Phone number is required').matches(/^\d{10}$/),
  check('password', 'Password is required').notEmpty()
], organizerAuthController.organizerLogin);

router.post('/auth/send-otp', [
  check('phone', 'Phone number is required').matches(/^\d{10}$/),
  check('mode', 'Mode must be signup or login').isIn(['signup', 'login'])
], organizerAuthController.sendOrganizerOtp);

router.post('/auth/verify-otp', [
  check('phone', 'Phone number is required').matches(/^\d{10}$/),
  check('otp', 'OTP is required').isLength({ min: 6, max: 6 }),
  check('mode', 'Mode must be signup or login').isIn(['signup', 'login'])
], organizerAuthController.verifyOrganizerOtp);

// Protected routes (require authentication)
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

module.exports = router;
