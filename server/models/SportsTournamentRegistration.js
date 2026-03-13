const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: Number,
    required: true,
    min: 5,
    max: 99,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
}, { _id: false });

const sportsTournamentRegistrationSchema = new mongoose.Schema({
  tournamentName: {
    type: String,
    default: 'Nagaland Pickleball Classic Tournament 2026',
  },
  categories: [{
    type: String,
    enum: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    required: true,
  }],
  player: {
    type: playerSchema,
    required: true,
  },
  declarationsAccepted: {
    type: Boolean,
    required: true,
    default: false,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  },
  razorpayOrderId: {
    type: String,
    index: true,
  },
  razorpayPaymentId: String,
  razorpaySignature: String,
  transactionId: String,
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  registrationDate: Date,
  invoicePdf: {
    type: Buffer,
    select: false,
  },
  invoicePdfContentType: {
    type: String,
    default: 'application/pdf',
  },
  invoiceGeneratedAt: Date,
  invoiceUrl: String,
}, { timestamps: true });

sportsTournamentRegistrationSchema.pre('save', async function(next) {
  if (this.paymentStatus === 'confirmed' && !this.registrationNumber) {
    const count = await mongoose.model('SportsTournamentRegistration').countDocuments({ paymentStatus: 'confirmed' });
    this.registrationNumber = `SPT${new Date().getFullYear()}${String(count + 1).padStart(5, '0')}`;
    this.registrationDate = new Date();
    this.status = 'confirmed';
  }
  next();
});

sportsTournamentRegistrationSchema.pre('save', async function(next) {
  if (this.paymentStatus === 'confirmed' && !this.invoiceNumber) {
    const count = await mongoose.model('SportsTournamentRegistration').countDocuments({ paymentStatus: 'confirmed' });
    this.invoiceNumber = `INV-SPT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('SportsTournamentRegistration', sportsTournamentRegistrationSchema);
