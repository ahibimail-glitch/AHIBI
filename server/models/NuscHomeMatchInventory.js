const mongoose = require('mongoose');

const TicketLineSchema = new mongoose.Schema({
  ticketType: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  zone: { type: String, enum: ['G-1', 'G-2', 'G-3', 'G-4', 'G-5'] },
}, { _id: false });

const GeneralZoneSaleSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  matchDate: { type: String, required: true },
  zone: { type: String, enum: ['G-1', 'G-2', 'G-3', 'G-4', 'G-5'], required: true },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const SuiteAllocationSchema = new mongoose.Schema({
  ticketType: { type: String, required: true },
  ticketIndex: { type: Number, required: true, min: 1 },
  boxNumber: { type: Number, required: true, min: 1, max: 4 },
}, { _id: false });

const OrderHoldSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  matchDate: { type: String, required: true },
  ticketLines: { type: [TicketLineSchema], default: [] },
  suiteAllocations: { type: [SuiteAllocationSchema], default: [] },
  status: { type: String, enum: ['held', 'confirmed'], default: 'held' },
  expiresAt: { type: Date, required: true },
  stockApplied: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const SeasonPassOrderHoldSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticketType: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  zone: { type: String, enum: ['G-1', 'G-2', 'G-3', 'G-4', 'G-5'] },
  matchDates: { type: [String], required: true },
  status: { type: String, enum: ['held', 'confirmed'], default: 'held' },
  stockApplied: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const SeasonReservationSchema = new mongoose.Schema({
  bookingReference: { type: String, required: true, trim: true },
  boxNumber: { type: Number, required: true, min: 1, max: 4 },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  cancelledAt: { type: Date },
}, { _id: true });

const NuscHomeMatchInventorySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'nusc-il-2026-27' },
  orders: { type: [OrderHoldSchema], default: [] },
  generalZoneSales: { type: [GeneralZoneSaleSchema], default: [] },
  seasonPassOrders: { type: [SeasonPassOrderHoldSchema], default: [] },
  seasonReservations: { type: [SeasonReservationSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('NuscHomeMatchInventory', NuscHomeMatchInventorySchema);
