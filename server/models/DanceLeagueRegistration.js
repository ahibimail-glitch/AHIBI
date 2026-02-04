const mongoose = require('mongoose');

const danceLeagueRegistrationSchema = new mongoose.Schema({
  // Personal Information
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zip: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  },

  // Registration Details
  registrationType: {
    type: String,
    enum: ['solo', 'group'],
    required: true
  },
  
  // Solo Registration Fields
  danceStyle: [{
    type: String
  }],
  otherStyle: {
    type: String,
    default: ''
  },

  // Group Registration Fields
  groupName: {
    type: String,
    default: ''
  },
  numDancers: {
    type: Number,
    min: 2
  },
  groupDanceStyle: [{
    type: String
  }],
  groupOtherStyle: {
    type: String,
    default: ''
  },

  // Payment Information
  amount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  transactionId: {
    type: String
  },

  // Invoice Information
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  invoicePdf: {
    type: Buffer,
    select: false
  },
  invoicePdfContentType: {
    type: String,
    default: 'application/pdf'
  },
  invoiceGeneratedAt: {
    type: Date
  },
  invoiceUrl: {
    type: String
  },

  // Terms Agreement
  agreedToTerms: {
    type: Boolean,
    required: true,
    default: false
  },

  // Registration Metadata
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  registrationDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Generate registration number before saving
danceLeagueRegistrationSchema.pre('save', async function(next) {
  if (this.paymentStatus === 'confirmed' && !this.registrationNumber) {
    const count = await mongoose.model('DanceLeagueRegistration').countDocuments({ paymentStatus: 'confirmed' });
    this.registrationNumber = `NEDL${new Date().getFullYear()}${String(count + 1).padStart(5, '0')}`;
    this.registrationDate = new Date();
    this.status = 'confirmed';
  }
  next();
});

// Generate invoice number before saving
danceLeagueRegistrationSchema.pre('save', async function(next) {
  if (this.paymentStatus === 'confirmed' && !this.invoiceNumber) {
    const count = await mongoose.model('DanceLeagueRegistration').countDocuments({ paymentStatus: 'confirmed' });
    this.invoiceNumber = `INV-NEDL-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('DanceLeagueRegistration', danceLeagueRegistrationSchema);
