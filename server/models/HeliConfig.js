const mongoose = require('mongoose');

// Hornbill 2026 heli operations: 1 Dec – 10 Dec 2026.
const DEFAULT_DAYS = Array.from({ length: 10 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`);

const SlotSchema = new mongoose.Schema({
  id: { type: String, required: true },      // 'am' | 'pm' | '0800'
  label: { type: String, required: true },   // '09:00 AM – 12:00 Noon'
  capacity: { type: Number, required: true, min: 0 }, // seats per DAY for this slot
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true },      // 'shuttle-kd' | 'kohima-sky' | ...
  name: { type: String, required: true },    // 'Kohima By Sky'
  sector: { type: String, default: '' },     // 'Kohima to Dimapur'
  type: { type: String, enum: ['shuttle', 'joyride'], default: 'joyride' },
  description: { type: String, default: '' },
  pricePerSeat: { type: Number, required: true, min: 0 }, // incl GST
  seatsPerFlight: { type: Number, default: 6 },           // a flight needs this many to fly
  slots: { type: [SlotSchema], default: [] },
  active: { type: Boolean, default: true },
}, { _id: false });

const DEFAULT_PRODUCTS = [
  { id: 'shuttle-kd', name: 'Shuttle Service', sector: 'Kohima to Dimapur', type: 'shuttle', description: '15 minutes, one way', pricePerSeat: 26999, seatsPerFlight: 6,
    slots: [{ id: '0800', label: '08:00 AM', capacity: 6 }] },
  { id: 'shuttle-dk', name: 'Shuttle Service', sector: 'Dimapur to Kohima', type: 'shuttle', description: '15 minutes, one way', pricePerSeat: 26999, seatsPerFlight: 6,
    slots: [{ id: '0800', label: '08:00 AM', capacity: 6 }] },
  { id: 'kohima-sky', name: 'Kohima By Sky', sector: 'Kohima By Sky', type: 'joyride', description: 'Aerial experience ride, 6–7 minutes (no landing, aerial view only)', pricePerSeat: 4800, seatsPerFlight: 6,
    slots: [{ id: 'am', label: '09:00 AM – 12:00 Noon', capacity: 48 }, { id: 'pm', label: '12:00 Noon – 04:00 PM', capacity: 48 }] },
  { id: 'dzukou-sky', name: 'Dzukou Valley By Sky', sector: 'Dzukou Valley', type: 'joyride', description: 'Aerial experience ride, 15–17 minutes (no landing, aerial view only)', pricePerSeat: 9999, seatsPerFlight: 6,
    slots: [{ id: 'am', label: '09:00 AM – 12:00 Noon', capacity: 12 }, { id: 'pm', label: '12:00 Noon – 04:00 PM', capacity: 12 }] },
];

const HeliConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'heli-2026', unique: true, index: true },
  operatingDays: { type: [String], default: DEFAULT_DAYS },
  products: { type: [ProductSchema], default: DEFAULT_PRODUCTS },
  bookingOpen: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('HeliConfig', HeliConfigSchema);
