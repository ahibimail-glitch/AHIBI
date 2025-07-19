const express = require('express');
const { check } = require('express-validator');
const adminController = require('../controllers/adminController');
const eventController = require('../controllers/eventController');
const { protect, authorize } = require('../middlewares/auth');
const { validateEvent } = require('../middlewares/validation');

const router = express.Router();

// Protect all admin routes
router.use(protect);
router.use(authorize('admin'));

// Event management
router.post('/events', validateEvent, eventController.createEvent);

// Dashboard statistics
router.get('/dashboard', adminController.getDashboardStats);

// Pending approvals routes
router.get('/approvals', adminController.getPendingApprovals);
router.put('/approvals/organizer/:id', [
  check('status', 'Status is required').isIn(['approved', 'rejected']),
  check('rejectionReason', 'Rejection reason is required when status is rejected')
    .if((value, { req }) => req.body.status === 'rejected')
    .notEmpty()
], adminController.processOrganizerApproval);

router.put('/approvals/artist/:id', [
  check('status', 'Status is required').isIn(['approved', 'rejected']),
  check('rejectionReason', 'Rejection reason is required when status is rejected')
    .if((value, { req }) => req.body.status === 'rejected')
    .notEmpty()
], adminController.processArtistApproval);

router.put('/approvals/venue/:id', [
  check('status', 'Status is required').isIn(['approved', 'rejected']),
  check('rejectionReason', 'Rejection reason is required when status is rejected')
    .if((value, { req }) => req.body.status === 'rejected')
    .notEmpty()
], adminController.processVenueApproval);

router.put('/approvals/event/:id', [
  check('status', 'Status is required').isIn(['approved', 'rejected']),
  check('rejectionReason', 'Rejection reason is required when status is rejected')
    .if((value, { req }) => req.body.status === 'rejected')
    .notEmpty()
], adminController.processEventApproval);

// User management routes
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', [
  check('status', 'Status is required').isIn(['active', 'blocked'])
], adminController.updateUserStatus);

// Settings routes
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
