const mongoose = require('mongoose');

const ArtistBookingSchema = new mongoose.Schema({
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: true
  },
  event: {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    duration: {
      type: Number // in hours
    },
    venue: {
      name: {
        type: String,
        required: true
      },
      address: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String
      },
      pincode: {
        type: String
      }
    },
    eventType: {
      type: String,
      enum: ['wedding', 'corporate', 'private_party', 'concert', 'festival', 'birthday', 'anniversary', 'other'],
      required: true
    },
    expectedAudience: {
      type: Number
    }
  },
  booking: {
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'counter_offered', 'confirmed', 'completed', 'cancelled'],
      default: 'pending'
    },
    requestedAmount: {
      type: Number,
      required: true
    },
    finalAmount: {
      type: Number
    },
    advanceAmount: {
      type: Number
    },
    remainingAmount: {
      type: Number
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'advance_paid', 'fully_paid', 'refunded'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'upi', 'card', 'cheque']
    },
    paymentOrderId: {
      type: String // Razorpay order ID
    },
    paymentDetails: {
      paymentId: {
        type: String // Razorpay payment ID
      },
      orderId: {
        type: String // Razorpay order ID
      },
      signature: {
        type: String // Razorpay signature
      },
      paymentGateway: {
        type: String,
        default: 'razorpay'
      }
    }
  },
  contract: {
    termsAccepted: {
      type: Boolean,
      default: false
    },
    artistTerms: {
      type: String // Artist's custom terms for this booking
    },
    organizerRequirements: {
      type: String
    },
    specialRequirements: {
      type: String
    },
    cancellationPolicy: {
      type: String
    },
    contractDocument: {
      type: String // URL to signed contract document
    }
  },
  communication: {
    messages: [{
      sender: {
        type: String,
        enum: ['artist', 'organizer', 'admin'],
        required: true
      },
      message: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      isRead: {
        type: Boolean,
        default: false
      }
    }],
    counterOffer: {
      amount: {
        type: Number
      },
      message: {
        type: String
      },
      timestamp: {
        type: Date
      }
    }
  },
  timeline: [{
    action: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: String,
      enum: ['artist', 'organizer', 'admin'],
      required: true
    },
    details: {
      type: String
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
ArtistBookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add timeline entry method
ArtistBookingSchema.methods.addTimelineEntry = function(action, performedBy, details) {
  this.timeline.push({
    action,
    performedBy,
    details,
    timestamp: new Date()
  });
};

// Calculate remaining amount
ArtistBookingSchema.methods.calculateRemainingAmount = function() {
  if (this.booking.finalAmount && this.booking.advanceAmount) {
    this.booking.remainingAmount = this.booking.finalAmount - this.booking.advanceAmount;
  }
};

module.exports = mongoose.model('ArtistBooking', ArtistBookingSchema);
