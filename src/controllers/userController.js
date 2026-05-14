const asyncHandler =
  require('express-async-handler');

const User =
  require('../models/User');

// GET PROFILE
const getProfile =
  asyncHandler(
    async (req, res) => {
      const user =
        await User.findById(
          req.user.id
        ).populate(
          'university',
          'name'
        );

      if (!user) {
        res.status(404);

        throw new Error(
          'User not found'
        );
      }

      res.status(200).json(user);
    }
  );

// UPDATE PROFILE
const updateProfile =
  asyncHandler(
    async (req, res) => {
      const user =
        await User.findById(
          req.user.id
        );

      if (!user) {
        res.status(404);

        throw new Error(
          'User not found'
        );
      }

      user.name =
        req.body.name ||
        user.name;

      user.phone =
        req.body.phone ||
        user.phone;

      user.gender =
        req.body.gender ||
        user.gender;

      user.bio =
        req.body.bio ||
        user.bio;

      user.profileImage =
        req.body.profileImage ||
        user.profileImage;

      const updatedUser =
        await user.save();

      res.status(200).json({
        message:
          'Profile updated successfully',

        user: updatedUser,
      });
    }
  );

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'name email phone role profileImage bio createdAt'
  );

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json(user);
});

module.exports = {
  getUserById,
  getProfile,
  updateProfile,
};
