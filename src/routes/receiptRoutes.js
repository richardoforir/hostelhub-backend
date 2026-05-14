const express = require('express');

const router = express.Router();

const Booking = require('../models/Booking');

const {
  protect,
} = require('../middleware/authMiddleware');

router.get(
  '/:id',
  protect,
  async (req, res) => {
    try {
      const booking =
        await Booking.findById(
          req.params.id
        )
          .populate(
            'student',
            'name email phone'
          )
          .populate(
            'room',
            'roomType price'
          )
          .populate(
            'hostel',
            'name location'
          );

      if (!booking) {
        return res
          .status(404)
          .json({
            message:
              'Receipt not found',
          });
      }

      // STUDENT SECURITY
      if (
        booking.student._id.toString() !==
        req.user.id
      ) {
        return res
          .status(403)
          .json({
            message:
              'Not authorized',
          });
      }

      res.json({
        success: true,
        booking,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          'Failed to load receipt',
      });
    }
  }
);

module.exports = router;