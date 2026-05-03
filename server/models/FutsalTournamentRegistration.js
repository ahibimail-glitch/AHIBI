const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: Number,
    min: 10,
    max: 50,
  },
  phone: {
    type: String,
    trim: true,
  },
  idType: {
    type: String,
    enum: ['aadhar', 'pan', 'voter_id'],
    required: true,
    trim: true,
  },
  idNumber: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

const futsalTournamentRegistrationSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    trim: true,
  },
  numberOfPlayers: {
    type: Number,
    required: true,
    min: 6,
    max: 10,
    default: 6,
  },
  player: {
    type: playerSchema,
    required: true,
  },
  teamManager: {
    fullName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    }
  },
  teamCoach: {
    fullName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    }
  },
  tournament: {
    type: String,
    default: 'Turf Titans Tournament T3',
  },
  registrationNumber: {
    type: String,
    unique: true,
  },
  invoiceNumber: {
    type: String,
    unique: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
  },
  amount: {
    type: Number,
    required: true,
    default: 3500,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  razorpaySignature: {
    type: String,
  },
  transactionId: {
    type: String,
  },
  registrationDate: Date,
  tournamentDetails: {
    dates: {
      type: String,
      default: '21-23 May 2026',
    },
    venue: {
      type: String,
      default: 'Kuda Futsal Arena, Sports Complex, Dimapur, Nagaland',
    },
    format: {
      type: String,
      default: '6v6 (Direct Knockout)',
    },
    prizePool: {
      type: String,
      default: '₹2,00,000',
    },
  },
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

futsalTournamentRegistrationSchema.pre('save', async function(next) {
  if (this.paymentStatus === 'confirmed' && !this.registrationNumber) {
    const count = await mongoose.model('FutsalTournamentRegistration').countDocuments({ paymentStatus: 'confirmed' });
    this.registrationNumber = `FTT${new Date().getFullYear()}${String(count + 1).padStart(5, '0')}`;
    this.registrationDate = new Date();
    this.status = 'confirmed';
  }
  next();
});

futsalTournamentRegistrationSchema.pre('save', async function(next) {
  if (this.paymentStatus === 'confirmed' && !this.invoiceNumber) {
    const count = await mongoose.model('FutsalTournamentRegistration').countDocuments({ paymentStatus: 'confirmed' });
    this.invoiceNumber = `INV-FTT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('FutsalTournamentRegistration', futsalTournamentRegistrationSchema);
