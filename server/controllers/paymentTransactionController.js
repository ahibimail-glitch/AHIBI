const PaymentTransaction = require('../models/PaymentTransaction');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');

// List transactions that are paid but no booking exists
exports.getPaidNoBooking = async (req, res) => {
  try {
    const items = await PaymentTransaction.find({ status: 'paid_no_booking' })
      .populate('user', 'name email phone')
      .populate('event', 'title startDate');

    res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('[Admin Payments] Error listing paid-no-booking:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Resolve a transaction by creating bookings and marking resolved
exports.resolveTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await PaymentTransaction.findById(id);
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (tx.status !== 'paid_no_booking') {
      return res.status(400).json({ success: false, message: `Transaction status is '${tx.status}', not resolvable` });
    }

    const bookingDetails = tx.bookingDetails || {};
    const { event: eventId, user: userInfo, tickets = [] } = bookingDetails;

    if (!eventId || !userInfo || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ success: false, message: 'Incomplete booking details in transaction' });
    }

    const event = await Event.findById(eventId._id || eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const userId = userInfo.id || userInfo._id || tx.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const createdBookings = [];
    const bookingIds = [];
    let currentTicketIndex = 1;
    const totalTickets = tickets.reduce((sum, t) => sum + (t.quantity || 0), 0);

    for (const ticketInfo of tickets) {
      const { ticketType, quantity = 0, price = 0 } = ticketInfo;
      if (!ticketType || quantity < 1) continue;

      for (let i = 0; i < quantity; i++) {
        const booking = new Booking({
          event: event._id,
          user: user._id,
          ticketType,
          quantity: 1,
          price,
          total: price,
          status: 'confirmed',
          paymentStatus: 'completed',
          paymentId: tx.paymentId,
          ticketIndex: currentTicketIndex,
          totalTickets,
          parentBookingId: null,
        });
        await booking.save();
        createdBookings.push(booking);
        bookingIds.push(booking._id);
        currentTicketIndex++;
      }

      await Event.updateOne(
        { _id: event._id, 'ticketTypes.name': ticketType },
        { $inc: { 'ticketTypes.$.sold': quantity, totalRevenue: price * quantity } }
      );
    }

    if (createdBookings.length > 0) {
      const parentBookingId = createdBookings[0]._id;
      for (let i = 1; i < createdBookings.length; i++) {
        createdBookings[i].parentBookingId = parentBookingId;
        await createdBookings[i].save();
      }
    }

    // Trigger event recalc
    const updatedEvent = await Event.findById(event._id);
    if (updatedEvent) await updatedEvent.save();

    // Mark transaction resolved
    tx.status = 'resolved';
    tx.bookingIds = bookingIds;
    await tx.save();

    res.json({ success: true, message: 'Transaction resolved and bookings confirmed', data: { bookingIds } });
  } catch (error) {
    console.error('[Admin Payments] Error resolving transaction:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


