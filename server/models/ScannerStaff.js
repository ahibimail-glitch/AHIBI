const mongoose = require('mongoose');

const EventAssignmentSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  canScan: { type: Boolean, default: true },
  canIssueWristbands: { type: Boolean, default: false },
  canSellOnsite: { type: Boolean, default: false },
  canViewCounts: { type: Boolean, default: false },
}, { _id: false });

const scannerStaffSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 40,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  // Undefined is retained for pre-existing accounts and preserves their
  // scanner-only access until an admin assigns event-specific permissions.
  // New accounts are created with [] and cannot access an event until assigned.
  eventAssignments: {
    type: [EventAssignmentSchema],
    default: undefined,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('ScannerStaff', scannerStaffSchema);
