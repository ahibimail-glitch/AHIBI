const express = require("express");
const router = express.Router();
const { getSeats, createBooking, confirmBooking, getRevenue } = require("../controllers/annieMusicalController");
const { protect } = require("../middleware/authMiddleware"); // Assuming a standard auth middleware

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
router.get("/revenue", getRevenue);

module.exports = router;
