const asyncHandler = require('express-async-handler');

const Review = require('../models/Review');
const Hostel = require('../models/Hostel');

// CREATE REVIEW
const createReview = asyncHandler(async (req, res) => {
  const {
    hostel,
    rating,
    comment,
  } = req.body;

  // Check hostel exists
  const hostelExists = await Hostel.findById(hostel);

  if (!hostelExists) {
    res.status(404);
    throw new Error('Hostel not found');
  }

  // Check if student already reviewed hostel
  const existingReview = await Review.findOne({
    hostel,
    student: req.user.id,
  });

  if (existingReview) {
    res.status(400);
    throw new Error('You already reviewed this hostel');
  }

  // Create review
  const review = await Review.create({
    hostel,
    student: req.user.id,
    rating,
    comment,
  });

  res.status(201).json({
    message: 'Review added successfully',
    review,
  });
});

// GET HOSTEL REVIEWS
const getHostelReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({
    hostel: req.params.id,
  })
    .populate('student', 'name email')
    .sort({ createdAt: -1 });

  // Calculate average rating
  const averageRating =
    reviews.reduce(
      (acc, review) => acc + review.rating,
      0
    ) / (reviews.length || 1);

  res.status(200).json({
    totalReviews: reviews.length,
    averageRating,
    reviews,
  });
});

module.exports = {
  createReview,
  getHostelReviews,
};