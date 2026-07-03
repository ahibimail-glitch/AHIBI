const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventChecklist = require('../models/EventChecklist');
const EventChecklistItem = require('../models/EventChecklistItem');
const EventDepartment = require('../models/EventDepartment');
const ApiResponse = require('../utils/apiResponse');

async function getOrganizerEvent(eventId, organizerId) {
  return Event.findOne({ _id: eventId, organizer: organizerId });
}

function formatItem(doc) {
  return {
    id: doc._id,
    checklistId: doc.checklist?._id || doc.checklist,
    title: doc.title,
    status: doc.status || 'not_started',
    deadline: doc.deadline || null,
    position: doc.position ?? 0,
  };
}

function formatChecklist(doc, items = []) {
  const department = doc.department;
  return {
    id: doc._id,
    name: doc.name,
    phase: doc.phase,
    departmentId: department?._id || department || null,
    departmentName: department?.name || null,
    items: items.map(formatItem),
  };
}

exports.getEventChecklists = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const checklists = await EventChecklist.find({ event: eventId })
      .populate('department', 'name key color')
      .sort({ createdAt: 1 })
      .lean();

    const checklistIds = checklists.map((c) => c._id);
    const allItems = checklistIds.length
      ? await EventChecklistItem.find({ checklist: { $in: checklistIds } })
          .sort({ position: 1, createdAt: 1 })
          .lean()
      : [];

    const itemsByChecklist = {};
    allItems.forEach((item) => {
      const key = String(item.checklist);
      if (!itemsByChecklist[key]) itemsByChecklist[key] = [];
      itemsByChecklist[key].push(item);
    });

    return ApiResponse.success(res, 'Checklists fetched successfully', {
      checklists: checklists.map((c) => formatChecklist(c, itemsByChecklist[String(c._id)] || [])),
    });
  } catch (error) {
    console.error('getEventChecklists error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch checklists', error);
  }
};

exports.createEventChecklist = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId } = req.params;
    const { name, phase, departmentId } = req.body;

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

    const checklist = await EventChecklist.create({
      event: eventId,
      name: String(name).trim(),
      phase: phase || 'pre_event',
      department: department?._id || null,
    });

    const populated = await EventChecklist.findById(checklist._id)
      .populate('department', 'name key color')
      .lean();

    return ApiResponse.success(
      res,
      'Checklist created successfully',
      { checklist: formatChecklist(populated, []) },
      201
    );
  } catch (error) {
    console.error('createEventChecklist error:', error);
    return ApiResponse.serverError(res, 'Failed to create checklist', error);
  }
};

exports.deleteEventChecklist = async (req, res) => {
  try {
    const { eventId, checklistId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const checklist = await EventChecklist.findOneAndDelete({ _id: checklistId, event: eventId });
    if (!checklist) {
      return ApiResponse.notFound(res, 'Checklist not found');
    }

    await EventChecklistItem.deleteMany({ checklist: checklistId, event: eventId });

    return ApiResponse.success(res, 'Checklist deleted successfully');
  } catch (error) {
    console.error('deleteEventChecklist error:', error);
    return ApiResponse.serverError(res, 'Failed to delete checklist', error);
  }
};

exports.createChecklistItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId, checklistId } = req.params;
    const { title } = req.body;

    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const checklist = await EventChecklist.findOne({ _id: checklistId, event: eventId });
    if (!checklist) {
      return ApiResponse.notFound(res, 'Checklist not found');
    }

    const count = await EventChecklistItem.countDocuments({ checklist: checklistId });
    const item = await EventChecklistItem.create({
      event: eventId,
      checklist: checklistId,
      title: String(title).trim(),
      position: count,
    });

    return ApiResponse.success(
      res,
      'Checklist item created successfully',
      { item: formatItem(item) },
      201
    );
  } catch (error) {
    console.error('createChecklistItem error:', error);
    return ApiResponse.serverError(res, 'Failed to create checklist item', error);
  }
};

exports.updateChecklistItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId, checklistId, itemId } = req.params;
    const { status } = req.body;

    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const item = await EventChecklistItem.findOneAndUpdate(
      { _id: itemId, checklist: checklistId, event: eventId },
      { $set: { status } },
      { new: true }
    );

    if (!item) {
      return ApiResponse.notFound(res, 'Checklist item not found');
    }

    return ApiResponse.success(res, 'Checklist item updated successfully', { item: formatItem(item) });
  } catch (error) {
    console.error('updateChecklistItem error:', error);
    return ApiResponse.serverError(res, 'Failed to update checklist item', error);
  }
};

exports.deleteChecklistItem = async (req, res) => {
  try {
    const { eventId, checklistId, itemId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const item = await EventChecklistItem.findOneAndDelete({
      _id: itemId,
      checklist: checklistId,
      event: eventId,
    });

    if (!item) {
      return ApiResponse.notFound(res, 'Checklist item not found');
    }

    return ApiResponse.success(res, 'Checklist item deleted successfully');
  } catch (error) {
    console.error('deleteChecklistItem error:', error);
    return ApiResponse.serverError(res, 'Failed to delete checklist item', error);
  }
};
