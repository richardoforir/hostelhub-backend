const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    pricingType: {
      type: String,
      enum: ['monthly', 'semester', 'academic year'],
      default: 'semester',
    },

    images: [
      {
        type: String,
      },
    ],

    featuredImage: {
      type: String,
    },

    rules: [{ type: String }],
    policies: [{ type: String }],
    amenities: [
      {
        type: String,
      },
    ],

    // Specific amenities for quick filtering
    wifi: { type: Boolean, default: false },
    ac: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
    water: { type: Boolean, default: false },
    electricity: { type: Boolean, default: false },

    totalRooms: {
      type: Number,
      default: 0,
    },

    availableRooms: {
      type: Number,
      default: 0,
    },

    genderAllowed: {
      type: String,
      enum: ['Mixed', 'Male', 'Female'],
      default: 'Mixed',
    },

    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: false,
    },

    nearbyUniversities: {
      type: [String],
      default: [],
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    available: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Hostel', hostelSchema);
