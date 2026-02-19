const jwt = require('jsonwebtoken');
const Venue = require('../models/Venue');

const venueAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Check if token type is venue
    if (decoded.type !== 'venue') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type.'
      });
    }

    // Find venue
    const venue = await Venue.findById(decoded.id);
    if (!venue) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Venue not found.'
      });
    }

    // Check if venue is approved
    if (venue.status !== 'approved' && venue.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Venue account is not approved.'
      });
    }

    // Add venue to request object
    req.venue = {
      id: venue._id,
      venue: venue
    };

    next();

  } catch (error) {
    console.error('Venue auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error in authentication.'
    });
  }
};

module.exports = venueAuth;
