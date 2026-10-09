const mongoose = require('mongoose');

const HeliTaxiiLeadSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  packageId: { type: String, required: true },
  packageName: { type: String, required: true },
  price: { type: Number },
  duration: { type: String },
  source: { type: String, default: 'ahibi' },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('HeliTaxiiLead', HeliTaxiiLeadSchema);
