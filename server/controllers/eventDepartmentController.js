const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const EventDepartment = require('../models/EventDepartment');
const EventTeamMember = require('../models/EventTeamMember');
const ApiResponse = require('../utils/apiResponse');

const DEFAULT_DEPARTMENTS = [
  { key: 'artist-management', name: 'Artist Management', color: '#ec4899' },
  { key: 'event-management', name: 'Event Management', color: '#eab308' },
  { key: 'hospitality', name: 'Hospitality', color: '#f97316' },
  { key: 'media-content', name: 'Media and Content', color: '#06b6d4' },
  { key: 'medical', name: 'Medical', color: '#ef4444' },
  { key: 'security', name: 'Security', color: '#3b82f6' },
  { key: 'sound-lighting', name: 'Sound and Lighting', color: '#a855f7' },
  { key: 'stage-production', name: 'Stage and Production', color: '#f43f5e' },
  { key: 'ticketing-entry', name: 'Ticketing and Entry', color: '#22c55e' },
];

function slugifyKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatDepartment(doc) {
  return {
    id: doc._id,
    key: doc.key,
    name: doc.name,
    color: doc.color,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt,
  };
}

async function getOrganizerEvent(eventId, organizerId) {
  return Event.findOne({ _id: eventId, organizer: organizerId });
}

async function ensureDefaultDepartments(eventId) {
  const count = await EventDepartment.countDocuments({ event: eventId });
  if (count > 0) return;

  await EventDepartment.insertMany(
    DEFAULT_DEPARTMENTS.map((dept, index) => ({
      event: eventId,
      key: dept.key,
      name: dept.name,
      color: dept.color,
      sortOrder: index,
    }))
  );
}

function isObjectId(value) {
  return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
}

async function resolveDepartmentKey(eventId, department) {
  const value = String(department || '').trim();
  if (!value || value === 'none') return '';

  const query = isObjectId(value)
    ? { event: eventId, $or: [{ key: value }, { _id: value }] }
    : { event: eventId, key: value };

  const dept = await EventDepartment.findOne(query);

  if (!dept) {
    const err = new Error('Invalid department selected');
    err.statusCode = 400;
    throw err;
  }

  return dept.key;
}

async function getDepartmentDisplayName(eventId, departmentKey) {
  if (!departmentKey) return 'No department';

  const dept = await EventDepartment.findOne({ event: eventId, key: departmentKey }).select('name');
  return dept?.name || departmentKey;
}

exports.DEFAULT_DEPARTMENTS = DEFAULT_DEPARTMENTS;
exports.ensureDefaultDepartments = ensureDefaultDepartments;
exports.resolveDepartmentKey = resolveDepartmentKey;
exports.getDepartmentDisplayName = getDepartmentDisplayName;

exports.getEventDepartments = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    await ensureDefaultDepartments(eventId);

    const departments = await EventDepartment.find({ event: eventId })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return ApiResponse.success(res, 'Departments fetched successfully', {
      departments: departments.map(formatDepartment),
    });
  } catch (error) {
    console.error('getEventDepartments error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch departments', error);
  }
};

exports.createEventDepartment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId } = req.params;
    const { name, color } = req.body;

    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const trimmedName = String(name).trim();
    const baseKey = slugifyKey(trimmedName);
    if (!baseKey) {
      return ApiResponse.error(res, 'Department name is required', {}, 400);
    }

    let key = baseKey;
    let suffix = 1;
    while (await EventDepartment.findOne({ event: eventId, key })) {
      key = `${baseKey}-${suffix}`;
      suffix += 1;
    }

    const duplicateName = await EventDepartment.findOne({
      event: eventId,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (duplicateName) {
      return ApiResponse.error(res, 'This department already exists', {}, 400);
    }

    const maxSort = await EventDepartment.findOne({ event: eventId }).sort({ sortOrder: -1 }).select('sortOrder');
    const department = await EventDepartment.create({
      event: eventId,
      key,
      name: trimmedName,
      color: color || '#f97316',
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    });

    return ApiResponse.success(
      res,
      'Department created successfully',
      { department: formatDepartment(department) },
      201
    );
  } catch (error) {
    console.error('createEventDepartment error:', error);
    return ApiResponse.serverError(res, 'Failed to create department', error);
  }
};

exports.deleteEventDepartment = async (req, res) => {
  try {
    const { eventId, departmentId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const department = await EventDepartment.findOne({ _id: departmentId, event: eventId });
    if (!department) {
      return ApiResponse.notFound(res, 'Department not found');
    }

    const inUseCount = await EventTeamMember.countDocuments({
      event: eventId,
      departmentKey: department.key,
      status: { $ne: 'revoked' },
    });

    if (inUseCount > 0) {
      return ApiResponse.error(
        res,
        `Cannot delete department assigned to ${inUseCount} team member(s)`,
        {},
        400
      );
    }

    await department.deleteOne();

    return ApiResponse.success(res, 'Department deleted successfully');
  } catch (error) {
    console.error('deleteEventDepartment error:', error);
    return ApiResponse.serverError(res, 'Failed to delete department', error);
  }
};
