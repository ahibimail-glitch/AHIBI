const mongoose = require('mongoose');

const EventDiscordLinkSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    serverName: {
      type: String,
      trim: true,
      default: '',
    },
    channelName: {
      type: String,
      trim: true,
      default: '',
    },
    inviteUrl: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventDepartment',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventDiscordLink', EventDiscordLinkSchema);
