const jwt =
  require('jsonwebtoken');

const User =
  require('../models/User');

// PROTECT ROUTES
const protect = async (
  req,
  res,
  next
) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith(
      'Bearer'
    )
  ) {
    try {
      token =
        req.headers.authorization.split(
          ' '
        )[1];

      // VERIFY TOKEN
      const decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );

      // GET FULL USER FROM DATABASE
      req.user =
        await User.findById(
          decoded.id
        ).select(
          '-password'
        );

      if (!req.user) {
        return res.status(401).json({
          message:
            'Not authorized, user no longer exists',
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        message:
          'Not authorized, token failed',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      message:
        'Not authorized, no token',
    });
  }
};

// ROLE AUTHORIZATION
const authorizeRoles =
  (...roles) => {
    return (
      req,
      res,
      next
    ) => {
      if (
        !roles.includes(
          req.user.role
        )
      ) {
        return res.status(403).json(
          {
            message: `Role (${req.user.role}) is not allowed`,
          }
        );
      }

      next();
    };
  };

module.exports = {
  protect,
  authorizeRoles,
};
