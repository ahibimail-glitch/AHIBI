const express = require("express");
const router = express.Router();
const { getSeats, createBooking, confirmBooking, getRevenue, getAdminBookings, getBookingDetails } = require("../controllers/annieMusicalController");
const { protect } = require("../middleware/authMiddleware"); // Assuming a standard auth middleware
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
      
      // Find admin in database
      const admin = await Admin.findById(decoded.id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Attach admin to request
      req.user = admin;
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

// @desc    Get all seats for Annie Musical
// @route   GET /api/annie-musical/seats
// @access  Public
router.get("/seats", getSeats);

// @desc    Create a new booking (lock seats)
// @route   POST /api/annie-musical/book
// @access  Private
router.post("/book", protect, createBooking);

// @desc    Confirm a booking after payment
// @route   POST /api/annie-musical/confirm
// @access  Private
router.post("/confirm", protect, confirmBooking);

// @desc    Get total revenue from confirmed bookings
// @route   GET /api/annie-musical/revenue
// @access  Private/Admin (to be secured later)
router.get("/revenue", protectAdminRoute, getRevenue);

// @desc    Get all Annie Musical bookings for admin
// @route   GET /api/annie-musical/admin/bookings
// @access  Private/Admin
router.get("/admin/bookings", protectAdminRoute, getAdminBookings);

// @desc    Get single Annie Musical booking details
// @route   GET /api/annie-musical/booking/:id
// @access  Private
router.get("/booking/:id", protect, getBookingDetails);

module.exports = router;
