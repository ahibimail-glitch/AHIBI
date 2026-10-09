const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRole = require('../models/EventRole');
const EventResponsibility = require('../models/EventResponsibility');
const EventDepartment = require('../models/EventDepartment');
const ApiResponse = require('../utils/apiResponse');

async function getOrganizerEvent(eventId, organizerId) {
  return Event.findOne({ _id: eventId, organizer: organizerId });
}

function formatRole(doc) {
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description || '',
    createdAt: doc.createdAt,
  };
}

function formatResponsibility(doc) {
  const department = doc.department;
  return {
    id: doc._id,
    title: doc.title,
    description: doc.description || '',
    departmentId: department?._id || department || null,
    departmentName: department?.name || null,
    assigneeId: doc.assignee?._id || doc.assignee || null,
    priority: doc.priority || 'medium',
    expectedOutcome: doc.expectedOutcome || '',
    createdAt: doc.createdAt,
  };
}

exports.getEventRoles = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const [roles, responsibilities] = await Promise.all([
      EventRole.find({ event: eventId }).sort({ name: 1 }).lean(),
      EventResponsibility.find({ event: eventId })
        .populate('department', 'name key color')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return ApiResponse.success(res, 'Roles fetched successfully', {
      roles: roles.map(formatRole),
      responsibilities: responsibilities.map(formatResponsibility),
    });
  } catch (error) {
    console.error('getEventRoles error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch roles', error);
  }
};

exports.createEventRole = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId } = req.params;
    const { name, description } = req.body;

    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const trimmedName = String(name).trim();
    const duplicate = await EventRole.findOne({
      event: eventId,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (duplicate) {
      return ApiResponse.error(res, 'This role already exists', {}, 400);
    }

    const role = await EventRole.create({
      event: eventId,
      name: trimmedName,
      description: String(description || '').trim(),
    });

    return ApiResponse.success(res, 'Role created successfully', { role: formatRole(role) }, 201);
  } catch (error) {
    console.error('createEventRole error:', error);
    return ApiResponse.serverError(res, 'Failed to create role', error);
  }
};

exports.deleteEventRole = async (req, res) => {
  try {
    const { eventId, roleId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const role = await EventRole.findOneAndDelete({ _id: roleId, event: eventId });
    if (!role) {
      return ApiResponse.notFound(res, 'Role not found');
    }

    return ApiResponse.success(res, 'Role deleted successfully');
  } catch (error) {
    console.error('deleteEventRole error:', error);
    return ApiResponse.serverError(res, 'Failed to delete role', error);
  }
};

exports.createEventResponsibility = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId } = req.params;
    const { title, description, departmentId, expectedOutcome, priority } = req.body;

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

    const responsibility = await EventResponsibility.create({
      event: eventId,
      title: String(title).trim(),
      description: String(description || '').trim(),
      department: department?._id || null,
      expectedOutcome: String(expectedOutcome || '').trim(),
      priority: priority || 'medium',
    });

    const populated = await EventResponsibility.findById(responsibility._id)
      .populate('department', 'name key color')
      .lean();

    return ApiResponse.success(
      res,
      'Responsibility created successfully',
      { responsibility: formatResponsibility(populated) },
      201
    );
  } catch (error) {
    console.error('createEventResponsibility error:', error);
    return ApiResponse.serverError(res, 'Failed to create responsibility', error);
  }
};

exports.deleteEventResponsibility = async (req, res) => {
  try {
    const { eventId, responsibilityId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const responsibility = await EventResponsibility.findOneAndDelete({
      _id: responsibilityId,
      event: eventId,
    });
    if (!responsibility) {
      return ApiResponse.notFound(res, 'Responsibility not found');
    }

    return ApiResponse.success(res, 'Responsibility deleted successfully');
  } catch (error) {
    console.error('deleteEventResponsibility error:', error);
    return ApiResponse.serverError(res, 'Failed to delete responsibility', error);
  }
};
