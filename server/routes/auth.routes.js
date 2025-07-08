const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Validation rules
const phoneValidation = [
  check('phone', 'Please provide a valid 10-digit phone number')
    .notEmpty()
    .isLength({ min: 10, max: 10 })
    .matches(/^\d{10}$/)
];

const otpValidation = [
  check('phone', 'Please provide a valid 10-digit phone number')
    .notEmpty()
    .isLength({ min: 10, max: 10 })
    .matches(/^\d{10}$/),
  check('otp', 'Please provide a valid 6-digit OTP')
    .notEmpty()
    .isLength({ min: 6, max: 6 })
    .matches(/^\d{6}$/)
];

const profileValidation = [
  check('name', 'Name is required').optional(),
  check('email', 'Please include a valid email').optional().isEmail()
];

// Public routes
router.post('/send-otp', phoneValidation, authController.sendOtp);
router.post('/verify-otp', otpValidation, authController.verifyOtp);

// Protected routes
router.get('/profile', protect, authController.getProfile);
router.put('/update-profile', protect, profileValidation, authController.updateProfile);

module.exports = router;
