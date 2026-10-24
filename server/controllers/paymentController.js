const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const smsService = require('../services/smsService');
const QRCode = require('qrcode'); // Import QRCode library
const emailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const PaymentTransaction = require('../models/PaymentTransaction');
const PendingPaymentSession = require('../models/PendingPaymentSession');
const BikerBash = require('../models/BikerBash');
const Coupon = require('../models/Coupon');
const { computeCouponDiscount } = require('../utils/couponDiscount');
const NuscHomeMatchOrder = require('../models/NuscHomeMatchOrder');
const nuscHomeMatchController = require('./nuscHomeMatchController');

// Per-event purchase limits
const LIMITED_EVENT_ID = '6a17f0cfcea3b566702e86a9';
const MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT = 10;

async function getUserTicketCountForEvent({ eventId, userId }) {
  const rows = await Booking.find({
    event: eventId,
    user: userId,
    status: { $in: ['pending', 'confirmed', 'checked-in'] },
  }).select('quantity');

  return rows.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
}

// Debug environment variables
console.log('Environment variables for Razorpay:');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);

// Initialize Razorpay with error handling
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('Razorpay initialized successfully');
} catch (error) {
  console.error('Failed to initialize Razorpay:', error.message);
}

exports.createOrder = async (req, res) => {
  console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
  console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);
  try {
    const { amount, currency, receipt, bookingDetails, coupon } = req.body;
    // NUSC home match orders must use the inventory-aware checkout flow.
    const requestedEventId = bookingDetails?.event?._id;
    if (requestedEventId) {
      const requestedEvent = await Event.findById(requestedEventId).select('slug');
      if (requestedEvent?.slug?.startsWith('nusc-home-match-')) {
        return res.status(409).json({ message: 'Use the NUSC home match checkout for these tickets.' });
      }
    }

    // Enforce per-user ticket cap for specific event before taking payment
    try {
      const eventId = bookingDetails?.event?._id;
      const userId = bookingDetails?.user?.id;
      const requestedTickets = Array.isArray(bookingDetails?.tickets)
        ? bookingDetails.tickets.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0)
        : 0;

      if (eventId && userId && String(eventId) === LIMITED_EVENT_ID && requestedTickets > 0) {
        const existingCount = await getUserTicketCountForEvent({ eventId, userId });
        if (existingCount + requestedTickets > MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT) {
          return res.status(400).json({
            message: `You can buy at most ${MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT} tickets for this event in total.`,
            limit: MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT,
            alreadyBooked: existingCount,
            requested: requestedTickets,
            remaining: Math.max(0, MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT - existingCount),
          });
        }
      }
    } catch (e) {
      // If limit check fails unexpectedly, do not block order creation here
    }

    // Enforce booking cutoff (bookingEndTime overrides endDate)
    try {
      const eventId = bookingDetails?.event?._id;
      if (eventId) {
        const eventDoc = await Event.findById(eventId).select('endDate bookingEndTime');
        if (eventDoc) {
          const now = new Date();
          const cutoff = eventDoc.bookingEndTime ? new Date(eventDoc.bookingEndTime) : (eventDoc.endDate ? new Date(eventDoc.endDate) : null);
          if (cutoff && !isNaN(cutoff.getTime()) && now > cutoff) {
            return res.status(400).json({ message: 'Bookings are closed for this event.' });
          }
        }
      }
    } catch (e) {
      // If event lookup fails, do not block order creation here
    }

    // Recompute server-side total from bookingDetails to avoid tampering
    let computedTotal = 0;
    if (Array.isArray(bookingDetails?.tickets)) {
      computedTotal = bookingDetails.tickets.reduce((s, t) => s + (Number(t.price) || 0) * (Number(t.quantity) || 0), 0);
    }

    // Apply coupon if provided and structurally valid. Validate against DB to avoid tampering.
    let discountAmount = 0;
    let appliedCoupon = null;
    try {
      if (coupon && coupon.code) {
        const dbCoupon = await Coupon.findOne({ code: String(coupon.code).trim().toUpperCase() });
        if (dbCoupon && String(dbCoupon.event?.id) === String(bookingDetails?.event?._id) && (!dbCoupon.expiresAt || new Date(dbCoupon.expiresAt) >= new Date())) {
          const discountResult = computeCouponDiscount(dbCoupon, bookingDetails?.tickets || []);
          if (!discountResult.error && discountResult.discountAmount > 0) {
            discountAmount = discountResult.discountAmount;
            appliedCoupon = {
              code: dbCoupon.code,
              ticketCategory: discountResult.ticketCategory || dbCoupon.ticketCategory,
              discountPercentage: dbCoupon.discountPercentage,
              discountPrice: dbCoupon.discountPrice,
              discountAmount,
            };
          }
        }
      }
    } catch (e) {
      // ignore coupon if malformed
      discountAmount = 0;
      appliedCoupon = null;
    }

    const payable = Math.max(0, computedTotal - discountAmount);

    const options = {
      amount: payable * 100, // amount in the smallest currency unit
      currency,
      receipt,
      notes: {
        userId: bookingDetails?.user?.id || '',
        eventId: bookingDetails?.event?._id || '',
        userName: bookingDetails?.user?.name || '',
        userEmail: bookingDetails?.user?.email || '',
        userPhone: bookingDetails?.user?.phone || '',
        tickets: bookingDetails?.tickets ? JSON.stringify(bookingDetails.tickets) : '[]',
        coupon: appliedCoupon ? JSON.stringify(appliedCoupon) : undefined,
      }
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).send('Error creating Razorpay order');
    }

    // Store a pending session with booking details to recover later via webhook if needed
    try {
      console.log('[Create Order] Storing pending session for orderId:', order.id);
      console.log('[Create Order] Booking details:', JSON.stringify(bookingDetails, null, 2));

      await PendingPaymentSession.findOneAndUpdate(
        { orderId: order.id },
        {
          $set: {
            amount: payable,
            currency,
            bookingDetails: appliedCoupon ? { ...bookingDetails, coupon: appliedCoupon } : bookingDetails,
            user: bookingDetails?.user?.id,
            event: bookingDetails?.event?._id,
            status: 'created'
          }
        },
        { upsert: true }
      );

      console.log('[Create Order] Pending session stored successfully');

      // Test: Check if the session was actually stored
      const testSession = await PendingPaymentSession.findOne({ orderId: order.id });
      console.log('[Create Order] Test query result:', !!testSession, 'Session data:', JSON.stringify(testSession, null, 2));

    } catch (e) {
      console.error('Failed to persist pending payment session:', e);
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).send(error.message);
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    console.log('Payment verification request received:', req.body);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('Missing required payment parameters:', {
        has_order_id: !!razorpay_order_id,
        has_payment_id: !!razorpay_payment_id,
        has_signature: !!razorpay_signature
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required payment parameters'
      });
    }

    if (!bookingDetails) {
      console.error('Missing booking details in request');
      return res.status(400).json({
        success: false,
        message: 'Missing booking details'
      });
    }

    console.log('Verifying payment signature with key secret:', !!process.env.RAZORPAY_KEY_SECRET);
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    console.log('Signature verification:', {
      generated: digest.slice(0, 10) + '...',
      received: razorpay_signature.slice(0, 10) + '...',
      match: digest === razorpay_signature
    });

    if (digest !== razorpay_signature) {
      console.error('Invalid payment signature');
      return res.status(400).json({ success: false, message: 'Transaction not legit!' });
    }

    // Create or update a transaction record first
    let tx = await PaymentTransaction.findOne({ orderId: razorpay_order_id, paymentId: razorpay_payment_id });
    if (!tx) {
      tx = new PaymentTransaction({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount: Array.isArray(bookingDetails?.tickets)
          ? Math.max(0, bookingDetails.tickets.reduce((s, t) => s + (Number(t.price) || 0) * (Number(t.quantity) || 0), 0) - (bookingDetails?.coupon?.discountAmount || 0))
          : undefined,
        user: bookingDetails?.user?.id,
        userSnapshot: {
          id: bookingDetails?.user?.id,
          name: bookingDetails?.user?.name,
          email: bookingDetails?.user?.email,
          phone: bookingDetails?.user?.phone,
        },
        event: bookingDetails?.event?._id,
        bookingDetails,
        status: 'processing',
      });
      await tx.save();
    }

    // Enforce booking cutoff (bookingEndTime overrides endDate)
    try {
      const eventId = bookingDetails?.event?._id;
      if (eventId) {
        const eventDoc = await Event.findById(eventId).select('endDate bookingEndTime');
        if (eventDoc) {
          const now = new Date();
          const cutoff = eventDoc.bookingEndTime ? new Date(eventDoc.bookingEndTime) : (eventDoc.endDate ? new Date(eventDoc.endDate) : null);
          if (cutoff && !isNaN(cutoff.getTime()) && now > cutoff) {
            tx.status = 'paid_no_booking';
            tx.errorMessage = 'Bookings are closed for this event.';
            await tx.save();
            return res.status(400).json({ success: false, message: 'Bookings are closed for this event.' });
          }
        }
      }
    } catch (e) {
      // ignore and continue
    }

    // Enforce per-user ticket cap for specific event right before creating bookings
    try {
      const eventId = bookingDetails?.event?._id;
      const userId = bookingDetails?.user?.id;
      const requestedTickets = Array.isArray(bookingDetails?.tickets)
        ? bookingDetails.tickets.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0)
        : 0;

      if (eventId && userId && String(eventId) === LIMITED_EVENT_ID && requestedTickets > 0) {
        const existingCount = await getUserTicketCountForEvent({ eventId, userId });
        if (existingCount + requestedTickets > MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT) {
          tx.status = 'paid_no_booking';
          tx.errorMessage = `Ticket limit exceeded for event ${LIMITED_EVENT_ID}`;
          await tx.save();
          return res.status(400).json({
            success: false,
            message: `You can buy at most ${MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT} tickets for this event in total.`,
            limit: MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT,
            alreadyBooked: existingCount,
            requested: requestedTickets,
            remaining: Math.max(0, MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT - existingCount),
          });
        }
      }
    } catch (e) {
      // If limit check fails unexpectedly, continue to avoid false negatives
    }

    // Payment is verified, now create individual bookings for each ticket
    const { event, user, tickets } = bookingDetails;

    // Create individual bookings for each ticket type and quantity
    const bookings = [];
    const bookingIds = [];
    let totalTickets = 0;
    let currentTicketIndex = 1;

    // Process each ticket type
    for (const ticketInfo of tickets) {
      const { ticketType, quantity, price } = ticketInfo;

      // Create individual bookings for each ticket of this type
      for (let i = 0; i < quantity; i++) {
        // Create a new booking for each individual ticket
        const newBooking = new Booking({
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
          user: user.id,
          ticketType: ticketType,
          quantity: 1, // Each booking is for 1 ticket
          price: price,
          total: price, // Total is same as price for individual ticket
          paymentStatus: 'completed',
          status: 'confirmed',
          paymentId: razorpay_payment_id,
          paymentDetails: {
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            signature: razorpay_signature,
            paymentGateway: 'Razorpay',
            status: 'Paid'
          },
          // Add country/state for HMF events
          ...(bookingDetails?.country && { country: bookingDetails.country }),
          ...(bookingDetails?.state && { state: bookingDetails.state }),
          // Add ticket-specific information
          ticketIndex: currentTicketIndex,
          totalTickets: tickets.reduce((sum, t) => sum + t.quantity, 0),
          parentBookingId: null // Will be set to the first booking ID
        });

        await newBooking.save();
        bookings.push(newBooking);
        bookingIds.push(newBooking._id);
        currentTicketIndex++;
        totalTickets++;
      }

      // Update event ticket count and ticket type sold
      await Event.updateOne(
        { _id: event._id, "ticketTypes.name": ticketType },
        {
          $inc: {
            "ticketTypes.$.sold": quantity,
            totalRevenue: price * quantity
          }
        }
      );
    }

    // Set the parent booking ID to the first booking for all tickets
    if (bookings.length > 0) {
      const parentBookingId = bookings[0]._id;
      for (let i = 1; i < bookings.length; i++) {
        bookings[i].parentBookingId = parentBookingId;
        await bookings[i].save();
      }
    }

    // Increment coupon usage count if applied (keep status as active for reuse)
    try {
      if (bookingDetails?.coupon?.code) {
        // Calculate how many tickets the coupon was applied to
        const applicableTickets = (bookingDetails?.tickets || []).filter(t => t.ticketType === bookingDetails.coupon.ticketCategory);
        const usageCount = applicableTickets.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
        
        await Coupon.findOneAndUpdate(
          { code: bookingDetails.coupon.code },
          { 
            $set: { usedAt: new Date() },
            $inc: { timesUsed: usageCount }
          }
        );
      }
    } catch (couponErr) {
      console.error('Failed to update coupon usage:', couponErr);
    }

    // Create BikerBash registration if this is a BikerBash event
    if (bookingDetails.contactInfo && bookingDetails.contactInfo.name) {
      try {
        console.log('[Payment] Creating BikerBash registration for booking:', bookingIds[0]);
        
        const bikerBashRegistration = new BikerBash({
          bookingId: bookingIds[0], // Use the first booking ID as the main booking reference
          eventId: event._id,
          userId: user.id,
          contactInfo: {
            name: bookingDetails.contactInfo.name,
            phone: bookingDetails.contactInfo.phone,
            email: bookingDetails.contactInfo.email
          },
          ticketInfo: {
            ticketType: tickets[0].ticketType, // Assuming single ticket type for BikerBash
            price: tickets[0].price,
            quantity: tickets[0].quantity
          },
          status: 'confirmed'
        });

        await bikerBashRegistration.save();
        console.log('[Payment] BikerBash registration created successfully:', bikerBashRegistration._id);
      } catch (error) {
        console.error('[Payment] Error creating BikerBash registration:', error);
        // Don't fail the payment if BikerBash registration fails
      }
    }

    // Fetch and save the event to trigger the pre-save hook that recalculates ticketsSold
    const updatedEvent = await Event.findById(event._id).populate('createdBy').populate('organizer');
    if (updatedEvent) {
      // Check if required fields exist before saving to avoid validation errors
      if (updatedEvent.createdBy && updatedEvent.slug) {
        await updatedEvent.save(); // This will recalculate ticketsSold based on ticketTypes.sold
      } else {
        // Manually recalculate ticketsSold if we can't save due to missing required fields
        const totalSold = updatedEvent.ticketTypes.reduce((sum, ticket) => sum + ticket.sold, 0);
        await Event.updateOne(
          { _id: event._id },
          { $set: { ticketsSold: totalSold } }
        );
        console.log('Updated ticketsSold manually due to missing required fields');
      }
    }

    // Send booking confirmation WhatsApp + email
    try {
      console.log('[Payment] Starting ticket notification process');

      const displayEventDate = updatedEvent?.startDate
        ? new Date(updatedEvent.startDate).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Event date TBA';

      if (user.phone) {
        const eventTitle = updatedEvent?.title || event.title;
        const eventVenue = updatedEvent?.location?.address || updatedEvent?.location?.city || event.location?.address || event.location?.city || 'Venue TBA';
        const totalAmount = bookings.reduce((sum, b) => sum + (b.total || 0), 0);
        const primaryBookingId = bookings[0]?._id;

        Promise.allSettled([
          whatsappService.sendPaymentSuccessTemplate({
            phone: user.phone,
            customerName: user.name || user.email || 'Customer',
            amount: totalAmount,
            eventName: eventTitle,
            bookingId: primaryBookingId,
            paymentId: razorpay_payment_id,
            eventId: event._id
          }),
          whatsappService.sendTicketReadyTemplate({
            phone: user.phone,
            eventName: eventTitle,
            eventDate: displayEventDate,
            venue: eventVenue,
            bookingId: primaryBookingId,
            eventId: event._id
          })
        ])
          .then((results) => {
            const failed = results.filter((r) => r.status === 'rejected' || r.value?.success === false);
            if (failed.length) {
              console.error('[Payment] WhatsApp template notification failed:', failed.map((r) => r.reason?.message || r.value?.message || r.value?.error || r.reason));
            } else {
              console.log('[Payment] WhatsApp template notifications sent');
            }
          })
          .catch((waErr) => console.error('[Payment] WhatsApp notification failed:', waErr?.message || waErr));
      }

      whatsappService
        .sendAdminBookingAlert({
          bookingId: bookings[0]?._id,
          customerName: user.name || 'Customer',
          itemsCount: totalTickets,
          totalAmount: bookings.reduce((sum, b) => sum + (b.total || 0), 0),
          shippingLabel: displayEventDate,
          statusPretty: 'Confirmed'
        })
        .then(() => console.log('[Payment] Admin WhatsApp alert sent'))
        .catch((waErr) => console.error('[Payment] Admin WhatsApp alert failed:', waErr?.message || waErr));

      // Send ticket via email with QR code if email is available
      if (user.email) {
        console.log('[Payment] Sending ticket via email to:', user.email);
        try {
          await emailService.sendTicketEmail(
            user.email,
            user.name || 'Customer',
            {
              eventName: updatedEvent.title,
              eventDate: updatedEvent.startDate ? new Date(updatedEvent.startDate).toLocaleDateString() : 'TBA',
              eventTime: updatedEvent.startDate ? new Date(updatedEvent.startDate).toLocaleTimeString() : 'TBA',
              ticketType: tickets.map(t => `${t.ticketType} (${t.quantity})`).join(', '),
              quantity: totalTickets,
              bookingId: bookings[0]._id, // Use first booking ID for email
              qrCode: null // Will be generated per ticket
            }
          );
          console.log('[Payment] Ticket email sent successfully');
        } catch (emailError) {
          console.error('[Payment] Failed to send ticket email:', emailError);
        }
      }
    } catch (notificationError) {
      console.error('[Payment] Error sending booking notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    // Mark transaction completed
    tx.status = 'completed';
    tx.bookingIds = bookingIds;
    await tx.save();

    res.status(201).json({
      success: true,
      message: 'Bookings created successfully',
      booking: bookings[0], // Return first booking for backward compatibility
      allBookings: bookings, // Return all bookings for new functionality
      bookingIds: bookingIds, // Return all booking IDs
      totalTickets: totalTickets,
      ticketTypes: tickets.map(t => ({ type: t.ticketType, quantity: t.quantity, price: t.price }))
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails } = req.body || {};
      if (razorpay_payment_id) {
        await PaymentTransaction.findOneAndUpdate(
          { orderId: razorpay_order_id, paymentId: razorpay_payment_id },
          {
            $set: {
              signature: razorpay_signature,
              bookingDetails: bookingDetails,
              amount: Array.isArray(bookingDetails?.tickets) ? bookingDetails.tickets.reduce((s, t) => s + (t.price || 0) * (t.quantity || 0), 0) : undefined,
              user: bookingDetails?.user?.id,
              userSnapshot: bookingDetails?.user ? {
                id: bookingDetails.user.id,
                name: bookingDetails.user.name,
                email: bookingDetails.user.email,
                phone: bookingDetails.user.phone,
              } : undefined,
              event: bookingDetails?.event?._id,
              status: 'paid_no_booking',
              errorMessage: error.message,
            }
          },
          { upsert: true }
        );
      }
    } catch (txError) {
      console.error('Error recording failed transaction state:', txError);
    }
    res.status(500).send(error.message);
  }
};

// Razorpay webhook to catch payments where client verification failed
exports.razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = req.rawBody || req.body; // Use rawBody if available, fallback to body

    if (!secret) {
      console.error('[Razorpay Webhook] Missing RAZORPAY_WEBHOOK_SECRET');
      return res.status(500).send('Server webhook not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[Razorpay Webhook] Invalid signature. Expected:', expectedSignature, 'Received:', signature);
      return res.status(400).send('Invalid signature');
    }

    let event;
    try {
      event = JSON.parse(body.toString('utf8'));
    } catch (e) {
      console.error('[Razorpay Webhook] Failed to parse JSON body');
      return res.status(400).send('Bad request');
    }
    const eventType = event.event;
    console.log('[Razorpay Webhook] Event received:', eventType);
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const nuscPayment = event.payload.payment?.entity;
      const nuscOrderId = nuscPayment?.order_id || event.payload.order?.entity?.id;
      const nuscOrder = nuscOrderId
        ? await NuscHomeMatchOrder.findOne({ orderId: nuscOrderId })
        : null;
      if (nuscOrder) {
        if (!nuscPayment?.id) {
          if (eventType === 'order.paid') {
            return res.json({ status: 'awaiting_payment_capture_webhook' });
          }
          console.error('[Razorpay Webhook] NUSC capture payload did not include a payment.');
          return res.status(400).send('Payment details missing');
        }
        try {
          await nuscHomeMatchController.settleCapturedPayment(nuscOrderId, nuscPayment);
        } catch (settlementError) {
          if (settlementError.code !== 'PAID_NO_BOOKING') throw settlementError;
          console.error('[Razorpay Webhook] Captured NUSC payment requires manual resolution:', nuscOrderId);
        }
        return res.json({ status: 'ok' });
      }
    }

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = event.payload.payment?.entity;
      const order = event.payload.order?.entity;
      const paymentId = payment?.id;
      const orderId = payment?.order_id || order?.id;
      console.log('[Razorpay Webhook] orderId:', orderId, 'paymentId:', paymentId);

      // If we already have a completed tx, do nothing
      const existing = await PaymentTransaction.findOne({ orderId, paymentId });
      if (existing && (existing.status === 'completed' || existing.status === 'resolved')) {
        return res.json({ status: 'ok' });
      }

      // Pull the pending session for booking details
      const pending = await PendingPaymentSession.findOne({ orderId });
      console.log('[Razorpay Webhook] Pending session found:', !!pending);
      console.log('[Razorpay Webhook] Pending session data:', JSON.stringify(pending, null, 2));

      // Extract user and event info from pending session or order notes
      let userInfo = null;
      let eventInfo = null;
      let bookingDetails = null;

      if (pending) {
        userInfo = pending.user;
        eventInfo = pending.event;
        bookingDetails = pending.bookingDetails;
        console.log('[Razorpay Webhook] Using pending session data - user:', userInfo, 'event:', eventInfo);
      } else {
        console.log('[Razorpay Webhook] No pending session found for orderId:', orderId);
        // Fallback: try to extract from order notes if pending session is missing
        try {
          const orderDetails = await razorpay.orders.fetch(orderId);
          console.log('[Razorpay Webhook] Order details from Razorpay:', JSON.stringify(orderDetails, null, 2));
          if (orderDetails.notes) {
            console.log('[Razorpay Webhook] Order notes found:', orderDetails.notes);
            // Parse user and event info from notes
            if (orderDetails.notes.userId) {
              userInfo = orderDetails.notes.userId;
            }
            if (orderDetails.notes.eventId) {
              eventInfo = orderDetails.notes.eventId;
            }
          }
        } catch (orderError) {
          console.error('[Razorpay Webhook] Failed to fetch order details:', orderError);
        }
      }

      console.log('[Razorpay Webhook] Final userInfo:', userInfo, 'eventInfo:', eventInfo, 'bookingDetails:', !!bookingDetails);

      const upsertedTx = await PaymentTransaction.findOneAndUpdate(
        { orderId, paymentId },
        {
          $setOnInsert: { createdAt: new Date() },
          $set: {
            amount: (payment?.amount || order?.amount || pending?.amount) ? Math.round((payment?.amount || order?.amount || pending?.amount) / 100) : undefined,
            currency: payment?.currency || order?.currency || pending?.currency,
            user: userInfo,
            event: eventInfo,
            bookingDetails: bookingDetails,
            status: 'paid_no_booking',
          }
        },
        { upsert: true, new: true }
      );
      console.log('[Razorpay Webhook] Transaction upserted with status:', upsertedTx?.status);

      // Mark pending as verified so we know the payment happened
      if (pending) {
        pending.status = 'verified';
        await pending.save();
      }
    }

    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).send('Server error');
  }
};
