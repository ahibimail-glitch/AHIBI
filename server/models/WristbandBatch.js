const mongoose = require('mongoose');

const WristbandBatchSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  ticketTypeName: { type: String, required: true, trim: true },
  color: { type: String, required: true, trim: true, maxlength: 40 },
  prefix: { type: String, default: '', trim: true, maxlength: 24 },
  startNumber: { type: Number, required: true, min: 1 },
  endNumber: { type: Number, required: true, min: 1 },
  nextNumber: { type: Number, required: true, min: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

WristbandBatchSchema.index({ event: 1, ticketTypeId: 1, active: 1, createdAt: 1 });

module.exports = mongoose.model('WristbandBatch', WristbandBatchSchema);
