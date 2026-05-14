const express = require('express');

const router = express.Router();

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createAdminAnnouncement,
} = require('../controllers/notificationController');

const {
  protect,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// Get notifications
router.get(
  '/',
  protect,
  getNotifications
);

// Admin announcement
router.post(
  '/announcements',
  protect,
  authorizeRoles('admin'),
  createAdminAnnouncement
);

// Mark all notifications as read
router.patch(
  '/read-all',
  protect,
  markAllAsRead
);

// Mark notification as read
router.patch(
  '/:id/read',
  protect,
  markAsRead
);

module.exports = router;
