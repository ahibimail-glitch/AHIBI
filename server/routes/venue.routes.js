const express = require('express');
const { check } = require('express-validator');
const venueAuthController = require('../controllers/venueAuthController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Public routes for venue authentication
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

// Protected routes for venue profile
router.get('/profile', protect, venueAuthController.getVenueProfile);
router.put('/profile', protect, venueAuthController.updateVenueProfile);

module.exports = router;
