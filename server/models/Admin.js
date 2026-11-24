const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin'],
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
