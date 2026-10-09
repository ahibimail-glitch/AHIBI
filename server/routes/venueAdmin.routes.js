const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers
const {
  getAllVenues,
  getVenueById,
  approveVenue,
  rejectVenue
} = require('../controllers/venueAdminController');

// Import middleware
const adminAuth = require('../middlewares/adminAuth');

// Validation rules
const approveRejectValidation = [
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be max 500 characters')
];

const rejectValidation = [
  body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Rejection reason must be 10-500 characters'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be max 500 characters')
];

// Admin routes (require authentication)
router.use(adminAuth);

// Get all venues
router.get('/', getAllVenues);

// Get venue by ID
router.get('/:id', getVenueById);

// Approve venue - Updated to debug route issues
router.put('/:id/approve', (req, res, next) => {
  console.log('🚀 APPROVE ROUTE HIT! 🚀');
  console.log('Venue ID from params:', req.params.id);
  console.log('Request body:', req.body);
  next();
}, approveVenue);

// Reject venue
router.put('/:id/reject', rejectVenue);

module.exports = router;
