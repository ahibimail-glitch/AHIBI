const ArtistBooking = require('../models/ArtistBooking');
const Artist = require('../models/Artist');
const Organizer = require('../models/Organizer');
const ArtistAvailability = require('../models/ArtistAvailability');
const ApiResponse = require('../utils/apiResponse');
const { validationResult } = require('express-validator');

/**
 * @desc    Get all booking requests for an artist
 * @route   GET /api/artist/bookings
 * @access  Private (Artist only)
 */
exports.getArtistBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { artist: req.user.id };
    
    if (status) {
      query['booking.status'] = status;
    }

    const bookings = await ArtistBooking.find(query)
      .populate('organizer', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ArtistBooking.countDocuments(query);

    return ApiResponse.success(res, 'Bookings retrieved successfully', {
      bookings,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get Artist Bookings Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving bookings', error.message);
  }
};

/**
 * @desc    Get single booking details
 * @route   GET /api/artist/bookings/:id
 * @access  Private (Artist only)
 */
exports.getBookingDetails = async (req, res) => {
  try {
    const booking = await ArtistBooking.findOne({
      _id: req.params.id,
      artist: req.user.id
    }).populate('organizer', 'name email phone');

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
 * @desc    Accept a booking request
 * @route   PUT /api/artist/bookings/:id/accept
 * @access  Private (Artist only)
 */
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await ArtistBooking.findOne({
      _id: req.params.id,
      artist: req.user.id,
      'booking.status': 'pending'
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking request not found or already processed');
    }

    // Update booking status
    booking.booking.status = 'accepted';
    booking.booking.finalAmount = booking.booking.requestedAmount;
    booking.contract.termsAccepted = true;

    // Add timeline entry
    booking.addTimelineEntry('Booking accepted by artist', 'artist', 'Artist accepted the booking request');

    // Add message
    booking.communication.messages.push({
      sender: 'artist',
      message: 'I have accepted your booking request. Looking forward to performing at your event!',
      timestamp: new Date()
    });

    const dateOnly = new Date(booking.event.date);
    dateOnly.setHours(0, 0, 0, 0);

    // Create/update availability to reflect the accepted slot as booked
    let availability = await ArtistAvailability.findOne({
      artist: req.user.id,
      date: dateOnly
    });

    const bookedStart = booking.event.startTime;
    const bookedEnd = booking.event.endTime;

    const buildSplitSlots = () => {
      const slots = [];
      if (bookedStart !== '00:00') {
        slots.push({
          startTime: '00:00',
          endTime: bookedStart,
          isAvailable: true,
          isBooked: false
        });
      }

      slots.push({
        startTime: bookedStart,
        endTime: bookedEnd,
        isAvailable: true,
        isBooked: true,
        bookingId: booking._id
      });

      if (bookedEnd !== '23:59') {
        slots.push({
          startTime: bookedEnd,
          endTime: '23:59',
          isAvailable: true,
          isBooked: false
        });
      }
      return slots;
    };

    if (!availability) {
      availability = new ArtistAvailability({
        artist: req.user.id,
        date: dateOnly,
        timeSlots: buildSplitSlots()
      });
      availability.updateDayStatus();
      await availability.save();
    } else {
      if (Array.isArray(availability.timeSlots) && availability.timeSlots.length > 0) {
        const booked = availability.bookTimeSlot(bookedStart, bookedEnd, booking._id);
        if (!booked) {
          availability.timeSlots = buildSplitSlots();
          availability.updateDayStatus();
        }
      } else {
        availability.timeSlots = buildSplitSlots();
        availability.updateDayStatus();
      }
      await availability.save();
    }

    await booking.save();

    return ApiResponse.success(res, 'Booking accepted successfully', {
      booking
    });

  } catch (error) {
    console.error('Accept Booking Error:', error);
    return ApiResponse.serverError(res, 'Error accepting booking', error.message);
  }
};

/**
 * @desc    Decline a booking request
 * @route   PUT /api/artist/bookings/:id/decline
 * @access  Private (Artist only)
 */
exports.declineBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const booking = await ArtistBooking.findOne({
      _id: req.params.id,
      artist: req.user.id,
      'booking.status': 'pending'
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking request not found or already processed');
    }

    // Update booking status
    booking.booking.status = 'declined';

    // Add timeline entry
    booking.addTimelineEntry('Booking declined by artist', 'artist', reason || 'Artist declined the booking request');

    // Add message
    booking.communication.messages.push({
      sender: 'artist',
      message: reason || 'I am unable to accept this booking request. Thank you for considering me.',
      timestamp: new Date()
    });

    await booking.save();

    return ApiResponse.success(res, 'Booking declined successfully', {
      booking
    });

  } catch (error) {
    console.error('Decline Booking Error:', error);
    return ApiResponse.serverError(res, 'Error declining booking', error.message);
  }
};

/**
 * @desc    Send counter offer for a booking
 * @route   PUT /api/artist/bookings/:id/counter-offer
 * @access  Private (Artist only)
 */
exports.sendCounterOffer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { amount, message } = req.body;
    
    const booking = await ArtistBooking.findOne({
      _id: req.params.id,
      artist: req.user.id,
      'booking.status': 'pending'
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking request not found or already processed');
    }

    // Update booking status
    booking.booking.status = 'counter_offered';
    booking.communication.counterOffer = {
      amount,
      message,
      timestamp: new Date()
    };

    // Add timeline entry
    booking.addTimelineEntry('Counter offer sent by artist', 'artist', `Counter offer: ₹${amount}`);

    // Add message
    booking.communication.messages.push({
      sender: 'artist',
      message: `Counter offer: ₹${amount}. ${message || ''}`,
      timestamp: new Date()
    });

    await booking.save();

    return ApiResponse.success(res, 'Counter offer sent successfully', {
      booking
    });

  } catch (error) {
    console.error('Send Counter Offer Error:', error);
    return ApiResponse.serverError(res, 'Error sending counter offer', error.message);
  }
};

/**
 * @desc    Update artist terms and conditions
 * @route   PUT /api/artist/terms
 * @access  Private (Artist only)
 */
exports.updateArtistTerms = async (req, res) => {
  try {
    const { content } = req.body;
    
    console.log('Updating terms for artist:', req.user.id);
    console.log('New content:', content);
    
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      console.log('Artist not found:', req.user.id);
      return ApiResponse.notFound(res, 'Artist not found');
    }

    console.log('Current terms:', artist.termsAndConditions);
    
    // Initialize termsAndConditions if it doesn't exist
    if (!artist.termsAndConditions) {
      artist.termsAndConditions = {};
    }
    
    artist.termsAndConditions.content = content;
    artist.termsAndConditions.lastUpdated = new Date();
    
    // Mark the field as modified to ensure it saves
    artist.markModified('termsAndConditions');
    
    const savedArtist = await artist.save();
    console.log('Saved terms:', savedArtist.termsAndConditions);

    return ApiResponse.success(res, 'Terms and conditions updated successfully', {
      termsAndConditions: savedArtist.termsAndConditions
    });

  } catch (error) {
    console.error('Update Artist Terms Error:', error);
    return ApiResponse.serverError(res, 'Error updating terms and conditions', error.message);
  }
};

/**
 * @desc    Get artist terms and conditions
 * @route   GET /api/artist/terms
 * @access  Private (Artist only)
 */
exports.getArtistTerms = async (req, res) => {
  try {
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    return ApiResponse.success(res, 'Terms and conditions retrieved successfully', {
      termsAndConditions: artist.termsAndConditions
    });

  } catch (error) {
    console.error('Get Artist Terms Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving terms and conditions', error.message);
  }
};

/**
 * @desc    Update cancellation policy
 * @route   PUT /api/artist/cancellation-policy
 * @access  Private (Artist only)
 */
exports.updateCancellationPolicy = async (req, res) => {
  try {
    const { advanceNotice, refundPolicy, emergencyContact } = req.body;
    
    console.log('Updating cancellation policy for artist:', req.user.id);
    console.log('Policy data:', { advanceNotice, refundPolicy, emergencyContact });
    
    const artist = await Artist.findById(req.user.id);
    if (!artist) {
      console.log('Artist not found:', req.user.id);
      return ApiResponse.notFound(res, 'Artist not found');
    }

    console.log('Current policy:', artist.cancellationPolicy);
    
    // Initialize cancellationPolicy if it doesn't exist
    if (!artist.cancellationPolicy) {
      artist.cancellationPolicy = {};
    }

    if (advanceNotice !== undefined) artist.cancellationPolicy.advanceNotice = advanceNotice;
    if (refundPolicy !== undefined) artist.cancellationPolicy.refundPolicy = refundPolicy;
    if (emergencyContact !== undefined) artist.cancellationPolicy.emergencyContact = emergencyContact;
    
    // Mark the field as modified to ensure it saves
    artist.markModified('cancellationPolicy');
    
    const savedArtist = await artist.save();
    console.log('Saved policy:', savedArtist.cancellationPolicy);

    return ApiResponse.success(res, 'Cancellation policy updated successfully', {
      cancellationPolicy: savedArtist.cancellationPolicy
    });

  } catch (error) {
    console.error('Update Cancellation Policy Error:', error);
    return ApiResponse.serverError(res, 'Error updating cancellation policy', error.message);
  }
};

/**
 * @desc    Add message to booking conversation
 * @route   POST /api/artist/bookings/:id/message
 * @access  Private (Artist only)
 */
exports.addBookingMessage = async (req, res) => {
  try {
    const { message } = req.body;

    const booking = await ArtistBooking.findOne({
      _id: req.params.id,
      artist: req.user.id
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    booking.communication.messages.push({
      sender: 'artist',
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
 * @desc    Set final price for booking
 * @route   PUT /api/artist/bookings/:id/final-price
 * @access  Private (Artist only)
 */
exports.setFinalPrice = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { finalAmount, message } = req.body;

    const booking = await ArtistBooking.findOne({
      _id: req.params.id,
      artist: req.user.id
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    if (!['pending', 'accepted', 'counter_offered'].includes(booking.booking.status)) {
      return ApiResponse.badRequest(res, 'Cannot set final price in current booking state');
    }

    // Update booking
    booking.booking.finalAmount = finalAmount;
    booking.booking.status = 'confirmed';
    booking.contract.termsAccepted = true;

    // Add timeline entry
    booking.addTimelineEntry('Final price set by artist', 'artist', `Final price: ₹${finalAmount}`);

    // Add message
    booking.communication.messages.push({
      sender: 'artist',
      message: `Final price confirmed: ₹${finalAmount}. ${message || 'Looking forward to the event!'}`,
      timestamp: new Date()
    });

    await booking.save();

    return ApiResponse.success(res, 'Final price set successfully', {
      booking
    });

  } catch (error) {
    console.error('Set Final Price Error:', error);
    return ApiResponse.serverError(res, 'Error setting final price', error.message);
  }
};

/**
 * @desc    Get artist earnings statistics
 * @route   GET /api/artist/earnings
 * @access  Private (Artist only)
 */
exports.getEarnings = async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const artistId = req.user.id;

    // Calculate date range based on period
    let startDate;
    const now = new Date();

    switch (period) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get completed bookings with final amounts
    const completedBookings = await ArtistBooking.find({
      artist: artistId,
      'booking.status': { $in: ['confirmed', 'completed'] },
      'booking.finalAmount': { $exists: true, $ne: null },
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    // Calculate totals
    let totalEarnings = 0;
    let pendingEarnings = 0;
    const bookings = completedBookings.map(booking => {
      const amount = booking.booking.finalAmount || booking.booking.requestedAmount;
      const isPaid = booking.booking.paymentStatus === 'fully_paid';

      if (isPaid) {
        totalEarnings += amount;
      } else {
        pendingEarnings += amount;
      }

      return {
        _id: booking._id,
        event: booking.event,
        date: booking.event.date,
        amount: amount,
        status: booking.booking.status,
        paymentStatus: booking.booking.paymentStatus,
        organizer: booking.organizer
      };
    });

    // Get this month's earnings
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthBookings = completedBookings.filter(
      b => b.createdAt >= thisMonthStart && b.booking.paymentStatus === 'fully_paid'
    );
    const thisMonthEarnings = thisMonthBookings.reduce(
      (sum, b) => sum + (b.booking.finalAmount || b.booking.requestedAmount),
      0
    );

    return ApiResponse.success(res, 'Earnings retrieved successfully', {
      statistics: {
        totalEarnings,
        pendingEarnings,
        thisMonthEarnings,
        totalBookings: completedBookings.length,
        paidBookings: completedBookings.filter(b => b.booking.paymentStatus === 'fully_paid').length
      },
      bookings,
      period
    });

  } catch (error) {
    console.error('Get Earnings Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving earnings', error.message);
  }
};

module.exports = {
  getArtistBookings: exports.getArtistBookings,
  getBookingDetails: exports.getBookingDetails,
  acceptBooking: exports.acceptBooking,
  declineBooking: exports.declineBooking,
  sendCounterOffer: exports.sendCounterOffer,
  updateArtistTerms: exports.updateArtistTerms,
  getArtistTerms: exports.getArtistTerms,
  updateCancellationPolicy: exports.updateCancellationPolicy,
  addBookingMessage: exports.addBookingMessage,
  setFinalPrice: exports.setFinalPrice,
  getEarnings: exports.getEarnings
};
