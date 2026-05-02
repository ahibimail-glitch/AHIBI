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
  },
  idNumber: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

const futsalTournamentRegistrationSchema = new mongoose.Schema({
  tournamentName: {
    type: String,
    default: 'Turf Titans Tournament T3',
  },
  teamName: {
    type: String,
    required: true,
    trim: true,
  },
  players: {
    type: [playerSchema],
    required: true,
    validate: {
      validator: function(players) {
        return players.length >= 6 && players.length <= 10;
      },
      message: 'Team must have between 6 and 10 players',
    },
  },
  teamManager: {
    fullName: String,
    phone: String,
    email: String,
  },
  teamCoach: {
    fullName: String,
    phone: String,
    email: String,
  },
  captainId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'players._id',
  },
  declarationsAccepted: {
    type: Boolean,
    required: true,
    default: false,
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
