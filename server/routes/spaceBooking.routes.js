const express = require('express');
const router = express.Router();
const EventSpace = require('../models/EventSpace');
const Venue = require('../models/Venue');
const whatsappService = require('../services/whatsappService');
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

function toDateString(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val.split('T')[0];
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

function addDaysStr(dateStr, delta) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toDateString(d);
}

function isActiveBooking(booking) {
  const status = (booking.status || 'confirmed').toLowerCase();
  return ['confirmed', 'completed'].includes(status);
}

function isDayUnavailableForWedding(space, dateStr) {
  for (const block of space.blockedSlots || []) {
    if (toDateString(block.date) !== dateStr) continue;
    if (block.isFullDayBlocked) return true;
    if (block.timeSlots && block.timeSlots.length > 0) return true;
  }
  for (const booking of space.bookings || []) {
    if (!isActiveBooking(booking)) continue;
    if (toDateString(booking.bookingDate) === dateStr) return true;
  }
  return false;
}

function validateWeddingPackageDates(space, weddingDateStr) {
  const dates = [addDaysStr(weddingDateStr, -1), weddingDateStr, addDaysStr(weddingDateStr, 1)];
  for (const d of dates) {
    if (isDayUnavailableForWedding(space, d)) {
      return { ok: false, message: `Wedding package requires 3 consecutive free days. ${d} is not available.` };
    }
  }
  return { ok: true, dates };
}

// Create space booking order
router.post('/spaces/:spaceId/create-order', protect, async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { bookingDate, startTime, endTime, guestCount, eventType, specialRequirements, pricingHint, packageType } = req.body;
    const isWeddingPackage = packageType === 'wedding';
    let resolvedStartTime = startTime;
    let resolvedEndTime = endTime;

    // Validate space exists and is available
    const space = await EventSpace.findById(spaceId).populate('venueId');
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    // Check if venue is approved
    if (space.venueId.status !== 'approved' && space.venueId.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Venue is not available for booking' });
    }

    if (isWeddingPackage) {
      const weddingCheck = validateWeddingPackageDates(space, bookingDate);
      if (!weddingCheck.ok) {
        return res.status(409).json({ success: false, message: weddingCheck.message });
      }
      resolvedStartTime = '00:00';
      resolvedEndTime = '23:00';
    } else {
      const existingBookings = space.bookings || [];
      const hasConflict = existingBookings.some(booking => {
        if (!isActiveBooking(booking)) return false;
        return booking.bookingDate === bookingDate &&
          ((resolvedStartTime >= booking.startTime && resolvedStartTime < booking.endTime) ||
           (resolvedEndTime > booking.startTime && resolvedEndTime <= booking.endTime) ||
           (resolvedStartTime <= booking.startTime && resolvedEndTime >= booking.endTime));
      });

      if (hasConflict) {
        return res.status(409).json({ success: false, message: 'Space is already booked for this time slot' });
      }

      if (isDayUnavailableForWedding(space, bookingDate)) {
        return res.status(409).json({ success: false, message: 'Selected date is blocked or unavailable' });
      }
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
    
    const duration = getDurationHours(resolvedStartTime, resolvedEndTime);
    const hourlyRate = space.pricing.hourlyRate ?? 100; // Default to ₹100 if not set

    // Default to hourly calculation
    totalAmount = hourlyRate * duration;

    if (isWeddingPackage) {
      const fullDay = space.pricing.fullDayRate ?? space.pricing.basePrice ?? 0;
      totalAmount = fullDay * 3;
    } else if (resolvedStartTime === "00:00" && resolvedEndTime === "23:00" && space.pricing.fullDayRate !== undefined) {
      totalAmount = space.pricing.fullDayRate;
    } else if (resolvedStartTime === "09:00" && resolvedEndTime === "17:00" && space.pricing.halfDayRate !== undefined) {
      totalAmount = space.pricing.halfDayRate;
    }

    // Add cleaning fee and security deposit
    totalAmount += (space.pricing.cleaningFee || 0);
    totalAmount += (space.pricing.securityDeposit || 0);

    // If final price is zero, set to 1 to avoid payment issues
    if (totalAmount === 0) {
      totalAmount = 1;
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
        startTime: resolvedStartTime,
        endTime: resolvedEndTime,
        guestCount,
        eventType,
        specialRequirements,
        packageType: isWeddingPackage ? 'wedding' : 'standard'
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
      startTime: resolvedStartTime,
      endTime: resolvedEndTime,
      guestCount,
      eventType,
      specialRequirements,
      packageType: isWeddingPackage ? 'wedding' : 'standard',
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
    
    // Handle Razorpay specific errors
    if (error.statusCode === 400 && error.error?.code === 'BAD_REQUEST_ERROR') {
      const description = error.error?.description || '';
      if (description.includes('less than minimum amount allowed')) {
        return res.status(400).json({ 
          success: false, 
          message: 'The total booking amount is below the minimum payment threshold. Please adjust your booking duration or contact the venue for pricing options.' 
        });
      }
    }
    
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

    const isWeddingPackage = bookingDetails.packageType === 'wedding';
    if (isWeddingPackage) {
      const weddingCheck = validateWeddingPackageDates(space, bookingDetails.bookingDate);
      if (!weddingCheck.ok) {
        return res.status(409).json({ success: false, message: weddingCheck.message });
      }
    }

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
      packageType: isWeddingPackage ? 'wedding' : 'standard',
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

    if (isWeddingPackage) {
      if (!space.blockedSlots) space.blockedSlots = [];
      const weddingDateStr = toDateString(bookingDetails.bookingDate);
      const packageDates = [
        addDaysStr(weddingDateStr, -1),
        weddingDateStr,
        addDaysStr(weddingDateStr, 1)
      ];
      for (const dateStr of packageDates) {
        const alreadyBlocked = space.blockedSlots.some(
          (slot) => toDateString(slot.date) === dateStr
        );
        if (!alreadyBlocked) {
          space.blockedSlots.push({
            date: new Date(`${dateStr}T12:00:00`),
            isFullDayBlocked: true,
            timeSlots: [],
            reason: 'wedding_buffer',
            notes: dateStr === weddingDateStr
              ? `Wedding package - wedding day for booking ${bookingId || booking._id}`
              : `Wedding package buffer for booking ${bookingId || booking._id}`
          });
        }
      }
    }

    await space.save();
    console.log('Booking saved successfully');

    // Notify the venue owner on WhatsApp that their space got a booking (non-blocking)
    try {
      const venueDoc = await Venue.findById(space.venueId).select('name businessName phone');
      const customerDoc = await User.findById(req.user.id).select('name phone');
      if (venueDoc?.phone) {
        whatsappService
          .sendVenueBookingNotificationTemplate({
            phone: venueDoc.phone,
            venueName: venueDoc.businessName || venueDoc.name || 'Your venue',
            spaceName: space.name || 'Your space',
            customerName: customerDoc?.name || 'A customer',
            bookingDate: toDateString(booking.bookingDate),
            bookingTime: `${booking.startTime || ''} - ${booking.endTime || ''}`.trim(),
            amount: booking.pricing?.totalAmount,
            bookingId: String(booking._id),
          })
          .then((result) => {
            if (result?.success === false) {
              console.error('[Space Booking] Venue WhatsApp failed:', result.message || result.error);
            } else {
              console.log('[Space Booking] Venue WhatsApp sent');
            }
          })
          .catch((waError) =>
            console.error('[Space Booking] Venue WhatsApp error:', waError?.message || waError)
          );
      }

      // Confirm the booking to the customer on WhatsApp (non-blocking)
      if (customerDoc?.phone) {
        const venueLabel = venueDoc?.businessName || venueDoc?.name || 'the venue';
        whatsappService
          .sendBookingConfirmedTemplate({
            phone: customerDoc.phone,
            customerName: customerDoc.name || 'Guest',
            eventName: `${space.name || 'Space'} at ${venueLabel}`,
            eventDate: toDateString(booking.bookingDate),
            eventTime: `${booking.startTime || ''} - ${booking.endTime || ''}`.trim(),
            venue: venueLabel,
            tickets: booking.eventType || 'Space booking',
            bookingId: String(booking._id),
            ticketLink: `${(process.env.FRONTEND_URL || 'https://www.ahibi.in').replace(/\/$/, '')}/profile`,
          })
          .then((result) => {
            if (result?.success === false) {
              console.error('[Space Booking] Customer WhatsApp failed:', result.message || result.error);
            } else {
              console.log('[Space Booking] Customer WhatsApp sent');
            }
          })
          .catch((waError) =>
            console.error('[Space Booking] Customer WhatsApp error:', waError?.message || waError)
          );
      }
    } catch (notifyError) {
      console.error('[Space Booking] Venue WhatsApp notify error:', notifyError?.message || notifyError);
    }

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
