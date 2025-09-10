const PaymentTransaction = require('../models/PaymentTransaction');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const PendingPaymentSession = require('../models/PendingPaymentSession'); 
const AnnieBooking = require('../models/AnnieBooking'); 
const AnnieSeat = require('../models/AnnieSeat'); 
const slugify = require('slugify');
const mongoose = require('mongoose'); 

// Helper to generate slug
const generateSlug = (title) => {
  return slugify(title, { lower: true, strict: true });
};

// List transactions that are paid but no booking exists (excluding Annie Musical)
exports.getPaidNoBooking = async (req, res) => {
  try {
    const items = await PaymentTransaction.find({ status: 'paid_no_booking' })
      .populate('user', 'name email phone')
      .populate('event', 'title startDate')
      .sort({ createdAt: -1 });

    // Filter out Annie Musical transactions
    const filteredItems = items.filter(item => {
      const isAnnieMusical = (
        (item.notes && (
          item.notes.includes('Annie Musical') || 
          item.notes.includes('annie-musical') || 
          item.notes.toLowerCase().includes('annie')
        )) ||
        (item.description && item.description.toLowerCase().includes('annie'))
      );
      return !isAnnieMusical;
    });

    // Process items to ensure we have user and event info
    const processedItems = filteredItems.map(item => {
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

// List Annie Musical transactions that are paid but no booking exists
exports.getAnnieFailedBookings = async (req, res) => {
  try {
    const items = await PaymentTransaction.find({ status: 'paid_no_booking' })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    // Filter only Annie Musical transactions
    const annieItems = items.filter(item => {
      const isAnnieMusical = (
        (item.notes && (
          item.notes.includes('Annie Musical') || 
          item.notes.includes('annie-musical') || 
          item.notes.toLowerCase().includes('annie')
        )) ||
        (item.description && item.description.toLowerCase().includes('annie'))
      );
      return isAnnieMusical;
    });

    // Process items to ensure we have user info
    const processedItems = annieItems.map(item => {
      const processed = item.toObject();
      
      // If user population failed, try to get from userSnapshot
      if (!processed.user && processed.userSnapshot) {
        processed.user = processed.userSnapshot;
      }
      
      return processed;
    });

    res.json({ success: true, data: { items: processedItems } });
  } catch (error) {
    console.error('[Admin Payments] Error listing Annie Musical failed bookings:', error);
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

    // Check if this is an Annie Musical booking - improved detection
    const isAnnieMusical = (
      (tx.notes && (
        tx.notes.includes('Annie Musical') || 
        tx.notes.includes('annie-musical') || 
        tx.notes.toLowerCase().includes('annie')
      )) ||
      (tx.description && tx.description.toLowerCase().includes('annie')) ||
      // Check if there's an existing Annie Musical booking with this order ID
      await AnnieBooking.findOne({ razorpayOrderId: tx.orderId })
    );

    console.log('[Resolve Transaction] Annie Musical detection result:', isAnnieMusical);
    console.log('[Resolve Transaction] Transaction notes:', tx.notes);
    console.log('[Resolve Transaction] Transaction description:', tx.description);

    // If this is an Annie Musical booking, handle it differently
    if (isAnnieMusical) {
      return await resolveAnnieMusicalTransaction(tx, req, res);
    }

    // For non-Annie Musical transactions, try to resolve anyway if we can find the booking
    const existingAnnieBooking = await AnnieBooking.findOne({ razorpayOrderId: tx.orderId });
    if (existingAnnieBooking) {
      console.log('[Resolve Transaction] Found Annie Musical booking despite detection failure, processing as Annie Musical');
      return await resolveAnnieMusicalTransaction(tx, req, res);
    }

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
    if (updatedEvent) {
      // Ensure slug and createdBy exist to prevent validation errors on older documents
      if (!updatedEvent.slug) {
        updatedEvent.slug = generateSlug(updatedEvent.title);
      }
      if (!updatedEvent.createdBy) {
        // Assuming the event has an organizer field populated
        if (updatedEvent.organizer) {
          updatedEvent.createdBy = updatedEvent.organizer;
        } else {
          // As a fallback, find the organizer if not populated
          const eventWithOrganizer = await Event.findById(updatedEvent._id).populate('organizer');
          if (eventWithOrganizer && eventWithOrganizer.organizer) {
            updatedEvent.createdBy = eventWithOrganizer.organizer._id;
          } else {
            // If no organizer, this will likely fail validation, but we log it.
            console.error(`[Resolve Transaction] Cannot set createdBy for event ${updatedEvent._id}: organizer not found.`);
          }
        }
      }
      await updatedEvent.save();
    }

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

// Helper function to resolve Annie Musical transactions
const resolveAnnieMusicalTransaction = async (tx, req, res) => {
  try {
    console.log('[Resolve Transaction] Processing Annie Musical transaction');
    
    // Try to find an existing pending booking with this order ID
    const pendingBooking = await AnnieBooking.findOne({ 
      razorpayOrderId: tx.orderId,
      status: 'pending'
    });
    
    if (!pendingBooking) {
      console.log('[Resolve Transaction] No pending Annie Musical booking found for order ID:', tx.orderId);
      
      // Try to find a user associated with this transaction
      let userId = tx.user;
      if (!userId && tx.userSnapshot && tx.userSnapshot._id) {
        userId = tx.userSnapshot._id;
      }
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot resolve Annie Musical transaction: no pending booking found and no user information available.'
        });
      }
      
      // Create a new booking if we have user info but no existing booking
      const user = await User.findById(userId);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Cannot resolve Annie Musical transaction: user not found.'
        });
      }
      
      // We can't create a booking without seat information
      return res.status(400).json({
        success: false,
        message: 'Cannot resolve Annie Musical transaction: no pending booking found with these seats.'
      });
    }
    
    // We found a pending booking, let's confirm it
    console.log(`[Resolve Transaction] Found pending Annie Musical booking: ${pendingBooking._id}`);
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Update booking status
      pendingBooking.status = 'confirmed';
      pendingBooking.razorpayPaymentId = tx.paymentId;
      pendingBooking.expiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years in future
      await pendingBooking.save({ session });
      
      // Update seats to booked status
      const updateResult = await AnnieSeat.updateMany(
        { _id: { $in: pendingBooking.seats } },
        { $set: { status: 'booked' } },
        { session }
      );
      
      console.log(`[Resolve Transaction] Updated ${updateResult.modifiedCount} seats to 'booked' status`);
      
      // Mark transaction as resolved
      tx.status = 'resolved';
      tx.bookingIds = [pendingBooking._id];
      await tx.save({ session });
      
      await session.commitTransaction();
      console.log(`[Resolve Transaction] Annie Musical booking ${pendingBooking._id} confirmed successfully`);
      
      res.json({
        success: true,
        message: 'Annie Musical transaction resolved and booking confirmed',
        data: { bookingId: pendingBooking._id }
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('[Resolve Transaction] Error confirming Annie Musical booking:', error);
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('[Admin Payments] Error resolving Annie Musical transaction:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
