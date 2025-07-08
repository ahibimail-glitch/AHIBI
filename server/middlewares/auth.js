const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect routes requiring authentication
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if auth header exists and has the correct format
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extract token from auth header
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request
      req.user = await User.findById(decoded.id).select('-otp -passwordResetToken -passwordResetExpires');

      if (!req.user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is active
      if (req.user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Your account is not active'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Middleware to restrict access to specific roles
 * @param  {...String} roles - Roles allowed to access the route
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user role is included in the authorized roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};
