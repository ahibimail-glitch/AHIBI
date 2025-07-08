const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Protect all notification routes
router.use(protect);

// Get user notifications
router.get('/', notificationController.getUserNotifications);

// Mark notification as read
router.put('/:id/read', notificationController.markNotificationRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllNotificationsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
