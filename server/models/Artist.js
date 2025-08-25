const mongoose = require('mongoose');

const ArtistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  bio: {
    type: String
  },
  genres: [{
    type: String
  }],
  languages: [{
    type: String
  }],
  type: {
    type: String,
    enum: ['musician', 'singer', 'dj', 'comedian', 'dancer', 'performer', 'band', 'magician', 'speaker', 'other', 'Band', 'Solo', 'DJ', 'Orchestra', 'Comedian', 'Dancer', 'Other']
  },
  experience: {
    type: String,
    enum: ['beginner', 'intermediate', 'experienced', 'expert']
  },
  basePrice: {
    type: Number
  },
  customPricing: {
    hourlyRate: {
      type: Number
    },
    fullDayRate: {
      type: Number
    },
    specialEventRate: {
      type: Number
    }
  },
  gallery: {
    photos: [{
      url: {
        type: String
      },
      caption: {
        type: String
      }
    }],
    videos: [{
      url: {
        type: String
      },
      thumbnail: {
        type: String
      },
      caption: {
        type: String
      }
    }]
  },
  socialLinks: {
    instagram: {
      type: String
    },
    youtube: {
      type: String
    },
    spotify: {
      type: String
    },
    facebook: {
      type: String
    },
    twitter: {
      type: String
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
ArtistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate average rating when a new review is added
ArtistSchema.methods.calculateAverageRating = async function() {
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

module.exports = mongoose.model('Artist', ArtistSchema);
