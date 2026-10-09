const { check, validationResult } = require('express-validator');

const validateEvent = [
  // Basic event info
  check('title', 'Title is required').not().isEmpty().trim(),
  check('description', 'Description is required').not().isEmpty(),
  check('banner', 'Banner image URL is required').not().isEmpty(),
  check('coverImage', 'Cover image URL is required').optional().not().isEmpty(),
  check('termsAndConditions', 'Terms and conditions must be a string').optional().isString(),
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
  
  // Ticket types validation - only for paid events
  check('ticketTypes').custom((value, { req }) => {
    if (req.body.isFreeEvent) {
      // For free events, ticketTypes should be an empty array or not provided
      return true;
    }
    // For paid events, at least one ticket type is required
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error('At least one ticket type is required for paid events');
    }
    return true;
  }),
  check('ticketTypes.*.name', 'Ticket type name is required').custom((value, { req }) => {
    if (req.body.isFreeEvent) return true;
    if (!value || value.trim() === '') {
      throw new Error('Ticket type name is required');
    }
    return true;
  }),
  check('ticketTypes.*.price', 'Ticket price is required and must be a number').custom((value, { req }) => {
    if (req.body.isFreeEvent) return true;
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Ticket price must be a valid number');
    }
    return true;
  }),
  check('ticketTypes.*.quantity', 'Ticket quantity is required and must be a number').custom((value, { req }) => {
    if (req.body.isFreeEvent) return true;
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('Ticket quantity must be a positive integer');
    }
    return true;
  }),
  
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
