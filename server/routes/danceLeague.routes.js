const express = require('express');
const router = express.Router();
const danceLeagueController = require('../controllers/danceLeagueController');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Admin-specific authentication middleware
const protectAdminRoute = async (req, res, next) => {
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

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find admin by ID
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Admin not found.'
      });
    }

    // Attach admin to request object
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token.'
    });
  }
};

// Public routes
router.post('/register', danceLeagueController.createRegistrationOrder);
router.post('/verify-payment', danceLeagueController.verifyPayment);
router.post('/webhook', danceLeagueController.handleWebhook);
router.get('/registration/:id', danceLeagueController.getRegistrationById);
router.get('/registration/number/:registrationNumber', danceLeagueController.getRegistrationByNumber);
router.get('/invoice/:invoiceNumber', danceLeagueController.downloadInvoice);

// Admin routes
router.get('/admin/registrations', protectAdminRoute, danceLeagueController.getAllRegistrations);
router.get('/admin/statistics', protectAdminRoute, danceLeagueController.getStatistics);

module.exports = router;
