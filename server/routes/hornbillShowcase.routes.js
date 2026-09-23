const express = require('express');
const router = express.Router();
const controller = require('../controllers/hornbillShowcaseController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/day1', controller.getDay1Event);
router.post('/day1/register', controller.registerDay1);
router.get('/day1/pass/:bookingId', controller.getDay1Pass);

router.get(
  '/day1/registrations',
  protect,
  authorize('admin'),
  controller.listDay1Registrations
);

module.exports = router;
