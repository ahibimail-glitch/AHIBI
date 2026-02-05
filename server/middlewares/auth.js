const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Artist = require('../models/Artist');
const Organizer = require('../models/Organizer');
const Venue = require('../models/Venue');
const ArenaPartner = require('../models/ArenaPartner');

/**
 * Middleware to protect routes requiring authentication
 */
exports.protect = async (req, res, next) => {
  try {
    console.log('=== AUTH MIDDLEWARE ===');
    console.log('Route:', req.originalUrl);
    console.log('Headers:', req.headers.authorization ? 'Token present' : 'No token');
    
    let token;

    // Check if auth header exists and has the correct format
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extract token from auth header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extracted:', token ? 'Yes' : 'No');
    }

    // Check if token exists
    if (!token) {
      console.log('AUTH FAILED: No token provided');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully. User ID:', decoded.id, 'Role:', decoded.role);

      // Determine which model to use based on the token role primarily, not just the route
      // Keep a central list of admin-only route prefixes
      const isAdminRoute =
        req.originalUrl.startsWith('/api/admin') ||
        req.originalUrl.startsWith('/api/system') ||
        req.originalUrl.startsWith('/api/livestream/admin');

      const isOrganizerRoute = req.originalUrl.startsWith('/api/organizer');
      const isArtistRoute = req.originalUrl.startsWith('/api/artist');
      const isVenueRoute = req.originalUrl.startsWith('/api/venue');
      const isArenaPartnerRoute = req.originalUrl.startsWith('/api/arena-partner');
      
      // Check if this is a venue management route (only venue users should access these)
      const isVenueManagerRoute = req.originalUrl.includes('/manager/') || 
                                  req.originalUrl.includes('/profile') ||
                                  req.originalUrl.includes('/details/') ||
                                  req.originalUrl.includes('/auth/');
      
      console.log('Route detection - Admin:', isAdminRoute, 'Organizer:', isOrganizerRoute, 'Artist:', isArtistRoute, 'Venue:', isVenueRoute, 'Arena Partner:', isArenaPartnerRoute);
      console.log('Venue manager route:', isVenueManagerRoute, 'Token role:', decoded.role);
      
      let user;
      
      // Use token role as primary determinant, with route as secondary check
      // Strict role checking - prevent cross-role access
      if (isArenaPartnerRoute && decoded.role !== 'arenaPartner') {
        console.log('AUTH FAILED: Non-arena partner trying to access arena partner route');
        return res.status(403).json({ success: false, message: 'Arena partner access required' });
      }

      if (isAdminRoute && decoded.role !== 'admin') {
        console.log('AUTH FAILED: Non-admin trying to access admin route');
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }
      
      if (decoded.role === 'admin') {
        console.log('Looking for Admin with ID:', decoded.id);
        user = await Admin.findById(decoded.id);
        if (!user) {
          console.log('AUTH FAILED: Admin not found. Checking if any admins exist...');
          const adminCount = await Admin.countDocuments();
          console.log('Total admins in database:', adminCount);
          if (adminCount === 0) {
            console.log('No admins found in database. You may need to create an admin user first.');
          }
          return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        console.log('Admin found:', user.username);
        user.role = 'admin';
      } else if (decoded.role === 'organizer' || isOrganizerRoute) {
        console.log('Looking for Organizer with ID:', decoded.id);
        user = await Organizer.findById(decoded.id);
        if (!user) {
          console.log('AUTH FAILED: Organizer not found');
          return res.status(404).json({ success: false, message: 'Organizer not found' });
        }
        user.role = 'organizer';
      } else if (decoded.role === 'artist' || isArtistRoute) {
        console.log('Looking for Artist with ID:', decoded.id);
        user = await Artist.findById(decoded.id);
        if (!user) {
          console.log('AUTH FAILED: Artist not found');
          return res.status(404).json({ success: false, message: 'Artist not found' });
        }
        user.role = 'artist';
      } else if (decoded.role === 'venue' || decoded.type === 'venue' || (isVenueRoute && isVenueManagerRoute)) {
        console.log('Looking for Venue with ID:', decoded.id);
        user = await Venue.findById(decoded.id);
        if (!user) {
          console.log('AUTH FAILED: Venue not found');
          return res.status(404).json({ success: false, message: 'Venue not found' });
        }
        user.role = 'venue';
      } else if (decoded.role === 'arenaPartner' || isArenaPartnerRoute) {
        console.log('Looking for Arena Partner with ID:', decoded.id);
        user = await ArenaPartner.findById(decoded.id);
        if (!user) {
          console.log('AUTH FAILED: Arena partner not found');
          return res.status(404).json({ success: false, message: 'Arena partner not found' });
        }
        user.role = 'arenaPartner';
      } else {
        // Default to User model for regular users (including venue bookings by users)
        console.log('Looking for User with ID:', decoded.id);
        user = await User.findById(decoded.id);
        if (!user) {
          console.log('AUTH FAILED: User not found');
          return res.status(404).json({ success: false, message: 'User not found' });
        }
      }

      // Attach user to request
      req.user = user;
      console.log('User found and attached:', user.name || user.email, 'Role:', user.role);

      // Check if user is active
      if (req.user.status === 'blocked') {
        console.log('AUTH FAILED: User is blocked');
        return res.status(403).json({
          success: false,
          message: 'Your account is blocked'
        });
      }

      console.log('AUTH SUCCESS: Proceeding to controller');
      next();
    } catch (error) {
      console.log('AUTH FAILED: Token verification error:', error.message);
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

/**
 * Middleware to attach user info if a valid token is provided, but does not require it
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    if (
      !req.headers.authorization ||
      !req.headers.authorization.startsWith('Bearer')
    ) {
      return next();
    }

    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Keep a central list of admin-only route prefixes
      const isAdminRoute =
        req.originalUrl.startsWith('/api/admin') ||
        req.originalUrl.startsWith('/api/system') ||
        req.originalUrl.startsWith('/api/livestream/admin');

      const isOrganizerRoute = req.originalUrl.startsWith('/api/organizer');
      const isArtistRoute = req.originalUrl.startsWith('/api/artist');
      const isVenueRoute = req.originalUrl.startsWith('/api/venue');
      const isArenaPartnerRoute = req.originalUrl.startsWith('/api/arena-partner');
      const isVenueManagerRoute =
        req.originalUrl.includes('/manager/') ||
        req.originalUrl.includes('/profile') ||
        req.originalUrl.includes('/details/') ||
        req.originalUrl.includes('/auth/');

      let user;

      if (isAdminRoute && decoded.role !== 'admin') {
        // optionalAuth should never hard-block requests; just don't attach a user
        return next();
      }

      if (decoded.role === 'admin') {
        user = await Admin.findById(decoded.id);
        if (user) user.role = 'admin';
      } else if (decoded.role === 'organizer' || isOrganizerRoute) {
        user = await Organizer.findById(decoded.id);
        if (user) user.role = 'organizer';
      } else if (decoded.role === 'artist' || isArtistRoute) {
        user = await Artist.findById(decoded.id);
        if (user) user.role = 'artist';
      } else if (decoded.role === 'venue' || decoded.type === 'venue' || (isVenueRoute && isVenueManagerRoute)) {
        user = await Venue.findById(decoded.id);
        if (user) user.role = 'venue';
      } else if (decoded.role === 'arenaPartner' || isArenaPartnerRoute) {
        user = await ArenaPartner.findById(decoded.id);
        if (user) user.role = 'arenaPartner';
      } else {
        user = await User.findById(decoded.id);
      }

      if (user) {
        req.user = user;
      }
    } catch (error) {
      console.warn('Optional auth token verification failed:', error.message);
    }

    return next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    return next();
  }
};