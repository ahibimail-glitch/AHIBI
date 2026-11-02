const mongoose = require('mongoose');

const AuditEntrySchema = new mongoose.Schema({
  action: { type: String, required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  at: { type: Date, default: Date.now },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const ManualSeasonPassOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  requestId: { type: String, required: true, unique: true },
  requestHash: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  passId: { type: String, enum: ['general-season', 'premium-season'], required: true },
  ticketType: { type: String, enum: ['General Pass', 'Premium Pass'], required: true },
  zone: { type: String, enum: ['G-1', 'G-2', 'G-3', 'G-4', 'G-5'], default: null },
  listAmountMinor: { type: Number, required: true, min: 0 },
  settledAmountMinor: { type: Number, default: null, min: 0 },
  settlementType: { type: String, enum: ['paid', 'complimentary'], default: null },
  modeOfPayment: { type: String, enum: ['Cash', 'Card', 'UPI'], default: null },
  paymentReference: { type: String, trim: true, maxlength: 120, default: null },
  complimentaryReason: { type: String, trim: true, maxlength: 500, default: null },
  settlementHash: { type: String, default: null },
  settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  settledAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['reserving', 'reserved', 'settling', 'issued', 'needs_reconciliation', 'failed', 'cancelled'],
    default: 'reserving',
    index: true,
  },
  reservationExpiresAt: { type: Date, default: null },
  bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  adminTicketReissue: { type: mongoose.Schema.Types.Mixed, default: undefined },
  errorCode: { type: String, default: null },
  operationsAudit: { type: [AuditEntrySchema], default: [] },
}, { timestamps: true });

ManualSeasonPassOrderSchema.index({ createdAt: -1, _id: -1 });
ManualSeasonPassOrderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ManualSeasonPassOrder', ManualSeasonPassOrderSchema);
