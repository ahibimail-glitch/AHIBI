const express = require('express');
const eventController = require('../controllers/eventController');

const router = express.Router();

// Public routes
router.get('/', eventController.getPublicEvents);

// Debug route (temporary)
router.get('/debug/:id', eventController.debugEventById);

// FC25 Registration routes (place BEFORE generic :id route)
router.post('/FC25/register', eventController.registerFC25);
router.get('/FC25/slots', eventController.getFC25Slots);

// Generic event by id should come last to avoid capturing specific routes
router.get('/:id', eventController.getPublicEventById);

module.exports = router;
