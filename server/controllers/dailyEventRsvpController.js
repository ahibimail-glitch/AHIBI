const mongoose = require('mongoose');
const DailyEvent = require('../models/DailyEvent');
const DailyEventRsvpRequest = require('../models/DailyEventRsvpRequest');
const ApiResponse = require('../utils/apiResponse');
const {
  DailyEventRsvpValidationError,
  RSVP_UPDATE_STATUSES,
  canUpdateRsvpStatus,
  isRsvpBookingType,
  parseRsvpSubmission,
} = require('../services/dailyEventRsvpService');

function findPublicEventQuery(eventId) {
  const alternatives = [{ slug: eventId }];
  if (mongoose.Types.ObjectId.isValid(eventId)) alternatives.push({ _id: eventId });
  return { status: 'approved', $or: alternatives };
}

function validObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

async function createPublicRsvp(req, res) {
  try {
    const dailyEvent = await DailyEvent.findOne(findPublicEventQuery(req.params.id))
      .select('_id organizer bookingType activeDates');
    if (!dailyEvent) return ApiResponse.notFound(res, 'Daily event not found');
    if (!isRsvpBookingType(dailyEvent.bookingType)) {
      return ApiResponse.error(res, 'This daily event uses online ticket booking.', {}, 400);
    }

    const submission = parseRsvpSubmission(req.body, dailyEvent.activeDates);
    const request = await DailyEventRsvpRequest.create({
      ...submission,
      dailyEvent: dailyEvent._id,
      organizer: dailyEvent.organizer,
      status: 'pending',
    });

    return ApiResponse.success(res, 'Booking enquiry sent. The organizer may contact you to discuss availability and booking details.', {
      requestId: String(request._id),
      status: request.status,
    }, 201);
  } catch (error) {
    if (error instanceof DailyEventRsvpValidationError) {
      return ApiResponse.error(res, error.message, {}, error.statusCode);
    }
    console.error('Error creating daily event RSVP request:', error?.name || 'UnknownError', error?.code || '');
    return ApiResponse.error(res, 'Unable to submit your RSVP request right now.', {}, 500);
  }
}

async function getOrganizerRsvpRequests(req, res) {
  try {
    if (!validObjectId(req.params.id)) return ApiResponse.notFound(res, 'Daily event not found');
    const dailyEvent = await DailyEvent.findOne({ _id: req.params.id, organizer: req.user.id })
      .select('_id bookingType');
    if (!dailyEvent) return ApiResponse.notFound(res, 'Daily event not found');
    if (!isRsvpBookingType(dailyEvent.bookingType)) {
      return ApiResponse.error(res, 'This daily event does not use RSVP requests.', {}, 400);
    }

    const rsvpRequests = await DailyEventRsvpRequest.find({
      dailyEvent: dailyEvent._id,
      organizer: req.user.id,
    }).sort({ createdAt: -1 }).lean();

    return ApiResponse.success(res, 'RSVP requests fetched successfully', { rsvpRequests });
  } catch (error) {
    console.error('Error fetching daily event RSVP requests:', error?.name || 'UnknownError', error?.code || '');
    return ApiResponse.error(res, 'Unable to load RSVP requests right now.', {}, 500);
  }
}

async function updateOrganizerRsvpStatus(req, res) {
  try {
    if (!validObjectId(req.params.id) || !validObjectId(req.params.requestId)) {
      return ApiResponse.notFound(res, 'RSVP request not found');
    }
    const nextStatus = typeof req.body?.status === 'string' ? req.body.status : '';
    if (!RSVP_UPDATE_STATUSES.includes(nextStatus)) {
      return ApiResponse.error(res, 'Choose contacted, booked, or declined.', {}, 400);
    }

    const dailyEvent = await DailyEvent.findOne({ _id: req.params.id, organizer: req.user.id })
      .select('_id bookingType');
    if (!dailyEvent) return ApiResponse.notFound(res, 'Daily event not found');
    if (!isRsvpBookingType(dailyEvent.bookingType)) {
      return ApiResponse.error(res, 'This daily event does not use RSVP requests.', {}, 400);
    }

    const rsvpRequest = await DailyEventRsvpRequest.findOne({
      _id: req.params.requestId,
      dailyEvent: dailyEvent._id,
      organizer: req.user.id,
    });
    if (!rsvpRequest) return ApiResponse.notFound(res, 'RSVP request not found');
    if (!canUpdateRsvpStatus(rsvpRequest.status, nextStatus)) {
      return ApiResponse.error(res, 'This RSVP request has already been closed.', {}, 409);
    }

    rsvpRequest.status = nextStatus;
    rsvpRequest.statusUpdatedAt = new Date();
    await rsvpRequest.save();

    return ApiResponse.success(res, 'RSVP request updated successfully', {
      rsvpRequest: rsvpRequest.toObject(),
    });
  } catch (error) {
    console.error('Error updating daily event RSVP request:', error?.name || 'UnknownError', error?.code || '');
    return ApiResponse.error(res, 'Unable to update this RSVP request right now.', {}, 500);
  }
}

module.exports = {
  createPublicRsvp,
  getOrganizerRsvpRequests,
  updateOrganizerRsvpStatus,
};
