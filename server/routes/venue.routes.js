const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers
const {
  sendSignupOTP,
  verifySignupOTP,
  sendLoginOTP,
  verifyLoginOTP,
  passwordLogin,
  getProfile,
  updateProfile,
  setupPassword
} = require('../controllers/venueAuthController');

const {
  getPublicVenues,
  getPublicVenueById
} = require('../controllers/venueController');

const {
  getVenueSpaces,
  getSpaceById,
  createSpace,
  updateSpace,
  deleteSpace,
  getSpaceStats,
  getVenueBookings,
  getPublicVenueSpaces,
  getPublicSpaceById,
  getPublicSpacesListing,
  blockDateTime,
  getBlockedSlots,
  updateBlockedSlot,
  deleteBlockedSlot,
  getVenueSpacesWithBlockedSlots
} = require('../controllers/eventSpaceController');

// Import middleware
const venueAuth = require('../middlewares/venueAuth');

// Validation rules
const signupValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian phone number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('businessName').optional().custom((value) => {
    if (!value || value.trim() === '') return true;  // Allow empty
    return value.trim().length >= 2 && value.trim().length <= 100;  // Validate if filled
  }),
  // Optional fields - don't validate empty strings
  body('address.city').optional().custom((value) => {
    if (value && value.trim().length === 0) return true;
    if (value && value.trim().length > 0) return value.trim().length <= 50;
    return true;
  }),
  body('address.state').optional().custom((value) => {
    if (value && value.trim().length === 0) return true;
    if (value && value.trim().length > 0) return value.trim().length <= 50;
    return true;
  }),
  body('address.pincode').optional().custom((value) => {
    if (!value || value.trim() === '') return true;
    return /^\d{6}$/.test(value);
  }),
  body('contactPerson.name').optional().custom((value) => {
    if (value && value.trim().length === 0) return true;
    if (value && value.trim().length > 0) return value.trim().length >= 2 && value.trim().length <= 50;
    return true;
  }),
  body('contactPerson.phone').optional().custom((value) => {
    if (!value || value.trim() === '') return true;
    return /^[6-9]\d{9}$/.test(value);
  }),
  body('contactPerson.email').optional().custom((value) => {
    if (!value || value.trim() === '') return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  })
];

const otpValidation = [
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian phone number required'),
  body('otp').matches(/^\d{6}$/).withMessage('OTP must be 6 digits')
];

const loginValidation = [
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian phone number required')
];

const passwordLoginValidation = [
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian phone number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Valid Indian phone number required'),
  body('businessName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Business name must be 2-100 characters'),
  body('address.city').optional().trim().isLength({ min: 2, max: 50 }).withMessage('City must be 2-50 characters'),
  body('address.state').optional().trim().isLength({ min: 2, max: 50 }).withMessage('State must be 2-50 characters'),
  body('address.pincode').optional().matches(/^\d{6}$/).withMessage('Valid pincode required'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  // Social links validation
  body('socialLinks.website').optional().isURL().withMessage('Valid website URL required'),
  body('socialLinks.facebook').optional().isURL().withMessage('Valid Facebook URL required'),
  body('socialLinks.instagram').optional().isURL().withMessage('Valid Instagram URL required'),
  body('socialLinks.twitter').optional().isURL().withMessage('Valid Twitter URL required')
];

// Event space validation rules
const createSpaceValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Space name must be 2-100 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
  body('venueId').isMongoId().withMessage('Valid venue ID is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('capacityDetails.standingCapacity').isInt({ min: 1 }).withMessage('Standing capacity must be at least 1'),
  body('capacityDetails.minimumBookingCapacity').optional().isInt({ min: 1 }).withMessage('Minimum booking capacity must be at least 1'),
  body('pricing.basePrice').isFloat({ min: 0 }).withMessage('Base price must be non-negative'),
  body('pricing.hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be non-negative'),
  body('pricing.halfDayRate').optional().isFloat({ min: 0 }).withMessage('Half day rate must be non-negative'),
  body('pricing.fullDayRate').optional().isFloat({ min: 0 }).withMessage('Full day rate must be non-negative'),
  body('address.street').trim().isLength({ min: 5 }).withMessage('Street address is required'),
  body('address.city').trim().isLength({ min: 2, max: 50 }).withMessage('City must be 2-50 characters'),
  body('address.state').trim().isLength({ min: 2, max: 50 }).withMessage('State must be 2-50 characters'),
  body('address.pincode').matches(/^\d{6}$/).withMessage('Valid 6-digit pincode required'),
  body('venueClassification.indoorOutdoor').isIn(['indoor', 'outdoor', 'hybrid']).withMessage('Valid indoor/outdoor selection required'),
  body('contactInfo.phone').matches(/^\d{10}$/).withMessage('Valid 10-digit phone number required'),
  body('contactInfo.email').optional().isEmail().normalizeEmail().withMessage('Valid email required')
];

const updateSpaceValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Space name must be 2-100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('capacityDetails.standingCapacity').optional().isInt({ min: 1 }).withMessage('Standing capacity must be at least 1'),
  body('pricing.basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be non-negative'),
  body('address.street').optional().trim().isLength({ min: 5 }).withMessage('Street address is required'),
  body('address.city').optional().trim().isLength({ min: 2, max: 50 }).withMessage('City must be 2-50 characters'),
  body('address.state').optional().trim().isLength({ min: 2, max: 50 }).withMessage('State must be 2-50 characters'),
  body('address.pincode').optional().matches(/^\d{6}$/).withMessage('Valid 6-digit pincode required')
];

// Block date/time validation rules
const blockDateTimeValidation = [
  body('date').isISO8601().withMessage('Valid date is required'),
  body('isFullDayBlocked').optional().isBoolean().withMessage('Full day block must be a boolean'),
  body('timeSlots').optional().isArray().withMessage('Time slots must be an array'),
  body('timeSlots.*.startTime').optional().if(body('isFullDayBlocked').equals(false)).matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time format required (HH:MM)'),
  body('timeSlots.*.endTime').optional().if(body('isFullDayBlocked').equals(false)).matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time format required (HH:MM)'),
  body('reason').optional().isIn(['offline_booking', 'internal_event', 'maintenance', 'holiday', 'wedding_buffer', 'other']).withMessage('Valid reason is required'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters')
];

const updateBlockedSlotValidation = [
  body('isFullDayBlocked').optional().isBoolean().withMessage('Full day block must be a boolean'),
  body('timeSlots').optional().isArray().withMessage('Time slots must be an array'),
  body('timeSlots.*.startTime').optional().if(body('isFullDayBlocked').equals(false)).matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time format required (HH:MM)'),
  body('timeSlots.*.endTime').optional().if(body('isFullDayBlocked').equals(false)).matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time format required (HH:MM)'),
  body('reason').optional().isIn(['offline_booking', 'internal_event', 'maintenance', 'holiday', 'wedding_buffer', 'other']).withMessage('Valid reason is required'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters')
];

// Public routes (no authentication required)

// Get all approved venues
router.get('/', getPublicVenues);

// Public bookable spaces listing (e.g. jamming rooms)
router.get('/public/spaces', getPublicSpacesListing);

// Send OTP for signup
router.post('/auth/send-signup-otp', signupValidation, sendSignupOTP);

// Verify OTP and complete signup
router.post('/auth/verify-signup-otp', otpValidation, verifySignupOTP);

// Send OTP for login
router.post('/auth/send-login-otp', loginValidation, sendLoginOTP);

// Verify OTP and login
router.post('/auth/verify-login-otp', otpValidation, verifyLoginOTP);

// Password-based login
router.post('/auth/login', passwordLoginValidation, passwordLogin);

// Set / reset password (requires venue JWT)
router.post('/auth/setup-password', [
  venueAuth,
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], setupPassword);

// Protected routes (require authentication)

// Get venue profile
router.get('/profile', venueAuth, getProfile);

// Update venue profile
router.put('/profile', venueAuth, updateProfileValidation, updateProfile);

// Event space routes (protected)
// Get venue spaces
router.get('/spaces', venueAuth, getVenueSpaces);

// Get all bookings for venue (all spaces)
router.get('/spaces/bookings', venueAuth, getVenueBookings);

// Get space statistics
router.get('/spaces/stats', venueAuth, getSpaceStats);

// Create new space
router.post('/spaces', venueAuth, createSpaceValidation, createSpace);

// Update space
router.put('/spaces/:id', venueAuth, updateSpaceValidation, updateSpace);

// Delete space
router.delete('/spaces/:id', venueAuth, deleteSpace);

// Block date/time routes (protected)
// Get all spaces with their blocked slots for the venue
router.get('/spaces/blocked-slots', venueAuth, getVenueSpacesWithBlockedSlots);

// Get blocked slots for a specific space
router.get('/spaces/:id/blocked-slots', venueAuth, getBlockedSlots);

// Block date/time for a space
router.post('/spaces/:id/block', venueAuth, blockDateTimeValidation, blockDateTime);

// Update blocked slot
router.put('/spaces/:id/blocked-slots/:blockId', venueAuth, updateBlockedSlotValidation, updateBlockedSlot);

// Delete blocked slot
router.delete('/spaces/:id/blocked-slots/:blockId', venueAuth, deleteBlockedSlot);

// Get venue details by ID (public view) - Must be last to avoid conflicts
router.get('/:id', getPublicVenueById);

// Get public space details by ID (no auth required)
router.get('/spaces/:id', getPublicSpaceById);

// Get public spaces for a venue (no auth required)
router.get('/:id/spaces', getPublicVenueSpaces);

module.exports = router;
