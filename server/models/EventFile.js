const mongoose = require('mongoose');

const EventFileSchema = new mongoose.Schema(
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
    storageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    storagePath: {
      type: String,
      required: true,
      trim: true,
    },
    sizeBytes: {
      type: Number,
      default: null,
    },
    mimeType: {
      type: String,
      trim: true,
      default: '',
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventDepartment',
      default: null,
    },
    uploadedByOrganizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventFile', EventFileSchema);
