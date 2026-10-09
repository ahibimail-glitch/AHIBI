const mongoose = require('mongoose');

const EventTeamMemberSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator(value) {
          return !value || /^\d{10}$/.test(value);
        },
        message: 'Please add a valid 10 digit phone number',
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    eventRole: {
      type: String,
      required: true,
      trim: true,
      default: 'Team Member',
    },
    departmentKey: {
      type: String,
      trim: true,
      default: '',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked', 'active'],
      default: 'pending',
      index: true,
    },
    inviteToken: {
      type: String,
      trim: true,
      default: null,
      index: true,
      sparse: true,
    },
    accessExpiresAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    isOwner: {
      type: Boolean,
      default: false,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer',
      default: null,
    },
  },
  { timestamps: true }
);

EventTeamMemberSchema.index(
  { event: 1, phone: 1 },
  {
    unique: true,
    partialFilterExpression: { phone: { $type: 'string', $ne: '' } },
  }
);
EventTeamMemberSchema.index(
  { event: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string', $ne: '' } },
  }
);

EventTeamMemberSchema.pre('save', function normalizeStatus(next) {
  if (this.status === 'active') {
    this.status = 'accepted';
  }
  next();
});

module.exports = mongoose.model('EventTeamMember', EventTeamMemberSchema);
