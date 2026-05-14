const Notification = require('../models/Notification');

const createNotification = async ({
  user,
  title,
  message,
  type = 'system',
  data = {},
}) => {
  if (!user || !message) {
    return null;
  }

  return Notification.create({
    user,
    title,
    message,
    type,
    data,
  });
};

const createNotifications = async (notifications) => {
  const validNotifications = notifications.filter(
    (notification) => notification.user && notification.message
  );

  if (!validNotifications.length) {
    return [];
  }

  return Notification.insertMany(validNotifications, {
    ordered: false,
  });
};

module.exports = {
  createNotification,
  createNotifications,
};
