const mongoose = require('mongoose');

const NuscPartnerRequestSchema = new mongoose.Schema({
  keyId: { type: String, required: true },
  requestId: { type: String, required: true },
  receivedAt: { type: Date, default: Date.now, expires: 86400 },
}, { timestamps: false });

NuscPartnerRequestSchema.index({ keyId: 1, requestId: 1 }, { unique: true });

module.exports = mongoose.model('NuscPartnerRequest', NuscPartnerRequestSchema);
