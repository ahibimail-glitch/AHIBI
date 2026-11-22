const mongoose = require('mongoose');

const WristbandAssignmentSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  // One QR may represent more than one attendee for some legacy/on-spot
  // bookings. Each attendee unit receives a separately tracked band.
  ticketUnitIndex: { type: Number, required: true, min: 1, default: 1 },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'WristbandBatch', required: true },
  serialNumber: { type: Number, required: true, min: 1 },
  bandCode: { type: String, required: true, trim: true },
  color: { type: String, required: true, trim: true },
  ticketType: { type: String, required: true },
  bookingSource: { type: String, enum: ['online', 'on-spot'], required: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ScannerStaff' },
  issuedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  status: { type: String, enum: ['issued', 'voided'], default: 'issued' },
  voidReason: { type: String, trim: true, maxlength: 300 },
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  issuedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// A physical band can never be reused, even if it is voided. A ticket unit
// can have only one currently active assignment.
WristbandAssignmentSchema.index({ event: 1, bandCode: 1 }, { unique: true });
WristbandAssignmentSchema.index(
  { event: 1, booking: 1, ticketUnitIndex: 1 },
  { unique: true, partialFilterExpression: { status: 'issued' } },
);
WristbandAssignmentSchema.index({ event: 1, status: 1, issuedAt: -1 });
WristbandAssignmentSchema.index({ event: 1, bookingSource: 1, status: 1 });

module.exports = mongoose.model('WristbandAssignment', WristbandAssignmentSchema);
