const express = require('express');

const router = express.Router();

const {
  createBooking,
  getBookings,
  getMyBookings,
  getBookingById,
  getOwnerBookings,
  cancelBooking,
  updateBookingStatus,
} = require(
  '../controllers/bookingController'
);

const {
  protect,
  authorizeRoles,
} = require(
  '../middleware/authMiddleware'
);

/* ========================================
   CREATE BOOKING
======================================== */

router.post(
  '/',
  protect,
  authorizeRoles('student'),
  createBooking
);

/* ========================================
   GET STUDENT BOOKINGS
======================================== */

router.get(
  '/my-bookings',
  protect,
  authorizeRoles('student'),
  getMyBookings
);

/* ========================================
   GET OWNER BOOKINGS
======================================== */

router.get(
  '/owner',
  protect,
  authorizeRoles('owner'),
  getOwnerBookings
);

/* ========================================
   GET SINGLE BOOKING / RECEIPT
   IMPORTANT FOR:
   /payments/receipt/[id]
======================================== */

router.get(
  '/:id',
  protect,
  getBookingById
);

/* ========================================
   GET ALL BOOKINGS
======================================== */

router.get(
  '/',
  protect,
  getBookings
);

/* ========================================
   UPDATE BOOKING STATUS
======================================== */

router.put(
  '/:id/status',
  protect,
  authorizeRoles(
    'owner',
    'admin'
  ),
  updateBookingStatus
);

/* ========================================
   CANCEL BOOKING
======================================== */

router.put(
  '/:id/cancel',
  protect,
  authorizeRoles('student'),
  cancelBooking
);

module.exports = router;