const express = require('express');
const controller = require('../controllers/workshopRsvpController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/', controller.getEventConfig);
router.get('/admin/registrations', protect, authorize('admin'), controller.getAdminRegistrations);

module.exports = router;
