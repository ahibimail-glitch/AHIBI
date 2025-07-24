const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const User = require("../models/User");


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

    // Update event tickets sold count and ticket type sold
    await Event.updateOne(
      { _id: event._id, "ticketTypes.name": ticketType },
      {
        $inc: {
          "ticketTypes.$.sold": quantity,
          totalRevenue: price
        }
      }
    );
    
    // Fetch and save the event to trigger the pre-save hook that recalculates ticketsSold
    const updatedEvent = await Event.findById(event._id);
    if (updatedEvent) {
      await updatedEvent.save(); // This will recalculate ticketsSold based on ticketTypes.sold
    }

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

// @route   POST /api/bookings/verify-qr
// @desc    Verify a booking QR code
// @access  Private (Admin only)
router.post("/verify-qr", async (req, res) => {
  console.log("Helloo")
  console.log(req.body)
  try {
    const { bookingId, bookingCode } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId)
      .populate('event')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({ 
        status: "INVALID", 
        message: "Booking not found"
      });
    }

    // Check if the booking has been used for entry already
    if (booking.entryVerified) {
      return res.status(200).json({
        status: "ALREADY_USED",
        message: "This ticket has already been used for entry",
        booking: {
          id: booking._id,
          event: booking.event,
          user: booking.user,
          quantity: booking.quantity,
          ticketType: booking.ticketType,
          status: booking.status,
          entryVerified: booking.entryVerified,
          entryVerifiedAt: booking.entryVerifiedAt
        }
      });
    }

    // Check if the booking is confirmed
    if (booking.status !== 'confirmed') {
      return res.status(200).json({
        status: "INVALID",
        message: `Booking status is ${booking.status}, not confirmed`,
        booking: {
          id: booking._id,
          event: booking.event,
          user: booking.user,
          quantity: booking.quantity,
          ticketType: booking.ticketType,
          status: booking.status
        }
      });
    }

    // Check if the event date is valid (not in the past)
    const eventDate = new Date(booking.event.startDate);
    const now = new Date();
    
    // Allow entry on the day of the event
    if (eventDate.toDateString() !== now.toDateString() && eventDate > now) {
      return res.status(200).json({
        status: "INVALID",
        message: "This ticket is for a future event",
        booking: {
          id: booking._id,
          event: booking.event,
          user: booking.user,
          quantity: booking.quantity,
          ticketType: booking.ticketType,
          status: booking.status,
          eventDate: eventDate
        }
      });
    }

    // If all checks pass, the booking is valid
    return res.status(200).json({
      status: "VALID",
      message: "Booking is valid",
      booking: {
        id: booking._id,
        event: booking.event,
        user: booking.user,
        quantity: booking.quantity,
        ticketType: booking.ticketType,
        status: booking.status
      }
    });
  } catch (error) {
    console.error("Error verifying booking QR code:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/bookings/mark-entry
// @desc    Mark a booking as used for entry
// @access  Private (Admin only)
router.post("/mark-entry", auth.protect, auth.authorize('admin'), async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    // Find and update the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Mark as verified
    booking.entryVerified = true;
    booking.entryVerifiedAt = new Date();
    booking.entryVerifiedBy = req.user._id;
    
    await booking.save();

    return res.status(200).json({
      status: "SUCCESS",
      message: "Entry recorded successfully",
      booking: {
        id: booking._id,
        entryVerified: booking.entryVerified,
        entryVerifiedAt: booking.entryVerifiedAt
      }
    });
  } catch (error) {
    console.error("Error marking booking entry:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get a single booking by ID
// @access  Private
router.get("/:id", auth.protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('event')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ensure the user owns the booking or is an admin
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to view this booking" });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
