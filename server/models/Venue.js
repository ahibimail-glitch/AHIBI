const mongoose = require('mongoose');

const VenueSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Venue name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
    },
    landmark: {
      type: String
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required']
  },
  facilities: {
    parking: {
      type: Boolean,
      default: false
    },
    ac: {
      type: Boolean,
      default: false
    },
    petFriendly: {
      type: Boolean,
      default: false
    },
    catering: {
      type: Boolean,
      default: false
    },
    accessible: {
      type: Boolean,
      default: false
    },
    wifi: {
      type: Boolean,
      default: false
    },
    soundSystem: {
      type: Boolean,
      default: false
    },
    lighting: {
      type: Boolean,
      default: false
    },
    security: {
      type: Boolean,
      default: false
    },
    alcohol: {
      type: Boolean,
      default: false
    }
  },
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required']
    },
    hourlyRate: {
      type: Number
    },
    fullDayRate: {
      type: Number
    },
    cleaningFee: {
      type: Number,
      default: 0
    },
    securityDeposit: {
      type: Number,
      default: 0
    }
  },
  gallery: [{
    url: {
      type: String
    },
    caption: {
      type: String
    },
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Contact phone is required']
    },
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    website: {
      type: String
    }
  },
  availability: [{
    date: {
      type: Date,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    note: {
      type: String
    }
  }],
  terms: {
    cancellationPolicy: {
      type: String
    },
    additionalRules: {
      type: String
    }
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
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
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
VenueSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate average rating when a new review is added
VenueSchema.methods.calculateAverageRating = async function() {
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

module.exports = mongoose.model('Venue', VenueSchema);
