const express = require('express');
const eventController = require('../controllers/eventController');

const router = express.Router();

// Public routes
router.get('/', eventController.getPublicEvents);

module.exports = router;
