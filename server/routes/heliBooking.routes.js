const express = require('express');
const router = express.Router();
const c = require('../controllers/heliBookingController');
const { protect, authorize } = require('../middlewares/auth');

// Public
router.get('/config', c.getPublicConfig);
router.get('/availability', c.getAvailability);

// Buyer
router.post('/order', protect, c.createOrder);
router.post('/verify', protect, c.verifyPayment);
router.get('/my-bookings', protect, c.getMyBookings);
router.get('/booking/:orderId', protect, c.getBooking);
router.get('/booking/:orderId/ticket.pdf', protect, c.getTicketPdf);

// Admin
router.get('/admin/config', protect, authorize('admin'), c.getAdminConfig);
router.put('/admin/config', protect, authorize('admin'), c.updateAdminConfig);
router.get('/admin/bookings', protect, authorize('admin'), c.adminListBookings);
router.get('/admin/stats', protect, authorize('admin'), c.adminStats);
router.get('/admin/manifest.csv', protect, authorize('admin'), c.adminManifestCsv);

module.exports = router;
