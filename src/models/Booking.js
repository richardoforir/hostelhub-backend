const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },

    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
    },

    bookingStatus: {
      type: String,
      enum: [
        'pending',
        'approved',
        'cancelled',
        'completed',
        'rejected',
      ],
      default: 'pending',
    },

    paymentStatus: {
      type: String,
      enum: [
        'pending',
        'paid',
        'failed',
        'cancelled',
        'abandoned',
      ],
      default: 'pending',
    },

    amount: {
      type: Number,
      required: true,
    },

    checkInDate: {
      type: Date,
      required: true,
    },

    paymentReference: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
      unique: true,
    },

    paymentMethod: {
      type: String,
      trim: true,
    },

    amountPaid: {
      type: Number,
      default: 0,
    },

    paymentDate: {
      type: Date,
    },

    paymentProvider: {
      type: String,
      enum: ['paystack'],
      default: 'paystack',
    },

    paystackAccessCode: {
      type: String,
      trim: true,
    },

    paystackTransactionId: {
      type: Number,
    },

    paymentVerifiedAt: {
      type: Date,
    },

    bedRestored: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'Booking',
  bookingSchema
);
