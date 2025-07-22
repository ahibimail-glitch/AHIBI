const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { eventId, ticketId, quantity } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!eventId || !ticketId || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'Please provide eventId, ticketId, and valid quantity' });
    }

    // Get ticket details
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if ticket belongs to the event
    if (ticket.event.toString() !== eventId) {
      return res.status(400).json({ message: 'Ticket does not belong to this event' });
    }

    // Check ticket availability
    if (ticket.quantity - ticket.sold < quantity) {
      return res.status(400).json({ message: 'Not enough tickets available' });
    }

    // Calculate total price
    const total = ticket.price * quantity;

    // Create booking
    const booking = new Booking({
      event: eventId,
      user: userId,
      ticket: ticketId,
      quantity,
      price: ticket.price,
      total,
      status: 'pending',
      paymentStatus: 'pending'
    });

    // Save booking
    await booking.save();

    // Update ticket sold count
    ticket.sold += quantity;
    await ticket.save();

    // Update event tickets sold count
    await Event.findByIdAndUpdate(eventId, {
      $inc: { ticketsSold: quantity, totalRevenue: total }
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking._id,
        event: booking.event,
        ticket: booking.ticket,
        quantity: booking.quantity,
        price: booking.price,
        total: booking.total,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        bookedAt: booking.bookedAt
      }
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
