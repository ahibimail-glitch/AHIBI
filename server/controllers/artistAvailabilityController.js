const ArtistAvailability = require('../models/ArtistAvailability');
const Artist = require('../models/Artist');
const ApiResponse = require('../utils/apiResponse');
const { validationResult } = require('express-validator');

/**
 * @desc    Get artist availability for a date range
 * @route   GET /api/artist/availability
 * @access  Private (Artist only)
 */
exports.getArtistAvailability = async (req, res) => {
  try {
    const { startDate, endDate, month, year } = req.query;
    let query = { artist: req.user.id };

    // Build date query
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      query.date = {
        $gte: start,
        $lte: end
      };
    }

    const availability = await ArtistAvailability.find(query)
      .populate('timeSlots.bookingId', 'event.name organizer')
      .sort({ date: 1 });

    return ApiResponse.success(res, 'Availability retrieved successfully', {
      availability
    });

  } catch (error) {
    console.error('Get Artist Availability Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving availability', error.message);
  }
};

/**
 * @desc    Set artist availability for a specific date
 * @route   POST /api/artist/availability
 * @access  Private (Artist only)
 */
exports.setArtistAvailability = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const {
      date,
      timeSlots,
      dayStatus,
      recurringPattern,
      specialPricing,
      minimumBookingDuration,
      maximumBookingDuration,
      advanceBookingDays
    } = req.body;

    // Check if availability already exists for this date
    let availability = await ArtistAvailability.findOne({
      artist: req.user.id,
      date: new Date(date)
    });

    if (availability) {
      const hasBookings = availability.timeSlots.some(slot => slot.isBooked);

      if ((!timeSlots || timeSlots.length === 0) && !hasBookings) {
        await ArtistAvailability.findByIdAndDelete(availability._id);
        return ApiResponse.success(res, 'Availability cleared successfully', {
          availability: null
        });
      }

      // Update existing availability
      availability.timeSlots = timeSlots;
      availability.dayStatus = dayStatus || availability.dayStatus;
      availability.recurringPattern = recurringPattern || availability.recurringPattern;
      availability.specialPricing = specialPricing || availability.specialPricing;
      availability.minimumBookingDuration = minimumBookingDuration || availability.minimumBookingDuration;
      availability.maximumBookingDuration = maximumBookingDuration || availability.maximumBookingDuration;
      availability.advanceBookingDays = advanceBookingDays || availability.advanceBookingDays;
    } else {
      // Create new availability
      availability = new ArtistAvailability({
        artist: req.user.id,
        date: new Date(date),
        timeSlots,
        dayStatus: dayStatus || 'available',
        recurringPattern,
        specialPricing,
        minimumBookingDuration,
        maximumBookingDuration,
        advanceBookingDays
      });
    }

    // Update day status based on time slots
    availability.updateDayStatus();
    await availability.save();

    // Handle recurring pattern
    if (recurringPattern && recurringPattern.type !== 'none') {
      await handleRecurringAvailability(req.user.id, availability, recurringPattern);
    }

    return ApiResponse.success(res, 'Availability set successfully', {
      availability
    });

  } catch (error) {
    console.error('Set Artist Availability Error:', error);
    return ApiResponse.serverError(res, 'Error setting availability', error.message);
  }
};

/**
 * @desc    Update artist availability for a specific date
 * @route   PUT /api/artist/availability/:id
 * @access  Private (Artist only)
 */
exports.updateArtistAvailability = async (req, res) => {
  try {
    const availability = await ArtistAvailability.findOne({
      _id: req.params.id,
      artist: req.user.id
    });

    if (!availability) {
      return ApiResponse.notFound(res, 'Availability not found');
    }

    const {
      timeSlots,
      dayStatus,
      specialPricing,
      minimumBookingDuration,
      maximumBookingDuration,
      advanceBookingDays
    } = req.body;

    // Update fields
    if (timeSlots) availability.timeSlots = timeSlots;
    if (dayStatus) availability.dayStatus = dayStatus;
    if (specialPricing) availability.specialPricing = specialPricing;
    if (minimumBookingDuration) availability.minimumBookingDuration = minimumBookingDuration;
    if (maximumBookingDuration) availability.maximumBookingDuration = maximumBookingDuration;
    if (advanceBookingDays) availability.advanceBookingDays = advanceBookingDays;

    const hasBookings = availability.timeSlots.some(slot => slot.isBooked);
    if (availability.timeSlots.length === 0 && !hasBookings) {
      await ArtistAvailability.findByIdAndDelete(availability._id);
      return ApiResponse.success(res, 'Availability cleared successfully', {
        availability: null
      });
    }

    // Update day status based on time slots
    availability.updateDayStatus();
    await availability.save();

    return ApiResponse.success(res, 'Availability updated successfully', {
      availability
    });

  } catch (error) {
    console.error('Update Artist Availability Error:', error);
    return ApiResponse.serverError(res, 'Error updating availability', error.message);
  }
};

/**
 * @desc    Delete artist availability for a specific date
 * @route   DELETE /api/artist/availability/:id
 * @access  Private (Artist only)
 */
exports.deleteArtistAvailability = async (req, res) => {
  try {
    const availability = await ArtistAvailability.findOne({
      _id: req.params.id,
      artist: req.user.id
    });

    if (!availability) {
      return ApiResponse.notFound(res, 'Availability not found');
    }

    // Check if there are any bookings for this date
    const hasBookings = availability.timeSlots.some(slot => slot.isBooked);
    if (hasBookings) {
      return ApiResponse.badRequest(res, 'Cannot delete availability with existing bookings');
    }

    await ArtistAvailability.findByIdAndDelete(req.params.id);

    return ApiResponse.success(res, 'Availability deleted successfully');

  } catch (error) {
    console.error('Delete Artist Availability Error:', error);
    return ApiResponse.serverError(res, 'Error deleting availability', error.message);
  }
};

/**
 * @desc    Get available time slots for a specific date (for organizers)
 * @route   GET /api/artist/:artistId/availability/:date
 * @access  Public
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { artistId, date } = req.params;

    const availability = await ArtistAvailability.findOne({
      artist: artistId,
      date: new Date(date)
    }).populate('artist', 'name basePrice');

    if (!availability) {
      return ApiResponse.notFound(res, 'No availability found for this date');
    }

    const availableSlots = availability.getAvailableSlots();
    const artist = await Artist.findById(artistId).select('name basePrice');

    // Calculate prices for each slot
    const slotsWithPrices = availableSlots.map(slot => ({
      ...slot.toObject(),
      calculatedPrice: availability.calculatePrice(slot.startTime, slot.endTime, artist.basePrice)
    }));

    return ApiResponse.success(res, 'Available slots retrieved successfully', {
      date: availability.date,
      artist: {
        id: artist._id,
        name: artist.name,
        basePrice: artist.basePrice
      },
      availableSlots: slotsWithPrices,
      dayStatus: availability.dayStatus,
      minimumBookingDuration: availability.minimumBookingDuration,
      maximumBookingDuration: availability.maximumBookingDuration,
      advanceBookingDays: availability.advanceBookingDays,
      specialPricing: availability.specialPricing
    });

  } catch (error) {
    console.error('Get Available Slots Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving available slots', error.message);
  }
};

/**
 * @desc    Bulk set availability for multiple dates
 * @route   POST /api/artist/availability/bulk
 * @access  Private (Artist only)
 */
exports.bulkSetAvailability = async (req, res) => {
  try {
    const { dates, timeSlots, specialPricing } = req.body;

    const availabilityPromises = dates.map(async (date) => {
      let availability = await ArtistAvailability.findOne({
        artist: req.user.id,
        date: new Date(date)
      });

      if (availability) {
        availability.timeSlots = timeSlots;
        if (specialPricing) availability.specialPricing = specialPricing;
        availability.updateDayStatus();
      } else {
        availability = new ArtistAvailability({
          artist: req.user.id,
          date: new Date(date),
          timeSlots,
          specialPricing
        });
        availability.updateDayStatus();
      }

      return availability.save();
    });

    const savedAvailabilities = await Promise.all(availabilityPromises);

    return ApiResponse.success(res, 'Bulk availability set successfully', {
      count: savedAvailabilities.length,
      availabilities: savedAvailabilities
    });

  } catch (error) {
    console.error('Bulk Set Availability Error:', error);
    return ApiResponse.serverError(res, 'Error setting bulk availability', error.message);
  }
};

/**
 * @desc    Get artist's booking calendar overview
 * @route   GET /api/artist/calendar-overview
 * @access  Private (Artist only)
 */
exports.getCalendarOverview = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);

    const availability = await ArtistAvailability.find({
      artist: req.user.id,
      date: { $gte: startDate, $lte: endDate }
    }).populate('timeSlots.bookingId', 'event.name organizer booking.finalAmount');

    // Create calendar overview
    const calendarData = {};
    availability.forEach(avail => {
      const dateKey = avail.date.toISOString().split('T')[0];
      calendarData[dateKey] = {
        dayStatus: avail.dayStatus,
        totalSlots: avail.timeSlots.length,
        availableSlots: avail.timeSlots.filter(slot => slot.isAvailable && !slot.isBooked).length,
        bookedSlots: avail.timeSlots.filter(slot => slot.isBooked).length,
        isSpecialDay: avail.specialPricing.isSpecialDay,
        specialReason: avail.specialPricing.reason,
        bookings: avail.timeSlots
          .filter(slot => slot.isBooked && slot.bookingId)
          .map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            bookingId: slot.bookingId._id,
            eventName: slot.bookingId.event.name,
            amount: slot.bookingId.booking.finalAmount
          }))
      };
    });

    return ApiResponse.success(res, 'Calendar overview retrieved successfully', {
      month: currentMonth,
      year: currentYear,
      calendarData
    });

  } catch (error) {
    console.error('Get Calendar Overview Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving calendar overview', error.message);
  }
};

// Helper function to handle recurring availability
async function handleRecurringAvailability(artistId, baseAvailability, recurringPattern) {
  if (recurringPattern.type === 'none' || !recurringPattern.endDate) {
    return;
  }

  const startDate = new Date(baseAvailability.date);
  const endDate = new Date(recurringPattern.endDate);
  const dates = [];

  let currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + 1); // Start from next day

  while (currentDate <= endDate) {
    let shouldAdd = false;

    switch (recurringPattern.type) {
      case 'daily':
        shouldAdd = true;
        break;
      case 'weekly':
        shouldAdd = currentDate.getDay() === startDate.getDay();
        break;
      case 'monthly':
        shouldAdd = currentDate.getDate() === startDate.getDate();
        break;
    }

    // Check days of week filter
    if (shouldAdd && recurringPattern.daysOfWeek && recurringPattern.daysOfWeek.length > 0) {
      shouldAdd = recurringPattern.daysOfWeek.includes(currentDate.getDay());
    }

    if (shouldAdd) {
      dates.push(new Date(currentDate));
    }

    // Move to next date based on pattern
    switch (recurringPattern.type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
    }
  }

  // Create availability for all dates
  const availabilityPromises = dates.map(async (date) => {
    const existingAvailability = await ArtistAvailability.findOne({
      artist: artistId,
      date: date
    });

    if (!existingAvailability) {
      const newAvailability = new ArtistAvailability({
        artist: artistId,
        date: date,
        timeSlots: baseAvailability.timeSlots.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: slot.isAvailable,
          price: slot.price,
          note: slot.note
        })),
        dayStatus: baseAvailability.dayStatus,
        specialPricing: baseAvailability.specialPricing,
        minimumBookingDuration: baseAvailability.minimumBookingDuration,
        maximumBookingDuration: baseAvailability.maximumBookingDuration,
        advanceBookingDays: baseAvailability.advanceBookingDays
      });
      
      newAvailability.updateDayStatus();
      return newAvailability.save();
    }
  });

  await Promise.all(availabilityPromises);
}

module.exports = {
  getArtistAvailability: exports.getArtistAvailability,
  setArtistAvailability: exports.setArtistAvailability,
  updateArtistAvailability: exports.updateArtistAvailability,
  deleteArtistAvailability: exports.deleteArtistAvailability,
  getAvailableSlots: exports.getAvailableSlots,
  bulkSetAvailability: exports.bulkSetAvailability,
  getCalendarOverview: exports.getCalendarOverview
};
