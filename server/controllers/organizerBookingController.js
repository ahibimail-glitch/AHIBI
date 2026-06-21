const ArtistBooking = require('../models/ArtistBooking');
const ArtistAvailability = require('../models/ArtistAvailability');
const Artist = require('../models/Artist');
const Organizer = require('../models/Organizer');
const ApiResponse = require('../utils/apiResponse');
const { validationResult } = require('express-validator');
const {
  getUnifiedMonthCalendar,
  checkSlotAvailable,
  toDateKey,
} = require('../utils/artistScheduleUtils');
const whatsappService = require('../services/whatsappService');

/**
 * @desc    Get all approved artists
 * @route   GET /api/organizer/artists/list
 * @access  Private (Organizer only)
 */
exports.getAllArtists = async (req, res) => {
  try {
    const { page = 1, limit = 20, city, type } = req.query;

    let query = { approvalStatus: 'approved' };
    
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    if (type) {
      query.type = new RegExp(type, 'i');
    }

    const artists = await Artist.find(query)
      .select('name email phone city type profilePic rating totalBookings basePrice genres')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Artist.countDocuments(query);

    return ApiResponse.success(res, 'Artists retrieved successfully', {
      artists,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get All Artists Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving artists', error.message);
  }
};

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
    
    const currentMonth = Number(month) || new Date().getMonth() + 1;
    const currentYear = Number(year) || new Date().getFullYear();

    const artist = await Artist.findById(artistId)
      .select('name basePrice profilePic rating city genres type');

    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    const calendarData = await getUnifiedMonthCalendar(
      artistId,
      currentMonth,
      currentYear,
      { basePrice: artist.basePrice || 0 }
    );

    return ApiResponse.success(res, 'Artist calendar retrieved successfully', {
      artist,
      month: currentMonth,
      year: currentYear,
      calendarData,
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
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const {
      artistId,
      event,
      requestedAmount,
      organizerRequirements,
      specialRequirements
    } = req.body;

    // Validate artist exists and is approved
    const artist = await Artist.findById(artistId);
    if (!artist || artist.approvalStatus !== 'approved') {
      return ApiResponse.notFound(res, 'Artist not found or not approved');
    }

    const availability = await ArtistAvailability.findOne({
      artist: artistId,
      date: new Date(event.date)
    });

    // Block bookings for past dates
    const eventDateOnly = new Date(event.date);
    eventDateOnly.setHours(0, 0, 0, 0);
    const todayOnly = new Date();
    todayOnly.setHours(0, 0, 0, 0);
    if (eventDateOnly < todayOnly) {
      return ApiResponse.badRequest(res, 'Cannot create booking for a past date');
    }

    if (availability && availability.dayStatus === 'unavailable') {
      return ApiResponse.badRequest(res, 'Artist is unavailable on this date');
    }

    // Check booking duration
    const startTime = new Date(`2000-01-01T${event.startTime}:00`);
    const endTime = new Date(`2000-01-01T${event.endTime}:00`);
    const durationHours = (endTime - startTime) / (1000 * 60 * 60);

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return ApiResponse.badRequest(res, 'Invalid booking duration');
    }

    // If availability exists, enforce slot-based rules and constraints
    if (availability) {
      const isAvailable = availability.isTimeSlotAvailable(event.startTime, event.endTime);
      if (!isAvailable) {
        return ApiResponse.badRequest(res, 'Requested time slot is not available');
      }

      // Check advance booking requirement
      const eventDate = new Date(event.date);
      const today = new Date();
      const daysDifference = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

      if (daysDifference < availability.advanceBookingDays) {
        return ApiResponse.badRequest(res,
          `Booking must be made at least ${availability.advanceBookingDays} days in advance`
        );
      }

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
    }

    // Prevent overlap with event bookings, teaching sessions, and blocked slots
    const slotCheck = await checkSlotAvailable(
      artistId,
      event.date,
      event.startTime,
      event.endTime
    );

    if (!slotCheck.available) {
      return ApiResponse.badRequest(res, slotCheck.reason || 'Artist is not available at this time');
    }

    // Legacy overlap guard for event bookings
    const overlappingBooking = await ArtistBooking.findOne({
      artist: artistId,
      'event.date': new Date(event.date),
      'booking.status': { $in: ['pending', 'accepted', 'counter_offered'] },
      $expr: {
        $and: [
          { $lt: ['$event.startTime', event.endTime] },
          { $gt: ['$event.endTime', event.startTime] }
        ]
      }
    }).select('_id');

    if (overlappingBooking) {
      return ApiResponse.badRequest(res, 'Artist already has a booking request for this time slot');
    }

    // Create booking request
    const booking = new ArtistBooking({
      artist: artistId,
      organizer: req.user.id,
      event: {
        name: event.name,
        description: event.description,
        date: new Date(event.date),
        startTime: event.startTime,
        endTime: event.endTime,
        duration: durationHours,
        venue: event.venue,
        eventType: event.eventType,
        expectedAudience: event.expectedAudience
      },
      booking: {
        status: 'pending',
        requestedAmount: requestedAmount
      },
      contract: {
        organizerRequirements,
        specialRequirements
      }
    });

    // Add initial timeline entry
    booking.addTimelineEntry('Booking request created', 'organizer', 'Initial booking request submitted');

    // Add initial message
    booking.communication.messages.push({
      sender: 'organizer',
      message: `Hello! I would like to book you for ${event.name} on ${event.date} from ${event.startTime} to ${event.endTime}. ${organizerRequirements || ''}`,
      timestamp: new Date()
    });

    await booking.save();

    // Notify artist via WhatsApp (non-blocking)
    try {
      if (artist?.phone) {
        const dateKey = new Date(event.date).toISOString().split('T')[0];
        const message = `New booking request received for ${dateKey} (${event.startTime}-${event.endTime}). Please check your artist dashboard to accept/decline.`;
        await whatsappService.sendTextMessage({
          to: artist.phone,
          body: message
        });
      }
    } catch (notifyError) {
      console.error('WhatsApp notify error:', notifyError?.message || notifyError);
    }

    // Populate the booking with artist and organizer details
    const populatedBooking = await ArtistBooking.findById(booking._id)
      .populate('artist', 'name email phone')
      .populate('organizer', 'name email phone');

    return ApiResponse.success(res, 'Booking request created successfully', {
      booking: populatedBooking
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
 * @desc    Get organizer's latest bookings with discussion status
 * @route   GET /api/organizer/bookings/latest
 * @access  Private (Organizer only)
 */
exports.getLatestBookingsWithDiscussion = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const bookings = await ArtistBooking.find({ organizer: req.user.id })
      .populate('artist', 'name email phone profilePic rating city')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Add discussion status (has unread messages or active discussion)
    const bookingsWithStatus = bookings.map(booking => {
      const hasDiscussion = booking.communication.messages.length > 0;
      const unreadCount = booking.communication.messages.filter(
        msg => msg.sender === 'artist' && !msg.isRead
      ).length;

      return {
        ...booking.toObject(),
        hasDiscussion,
        unreadCount,
        lastMessage: booking.communication.messages.length > 0
          ? booking.communication.messages[booking.communication.messages.length - 1]
          : null
      };
    });

    return ApiResponse.success(res, 'Latest bookings retrieved successfully', {
      bookings: bookingsWithStatus
    });

  } catch (error) {
    console.error('Get Latest Bookings Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving latest bookings', error.message);
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

module.exports = {
  getAllArtists: exports.getAllArtists,
  searchArtistsWithAvailability: exports.searchArtistsWithAvailability,
  getArtistCalendar: exports.getArtistCalendar,
  createBookingRequest: exports.createBookingRequest,
  getOrganizerBookings: exports.getOrganizerBookings,
  getLatestBookingsWithDiscussion: exports.getLatestBookingsWithDiscussion,
  getBookingDetails: exports.getBookingDetails,
  acceptCounterOffer: exports.acceptCounterOffer,
  rejectCounterOffer: exports.rejectCounterOffer,
  cancelBooking: exports.cancelBooking,
  addBookingMessage: exports.addBookingMessage
};
