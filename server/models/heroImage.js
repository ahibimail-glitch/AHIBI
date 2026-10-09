const mongoose = require('mongoose');

const heroImageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: false,
    trim: true
  },
  description: {
    type: String,
    required: false,
    trim: true
  },
  public_id: {
    type: String,
    required: false
  },
  url: {
    type: String,
    required: false
  },
  mobilePublic_id: {
    type: String,
    required: false
  },
  mobileUrl: {
    type: String,
    required: false
  },
  width: {
    type: Number,
    required: false
  },
  height: {
    type: Number,
    required: false
  },
  order: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

heroImageSchema.pre('save', function(next) {
  if (!this.url && !this.mobileUrl) {
    next(new Error('At least one image (desktop or mobile) must be provided.'));
  } else {
    next();
  }
});

const HeroImage = mongoose.model('HeroImage', heroImageSchema);

module.exports = HeroImage;
