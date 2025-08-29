const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Artist = require('../models/Artist');
const Organizer = require('../models/Organizer');
const Venue = require('../models/Venue');

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

      // Determine which model to use based on the route or token
      const isAdminRoute = req.originalUrl.startsWith('/api/admin');
      const isOrganizerRoute = req.originalUrl.startsWith('/api/organizer');
      const isArtistRoute = req.originalUrl.startsWith('/api/artist');
      const isVenueRoute = req.originalUrl.startsWith('/api/venue');
      
      let user;
      
      if (isAdminRoute || decoded.type === 'admin') {
        user = await Admin.findById(decoded.id);
        if (!user) {
          return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        user.role = 'admin'; // Manually set role for admin users
      } else if (isOrganizerRoute || decoded.type === 'organizer') {
        user = await Organizer.findById(decoded.id);
        if (!user) {
          return res.status(404).json({ success: false, message: 'Organizer not found' });
        }
      } else if (isArtistRoute || decoded.type === 'artist') {
        user = await Artist.findById(decoded.id);
        if (!user) {
          return res.status(404).json({ success: false, message: 'Artist not found' });
        }
      } else if (isVenueRoute || decoded.type === 'venue') {
        user = await Venue.findById(decoded.id);
        if (!user) {
          return res.status(404).json({ success: false, message: 'Venue not found' });
        }
      } else {
        user = await User.findById(decoded.id);
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
      }

      // Attach user to request
      req.user = user;

      // Check if user is active
      if (req.user.status === 'blocked') {
        return res.status(403).json({
          success: false,
          message: 'Your account is blocked'
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

/**
 * Middleware to restrict access to admin users only
 */
exports.adminOnly = (req, res, next) => {
  // Check if user is an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};
