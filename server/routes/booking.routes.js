const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Booking = require("../models/Booking");
const Event = require("../models/Event");


// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private
router.post("/", auth.protect, async (req, res) => {
  try {
    // console.log("Booking payload:", req.body);
    const { event, user, quantity, price, ticketType } = req.body;
    //console.log("Booking payload:", { event, user, quantity });

    // Validate input
    if (!event || !user || !quantity || quantity < 1) {
      return res.status(400).json({
        message: "Please provide event,user, and valid quantity",
      });
    }

    // Fetch event and ticket
    console.log("Fetching event and ticket...");
    const isEvent = await Event.findById(event._id);
    //console.log("Event:", event);
    if (!isEvent) {
      return res.status(404).json({ message: "Event not found" });
    }




    console.log(price)

    // Create booking
    const booking = new Booking({
      event: event._id,
      user: req.user._id,
      quantity,
      price: price,
      total: price,
      status: "confirmed",
      paymentStatus: "completed",
      ticketType: ticketType,
    });

    // Save booking
    await booking.save();

    // Update event tickets sold   count
    await Event.findByIdAndUpdate(event._id, {
      $inc: { ticketsSold: quantity, totalRevenue: price },
    });

    res.status(201).json({
      message: "Booking created successfully",
      booking: {
        id: booking._id,
        event: booking.event,
        quantity: booking.quantity,
        price: booking.price,
        total: booking.total,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        bookedAt: booking.bookedAt,
      },
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/bookings/my-bookings
// @desc    Get all bookings for the logged-in user
// @access  Private
router.get("/my-bookings", auth.protect, async (req, res) => {
  try {
    console.log(req.user)

    const bookings = await Booking.find({ user: req.user._id }).sort({ bookedAt: -1 });

  
    console.log(bookings)
    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
