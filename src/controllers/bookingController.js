const asyncHandler = require('express-async-handler');

const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const User = require('../models/User');

const {
  createNotification,
} = require('../services/notificationService');

/* =========================================
   RESTORE ROOM BED
========================================= */
const restoreRoomBed = async (bookingId) => {
  const booking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      bedRestored: false,
    },
    {
      $set: {
        bedRestored: true,
      },
    },
    {
      new: true,
    }
  );

  if (!booking) {
    return;
  }

  const student = await User.findById(
    booking.student
  ).select('gender');

  if (!student?.gender) {
    return;
  }

  const updateField =
    student.gender === 'Male'
      ? 'maleAvailableBeds'
      : 'femaleAvailableBeds';

  const updatedRoom =
    await Room.findByIdAndUpdate(
      booking.room,
      {
        $inc: {
          [updateField]: 1,
          availableBeds: 1,
        },
      },
      {
        new: true,
      }
    );

  if (
    updatedRoom &&
    updatedRoom.availableBeds > 0 &&
    updatedRoom.roomStatus ===
      'unavailable'
  ) {
    updatedRoom.roomStatus =
      'available';

    await updatedRoom.save();
  }

  const availableRoomsCount =
    await Room.countDocuments({
      hostel: booking.hostel,
      availableBeds: {
        $gt: 0,
      },
      roomStatus: 'available',
    });

  await Hostel.findByIdAndUpdate(
    booking.hostel,
    {
      availableRooms:
        availableRoomsCount,
    }
  );
};

/* =========================================
   CREATE BOOKING
========================================= */
const createBooking =
  asyncHandler(async (req, res) => {
    const {
      room,
      checkInDate,
    } = req.body;

    const existingRoom =
      await Room.findById(room);

    if (!existingRoom) {
      res.status(404);
      throw new Error(
        'Room not found'
      );
    }

    if (
      existingRoom.roomStatus !==
      'available'
    ) {
      res.status(400);
      throw new Error(
        `Room is currently ${existingRoom.roomStatus}`
      );
    }

    const studentGender =
      req.user.gender;

    if (!studentGender) {
      res.status(400);
      throw new Error(
        'Please update your profile with your gender before booking'
      );
    }

    if (
      existingRoom.genderAllocation ===
        'Male' &&
      studentGender !== 'Male'
    ) {
      res.status(400);
      throw new Error(
        'This room is reserved for Male students only'
      );
    }

    if (
      existingRoom.genderAllocation ===
        'Female' &&
      studentGender !==
        'Female'
    ) {
      res.status(400);
      throw new Error(
        'This room is reserved for Female students only'
      );
    }

    const updateField =
      studentGender === 'Male'
        ? 'maleAvailableBeds'
        : 'femaleAvailableBeds';

    const reservedRoom =
      await Room.findOneAndUpdate(
        {
          _id: room,
          [updateField]: {
            $gt: 0,
          },
          roomStatus:
            'available',
        },
        {
          $inc: {
            [updateField]: -1,
            availableBeds: -1,
          },
        },
        {
          new: true,
        }
      );

    if (!reservedRoom) {
      res.status(400);
      throw new Error(
        `No available ${studentGender} beds in this room`
      );
    }

    if (
      reservedRoom.availableBeds ===
      0
    ) {
      reservedRoom.roomStatus =
        'unavailable';

      await reservedRoom.save();
    }

    let booking;

    try {
      booking =
        await Booking.create({
          student: req.user.id,
          room,
          hostel:
            existingRoom.hostel,
          amount:
            existingRoom.price,
          checkInDate,
          paymentStatus:
            'pending',
          bookingStatus:
            'pending',
        });

      const hostel =
        await Hostel.findById(
          existingRoom.hostel
        ).select(
          'owner name'
        );

      if (hostel?.owner) {
        await createNotification({
          user: hostel.owner,
          title: 'New booking',
          message: `A student (${studentGender}) created a new booking.`,
          type: 'booking',
          data: {
            booking:
              booking._id,
            hostel:
              hostel._id,
            room,
          },
        });
      }
    } catch (error) {
      await Room.findByIdAndUpdate(
        room,
        {
          $inc: {
            [updateField]: 1,
            availableBeds: 1,
          },
        }
      );

      if (booking?._id) {
        await Booking.findByIdAndDelete(
          booking._id
        );
      }

      throw error;
    }

    const availableRoomsCount =
      await Room.countDocuments({
        hostel:
          existingRoom.hostel,
        availableBeds: {
          $gt: 0,
        },
        roomStatus:
          'available',
      });

    await Hostel.findByIdAndUpdate(
      existingRoom.hostel,
      {
        availableRooms:
          availableRoomsCount,
      }
    );

    const populatedBooking =
      await Booking.findById(
        booking._id
      )
        .populate('room')
        .populate({
          path: 'hostel',
          populate: {
            path: 'owner',
            select:
              'name email phone',
          },
        })
        .populate(
          'student',
          'name email phone gender'
        );

    res.status(201).json({
      success: true,
      message:
        'Booking created successfully',
      booking:
        populatedBooking,
      _id:
        populatedBooking._id,
    });
  });

/* =========================================
   GET MY BOOKINGS
========================================= */
const getMyBookings =
  asyncHandler(async (req, res) => {
    const bookings =
      await Booking.find({
        student: req.user.id,
      })
        .populate({
          path: 'room',
          select:
            'roomType price images',
        })
        .populate({
          path: 'hostel',
          select:
            'name location owner',
          populate: {
            path: 'owner',
            select:
              'name email phone',
          },
        })
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      success: true,
      bookings,
    });
  });

/* =========================================
   GET SINGLE BOOKING
========================================= */
const getBookingById =
  asyncHandler(async (req, res) => {
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
          'roomType price images'
        )
        .populate({
          path: 'hostel',
          select:
            'name location owner',
          populate: {
            path: 'owner',
            select:
              'name email phone',
          },
        });

    if (!booking) {
      res.status(404);
      throw new Error(
        'Booking not found'
      );
    }

    const isStudent =
      booking.student._id.toString() ===
      req.user.id;

    let isOwner = false;

    if (
      booking.hostel?.owner?._id
    ) {
      isOwner =
        booking.hostel.owner._id.toString() ===
        req.user.id;
    }

    if (
      !isStudent &&
      !isOwner &&
      req.user.role !== 'admin'
    ) {
      res.status(403);
      throw new Error(
        'Not authorized'
      );
    }

    res.status(200).json({
      success: true,
      booking,
    });
  });

/* =========================================
   GET ALL BOOKINGS
========================================= */
const getBookings =
  asyncHandler(async (req, res) => {
    const bookings =
      await Booking.find()
        .populate(
          'student',
          'name email'
        )
        .populate(
          'room',
          'roomType price'
        )
        .populate(
          'hostel',
          'name location'
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      success: true,
      bookings,
    });
  });

/* =========================================
   OWNER BOOKINGS
========================================= */
const getOwnerBookings =
  asyncHandler(async (req, res) => {
    // 1. Find all hostels owned by this user
    const ownerHostels =
      await Hostel.find({
        owner: req.user.id,
      }).select('_id');

    if (!ownerHostels || ownerHostels.length === 0) {
      return res.status(200).json({
        success: true,
        bookings: [],
      });
    }

    const hostelIds =
      ownerHostels.map(
        (hostel) => hostel._id
      );

    // 2. Find all bookings for these hostels
    const bookings =
      await Booking.find({
        hostel: {
          $in: hostelIds,
        },
      })
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
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  });

/* =========================================
   CANCEL BOOKING
========================================= */
const cancelBooking =
  asyncHandler(async (req, res) => {
    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      res.status(404);
      throw new Error(
        'Booking not found'
      );
    }

    if (
      booking.student.toString() !==
      req.user.id
    ) {
      res.status(401);
      throw new Error(
        'Not authorized'
      );
    }

    if (
      booking.bookingStatus ===
      'approved'
    ) {
      res.status(400);
      throw new Error(
        'Approved bookings cannot be cancelled'
      );
    }

    if (
      booking.bookingStatus ===
      'cancelled'
    ) {
      res.status(400);
      throw new Error(
        'Booking already cancelled'
      );
    }

    booking.bookingStatus =
      'cancelled';

    await booking.save();

    const hostel =
      await Hostel.findById(
        booking.hostel
      ).select('owner');

    if (hostel?.owner) {
      await createNotification({
        user: hostel.owner,
        title:
          'Booking cancelled',
        message:
          'A student cancelled a booking.',
        type: 'booking',
        data: {
          booking:
            booking._id,
          hostel:
            booking.hostel,
          room: booking.room,
        },
      });
    }

    await restoreRoomBed(
      booking._id
    );

    res.status(200).json({
      success: true,
      message:
        'Booking cancelled successfully',
      booking,
    });
  });

/* =========================================
   UPDATE BOOKING STATUS
========================================= */
const updateBookingStatus =
  asyncHandler(async (req, res) => {
    const { status } =
      req.body;

    if (
      ![
        'approved',
        'rejected',
        'completed',
      ].includes(status)
    ) {
      res.status(400);
      throw new Error(
        'Invalid booking status'
      );
    }

    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      res.status(404);
      throw new Error(
        'Booking not found'
      );
    }

    if (
      req.user.role ===
      'owner'
    ) {
      const hostel =
        await Hostel.findById(
          booking.hostel
        ).select('owner');

      if (
        !hostel ||
        hostel.owner.toString() !==
          req.user.id
      ) {
        res.status(403);
        throw new Error(
          'Not authorized'
        );
      }
    }

    booking.bookingStatus =
      status;

    await booking.save();

    if (status === 'rejected') {
      await restoreRoomBed(
        booking._id
      );
    }

    await createNotification({
      user: booking.student,
      title: `Booking ${status}`,
      message: `Your booking has been ${status}.`,
      type: 'booking',
      data: {
        booking:
          booking._id,
        hostel:
          booking.hostel,
        room: booking.room,
        status,
      },
    });

    res.status(200).json({
      success: true,
      message:
        'Booking status updated successfully',
      booking,
    });
  });

module.exports = {
  createBooking,
  getBookings,
  getMyBookings,
  getBookingById,
  getOwnerBookings,
  cancelBooking,
  updateBookingStatus,
};