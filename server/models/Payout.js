const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema({
  // Arena Partner Reference
  arenaPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArenaPartner',
    required: [true, 'Arena partner is required']
  },
  
  // Payout Period
  period: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  
  // Bookings included in this payout
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SportsBooking'
  }],
  
  // Financial Breakdown
  financials: {
    // Total revenue from bookings
    totalRevenue: {
      type: Number,
      required: true,
      default: 0
    },
    
    // Platform commission
    platformCommission: {
      type: Number,
      required: true,
      default: 0
    },
    
    // Commission rate applied
    commissionRate: {
      type: Number,
      required: true
    },
    
    // Taxes (GST, TDS, etc.)
    taxes: {
      gst: {
        type: Number,
        default: 0
      },
      tds: {
        type: Number,
        default: 0
      },
      total: {
        type: Number,
        default: 0
      }
    },
    
    // Adjustments (refunds, chargebacks, bonuses)
    adjustments: {
      refunds: {
        type: Number,
        default: 0
      },
      chargebacks: {
        type: Number,
        default: 0
      },
      bonuses: {
        type: Number,
        default: 0
      },
      penalties: {
        type: Number,
        default: 0
      },
      total: {
        type: Number,
        default: 0
      }
    },
    
    // Net payout amount
    netAmount: {
      type: Number,
      required: true
    }
  },
  
  // Bank Details (snapshot at time of payout)
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    branchName: String
  },
  
  // Payout Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Transaction Details
  transaction: {
    transactionId: {
      type: String,
      unique: true,
      sparse: true
    },
    utr: {
      type: String
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'upi', 'wallet', 'cheque'],
      default: 'bank_transfer'
    },
    processedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  
  // Invoice
  invoiceNumber: {
    type: String,
    unique: true
  },
  invoiceUrl: {
    type: String
  },
  
  // Failure Details
  failure: {
    reason: String,
    attempts: {
      type: Number,
      default: 0
    },
    lastAttemptAt: Date
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  },
  
  // Admin Actions
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Notifications
  notifications: {
    payoutInitiated: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    },
    payoutCompleted: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    },
    payoutFailed: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  scheduledAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp before saving
PayoutSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate invoice number before saving
PayoutSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Payout').countDocuments();
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    this.invoiceNumber = `AHIBI-PAYOUT-${year}${month}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Generate transaction ID before processing
PayoutSchema.pre('save', async function(next) {
  if (this.status === 'processing' && !this.transaction.transactionId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.transaction.transactionId = `TXN${timestamp}${random}`;
  }
  next();
});

// Static method to calculate payout for arena partner
PayoutSchema.statics.calculatePayout = async function(arenaPartnerId, startDate, endDate) {
  const SportsBooking = mongoose.model('SportsBooking');
  const ArenaPartner = mongoose.model('ArenaPartner');
  
  const arenaPartner = await ArenaPartner.findById(arenaPartnerId);
  if (!arenaPartner) {
    throw new Error('Arena partner not found');
  }
  
  // Get all completed bookings in the period
  const bookings = await SportsBooking.find({
    arenaPartner: arenaPartnerId,
    status: { $in: ['completed', 'confirmed'] },
    'payment.paymentStatus': 'completed',
    bookingDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  });
  
  // Calculate totals
  let totalRevenue = 0;
  let platformCommission = 0;
  
  bookings.forEach(booking => {
    totalRevenue += booking.pricing.totalAmount;
    platformCommission += booking.pricing.platformCommission;
  });
  
  // Calculate taxes (example: 18% GST on commission, 10% TDS)
  const gst = Math.round(platformCommission * 0.18);
  const tds = Math.round((totalRevenue - platformCommission) * 0.10);
  const totalTaxes = gst + tds;
  
  // Calculate net amount
  const arenaEarnings = totalRevenue - platformCommission;
  const netAmount = arenaEarnings - tds;
  
  return {
    bookings: bookings.map(b => b._id),
    totalRevenue,
    platformCommission,
    commissionRate: arenaPartner.commissionSettings.commissionRate,
    taxes: {
      gst,
      tds,
      total: totalTaxes
    },
    netAmount
  };
};

// Static method to create scheduled payouts
PayoutSchema.statics.createScheduledPayouts = async function(frequency = 'weekly') {
  const ArenaPartner = mongoose.model('ArenaPartner');
  
  const approvedPartners = await ArenaPartner.find({
    approvalStatus: 'approved',
    isActive: true
  });
  
  const now = new Date();
  let startDate, endDate;
  
  if (frequency === 'weekly') {
    // Last 7 days
    endDate = new Date(now);
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (frequency === 'monthly') {
    // Last month
    endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }
  
  const payouts = [];
  
  for (const partner of approvedPartners) {
    try {
      const payoutData = await this.calculatePayout(partner._id, startDate, endDate);
      
      // Only create payout if there's revenue
      if (payoutData.totalRevenue > 0) {
        const payout = await this.create({
          arenaPartner: partner._id,
          period: {
            startDate,
            endDate
          },
          bookings: payoutData.bookings,
          financials: {
            totalRevenue: payoutData.totalRevenue,
            platformCommission: payoutData.platformCommission,
            commissionRate: payoutData.commissionRate,
            taxes: payoutData.taxes,
            adjustments: {
              refunds: 0,
              chargebacks: 0,
              bonuses: 0,
              penalties: 0,
              total: 0
            },
            netAmount: payoutData.netAmount
          },
          bankDetails: partner.bankDetails,
          status: 'pending',
          scheduledAt: now
        });
        
        payouts.push(payout);
      }
    } catch (error) {
      console.error(`Error creating payout for partner ${partner._id}:`, error);
    }
  }
  
  return payouts;
};

// Indexes for efficient querying
PayoutSchema.index({ arenaPartner: 1, status: 1 });
PayoutSchema.index({ status: 1, scheduledAt: 1 });
PayoutSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
PayoutSchema.index({ invoiceNumber: 1 });
PayoutSchema.index({ 'transaction.transactionId': 1 });

module.exports = mongoose.model('Payout', PayoutSchema);
