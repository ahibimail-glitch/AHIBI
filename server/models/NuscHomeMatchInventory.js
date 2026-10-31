const mongoose = require('mongoose');
const GENERAL_PASS_ZONES = ['G-1', 'G-2', 'G-3', 'G-4', 'G-5'];

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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required() { return !this.createdByAdmin; },
  },
  createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
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

const PartnerSeasonPassReservationSchema = new mongoose.Schema({
  reservationId: { type: String, required: true },
  partnerOrderId: { type: String, required: true },
  memberReferenceHash: { type: String, required: true },
  passId: { type: String, enum: ['general-season', 'premium-season'], required: true },
  ticketType: { type: String, enum: ['General Pass', 'Premium Pass'], required: true },
  zone: {
    type: String,
    default: null,
    required() {
      return this.passId === 'general-season';
    },
    validate: {
      validator(value) {
        if (this.passId === 'premium-season') return value === null || value === undefined;
        return this.passId === 'general-season' && GENERAL_PASS_ZONES.includes(value);
      },
      message: 'General season passes require a G-1 through G-5 zone; Premium season passes must not have a zone.',
    },
  },
  matchDates: { type: [String], required: true },
  eventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  status: { type: String, enum: ['held', 'issuing', 'issued', 'released', 'expired', 'replaced'], default: 'held' },
  expiresAt: { type: Date, required: true },
  paymentId: { type: String, default: null },
  bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  replacedByReservationId: { type: String, default: null },
  replacesReservationId: { type: String, default: null },
  replacementMatchIndices: { type: [Number], default: [] },
  replacementUsedTicketCount: { type: Number, min: 0, max: 10, default: null },
  replacementCancelledTicketCount: { type: Number, min: 0, max: 10, default: null },
  recoveryStatus: { type: String, enum: ['none', 'issuing', 'issued'], default: 'none' },
  recoveryMatchIndices: { type: [Number], default: [] },
  recoveryBookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  createdAt: { type: Date, default: Date.now },
  issuedAt: { type: Date, default: null },
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
  seasonPassHistoryInitializedAt: { type: Date, default: null },
  partnerSeasonPassReservations: { type: [PartnerSeasonPassReservationSchema], default: [] },
  seasonReservations: { type: [SeasonReservationSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('NuscHomeMatchInventory', NuscHomeMatchInventorySchema);
