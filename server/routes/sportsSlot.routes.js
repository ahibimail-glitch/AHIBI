const express = require('express');
const { protect } = require('../middleware/auth');
const sportsSlotController = require('../controllers/sportsSlotController');

const router = express.Router();

// All routes are protected
router.use(protect);

// Regenerate slots endpoints
router.post('/courts/:courtId/regenerate-slots', sportsSlotController.regenerateSlots);
router.post('/courts/:courtId/regenerate-slots-bulk', sportsSlotController.regenerateSlotsBulk);

module.exports = router;
