const mongoose = require("mongoose");

const AnnieSeatSchema = new mongoose.Schema({
  row: {
    type: String,
    required: true,
  },
  number: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "booked", "selected"],
    default: "available",
  },
});

// Ensure row and number are unique together
AnnieSeatSchema.index({ row: 1, number: 1 }, { unique: true });

module.exports = mongoose.model("AnnieSeat", AnnieSeatSchema);
