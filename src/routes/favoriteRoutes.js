const express = require('express');

const router = express.Router();

const {
  addFavorite,
  getFavorites,
  removeFavorite,
} = require('../controllers/favoriteController');

const {
  protect,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// Add favorite
router.post(
  '/:hostelId',
  protect,
  authorizeRoles('student'),
  addFavorite
);

// Get favorites
router.get(
  '/',
  protect,
  authorizeRoles('student'),
  getFavorites
);

// Remove favorite
router.delete(
  '/:hostelId',
  protect,
  authorizeRoles('student'),
  removeFavorite
);

module.exports = router;