const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventDiscordLink = require('../models/EventDiscordLink');
const EventDepartment = require('../models/EventDepartment');
const ApiResponse = require('../utils/apiResponse');

async function getOrganizerEvent(eventId, organizerId) {
  return Event.findOne({ _id: eventId, organizer: organizerId });
}

function formatDiscordLink(doc) {
  const department = doc.department;
  return {
    id: doc._id,
    serverName: doc.serverName || '',
    channelName: doc.channelName || '',
    inviteUrl: doc.inviteUrl,
    departmentId: department?._id || department || null,
    departmentName: department?.name || null,
    notes: doc.notes || '',
    createdAt: doc.createdAt,
  };
}

exports.getEventDiscordLinks = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const links = await EventDiscordLink.find({ event: eventId })
      .populate('department', 'name key color')
      .sort({ createdAt: -1 })
      .lean();

    return ApiResponse.success(res, 'Discord links fetched successfully', {
      links: links.map(formatDiscordLink),
    });
  } catch (error) {
    console.error('getEventDiscordLinks error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch Discord links', error);
  }
};

exports.createEventDiscordLink = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId } = req.params;
    const { serverName, channelName, inviteUrl, departmentId, notes } = req.body;

    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    let department = null;
    if (departmentId) {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return ApiResponse.error(res, 'Invalid department selected', {}, 400);
      }
      department = await EventDepartment.findOne({ _id: departmentId, event: eventId });
      if (!department) {
        return ApiResponse.error(res, 'Department not found', {}, 400);
      }
    }

    const link = await EventDiscordLink.create({
      event: eventId,
      serverName: String(serverName || '').trim(),
      channelName: String(channelName || '').trim(),
      inviteUrl: String(inviteUrl).trim(),
      department: department?._id || null,
      notes: String(notes || '').trim(),
    });

    const populated = await EventDiscordLink.findById(link._id)
      .populate('department', 'name key color')
      .lean();

    return ApiResponse.success(
      res,
      'Discord link added successfully',
      { link: formatDiscordLink(populated) },
      201
    );
  } catch (error) {
    console.error('createEventDiscordLink error:', error);
    return ApiResponse.serverError(res, 'Failed to add Discord link', error);
  }
};

exports.deleteEventDiscordLink = async (req, res) => {
  try {
    const { eventId, linkId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const link = await EventDiscordLink.findOneAndDelete({ _id: linkId, event: eventId });
    if (!link) {
      return ApiResponse.notFound(res, 'Discord link not found');
    }

    return ApiResponse.success(res, 'Discord link deleted successfully');
  } catch (error) {
    console.error('deleteEventDiscordLink error:', error);
    return ApiResponse.serverError(res, 'Failed to delete Discord link', error);
  }
};

exports.formatDiscordLink = formatDiscordLink;
