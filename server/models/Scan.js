const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Scan = mongoose.model('Scan', scanSchema);

module.exports = Scan;
