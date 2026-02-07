const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const VenueBooking = require('../models/VenueBooking');
const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const emailService = require('../services/emailService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * @desc    Get all approved venues
 * @route   GET /api/venues
 * @access  Public
 */
exports.getAllVenues = async (req, res) => {
  try {
    const { city, capacity, minPrice, maxPrice, facilities } = req.query;
    
    let query = { approvalStatus: 'approved' };
    
    // Apply filters
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    
    if (capacity) {
      query.capacity = { $gte: parseInt(capacity) };
    }
    
    if (minPrice || maxPrice) {
      query['pricing.basePrice'] = {};
      if (minPrice) query['pricing.basePrice'].$gte = parseInt(minPrice);
      if (maxPrice) query['pricing.basePrice'].$lte = parseInt(maxPrice);
    }
    
    if (facilities) {
      const facilityArray = facilities.split(',');
      facilityArray.forEach(facility => {
        query[`facilities.${facility}`] = true;
      });
    }
    
    const venues = await Venue.find(query)
      .select('-otp -otpExpires')
      .sort({ 'rating.average': -1, totalBookings: -1 });
    
    return ApiResponse.success(res, 'Venues retrieved successfully', {
      venues,
      count: venues.length
    });
    
  } catch (error) {
    console.error('Get venues error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venues', error);
  }
};

/**
 * @desc    Get venue by ID
 * @route   GET /api/venues/:id
 * @access  Public
 */
exports.getVenueById = async (req, res) => {
  try {
    console.log('Searching for venue with ID:', req.params.id);
    console.log('ObjectId validation - isValid:', mongoose.Types.ObjectId.isValid(req.params.id));
    console.log('ObjectId length:', req.params.id.length);
    
    // Validate ObjectId format - but don't fail, just log for debugging
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('WARNING: Invalid ObjectId format:', req.params.id);
      // Temporarily comment out the return to see if this is the issue
      // return ApiResponse.badRequest(res, 'Invalid venue ID format');
    }
    
    const venue = await Venue.findById(req.params.id)
      .select('-otp -otpExpires');
    
    if (!venue) {
      console.log('Venue not found in database for ID:', req.params.id);
      return ApiResponse.notFound(res, 'Venue not found');
    }
    
    console.log('Venue found:', venue.name, 'Status:', venue.approvalStatus);
    
    if (venue.approvalStatus !== 'approved') {
      return ApiResponse.forbidden(res, 'Venue is not available for booking');
    }
    
    return ApiResponse.success(res, 'Venue retrieved successfully', { venue });
    
  } catch (error) {
    console.error('Get venue error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venue', error);
  }
};

/**
 * @desc    Get venue bookings (for availability check)
 * @route   GET /api/venues/:id/bookings
 * @access  Public
 */
exports.getVenueBookings = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = {
      venue: req.params.id,
      status: { $in: ['confirmed', 'pending'] }
    };
    
    if (startDate && endDate) {
      query.bookingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const bookings = await VenueBooking.find(query)
      .select('bookingDate startTime endTime status')
      .sort({ bookingDate: 1 });
    
    return ApiResponse.success(res, 'Bookings retrieved successfully', {
      bookings
    });
    
  } catch (error) {
    console.error('Get venue bookings error:', error);
    return ApiResponse.serverError(res, 'Error retrieving bookings', error);
  }
};

/**
 * @desc    Get detailed time slot availability for a specific date
 * @route   GET /api/venues/:id/availability/:date
 * @access  Public
 */
exports.getTimeSlotAvailability = async (req, res) => {
  try {
    const { id: venueId, date } = req.params;
    
    console.log('Getting time slot availability for venue:', venueId, 'date:', date);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      return ApiResponse.badRequest(res, 'Invalid venue ID format');
    }
    
    // Validate date format
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return ApiResponse.badRequest(res, 'Invalid date format. Use YYYY-MM-DD');
    }
    
    console.log('Availability request for date:', date, 'Parsed as:', bookingDate);
    
    // Check if venue exists
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }
    
    if (venue.approvalStatus !== 'approved') {
      return ApiResponse.forbidden(res, 'Venue is not available for booking');
    }
    
    // Get detailed availability information
    const availabilityData = await VenueBooking.getAvailableTimeSlots(venueId, date);
    
    return ApiResponse.success(res, 'Time slot availability retrieved successfully', {
      venue: {
        id: venue._id,
        name: venue.name,
        capacity: venue.capacity
      },
      availability: availabilityData
    });
    
  } catch (error) {
    console.error('Get time slot availability error:', error);
    return ApiResponse.serverError(res, 'Error retrieving time slot availability', error);
  }
};

/**
 * @desc    Create booking order (Razorpay)
 * @route   POST /api/venues/:id/bookings/create-order
 * @access  Private (User)
 */
exports.createBookingOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const { bookingDate, startTime, endTime, guestCount, eventType, specialRequirements, pricingHint } = req.body;
    
    console.log('Creating booking order for venue ID:', req.params.id);
    console.log('ObjectId validation - isValid:', mongoose.Types.ObjectId.isValid(req.params.id));
    console.log('ObjectId length:', req.params.id.length);
    
    // Validate ObjectId format - but don't fail, just log for debugging
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('WARNING: Invalid ObjectId format for booking:', req.params.id);
      // Temporarily comment out the return to see if this is the issue
      // return ApiResponse.badRequest(res, 'Invalid venue ID format');
    }
    
    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      console.log('Venue not found for booking, ID:', req.params.id);
      return ApiResponse.notFound(res, 'Venue not found');
    }
    
    console.log('Venue found for booking:', venue.name, 'Status:', venue.approvalStatus);
    
    if (venue.approvalStatus !== 'approved') {
      return ApiResponse.forbidden(res, 'Venue is not available for booking');
    }
    
    // Check availability
    const isAvailable = await VenueBooking.checkAvailability(
      req.params.id,
      bookingDate,
      startTime,
      endTime
    );
    
    if (!isAvailable) {
      return ApiResponse.badRequest(res, 'Venue is not available for the selected date and time');
    }
    
    // Calculate duration and pricing (server-authoritative)
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    const durationHours = (end - start) / (1000 * 60 * 60);

    const base = Number(venue.pricing?.basePrice) || 0;
    const hourly = Number(venue.pricing?.hourlyRate) || 0;
    const halfDay = Number(venue.pricing?.halfDayRate) || 0;
    const fullDay = Number(venue.pricing?.fullDayRate) || 0;
    const cleaning = Number(venue.pricing?.cleaningFee) || 0;
    const fullDaySelected = Boolean(pricingHint?.fullDaySelected);

    let variable = 0;
    if (fullDaySelected && fullDay > 0) {
      variable = fullDay;
    } else if (durationHours > 12) {
      if (halfDay > 0) {
        variable = halfDay;
      } else {
        const candidates = [];
        if (fullDay > 0) candidates.push(fullDay / 2);
        if (hourly > 0) candidates.push(hourly * 12);
        variable = candidates.length > 0 ? Math.min(...candidates) : (hourly > 0 ? hourly * 12 : 0);
      }
    } else {
      variable = hourly * durationHours;
    }
    const totalAmount = Math.max(0, Math.round(base + variable + cleaning));
    
    // Create Razorpay order
    // Generate shorter receipt (max 40 chars): use last 8 chars of venue ID + timestamp suffix
    const shortVenueId = venue._id.toString().slice(-8);
    const timestampSuffix = Date.now().toString().slice(-6);
    const receipt = `v_${shortVenueId}_${timestampSuffix}`;
    
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100, // Convert to paise
      currency: 'INR',
      receipt: receipt,
      notes: {
        venueId: venue._id.toString(),
        venueName: venue.name,
        userId: req.user.id,
        bookingDate,
        startTime,
        endTime,
        guestCount,
        durationHours
      }
    });
    
    return ApiResponse.success(res, 'Order created successfully', {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      notes: razorpayOrder.notes
    });
    
  } catch (error) {
    console.error('Create booking order error:', error);
    return ApiResponse.serverError(res, 'Error creating booking order', error);
  }
};

/**
 * @desc    Verify payment and confirm booking
 * @route   POST /api/venues/:id/bookings/verify-payment
 * @access  Private (User)
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = req.body;
    
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
      return ApiResponse.badRequest(res, 'Invalid payment signature');
    }
    
    let booking;
    if (bookingId) {
      // Existing pending booking flow (backward compatibility)
      booking = await VenueBooking.findById(bookingId)
        .populate('venue', 'name email phone')
        .populate('user', 'name email phone');
      if (!booking) {
        return ApiResponse.notFound(res, 'Booking not found');
      }
      booking.status = 'confirmed';
      booking.pricing.paymentStatus = 'paid';
      booking.paymentDetails.paymentId = razorpay_payment_id;
      booking.paymentDetails.signature = razorpay_signature;
      booking.confirmedAt = Date.now();
      await booking.save();
    } else {
      // New flow: create booking after successful payment
      const order = await razorpay.orders.fetch(razorpay_order_id);
      const notes = order?.notes || {};
      const venueId = notes.venueId;
      const userId = req.user.id;
      const bookingDate = notes.bookingDate;
      const startTime = notes.startTime;
      const endTime = notes.endTime;
      const guestCount = Number(notes.guestCount) || 1;
      const durationHours = Number(notes.durationHours) || 0;

      const venue = await Venue.findById(venueId);
      if (!venue) {
        return ApiResponse.notFound(res, 'Venue not found for order');
      }

      const totalAmount = Math.round(order.amount / 100);

      booking = await VenueBooking.create({
        venue: venue._id,
        user: userId,
        bookingDate,
        startTime,
        endTime,
        duration: durationHours,
        guestCount,
        status: 'confirmed',
        pricing: {
          basePrice: Number(venue.pricing?.basePrice) || 0,
          totalAmount,
          paymentStatus: 'paid'
        },
        paymentDetails: {
          razorpayOrderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature
        },
        confirmedAt: Date.now()
      });
    }

    // Update venue statistics
    await Venue.findByIdAndUpdate(booking.venue._id, {
      $inc: {
        totalBookings: 1,
        totalEarnings: booking.pricing.totalAmount
      }
    });

    // Send booking confirmation email (SMS disabled)
    try {
      const populatedBooking = await VenueBooking.findById(booking._id)
        .populate('venue', 'name')
        .populate('user', 'name email');

      const userEmail = populatedBooking?.user?.email;
      if (userEmail) {
        await emailService.sendVenueBookingConfirmationEmail(
          userEmail,
          populatedBooking?.user?.name || 'Customer',
          {
            bookingId: populatedBooking?._id,
            venueName: populatedBooking?.venue?.name || 'Venue',
            bookingDate: populatedBooking?.bookingDate ? new Date(populatedBooking.bookingDate).toLocaleDateString() : 'TBA',
            timeSlot: `${populatedBooking?.startTime || ''} - ${populatedBooking?.endTime || ''}`.trim(),
            guestCount: populatedBooking?.guestCount || 1,
            totalAmount: populatedBooking?.pricing?.totalAmount,
          }
        );
      }
    } catch (emailError) {
      console.error('[Venue Booking] Failed to send confirmation email:', emailError);
    }

    return ApiResponse.success(res, 'Payment verified and booking confirmed', { booking });
    
  } catch (error) {
    console.error('Verify payment error:', error);
    return ApiResponse.serverError(res, 'Error verifying payment', error);
  }
};

/**
 * @desc    Get user's bookings
 * @route   GET /api/venues/my-bookings
 * @access  Private (User)
 */
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await VenueBooking.find({
      user: req.user.id,
      status: 'confirmed'
    })
      .populate('venue', 'name address contactInfo gallery')
      .sort({ bookingDate: -1 });
    
    return ApiResponse.success(res, 'Bookings retrieved successfully', {
      bookings
    });
    
  } catch (error) {
    console.error('Get user bookings error:', error);
    return ApiResponse.serverError(res, 'Error retrieving bookings', error);
  }
};

/**
 * @desc    Get booking by ID
 * @route   GET /api/venues/bookings/:bookingId
 * @access  Private (User)
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await VenueBooking.findOne({
      _id: req.params.bookingId,
      user: req.user.id,
      status: 'confirmed'
    })
      .populate('venue', 'name address contactInfo gallery')
      .populate('user', 'name email phone');
    
    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }
    
    return ApiResponse.success(res, 'Booking retrieved successfully', {
      booking
    });
    
  } catch (error) {
    console.error('Get booking error:', error);
    return ApiResponse.serverError(res, 'Error retrieving booking', error);
  }
};

// ============ VENUE MANAGER DASHBOARD ENDPOINTS ============

/**
 * @desc    Get venue manager dashboard stats
 * @route   GET /api/venues/manager/stats
 * @access  Private (Venue)
 */
exports.getVenueManagerStats = async (req, res) => {
  try {
    const venueId = req.user.id;
    
    // Get total bookings
    const totalBookings = await VenueBooking.countDocuments({
      venue: venueId,
      status: 'confirmed'
    });
    
    // Get pending bookings
    const pendingBookings = await VenueBooking.countDocuments({
      venue: venueId,
      status: 'pending'
    });
    
    // Get total revenue
    const revenueData = await VenueBooking.aggregate([
      {
        $match: {
          venue: new mongoose.Types.ObjectId(venueId),
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);
    
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
    
    // Get this month's bookings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyBookings = await VenueBooking.countDocuments({
      venue: venueId,
      status: 'confirmed',
      bookingDate: { $gte: startOfMonth }
    });
    
    // Get upcoming bookings
    const upcomingBookings = await VenueBooking.find({
      venue: venueId,
      status: 'confirmed',
      bookingDate: { $gte: new Date() }
    })
      .populate('user', 'name email phone')
      .sort({ bookingDate: 1 })
      .limit(5);
    
    return ApiResponse.success(res, 'Stats retrieved successfully', {
      stats: {
        totalBookings,
        pendingBookings,
        totalRevenue,
        monthlyBookings
      },
      upcomingBookings
    });
    
  } catch (error) {
    console.error('Get venue stats error:', error);
    return ApiResponse.serverError(res, 'Error retrieving stats', error);
  }
};

/**
 * @desc    Get venue manager bookings
 * @route   GET /api/venues/manager/bookings
 * @access  Private (Venue)
 */
exports.getVenueManagerBookings = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    let query = { venue: req.user.id };
    
    if (status) {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.bookingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const bookings = await VenueBooking.find(query)
      .populate('user', 'name email phone')
      .sort({ bookingDate: -1 });
    
    return ApiResponse.success(res, 'Bookings retrieved successfully', {
      bookings
    });
    
  } catch (error) {
    console.error('Get venue manager bookings error:', error);
    return ApiResponse.serverError(res, 'Error retrieving bookings', error);
  }
};

/**
 * @desc    Update booking status (venue manager)
 * @route   PUT /api/venues/manager/bookings/:bookingId
 * @access  Private (Venue)
 */
exports.updateBookingStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const { status, venueNotes, rejectionReason } = req.body;
    
    const booking = await VenueBooking.findOne({
      _id: req.params.bookingId,
      venue: req.user.id
    });
    
    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }
    
    booking.status = status;
    if (venueNotes) booking.venueNotes = venueNotes;
    if (status === 'rejected') {
      booking.rejectionReason = rejectionReason;
      booking.rejectedAt = Date.now();
    }
    
    await booking.save();
    
    return ApiResponse.success(res, 'Booking status updated successfully', {
      booking
    });
    
  } catch (error) {
    console.error('Update booking status error:', error);
    return ApiResponse.serverError(res, 'Error updating booking status', error);
  }
};

/**
 * @desc    Update venue availability
 * @route   PUT /api/venues/manager/availability
 * @access  Private (Venue)
 */
exports.updateAvailability = async (req, res) => {
  try {
    const { date, isAvailable, note } = req.body;
    
    const venue = await Venue.findById(req.user.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }
    
    // Find existing availability entry
    const existingIndex = venue.availability.findIndex(
      a => new Date(a.date).toDateString() === new Date(date).toDateString()
    );
    
    if (existingIndex > -1) {
      venue.availability[existingIndex] = { date, isAvailable, note };
    } else {
      venue.availability.push({ date, isAvailable, note });
    }
    
    await venue.save();
    
    return ApiResponse.success(res, 'Availability updated successfully', {
      availability: venue.availability
    });
    
  } catch (error) {
    console.error('Update availability error:', error);
    return ApiResponse.serverError(res, 'Error updating availability', error);
  }
};

/**
 * @desc    Update venue profile
 * @route   PUT /api/venues/manager/profile
 * @access  Private (Venue)
 */
exports.updateVenueManagerProfile = async (req, res) => {
  try {
    const venue = await Venue.findById(req.user.id);
    
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }
    
    const allowedFields = [
      'description', 'capacity', 'facilities', 'pricing', 
      'gallery', 'contactInfo', 'terms'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        venue[field] = req.body[field];
      }
    });
    
    await venue.save();
    
    return ApiResponse.success(res, 'Profile updated successfully', {
      venue
    });
    
  } catch (error) {
    console.error('Update venue profile error:', error);
    return ApiResponse.serverError(res, 'Error updating profile', error);
  }
};

/**
 * @desc    Debug endpoint to list all venues with their IDs
 * @route   GET /api/venues/debug/list-all
 * @access  Public (for debugging)
 */
exports.debugListAllVenues = async (req, res) => {
  try {
    const venues = await Venue.find({})
      .select('_id name approvalStatus email phone')
      .sort({ createdAt: -1 });
    
    console.log('All venues in database:');
    venues.forEach(venue => {
      console.log(`ID: ${venue._id}, Name: ${venue.name}, Status: ${venue.approvalStatus}`);
    });
    
    return ApiResponse.success(res, 'All venues retrieved for debugging', {
      venues,
      count: venues.length
    });
    
  } catch (error) {
    console.error('Debug list venues error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venues for debugging', error);
  }
};

/**
 * @desc    Add a review to a venue (user)
 * @route   POST /api/venues/:id/reviews
 * @access  Private (User)
 */
exports.addVenueReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Validate inputs
    const parsedRating = Number(rating);
    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      return ApiResponse.badRequest(res, 'Rating must be a number between 1 and 5');
    }

    const venue = await Venue.findById(id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }
    if (venue.approvalStatus !== 'approved') {
      return ApiResponse.forbidden(res, 'Venue is not available for review');
    }

    // Optional: prevent duplicate reviews by same user
    const alreadyReviewed = (venue.reviews || []).some(r => r.user?.toString() === req.user.id);
    if (alreadyReviewed) {
      return ApiResponse.badRequest(res, 'You have already reviewed this venue');
    }

    // Push review
    venue.reviews = venue.reviews || [];
    venue.reviews.push({
      user: req.user.id,
      userName: req.user.name || 'User',
      rating: parsedRating,
      comment: comment || ''
    });

    // Recalculate rating
    await venue.calculateAverageRating();

    await venue.save();

    // Populate minimal user info for immediate UI display
    const populated = await Venue.findById(id)
      .select('rating reviews')
      .populate('reviews.user', 'name');

    return ApiResponse.success(res, 'Review added successfully', {
      rating: populated.rating,
      reviews: populated.reviews
    });

  } catch (error) {
    console.error('Add venue review error:', error);
    return ApiResponse.serverError(res, 'Error adding review', error);
  }
};

module.exports = exports;
