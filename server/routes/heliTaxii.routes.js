const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const heliTaxiiController = require('../controllers/heliTaxiiController');

// @route   POST /api/helitaxii/leads
// @desc    Create a Helitaxii lead when user clicks Book Now
// @access  Private
router.post('/leads', protect, heliTaxiiController.createLead);

module.exports = router;
