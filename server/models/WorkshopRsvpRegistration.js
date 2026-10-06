const mongoose = require('mongoose');

const workshopRsvpRegistrationSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    workshop: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    day: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    eventTitle: {
      type: String,
      required: true,
      trim: true,
      default: 'AHIBI Workshop RSVP',
    },
    status: {
      type: String,
      enum: ['confirmed'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

workshopRsvpRegistrationSchema.index({ phone: 1, workshop: 1 }, { unique: true });
workshopRsvpRegistrationSchema.index({ day: 1, workshop: 1, createdAt: -1 });

workshopRsvpRegistrationSchema.pre('save', function assignRegistrationNumber(next) {
  if (this.registrationNumber) {
    return next();
  }

  this.registrationNumber = `AWR-${new Date().getFullYear()}-${String(this._id).slice(-6).toUpperCase()}`;
  next();
});

module.exports = mongoose.model('WorkshopRsvpRegistration', workshopRsvpRegistrationSchema);
