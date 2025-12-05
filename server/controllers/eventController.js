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
      isFreeEvent = false,
      organizerInfo = {},
      convenience = {},
      socialLinks = {}
    } = req.body;

    // Create event slug from title
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${uuidv4().substring(0, 6)}`;

    // Prepare location data with proper GeoJSON format
    // Handle coordinates - support both old format (latitude/longitude) and new format (GeoJSON)
    let coordinates = { type: 'Point', coordinates: [0, 0] };

    if (location?.coordinates) {
      if (location.coordinates.coordinates && Array.isArray(location.coordinates.coordinates)) {
        // New GeoJSON format
        coordinates = {
          type: 'Point',
          coordinates: [
            parseFloat(location.coordinates.coordinates[0]) || 0,
            parseFloat(location.coordinates.coordinates[1]) || 0
          ]
        };
      } else if (location.coordinates.latitude && location.coordinates.longitude) {
        // Old format with latitude/longitude
        coordinates = {
          type: 'Point',
          coordinates: [
            parseFloat(location.coordinates.longitude) || 0,
            parseFloat(location.coordinates.latitude) || 0
          ]
        };
      }
    }

    // Ensure coordinates are properly structured
    if (!coordinates.coordinates || !Array.isArray(coordinates.coordinates)) {
      coordinates = {
        type: 'Point',
        coordinates: [0, 0] // Default coordinates
      };
    }

    const locationData = {
      ...location,
      coordinates
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
      ticketTypes: isFreeEvent ? [] : ticketTypes.map(ticket => ({
        ...ticket,
        sold: 0,
        benefits: ticket.benefits || []
      })),
      termsAndConditions,
      faqs,
      status,
      isFeatured,
      isFreeEvent,
      createdBy: req.user.id,
      organizerInfo: {
        ...organizerInfo,
        id: req.user.id,
        name: req.user.name
      },
      convenience: convenience || {
        percentage: 0,
        fixedAmount: 0
      },
      approvalStatus: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      socialLinks: socialLinks || {}
    });

    await event.save();

    return ApiResponse.success(res, 'Event created successfully', { event }, 201);
  } catch (error) {
    console.error('Error creating event:', error);
    return ApiResponse.serverError(res, 'Error creating event', error);
  }
};

/**
 * @desc    Pause organizer's own event
 * @route   PUT /api/organizer/events/:id/pause
 * @access  Private (Organizer only)
 */
const pauseOrganizerEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }
    if (event.status === 'completed') {
      return ApiResponse.error(res, 'Cannot modify completed events', {}, 400);
    }
    event.status = 'paused';
    await event.save();
    return ApiResponse.success(res, 'Event paused successfully', { event });
  } catch (error) {
    console.error('Error pausing organizer event:', error);
    return ApiResponse.serverError(res, 'Error pausing event', error);
  }
};

/**
 * @desc    Resume organizer's own event (back to approved)
 * @route   PUT /api/organizer/events/:id/resume
 * @access  Private (Organizer only)
 */
const resumeOrganizerEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }
    if (event.status === 'completed') {
      return ApiResponse.error(res, 'Cannot modify completed events', {}, 400);
    }
    event.status = 'approved';
    await event.save();
    return ApiResponse.success(res, 'Event resumed successfully', { event });
  } catch (error) {
    console.error('Error resuming organizer event:', error);
    return ApiResponse.serverError(res, 'Error resuming event', error);
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
    const { category, city, search, limit = 20, page = 1, isFeatured } = req.query;

    // Build query for approved events only (paused events won't appear)
    const query = {
      status: 'approved'
      // Optionally, only show upcoming events:
      // startDate: { $gte: new Date() }
    };

    // Add filters if provided
    if (category) {
      query.category = category;
    }

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    // Filter by featured status if provided
    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === 'true' || isFeatured === true;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } }
      ];
    }

    // Parse limit and page
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);

    // Get total count
    const total = await Event.countDocuments(query);

    // If limit is very high (e.g., 10000), return all events without pagination
    let events;
    if (parsedLimit >= 10000) {
      events = await Event.find(query)
        .sort({ startDate: 1 }) // Sort by start date (ascending)
        .lean();
    } else {
      // Calculate pagination
      const skip = (parsedPage - 1) * parsedLimit;
      
      // Get events with pagination
      events = await Event.find(query)
        .sort({ startDate: 1 }) // Sort by start date (ascending)
        .skip(skip)
        .limit(parsedLimit)
        .lean();
    }

    return ApiResponse.success(res, 'Events fetched successfully', {
      events,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit >= 10000 ? total : parsedLimit,
        pages: parsedLimit >= 10000 ? 1 : Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching public events:', error);
    return ApiResponse.serverError(res, 'Error fetching events', error);
  }
};

/**
 * @desc    Pause an event (Admin only)
 * @route   PUT /api/admin/events/:id/pause
 * @access  Private (Admin only)
 */
const pauseEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }
    event.status = 'paused';
    await event.save();
    return ApiResponse.success(res, 'Event paused successfully', { event });
  } catch (error) {
    console.error('Error pausing event:', error);
    return ApiResponse.serverError(res, 'Error pausing event', error);
  }
};

/**
 * @desc    Resume an event (Admin only) -> sets back to approved
 * @route   PUT /api/admin/events/:id/resume
 * @access  Private (Admin only)
 */
const resumeEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }
    event.status = 'approved';
    await event.save();
    return ApiResponse.success(res, 'Event resumed successfully', { event });
  } catch (error) {
    console.error('Error resuming event:', error);
    return ApiResponse.serverError(res, 'Error resuming event', error);
  }
};

/**
 * @desc    Debug endpoint to check event status (temporary)
 * @route   GET /api/events/debug/:id
 * @access  Public
 */
const debugEventById = async (req, res) => {
  console.log(`Debug: Fetching event with ID: ${req.params.id}`);
  
  try {
    let event = null;
    
    // Try to find by ObjectId if valid
    if (req.params.id && require('mongoose').Types.ObjectId.isValid(req.params.id)) {
      event = await Event.findById(req.params.id).lean();
    }
    
    // If not found, try by slug
    if (!event) {
      event = await Event.findOne({ slug: req.params.id }).lean();
    }
    
    // If still not found, try by any matching field
    if (!event) {
      event = await Event.findOne({
        $or: [
          { _id: req.params.id },
          { slug: req.params.id },
          { title: { $regex: req.params.id, $options: 'i' } }
        ]
      }).lean();
    }
    
    if (!event) {
      // Let's see what events exist
      const allEvents = await Event.find({}).select('_id title status slug').limit(10).lean();
      return ApiResponse.notFound(res, 'Event not found in database', {
        searchedFor: req.params.id,
        availableEvents: allEvents
      });
    }
    
    return ApiResponse.success(res, 'Event found', {
      _id: event._id,
      title: event.title,
      status: event.status,
      approvalStatus: event.approvalStatus,
      organizer: event.organizer,
      slug: event.slug
    });
  } catch (error) {
    console.error('Debug error:', error);
    return ApiResponse.serverError(res, 'Debug error', error);
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
    return ApiResponse.success(res, 'Active events fetched successfully', events);
  } catch (error) {
    console.error('Error fetching active events:', error);
    return ApiResponse.serverError(res, 'Server error');
  }
};

const getPublicEventById = async (req, res) => {
  console.log(`Fetching event with ID: ${req.params.id}`);
  
  try {
    let event = null;
    
    // First, try to find by ObjectId if it's valid
    if (req.params.id && require('mongoose').Types.ObjectId.isValid(req.params.id)) {
      console.log(`Searching for event with ObjectId: ${req.params.id} in database...`);
      event = await Event.findOne({
        _id: req.params.id
      })
        .populate('organizer', 'name email avatar')
        .select('-__v -createdAt -updatedAt');
    }
    
    // If not found by ObjectId, try to find by slug
    if (!event && req.params.id) {
      console.log(`Event not found by ObjectId, trying to find by slug: ${req.params.id}`);
      event = await Event.findOne({
        slug: req.params.id
      })
        .populate('organizer', 'name email avatar')
        .select('-__v -createdAt -updatedAt');
    }
    
    // If still not found, try to find by any field that might match
    if (!event && req.params.id) {
      console.log(`Event not found by slug, trying to find by any matching field: ${req.params.id}`);
      event = await Event.findOne({
        $or: [
          { _id: req.params.id },
          { slug: req.params.id },
          { title: { $regex: req.params.id, $options: 'i' } }
        ]
      })
        .populate('organizer', 'name email avatar')
        .select('-__v -createdAt -updatedAt');
    }

    if (!event) {
      console.log(`Event with ID ${req.params.id} not found`);
      return ApiResponse.notFound(res, 'Event not found');
    }

    // Check if the event is approved
    if (event.status !== 'approved') {
      console.log(`Event with ID ${req.params.id} has status: ${event.status}`);
      
      // Provide more specific error messages based on status
      let errorMessage = 'Event is not available';
      if (event.status === 'pending') {
        errorMessage = 'This event is pending approval and not yet available for public viewing';
      } else if (event.status === 'rejected') {
        errorMessage = 'This event has been rejected and is not available for public viewing';
      } else if (event.status === 'draft') {
        errorMessage = 'This event is still in draft mode and not available for public viewing';
      } else if (event.status === 'cancelled') {
        errorMessage = 'This event has been cancelled';
      } else if (event.status === 'completed') {
        errorMessage = 'This event has already been completed';
      }
      
      return ApiResponse.forbidden(res, errorMessage);
    }

    console.log('Event retrieved successfully:', event._id);
    return res.status(200).json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return ApiResponse.serverError(res, 'Server error while fetching event', error);
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
        coordinates: req.body.location.coordinates ? (() => {
          // Handle coordinates - support both old format (latitude/longitude) and new format (GeoJSON)
          if (req.body.location.coordinates.coordinates && Array.isArray(req.body.location.coordinates.coordinates)) {
            // New GeoJSON format
            return {
              type: 'Point',
              coordinates: [
                parseFloat(req.body.location.coordinates.coordinates[0]) || event.location.coordinates.coordinates[0],
                parseFloat(req.body.location.coordinates.coordinates[1]) || event.location.coordinates.coordinates[1]
              ]
            };
          } else if (req.body.location.coordinates.latitude && req.body.location.coordinates.longitude) {
            // Old format with latitude/longitude
            return {
              type: 'Point',
              coordinates: [
                parseFloat(req.body.location.coordinates.longitude) || event.location.coordinates.coordinates[0],
                parseFloat(req.body.location.coordinates.latitude) || event.location.coordinates.coordinates[1]
              ]
            };
          } else {
            return event.location.coordinates;
          }
        })() : event.location.coordinates
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

    // Fix coordinates if they are incomplete in the update data
    if (fieldsToUpdate.location && fieldsToUpdate.location.coordinates) {
      if (!fieldsToUpdate.location.coordinates.coordinates || !Array.isArray(fieldsToUpdate.location.coordinates.coordinates)) {
        fieldsToUpdate.location.coordinates = {
          type: 'Point',
          coordinates: [0, 0] // Default coordinates
        };
      }
    }

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
      convenience = {},
      isFreeEvent = false,
      socialLinks = {}
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
      ticketTypes: isFreeEvent ? [] : ticketTypes.map(ticket => ({
        ...ticket,
        sold: 0,
        benefits: ticket.benefits || []
      })),
      termsAndConditions,
      faqs,
      status: 'pending', // Organizer events start as pending
      isFeatured: false,
      isFreeEvent,
      createdBy: req.user.id,
      organizerInfo: {
        id: req.user.id,
        name: req.user.name
      },
      approvalStatus: 'pending',
      convenience: isFreeEvent ? { percentage: 0, fixedAmount: 0 } : (convenience || {}),
      socialLinks: socialLinks || {}
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

    // Calculate real-time ticket sales and revenue for each event
    const eventsWithStats = await Promise.all(events.map(async (event) => {
      try {
        // Get booking statistics for this event
        const bookingStats = await Booking.aggregate([
          {
            $match: {
              event: event._id,
              paymentStatus: 'completed'
            }
          },
          {
            $group: {
              _id: null,
              totalTicketsSold: { $sum: '$quantity' },
              totalRevenue: { $sum: '$total' }
            }
          }
        ]);

        const ticketsSold = bookingStats.length > 0 ? bookingStats[0].totalTicketsSold : 0;
        const revenue = bookingStats.length > 0 ? bookingStats[0].totalRevenue : 0;

        // Calculate total tickets available
        const totalTickets = event.ticketTypes ? 
          event.ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0) : 0;

        console.log(`Event ${event._id} stats:`, {
          eventTitle: event.title,
          bookingStats: bookingStats.length,
          ticketsSold,
          revenue,
          totalTickets
        });

        return {
          ...event,
          ticketsSold,
          totalTickets,
          totalRevenue: revenue
        };
      } catch (error) {
        console.error(`Error calculating stats for event ${event._id}:`, error);
        return {
          ...event,
          ticketsSold: 0,
          totalTickets: event.ticketTypes ? 
            event.ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0) : 0,
          totalRevenue: 0
        };
      }
    }));

    return ApiResponse.success(res, 'Organizer events fetched', {
      events: eventsWithStats,
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

    // Calculate real-time ticket sales and revenue for this event
    try {
      const bookingStats = await Booking.aggregate([
        {
          $match: {
            event: event._id,
            paymentStatus: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalTicketsSold: { $sum: '$quantity' },
            totalRevenue: { $sum: '$total' }
          }
        }
      ]);

      const ticketsSold = bookingStats.length > 0 ? bookingStats[0].totalTicketsSold : 0;
      const revenue = bookingStats.length > 0 ? bookingStats[0].totalRevenue : 0;

      // Calculate total tickets available
      const totalTickets = event.ticketTypes ? 
        event.ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0) : 0;

      console.log(`Single event ${event._id} stats:`, {
        eventTitle: event.title,
        bookingStats: bookingStats.length,
        ticketsSold,
        revenue,
        totalTickets
      });

      const eventWithStats = {
        ...event,
        ticketsSold,
        totalTickets,
        totalRevenue: revenue
      };

      return ApiResponse.success(res, 'Event fetched successfully', { event: eventWithStats });
    } catch (statsError) {
      console.error(`Error calculating stats for event ${event._id}:`, statsError);
      // Return event with default stats if calculation fails
      const eventWithStats = {
        ...event,
        ticketsSold: 0,
        totalTickets: event.ticketTypes ? 
          event.ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0) : 0,
        totalRevenue: 0
      };
      return ApiResponse.success(res, 'Event fetched successfully', { event: eventWithStats });
    }
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

    // Allow updates for all events except completed ones
    if (event.status === 'completed') {
      return ApiResponse.error(res, 'Cannot update completed events', {}, 400);
    }

    const updateData = req.body;
    
    // If significant changes are made to approved events, reset approval status
    if (event.status === 'approved' || event.status === 'active') {
      if (updateData.title || updateData.description || updateData.category || updateData.location || updateData.startDate || updateData.endDate) {
        updateData.status = 'pending';
        updateData.approvalStatus = 'pending';
      }
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

    // Allow deletion for all events except completed ones
    if (event.status === 'completed') {
      return ApiResponse.error(res, 'Cannot delete completed events', {}, 400);
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
  debugEventById,
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
  deleteOrganizerEvent,
  pauseEvent,
  resumeEvent,
  pauseOrganizerEvent,
  resumeOrganizerEvent
};
