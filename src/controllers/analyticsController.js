const asyncHandler = require('express-async-handler');

const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

// OWNER ANALYTICS
const getOwnerAnalytics = asyncHandler(async (req, res) => {
  // Get owner hostels
  const hostels = await Hostel.find({
    owner: req.user.id,
  });

  const hostelIds = hostels.map(
    (hostel) => hostel._id
  );

  // Total hostels
  const totalHostels = hostels.length;

  // Total rooms
  const totalRooms = await Room.countDocuments({
    hostel: { $in: hostelIds },
  });

  // Total bookings and Revenue calculation
  const allBookings = await Booking.find({
    hostel: { $in: hostelIds },
  });

  const totalBookings = allBookings.length;

  const approvedBookings = allBookings.filter(
    (booking) => booking.bookingStatus === 'approved'
  ).length;

  const totalRevenue = allBookings
    .filter(
      (booking) =>
        booking.paymentStatus === 'paid' &&
        booking.bookingStatus === 'approved'
    )
    .reduce((sum, booking) => sum + (booking.amount || 0), 0);

  // Reviews
  const reviews = await Review.find({
    hostel: { $in: hostelIds },
  });

  const totalReviews = reviews.length;

  // Average rating
  const averageRating =
    reviews.reduce(
      (acc, review) => acc + review.rating,
      0
    ) / (reviews.length || 1);

  res.status(200).json({
    success: true,
    totalHostels,
    totalRooms,
    totalBookings,
    approvedBookings,
    totalRevenue,
    totalReviews,
    averageRating,
  });
});

module.exports = {
  getOwnerAnalytics,
};