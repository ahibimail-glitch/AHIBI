const express = require('express');
const router = express.Router();
const adminNotificationController = require('../controllers/adminNotificationController');
const { protect, authorize } = require('../middlewares/auth');

// Protect all routes - admin only
router.use(protect);
router.use(authorize('admin'));

// Get notification statistics
router.get('/stats', adminNotificationController.getStats);

// Get all notifications with filtering
router.get('/', adminNotificationController.getNotifications);

// Mark all as read
router.put('/read-all', adminNotificationController.markAllAsRead);

// Get notification by ID
router.get('/:id', adminNotificationController.getNotificationById);

// Mark notification as read
router.put('/:id/read', adminNotificationController.markAsRead);

// Archive notification
router.put('/:id/archive', adminNotificationController.archiveNotification);

// Record action taken
router.put('/:id/action', adminNotificationController.recordAction);

// Delete notification
router.delete('/:id', adminNotificationController.deleteNotification);

module.exports = router;
