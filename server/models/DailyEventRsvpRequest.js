const mongoose = require('mongoose');

const DailyEventRsvpRequestSchema = new mongoose.Schema({
  dailyEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyEvent',
    required: true,
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30,
  },
  partySize: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
  },
  address: {
    type: String,
    required: true,
    trim: true,
    maxlength: 250,
  },
  requestedDate: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    maxlength: 10,
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'booked', 'declined'],
    default: 'pending',
    required: true,
  },
  statusUpdatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

DailyEventRsvpRequestSchema.index({ dailyEvent: 1, createdAt: -1 });
DailyEventRsvpRequestSchema.index({ organizer: 1, status: 1 });

module.exports = mongoose.models.DailyEventRsvpRequest || mongoose.model('DailyEventRsvpRequest', DailyEventRsvpRequestSchema);
