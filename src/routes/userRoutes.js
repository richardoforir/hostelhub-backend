const express =
  require('express');

const router =
  express.Router();

const {
  getUserById,
  getProfile,
  updateProfile,
} = require('../controllers/userController');

const {
  protect,
} = require('../middleware/authMiddleware');

// GET PROFILE
router.get(
  '/profile',
  protect,
  getProfile
);

// UPDATE PROFILE
router.put(
  '/profile',
  protect,
  updateProfile
);

// GET USER BY ID
router.get(
  '/:id',
  protect,
  getUserById
);

module.exports = router;
