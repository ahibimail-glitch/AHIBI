const mongoose = require('mongoose');
const SportsVenue = require('../models/SportsVenue');
const Court = require('../models/Court');
const TimeSlot = require('../models/TimeSlot');
const SportsBooking = require('../models/SportsBooking');
const ArenaPartner = require('../models/ArenaPartner');
const ApiResponse = require('../utils/apiResponse');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ============ VENUE DISCOVERY ============

/**
 * @desc    Search and discover sports venues
 * @route   GET /api/sports/venues
 * @access  Public
 */
exports.searchVenues = async (req, res) => {
  try {
    const {
      sport,
      city,
      latitude,
      longitude,
      maxDistance,
      minPrice,
      maxPrice,
      rating,
      facilities,
      sortBy
    } = req.query;

    let query = {
      approvalStatus: 'approved',
      isActive: true
    };

    // Sport filter
    if (sport) {
      query.sportsSupported = sport;
    }

    // City filter
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    // Note: Location-based geo search disabled as 'location' field is removed. Using city filter or other params instead.

    // Rating filter
    if (rating) {
      query['rating.overall'] = { $gte: parseFloat(rating) };
    }

    // Facilities filter
    if (facilities) {
      const facilityArray = facilities.split(',');
      facilityArray.forEach(facility => {
        query[`facilities.${facility}.available`] = true;
      });
    }

    let venues = await SportsVenue.find(query)
      .select('-reviews')
      .lean();

    // Ensure cover image (isMain) appears first for each venue's gallery
    try {
      venues = venues.map(v => {
        if (v?.gallery?.images && Array.isArray(v.gallery.images) && v.gallery.images.length > 0) {
          v.gallery.images = [...v.gallery.images].sort((a, b) => {
            const ai = a?.isMain ? 1 : 0;
            const bi = b?.isMain ? 1 : 0;
            return bi - ai; // put isMain=true first
          });
        }
        return v;
      });
    } catch (_) {
      // non-fatal; continue without sorting if structure differs
    }

    // Price filter (requires checking courts)
    if (minPrice || maxPrice) {
      const Court = mongoose.model('Court');
      const venueIds = venues.map(v => v._id);
      
      const courtQuery = { venue: { $in: venueIds } };
      const courts = await Court.find(courtQuery).select('venue pricing');

      const venuesWithPrice = new Set();
      courts.forEach(court => {
        const prices = [
          court.pricing?.weekday?.offPeak?.pricePerHour,
          court.pricing?.weekday?.peak?.pricePerHour,
          court.pricing?.weekend?.offPeak?.pricePerHour,
          court.pricing?.weekend?.peak?.pricePerHour
        ].filter(p => p !== undefined);

        const minCourtPrice = Math.min(...prices);
        const maxCourtPrice = Math.max(...prices);

        const matchesMin = !minPrice || maxCourtPrice >= parseInt(minPrice);
        const matchesMax = !maxPrice || minCourtPrice <= parseInt(maxPrice);

        if (matchesMin && matchesMax) {
          venuesWithPrice.add(court.venue.toString());
        }
      });

      venues = venues.filter(v => venuesWithPrice.has(v._id.toString()));
    }

    // Sorting
    if (sortBy === 'rating') {
      venues.sort((a, b) => (b.rating?.overall || 0) - (a.rating?.overall || 0));
    } else if (sortBy === 'distance' && latitude && longitude) {
      // Already sorted by distance from $near query
    } else {
      venues.sort((a, b) => (b.statistics?.totalBookings || 0) - (a.statistics?.totalBookings || 0));
    }

    // Compute minimum court price per venue for display purposes
    try {
      const venueIds = venues.map(v => v._id);
      if (venueIds.length > 0) {
        const courts = await Court.find({
          venue: { $in: venueIds },
          status: 'active'
        }).select('venue pricing');

        const minPriceMap = new Map();
        courts.forEach(court => {
          const prices = [
            court.pricing?.weekday?.offPeak?.pricePerHour,
            court.pricing?.weekday?.peak?.pricePerHour,
            court.pricing?.weekend?.offPeak?.pricePerHour,
            court.pricing?.weekend?.peak?.pricePerHour
          ].filter(p => typeof p === 'number');

          if (prices.length > 0) {
            const minForCourt = Math.min(...prices);
            const key = court.venue.toString();
            const existing = minPriceMap.get(key);
            if (existing === undefined || minForCourt < existing) {
              minPriceMap.set(key, minForCourt);
            }
          }
        });

        // attach to venues (venues are lean objects)
        venues = venues.map(v => ({
          ...v,
          minCourtPrice: minPriceMap.get(v._id.toString())
        }));
      }
    } catch (e) {
      // non-fatal: if price computation fails, proceed without it
    }

    return ApiResponse.success(res, 'Venues retrieved successfully', {
      venues,
      count: venues.length
    });

  } catch (error) {
    console.error('Search venues error:', error);
    return ApiResponse.serverError(res, 'Error searching venues', error);
  }
};

/**
 * @desc    Get venue details by ID
 * @route   GET /api/sports/venues/:id
 * @access  Public
 */
exports.getVenueDetails = async (req, res) => {
  try {
    const venue = await SportsVenue.findOne({
      _id: req.params.id,
      approvalStatus: 'approved',
      isActive: true
    }).populate('reviews.user', 'name');

    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    // Get courts for this venue
    const courts = await Court.find({
      venue: venue._id,
      status: 'active'
    }).select('-blackoutDates');

    return ApiResponse.success(res, 'Venue details retrieved successfully', {
      venue,
      courts
    });

  } catch (error) {
    console.error('Get venue details error:', error);
    return ApiResponse.serverError(res, 'Error retrieving venue details', error);
  }
};

/**
 * @desc    Get court details by ID
 * @route   GET /api/sports/courts/:courtId
 * @access  Public
 */
exports.getCourtDetails = async (req, res) => {
  try {
    const court = await Court.findById(req.params.courtId)
      .populate('venue')
      .populate('arenaPartner', 'paymentSettings');

    if (!court) {
      return ApiResponse.notFound(res, 'Court not found');
    }

    const venueAdvancePaymentPercentRaw = Number(court.venue?.paymentSettings?.advancePaymentPercent);
    const partnerAdvancePaymentPercentRaw = Number(court.arenaPartner?.paymentSettings?.advancePaymentPercent);

    const chosenAdvancePaymentPercentRaw = Number.isFinite(partnerAdvancePaymentPercentRaw)
      ? partnerAdvancePaymentPercentRaw
      : (Number.isFinite(venueAdvancePaymentPercentRaw) ? venueAdvancePaymentPercentRaw : 10);

    const advancePaymentPercent = Math.min(100, Math.max(1, Math.round(chosenAdvancePaymentPercentRaw)));

    return ApiResponse.success(res, 'Court details retrieved successfully', {
      court,
      advancePaymentPercent
    });

  } catch (error) {
    console.error('Get court details error:', error);
    return ApiResponse.serverError(res, 'Error retrieving court details', error);
  }
};

/**
 * @desc    Get available courts for a venue
 * @route   GET /api/sports/venues/:id/courts
 * @access  Public
 */
exports.getAvailableCourts = async (req, res) => {
  try {
    const { sport, date } = req.query;

    let query = {
      venue: req.params.id,
      status: 'active'
    };

    if (sport) {
      query.sportType = sport;
    }

    const courts = await Court.find(query);

    // Filter by availability if date is provided
    if (date) {
      const availableCourts = courts.filter(court => court.isAvailableOnDate(date));
      return ApiResponse.success(res, 'Available courts retrieved successfully', {
        courts: availableCourts,
        count: availableCourts.length
      });
    }

    return ApiResponse.success(res, 'Courts retrieved successfully', {
      courts,
      count: courts.length
    });

  } catch (error) {
    console.error('Get courts error:', error);
    return ApiResponse.serverError(res, 'Error retrieving courts', error);
  }
};

// ============ SLOT AVAILABILITY ============

/**
 * @desc    Get available time slots for a court on a specific date
 * @route   GET /api/sports/courts/:courtId/slots
 * @access  Public
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return ApiResponse.badRequest(res, 'Date is required');
    }

    const court = await Court.findById(req.params.courtId).populate('venue');

    if (!court) {
      return ApiResponse.notFound(res, 'Court not found');
    }

    if (court.status !== 'active') {
      return ApiResponse.badRequest(res, 'Court is not active');
    }

    // Check if court is available on this date
    if (!court.isAvailableOnDate(date)) {
      return ApiResponse.success(res, 'Court is not available on this date', {
        available: false,
        slots: []
      });
    }

    // Generate or get existing slots
    let slots = await TimeSlot.find({
      court: court._id,
      date: new Date(date)
    }).sort({ startTime: 1 });

    // Check if slots exist and if their duration matches the court's current duration
    const courtDuration = court.pricing.duration || 60;
    const needsRegeneration = slots.length > 0 && slots.some(slot => slot.duration !== courtDuration);

    // If no slots exist or duration has changed, regenerate them
    if (slots.length === 0 || needsRegeneration) {
      slots = await TimeSlot.regenerateSlotsForDate(court._id, date);
    }

    // Recalculate prices (in case pricing rules were updated after slots were generated).
    // Only update slots that are not booked.
    try {
      const updates = [];
      for (const slot of slots) {
        if (slot.status === 'booked') continue;
        const computedPrice = court.getPricing(date, slot.startTime);
        if (typeof computedPrice === 'number' && Number.isFinite(computedPrice) && slot.price !== computedPrice) {
          slot.price = computedPrice;
          updates.push(slot.save());
        }
      }
      if (updates.length > 0) {
        await Promise.all(updates);
      }
    } catch (e) {
      // Non-fatal: if price refresh fails, continue returning slots.
      console.error('Slot price refresh error:', e);
    }

    // Provide availableCount for convenience, but return ALL slots so the UI
    // can show booked/held/blocked slots as disabled.
    const availableSlots = slots.filter(slot => slot.status === 'available');

    return ApiResponse.success(res, 'Available slots retrieved successfully', {
      available: true,
      court: {
        id: court._id,
        name: court.courtName,
        sportType: court.sportType
      },
      slots,
      totalSlots: slots.length,
      availableCount: availableSlots.length
    });

  } catch (error) {
    console.error('Get available slots error:', error);
    return ApiResponse.serverError(res, 'Error retrieving available slots', error);
  }
};

// ============ BOOKING PROCESS ============

/**
 * @desc    Hold slots during checkout (prevent double booking)
 * @route   POST /api/sports/slots/hold
 * @access  Private (User)
 */
exports.holdSlots = async (req, res) => {
  try {
    const { slotIds } = req.body;

    if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
      return ApiResponse.badRequest(res, 'Slot IDs are required');
    }

    const heldSlots = [];
    const errors = [];

    for (const slotId of slotIds) {
      try {
        const slot = await TimeSlot.holdSlot(slotId, req.user.id, 10); // Hold for 10 minutes
        heldSlots.push(slot);
      } catch (error) {
        errors.push({ slotId, error: error.message });
      }
    }

    if (heldSlots.length === 0) {
      return ApiResponse.badRequest(res, 'Failed to hold any slots', { errors });
    }

    return ApiResponse.success(res, 'Slots held successfully', {
      heldSlots,
      errors: errors.length > 0 ? errors : undefined,
      expiresIn: '10 minutes'
    });

  } catch (error) {
    console.error('Hold slots error:', error);
    return ApiResponse.serverError(res, 'Error holding slots', error);
  }
};

/**
 * @desc    Release held slots
 * @route   POST /api/sports/slots/release
 * @access  Private (User)
 */
exports.releaseSlots = async (req, res) => {
  try {
    const { slotIds } = req.body;

    if (!slotIds || !Array.isArray(slotIds)) {
      return ApiResponse.badRequest(res, 'Slot IDs are required');
    }

    for (const slotId of slotIds) {
      await TimeSlot.releaseSlot(slotId);
    }

    return ApiResponse.success(res, 'Slots released successfully');

  } catch (error) {
    console.error('Release slots error:', error);
    return ApiResponse.serverError(res, 'Error releasing slots', error);
  }
};

/**
 * @desc    Create booking order (Razorpay)
 * @route   POST /api/sports/bookings/create-order
 * @access  Private (User)
 */
exports.createBookingOrder = async (req, res) => {
  try {
    const {
      venueId,
      courtId,
      slotIds,
      numberOfPlayers,
      contactDetails,
      equipmentRental,
      coaching
    } = req.body;

    // Validate inputs
    if (!venueId || !courtId || !slotIds || slotIds.length === 0) {
      return ApiResponse.badRequest(res, 'Venue, court, and slots are required');
    }

    // Get court and venue details
    const court = await Court.findById(courtId).populate('venue');
    if (!court) {
      return ApiResponse.notFound(res, 'Court not found');
    }

    const venue = await SportsVenue.findById(venueId);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    // Get slots and verify they are held by this user
    const slots = await TimeSlot.find({
      _id: { $in: slotIds },
      court: courtId,
      status: 'held',
      heldBy: req.user.id
    }).sort({ startTime: 1 });

    if (slots.length !== slotIds.length) {
      return ApiResponse.badRequest(res, 'Some slots are not available or not held by you');
    }

    // Calculate pricing
    const baseAmount = slots.reduce((sum, slot) => sum + slot.price, 0);
    let equipmentCost = 0;
    let coachingCost = 0;

    if (equipmentRental && Array.isArray(equipmentRental)) {
      equipmentCost = equipmentRental.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    if (coaching && coaching.price) {
      coachingCost = coaching.price;
    }

    const subtotal = baseAmount + equipmentCost + coachingCost;
    const platformFee = 0;
    const taxes = 0;
    const totalAmount = subtotal;

    // Get arena partner (needed for both: advance payment fallback + platform commission)
    const arenaPartner = await ArenaPartner.findById(venue.arenaPartner);

    const venueAdvancePaymentPercentRaw = Number(venue.paymentSettings?.advancePaymentPercent);
    const partnerAdvancePaymentPercentRaw = Number(arenaPartner?.paymentSettings?.advancePaymentPercent);

    // Partner-level setting should apply by default; venue-level can be used as an override.
    const chosenAdvancePaymentPercentRaw = Number.isFinite(partnerAdvancePaymentPercentRaw)
      ? partnerAdvancePaymentPercentRaw
      : (Number.isFinite(venueAdvancePaymentPercentRaw) ? venueAdvancePaymentPercentRaw : 10);

    const advancePaymentPercent = Math.min(100, Math.max(1, Math.round(chosenAdvancePaymentPercentRaw)));
    const payableAmount = Math.max(0, Math.round((totalAmount * advancePaymentPercent) / 100));

    const commissionRate = arenaPartner?.commissionSettings?.commissionRate || 15;
    const platformCommission = Math.round((baseAmount * commissionRate) / 100);
    const arenaEarnings = baseAmount - platformCommission;

    // Create Razorpay order
    const receipt = `SPT_${Date.now()}_${req.user.id.toString().slice(-6)}`;
    
    const razorpayOrder = await razorpay.orders.create({
      amount: payableAmount * 100, // Convert to paise
      currency: 'INR',
      receipt: receipt,
      notes: {
        venueId: venueId,
        courtId: courtId,
        slotIds: slotIds.join(','),
        userId: req.user.id,
        numberOfPlayers,
        baseAmount,
        totalAmount,
        payableAmount,
        advancePaymentPercent,
        platformCommission,
        arenaEarnings
      }
    });

    return ApiResponse.success(res, 'Order created successfully', {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      pricing: {
        baseAmount,
        equipmentCost,
        coachingCost,
        subtotal,
        platformFee,
        taxes,
        totalAmount,
        advancePaymentPercent,
        payableAmount
      },
      slots: slots.map(s => ({
        id: s._id,
        startTime: s.startTime,
        endTime: s.endTime,
        price: s.price
      }))
    });

  } catch (error) {
    console.error('Create booking order error:', error);
    return ApiResponse.serverError(res, 'Error creating booking order', error);
  }
};

/**
 * @desc    Verify payment and confirm booking
 * @route   POST /api/sports/bookings/verify-payment
 * @access  Private (User)
 */
exports.verifyPaymentAndConfirm = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      contactDetails,
      specialRequests,
      equipmentRental,
      coaching
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return ApiResponse.badRequest(res, 'Invalid payment signature');
    }

    // Fetch order details
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const notes = order?.notes || {};

    const venueId = notes.venueId;
    const courtId = notes.courtId;
    const slotIds = notes.slotIds.split(',');
    const numberOfPlayers = parseInt(notes.numberOfPlayers) || 1;
    const baseAmount = parseInt(notes.baseAmount) || 0;
    const totalAmountFromNotes = parseInt(notes.totalAmount) || 0;
    const payableAmountFromNotes = parseInt(notes.payableAmount) || 0;
    const advancePaymentPercentFromNotes = parseInt(notes.advancePaymentPercent) || 0;
    const platformCommission = parseInt(notes.platformCommission) || 0;
    const arenaEarnings = parseInt(notes.arenaEarnings) || 0;

    // Get slots
    const slots = await TimeSlot.find({
      _id: { $in: slotIds }
    }).sort({ startTime: 1 });

    if (slots.length === 0) {
      return ApiResponse.badRequest(res, 'Slots not found');
    }

    const bookingDate = slots[0].date;
    const startTime = slots[0].startTime;
    const endTime = slots[slots.length - 1].endTime;

    // Calculate duration
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    const duration = (end - start) / (1000 * 60);

    const paidAmount = Math.round(order.amount / 100);

    // Get venue details
    const venue = await SportsVenue.findById(venueId);

    // Defensive check: ensure Razorpay order amount matches computed payable amount
    if (payableAmountFromNotes > 0 && paidAmount !== payableAmountFromNotes) {
      return ApiResponse.badRequest(res, 'Payment amount mismatch');
    }
    
    // Create booking
    const booking = await SportsBooking.create({
      user: req.user.id,
      venue: venueId,
      court: courtId,
      arenaPartner: venue.arenaPartner,
      bookingDate,
      slots: slotIds,
      startTime,
      endTime,
      duration,
      numberOfPlayers,
      contactDetails: contactDetails || {
        name: req.user.name,
        phone: req.user.phone,
        email: req.user.email
      },
      specialRequests,
      pricing: {
        baseAmount,
        equipmentRental: equipmentRental ? equipmentRental.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0,
        coachingFee: coaching?.price || 0,
        taxes: 0,
        platformFee: 0,
        totalAmount: totalAmountFromNotes > 0 ? totalAmountFromNotes : paidAmount,
        platformCommission,
        arenaEarnings
      },
      payment: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        amountPaid: paidAmount,
        advancePaymentPercent: advancePaymentPercentFromNotes,
        paymentMethod: 'online',
        paymentStatus: 'completed',
        paidAt: Date.now()
      },
      equipmentRented: equipmentRental || [],
      coachingBooked: coaching || {},
      status: 'confirmed',
      confirmedAt: Date.now()
    });

    // Confirm slots
    for (const slotId of slotIds) {
      await TimeSlot.confirmBooking(slotId, booking._id);
    }

    // Update statistics
    await SportsVenue.findByIdAndUpdate(venueId, {
      $inc: {
        'statistics.totalBookings': 1,
        'statistics.totalRevenue': totalAmountFromNotes > 0 ? totalAmountFromNotes : paidAmount
      }
    });

    await Court.findByIdAndUpdate(courtId, {
      $inc: {
        'statistics.totalBookings': 1,
        'statistics.totalRevenue': totalAmountFromNotes > 0 ? totalAmountFromNotes : paidAmount
      }
    });

    await ArenaPartner.findByIdAndUpdate(venue.arenaPartner, {
      $inc: {
        'statistics.totalBookings': 1,
        'statistics.totalRevenue': arenaEarnings
      }
    });

    // Populate booking details
    const populatedBooking = await SportsBooking.findById(booking._id)
      .populate('venue', 'venueName address contactInfo')
      .populate('court', 'courtName sportType')
      .populate('slots');

    return ApiResponse.success(res, 'Booking confirmed successfully', { booking: populatedBooking });

  } catch (error) {
    console.error('Verify payment error:', error);
    return ApiResponse.serverError(res, 'Error verifying payment', error);
  }
};

// ============ USER BOOKINGS ============

/**
 * @desc    Get user's bookings
 * @route   GET /api/sports/my-bookings
 * @access  Private (User)
 */
exports.getMyBookings = async (req, res) => {
  try {
    const { status, upcoming } = req.query;

    let query = { user: req.user.id };

    if (status) {
      query.status = status;
    }

    if (upcoming === 'true') {
      query.bookingDate = { $gte: new Date() };
      query.status = { $in: ['confirmed', 'checked_in'] };
    }

    const bookings = await SportsBooking.find(query)
      .populate('venue', 'venueName address contactInfo gallery')
      .populate('court', 'courtName sportType')
      .sort({ bookingDate: -1, startTime: -1 });

    return ApiResponse.success(res, 'Bookings retrieved successfully', {
      bookings,
      count: bookings.length
    });

  } catch (error) {
    console.error('Get my bookings error:', error);
    return ApiResponse.serverError(res, 'Error retrieving bookings', error);
  }
};

/**
 * @desc    Get booking by ID
 * @route   GET /api/sports/bookings/:id
 * @access  Private (User)
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await SportsBooking.findOne({
      _id: req.params.id,
      user: req.user.id
    })
      .populate('venue', 'venueName address contactInfo gallery operatingHours')
      .populate('court', 'courtName sportType specifications features')
      .populate('slots');

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    return ApiResponse.success(res, 'Booking retrieved successfully', { booking });

  } catch (error) {
    console.error('Get booking error:', error);
    return ApiResponse.serverError(res, 'Error retrieving booking', error);
  }
};

/**
 * @desc    Cancel booking
 * @route   POST /api/sports/bookings/:id/cancel
 * @access  Private (User)
 */
exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await SportsBooking.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    if (booking.status !== 'confirmed') {
      return ApiResponse.badRequest(res, 'Only confirmed bookings can be cancelled');
    }

    // Calculate refund
    const refundAmount = booking.calculateRefund();

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: 'user',
      cancelledAt: Date.now(),
      reason,
      refundAmount,
      refundStatus: refundAmount > 0 ? 'pending' : 'processed'
    };

    await booking.save();

    // Release slots
    for (const slotId of booking.slots) {
      await TimeSlot.releaseSlot(slotId);
    }

    return ApiResponse.success(res, 'Booking cancelled successfully', {
      booking,
      refundAmount
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    return ApiResponse.serverError(res, 'Error cancelling booking', error);
  }
};

/**
 * @desc    Add review for venue
 * @route   POST /api/sports/venues/:id/reviews
 * @access  Private (User)
 */
exports.addVenueReview = async (req, res) => {
  try {
    const { ratings, comment, images } = req.body;

    if (!ratings || !ratings.overall) {
      return ApiResponse.badRequest(res, 'Overall rating is required');
    }

    const venue = await SportsVenue.findById(req.params.id);
    if (!venue) {
      return ApiResponse.notFound(res, 'Venue not found');
    }

    // Check if user already reviewed
    const existingReview = venue.reviews.find(
      r => r.user.toString() === req.user.id
    );

    if (existingReview) {
      return ApiResponse.badRequest(res, 'You have already reviewed this venue');
    }

    venue.reviews.push({
      user: req.user.id,
      ratings,
      comment,
      images: images || [],
      verified: true
    });

    await venue.calculateAverageRating();
    await venue.save();

    const populatedVenue = await SportsVenue.findById(venue._id)
      .populate('reviews.user', 'name');

    return ApiResponse.success(res, 'Review added successfully', {
      rating: populatedVenue.rating,
      reviews: populatedVenue.reviews
    });

  } catch (error) {
    console.error('Add review error:', error);
    return ApiResponse.serverError(res, 'Error adding review', error);
  }
};

module.exports = exports;
