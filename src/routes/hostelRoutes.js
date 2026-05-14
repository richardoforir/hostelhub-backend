const express = require('express');

const router = express.Router();

const {
  createHostel,
  getHostels,
  getOwnerHostels,
  getSingleHostel,
  getHostelRooms,
  updateHostel,
  deleteHostel,
} = require('../controllers/hostelController');

const {
  protect,
  authorizeRoles,
} = require('../middleware/authMiddleware');

/*
|--------------------------------------------------------------------------
| OWNER ROUTES
|--------------------------------------------------------------------------
*/

// Get owner's hostels
router.get(
  '/owner',
  protect,
  authorizeRoles('owner'),
  getOwnerHostels
);

// Create hostel
router.post(
  '/',
  protect,
  authorizeRoles('owner'),
  createHostel
);

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/

// Get all hostels
router.get(
  '/',
  getHostels
);

// Get single hostel
router.get(
  '/:id',
  getSingleHostel
);

// Get rooms for hostel
router.get(
  '/:id/rooms',
  getHostelRooms
);

// Update hostel
router.put(
  '/:id',
  protect,
  authorizeRoles('owner'),
  updateHostel
);

// Delete hostel
router.delete(
  '/:id',
  protect,
  authorizeRoles('owner'),
  deleteHostel
);

module.exports = router;