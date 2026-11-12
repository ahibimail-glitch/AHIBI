const mongoose = require('mongoose');

const scannerStaffSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 40,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('ScannerStaff', scannerStaffSchema);
