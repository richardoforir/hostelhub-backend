const express =
  require('express');

const router =
  express.Router();

const {
  createRoom,
  getRooms,
  getSingleRoom,
  updateRoom,
  deleteRoom,
} = require(
  '../controllers/roomController'
);

const {
  protect,
  authorizeRoles,
} = require(
  '../middleware/authMiddleware'
);

// GET ALL ROOMS
router.get(
  '/',
  getRooms
);

// GET SINGLE ROOM
router.get(
  '/:id',
  getSingleRoom
);

// CREATE ROOM
router.post(
  '/',
  protect,
  authorizeRoles(
    'owner'
  ),
  createRoom
);

// UPDATE ROOM
router.put(
  '/:id',
  protect,
  authorizeRoles(
    'owner'
  ),
  updateRoom
);

// DELETE ROOM
router.delete(
  '/:id',
  protect,
  authorizeRoles(
    'owner'
  ),
  deleteRoom
);

module.exports = router;