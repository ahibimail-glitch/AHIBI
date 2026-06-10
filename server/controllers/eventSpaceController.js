const EventSpace = require('../models/EventSpace');
const Venue = require('../models/Venue');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const normalizeDateString = (date) => {
  if (!date) return null;
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate.toISOString().split('T')[0];
};

const timeStringToMinutes = (timeStr = '') => {
  const [hours = '0', minutes = '0'] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const doTimeRangesOverlap = (startA, endA, startB, endB) => {
  const aStart = timeStringToMinutes(startA);
  const aEnd = timeStringToMinutes(endA);
  const bStart = timeStringToMinutes(startB);
  const bEnd = timeStringToMinutes(endB);

  if ([aStart, aEnd, bStart, bEnd].some((value) => value === null)) {
    return false;
  }

  return aStart < bEnd && bStart < aEnd;
};

const isActiveBooking = (booking = {}) => {
  const status = (booking.status || 'confirmed').toLowerCase();
  return ['confirmed', 'completed'].includes(status);
};

const buildOverlapChecker = (timeSlots = []) => {
  const normalizedSlots = (timeSlots || [])
    .map((slot) => ({
      startTime: slot?.startTime,
      endTime: slot?.endTime,
    }))
    .filter((slot) => slot.startTime && slot.endTime);

  return (bookingStart, bookingEnd) =>
    normalizedSlots.some((slot) =>
      doTimeRangesOverlap(slot.startTime, slot.endTime, bookingStart, bookingEnd)
    );
};

const findBookingConflict = (bookings = [], dateStr, isFullDayBlocked, timeSlots) => {
  if (!dateStr) return null;

  const normalizedDate = normalizeDateString(dateStr);
  if (!normalizedDate) return null;

  const overlaps = buildOverlapChecker(timeSlots);

  return bookings.find((booking) => {
    if (!isActiveBooking(booking)) return false;
    const bookingDate = normalizeDateString(booking.bookingDate);
    if (bookingDate !== normalizedDate) return false;

    if (isFullDayBlocked) {
      return true;
    }

    return overlaps(booking.startTime, booking.endTime);
  });
};

// Get all spaces for a venue
const getVenueSpaces = async (req, res) => {
  try {
    const venueId = req.venue.id;
    const { status, page = 1, limit = 10, search } = req.query;

    // Verify venue exists and is authenticated
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    // Build query
    const query = { venueId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const spaces = await EventSpace.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await EventSpace.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        spaces,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get venue spaces error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venue spaces'
    });
  }
};

// Get space by ID
const getSpaceById = async (req, res) => {
  try {
    const { id } = req.params;

    const space = await EventSpace.findById(id).populate('venueId', 'name email phone');

    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    // Verify venue belongs to authenticated venue user
    const venue = await Venue.findOne({ _id: space.venueId, _id: req.venue.id });
    if (!venue) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Not authorized to view this space'
      });
    }

    res.status(200).json({
      success: true,
      data: { space }
    });

  } catch (error) {
    console.error('Get space by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch space'
    });
  }
};

// Create new space
const createSpace = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { venueId } = req.body;

    // Verify venue belongs to authenticated venue user
    const venue = await Venue.findOne({ _id: venueId, _id: req.venue.id });
    if (!venue) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Venue not found or not authorized'
      });
    }

    // Create space with venue reference
    const spaceData = {
      ...req.body,
      venueId
    };

    const space = new EventSpace(spaceData);
    await space.save();

    res.status(201).json({
      success: true,
      message: 'Space created successfully',
      data: { space }
    });

  } catch (error) {
    console.error('Create space error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create space'
    });
  }
};

// Update space
const updateSpace = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Find space and verify venue ownership
    const space = await EventSpace.findById(id);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    const venue = await Venue.findOne({ _id: space.venueId, _id: req.venue.id });
    if (!venue) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Not authorized to update this space'
      });
    }

    // Define allowed fields for update
    const allowedFields = [
      'name', 'description', 'tagline', 'venueClassification', 'address',
      'capacity', 'capacityDetails', 'parking', 'accessibility', 'facilities', 'amenities',
      'pricing', 'gallery', 'coverImage', 'contactInfo', 'terms', 'policies', 'addOnServices',
      'documents', 'authorizations', 'faqs'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedSpace = await EventSpace.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Space updated successfully',
      data: { space: updatedSpace }
    });

  } catch (error) {
    console.error('Update space error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update space'
    });
  }
};

// Delete space
const deleteSpace = async (req, res) => {
  try {
    const { id } = req.params;

    // Find space and verify venue ownership
    const space = await EventSpace.findById(id);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    const venue = await Venue.findOne({ _id: space.venueId, _id: req.venue.id });
    if (!venue) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Not authorized to delete this space'
      });
    }

    // Check if space has bookings
    if (space.totalBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete space with existing bookings'
      });
    }

    await EventSpace.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Space deleted successfully'
    });

  } catch (error) {
    console.error('Delete space error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete space'
    });
  }
};

// Get public spaces for a venue (no authentication required)
const getPublicVenueSpaces = async (req, res) => {
  try {
    const { id: venueId } = req.params;

    // Verify venue exists
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    // Only return approved/active venues' spaces
    if (venue.status !== 'approved' && venue.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Venue is not available for booking'
      });
    }

    // Get spaces for this venue
    const spaces = await EventSpace.find({ venueId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        spaces,
        venue: {
          _id: venue._id,
          name: venue.name,
          businessName: venue.businessName
        }
      }
    });

  } catch (error) {
    console.error('Get public venue spaces error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venue spaces'
    });
  }
};

// Get public space details by ID (no authentication required)
const getPublicSpaceById = async (req, res) => {
  try {
    const { id: spaceId } = req.params;

    const space = await EventSpace.findById(spaceId).populate('venueId', 'name businessName status isVerified');
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    // Check if the venue is approved/active
    const venue = space.venueId;
    if (venue.status !== 'approved' && venue.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This space is not available for booking'
      });
    }

    res.status(200).json({
      success: true,
      data: { space }
    });

  } catch (error) {
    console.error('Get public space by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch space details'
    });
  }
};

// Get space statistics
const getSpaceStats = async (req, res) => {
  try {
    const venueId = req.venue.id;

    // Verify venue exists and is authenticated
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    const stats = await EventSpace.aggregate([
      { $match: { venueId: venueId } },
      {
        $group: {
          _id: null,
          totalSpaces: { $sum: 1 },
          totalBookings: { $sum: '$totalBookings' },
          totalEarnings: { $sum: '$totalEarnings' },
          averageRating: { $avg: '$rating.average' }
        }
      }
    ]);

    const result = stats[0] || {
      totalSpaces: 0,
      totalBookings: 0,
      totalEarnings: 0,
      averageRating: 0
    };

    res.status(200).json({
      success: true,
      data: { stats: result }
    });

  } catch (error) {
    console.error('Get space stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch space statistics'
    });
  }
};

// Get all bookings for the authenticated venue (across all its spaces)
const getVenueBookings = async (req, res) => {
  try {
    const venueId = req.venue.id;

    const spaces = await EventSpace.find({ venueId }).select('name _id bookings').lean();
    const allBookings = [];

    for (const space of spaces) {
      const bookings = space.bookings || [];
      for (const b of bookings) {
        if (b && b.status) {
          allBookings.push({
            ...b,
            spaceName: space.name,
            spaceId: space._id.toString()
          });
        }
      }
    }

    // Sort by createdAt descending
    allBookings.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Populate user (name, email) for each booking
    const userIds = [...new Set(allBookings.map(b => b.user).filter(Boolean))];
    const users = userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).select('name email').lean()
      : [];
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const bookingsWithUser = allBookings.map(b => {
      const user = b.user ? userMap[b.user.toString?.() || b.user] : null;
      return {
        ...b,
        user: user ? { name: user.name, email: user.email } : null
      };
    });

    res.status(200).json({
      success: true,
      data: {
        bookings: bookingsWithUser,
        totalBookings: bookingsWithUser.length
      }
    });
  } catch (error) {
    console.error('Get venue bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venue bookings'
    });
  }
};

// Block dates and times for a space
const blockDateTime = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id: spaceId } = req.params;
    const { date, isFullDayBlocked, timeSlots, reason, notes } = req.body;

    // Find space and verify venue ownership
    const space = await EventSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    const venue = await Venue.findOne({ _id: space.venueId, _id: req.venue.id });
    if (!venue) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Not authorized to block this space'
      });
    }

    // Check if the date/time is already blocked
    const normalizedRequestDate = normalizeDateString(date);
    const existingBlock = space.blockedSlots.find(block => 
      normalizeDateString(block.date) === normalizedRequestDate
    );

    if (existingBlock) {
      return res.status(400).json({
        success: false,
        message: 'This date is already blocked. Please update the existing block instead.'
      });
    }

    // Prevent blocking when there are confirmed bookings
    const conflictBooking = findBookingConflict(
      space.bookings,
      normalizedRequestDate,
      isFullDayBlocked,
      timeSlots
    );

    if (conflictBooking) {
      return res.status(400).json({
        success: false,
        message: 'Cannot block this date/time because there is an existing booking.',
        data: {
          bookingDate: conflictBooking.bookingDate,
          startTime: conflictBooking.startTime,
          endTime: conflictBooking.endTime,
          bookingId: conflictBooking._id
        }
      });
    }

    // Create new blocked slot
    const newBlockedSlot = {
      date: new Date(date),
      isFullDayBlocked: isFullDayBlocked || false,
      timeSlots: timeSlots || [],
      reason: reason || 'other',
      notes: notes || '',
      createdAt: new Date()
    };

    space.blockedSlots.push(newBlockedSlot);
    await space.save();

    res.status(201).json({
      success: true,
      message: 'Date/time blocked successfully',
      data: { blockedSlot: newBlockedSlot }
    });

  } catch (error) {
    console.error('Block date/time error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block date/time'
    });
  }
};

// Get all blocked slots for a space
const getBlockedSlots = async (req, res) => {
  try {
    const { id: spaceId } = req.params;
    const { month, year } = req.query;

    // Find space and verify venue ownership
    const space = await EventSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    const venue = await Venue.findOne({ _id: space.venueId, _id: req.venue.id });
    if (!venue) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Not authorized to view this space'
      });
    }

    let blockedSlots = space.blockedSlots || [];

    // Filter by month/year if provided
    if (month && year) {
      const targetMonth = parseInt(month);
      const targetYear = parseInt(year);
      
      blockedSlots = blockedSlots.filter(block => {
        const blockDate = new Date(block.date);
        return blockDate.getMonth() + 1 === targetMonth && blockDate.getFullYear() === targetYear;
      });
    }

    // Sort by date
    blockedSlots.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
      success: true,
      data: { blockedSlots }
    });

  } catch (error) {
    console.error('Get blocked slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get blocked slots'
    });
  }
};

// Update a blocked slot
const updateBlockedSlot = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id: spaceId, blockId } = req.params;
    const { isFullDayBlocked, timeSlots, reason, notes } = req.body;

    // Find space and verify venue ownership
    const space = await EventSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    const venue = await Venue.findOne({ _id: space.venueId, _id: req.venue.id });
    if (!venue) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Not authorized to update this space'
      });
    }

    // Find the blocked slot
    const blockedSlot = space.blockedSlots.id(blockId);
    if (!blockedSlot) {
      return res.status(404).json({
        success: false,
        message: 'Blocked slot not found'
      });
    }

    const nextIsFullDay = typeof isFullDayBlocked === 'boolean' ? isFullDayBlocked : blockedSlot.isFullDayBlocked;
    const nextTimeSlots = Array.isArray(timeSlots) ? timeSlots : blockedSlot.timeSlots;

    const conflictBooking = findBookingConflict(
      space.bookings,
      blockedSlot.date,
      nextIsFullDay,
      nextTimeSlots
    );

    if (conflictBooking) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update block because there is already a booking for the selected time range.',
        data: {
          bookingDate: conflictBooking.bookingDate,
          startTime: conflictBooking.startTime,
          endTime: conflictBooking.endTime,
          bookingId: conflictBooking._id
        }
      });
    }

    // Update the blocked slot
    if (isFullDayBlocked !== undefined) blockedSlot.isFullDayBlocked = isFullDayBlocked;
    if (timeSlots !== undefined) blockedSlot.timeSlots = timeSlots;
    if (reason !== undefined) blockedSlot.reason = reason;
    if (notes !== undefined) blockedSlot.notes = notes;

    await space.save();

    res.status(200).json({
      success: true,
      message: 'Blocked slot updated successfully',
      data: { blockedSlot }
    });

  } catch (error) {
    console.error('Update blocked slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blocked slot'
    });
  }
};

// Delete a blocked slot
const deleteBlockedSlot = async (req, res) => {
  try {
    const { id: spaceId, blockId } = req.params;

    // Find space and verify venue ownership
    const space = await EventSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    const venue = await Venue.findOne({ _id: space.venueId, _id: req.venue.id });
    if (!venue) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Not authorized to update this space'
      });
    }

    // Find and remove the blocked slot
    const blockedSlot = space.blockedSlots.id(blockId);
    if (!blockedSlot) {
      return res.status(404).json({
        success: false,
        message: 'Blocked slot not found'
      });
    }

    space.blockedSlots.pull(blockId);
    await space.save();

    res.status(200).json({
      success: true,
      message: 'Blocked slot removed successfully'
    });

  } catch (error) {
    console.error('Delete blocked slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blocked slot'
    });
  }
};

// Get all spaces with their blocked slots for the venue
const getVenueSpacesWithBlockedSlots = async (req, res) => {
  try {
    const venueId = req.venue.id;
    const { month, year } = req.query;

    // Verify venue exists and is authenticated
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    // Get all spaces for the venue
    const spaces = await EventSpace.find({ venueId })
      .select('name _id blockedSlots')
      .sort({ createdAt: -1 });

    // Filter blocked slots by month/year if provided
    if (month && year) {
      const targetMonth = parseInt(month);
      const targetYear = parseInt(year);
      
      spaces.forEach(space => {
        if (space.blockedSlots) {
          space.blockedSlots = space.blockedSlots.filter(block => {
            const blockDate = new Date(block.date);
            return blockDate.getMonth() + 1 === targetMonth && blockDate.getFullYear() === targetYear;
          });
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { spaces }
    });

  } catch (error) {
    console.error('Get venue spaces with blocked slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get venue spaces with blocked slots'
    });
  }
};

// Public listing of bookable spaces (optionally filtered by venue type)
const getPublicSpacesListing = async (req, res) => {
  try {
    const { venueType, city, search, page = 1, limit = 20 } = req.query;
    const query = {
      'authorizations.publicListingAuthorized': { $ne: false },
    };

    if (venueType) {
      query['venueClassification.venueTypes'] = venueType;
    }

    if (city) {
      query['address.city'] = { $regex: city, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tagline: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [spaces, total] = await Promise.all([
      EventSpace.find(query)
        .populate('venueId', 'name businessName status isVerified images coverImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      EventSpace.countDocuments(query),
    ]);

    const approvedSpaces = spaces.filter((space) => {
      const venue = space.venueId;
      return venue && (venue.status === 'approved' || venue.status === 'active');
    });

    res.status(200).json({
      success: true,
      data: {
        spaces: approvedSpaces,
        pagination: {
          current: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (error) {
    console.error('Get public spaces listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch spaces listing',
    });
  }
};

module.exports = {
  getVenueSpaces,
  getSpaceById,
  createSpace,
  updateSpace,
  deleteSpace,
  getSpaceStats,
  getVenueBookings,
  getPublicVenueSpaces,
  getPublicSpaceById,
  getPublicSpacesListing,
  blockDateTime,
  getBlockedSlots,
  updateBlockedSlot,
  deleteBlockedSlot,
  getVenueSpacesWithBlockedSlots
};
