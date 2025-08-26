const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const artistAuthController = require('../controllers/artistAuthController');
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

// Protected routes - artist only
router.get('/profile', protect, authorize('artist'), artistAuthController.getArtistProfile);
router.put('/profile', [
  protect,
  authorize('artist'),
  check('bio', 'Bio cannot exceed 1000 characters').optional().isLength({ max: 1000 })
], artistAuthController.updateArtistProfile);

module.exports = router;
