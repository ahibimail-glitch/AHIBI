const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Validation rules
const signupValidation = [
  check('name', 'Name is required')
    .notEmpty()
    .trim(),
  check('email', 'Please include a valid email')
    .notEmpty()
    .isEmail()
    .normalizeEmail(),
  check('phone', 'Please provide a valid 10-digit phone number')
    .notEmpty()
    .isLength({ min: 10, max: 10 })
    .matches(/^\d{10}$/),
  check('city', 'City is required')
    .notEmpty()
    .trim()
];

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
  check('otp', 'Please provide a valid OTP')
    .notEmpty()
    .isLength({ min: 6, max: 64 })
];

const passwordValidation = [
  check('phone', 'Please provide a valid 10-digit phone number')
    .notEmpty()
    .isLength({ min: 10, max: 10 })
    .matches(/^\d{10}$/),
  check('password', 'Password must be at least 6 characters long')
    .notEmpty()
    .isLength({ min: 6 })
];

const passwordSetupValidation = [
  check('password', 'Password must be at least 6 characters long')
    .notEmpty()
    .isLength({ min: 6 })
];

const profileValidation = [
  check('name', 'Name is required').optional(),
  check('email', 'Please include a valid email').optional().isEmail(),
  check('profilePic', 'Profile picture must be a string').optional().isString()
];

const locationValidation = [
  check('latitude', 'Latitude must be a number between -90 and 90')
    .optional()
    .isFloat({ min: -90, max: 90 }),
  check('longitude', 'Longitude must be a number between -180 and 180')
    .optional()
    .isFloat({ min: -180, max: 180 }),
  check('address', 'Address must be a string').optional().isString()
];

// Public routes
router.post('/signup', signupValidation, authController.signup);
router.post('/phone-login', phoneValidation, authController.loginWithPhone);
router.post('/send-otp', phoneValidation, authController.sendOtp);
router.post('/verify-otp', otpValidation, authController.verifyOtp);
router.post('/login', passwordValidation, authController.loginWithPassword);
router.post('/check-user', phoneValidation, authController.checkUserExists);
router.post('/forgot-password', phoneValidation, authController.forgotPassword);
router.post('/reset-password', otpValidation.concat([
  check('newPassword', 'Password must be at least 6 characters long')
    .notEmpty()
    .isLength({ min: 6 })
]), authController.resetPassword);
router.post('/setup-password', protect, passwordSetupValidation, authController.setupPassword);

// Protected routes
router.get('/profile', protect, authController.getProfile);
router.put('/update-profile', protect, profileValidation, authController.updateProfile);
router.put('/update-location', protect, locationValidation, authController.updateLocation);

module.exports = router;
