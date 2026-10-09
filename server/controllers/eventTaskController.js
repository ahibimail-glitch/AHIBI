const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventTask = require('../models/EventTask');
const EventDepartment = require('../models/EventDepartment');
const EventTeamMember = require('../models/EventTeamMember');
const ApiResponse = require('../utils/apiResponse');

async function getOrganizerEvent(eventId, organizerId) {
  return Event.findOne({ _id: eventId, organizer: organizerId });
}

function formatTask(doc) {
  const department = doc.department;
  const assignee = doc.assignee;

  return {
    id: doc._id,
    title: doc.title,
    description: doc.description || '',
    status: doc.status || 'not_started',
    priority: doc.priority || 'medium',
    departmentId: department?._id || department || null,
    departmentName: department?.name || null,
    assigneeId: assignee?._id || assignee || null,
    assigneeName: assignee?.name || assignee?.phone || assignee?.email || null,
    deadline: doc.deadline || null,
    completionComment: doc.completionComment || '',
    completedAt: doc.completedAt || null,
    createdAt: doc.createdAt,
  };
}

exports.getEventTasks = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const tasks = await EventTask.find({ event: eventId })
      .populate('department', 'name key color')
      .populate('assignee', 'name phone email')
      .sort({ createdAt: -1 })
      .lean();

    return ApiResponse.success(res, 'Tasks fetched successfully', {
      tasks: tasks.map(formatTask),
    });
  } catch (error) {
    console.error('getEventTasks error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch tasks', error);
  }
};

exports.createEventTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId } = req.params;
    const { title, description, departmentId, assigneeId, priority, deadline } = req.body;

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

    let assignee = null;
    if (assigneeId) {
      if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
        return ApiResponse.error(res, 'Invalid assignee selected', {}, 400);
      }
      assignee = await EventTeamMember.findOne({
        _id: assigneeId,
        event: eventId,
        status: { $in: ['accepted', 'active'] },
      });
      if (!assignee) {
        return ApiResponse.error(res, 'Assignee not found', {}, 400);
      }
    }

    const task = await EventTask.create({
      event: eventId,
      title: String(title).trim(),
      description: String(description || '').trim(),
      department: department?._id || null,
      assignee: assignee?._id || null,
      priority: priority || 'medium',
      deadline: deadline ? new Date(deadline) : null,
      createdBy: req.user.id,
    });

    const populated = await EventTask.findById(task._id)
      .populate('department', 'name key color')
      .populate('assignee', 'name phone email')
      .lean();

    return ApiResponse.success(res, 'Task created successfully', { task: formatTask(populated) }, 201);
  } catch (error) {
    console.error('createEventTask error:', error);
    return ApiResponse.serverError(res, 'Failed to create task', error);
  }
};

exports.updateEventTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId, taskId } = req.params;
    const { status, completionComment } = req.body;

    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const updates = {};
    if (status !== undefined) {
      updates.status = status;
      if (status === 'completed') {
        updates.completedAt = new Date();
      } else {
        updates.completedAt = null;
      }
    }
    if (completionComment !== undefined) {
      updates.completionComment = String(completionComment).trim();
    }

    const task = await EventTask.findOneAndUpdate(
      { _id: taskId, event: eventId },
      { $set: updates },
      { new: true }
    )
      .populate('department', 'name key color')
      .populate('assignee', 'name phone email');

    if (!task) {
      return ApiResponse.notFound(res, 'Task not found');
    }

    return ApiResponse.success(res, 'Task updated successfully', { task: formatTask(task) });
  } catch (error) {
    console.error('updateEventTask error:', error);
    return ApiResponse.serverError(res, 'Failed to update task', error);
  }
};

exports.deleteEventTask = async (req, res) => {
  try {
    const { eventId, taskId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const task = await EventTask.findOneAndDelete({ _id: taskId, event: eventId });
    if (!task) {
      return ApiResponse.notFound(res, 'Task not found');
    }

    return ApiResponse.success(res, 'Task deleted successfully');
  } catch (error) {
    console.error('deleteEventTask error:', error);
    return ApiResponse.serverError(res, 'Failed to delete task', error);
  }
};
