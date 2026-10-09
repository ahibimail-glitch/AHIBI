const mongoose = require('mongoose');

const EventDepartmentSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
      default: '#f97316',
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code'],
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

EventDepartmentSchema.index({ event: 1, key: 1 }, { unique: true });
EventDepartmentSchema.index({ event: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('EventDepartment', EventDepartmentSchema);
