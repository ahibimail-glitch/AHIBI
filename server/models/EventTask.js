const mongoose = require('mongoose');

const EventTaskSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'waiting', 'completed', 'cancelled'],
      default: 'not_started',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventDepartment',
      default: null,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventTeamMember',
      default: null,
    },
    deadline: {
      type: Date,
      default: null,
    },
    completionComment: {
      type: String,
      trim: true,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventTask', EventTaskSchema);
