const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true },
    color: { type: String, required: true },
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, trim: true }
  },
  { _id: false }
);

const MerchProductSchema = new mongoose.Schema(
  {
    artist: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    description: { 
      type: String, 
      trim: true 
    },
    price: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    category: { 
      type: String, 
      required: true,
      enum: ['Clothing', 'Accessories', 'Digital', 'Other'],
      default: 'Clothing'
    },
    variants: { 
      type: [VariantSchema], 
      default: [] 
    },
    images: [{ 
      type: String 
    }],
    isActive: { 
      type: Boolean, 
      default: true 
    },
    isDraft: { 
      type: Boolean, 
      default: false 
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
MerchProductSchema.index({ artist: 1, isActive: 1 });
MerchProductSchema.index({ category: 1 });

// Virtual to calculate total stock across all variants
MerchProductSchema.virtual('totalStock').get(function() {
  if (this.variants && this.variants.length > 0) {
    return this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  }
  return 0;
});

// Ensure virtuals are included in JSON
MerchProductSchema.set('toJSON', { virtuals: true });
MerchProductSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MerchProduct', MerchProductSchema);
