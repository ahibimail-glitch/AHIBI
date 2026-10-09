const express = require('express');
const controller = require('../controllers/geBlasterController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/', controller.getConfig);
router.get('/availability', controller.getAvailability);
router.post('/initiate', protect, controller.initiate);
router.post('/verify', protect, controller.verify);
router.get('/admin/bookings', protect, authorize('admin'), controller.getAdminBookings);
router.post('/admin/seed', protect, authorize('admin'), controller.adminSeed);

module.exports = router;
