const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Notification = require('../models/Notification');
const User = require('../models/User');
const {
  createNotifications,
} = require('../services/notificationService');

const clampLimit = (value, fallback = 20, max = 100) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const getPage = (value) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
};

// GET USER NOTIFICATIONS
const getNotifications = asyncHandler(
  async (req, res) => {
    const page = getPage(req.query.page);
    const limit = clampLimit(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;
    const filter = {
      user: req.user.id,
    };

    if (req.query.read === 'true') {
      filter.read = true;
    }

    if (req.query.read === 'false') {
      filter.read = false;
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        user: req.user.id,
        read: false,
      }),
    ]);

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unreadCount,
      notifications,
    });
  }
);

// MARK AS READ
const markAsRead = asyncHandler(
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Invalid notification id');
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      res.status(404);
      throw new Error('Notification not found');
    }

    notification.read = true;
    notification.readAt = new Date();

    await notification.save();

    res.status(200).json({
      message: 'Notification marked as read',
      notification,
    });
  }
);

// MARK ALL AS READ
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    {
      user: req.user.id,
      read: false,
    },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    }
  );

  res.status(200).json({
    message: 'Notifications marked as read',
    modifiedCount: result.modifiedCount,
  });
});

// ADMIN ANNOUNCEMENT
const createAdminAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, role } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400);
    throw new Error('Announcement message is required');
  }

  const userFilter = role ? { role } : {};
  const users = await User.find(userFilter).select('_id');

  const notifications = await createNotifications(
    users.map((user) => ({
      user: user._id,
      title: title || 'Admin announcement',
      message: message.trim(),
      type: 'admin',
      data: {
        role: role || 'all',
      },
    }))
  );

  res.status(201).json({
    message: 'Announcement sent',
    count: notifications.length,
  });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createAdminAnnouncement,
};
