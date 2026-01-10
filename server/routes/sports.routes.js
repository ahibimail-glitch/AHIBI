const express = require('express');
const router = express.Router();
const sportsBookingController = require('../controllers/sportsBookingController');
const { protect } = require('../middlewares/auth');

// ============ VENUE DISCOVERY ROUTES (PUBLIC) ============
router.get('/venues', sportsBookingController.searchVenues);
router.get('/venues/:id', sportsBookingController.getVenueDetails);
router.get('/venues/:id/courts', sportsBookingController.getAvailableCourts);

// ============ SLOT AVAILABILITY ROUTES (PUBLIC) ============
router.get('/courts/:courtId/slots', sportsBookingController.getAvailableSlots);

// ============ BOOKING PROCESS ROUTES (PROTECTED) ============
router.post('/slots/hold', protect, sportsBookingController.holdSlots);
router.post('/slots/release', protect, sportsBookingController.releaseSlots);
router.post('/bookings/create-order', protect, sportsBookingController.createBookingOrder);
router.post('/bookings/verify-payment', protect, sportsBookingController.verifyPaymentAndConfirm);

// ============ USER BOOKING ROUTES (PROTECTED) ============
router.get('/my-bookings', protect, sportsBookingController.getMyBookings);
router.get('/bookings/:id', protect, sportsBookingController.getBookingById);
router.post('/bookings/:id/cancel', protect, sportsBookingController.cancelBooking);

// ============ REVIEW ROUTES (PROTECTED) ============
router.post('/venues/:id/reviews', protect, sportsBookingController.addVenueReview);

module.exports = router;
