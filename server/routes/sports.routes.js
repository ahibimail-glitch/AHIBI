const express = require('express');
const router = express.Router();
const sportsBookingController = require('../controllers/sportsBookingController');
const sportsSlotController = require('../controllers/sportsSlotController');
const sportsTournamentController = require('../controllers/sportsTournamentController');
const { protect } = require('../middlewares/auth');

// ============ VENUE DISCOVERY ROUTES (PUBLIC) ============
router.get('/venues', sportsBookingController.searchVenues);
router.get('/venues/:id', sportsBookingController.getVenueDetails);
router.get('/venues/:id/courts', sportsBookingController.getAvailableCourts);

// ============ TOURNAMENT REGISTRATION ROUTES (PUBLIC) ============
router.post('/tournaments/register', sportsTournamentController.createRegistrationOrder);
router.post('/tournaments/verify-payment', sportsTournamentController.verifyPayment);
router.get('/tournaments/registration/number/:registrationNumber', sportsTournamentController.getRegistrationByNumber);
router.get('/tournaments/registration/:id', sportsTournamentController.getRegistrationById);
router.get('/tournaments/invoice/:invoiceNumber', sportsTournamentController.downloadInvoice);

// ============ COURT ROUTES (PUBLIC) ============
router.get('/courts/:courtId', sportsBookingController.getCourtDetails);

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

// ============ SLOT MANAGEMENT ROUTES (PROTECTED - ARENA PARTNER) ============
router.post('/courts/:courtId/regenerate-slots', protect, sportsSlotController.regenerateSlots);
router.post('/courts/:courtId/regenerate-slots-bulk', protect, sportsSlotController.regenerateSlotsBulk);

module.exports = router;
