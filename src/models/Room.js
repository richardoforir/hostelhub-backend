const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
    },

    roomType: {
      type: String,
      required: true,
    },

    occupancyStyle: {
      type: String,
      enum: ['1-in-1', '2-in-1', '3-in-1', '4-in-1'],
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    billingPeriod: {
      type: String,
      enum: ['monthly', 'semester', 'academic year'],
      default: 'semester',
    },

    capacity: {
      type: Number,
      required: true,
    },

    availableBeds: {
      type: Number,
      required: true,
      default: 0,
    },

    maleAvailableBeds: {
      type: Number,
      default: 0,
    },

    femaleAvailableBeds: {
      type: Number,
      default: 0,
    },

    privateWashroom: {
      type: Boolean,
      default: false,
    },

    hasAC: {
      type: Boolean,
      default: false,
    },

    images: [
      {
        type: String,
      },
    ],

    featuredImage: {
      type: String,
    },

    genderAllocation: {
      type: String,
      enum: ['Mixed', 'Male', 'Female'],
      default: 'Mixed',
    },

    amenities: [
      {
        type: String,
      },
    ],

    description: {
      type: String,
    },

    roomStatus: {
      type: String,
      enum: ['available', 'unavailable', 'maintenance'],
      default: 'available',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// SYNC AVAILABLE BEDS AND VALIDATE CAPACITY
roomSchema.pre('save', function () {
  // Male-only rooms
  if (this.genderAllocation === 'Male') {
    this.femaleAvailableBeds = 0;
  }

  // Female-only rooms
  if (this.genderAllocation === 'Female') {
    this.maleAvailableBeds = 0;
  }

  // Safely convert values to numbers
  const maleBeds = Number(this.maleAvailableBeds || 0);
  const femaleBeds = Number(this.femaleAvailableBeds || 0);
  const totalBeds = maleBeds + femaleBeds;

  // Sync total available beds
  this.availableBeds = totalBeds;

  // Prevent capacity overflow
  if (totalBeds > this.capacity) {
    throw new Error(
      `Available beds (${totalBeds}) cannot exceed capacity (${this.capacity})`
    );
  }

  // Prevent negative values
  if (maleBeds < 0 || femaleBeds < 0) {
    throw new Error(
      'Available bed counts cannot be negative'
    );
  }

  // Auto-manage room status
  if (totalBeds === 0) {
    this.roomStatus = 'unavailable';
  } else if (this.roomStatus === 'unavailable') {
    this.roomStatus = 'available';
  }
});

module.exports = mongoose.model('Room', roomSchema);