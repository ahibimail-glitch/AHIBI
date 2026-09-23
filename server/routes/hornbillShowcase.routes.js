const express = require('express');
const router = express.Router();
const controller = require('../controllers/hornbillShowcaseController');

router.get('/day1', controller.getDay1Event);
router.post('/day1/register', controller.registerDay1);
router.get('/day1/pass/:bookingId', controller.getDay1Pass);

module.exports = router;
