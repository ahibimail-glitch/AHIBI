const mongoose = require('mongoose');
const { DEFAULT_BOXES } = require('./VipBoxPass');

const BoxSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  capacity: { type: Number, required: true, min: 0 },
  fixed: { type: Boolean, default: false },
}, { _id: false });

const VipBoxConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'nusc-dempo-vip', unique: true, index: true },
  matchLabel: { type: String, default: 'NUSC vs Dempo' },
  boxes: { type: [BoxSchema], default: DEFAULT_BOXES },
}, { timestamps: true });

module.exports = mongoose.model('VipBoxConfig', VipBoxConfigSchema);
