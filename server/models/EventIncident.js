const mongoose = require('mongoose');

const INCIDENT_CATEGORIES = [
  'Ticketing',
  'Technical',
  'Security',
  'Medical',
  'Artist',
  'Venue',
  'Crowd',
  'Hospitality',
  'Transport',
  'Lost and Found',
  'Vendor',
  'Production',
];

const EventIncidentSchema = new mongoose.Schema(
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
    location: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed'],
      default: 'open',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventDepartment',
      default: null,
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    reporterMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventTeamMember',
      default: null,
    },
    reporterOrganizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventIncident', EventIncidentSchema);
module.exports.INCIDENT_CATEGORIES = INCIDENT_CATEGORIES;
