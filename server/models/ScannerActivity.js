const mongoose = require('mongoose');

const ScannerActivitySchema = new mongoose.Schema({
  scannerStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'ScannerStaff', index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', index: true },
  action: { type: String, required: true, trim: true, maxlength: 120 },
  outcome: { type: String, enum: ['success', 'error'], required: true, index: true },
  statusCode: { type: Number, required: true },
  errorCode: { type: String, trim: true, maxlength: 100 },
  durationMs: { type: Number, min: 0 },
}, { timestamps: { createdAt: true, updatedAt: false } });

ScannerActivitySchema.index({ createdAt: -1, outcome: 1 });
ScannerActivitySchema.index({ event: 1, createdAt: -1 });
ScannerActivitySchema.index({ scannerStaff: 1, createdAt: -1 });

module.exports = mongoose.model('ScannerActivity', ScannerActivitySchema);
