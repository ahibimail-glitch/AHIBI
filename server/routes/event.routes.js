const express = require('express');
const eventController = require('../controllers/eventController');

const router = express.Router();

// Public routes
router.get('/', eventController.getPublicEvents);
router.get('/:id', eventController.getPublicEventById);

// FC25 Registration routes
router.post('/FC25/register', eventController.registerFC25);
router.get('/FC25/slots', eventController.getFC25Slots);

module.exports = router;
