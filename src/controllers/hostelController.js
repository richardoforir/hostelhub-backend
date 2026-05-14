const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

const Hostel = require('../models/Hostel');
const Room = require('../models/Room');

const pickHostelFields = (body) => {
  const allowedFields = [
    'name',
    'description',
    'location',
    'price',
    'pricingType',
    'images',
    'featuredImage',
    'amenities',
    'rules',
    'policies',
    'university',
    'nearbyUniversities',
    'available',
    'wifi',
    'ac',
    'security',
    'water',
    'electricity',
    'totalRooms',
    'availableRooms',
    'genderAllowed',
  ];
  const update = {};

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      update[field] = body[field];
    }
  });

  return update;
};

// CREATE HOSTEL
const createHostel = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    location,
    price,
    pricingType,
    images,
    featuredImage,
    amenities,
    rules,
    policies,
    university,
    nearbyUniversities,
    wifi,
    ac,
    security,
    water,
    electricity,
    totalRooms,
    availableRooms,
    genderAllowed,
  } = req.body;

  const hostel = await Hostel.create({
    name,
    description,
    location,
    price,
    pricingType,
    images: images || [],
    featuredImage,
    amenities: amenities || [],
    rules: rules || [],
    policies: policies || [],
    university,
    nearbyUniversities: nearbyUniversities || [],
    wifi,
    ac,
    security,
    water,
    electricity,
    totalRooms,
    availableRooms,
    genderAllowed,

    // Logged in owner
    owner: req.user.id,
  });

  res.status(201).json({
    message: 'Hostel created successfully',
    hostel,
  });
});

// GET ALL HOSTELS WITH SEARCH, FILTERING, SORTING & PAGINATION
const getHostels = asyncHandler(async (req, res) => {
  const {
    location,
    university,
    minPrice,
    maxPrice,
    amenities,
    sort,
    page = 1,
    limit = 10,
  } = req.query;

  // FILTER OBJECT
  let filter = {};

  // Location filter
  if (location) {
    filter.location = {
      $regex: location,
      $options: 'i',
    };
  }

  // University filter
  if (university) {
    const isObjectId = mongoose.Types.ObjectId.isValid(university);

    if (isObjectId) {
      filter.$or = [
        { university: university },
        { nearbyUniversities: { $regex: university, $options: 'i' } },
      ];
    } else {
      filter.nearbyUniversities = {
        $regex: university,
        $options: 'i',
      };
    }
  }

  // Price filter
  if (minPrice || maxPrice) {
    filter.price = {};

    if (minPrice) {
      filter.price.$gte = Number(minPrice);
    }

    if (maxPrice) {
      filter.price.$lte = Number(maxPrice);
    }
  }

  // Amenities filter
  if (amenities) {
    filter.amenities = {
      $in: [amenities],
    };
  }

  // Sorting
  let sortOption = {};

  if (sort) {
    if (sort === 'price') {
      sortOption.price = 1;
    }

    if (sort === '-price') {
      sortOption.price = -1;
    }

    if (sort === 'latest') {
      sortOption.createdAt = -1;
    }
  }

  // Pagination
  const skip = (page - 1) * limit;

  // Query database
  const hostels = await Hostel.find(filter)
    .populate('university', 'name location region')
    .populate('owner', 'name email phone profileImage')
    .skip(skip)
    .limit(Number(limit))
    .sort(sortOption);

  // Total count
  const total = await Hostel.countDocuments(filter);

  res.status(200).json({
    total,
    currentPage: Number(page),
    totalPages: Math.ceil(total / limit),
    hostels,
  });
});

// GET OWNER HOSTELS
const getOwnerHostels = asyncHandler(async (req, res) => {
  const hostels = await Hostel.find({
    owner: req.user._id,
  })
    .populate('university', 'name location region')
    .sort({ createdAt: -1 });

  res.status(200).json(hostels);
});

// GET SINGLE HOSTEL
const getSingleHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id)
    .populate('university', 'name location region')
    .populate('owner', 'name email phone profileImage');

  if (!hostel) {
    res.status(404);
    throw new Error('Hostel not found');
  }

  res.status(200).json(hostel);
});

// GET ROOMS FOR A HOSTEL
const getHostelRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({
    hostel: req.params.id,
  }).populate('hostel', 'name location');

  res.status(200).json(rooms);
});

// UPDATE HOSTEL
const updateHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);

  if (!hostel) {
    res.status(404);
    throw new Error('Hostel not found');
  }

  // Ensure hostel belongs to owner
  if (hostel.owner.toString() !== req.user.id) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const updatedHostel = await Hostel.findByIdAndUpdate(
    req.params.id,
    pickHostelFields(req.body),
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    message: 'Hostel updated successfully',
    hostel: updatedHostel,
  });
});

// DELETE HOSTEL
const deleteHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);

  if (!hostel) {
    res.status(404);
    throw new Error('Hostel not found');
  }

  // Ensure hostel belongs to owner
  if (hostel.owner.toString() !== req.user.id) {
    res.status(401);
    throw new Error('Not authorized');
  }

  await hostel.deleteOne();

  res.status(200).json({
    message: 'Hostel deleted successfully',
  });
});

module.exports = {
  createHostel,
  getHostels,
  getOwnerHostels,
  getSingleHostel,
  getHostelRooms,
  updateHostel,
  deleteHostel,
};
