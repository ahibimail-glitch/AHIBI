const PaymentTransaction = require('../models/PaymentTransaction');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const PendingPaymentSession = require('../models/PendingPaymentSession'); // Added this import

// List transactions that are paid but no booking exists
exports.getPaidNoBooking = async (req, res) => {
  try {
    const items = await PaymentTransaction.find({ status: 'paid_no_booking' })
      .populate('user', 'name email phone')
      .populate('event', 'title startDate')
      .sort({ createdAt: -1 });

    // Process items to ensure we have user and event info
    const processedItems = items.map(item => {
      const processed = item.toObject();
      
      // If user population failed, try to get from userSnapshot or notes
      if (!processed.user && processed.userSnapshot) {
        processed.user = processed.userSnapshot;
      }
      
      // If event population failed, try to get from notes or other sources
      if (!processed.event && processed.bookingDetails?.event) {
        processed.event = processed.bookingDetails.event;
      }
      
      return processed;
    });

    res.json({ success: true, data: { items: processedItems } });
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

    console.log('[Resolve Transaction] Transaction data:', JSON.stringify(tx, null, 2));

    // Extract user and event info from multiple sources
    let bookingDetails = tx.bookingDetails;
    let eventId = tx.event;
    let userInfo = tx.user;

    // If bookingDetails is missing, try to get from pending session
    if (!bookingDetails || !eventId || !userInfo) {
      console.log('[Resolve Transaction] Missing data, checking pending session...');
      const pending = await PendingPaymentSession.findOne({ orderId: tx.orderId });
      if (pending) {
        console.log('[Resolve Transaction] Found pending session:', JSON.stringify(pending, null, 2));
        bookingDetails = pending.bookingDetails || bookingDetails;
        eventId = pending.event || eventId;
        userInfo = pending.user || userInfo;
      }
    }

    // If still missing, try to get from Razorpay order notes
    if (!eventId || !userInfo) {
      console.log('[Resolve Transaction] Still missing data, checking Razorpay order...');
      try {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        
        const orderDetails = await razorpay.orders.fetch(tx.orderId);
        console.log('[Resolve Transaction] Razorpay order details:', JSON.stringify(orderDetails, null, 2));
        
        if (orderDetails.notes) {
          if (orderDetails.notes.eventId && !eventId) {
            eventId = orderDetails.notes.eventId;
          }
          if (orderDetails.notes.userId && !userInfo) {
            userInfo = orderDetails.notes.userId;
          }
        }
      } catch (orderError) {
        console.error('[Resolve Transaction] Failed to fetch Razorpay order:', orderError);
      }
    }

    console.log('[Resolve Transaction] Final data - eventId:', eventId, 'userInfo:', userInfo, 'bookingDetails:', !!bookingDetails);

    if (!eventId || !userInfo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot resolve transaction: missing event or user information. Please check the pending session data.' 
      });
    }

    // Extract tickets from bookingDetails or create default
    let tickets = [];
    if (bookingDetails && Array.isArray(bookingDetails.tickets)) {
      tickets = bookingDetails.tickets;
    } else {
      // Create a default ticket based on the transaction amount
      tickets = [{
        ticketType: 'General',
        quantity: 1,
        price: tx.amount || 0
      }];
    }

    console.log('[Resolve Transaction] Using tickets:', JSON.stringify(tickets, null, 2));

    // Convert Buffer/ObjectId to proper string format for database queries
    const eventIdStr = eventId.toString();
    const userIdStr = userInfo.toString();
    
    console.log('[Resolve Transaction] Converted IDs - eventIdStr:', eventIdStr, 'userIdStr:', userIdStr);

    const event = await Event.findById(eventIdStr);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const user = await User.findById(userIdStr);
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
          eventSnapshot: {
            _id: event._id,
            title: event.title,
            banner: event.banner,
            startDate: event.startDate,
            endDate: event.endDate,
            location: {
              address: event.location?.address,
              city: event.location?.city,
            }
          },
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


