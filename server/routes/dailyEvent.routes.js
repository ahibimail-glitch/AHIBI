const express = require('express');
const dailyEventController = require('../controllers/dailyEventController');
const dailyEventRsvpController = require('../controllers/dailyEventRsvpController');

const router = express.Router();

router.get('/', dailyEventController.getPublicDailyEvents);
router.post('/:id/rsvps', dailyEventRsvpController.createPublicRsvp);
router.get('/:id', dailyEventController.getPublicDailyEventById);

module.exports = router;
