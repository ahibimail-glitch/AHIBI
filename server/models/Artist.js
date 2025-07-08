const mongoose = require('mongoose');

const ArtistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bio: {
    type: String,
    required: [true, 'Bio is required']
  },
  genres: [{
    type: String,
    required: [true, 'At least one genre is required']
  }],
  languages: [{
    type: String
  }],
  type: {
    type: String,
    required: [true, 'Artist type is required'],
    enum: ['Band', 'Solo', 'DJ', 'Orchestra', 'Comedian', 'Dancer', 'Other']
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required']
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
