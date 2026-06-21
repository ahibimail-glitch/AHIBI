const mongoose = require('mongoose');

const teachingClassSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Class title is required'],
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all'],
    default: 'all',
  },
  mode: {
    type: String,
    enum: ['online', 'offline', 'both'],
    required: true,
  },
  pricing: {
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'INR' },
    pricingType: {
      type: String,
      enum: ['per_session', 'per_month', 'package'],
      default: 'per_session',
    },
  },
  schedule: {
    days: [{ type: String, trim: true }],
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    durationMinutes: { type: Number, min: 15 },
  },
  offlineLocation: {
    venueName: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    landmark: { type: String, trim: true },
  },
  onlineDetails: {
    platform: {
      type: String,
      enum: ['zoom', 'google_meet', 'teams', 'other'],
    },
    platformOther: { type: String, trim: true },
    meetingLink: { type: String, trim: true },
    instructions: { type: String, trim: true, maxlength: 500 },
  },
  maxStudents: {
    type: Number,
    min: 1,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

teachingClassSchema.index({ artistId: 1, isActive: 1 });

module.exports = mongoose.model('TeachingClass', teachingClassSchema);
