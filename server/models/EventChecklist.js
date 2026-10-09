const mongoose = require('mongoose');

const EventChecklistSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phase: {
      type: String,
      enum: ['pre_event', 'event_day', 'post_event'],
      default: 'pre_event',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventDepartment',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventChecklist', EventChecklistSchema);
