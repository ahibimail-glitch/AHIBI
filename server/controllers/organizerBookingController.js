const ArtistBooking = require('../models/ArtistBooking');
const ArtistAvailability = require('../models/ArtistAvailability');
const Artist = require('../models/Artist');
const Organizer = require('../models/Organizer');
const PaymentTransaction = require('../models/PaymentTransaction');
const ApiResponse = require('../utils/apiResponse');
const ArtistNotificationService = require('../services/artistNotificationService');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * @desc    Search artists with availability
 * @route   GET /api/organizer/artists/search
 * @access  Private (Organizer only)
 */
exports.searchArtistsWithAvailability = async (req, res) => {
  try {
    const { 
      date, 
      startTime, 
      endTime, 
      location, 
      genre, 
      type, 
      minPrice, 
      maxPrice, 
      page = 1, 
      limit = 10 
    } = req.query;

    // Build artist search query
    let artistQuery = { approvalStatus: 'approved' };
    
    if (location) {
      artistQuery.city = new RegExp(location, 'i');
    }
    if (genre) {
      artistQuery.genres = { $in: [new RegExp(genre, 'i')] };
    }
    if (type) {
      artistQuery.type = new RegExp(type, 'i');
    }
    if (minPrice || maxPrice) {
      artistQuery.basePrice = {};
      if (minPrice) artistQuery.basePrice.$gte = parseInt(minPrice);
      if (maxPrice) artistQuery.basePrice.$lte = parseInt(maxPrice);
    }

    // Get artists matching criteria
    const artists = await Artist.find(artistQuery)
      .select('name email phone city genres type basePrice profilePic rating totalBookings')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // If date and time are specified, filter by availability
    let availableArtists = artists;
    if (date && startTime && endTime) {
      const availabilityPromises = artists.map(async (artist) => {
        const availability = await ArtistAvailability.findOne({
          artist: artist._id,
          date: new Date(date)
        });

        if (!availability) {
          return null; // No availability set for this date
        }

        const isAvailable = availability.isTimeSlotAvailable(startTime, endTime);
        if (isAvailable) {
          const calculatedPrice = availability.calculatePrice(startTime, endTime, artist.basePrice);
          return {
            ...artist.toObject(),
            availabilityId: availability._id,
            calculatedPrice,
            dayStatus: availability.dayStatus,
            minimumBookingDuration: availability.minimumBookingDuration,
            maximumBookingDuration: availability.maximumBookingDuration
          };
        }
        return null;
      });

      const results = await Promise.all(availabilityPromises);
      availableArtists = results.filter(artist => artist !== null);
    }

    const total = await Artist.countDocuments(artistQuery);

    return ApiResponse.success(res, 'Artists retrieved successfully', {
      artists: availableArtists,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      searchCriteria: {
        date,
        startTime,
        endTime,
        location,
        genre,
        type,
        minPrice,
        maxPrice
      }
    });

  } catch (error) {
    console.error('Search Artists Error:', error);
    return ApiResponse.serverError(res, 'Error searching artists', error.message);
  }
};

/**
 * @desc    Get artist availability calendar
 * @route   GET /api/organizer/artists/:artistId/calendar
 * @access  Private (Organizer only)
 */
exports.getArtistCalendar = async (req, res) => {
  try {
    const { artistId } = req.params;
    const { month, year } = req.query;
    
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);

    // Get artist info
    const artist = await Artist.findById(artistId)
      .select('name basePrice profilePic rating city genres type');

    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    // Get availability for the month
    const availability = await ArtistAvailability.find({
      artist: artistId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Format availability array for frontend
    const availabilityArray = availability.map(avail => {
      const dateKey = avail.date.toISOString().split('T')[0];
      
      // Map all time slots (both available and booked)
      const timeSlots = avail.timeSlots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable,
        isBooked: slot.isBooked || false,
        price: slot.price || artist.basePrice,
        notes: slot.note || '',
        bookingId: slot.bookingId || undefined
      }));
      
      return {
        _id: avail._id.toString(),
        date: dateKey,
        dayStatus: avail.dayStatus,
        timeSlots: timeSlots,
        specialPricing: {
          isSpecial: avail.specialPricing.isSpecialDay || false,
          multiplier: avail.specialPricing.multiplier,
          fixedPrice: avail.specialPricing.fixedPrice,
          reason: avail.specialPricing.reason
        },
        minimumBookingDuration: avail.minimumBookingDuration,
        maximumBookingDuration: avail.maximumBookingDuration,
        advanceBookingDays: avail.advanceBookingDays
      };
    });

    // Also include calendarData for backward compatibility
    const calendarData = {};
    availability.forEach(avail => {
      const dateKey = avail.date.toISOString().split('T')[0];
      const availableSlots = avail.getAvailableSlots();
      
      calendarData[dateKey] = {
        dayStatus: avail.dayStatus,
        availableSlots: availableSlots.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          calculatedPrice: avail.calculatePrice(slot.startTime, slot.endTime, artist.basePrice),
          note: slot.note
        })),
        isSpecialDay: avail.specialPricing.isSpecialDay,
        specialReason: avail.specialPricing.reason,
        minimumBookingDuration: avail.minimumBookingDuration,
        maximumBookingDuration: avail.maximumBookingDuration,
        advanceBookingDays: avail.advanceBookingDays
      };
    });

    return ApiResponse.success(res, 'Artist calendar retrieved successfully', {
      artist,
      month: currentMonth,
      year: currentYear,
      availability: availabilityArray,
      calendarData // For backward compatibility
    });

  } catch (error) {
    console.error('Get Artist Calendar Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving artist calendar', error.message);
  }
};

/**
 * @desc    Create booking request
 * @route   POST /api/organizer/bookings
 * @access  Private (Organizer only)
 */
exports.createBookingRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array());
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }

  try {
    const {
      artistId,
      event,
      requestedAmount,
      organizerRequirements,
      specialRequirements
    } = req.body;

    console.log('Received booking request:', {
      artistId,
      event: event?.name,
      date: event?.date,
      startTime: event?.startTime,
      endTime: event?.endTime,
      venue: event?.venue,
      requestedAmount
    });

    // Validate artist exists and is approved
    const artist = await Artist.findById(artistId);
    if (!artist || artist.approvalStatus !== 'approved') {
      return ApiResponse.notFound(res, 'Artist not found or not approved');
    }

    // Check if there's already a booking for this date (only 1 booking per day)
    // Parse date correctly - handle both ISO string and Date object
    const eventDate = event.date instanceof Date ? new Date(event.date) : new Date(event.date);
    const startOfDay = new Date(eventDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(eventDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingBooking = await ArtistBooking.findOne({
      artist: artistId,
      'event.date': {
        $gte: startOfDay,
        $lte: endOfDay
      },
      'booking.status': { $in: ['pending', 'accepted', 'confirmed'] }
    });

    if (existingBooking) {
      return ApiResponse.badRequest(res, 'This artist already has a booking for this date. Only one booking per day is allowed.');
    }

    // Calculate duration hours first (needed regardless of availability)
    const startTime = new Date(`2000-01-01T${event.startTime}:00`);
    const endTime = new Date(`2000-01-01T${event.endTime}:00`);
    const durationHours = (endTime - startTime) / (1000 * 60 * 60);

    // Check if availability is set for this date (optional - by default all dates are available)
    const availability = await ArtistAvailability.findOne({
      artist: artistId,
      date: eventDate
    });

    let slotBooked = false;
    let bookingId = null;

    if (availability) {
      // If availability is set, validate against it
      const isAvailable = availability.isTimeSlotAvailable(event.startTime, event.endTime);
      if (!isAvailable) {
        return ApiResponse.badRequest(res, 'Requested time slot is not available');
      }

      // Check advance booking requirement
      const today = new Date();
      const daysDifference = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysDifference < availability.advanceBookingDays) {
        return ApiResponse.badRequest(res, 
          `Booking must be made at least ${availability.advanceBookingDays} days in advance`
        );
      }

      // Check booking duration
      if (durationHours < availability.minimumBookingDuration) {
        return ApiResponse.badRequest(res, 
          `Minimum booking duration is ${availability.minimumBookingDuration} hours`
        );
      }

      if (durationHours > availability.maximumBookingDuration) {
        return ApiResponse.badRequest(res, 
          `Maximum booking duration is ${availability.maximumBookingDuration} hours`
        );
      }

      // Mark the time slot as booked in availability (direct booking)
      slotBooked = availability.bookTimeSlot(event.startTime, event.endTime, null);
      if (!slotBooked) {
        return ApiResponse.badRequest(res, 'Failed to book the time slot. It may have been booked by another organizer.');
      }
      await availability.save();
    } else {
      // No availability set - allow booking with basic validations (default: all dates available)
      const today = new Date();
      const daysDifference = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      
      // Default to at least 1 day in advance if no availability is set
      if (daysDifference < 1) {
        return ApiResponse.badRequest(res, 'Booking must be made at least 1 day in advance');
      }
      
      // Check basic duration (at least 1 hour, max 12 hours)
      if (durationHours < 1) {
        return ApiResponse.badRequest(res, 'Minimum booking duration is 1 hour');
      }
      
      if (durationHours > 12) {
        return ApiResponse.badRequest(res, 'Maximum booking duration is 12 hours');
      }
    }

    // Create booking with pending status - will be confirmed after payment
    const booking = new ArtistBooking({
      artist: artistId,
      organizer: req.user.id,
      event: {
        name: event.name,
        description: event.description,
        date: eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        duration: durationHours,
        venue: event.venue,
        eventType: event.eventType,
        expectedAudience: event.expectedAudience
      },
      booking: {
        status: 'pending', // Pending until payment is confirmed
        requestedAmount: requestedAmount,
        finalAmount: requestedAmount,
        paymentStatus: 'pending'
      },
      contract: {
        termsAccepted: true,
        organizerRequirements,
        specialRequirements
      }
    });

    // Add initial timeline entry
    booking.addTimelineEntry('Booking request created', 'organizer', 'Booking request created, awaiting payment');

    // Add initial message
    booking.communication.messages.push({
      sender: 'organizer',
      message: `Hello! I would like to book you for ${event.name} on ${event.date} from ${event.startTime} to ${event.endTime}. ${organizerRequirements || ''}`,
      timestamp: new Date()
    });

    await booking.save();

    // Create Razorpay order for payment
    const organizer = await Organizer.findById(req.user.id);
    const artistData = await Artist.findById(artistId);
    
    // Ensure Razorpay is initialized
    if (!razorpay) {
      return ApiResponse.serverError(res, 'Payment gateway not initialized');
    }

    const amountInPaise = Math.round(requestedAmount * 100); // Convert to paise
    
    console.log('Creating Razorpay order:', {
      amount: amountInPaise,
      currency: 'INR',
      bookingId: booking._id.toString()
    });
    
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `ARTIST_BOOKING_${booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        artistId: artistId.toString(),
        organizerId: req.user.id.toString(),
        artistName: artistData.name,
        organizerName: organizer.name,
        eventName: event.name,
        eventDate: event.date,
        amount: requestedAmount.toString()
      }
    };

    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create(orderOptions);
      console.log('Razorpay order created:', razorpayOrder.id);
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      return ApiResponse.serverError(res, `Failed to create payment order: ${error.message || error.error?.description || 'Unknown error'}`);
    }

    // Store payment order ID in booking (temporary until payment is verified)
    booking.booking.paymentOrderId = razorpayOrder.id;
    await booking.save();

    // Populate the booking with artist and organizer details
    const populatedBooking = await ArtistBooking.findById(booking._id)
      .populate('artist', 'name email phone')
      .populate('organizer', 'name email phone');

    return ApiResponse.success(res, 'Booking created. Please proceed with payment.', {
      booking: populatedBooking,
      paymentOrder: razorpayOrder
    }, 201);

  } catch (error) {
    console.error('Create Booking Request Error:', error);
    return ApiResponse.serverError(res, 'Error creating booking request', error.message);
  }
};

/**
 * @desc    Get organizer's booking requests
 * @route   GET /api/organizer/bookings
 * @access  Private (Organizer only)
 */
exports.getOrganizerBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { organizer: req.user.id };
    
    if (status) {
      query['booking.status'] = status;
    }

    const bookings = await ArtistBooking.find(query)
      .populate('artist', 'name email phone profilePic rating city')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ArtistBooking.countDocuments(query);

    return ApiResponse.success(res, 'Bookings retrieved successfully', {
      bookings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get Organizer Bookings Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving bookings', error.message);
  }
};

/**
 * @desc    Get booking details
 * @route   GET /api/organizer/bookings/:id
 * @access  Private (Organizer only)
 */
exports.getBookingDetails = async (req, res) => {
  try {
    const booking = await ArtistBooking.findOne({
      _id: req.params.id,
      organizer: req.user.id
    }).populate('artist', 'name email phone profilePic rating city genres type');

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    return ApiResponse.success(res, 'Booking details retrieved successfully', {
      booking
    });

  } catch (error) {
    console.error('Get Booking Details Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving booking details', error.message);
  }
};

/**
 * @desc    Accept counter offer
 * @route   PUT /api/organizer/bookings/:id/accept-counter-offer
 * @access  Private (Organizer only)
 */
exports.acceptCounterOffer = async (req, res) => {
  try {
    const booking = await ArtistBooking.findOne({
      _id: req.params.id,
      organizer: req.user.id,
      'booking.status': 'counter_offered'
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found or not in counter offer state');
    }

    // Update booking status
    booking.booking.status = 'accepted';
    booking.booking.finalAmount = booking.communication.counterOffer.amount;
    booking.contract.termsAccepted = true;

    // Add timeline entry
    booking.addTimelineEntry('Counter offer accepted by organizer', 'organizer', 
      `Accepted counter offer of ₹${booking.communication.counterOffer.amount}`);

    // Add message
    booking.communication.messages.push({
      sender: 'organizer',
      message: 'I accept your counter offer. Looking forward to the event!',
      timestamp: new Date()
    });

    await booking.save();

    return ApiResponse.success(res, 'Counter offer accepted successfully', {
      booking
    });

  } catch (error) {
    console.error('Accept Counter Offer Error:', error);
    return ApiResponse.serverError(res, 'Error accepting counter offer', error.message);
  }
};

/**
 * @desc    Reject counter offer
 * @route   PUT /api/organizer/bookings/:id/reject-counter-offer
 * @access  Private (Organizer only)
 */
exports.rejectCounterOffer = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const booking = await ArtistBooking.findOne({
      _id: req.params.id,
      organizer: req.user.id,
      'booking.status': 'counter_offered'
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found or not in counter offer state');
    }

    // Update booking status
    booking.booking.status = 'declined';

    // Add timeline entry
    booking.addTimelineEntry('Counter offer rejected by organizer', 'organizer', 
      reason || 'Organizer rejected the counter offer');

    // Add message
    booking.communication.messages.push({
      sender: 'organizer',
      message: reason || 'I cannot accept the counter offer. Thank you for your time.',
      timestamp: new Date()
    });

    await booking.save();

    return ApiResponse.success(res, 'Counter offer rejected successfully', {
      booking
    });

  } catch (error) {
    console.error('Reject Counter Offer Error:', error);
    return ApiResponse.serverError(res, 'Error rejecting counter offer', error.message);
  }
};

/**
 * @desc    Cancel booking
 * @route   PUT /api/organizer/bookings/:id/cancel
 * @access  Private (Organizer only)
 */
exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const booking = await ArtistBooking.findOne({
      _id: req.params.id,
      organizer: req.user.id
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    if (!['pending', 'accepted', 'confirmed'].includes(booking.booking.status)) {
      return ApiResponse.badRequest(res, 'Booking cannot be cancelled in current state');
    }

    // Update booking status
    booking.booking.status = 'cancelled';

    // Add timeline entry
    booking.addTimelineEntry('Booking cancelled by organizer', 'organizer', 
      reason || 'Booking cancelled by organizer');

    // Add message
    booking.communication.messages.push({
      sender: 'organizer',
      message: reason || 'I need to cancel this booking. Sorry for any inconvenience.',
      timestamp: new Date()
    });

    // Free up the time slot if it was booked
    if (booking.booking.status === 'confirmed') {
      const availability = await ArtistAvailability.findOne({
        artist: booking.artist,
        date: booking.event.date
      });

      if (availability) {
        const slot = availability.timeSlots.find(slot => 
          slot.bookingId && slot.bookingId.toString() === booking._id.toString()
        );
        
        if (slot) {
          slot.isBooked = false;
          slot.bookingId = null;
          availability.updateDayStatus();
          await availability.save();
        }
      }
    }

    await booking.save();

    return ApiResponse.success(res, 'Booking cancelled successfully', {
      booking
    });

  } catch (error) {
    console.error('Cancel Booking Error:', error);
    return ApiResponse.serverError(res, 'Error cancelling booking', error.message);
  }
};

/**
 * @desc    Add message to booking conversation
 * @route   POST /api/organizer/bookings/:id/message
 * @access  Private (Organizer only)
 */
exports.addBookingMessage = async (req, res) => {
  try {
    const { message } = req.body;
    
    const booking = await ArtistBooking.findOne({
      _id: req.params.id,
      organizer: req.user.id
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    booking.communication.messages.push({
      sender: 'organizer',
      message,
      timestamp: new Date()
    });

    await booking.save();

    return ApiResponse.success(res, 'Message sent successfully', {
      message: booking.communication.messages[booking.communication.messages.length - 1]
    });

  } catch (error) {
    console.error('Add Booking Message Error:', error);
    return ApiResponse.serverError(res, 'Error sending message', error.message);
  }
};

/**
 * @desc    Verify payment and confirm booking
 * @route   POST /api/organizer/bookings/:id/payment/verify
 * @access  Private (Organizer only)
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return ApiResponse.badRequest(res, 'Invalid payment signature');
    }

    // Find booking
    const booking = await ArtistBooking.findOne({
      _id: id,
      organizer: req.user.id,
      'booking.status': 'pending'
    }).populate('artist', 'name email phone').populate('organizer', 'name email phone');

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found or already processed');
    }

    // Verify the order ID matches
    if (booking.booking.paymentOrderId !== razorpay_order_id) {
      return ApiResponse.badRequest(res, 'Payment order ID mismatch');
    }

    // Create payment transaction record
    const paymentTransaction = new PaymentTransaction({
      bookingId: booking._id,
      bookingType: 'artist',
      amount: booking.booking.finalAmount,
      paymentMethod: 'online',
      transactionId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentGateway: 'razorpay',
      status: 'completed',
      paymentDetails: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        signature: razorpay_signature
      }
    });

    await paymentTransaction.save();

    // Update booking status to confirmed
    booking.booking.status = 'confirmed';
    booking.booking.paymentStatus = 'fully_paid';
    booking.booking.paymentDetails = {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      signature: razorpay_signature,
      paymentGateway: 'razorpay'
    };

    // Add timeline entry (use 'admin' for system actions)
    booking.addTimelineEntry('Payment confirmed', 'admin', `Payment of ₹${booking.booking.finalAmount} confirmed`);

    // Update availability slot if exists
    const availability = await ArtistAvailability.findOne({
      artist: booking.artist._id,
      date: booking.event.date
    });

    if (availability) {
      const slot = availability.timeSlots.find(s => 
        s.startTime <= booking.event.startTime && 
        s.endTime >= booking.event.endTime
      );
      if (slot && !slot.isBooked) {
        slot.isBooked = true;
        slot.bookingId = booking._id;
        availability.updateDayStatus();
        await availability.save();
      }
    }

    await booking.save();

    // Send notification to artist
    try {
      await ArtistNotificationService.notifyBookingStatusUpdate(booking._id, 'confirmed');
    } catch (notificationError) {
      console.error('Error sending booking notification:', notificationError);
    }

    return ApiResponse.success(res, 'Payment verified and booking confirmed', {
      booking,
      paymentTransaction
    });

  } catch (error) {
    console.error('Verify Payment Error:', error);
    return ApiResponse.serverError(res, 'Error verifying payment', error.message);
  }
};

module.exports = {
  searchArtistsWithAvailability: exports.searchArtistsWithAvailability,
  getArtistCalendar: exports.getArtistCalendar,
  createBookingRequest: exports.createBookingRequest,
  getOrganizerBookings: exports.getOrganizerBookings,
  getBookingDetails: exports.getBookingDetails,
  acceptCounterOffer: exports.acceptCounterOffer,
  rejectCounterOffer: exports.rejectCounterOffer,
  cancelBooking: exports.cancelBooking,
  addBookingMessage: exports.addBookingMessage,
  verifyPayment: exports.verifyPayment
};
