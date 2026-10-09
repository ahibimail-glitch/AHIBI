const mongoose = require('mongoose');

const EventChecklistItemSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    checklist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventChecklist',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'blocked'],
      default: 'not_started',
    },
    deadline: {
      type: Date,
      default: null,
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventChecklistItem', EventChecklistItemSchema);
