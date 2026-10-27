const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.partnerId !== 'nusc'; },
  },
  partnerId: {
    type: String,
    enum: ['nusc'],
  },
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  requestId: {
    type: String,
    trim: true,
    maxlength: 128,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

scanSchema.index(
  { ticket: 1, event: 1, requestId: 1 },
  { unique: true, partialFilterExpression: { requestId: { $type: 'string' } } }
);

const Scan = mongoose.model('Scan', scanSchema);

module.exports = Scan;
