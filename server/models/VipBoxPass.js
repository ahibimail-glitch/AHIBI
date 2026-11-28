const mongoose = require('mongoose');

// Default box capacities for NUSC vs Dempo VIP boxes (box 2 is fixed/no rotation).
const DEFAULT_BOXES = [
  { number: 1, capacity: 8, fixed: false },
  { number: 2, capacity: 8, fixed: true },
  { number: 3, capacity: 8, fixed: false },
  { number: 4, capacity: 8, fixed: false },
  { number: 5, capacity: 8, fixed: false },
  { number: 6, capacity: 10, fixed: false },
  { number: 7, capacity: 10, fixed: false },
  { number: 8, capacity: 10, fixed: false },
  { number: 9, capacity: 10, fixed: false },
  { number: 10, capacity: 8, fixed: false },
];

// Seed: one rotating pass (lead) per box, except the fixed box 2.
const DEFAULT_PASSES = [
  { homeBox: 1, guestName: 'Bashangmongba' },
  { homeBox: 3, guestName: 'Chabu' },
  { homeBox: 4, guestName: 'Rosum' },
  { homeBox: 5, guestName: 'Metsubo' },
  { homeBox: 6, guestName: 'Cl John' },
  { homeBox: 7, guestName: 'Paiwang' },
  { homeBox: 8, guestName: 'Y. Patton' },
  { homeBox: 9, guestName: 'Temjen Imna Along' },
  { homeBox: 10, guestName: 'Jacob Zhimomi' },
];

const ScanLogSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  by: { type: String, default: null },
  byName: { type: String, default: null },
  fromBox: { type: Number, default: null },
  toBox: { type: Number, default: null },
}, { _id: false });

const VipBoxPassSchema = new mongoose.Schema({
  key: { type: String, default: 'nusc-dempo-vip', index: true },
  passRef: { type: String, required: true, unique: true, index: true },
  guestName: { type: String, required: true, trim: true },
  homeBox: { type: Number, required: true },
  currentBox: { type: Number, default: null }, // where the rep has seated them now
  fixed: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  scanLog: { type: [ScanLogSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('VipBoxPass', VipBoxPassSchema);
module.exports.DEFAULT_BOXES = DEFAULT_BOXES;
module.exports.DEFAULT_PASSES = DEFAULT_PASSES;
