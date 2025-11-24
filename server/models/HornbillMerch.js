const mongoose = require('mongoose');

const MerchItemSchema = new mongoose.Schema(
  {
    itemId: { type: String },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    variant: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0 },
    image: { type: String }
  },
  { _id: false }
);

const ShippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const PaymentSnapshotSchema = new mongoose.Schema(
  {
    gatewayOrderId: { type: String, index: true },
    paymentLinkId: { type: String, index: true },
    transactionId: { type: String },
    gateway: { type: String, default: 'razorpay' },
    status: {
      type: String,
      enum: ['created', 'pending', 'authorized', 'paid', 'failed', 'refunded'],
      default: 'created'
    },
    amount: { type: Number },
    currency: { type: String, default: 'INR' },
    paymentLink: { type: String },
    notes: { type: mongoose.Schema.Types.Mixed },
    rawResponse: { type: mongoose.Schema.Types.Mixed },
    webhookEvents: { type: [mongoose.Schema.Types.Mixed], default: [] },
    verifiedAt: { type: Date }
  },
  { _id: false }
);

const MerchOrderSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    hornbillCartId: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [MerchItemSchema], default: [] },
    currency: { type: String, default: 'INR' },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    status: {
      type: String,
      enum: ['created', 'pending', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'created',
      index: true
    },
    source: { type: String, default: 'hornbill-merch' },
    metadata: { type: mongoose.Schema.Types.Mixed },
    cartSnapshot: { type: mongoose.Schema.Types.Mixed },
    payment: { type: PaymentSnapshotSchema }
  },
  {
    timestamps: true
  }
);

MerchOrderSchema.index({ sessionId: 1, user: 1 });
MerchOrderSchema.index({ 'payment.gatewayOrderId': 1 });

module.exports = mongoose.model('MerchOrder', MerchOrderSchema);