const express = require('express');
const { check } = require('express-validator');
const organizerAuthController = require('../controllers/organizerAuthController');
const eventController = require('../controllers/eventController');
const dailyEventController = require('../controllers/dailyEventController');
const dailyEventRsvpController = require('../controllers/dailyEventRsvpController');
const organizerBookingController = require('../controllers/organizerBookingController');
const eventTeamController = require('../controllers/eventTeamController');
const eventDepartmentController = require('../controllers/eventDepartmentController');
const eventRoleController = require('../controllers/eventRoleController');
const eventChecklistController = require('../controllers/eventChecklistController');
const eventTaskController = require('../controllers/eventTaskController');
const eventIncidentController = require('../controllers/eventIncidentController');
const eventFileController = require('../controllers/eventFileController');
const eventDiscordLinkController = require('../controllers/eventDiscordLinkController');
const eventCrmOverviewController = require('../controllers/eventCrmOverviewController');
const eventCrmReportController = require('../controllers/eventCrmReportController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.post('/auth/send-otp', [
  check('phone', 'Phone number is required').matches(/^\d{10}$/),
  check('mode', 'Mode must be signup or login').isIn(['signup', 'login']),
  // Conditional validation for signup
  check('name', 'Name is required').if(check('mode').equals('signup')).notEmpty(),
  check('email', 'Please include a valid email').if(check('mode').equals('signup')).isEmail(),
  check('companyName', 'Company name is required').if(check('mode').equals('signup')).notEmpty(),
  check('description', 'Description is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.street', 'Street address is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.city', 'City is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.state', 'State is required').if(check('mode').equals('signup')).notEmpty(),
  check('address.pincode', 'Valid pincode is required').if(check('mode').equals('signup')).matches(/^\d{6}$/),
  check('contactInfo.email', 'Contact email is required').if(check('mode').equals('signup')).isEmail(),
  check('password', 'Password must be at least 6 characters').if(check('mode').equals('signup')).isLength({ min: 6 })
], organizerAuthController.sendOrganizerOtp);

router.post('/auth/verify-otp', [
  check('phone', 'Phone number is required').matches(/^\d{10}$/),
  check('otp', 'OTP is required').isLength({ min: 6, max: 6 }),
  check('mode', 'Mode must be signup or login').isIn(['signup', 'login'])
], organizerAuthController.verifyOrganizerOtp);

router.post('/auth/check-organizer', [
  check('phone', 'Phone number is required').matches(/^\d{10}$/)
], organizerAuthController.checkOrganizerExists);

router.post('/auth/login', [
  check('phone', 'Phone number is required').matches(/^\d{10}$/),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], organizerAuthController.loginWithPassword);

router.post('/auth/setup-password', [
  protect,
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], organizerAuthController.setupPassword);

// Protected routes (require authentication)
router.get('/dashboard', protect, organizerAuthController.getOrganizerDashboard);
router.get('/profile', protect, organizerAuthController.getOrganizerProfile);
router.put('/profile', [
  protect,
  check('companyName', 'Company name is required').optional().notEmpty(),
  check('description', 'Description is required').optional().notEmpty(),
  check('contactInfo.email', 'Valid contact email is required').optional().isEmail()
], organizerAuthController.updateOrganizerProfile);

// Organizer event routes
router.post('/events', [
  protect,
  check('title', 'Event title is required').notEmpty(),
  check('description', 'Event description is required').notEmpty(),
  check('category', 'Event category is required').notEmpty(),
  check('startDate', 'Start date is required').notEmpty(),
  check('endDate', 'End date is required').notEmpty(),
  check('location.address', 'Venue address is required').notEmpty(),
  // Ticket types validation (conditional for free events)
  check('ticketTypes').custom((value, { req }) => {
    if (req.body.isFreeEvent) {
      return true; // allow empty for free events
    }
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error('At least one ticket type is required');
    }
    return true;
  }),
  check('ticketTypes.*.name').custom((val, { req }) => {
    if (req.body.isFreeEvent) return true;
    if (!val || String(val).trim() === '') throw new Error('Ticket type name is required');
    return true;
  }),
  check('ticketTypes.*.price').custom((val, { req }) => {
    if (req.body.isFreeEvent) return true;
    if (typeof val !== 'number') throw new Error('Ticket price is required and must be a number');
    return true;
  }),
  check('ticketTypes.*.quantity').custom((val, { req }) => {
    if (req.body.isFreeEvent) return true;
    if (!Number.isInteger(val) || val < 1) throw new Error('Ticket quantity is required and must be a number');
    return true;
  })
], eventController.createOrganizerEvent);

router.get('/events', protect, eventController.getOrganizerEvents);
router.get('/events/:id', protect, eventController.getOrganizerEventById);
router.put('/events/:id', [
  protect,
  check('title', 'Event title is required').optional().notEmpty(),
  check('description', 'Event description is required').optional().notEmpty(),
  check('category', 'Event category is required').optional().notEmpty(),
  check('startDate', 'Start date is required').optional().notEmpty(),
  check('endDate', 'End date is required').optional().notEmpty(),
  check('location.address', 'Venue address is required').optional().notEmpty(),
  // Gallery validation - optional array of objects with url and caption
  check('gallery').optional().isArray(),
  check('gallery.*.url', 'Gallery image URL is required').optional().notEmpty(),
  check('gallery.*.caption', 'Gallery image caption must be a string').optional().isString(),
  // Ticket types validation (conditional for free events)
  check('ticketTypes').optional().isArray(),
  check('ticketTypes.*.name').optional().notEmpty(),
  check('ticketTypes.*.price').optional().isNumeric(),
  check('ticketTypes.*.quantity').optional().isInt({ min: 0 }),
], eventController.updateOrganizerEvent);
router.put('/events/:id/pause', protect, eventController.pauseOrganizerEvent);
router.put('/events/:id/resume', protect, eventController.resumeOrganizerEvent);
router.delete('/events/:id', protect, eventController.deleteOrganizerEvent);

// Event team / CRM member routes
router.get('/events/:eventId/team', protect, eventTeamController.getEventTeam);
router.post('/events/:eventId/team/invite', [
  protect,
  check('phone', 'Valid 10-digit phone number is required').matches(/^\d{10}$/),
  check('email', 'Valid email is required').optional().isEmail().normalizeEmail(),
], eventTeamController.inviteTeamMember);
router.delete('/events/:eventId/team/:memberId', protect, eventTeamController.removeTeamMember);
router.patch('/events/:eventId/team/:memberId/department', protect, eventTeamController.updateTeamMemberDepartment);

// Event CRM departments
router.get('/events/:eventId/departments', protect, eventDepartmentController.getEventDepartments);
router.post('/events/:eventId/departments', [
  protect,
  check('name', 'Department name is required').notEmpty().trim(),
  check('color', 'Valid hex color is required').optional().matches(/^#[0-9A-Fa-f]{6}$/),
], eventDepartmentController.createEventDepartment);
router.delete('/events/:eventId/departments/:departmentId', protect, eventDepartmentController.deleteEventDepartment);

// Event CRM roles & responsibilities
router.get('/events/:eventId/roles', protect, eventRoleController.getEventRoles);
router.post('/events/:eventId/roles', [
  protect,
  check('name', 'Role name is required').notEmpty().trim(),
  check('description', 'Description must be a string').optional().isString(),
], eventRoleController.createEventRole);
router.delete('/events/:eventId/roles/:roleId', protect, eventRoleController.deleteEventRole);
router.post('/events/:eventId/responsibilities', [
  protect,
  check('title', 'Title is required').notEmpty().trim(),
  check('description', 'Description must be a string').optional().isString(),
  check('expectedOutcome', 'Expected outcome must be a string').optional().isString(),
  check('departmentId', 'Department id must be valid').optional().isString(),
  check('priority', 'Priority must be low, medium, or high').optional().isIn(['low', 'medium', 'high']),
], eventRoleController.createEventResponsibility);
router.delete('/events/:eventId/responsibilities/:responsibilityId', protect, eventRoleController.deleteEventResponsibility);

// Event CRM checklists
router.get('/events/:eventId/checklists', protect, eventChecklistController.getEventChecklists);
router.post('/events/:eventId/checklists', [
  protect,
  check('name', 'Checklist name is required').notEmpty().trim(),
  check('phase', 'Phase must be pre_event, event_day, or post_event').optional().isIn(['pre_event', 'event_day', 'post_event']),
  check('departmentId', 'Department id must be valid').optional().isString(),
], eventChecklistController.createEventChecklist);
router.delete('/events/:eventId/checklists/:checklistId', protect, eventChecklistController.deleteEventChecklist);
router.post('/events/:eventId/checklists/:checklistId/items', [
  protect,
  check('title', 'Item title is required').notEmpty().trim(),
], eventChecklistController.createChecklistItem);
router.patch('/events/:eventId/checklists/:checklistId/items/:itemId', [
  protect,
  check('status', 'Status is required').isIn(['not_started', 'in_progress', 'completed', 'blocked']),
], eventChecklistController.updateChecklistItem);
router.delete('/events/:eventId/checklists/:checklistId/items/:itemId', protect, eventChecklistController.deleteChecklistItem);

// Event CRM tasks
router.get('/events/:eventId/tasks', protect, eventTaskController.getEventTasks);
router.post('/events/:eventId/tasks', [
  protect,
  check('title', 'Title is required').notEmpty().trim(),
  check('description', 'Description must be a string').optional().isString(),
  check('departmentId', 'Department id must be valid').optional().isString(),
  check('assigneeId', 'Assignee id must be valid').optional().isString(),
  check('priority', 'Priority must be low, medium, high, or urgent').optional().isIn(['low', 'medium', 'high', 'urgent']),
  check('deadline', 'Deadline must be a valid date').optional().isISO8601(),
], eventTaskController.createEventTask);
router.patch('/events/:eventId/tasks/:taskId', [
  protect,
  check('status', 'Status must be valid').optional().isIn(['not_started', 'in_progress', 'waiting', 'completed', 'cancelled']),
  check('completionComment', 'Completion comment must be a string').optional().isString(),
], eventTaskController.updateEventTask);
router.delete('/events/:eventId/tasks/:taskId', protect, eventTaskController.deleteEventTask);

// Event CRM incidents
router.get('/events/:eventId/incidents', protect, eventIncidentController.getEventIncidents);
router.post('/events/:eventId/incidents', [
  protect,
  check('title', 'Title is required').notEmpty().trim(),
  check('description', 'Description must be a string').optional().isString(),
  check('location', 'Location must be a string').optional().isString(),
  check('category', 'Category must be a string').optional().isString(),
  check('departmentId', 'Department id must be valid').optional().isString(),
  check('priority', 'Priority must be low, medium, high, or urgent').optional().isIn(['low', 'medium', 'high', 'urgent']),
], eventIncidentController.createEventIncident);
router.patch('/events/:eventId/incidents/:incidentId', [
  protect,
  check('status', 'Status is required').isIn(['open', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed']),
], eventIncidentController.updateEventIncident);

// Event CRM files
router.get('/events/:eventId/files', protect, eventFileController.getEventFiles);
router.post('/events/:eventId/files', [
  protect,
  check('name', 'File name is required').notEmpty().trim(),
  check('storageUrl', 'Storage URL is required').notEmpty().trim(),
  check('storagePath', 'Storage path is required').notEmpty().trim(),
  check('sizeBytes', 'Size must be a number').optional().isNumeric(),
  check('mimeType', 'Mime type must be a string').optional().isString(),
  check('departmentId', 'Department id must be valid').optional().isString(),
], eventFileController.createEventFile);
router.patch('/events/:eventId/files/:fileId', protect, eventFileController.updateEventFile);
router.delete('/events/:eventId/files/:fileId', protect, eventFileController.deleteEventFile);

// Event CRM Discord / communication links
router.get('/events/:eventId/discord-links', protect, eventDiscordLinkController.getEventDiscordLinks);
router.post('/events/:eventId/discord-links', [
  protect,
  check('inviteUrl', 'Invite URL is required').notEmpty().trim(),
  check('serverName', 'Server name must be a string').optional().isString(),
  check('channelName', 'Channel name must be a string').optional().isString(),
  check('departmentId', 'Department id must be valid').optional().isString(),
  check('notes', 'Notes must be a string').optional().isString(),
], eventDiscordLinkController.createEventDiscordLink);
router.delete('/events/:eventId/discord-links/:linkId', protect, eventDiscordLinkController.deleteEventDiscordLink);

// Event CRM overview
router.get('/events/:eventId/crm-overview', protect, eventCrmOverviewController.getCrmOverview);
router.get('/events/:eventId/crm-report', protect, eventCrmReportController.getCrmReport);

// Organizer daily event routes
router.post('/daily-events', [
  protect,
  check('title', 'Event title is required').notEmpty(),
  check('description', 'Event description is required').notEmpty(),
  check('category', 'Event category is required').notEmpty(),
  check('periodStartDate', 'Period start date is required').notEmpty(),
  check('periodEndDate', 'Period end date is required').notEmpty(),
  check('startTime', 'Start time is required').notEmpty(),
  check('activeDates', 'Active dates are required').isArray({ min: 1 }),
  check('location.address', 'Venue address is required').notEmpty(),
  check('ticketTypes').custom((value, { req }) => {
    if (req.body.bookingType === 'rsvp' || req.body.bookingType === 'call_to_book') {
      return true;
    }
    if (req.body.isFreeEvent) {
      return true;
    }
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error('At least one ticket type is required');
    }
    return true;
  })
], dailyEventController.createOrganizerDailyEvent);

router.get('/daily-events', protect, dailyEventController.getOrganizerDailyEvents);
router.get('/daily-events/:id/rsvps', protect, dailyEventRsvpController.getOrganizerRsvpRequests);
router.patch('/daily-events/:id/rsvps/:requestId', protect, dailyEventRsvpController.updateOrganizerRsvpStatus);
router.get('/daily-events/:id', protect, dailyEventController.getOrganizerDailyEventById);
router.put('/daily-events/:id', [
  protect,
  check('title', 'Event title is required').optional().notEmpty(),
  check('description', 'Event description is required').optional().notEmpty(),
  check('category', 'Event category is required').optional().notEmpty(),
  check('periodStartDate', 'Period start date is required').optional().notEmpty(),
  check('periodEndDate', 'Period end date is required').optional().notEmpty(),
  check('startTime', 'Start time is required').optional().notEmpty(),
  check('activeDates', 'Active dates are required').optional().isArray({ min: 1 }),
  check('location.address', 'Venue address is required').optional().notEmpty(),
  check('ticketTypes').optional().isArray()
], dailyEventController.updateOrganizerDailyEvent);
router.put('/daily-events/:id/pause', protect, dailyEventController.pauseOrganizerDailyEvent);
router.put('/daily-events/:id/resume', protect, dailyEventController.resumeOrganizerDailyEvent);

// Artist booking routes for organizers
router.get('/artists/search', protect, authorize('organizer', 'user'), organizerBookingController.searchArtistsWithAvailability);
router.get('/artists/list', protect, authorize('organizer', 'user'), organizerBookingController.getAllArtists);
router.get('/artists/:artistId/calendar', protect, authorize('organizer', 'user'), organizerBookingController.getArtistCalendar);
router.post('/bookings', [
  protect,
  authorize('organizer', 'user'),
  check('artistId', 'Artist ID is required').isMongoId(),
  check('event.name', 'Event name is required').notEmpty(),
  check('event.date', 'Event date is required').isISO8601(),
  check('event.startTime', 'Start time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('event.endTime', 'End time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('event.venue.name', 'Venue name is required').notEmpty(),
  check('event.venue.address', 'Venue address is required').notEmpty(),
  check('event.eventType', 'Event type is required').notEmpty(),
  check('requestedAmount', 'Requested amount is required').isNumeric()
], organizerBookingController.createBookingRequest);
router.get('/bookings', protect, authorize('organizer', 'user'), organizerBookingController.getOrganizerBookings);
router.get('/bookings/latest', protect, authorize('organizer', 'user'), organizerBookingController.getLatestBookingsWithDiscussion);
router.get('/bookings/:id', protect, authorize('organizer', 'user'), organizerBookingController.getBookingDetails);
router.put('/bookings/:id/accept-counter-offer', protect, authorize('organizer', 'user'), organizerBookingController.acceptCounterOffer);
router.put('/bookings/:id/reject-counter-offer', [
  protect,
  authorize('organizer', 'user'),
  check('reason', 'Reason is required').optional().notEmpty()
], organizerBookingController.rejectCounterOffer);
router.put('/bookings/:id/cancel', [
  protect,
  authorize('organizer', 'user'),
  check('reason', 'Reason is required').optional().notEmpty()
], organizerBookingController.cancelBooking);
router.post('/bookings/:id/message', [
  protect,
  authorize('organizer', 'user'),
  check('message', 'Message is required').notEmpty()
], organizerBookingController.addBookingMessage);

module.exports = router;
