const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: Number,
    required() {
      return this.ownerDocument()?.registrationType !== 'team';
    },
    min: 5,
    max: 99,
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female'],
  },
  phone: {
    type: String,
    required() {
      return this.ownerDocument()?.registrationType !== 'team';
    },
    trim: true,
  },
  email: {
    type: String,
    required() {
      return this.ownerDocument()?.registrationType !== 'team';
    },
    trim: true,
    lowercase: true,
  },
}, { _id: false });

const sportsTournamentRegistrationSchema = new mongoose.Schema({
  tournamentName: {
    type: String,
    default: 'Nagaland Pickleball Classic Tournament 2026',
  },
  registrationType: {
    type: String,
    enum: ['individual', 'team'],
    required: true,
  },
  teamName: {
    type: String,
    trim: true,
  },
  categories: [{
    type: String,
    enum: ['mixed_doubles', 'mens_doubles', 'womens_doubles'],
    required: true,
  }],
  players: {
    type: [playerSchema],
    validate: {
      validator(value) {
        if (!Array.isArray(value) || value.length === 0) {
          return false;
        }

        if (this.registrationType === 'team') {
          return value.length >= 1;
        }

        // For individual registration, validate based on number of categories
        // Each category requires 2 players (all current categories are doubles)
        const categoriesCount = this.categories?.length || 0;
        const expectedPlayers = categoriesCount * 2;
        
        // Allow the expected number of players (2 per category)
        return value.length >= 1 && value.length <= expectedPlayers;
      },
      message(props) {
        if (this.registrationType === 'team') {
          return 'At least one team player entry is required';
        }
        const categoriesCount = this.categories?.length || 0;
        const expectedPlayers = categoriesCount * 2;
        return `Player entries must match selected categories (${expectedPlayers} players for ${categoriesCount} ${categoriesCount === 1 ? 'category' : 'categories'})`;
      },
    },
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
