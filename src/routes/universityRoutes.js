const express = require('express');

const router = express.Router();

const {
  createUniversity,
  getUniversities,
} = require('../controllers/universityController');

const {
  protect,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// Public
router.get('/', getUniversities);

// Admin only
router.post(
  '/',
  protect,
  authorizeRoles('admin'),
  createUniversity
);

module.exports = router;