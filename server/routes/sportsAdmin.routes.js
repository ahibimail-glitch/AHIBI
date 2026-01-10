const express = require('express');
const router = express.Router();
const sportsAdminController = require('../controllers/sportsAdminController');
const { protect, adminOnly } = require('../middlewares/auth');

// All routes require admin authentication
router.use(protect);
router.use(adminOnly);

// ============ ARENA PARTNER MANAGEMENT ROUTES ============
router.get('/arena-partners', sportsAdminController.getAllArenaPartners);
router.get('/arena-partners/:id', sportsAdminController.getArenaPartnerById);
router.put('/arena-partners/:id/approve', sportsAdminController.approveArenaPartner);
router.put('/arena-partners/:id/reject', sportsAdminController.rejectArenaPartner);
router.put('/arena-partners/:id/suspend', sportsAdminController.suspendArenaPartner);
router.put('/arena-partners/:id/commission', sportsAdminController.updateCommissionRate);

// Partner specific routes for management dashboard
router.get('/arena-partners/:id/venues', sportsAdminController.getPartnerVenues);
router.get('/arena-partners/:id/bookings', sportsAdminController.getPartnerBookings);
router.get('/arena-partners/:id/disputes', sportsAdminController.getPartnerDisputes);
router.put('/arena-partners/:id/kyc/verify', sportsAdminController.verifyKycDocument);

// ============ VENUE MANAGEMENT ROUTES ============
router.get('/venues', sportsAdminController.getAllVenues);
router.get('/venues/:id', sportsAdminController.getVenueById);
router.put('/venues/:id/approve', sportsAdminController.approveVenue);
router.put('/venues/:id/reject', sportsAdminController.rejectVenue);
router.put('/venues/:id/featured', sportsAdminController.toggleFeatured);

// Venue specific routes for management dashboard
router.get('/venues/:id/courts', sportsAdminController.getVenueCourts);
router.get('/venues/:id/bookings', sportsAdminController.getVenueBookings);
router.get('/venues/:id/reviews', sportsAdminController.getVenueReviews);
router.put('/venues/:id/toggle-active', sportsAdminController.toggleVenueActive);
router.delete('/reviews/:id', sportsAdminController.deleteReview);

// ============ BOOKING MANAGEMENT ROUTES ============
router.get('/bookings', sportsAdminController.getAllBookings);
router.get('/bookings/:id', sportsAdminController.getBookingById);

// ============ DISPUTE MANAGEMENT ROUTES ============
router.put('/disputes/:id/resolve', sportsAdminController.resolveDispute);

// ============ PAYOUT MANAGEMENT ROUTES ============
router.get('/payouts', sportsAdminController.getAllPayouts);
router.get('/payouts/:id', sportsAdminController.getPayoutById);
router.post('/payouts/create', sportsAdminController.createManualPayout);
router.put('/payouts/:id/process', sportsAdminController.processPayout);
router.put('/payouts/:id/complete', sportsAdminController.completePayout);
router.put('/payouts/:id/fail', sportsAdminController.failPayout);
router.post('/payouts/generate-scheduled', sportsAdminController.generateScheduledPayouts);

// ============ ANALYTICS & REPORTS ROUTES ============
router.get('/dashboard/stats', sportsAdminController.getDashboardStats);
router.get('/analytics/revenue', sportsAdminController.getRevenueAnalytics);

module.exports = router;
