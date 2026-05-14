const asyncHandler = require('express-async-handler');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');

const assertOwnerCanManageHostel = async (hostelId, userId) => {
  const hostel = await Hostel.findById(hostelId).select('owner');
  if (!hostel) {
    const error = new Error('Hostel not found');
    error.statusCode = 404;
    throw error;
  }
  if (hostel.owner.toString() !== userId) {
    const error = new Error('Not authorized to manage rooms for this hostel');
    error.statusCode = 403;
    throw error;
  }
  return hostel;
};

const pickRoomFields = (body) => {
  const allowedFields = [
    'roomType',
    'occupancyStyle',
    'price',
    'billingPeriod',
    'capacity',
    'availableBeds',
    'maleAvailableBeds',
    'femaleAvailableBeds',
    'privateWashroom',
    'hasAC',
    'images',
    'featuredImage',
    'genderAllocation',
    'amenities',
    'description',
    'roomStatus',
  ];
  const update = {};
  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      update[field] = body[field];
    }
  });
  return update;
};

// CREATE ROOM
const createRoom = asyncHandler(async (req, res) => {
  const {
    hostel,
    roomType,
    occupancyStyle,
    price,
    billingPeriod,
    capacity,
    availableBeds,
    maleAvailableBeds,
    femaleAvailableBeds,
    privateWashroom,
    hasAC,
    images,
    featuredImage,
    genderAllocation,
    amenities,
    description,
    roomStatus,
  } = req.body;

  await assertOwnerCanManageHostel(hostel, req.user.id);

  const room = await Room.create({
    hostel,
    roomType,
    occupancyStyle,
    price,
    billingPeriod,
    capacity,
    availableBeds: availableBeds || 0,
    maleAvailableBeds: maleAvailableBeds || 0,
    femaleAvailableBeds: femaleAvailableBeds || 0,
    privateWashroom,
    hasAC,
    images: images || [],
    featuredImage,
    genderAllocation,
    amenities: amenities || [],
    description,
    roomStatus: roomStatus || 'available',
    createdBy: req.user.id,
  });

  const populatedRoom = await Room.findById(room._id).populate(
    'hostel',
    '_id name location'
  );

  // Sync hostel room counts
  const totalRooms = await Room.countDocuments({ hostel });
  const availableRoomsCount = await Room.countDocuments({
    hostel,
    availableBeds: { $gt: 0 },
    roomStatus: 'available'
  });

  await Hostel.findByIdAndUpdate(hostel, {
    totalRooms,
    availableRooms: availableRoomsCount,
  });

  res.status(201).json({
    message: 'Room created successfully',
    room: populatedRoom,
  });
});

// GET ALL ROOMS
const getRooms = asyncHandler(async (req, res) => {
  const { hostelId } = req.query;
  const filter = hostelId ? { hostel: hostelId } : {};
  
  const rooms = await Room.find(filter)
    .populate('hostel', '_id name location')
    .sort({ createdAt: -1 });

  res.status(200).json(rooms);
});

// GET SINGLE ROOM
const getSingleRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate(
    'hostel',
    '_id name location'
  );
  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }
  res.status(200).json(room);
});

// UPDATE ROOM
const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }
  await assertOwnerCanManageHostel(room.hostel, req.user.id);

  const updatedRoom = await Room.findByIdAndUpdate(
    req.params.id,
    pickRoomFields(req.body),
    {
      new: true,
      runValidators: true,
    }
  ).populate('hostel', '_id name location');

  // Sync hostel room counts if relevant fields changed
  const relevantFields = ['availableBeds', 'maleAvailableBeds', 'femaleAvailableBeds', 'roomStatus'];
  const shouldSync = relevantFields.some(field => Object.prototype.hasOwnProperty.call(req.body, field));

  if (shouldSync) {
    const availableRoomsCount = await Room.countDocuments({
      hostel: room.hostel,
      availableBeds: { $gt: 0 },
      roomStatus: 'available'
    });
    await Hostel.findByIdAndUpdate(room.hostel, { availableRooms: availableRoomsCount });
  }

  res.status(200).json({
    message: 'Room updated successfully',
    room: updatedRoom,
  });
});

// DELETE ROOM
const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }
  await assertOwnerCanManageHostel(room.hostel, req.user.id);
  const hostelId = room.hostel;
  await room.deleteOne();

  // Sync hostel room counts
  const totalRoomsCount = await Room.countDocuments({ hostel: hostelId });
  const availableRoomsCount = await Room.countDocuments({
    hostel: hostelId,
    availableBeds: { $gt: 0 },
    roomStatus: 'available'
  });

  await Hostel.findByIdAndUpdate(hostelId, {
    totalRooms: totalRoomsCount,
    availableRooms: availableRoomsCount,
  });

  res.status(200).json({
    message: 'Room deleted successfully',
  });
});

module.exports = {
  createRoom,
  getRooms,
  getSingleRoom,
  updateRoom,
  deleteRoom,
};
