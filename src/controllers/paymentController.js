const axios = require('axios');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');

const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const User = require('../models/User');

const {
  createNotification,
  createNotifications,
} = require('../services/notificationService');

const PAYSTACK_BASE_URL =
  'https://api.paystack.co';

const getPaystackSecret =
  () => {
    if (
      !process.env
        .PAYSTACK_SECRET_KEY
    ) {
      throw new Error(
        'Paystack secret key is not configured'
      );
    }

    return process.env
      .PAYSTACK_SECRET_KEY;
  };

const getFrontendUrl =
  () => {
    if (
      !process.env.FRONTEND_URL
    ) {
      throw new Error(
        'Frontend URL is not configured'
      );
    }

    return process.env
      .FRONTEND_URL;
  };

const toPaystackAmount =
  (amount) =>
    Math.round(
      Number(amount) * 100
    );

const buildReference =
  (bookingId) =>
    `hh-${bookingId}-${Date.now()}-${crypto
      .randomBytes(6)
      .toString('hex')}`;

const getPaystackHeaders =
  () => ({
    Authorization: `Bearer ${getPaystackSecret()}`,
    'Content-Type':
      'application/json',
  });

/* ------------------------------------------------ */
/* RELEASE RESERVED ROOM */
/* ------------------------------------------------ */

const releaseReservedRoom =
  async (bookingId) => {
    const booking =
      await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          bedRestored: false,
        },
        {
          $set: {
            bedRestored: true,
            bookingStatus:
              'cancelled',
          },
        },
        {
          new: true,
        }
      );

    if (!booking) {
      return;
    }

    const student =
      await User.findById(
        booking.student
      ).select('gender');

    if (!student?.gender)
      return;

    const updateField =
      student.gender ===
      'Male'
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
        { new: true }
      );

    if (
      updatedRoom &&
      updatedRoom.availableBeds >
        0 &&
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
        roomStatus:
          'available',
      });

    await Hostel.findByIdAndUpdate(
      booking.hostel,
      {
        availableRooms:
          availableRoomsCount,
      }
    );
  };

/* ------------------------------------------------ */
/* PAYMENT STATUS */
/* ------------------------------------------------ */

const mapPaystackStatus =
  (status) => {
    if (
      status === 'abandoned'
    ) {
      return 'abandoned';
    }

    if (
      status === 'failed'
    ) {
      return 'failed';
    }

    return 'pending';
  };

const recordUnsuccessfulPayment =
  async (paymentData) => {
    const bookingId =
      paymentData?.metadata
        ?.bookingId;

    const reference =
      paymentData?.reference;

    if (
      !bookingId &&
      !reference
    ) {
      return null;
    }

    const booking =
      await Booking.findOne({
        $or: [
          bookingId
            ? {
                _id: bookingId,
              }
            : null,
          reference
            ? {
                paymentReference:
                  reference,
              }
            : null,
        ].filter(Boolean),
      });

    if (
      !booking ||
      booking.paymentStatus ===
        'paid'
    ) {
      return booking;
    }

    const nextStatus =
      mapPaystackStatus(
        paymentData.status
      );

    booking.paymentStatus =
      nextStatus;

    booking.paymentReference =
      reference ||
      booking.paymentReference;

    booking.paymentMethod =
      paymentData.channel ||
      booking.paymentMethod;

    booking.paystackTransactionId =
      paymentData.id ||
      booking.paystackTransactionId;

    booking.paymentVerifiedAt =
      new Date();

    if (
      [
        'failed',
        'abandoned',
      ].includes(nextStatus)
    ) {
      await releaseReservedRoom(
        booking._id
      );
    } else {
      await booking.save();
    }

    if (
      [
        'failed',
        'abandoned',
      ].includes(nextStatus)
    ) {
      await createNotification({
        user: booking.student,
        title:
          'Payment unsuccessful',
        message:
          'Your payment was not successful and the reserved bed was released.',
        type: 'payment',
        data: {
          booking: booking._id,
          reference,
          status: nextStatus,
        },
      });
    }

    return booking;
  };

/* ------------------------------------------------ */
/* SUCCESSFUL PAYMENT */
/* ------------------------------------------------ */

const applySuccessfulPayment =
  async (paymentData) => {
    const bookingId =
      paymentData?.metadata
        ?.bookingId;

    const reference =
      paymentData?.reference;

    if (!bookingId) {
      throw new Error(
        'Payment metadata missing bookingId'
      );
    }

    const booking =
      await Booking.findById(
        bookingId
      );

    if (!booking) {
      throw new Error(
        'Booking not found'
      );
    }

    if (
      booking.paymentStatus ===
      'paid'
    ) {
      return booking;
    }

    const expectedAmount =
      toPaystackAmount(
        booking.amount
      );

    if (
      Number(
        paymentData.amount
      ) !== expectedAmount
    ) {
      throw new Error(
        'Payment amount mismatch'
      );
    }

    booking.paymentStatus =
      'paid';

    booking.bookingStatus =
      'approved';

    booking.paymentReference =
      reference;

    booking.paymentMethod =
      paymentData.channel ||
      'paystack';

    booking.amountPaid =
      Number(
        paymentData.amount
      ) / 100;

    booking.paymentDate =
      paymentData.paid_at
        ? new Date(
            paymentData.paid_at
          )
        : new Date();

    booking.paystackTransactionId =
      paymentData.id;

    booking.paymentVerifiedAt =
      new Date();

    await booking.save();

    const hostel =
      await Hostel.findById(
        booking.hostel
      ).select('owner');

    await createNotifications([
      {
        user: booking.student,
        title:
          'Payment successful',
        message:
          'Your hostel booking payment was successful.',
        type: 'payment',
        data: {
          booking:
            booking._id,
          reference,
        },
      },
      {
        user: hostel?.owner,
        title:
          'Booking payment received',
        message:
          'A student completed payment for a hostel booking.',
        type: 'payment',
        data: {
          booking:
            booking._id,
          hostel:
            booking.hostel,
          reference,
        },
      },
    ]);

    return booking;
  };

/* ------------------------------------------------ */
/* INITIALIZE PAYMENT */
/* ------------------------------------------------ */

const initializePayment =
  asyncHandler(
    async (req, res) => {
      const { bookingId } =
        req.body;

      if (!bookingId) {
        res.status(400);

        throw new Error(
          'Booking ID is required'
        );
      }

      const booking =
        await Booking.findById(
          bookingId
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
        res.status(404);

        throw new Error(
          'Booking not found'
        );
      }

      if (
        booking.student._id.toString() !==
        req.user.id
      ) {
        res.status(403);

        throw new Error(
          'Not authorized'
        );
      }

      const reference =
        buildReference(
          booking._id.toString()
        );

      const amount =
        toPaystackAmount(
          booking.amount
        );

      const response =
        await axios.post(
          `${PAYSTACK_BASE_URL}/transaction/initialize`,
          {
            email:
              booking.student
                .email,
            amount,
            reference,
            callback_url: `${getFrontendUrl()}/payments/verify?reference=${reference}`,
            metadata: {
              bookingId:
                booking._id.toString(),
            },
          },
          {
            headers:
              getPaystackHeaders(),
          }
        );

      booking.paymentReference =
        reference;

      booking.paystackAccessCode =
        response.data.data
          .access_code;

      booking.paymentStatus =
        'pending';

      await booking.save();

      res.status(200).json({
        success: true,
        authorization_url:
          response.data.data
            .authorization_url,
        access_code:
          response.data.data
            .access_code,
        reference,
      });
    }
  );

/* ------------------------------------------------ */
/* VERIFY PAYMENT */
/* ------------------------------------------------ */

const verifyPayment =
  asyncHandler(
    async (req, res) => {
      const { reference } =
        req.params;

      if (!reference) {
        res.status(400);

        throw new Error(
          'Payment reference required'
        );
      }

      const response =
        await axios.get(
          `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
          {
            headers:
              getPaystackHeaders(),
            timeout: 15000,
          }
        );

      const paystackData =
        response.data.data;

      if (!paystackData) {
        res.status(400);

        throw new Error(
          'Invalid Paystack response'
        );
      }

      if (
        paystackData.status !==
        'success'
      ) {
        await recordUnsuccessfulPayment(
          paystackData
        );

        res.status(400);

        throw new Error(
          'Payment not successful'
        );
      }

      const booking =
        await applySuccessfulPayment(
          paystackData
        );

      res.status(200).json({
        success: true,
        message:
          'Payment verified successfully',
        booking,
      });
    }
  );

/* ------------------------------------------------ */
/* WEBHOOK */
/* ------------------------------------------------ */

const paystackWebhook =
  asyncHandler(
    async (req, res) => {
      const signature =
        req.headers[
          'x-paystack-signature'
        ];

      if (!signature) {
        return res
          .status(401)
          .json({
            message:
              'Missing Paystack signature',
          });
      }

      const hash = crypto
        .createHmac(
          'sha512',
          getPaystackSecret()
        )
        .update(req.body)
        .digest('hex');

      const isValidSignature =
        signature.length ===
          hash.length &&
        crypto.timingSafeEqual(
          Buffer.from(hash),
          Buffer.from(signature)
        );

      if (
        !isValidSignature
      ) {
        return res
          .status(401)
          .json({
            message:
              'Invalid signature',
          });
      }

      const event = JSON.parse(
        req.body.toString(
          'utf8'
        )
      );

      if (
        event.event ===
        'charge.success'
      ) {
        try {
          await applySuccessfulPayment(
            event.data
          );
        } catch (error) {
          console.error(
            'Webhook processing failed:',
            error.message
          );
        }
      }

      res.sendStatus(200);
    }
  );

module.exports = {
  initializePayment,
  verifyPayment,
  paystackWebhook,
};