const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Middleware to authenticate admin users only
 * This middleware specifically checks for admin authentication
 * and attaches admin user to the request object
 */
const adminAuth = async (req, res, next) => {
  try {
    // Check if auth header exists and has the correct format
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Extract token from auth header
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the token is for an admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin access required.'
      });
    }

    // Find admin by ID
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found.'
      });
    }

    // Attach admin to request object
    req.admin = admin;
    req.admin.id = admin._id;
    req.admin.role = 'admin';

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

module.exports = adminAuth;
