const mongoose = require('mongoose');

const livestreamSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    stream: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiveStream',
      required: true,
    },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

livestreamSessionSchema.index({ user: 1, stream: 1 });

livestreamSessionSchema.index(
  { lastHeartbeat: 1 },
  { expireAfterSeconds: 90 }
);

module.exports = mongoose.model('LivestreamSession', livestreamSessionSchema);
