const { check, validationResult } = require('express-validator');
const Event = require('../models/Event');
const ApiResponse = require('../utils/apiResponse');
const { v4: uuidv4 } = require('uuid');
const Booking = require('../models/Booking');

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
      return ApiResponse.error(res, 'Rejection reason is required', {}, 400);
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

/**
 * @desc    Get all approved events (Public)
 * @route   GET /api/events
 * @access  Public
 */
const getPublicEvents = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { category, city, search, limit = 20, page = 1 } = req.query;

    // Build query for approved events only
    const query = {
      // status: 'approved',
      // startDate: { $gte: new Date() } // Only show upcoming events
    };

    // Add filters if provided
    if (category) {
      query.category = category;
    }

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get events with pagination
    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ startDate: 1 }) // Sort by start date (ascending)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Event.countDocuments(query)
    ]);
    // console.log(events);
    return ApiResponse.success(res, 'Events fetched successfully', {
      events,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching public events:', error);
    return ApiResponse.serverError(res, 'Error fetching events', error);
  }
};

/**
 * @desc    Get a single event by ID (Public)
 * @route   GET /api/events/:id
 * @access  Public
 */
const getActiveEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: 'active' }).select('id title');
    res.status(200).json(new ApiResponse(true, 'Active events fetched successfully', events));
  } catch (error) {
    console.error('Error fetching active events:', error);
    res.status(500).json(new ApiResponse(false, 'Server error'));
  }
};

const getPublicEventById = async (req, res) => {
  console.log(`Fetching event with ID: ${req.params.id}`);
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      status: 'approved' // Only return approved events
    })
      .populate('organizer', 'name email avatar')
      .select('-__v -createdAt -updatedAt');

    if (!event) {
      return res.status(404).json(
        new ApiResponse(false, 'Event not found or not approved', null, 404)
      );
    }
    // console.log('Event retrieved successfully:', event);

    // Increment view count
    //event.views = (event.views || 0) + 1;
    await event.save();
    return res.status(200).json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return res.status(500).json(
      new ApiResponse(false, 'Server error while fetching event', null, 500, error.message)
    );
  }
};

/**
 * @desc    Update an event (Admin only)
 * @route   PUT /api/admin/events/:id
 * @access  Private (Admin only)
 */
const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    // Run validation checks
    const validations = [
      check('title', 'Title is required').optional().not().isEmpty().trim(),
      check('description', 'Description is required').optional().not().isEmpty(),
      check('banner', 'Banner image URL is required').optional().not().isEmpty(),
      check('category', 'Category is required').optional().not().isEmpty(),
      check('startDate', 'Start date must be a valid ISO 8601 date').optional().isISO8601().toDate(),
      check('endDate', 'End date must be a valid ISO 8601 date').optional().isISO8601().toDate(),
      check('endDate').optional().custom((value, { req }) => {
        const startDate = req.body.startDate ? new Date(req.body.startDate) : event.startDate;
        if (new Date(value) <= startDate) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
      check('location.address', 'Address is required').optional().not().isEmpty(),
      check('location.city', 'City is required').optional().not().isEmpty(),
      check('location.state', 'State is required').optional().not().isEmpty(),
      check('location.country', 'Country is required').optional().not().isEmpty(),
      check('location.pincode', 'Pincode is required').optional().not().isEmpty(),
      check('ticketTypes', 'Ticket types must be an array').optional().isArray(),
      check('ticketTypes.*.name', 'Ticket type name is required').optional().not().isEmpty(),
      check('ticketTypes.*.price', 'Ticket price must be a number').optional().isNumeric(),
      check('ticketTypes.*.quantity', 'Ticket quantity must be an integer').optional().isInt({ min: 0 }),
    ];

    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Update event fields
    const {
      title,
      description,
      banner,
      gallery,
      category,
      startDate,
      endDate,
      location,
      ticketTypes,
      convenience,
      termsAndConditions,
      faqs,
      status,
      isFeatured,
      organizerInfo
    } = req.body;

    // Merge existing event data with new data
    const fieldsToUpdate = { ...event.toObject(), ...req.body };

    // Handle nested objects separately to ensure proper merging
    if (req.body.location) {
      fieldsToUpdate.location = {
        ...event.location,
        ...req.body.location,
        coordinates: req.body.location.coordinates ? {
          type: 'Point',
          coordinates: [
            parseFloat(req.body.location.coordinates.longitude) || event.location.coordinates.coordinates[0],
            parseFloat(req.body.location.coordinates.latitude) || event.location.coordinates.coordinates[1]
          ]
        } : event.location.coordinates
      };
    }

    if (req.body.convenience) {
      fieldsToUpdate.convenience = {
        ...event.convenience,
        ...req.body.convenience
      };
    }

    if (req.body.ticketTypes) {
      fieldsToUpdate.ticketTypes = req.body.ticketTypes;
    }

    fieldsToUpdate.updatedAt = new Date();
    fieldsToUpdate.updatedBy = req.user.id;

    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: fieldsToUpdate },
      { new: true, runValidators: true }
    );

    return ApiResponse.success(res, 'Event updated successfully', { event: updatedEvent });
  } catch (error) {
    console.error('Error updating event:', error);
    return ApiResponse.serverError(res, 'Error updating event', error);
  }
};

const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    // Before deleting, snapshot event details into all related bookings that lack a snapshot
    await Booking.updateMany(
      { event: event._id, $or: [ { eventSnapshot: { $exists: false } }, { eventSnapshot: null } ] },
      {
        $set: {
          eventSnapshot: {
            _id: event._id,
            title: event.title,
            banner: event.banner,
            startDate: event.startDate,
            endDate: event.endDate,
            location: {
              address: event.location?.address,
              city: event.location?.city,
            }
          }
        }
      }
    );

    await Event.findByIdAndDelete(eventId);

    return ApiResponse.success(res, 'Event deleted successfully');
  } catch (error) {
    console.error('Error deleting event:', error);
    return ApiResponse.serverError(res, 'Error deleting event', error);
  }
};

/**
 * @desc    Register a FC25 squad
 * @route   POST /api/events/FC25/register
 * @access  Public
 */
const registerFC25 = async (req, res) => {
  try {
    const {
      fullName,
      gender,
      phone,
      choice_of_controller,
      photo,
    } = req.body;

    // Validate required fields
    if (!fullName || !gender || !phone || !choice_of_controller || !photo) {
      return ApiResponse.error(res, 'Missing required fields', {}, 400);
    }

    // Validate phone number format (10 digits)
    if (!/^[0-9]{10}$/.test(phone)) {
      return ApiResponse.error(res, 'Phone number must be 10 digits', {}, 400);
    }

    // Enforce max 32 registrations
    const FC25Player = require('../models/FC25Player');
    const currentCount = await FC25Player.countDocuments();
    if (currentCount >= 32) {
      return ApiResponse.error(res, 'Registration closed. All 32 slots are filled.', {}, 400);
    }

    // Create new FC25 registration
    const fc25Registration = new FC25Player({
      fullName,
      gender,
      phone,
      choice_of_controller,
      photo,
    });

    // Save registration to database
    await fc25Registration.save();

    return ApiResponse.success(res, 'FC25 player registered successfully', { registration: fc25Registration }, 201);
  } catch (error) {
    console.error('Error registering FC25 player:', error);

    // Handle duplicate phone error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.phone) {
      return ApiResponse.error(res, 'This phone number is already registered.', {}, 400);
    }

    // Handle validation errors from Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return ApiResponse.error(res, messages.join(', '), {}, 400);
    }

    return ApiResponse.serverError(res, 'Error registering FC25 player', error);
  }
};

// Get FC25 registration slots/status
// @route GET /api/events/FC25/slots
// @access Public
const getFC25Slots = async (req, res) => {
  try {
    const FC25Player = require('../models/FC25Player');
    const count = await FC25Player.countDocuments();
    const capacity = 32;
    const remaining = Math.max(0, capacity - count);
    const isOpen = count < capacity;
    return ApiResponse.success(res, 'FC25 slots status', { count, remaining, capacity, isOpen });
  } catch (error) {
    console.error('Error fetching FC25 slots:', error);
    return ApiResponse.serverError(res, 'Error fetching FC25 slots', error);
  }
};

/**
 * @desc    Admin: list FC25 registered players
 * @route   GET /api/admin/fc25/players
 * @access  Admin
 */
const getFC25PlayersAdmin = async (req, res) => {
  try {
    const FC25Player = require('../models/FC25Player');
    const {
      page = 1,
      limit = 10,
      search = '',
      sort = '-createdAt',
    } = req.query;

    const numericLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const query = {};
    if (search) {
      const s = String(search).trim();
      query.$or = [
        { fullName: { $regex: s, $options: 'i' } },
        { phone: { $regex: s } },
        { choice_of_controller: { $regex: s, $options: 'i' } },
      ];
    }

    const total = await FC25Player.countDocuments(query);
    const players = await FC25Player.find(query)
      .sort(sort)
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .lean();

    return ApiResponse.success(res, 'FC25 players fetched', {
      items: players,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit),
      },
    });
  } catch (error) {
    console.error('Error fetching FC25 players:', error);
    return ApiResponse.serverError(res, 'Error fetching FC25 players', error);
  }
};

/**
 * @desc    Create a new event (Organizer only)
 * @route   POST /api/organizer/events
 * @access  Private (Organizer only)
 */
const createOrganizerEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation error', { errors: errors.array() }, 400);
    }

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
      convenience = {}
    } = req.body;

    // Create event slug from title
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${uuidv4().substring(0, 6)}`;

    // Prepare location data with proper GeoJSON format
    const locationData = {
      ...location,
      coordinates: {
        type: 'Point',
        coordinates: [
          parseFloat(location?.coordinates?.[0]) || 0,
          parseFloat(location?.coordinates?.[1]) || 0
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
      status: 'pending', // Organizer events start as pending
      isFeatured: false,
      createdBy: req.user.id,
      organizerInfo: {
        id: req.user.id,
        name: req.user.name
      },
      approvalStatus: 'pending',
      convenience: convenience || {}
    });

    await event.save();

    return ApiResponse.success(res, 'Event created successfully and pending approval', { event }, 201);
  } catch (error) {
    console.error('Error creating organizer event:', error);
    return ApiResponse.serverError(res, 'Error creating event', error);
  }
};

/**
 * @desc    Get organizer's events
 * @route   GET /api/organizer/events
 * @access  Private (Organizer only)
 */
const getOrganizerEvents = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { organizer: req.user.id };
    if (status) {
      query.status = status;
    }

    const numericLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .lean();

    return ApiResponse.success(res, 'Organizer events fetched', {
      events,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit),
      },
    });
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    return ApiResponse.serverError(res, 'Error fetching events', error);
  }
};

/**
 * @desc    Get organizer's specific event
 * @route   GET /api/organizer/events/:id
 * @access  Private (Organizer only)
 */
const getOrganizerEventById = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      organizer: req.user.id
    }).lean();

    if (!event) {
      return ApiResponse.error(res, 'Event not found', {}, 404);
    }

    return ApiResponse.success(res, 'Event fetched successfully', { event });
  } catch (error) {
    console.error('Error fetching organizer event:', error);
    return ApiResponse.serverError(res, 'Error fetching event', error);
  }
};

/**
 * @desc    Update organizer's event
 * @route   PUT /api/organizer/events/:id
 * @access  Private (Organizer only)
 */
const updateOrganizerEvent = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      organizer: req.user.id
    });

    if (!event) {
      return ApiResponse.error(res, 'Event not found', {}, 404);
    }

    // Only allow updates if event is pending or rejected
    if (event.status === 'active' || event.status === 'completed') {
      return ApiResponse.error(res, 'Cannot update active or completed events', {}, 400);
    }

    const updateData = req.body;
    
    // If significant changes are made, reset approval status
    if (updateData.title || updateData.description || updateData.category || updateData.location) {
      updateData.status = 'pending';
      updateData.approvalStatus = 'pending';
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    return ApiResponse.success(res, 'Event updated successfully', { event: updatedEvent });
  } catch (error) {
    console.error('Error updating organizer event:', error);
    return ApiResponse.serverError(res, 'Error updating event', error);
  }
};

/**
 * @desc    Delete organizer's event
 * @route   DELETE /api/organizer/events/:id
 * @access  Private (Organizer only)
 */
const deleteOrganizerEvent = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      organizer: req.user.id
    });

    if (!event) {
      return ApiResponse.error(res, 'Event not found', {}, 404);
    }

    // Only allow deletion if event is pending or rejected
    if (event.status === 'active' || event.status === 'completed') {
      return ApiResponse.error(res, 'Cannot delete active or completed events', {}, 400);
    }

    await Event.findByIdAndDelete(req.params.id);

    return ApiResponse.success(res, 'Event deleted successfully');
  } catch (error) {
    console.error('Error deleting organizer event:', error);
    return ApiResponse.serverError(res, 'Error deleting event', error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getPublicEvents,
  getPublicEventById,
  getActiveEvents,
  approveEvent,
  rejectEvent,
  updateEvent,
  deleteEvent,
  registerFC25,
  getFC25Slots,
  getFC25PlayersAdmin,
  createOrganizerEvent,
  getOrganizerEvents,
  getOrganizerEventById,
  updateOrganizerEvent,
  deleteOrganizerEvent
};
