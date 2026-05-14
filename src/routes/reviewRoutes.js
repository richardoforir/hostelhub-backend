const express = require('express');

const router = express.Router();

const {
  createReview,
  getHostelReviews,
} = require('../controllers/reviewController');

const {
  protect,
  authorizeRoles,
} = require('../middleware/authMiddleware');

// Student creates review
router.post(
  '/',
  protect,
  authorizeRoles('student'),
  createReview
);

// Public - Get hostel reviews
router.get(
  '/:id',
  getHostelReviews
);

module.exports = router;