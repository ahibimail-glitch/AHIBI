const express = require('express');
const dailyEventController = require('../controllers/dailyEventController');

const router = express.Router();

router.get('/', dailyEventController.getPublicDailyEvents);
router.get('/:id', dailyEventController.getPublicDailyEventById);

module.exports = router;
