const mongoose = require('mongoose');

const EventIncidentEventSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventIncident',
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ['reported', 'status_change'],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    actorMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventTeamMember',
      default: null,
    },
    actorOrganizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventIncidentEvent', EventIncidentEventSchema);
