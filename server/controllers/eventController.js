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

module.exports = {
  createEvent
};
