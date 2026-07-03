const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventIncident = require('../models/EventIncident');
const EventIncidentEvent = require('../models/EventIncidentEvent');
const EventDepartment = require('../models/EventDepartment');
const ApiResponse = require('../utils/apiResponse');

const INCIDENT_STATUSES = ['open', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed'];
const INCIDENT_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

async function getOrganizerEvent(eventId, organizerId) {
  return Event.findOne({ _id: eventId, organizer: organizerId });
}

function formatIncident(doc) {
  const department = doc.department;
  return {
    id: doc._id,
    title: doc.title,
    description: doc.description || '',
    location: doc.location || '',
    category: doc.category || '',
    priority: doc.priority || 'medium',
    status: doc.status || 'open',
    departmentId: department?._id || department || null,
    departmentName: department?.name || null,
    reportedAt: doc.reportedAt || doc.createdAt,
    resolvedAt: doc.resolvedAt || null,
    reporterMemberId: doc.reporterMember?._id || doc.reporterMember || null,
    reporterOrganizerId: doc.reporterOrganizer?._id || doc.reporterOrganizer || null,
    createdAt: doc.createdAt,
  };
}

async function logIncidentEvent({ eventId, incidentId, kind, note, actorMember, actorOrganizer }) {
  await EventIncidentEvent.create({
    event: eventId,
    incident: incidentId,
    kind,
    note,
    actorMember: actorMember || null,
    actorOrganizer: actorOrganizer || null,
  });
}

async function resolveDepartment(eventId, departmentId) {
  if (!departmentId) return null;
  if (!mongoose.Types.ObjectId.isValid(departmentId)) {
    const err = new Error('Invalid department selected');
    err.statusCode = 400;
    throw err;
  }
  const department = await EventDepartment.findOne({ _id: departmentId, event: eventId });
  if (!department) {
    const err = new Error('Department not found');
    err.statusCode = 400;
    throw err;
  }
  return department;
}

async function createIncidentRecord({
  eventId,
  body,
  reporterMember = null,
  reporterOrganizer = null,
}) {
  const { title, description, location, category, priority, departmentId } = body;
  const department = await resolveDepartment(eventId, departmentId);

  const incident = await EventIncident.create({
    event: eventId,
    title: String(title).trim(),
    description: String(description || '').trim(),
    location: String(location || '').trim(),
    category: String(category || '').trim(),
    priority: priority || 'medium',
    department: department?._id || null,
    reporterMember: reporterMember?._id || reporterMember || null,
    reporterOrganizer: reporterOrganizer || null,
  });

  await logIncidentEvent({
    eventId,
    incidentId: incident._id,
    kind: 'reported',
    note: 'Incident reported',
    actorMember: reporterMember?._id || reporterMember || null,
    actorOrganizer: reporterOrganizer || null,
  });

  const populated = await EventIncident.findById(incident._id)
    .populate('department', 'name key color')
    .lean();

  return formatIncident(populated);
}

exports.getEventIncidents = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const incidents = await EventIncident.find({ event: eventId })
      .populate('department', 'name key color')
      .sort({ reportedAt: -1 })
      .lean();

    return ApiResponse.success(res, 'Incidents fetched successfully', {
      incidents: incidents.map(formatIncident),
    });
  } catch (error) {
    console.error('getEventIncidents error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch incidents', error);
  }
};

exports.createEventIncident = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const incident = await createIncidentRecord({
      eventId,
      body: req.body,
      reporterOrganizer: req.user.id,
    });

    return ApiResponse.success(res, 'Incident reported successfully', { incident }, 201);
  } catch (error) {
    console.error('createEventIncident error:', error);
    return ApiResponse.error(
      res,
      error.message || 'Failed to report incident',
      {},
      error.statusCode || 500
    );
  }
};

exports.updateEventIncident = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId, incidentId } = req.params;
    const { status } = req.body;

    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const existing = await EventIncident.findOne({ _id: incidentId, event: eventId });
    if (!existing) {
      return ApiResponse.notFound(res, 'Incident not found');
    }

    const updates = { status };
    if ((status === 'resolved' || status === 'closed') && !existing.resolvedAt) {
      updates.resolvedAt = new Date();
    }
    if (status !== 'resolved' && status !== 'closed') {
      updates.resolvedAt = null;
    }

    const incident = await EventIncident.findOneAndUpdate(
      { _id: incidentId, event: eventId },
      { $set: updates },
      { new: true }
    )
      .populate('department', 'name key color')
      .lean();

    await logIncidentEvent({
      eventId,
      incidentId,
      kind: 'status_change',
      note: `Status → ${status}`,
      actorOrganizer: req.user.id,
    });

    return ApiResponse.success(res, 'Incident updated successfully', {
      incident: formatIncident(incident),
    });
  } catch (error) {
    console.error('updateEventIncident error:', error);
    return ApiResponse.serverError(res, 'Failed to update incident', error);
  }
};

async function buildDepartmentIncidentQuery(eventId, membership, departmentKey) {
  if (membership.isOwner) {
    return { event: eventId };
  }

  const key = departmentKey ?? membership.departmentKey ?? '';
  if (key) {
    const dept = await EventDepartment.findOne({ event: eventId, key });
    if (dept) {
      return {
        event: eventId,
        $or: [{ department: dept._id }, { department: null }, { reporterMember: membership._id }],
      };
    }
  }

  return {
    event: eventId,
    $or: [{ department: null }, { reporterMember: membership._id }],
  };
}

exports.formatIncident = formatIncident;
exports.createIncidentRecord = createIncidentRecord;
exports.buildDepartmentIncidentQuery = buildDepartmentIncidentQuery;
exports.INCIDENT_STATUSES = INCIDENT_STATUSES;
exports.INCIDENT_PRIORITIES = INCIDENT_PRIORITIES;
