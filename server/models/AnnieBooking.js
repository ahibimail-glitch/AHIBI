const mongoose = require("mongoose");

const AnnieBookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AnnieSeat",
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    razorpayOrderId: {
        type: String,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AnnieBooking", AnnieBookingSchema);
