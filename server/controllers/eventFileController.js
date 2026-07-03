const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventFile = require('../models/EventFile');
const EventDepartment = require('../models/EventDepartment');
const ApiResponse = require('../utils/apiResponse');

async function getOrganizerEvent(eventId, organizerId) {
  return Event.findOne({ _id: eventId, organizer: organizerId });
}

function formatFile(doc) {
  const department = doc.department;
  return {
    id: doc._id,
    name: doc.name,
    storageUrl: doc.storageUrl,
    storagePath: doc.storagePath,
    sizeBytes: doc.sizeBytes ?? null,
    mimeType: doc.mimeType || '',
    pinned: Boolean(doc.pinned),
    departmentId: department?._id || department || null,
    departmentName: department?.name || null,
    createdAt: doc.createdAt,
  };
}

exports.getEventFiles = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const files = await EventFile.find({ event: eventId })
      .populate('department', 'name key color')
      .sort({ pinned: -1, createdAt: -1 })
      .lean();

    return ApiResponse.success(res, 'Files fetched successfully', {
      files: files.map(formatFile),
    });
  } catch (error) {
    console.error('getEventFiles error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch files', error);
  }
};

exports.createEventFile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId } = req.params;
    const { name, storageUrl, storagePath, sizeBytes, mimeType, departmentId } = req.body;

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

    const file = await EventFile.create({
      event: eventId,
      name: String(name).trim(),
      storageUrl: String(storageUrl).trim(),
      storagePath: String(storagePath).trim(),
      sizeBytes: sizeBytes ?? null,
      mimeType: String(mimeType || '').trim(),
      department: department?._id || null,
      uploadedByOrganizer: req.user.id,
    });

    const populated = await EventFile.findById(file._id)
      .populate('department', 'name key color')
      .lean();

    return ApiResponse.success(res, 'File saved successfully', { file: formatFile(populated) }, 201);
  } catch (error) {
    console.error('createEventFile error:', error);
    return ApiResponse.serverError(res, 'Failed to save file', error);
  }
};

exports.updateEventFile = async (req, res) => {
  try {
    const { eventId, fileId } = req.params;
    const { pinned } = req.body;

    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const file = await EventFile.findOneAndUpdate(
      { _id: fileId, event: eventId },
      { $set: { pinned: Boolean(pinned) } },
      { new: true }
    )
      .populate('department', 'name key color')
      .lean();

    if (!file) {
      return ApiResponse.notFound(res, 'File not found');
    }

    return ApiResponse.success(res, 'File updated successfully', { file: formatFile(file) });
  } catch (error) {
    console.error('updateEventFile error:', error);
    return ApiResponse.serverError(res, 'Failed to update file', error);
  }
};

exports.deleteEventFile = async (req, res) => {
  try {
    const { eventId, fileId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const file = await EventFile.findOneAndDelete({ _id: fileId, event: eventId });
    if (!file) {
      return ApiResponse.notFound(res, 'File not found');
    }

    return ApiResponse.success(res, 'File deleted successfully', {
      storageUrl: file.storageUrl,
    });
  } catch (error) {
    console.error('deleteEventFile error:', error);
    return ApiResponse.serverError(res, 'Failed to delete file', error);
  }
};

exports.formatFile = formatFile;
