const express = require('express');

const router = express.Router();

const {
  getOwnerAnalytics,
} = require('../controllers/analyticsController');

const {
  protect,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// Owner analytics
router.get(
  '/owner',
  protect,
  authorizeRoles('owner'),
  getOwnerAnalytics
);

module.exports = router;