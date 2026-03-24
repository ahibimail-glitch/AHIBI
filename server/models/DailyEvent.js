const mongoose = require('mongoose');

const TicketTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ticket type name is required'],
    trim: true
  },
  description: {
    type: String
  },
  price: {
    type: Number,
    required: [true, 'Ticket price is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Ticket quantity is required']
  },
  sold: {
    type: Number,
    default: 0
  },
  capacity: {
    type: Number,
    default: 1,
    required: [true, 'Maximum entries capacity is required']
  },
  benefits: [{
    type: String
  }]
});

const DailyEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    required: true
  },
  description: {
    type: String,
    required: [true, 'Event description is required']
  },
  banner: {
    type: String,
    required: [true, 'Event banner image is required']
  },
  coverImage: {
    type: String,
    default: ''
  },
  gallery: [{
    url: {
      type: String
    },
    caption: {
      type: String
    }
  }],
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizerInfo: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue'
  },
  artists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist'
  }],
  // Duration and timing for daily events
  duration: {
    hours: {
      type: Number,
      required: [true, 'Duration hours is required'],
      min: 0,
      default: 0
    },
    minutes: {
      type: Number,
      required: [true, 'Duration minutes is required'],
      min: 0,
      max: 59,
      default: 0
    }
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required']
  },
  // Date range for the entire month/period
  periodStartDate: {
    type: Date,
    required: [true, 'Period start date is required']
  },
  periodEndDate: {
    type: Date,
    required: [true, 'Period end date is required']
  },
  // Dates when the event will happen (selected dates)
  activeDates: [{
    type: Date,
    required: true
  }],
  // Dates when the event will NOT happen (exclusion dates)
  excludedDates: [{
    type: Date
  }],
  bookingEndTime: {
    type: Date,
    default: null
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    enum: ['Music', 'Comedy', 'Theatre', 'Dance', 'Food', 'Art', 'Sports', 'Business', 'Education', 'Other']
  },
  tags: [{
    type: String
  }],
  ticketTypes: [TicketTypeSchema],
  termsAndConditions: {
    type: String,
    default: ''
  },
  faqs: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    }
  }],
  totalTickets: {
    type: Number,
    default: 0
  },
  ticketsSold: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'cancelled', 'completed', 'paused'],
    default: 'pending'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isSponsored: {
    type: Boolean,
    default: false
  },
  isFreeEvent: {
    type: Boolean,
    default: false
  },
  isExternal: {
    type: Boolean,
    default: false
  },
  externalBookingUrl: {
    type: String
  },
  socialLinks: {
    website: { type: String },
    facebook: { type: String },
    instagram: { type: String },
    twitter: { type: String },
    youtube: { type: String }
  },
  location: {
    address: {
      type: String,
      required: function() {
        return !this.venue && !this.isVirtual;
      }
    },
    city: {
      type: String,
      required: function() {
        return !this.venue && !this.isVirtual;
      }
    },
    state: {
      type: String
    },
    country: {
      type: String,
      default: 'India'
    },
    pincode: {
      type: String
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number]
      }
    }
  },
  isVirtual: {
    type: Boolean,
    default: false
  },
  virtualMeetingLink: {
    type: String
  },
  discounts: [{
    code: {
      type: String,
      required: true
    },
    percentage: {
      type: Number,
      required: true
    },
    maxDiscount: {
      type: Number
    },
    validFrom: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date
    },
    usageLimit: {
      type: Number,
      default: 0
    },
    usageCount: {
      type: Number,
      default: 0
    }
  }],
  convenience: {
    percentage: {
      type: Number,
      default: 5
    },
    fixedAmount: {
      type: Number,
      default: 0
    }
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  paymentStatus: {
    artistsPaid: {
      type: Boolean,
      default: false
    },
    venuePaid: {
      type: Boolean,
      default: false
    },
    organizerPaid: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

DailyEventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.ticketTypes && this.ticketTypes.length) {
    this.totalTickets = this.ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0);
    this.ticketsSold = this.ticketTypes.reduce((sum, ticket) => sum + ticket.sold, 0);
  }
  
  next();
});

DailyEventSchema.methods.calculateAverageRating = async function() {
  if (!this.reviews.length) {
    this.rating = {
      average: 0,
      count: 0
    };
    return;
  }
  
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating = {
    average: (totalRating / this.reviews.length).toFixed(1),
    count: this.reviews.length
  };
};

DailyEventSchema.index({ title: 'text', description: 'text', 'location.city': 'text', category: 'text' });
DailyEventSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('DailyEvent', DailyEventSchema);
