const mongoose = require('mongoose');

// One doc per (date, product, slot). `booked` is the atomic seat counter.
const HeliSeatInventorySchema = new mongoose.Schema({
  key: { type: String, default: 'heli-2026', index: true },
  date: { type: String, required: true },      // ISO date
  productId: { type: String, required: true },
  slotId: { type: String, required: true },
  capacity: { type: Number, required: true, min: 0 }, // cached from config
  booked: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

HeliSeatInventorySchema.index({ date: 1, productId: 1, slotId: 1 }, { unique: true });

module.exports = mongoose.model('HeliSeatInventory', HeliSeatInventorySchema);
