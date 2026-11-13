const mongoose = require('mongoose');

const AdminBookingDeletionSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  dailyEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyEvent', default: null },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  action: { type: String, enum: ['deleted_unpaid_booking'], required: true },
  ticketType: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  total: { type: Number, required: true, min: 0 },
  previousStatus: { type: String, required: true },
  previousPaymentStatus: { type: String, required: true },
  orderId: { type: String, default: null },
  reason: { type: String, required: true, maxlength: 500 },
  inventoryType: { type: String, enum: ['event_ticket', 'daily_event_ticket', 'nusc_match_hold', 'nusc_offline_single_pass_reserve'], required: true },
  inventoryQuantity: { type: Number, required: true, min: 0 },
  ticketCounterQuantity: { type: Number, required: true, min: 0 },
  deletedAt: { type: Date, default: Date.now },
}, { timestamps: false });

AdminBookingDeletionSchema.index({ bookingId: 1, action: 1 }, { unique: true });

module.exports = mongoose.model('AdminBookingDeletion', AdminBookingDeletionSchema);
