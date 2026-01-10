const express = require('express');
const router = express.Router();
const arenaPartnerAuthController = require('../controllers/arenaPartnerAuthController');
const arenaPartnerController = require('../controllers/arenaPartnerController');
const { protect } = require('../middlewares/auth');

// ============ AUTHENTICATION ROUTES ============
router.post('/auth/send-otp', arenaPartnerAuthController.sendOtp);
router.post('/auth/verify-otp', arenaPartnerAuthController.verifyOtp);
router.get('/auth/profile', protect, arenaPartnerAuthController.getProfile);
router.put('/auth/profile', protect, arenaPartnerAuthController.updateProfile);
router.post('/auth/kyc-upload', protect, arenaPartnerAuthController.uploadKycDocuments);
router.post('/auth/submit-approval', protect, arenaPartnerAuthController.submitForApproval);

// ============ VENUE MANAGEMENT ROUTES ============
router.post('/venues', protect, arenaPartnerController.createVenue);
router.get('/venues', protect, arenaPartnerController.getMyVenues);
router.get('/venues/:id', protect, arenaPartnerController.getVenueById);
router.put('/venues/:id', protect, arenaPartnerController.updateVenue);
router.delete('/venues/:id', protect, arenaPartnerController.deleteVenue);

// ============ COURT MANAGEMENT ROUTES ============
router.post('/venues/:venueId/courts', protect, arenaPartnerController.createCourt);
router.get('/venues/:venueId/courts', protect, arenaPartnerController.getCourts);
router.get('/courts/:id', protect, arenaPartnerController.getCourtById);
router.put('/courts/:id', protect, arenaPartnerController.updateCourt);
router.delete('/courts/:id', protect, arenaPartnerController.deleteCourt);
router.post('/courts/:id/blackout', protect, arenaPartnerController.addBlackoutDates);
router.delete('/courts/:id/blackout/:blackoutId', protect, arenaPartnerController.removeBlackoutDates);

// ============ BOOKING MANAGEMENT ROUTES ============
router.get('/bookings', protect, arenaPartnerController.getBookings);
router.get('/bookings/:id', protect, arenaPartnerController.getBookingById);
router.post('/bookings/:id/check-in', protect, arenaPartnerController.checkInBooking);
router.post('/bookings/:id/complete', protect, arenaPartnerController.completeBooking);
router.post('/bookings/walk-in', protect, arenaPartnerController.createWalkInBooking);

// ============ DASHBOARD & ANALYTICS ROUTES ============
router.get('/dashboard/stats', protect, arenaPartnerController.getDashboardStats);
router.get('/analytics/revenue', protect, arenaPartnerController.getRevenueAnalytics);

// ============ PAYOUT ROUTES ============
router.get('/payouts', protect, arenaPartnerController.getPayouts);
router.get('/payouts/:id', protect, arenaPartnerController.getPayoutById);

module.exports = router;
