const express = require('express');
const eventController = require('../controllers/eventController');

const router = express.Router();

// Public routes
router.get('/', eventController.getPublicEvents);
router.get('/:id', eventController.getPublicEventById);

// BGMI Registration route
router.post('/bgmi/register', eventController.registerBGMI);

module.exports = router;
