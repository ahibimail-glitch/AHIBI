const express = require('express');
const router = express.Router();
const EventSpace = require('../models/EventSpace');
const Venue = require('../models/Venue');
const User = require('../models/User');
const { protect } = require('../middlewares/auth');
const venueAuth = require('../middlewares/venueAuth');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create space booking order
router.post('/spaces/:spaceId/create-order', protect, async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { bookingDate, startTime, endTime, guestCount, eventType, specialRequirements, pricingHint } = req.body;

    // Validate space exists and is available
    const space = await EventSpace.findById(spaceId).populate('venueId');
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    // Check if venue is approved
    if (space.venueId.status !== 'approved' && space.venueId.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Venue is not available for booking' });
    }

    // Check availability
    const existingBookings = space.bookings || [];
    const hasConflict = existingBookings.some(booking => {
      return booking.bookingDate === bookingDate &&
        ((startTime >= booking.startTime && startTime < booking.endTime) ||
         (endTime > booking.startTime && endTime <= booking.endTime) ||
         (startTime <= booking.startTime && endTime >= booking.endTime));
    });

    if (hasConflict) {
      return res.status(409).json({ success: false, message: 'Space is already booked for this time slot' });
    }

    // Calculate total amount
    let totalAmount = 0;
    
    // Helper function to calculate duration in hours (handles overnight)
    const getDurationHours = (start, end) => {
      const startHour = parseInt(start.split(':')[0]);
      const endHour = parseInt(end.split(':')[0]);
      let duration = endHour - startHour;
      if (duration <= 0) {
        duration = (24 - startHour) + endHour; // Overnight booking
      }
      return duration;
    };
    
    const duration = getDurationHours(startTime, endTime);
    const hourlyRate = space.pricing.hourlyRate || 100; // Default to ₹100 if not set

    // Default to hourly calculation
    totalAmount = hourlyRate * duration;

    // Override with special rates only for exact time matches
    if (startTime === "00:00" && endTime === "23:00" && space.pricing.fullDayRate) {
      totalAmount = space.pricing.fullDayRate;
    } else if (startTime === "09:00" && endTime === "17:00" && space.pricing.halfDayRate) {
      totalAmount = space.pricing.halfDayRate;
    }

    // Add cleaning fee and security deposit
    totalAmount += (space.pricing.cleaningFee || 0);
    totalAmount += (space.pricing.securityDeposit || 0);

    // Ensure minimum amount for Razorpay (₹100 for test transactions)
    const minimumAmount = 100;
    if (totalAmount < minimumAmount) {
      totalAmount = minimumAmount;
      console.log(`Amount adjusted to minimum: ₹${totalAmount}`);
    }

    console.log(`Final calculation: Base=${space.pricing.basePrice || 0}, Hourly=${space.pricing.hourlyRate || 0}, Duration=${duration}hrs, Total=₹${totalAmount}`);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: totalAmount * 100, // Convert to paise
      currency: 'INR',
      receipt: `space_${Date.now()}`, // Shortened to under 40 chars
      notes: {
        spaceId,
        bookingDate,
        startTime,
        endTime,
        guestCount,
        eventType,
        specialRequirements
      }
    });

    // Generate a temporary booking ID
    const tempBookingId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create temporary booking record
    const tempBooking = {
      _id: tempBookingId,
      user: req.user.id,
      space: spaceId,
      venue: space.venueId._id,
      bookingDate,
      startTime,
      endTime,
      guestCount,
      eventType,
      specialRequirements,
      pricing: {
        basePrice: space.pricing.basePrice,
        hourlyRate: space.pricing.hourlyRate,
        totalAmount,
        cleaningFee: space.pricing.cleaningFee,
        securityDeposit: space.pricing.securityDeposit
      },
      razorpayOrderId: order.id,
      status: 'pending',
      createdAt: new Date()
    };

    res.status(200).json({
      success: true,
      data: {
        order: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          bookingId: tempBookingId
        },
        booking: tempBooking
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking order' });
  }
});

// Verify payment and create booking
router.post('/spaces/:spaceId/verify-payment', protect, async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = req.body;

    console.log('Payment verification request:', {
      spaceId,
      razorpay_order_id,
      razorpay_payment_id,
      bookingId
    });

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      console.error('Missing required payment parameters:', {
        has_payment_id: !!razorpay_payment_id,
        has_order_id: !!razorpay_order_id,
        has_signature: !!razorpay_signature
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required payment parameters. Please retry the payment.' 
      });
    }

    // Validate Razorpay key secret exists
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!keySecret) {
      console.error('RAZORPAY_KEY_SECRET is not configured');
      return res.status(500).json({ 
        success: false, 
        message: 'Payment configuration error. Please contact support.' 
      });
    }

    // Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    console.log('Signature verification:', {
      generated: generatedSignature.substring(0, 20) + '...',
      received: razorpay_signature.substring(0, 20) + '...',
      match: generatedSignature === razorpay_signature,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id
    });

    if (generatedSignature !== razorpay_signature) {
      console.error('Signature mismatch - Payment verification failed');
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed due to security issues. Please retry the payment.' 
      });
    }

    // Get space details
    const space = await EventSpace.findById(spaceId);
    if (!space) {
      console.log('Space not found:', spaceId);
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    console.log('Space found:', space.name);

    // Retrieve the order to get the booking details
    let order;
    try {
      order = await razorpay.orders.fetch(razorpay_order_id);
      console.log('Order fetched successfully:', order.id);
      
      // Verify order status
      if (order.status !== 'paid') {
        console.error('Order status is not paid:', order.status);
        return res.status(400).json({ 
          success: false, 
          message: 'Payment not completed. Please complete the payment and try again.' 
        });
      }
    } catch (orderError) {
      console.error('Error fetching Razorpay order:', orderError);
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found. The payment order may have expired. Please create a new booking.' 
      });
    }

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found. Please create a new booking.' 
      });
    }

    // Extract booking details from order notes
    const bookingDetails = order.notes;
    console.log('Booking details from order notes:', bookingDetails);

    if (!bookingDetails || !bookingDetails.bookingDate) {
      console.error('Missing booking details in order notes:', bookingDetails);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid booking details. Please start a new booking.' 
      });
    }

    // Validate bookingId if provided
    if (bookingId && bookingId !== order.notes.bookingId) {
      console.error('Booking ID mismatch:', { provided: bookingId, expected: order.notes.bookingId });
      // Don't fail here, just log it as bookingId might be optional
    }

    const totalAmount = order.amount / 100; // Convert from paise to rupees
    console.log('Total amount:', totalAmount);

    // Create booking record
    const booking = {
      _id: bookingId,
      user: req.user.id,
      space: spaceId,
      venue: space.venueId,
      bookingDate: bookingDetails.bookingDate,
      startTime: bookingDetails.startTime,
      endTime: bookingDetails.endTime,
      guestCount: bookingDetails.guestCount,
      eventType: bookingDetails.eventType,
      specialRequirements: bookingDetails.specialRequirements,
      pricing: {
        basePrice: space.pricing.basePrice,
        hourlyRate: space.pricing.hourlyRate,
        totalAmount: totalAmount,
        cleaningFee: space.pricing.cleaningFee,
        securityDeposit: space.pricing.securityDeposit
      },
      payment: {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        status: 'completed',
        paidAt: new Date()
      },
      status: 'confirmed',
      createdAt: new Date()
    };

    console.log('Creating booking:', booking);

    // Add booking to space
    if (!space.bookings) {
      space.bookings = [];
    }
    space.bookings.push(booking);
    space.totalBookings = (space.totalBookings || 0) + 1;
    space.totalEarnings = (space.totalEarnings || 0) + booking.pricing.totalAmount;

    await space.save();
    console.log('Booking saved successfully');

    res.status(200).json({
      success: true,
      data: { booking }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      spaceId: req.params.spaceId,
      hasOrderId: !!req.body.razorpay_order_id,
      hasPaymentId: !!req.body.razorpay_payment_id
    });
    
    // Provide more specific error messages
    let errorMessage = 'Payment verification failed. Please contact support if the issue persists.';
    if (error.message && error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Unable to connect to payment gateway. Please try again later.';
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Payment verification timed out. Please try again.';
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Normalize date to YYYY-MM-DD for comparison
function toDateString(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(val);
}

// Get space availability for a date
router.get('/spaces/:spaceId/availability/:date', async (req, res) => {
  try {
    const { spaceId, date } = req.params;

    const space = await EventSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    // Normalize requested date to YYYY-MM-DD
    const requestDateStr = toDateString(date) || date;

    // Get existing bookings for the date (normalize bookingDate for comparison)
    const rawBookings = space.bookings || [];
    const existingBookings = rawBookings.filter(booking => {
      if (!booking || (booking.status && booking.status !== 'confirmed')) return false;
      const bookingDateStr = toDateString(booking.bookingDate);
      return bookingDateStr === requestDateStr;
    });

    // Generate time slots for full day (00:00 to 23:00) to match frontend - 24 one-hour slots
    const timeSlots = [];
    for (let hour = 0; hour <= 23; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const isBooked = existingBookings.some(booking => {
        const start = booking.startTime || '';
        const end = booking.endTime || '';
        // Slot is booked if this hour falls within [start, end)
        return timeStr >= start && timeStr < end;
      });

      timeSlots.push({
        time: timeStr,
        available: !isBooked,
        bookings: existingBookings.filter(booking => {
          const start = booking.startTime || '';
          const end = booking.endTime || '';
          return timeStr >= start && timeStr < end;
        })
      });
    }

    const summary = {
      totalSlots: timeSlots.length,
      availableSlots: timeSlots.filter(slot => slot.available).length,
      bookedSlots: timeSlots.filter(slot => !slot.available).length
    };

    res.status(200).json({
      success: true,
      data: {
        availability: {
          date: requestDateStr,
          existingBookings,
          timeSlots,
          summary
        }
      }
    });

  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ success: false, message: 'Failed to check availability' });
  }
});

// Get all bookings for a space
router.get('/spaces/:spaceId/bookings', protect, async (req, res) => {
  try {
    const { spaceId } = req.params;

    // Get space details with bookings
    const space = await EventSpace.findById(spaceId).populate('venueId', 'name businessName');
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    // Check if the venue belongs to the authenticated user
    const venueToken = req.headers.authorization?.replace('Bearer ', '');
    if (!venueToken) {
      return res.status(401).json({ success: false, message: 'Authorization required' });
    }

    // Decode venue token to get venue ID
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(venueToken, process.env.JWT_SECRET || 'your-secret-key');
    
    if (space.venueId._id.toString() !== decoded.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get all bookings for this space
    const bookings = space.bookings || [];
    
    // Sort bookings by creation date (newest first)
    bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json({
      success: true,
      data: {
        space: {
          _id: space._id,
          name: space.name,
          venue: space.venueId
        },
        bookings: bookings,
        totalBookings: bookings.length
      }
    });

  } catch (error) {
    console.error('Error fetching space bookings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

module.exports = router;
