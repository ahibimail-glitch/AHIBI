const { check, validationResult } = require('express-validator');
const DailyEvent = require('../models/DailyEvent');
const ApiResponse = require('../utils/apiResponse');
const { v4: uuidv4 } = require('uuid');
const Booking = require('../models/Booking');
const AdminNotification = require('../models/AdminNotification');
const adminNotificationController = require('./adminNotificationController');
const emailService = require('../services/emailService');
const Organizer = require('../models/Organizer');
const User = require('../models/User');

/**
 * @desc    Create a new daily event (Organizer only)
 * @route   POST /api/organizer/daily-events
 * @access  Private (Organizer only)
 */
const createOrganizerDailyEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation error', { errors: errors.array() }, 400);
    }

    const {
      title,
      description,
      banner,
      coverImage = '',
      gallery = [],
      category,
      duration,
      startTime,
      periodStartDate,
      periodEndDate,
      activeDates = [],
      excludedDates = [],
      location,
      ticketTypes = [],
      termsAndConditions = '',
      faqs = [],
      convenience = {},
      isFreeEvent = false,
      socialLinks = {}
    } = req.body;

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${uuidv4().substring(0, 6)}`;

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

    const dailyEvent = new DailyEvent({
      title,
      slug,
      description,
      banner,
      coverImage,
      gallery,
      category,
      duration: duration || { hours: 0, minutes: 0 },
      startTime,
      periodStartDate,
      periodEndDate,
      activeDates: activeDates.map(date => new Date(date)),
      excludedDates: excludedDates.map(date => new Date(date)),
      organizer: req.user.id,
      location: locationData,
      ticketTypes: isFreeEvent ? [] : ticketTypes.map(ticket => ({
        ...ticket,
        sold: 0,
        benefits: ticket.benefits || []
      })),
      termsAndConditions,
      faqs,
      status: 'pending',
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

    await dailyEvent.save();

    await AdminNotification.createNotification({
      type: 'daily_event_created',
      title: 'New Daily Event Created',
      message: `"${dailyEvent.title}" has been created by ${req.user.name} and is pending approval.`,
      priority: 'high',
      category: 'event',
      actionRequired: true,
      actionType: 'approve',
      entityType: 'DailyEvent',
      entityId: dailyEvent._id,
      triggeredBy: {
        userType: 'Organizer',
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      metadata: {
        eventTitle: dailyEvent.title,
        periodStartDate: dailyEvent.periodStartDate,
        periodEndDate: dailyEvent.periodEndDate,
        category: dailyEvent.category,
        activeDatesCount: dailyEvent.activeDates.length
      },
      redirectUrl: `/admin?view=event-approvals`
    }).catch(err => {
      console.error('Error creating daily event notification:', err);
    });

    return ApiResponse.success(res, 'Daily event created successfully and submitted for approval', { dailyEvent }, 201);
  } catch (error) {
    console.error('Error creating daily event:', error);
    return ApiResponse.serverError(res, 'Error creating daily event', error);
  }
};

/**
 * @desc    Create a new daily event (Admin only)
 * @route   POST /api/admin/daily-events
 * @access  Private (Admin only)
 */
const createDailyEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      banner,
      coverImage = '',
      gallery = [],
      category,
      duration,
      startTime,
      periodStartDate,
      periodEndDate,
      activeDates = [],
      excludedDates = [],
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

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${uuidv4().substring(0, 6)}`;

    let coordinates = { type: 'Point', coordinates: [0, 0] };

    if (location?.coordinates) {
      if (location.coordinates.coordinates && Array.isArray(location.coordinates.coordinates)) {
        coordinates = {
          type: 'Point',
          coordinates: [
            parseFloat(location.coordinates.coordinates[0]) || 0,
            parseFloat(location.coordinates.coordinates[1]) || 0
          ]
        };
      } else if (location.coordinates.latitude && location.coordinates.longitude) {
        coordinates = {
          type: 'Point',
          coordinates: [
            parseFloat(location.coordinates.longitude) || 0,
            parseFloat(location.coordinates.latitude) || 0
          ]
        };
      }
    }

    const locationData = {
      ...location,
      coordinates
    };

    const dailyEvent = new DailyEvent({
      title,
      slug,
      description,
      banner,
      coverImage,
      gallery,
      category,
      duration: duration || { hours: 0, minutes: 0 },
      startTime,
      periodStartDate,
      periodEndDate,
      activeDates: activeDates.map(date => new Date(date)),
      excludedDates: excludedDates.map(date => new Date(date)),
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

    await dailyEvent.save();

    return ApiResponse.success(res, 'Daily event created successfully', { dailyEvent }, 201);
  } catch (error) {
    console.error('Error creating daily event:', error);
    return ApiResponse.serverError(res, 'Error creating daily event', error);
  }
};

/**
 * @desc    Get all daily events with optional status filter (Admin only)
 * @route   GET /api/admin/daily-events
 * @access  Private (Admin only)
 */
const getDailyEvents = async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    if (!status) {
      query.status = 'approved';
    }

    const dailyEvents = await DailyEvent.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return ApiResponse.success(res, 'Daily events fetched successfully', { dailyEvents });
  } catch (error) {
    console.error('Error fetching daily events:', error);
    return ApiResponse.serverError(res, 'Error fetching daily events', error);
  }
};

/**
 * @desc    Get all approved daily events (Public)
 * @route   GET /api/daily-events
 * @access  Public
 */
const getPublicDailyEvents = async (req, res) => {
  try {
    const { category, city, search, limit = 20, page = 1, isFeatured } = req.query;

    const query = {
      status: 'approved'
    };

    if (category) {
      query.category = category;
    }

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

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

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);

    const total = await DailyEvent.countDocuments(query);

    let dailyEvents;
    if (parsedLimit >= 10000) {
      dailyEvents = await DailyEvent.find(query)
        .sort({ periodStartDate: 1 })
        .lean();
    } else {
      const skip = (parsedPage - 1) * parsedLimit;
      
      dailyEvents = await DailyEvent.find(query)
        .sort({ periodStartDate: 1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean();
    }

    return ApiResponse.success(res, 'Daily events fetched successfully', {
      dailyEvents,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit >= 10000 ? total : parsedLimit,
        pages: parsedLimit >= 10000 ? 1 : Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching public daily events:', error);
    return ApiResponse.serverError(res, 'Error fetching daily events', error);
  }
};

/**
 * @desc    Get a single daily event by ID (Public)
 * @route   GET /api/daily-events/:id
 * @access  Public
 */
const getPublicDailyEventById = async (req, res) => {
  try {
    let dailyEvent = null;
    
    if (req.params.id && require('mongoose').Types.ObjectId.isValid(req.params.id)) {
      dailyEvent = await DailyEvent.findOne({
        _id: req.params.id
      })
        .populate('organizer', 'name email avatar')
        .select('-__v -createdAt -updatedAt');
    }
    
    if (!dailyEvent && req.params.id) {
      dailyEvent = await DailyEvent.findOne({
        slug: req.params.id
      })
        .populate('organizer', 'name email avatar')
        .select('-__v -createdAt -updatedAt');
    }
    
    if (!dailyEvent && req.params.id) {
      dailyEvent = await DailyEvent.findOne({
        $or: [
          { _id: req.params.id },
          { slug: req.params.id },
          { title: { $regex: req.params.id, $options: 'i' } }
        ]
      })
        .populate('organizer', 'name email avatar')
        .select('-__v -createdAt -updatedAt');
    }

    if (!dailyEvent) {
      return ApiResponse.notFound(res, 'Daily event not found');
    }

    if (dailyEvent.status !== 'approved') {
      let errorMessage = 'Daily event is not available';
      if (dailyEvent.status === 'pending') {
        errorMessage = 'This daily event is pending approval and not yet available for public viewing';
      } else if (dailyEvent.status === 'rejected') {
        errorMessage = 'This daily event has been rejected and is not available for public viewing';
      } else if (dailyEvent.status === 'draft') {
        errorMessage = 'This daily event is still in draft mode and not available for public viewing';
      } else if (dailyEvent.status === 'cancelled') {
        errorMessage = 'This daily event has been cancelled';
      } else if (dailyEvent.status === 'completed') {
        errorMessage = 'This daily event has already been completed';
      }
      
      return ApiResponse.forbidden(res, errorMessage);
    }

    return res.status(200).json(dailyEvent);
  } catch (error) {
    console.error('Error fetching daily event:', error);
    return ApiResponse.serverError(res, 'Server error while fetching daily event', error);
  }
};

/**
 * @desc    Approve a daily event (Admin only)
 * @route   PUT /api/admin/daily-events/:id/approve
 * @access  Private (Admin only)
 */
const approveDailyEvent = async (req, res) => {
  try {
    const dailyEvent = await DailyEvent.findById(req.params.id).populate('organizer', 'name email phone');

    if (!dailyEvent) {
      return ApiResponse.notFound(res, 'Daily event not found');
    }

    dailyEvent.status = 'approved';
    dailyEvent.approvedBy = req.user.id;
    dailyEvent.approvedAt = new Date();

    await dailyEvent.save();

    adminNotificationController.markEntityNotificationsCompleted('DailyEvent', req.params.id, 'approved', req.user.id);

    const organizerIdCandidate =
      dailyEvent.organizerInfo?.id ||
      dailyEvent.createdBy ||
      dailyEvent.organizer?._id ||
      dailyEvent.organizer;

    const organizerId = organizerIdCandidate?._id || organizerIdCandidate;

    const organizerDoc = organizerId
      ? await Organizer.findById(organizerId).select('name email phone')
      : null;

    const userDoc = !organizerDoc && organizerId
      ? await User.findById(organizerId).select('name email phone')
      : null;

    const eventForEmail = typeof dailyEvent.toObject === 'function' ? dailyEvent.toObject() : dailyEvent;
    if (organizerDoc) eventForEmail.organizer = organizerDoc;
    if (!organizerDoc && userDoc) eventForEmail.organizer = userDoc;

    if (eventForEmail.organizer?.email) {
      emailService.sendEventApprovalNotification(eventForEmail, true).catch(err => {
        console.error('Error sending daily event approval email:', err);
      });
    }

    return ApiResponse.success(res, 'Daily event approved successfully', { dailyEvent });
  } catch (error) {
    console.error('Error approving daily event:', error);
    return ApiResponse.serverError(res, 'Error approving daily event', error);
  }
};

/**
 * @desc    Reject a daily event (Admin only)
 * @route   PUT /api/admin/daily-events/:id/reject
 * @access  Private (Admin only)
 */
const rejectDailyEvent = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return ApiResponse.error(res, 'Rejection reason is required', {}, 400);
    }

    const dailyEvent = await DailyEvent.findById(req.params.id).populate('organizer', 'name email phone');

    if (!dailyEvent) {
      return ApiResponse.notFound(res, 'Daily event not found');
    }

    dailyEvent.status = 'rejected';
    dailyEvent.rejectionReason = reason;
    dailyEvent.rejectedBy = req.user.id;
    dailyEvent.rejectedAt = new Date();

    await dailyEvent.save();

    adminNotificationController.markEntityNotificationsCompleted('DailyEvent', req.params.id, 'rejected', req.user.id);

    const organizerIdCandidate =
      dailyEvent.organizerInfo?.id ||
      dailyEvent.createdBy ||
      dailyEvent.organizer?._id ||
      dailyEvent.organizer;

    const organizerId = organizerIdCandidate?._id || organizerIdCandidate;

    const organizerDoc = organizerId
      ? await Organizer.findById(organizerId).select('name email phone')
      : null;

    const userDoc = !organizerDoc && organizerId
      ? await User.findById(organizerId).select('name email phone')
      : null;

    const eventForEmail = typeof dailyEvent.toObject === 'function' ? dailyEvent.toObject() : dailyEvent;
    if (organizerDoc) eventForEmail.organizer = organizerDoc;
    if (!organizerDoc && userDoc) eventForEmail.organizer = userDoc;

    if (eventForEmail.organizer?.email) {
      emailService.sendEventApprovalNotification(eventForEmail, false, reason).catch(err => {
        console.error('Error sending daily event rejection email:', err);
      });
    }

    return ApiResponse.success(res, 'Daily event rejected successfully', { dailyEvent });
  } catch (error) {
    console.error('Error rejecting daily event:', error);
    return ApiResponse.serverError(res, 'Error rejecting daily event', error);
  }
};

/**
 * @desc    Update a daily event (Admin only)
 * @route   PUT /api/admin/daily-events/:id
 * @access  Private (Admin only)
 */
const updateDailyEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const dailyEvent = await DailyEvent.findById(eventId);

    if (!dailyEvent) {
      return ApiResponse.notFound(res, 'Daily event not found');
    }

    const fieldsToUpdate = { ...dailyEvent.toObject(), ...req.body };

    if (req.body.location) {
      fieldsToUpdate.location = {
        ...dailyEvent.location,
        ...req.body.location,
        coordinates: req.body.location.coordinates ? (() => {
          if (req.body.location.coordinates.coordinates && Array.isArray(req.body.location.coordinates.coordinates)) {
            return {
              type: 'Point',
              coordinates: [
                parseFloat(req.body.location.coordinates.coordinates[0]) || dailyEvent.location.coordinates.coordinates[0],
                parseFloat(req.body.location.coordinates.coordinates[1]) || dailyEvent.location.coordinates.coordinates[1]
              ]
            };
          } else if (req.body.location.coordinates.latitude && req.body.location.coordinates.longitude) {
            return {
              type: 'Point',
              coordinates: [
                parseFloat(req.body.location.coordinates.longitude) || dailyEvent.location.coordinates.coordinates[0],
                parseFloat(req.body.location.coordinates.latitude) || dailyEvent.location.coordinates.coordinates[1]
              ]
            };
          } else {
            return dailyEvent.location.coordinates;
          }
        })() : dailyEvent.location.coordinates
      };
    }

    if (req.body.convenience) {
      fieldsToUpdate.convenience = {
        ...dailyEvent.convenience,
        ...req.body.convenience
      };
    }

    if (req.body.ticketTypes) {
      fieldsToUpdate.ticketTypes = req.body.ticketTypes;
    }

    if (req.body.activeDates) {
      fieldsToUpdate.activeDates = req.body.activeDates.map(date => new Date(date));
    }

    if (req.body.excludedDates) {
      fieldsToUpdate.excludedDates = req.body.excludedDates.map(date => new Date(date));
    }

    fieldsToUpdate.updatedAt = new Date();
    fieldsToUpdate.updatedBy = req.user.id;

    const updatedDailyEvent = await DailyEvent.findByIdAndUpdate(
      eventId,
      { $set: fieldsToUpdate },
      { new: true, runValidators: true }
    );

    return ApiResponse.success(res, 'Daily event updated successfully', { dailyEvent: updatedDailyEvent });
  } catch (error) {
    console.error('Error updating daily event:', error);
    return ApiResponse.serverError(res, 'Error updating daily event', error);
  }
};

/**
 * @desc    Delete a daily event (Admin only)
 * @route   DELETE /api/admin/daily-events/:id
 * @access  Private (Admin only)
 */
const deleteDailyEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const dailyEvent = await DailyEvent.findById(eventId);

    if (!dailyEvent) {
      return ApiResponse.notFound(res, 'Daily event not found');
    }

    await Booking.updateMany(
      { event: dailyEvent._id, $or: [ { eventSnapshot: { $exists: false } }, { eventSnapshot: null } ] },
      {
        $set: {
          eventSnapshot: {
            _id: dailyEvent._id,
            title: dailyEvent.title,
            banner: dailyEvent.banner,
            startDate: dailyEvent.periodStartDate,
            endDate: dailyEvent.periodEndDate,
            location: {
              address: dailyEvent.location?.address,
              city: dailyEvent.location?.city,
            }
          }
        }
      }
    );

    await DailyEvent.findByIdAndDelete(eventId);

    return ApiResponse.success(res, 'Daily event deleted successfully');
  } catch (error) {
    console.error('Error deleting daily event:', error);
    return ApiResponse.serverError(res, 'Error deleting daily event', error);
  }
};

/**
 * @desc    Pause organizer's own daily event
 * @route   PUT /api/organizer/daily-events/:id/pause
 * @access  Private (Organizer only)
 */
const pauseOrganizerDailyEvent = async (req, res) => {
  try {
    const dailyEvent = await DailyEvent.findOne({ _id: req.params.id, organizer: req.user.id });
    if (!dailyEvent) {
      return ApiResponse.notFound(res, 'Daily event not found');
    }
    if (dailyEvent.status === 'completed') {
      return ApiResponse.error(res, 'Cannot modify completed daily events', {}, 400);
    }
    dailyEvent.status = 'paused';
    await dailyEvent.save();
    return ApiResponse.success(res, 'Daily event paused successfully', { dailyEvent });
  } catch (error) {
    console.error('Error pausing organizer daily event:', error);
    return ApiResponse.serverError(res, 'Error pausing daily event', error);
  }
};

/**
 * @desc    Resume organizer's own daily event (back to approved)
 * @route   PUT /api/organizer/daily-events/:id/resume
 * @access  Private (Organizer only)
 */
const resumeOrganizerDailyEvent = async (req, res) => {
  try {
    const dailyEvent = await DailyEvent.findOne({ _id: req.params.id, organizer: req.user.id });
    if (!dailyEvent) {
      return ApiResponse.notFound(res, 'Daily event not found');
    }
    if (dailyEvent.status === 'completed') {
      return ApiResponse.error(res, 'Cannot modify completed daily events', {}, 400);
    }
    dailyEvent.status = 'approved';
    await dailyEvent.save();
    return ApiResponse.success(res, 'Daily event resumed successfully', { dailyEvent });
  } catch (error) {
    console.error('Error resuming organizer daily event:', error);
    return ApiResponse.serverError(res, 'Error resuming daily event', error);
  }
};

/**
 * @desc    Pause a daily event (Admin only)
 * @route   PUT /api/admin/daily-events/:id/pause
 * @access  Private (Admin only)
 */
const pauseDailyEvent = async (req, res) => {
  try {
    const dailyEvent = await DailyEvent.findById(req.params.id);
    if (!dailyEvent) {
      return ApiResponse.notFound(res, 'Daily event not found');
    }
    dailyEvent.status = 'paused';
    await dailyEvent.save();
    return ApiResponse.success(res, 'Daily event paused successfully', { dailyEvent });
  } catch (error) {
    console.error('Error pausing daily event:', error);
    return ApiResponse.serverError(res, 'Error pausing daily event', error);
  }
};

/**
 * @desc    Resume a daily event (Admin only)
 * @route   PUT /api/admin/daily-events/:id/resume
 * @access  Private (Admin only)
 */
const resumeDailyEvent = async (req, res) => {
  try {
    const dailyEvent = await DailyEvent.findById(req.params.id);
    if (!dailyEvent) {
      return ApiResponse.notFound(res, 'Daily event not found');
    }
    dailyEvent.status = 'approved';
    await dailyEvent.save();
    return ApiResponse.success(res, 'Daily event resumed successfully', { dailyEvent });
  } catch (error) {
    console.error('Error resuming daily event:', error);
    return ApiResponse.serverError(res, 'Error resuming daily event', error);
  }
};

/**
 * @desc    Get organizer's own daily events
 * @route   GET /api/organizer/daily-events
 * @access  Private (Organizer only)
 */
const getOrganizerDailyEvents = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { organizer: req.user.id };
    
    if (status) {
      query.status = status;
    }

    const dailyEvents = await DailyEvent.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return ApiResponse.success(res, 'Daily events fetched successfully', { dailyEvents });
  } catch (error) {
    console.error('Error fetching organizer daily events:', error);
    return ApiResponse.serverError(res, 'Error fetching daily events', error);
  }
};

module.exports = {
  createOrganizerDailyEvent,
  createDailyEvent,
  getDailyEvents,
  getPublicDailyEvents,
  getPublicDailyEventById,
  approveDailyEvent,
  rejectDailyEvent,
  updateDailyEvent,
  deleteDailyEvent,
  pauseOrganizerDailyEvent,
  resumeOrganizerDailyEvent,
  pauseDailyEvent,
  resumeDailyEvent,
  getOrganizerDailyEvents
};
