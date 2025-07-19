const { check, validationResult } = require('express-validator');

const validateEvent = [
  // Basic event info
  check('title', 'Title is required').not().isEmpty().trim(),
  check('description', 'Description is required').not().isEmpty(),
  check('banner', 'Banner image URL is required').not().isEmpty(),
  check('category', 'Category is required').not().isEmpty(),
  
  // Date and time validation
  check('startDate', 'Start date is required').isISO8601().toDate(),
  check('endDate', 'End date is required').isISO8601().toDate(),
  check('endDate').custom((value, { req }) => {
    if (new Date(value) <= new Date(req.body.startDate)) {
      throw new Error('End date must be after start date');
    }
    return true;
  }),
  
  // Location validation
  check('location.address', 'Address is required').not().isEmpty(),
  check('location.city', 'City is required').not().isEmpty(),
  check('location.state', 'State is required').not().isEmpty(),
  check('location.country', 'Country is required').not().isEmpty(),
  check('location.pincode', 'Pincode is required').not().isEmpty(),
  
  // Ticket types validation
  check('ticketTypes').isArray({ min: 1 }).withMessage('At least one ticket type is required'),
  check('ticketTypes.*.name', 'Ticket type name is required').not().isEmpty(),
  check('ticketTypes.*.price', 'Ticket price is required and must be a number').isNumeric(),
  check('ticketTypes.*.quantity', 'Ticket quantity is required and must be a number').isInt({ min: 1 }),
  
  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    next();
  }
];

module.exports = {
  validateEvent
};
