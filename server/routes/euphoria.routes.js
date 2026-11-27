const express = require('express');
const router = express.Router();
const controller = require('../controllers/euphoriaController');
const { protect, authorize } = require('../middlewares/auth');
const scannerAuth = require('../middlewares/scannerAuth');

// ---- Public ----
router.get('/config', controller.getPublicConfig);

// ---- Buyer (logged-in user) ----
router.post('/order', protect, controller.createOrder);
router.post('/verify', protect, controller.verifyPayment);
router.get('/my-bookings', protect, controller.getMyBookings);
router.get('/booking/:orderId', protect, controller.getBooking);

// ---- Scanner (gate staff log in via /api/scanner/login) ----
router.post('/scan', scannerAuth, controller.scanTicket);

// ---- Admin ----
router.get('/admin/config', protect, authorize('admin'), controller.getAdminConfig);
router.put('/admin/config', protect, authorize('admin'), controller.updateAdminConfig);
router.get('/admin/bookings', protect, authorize('admin'), controller.adminListBookings);
router.get('/admin/stats', protect, authorize('admin'), controller.adminStats);
router.post('/admin/scan', protect, authorize('admin'), controller.scanTicket);

module.exports = router;
