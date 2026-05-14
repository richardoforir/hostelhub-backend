const asyncHandler = require('express-async-handler');

const Favorite = require('../models/Favorite');
const Hostel = require('../models/Hostel');

// ADD FAVORITE
const addFavorite = asyncHandler(async (req, res) => {
  const hostelId = req.params.hostelId;

  // Check hostel exists
  const hostel = await Hostel.findById(hostelId);

  if (!hostel) {
    res.status(404);
    throw new Error('Hostel not found');
  }

  // Prevent duplicates
  const existingFavorite = await Favorite.findOne({
    student: req.user.id,
    hostel: hostelId,
  });

  if (existingFavorite) {
    res.status(400);
    throw new Error('Hostel already saved');
  }

  const favorite = await Favorite.create({
    student: req.user.id,
    hostel: hostelId,
  });

  res.status(201).json({
    message: 'Hostel added to favorites',
    favorite,
  });
});

// GET MY FAVORITES
const getFavorites = asyncHandler(async (req, res) => {
  const favorites = await Favorite.find({
    student: req.user.id,
  }).populate({
    path: 'hostel',
    populate: {
      path: 'university',
      select: 'name location',
    },
  });

  res.status(200).json(favorites);
});

// REMOVE FAVORITE
const removeFavorite = asyncHandler(async (req, res) => {
  const favorite = await Favorite.findOne({
    student: req.user.id,
    hostel: req.params.hostelId,
  });

  if (!favorite) {
    res.status(404);
    throw new Error('Favorite not found');
  }

  await favorite.deleteOne();

  res.status(200).json({
    message: 'Favorite removed successfully',
  });
});

module.exports = {
  addFavorite,
  getFavorites,
  removeFavorite,
};