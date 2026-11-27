const mongoose = require('mongoose');

// Festival runs 11-13 Dec 2026 (ISO date strings; one shared camping cap).
const DEFAULT_DAYS = ['2026-12-11', '2026-12-12', '2026-12-13'];

const EuphoriaConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'euphoria-2026', unique: true, index: true },
    festivalDays: { type: [String], default: DEFAULT_DAYS },

    // Festival entry prices (per person) by number of days
    entryPrices: {
      oneDay: { type: Number, default: 200 },
      twoDay: { type: Number, default: 400 },
      threeDay: { type: Number, default: 600 },
    },

    // Camping prices (per person)
    campingNoTentPerNight: { type: Number, default: 500 },
    campingTent: {
      oneNight: { type: Number, default: 1500 },
      twoNight: { type: Number, default: 2000 },
      threeNight: { type: Number, default: 3000 },
    },

    // Shared camping capacity — counts PEOPLE across tent + no-tent + all durations.
    campingCapacity: { type: Number, default: 1000 },
    campingBooked: { type: Number, default: 0 }, // confirmed people in camping (atomic counter)

    // When true, a camping purchase also admits the person on their camping days.
    campingIncludesEntry: { type: Boolean, default: true },

    bookingOpen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EuphoriaConfig', EuphoriaConfigSchema);
