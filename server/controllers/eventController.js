const Event = require('../models/Event');
const ApiResponse = require('../utils/apiResponse');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Create a new event (Admin only)
 * @route   POST /api/admin/events
 * @access  Private (Admin only)
 */
const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      banner,
      gallery = [],
      category,
      startDate,
      endDate,
      location,
      ticketTypes = [],
      termsAndConditions = '',
      faqs = [],
      status = 'active',
      isFeatured = false,
      organizerInfo = {}
    } = req.body;

    // Create event slug from title
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${uuidv4().substring(0, 6)}`;

    // Prepare location data with proper GeoJSON format
    const locationData = {
      ...location,
      coordinates: {
        type: 'Point',
        coordinates: [
          parseFloat(location?.coordinates?.longitude) || 0,
          parseFloat(location?.coordinates?.latitude) || 0
        ]
      }
    };

    // Create event
    const event = new Event({
      title,
      slug,
      description,
      banner,
      gallery,
      category,
      startDate,
      endDate,
      organizer: req.user.id,
      location: locationData,
      ticketTypes: ticketTypes.map(ticket => ({
        ...ticket,
        sold: 0,
        benefits: ticket.benefits || []
      })),
      termsAndConditions,
      faqs,
      status,
      isFeatured,
      createdBy: req.user.id,
      organizerInfo: {
        ...organizerInfo,
        id: req.user.id,
        name: req.user.name
      },
      approvalStatus: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date()
    });

    await event.save();

    return ApiResponse.success(res, 'Event created successfully', { event }, 201);
  } catch (error) {
    console.error('Error creating event:', error);
    return ApiResponse.serverError(res, 'Error creating event', error);
  }
};

/**
 * @desc    Get events with optional status filter (Admin only)
 * @route   GET /api/admin/events
 * @access  Private (Admin only)
 */
const getEvents = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    
    // If no status is provided, only return approved events by default
    if (!status) {
      query.status = 'approved';
    }
    
    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    return ApiResponse.success(res, 'Events fetched successfully', { events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return ApiResponse.serverError(res, 'Error fetching events', error);
  }
};

/**
 * @desc    Approve an event (Admin only)
 * @route   PUT /api/admin/events/:id/approve
 * @access  Private (Admin only)
 */
const approveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    // Update event status and approval info
    event.status = 'approved';
    event.approvedBy = req.user.id;
    event.approvedAt = new Date();
    
    await event.save();
    
    return ApiResponse.success(res, 'Event approved successfully', { event });
  } catch (error) {
    console.error('Error approving event:', error);
    return ApiResponse.serverError(res, 'Error approving event', error);
  }
};

/**
 * @desc    Reject an event (Admin only)
 * @route   PUT /api/admin/events/:id/reject
 * @access  Private (Admin only)
 */
const rejectEvent = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return ApiResponse.badRequest(res, 'Rejection reason is required');
    }

    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    // Update event status and rejection info
    event.status = 'rejected';
    event.rejectionReason = reason;
    event.rejectedBy = req.user.id;
    event.rejectedAt = new Date();
    
    await event.save();
    
    return ApiResponse.success(res, 'Event rejected successfully', { event });
  } catch (error) {
    console.error('Error rejecting event:', error);
    return ApiResponse.serverError(res, 'Error rejecting event', error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  approveEvent,
  rejectEvent
};
