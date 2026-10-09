const mongoose = require('mongoose');

const EventRoleSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

EventRoleSchema.index({ event: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('EventRole', EventRoleSchema);
