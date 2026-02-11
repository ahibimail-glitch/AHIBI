const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middlewares/auth');

const {
  getAllTerms,
  getTermsByCategory,
  updateTermsByCategory,
  updateMultipleTerms
} = require('../controllers/adminTermsController');

// Validation rules
const updateTermsValidation = [
  body('heading')
    .trim()
    .notEmpty()
    .withMessage('Heading is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Heading must be between 3 and 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters long')
];

const updateMultipleTermsValidation = [
  body('terms')
    .isObject()
    .withMessage('Terms object is required'),
  body('terms.*.heading')
    .trim()
    .notEmpty()
    .withMessage('Heading is required for all terms')
    .isLength({ min: 3, max: 200 })
    .withMessage('Heading must be between 3 and 200 characters'),
  body('terms.*.content')
    .trim()
    .notEmpty()
    .withMessage('Content is required for all terms')
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters long')
];

// Protect all terms routes
router.use(protect);
router.use(authorize('admin'));

// Routes
// GET /api/admin/terms - Get all terms and conditions
router.get('/', getAllTerms);

// GET /api/admin/terms/:category - Get terms for specific category
router.get('/:category', getTermsByCategory);

// PUT /api/admin/terms/:category - Update terms for specific category
router.put('/:category', updateTermsValidation, updateTermsByCategory);

// PUT /api/admin/terms - Update multiple categories
router.put('/', updateMultipleTermsValidation, updateMultipleTerms);

module.exports = router;
