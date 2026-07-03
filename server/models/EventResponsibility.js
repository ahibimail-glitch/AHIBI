const mongoose = require('mongoose');

const EventResponsibilitySchema = new mongoose.Schema(
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
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventDepartment',
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    expectedOutcome: {
      type: String,
      trim: true,
      default: '',
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventTeamMember',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventResponsibility', EventResponsibilitySchema);
