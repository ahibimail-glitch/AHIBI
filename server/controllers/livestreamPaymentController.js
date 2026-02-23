/**
 * Livestream Payment Controller
 * Handles Razorpay payments for livestream access
 */

const asyncHandler = require('express-async-handler');
const LivestreamPurchase = require('../models/LivestreamPurchase');
const LiveStream = require('../models/LiveStream');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * @desc    Create order for livestream purchase
 * @route   POST /api/livestream/purchase/create-order
 * @access  Private
 */
const createPurchaseOrder = asyncHandler(async (req, res) => {
  const { livestreamId } = req.body;

  if (!livestreamId) {
    return res.status(400).json({
      success: false,
      message: 'Livestream ID is required'
    });
  }

  // Check if livestream exists and is paid
  const livestream = await LiveStream.findById(livestreamId);

  if (!livestream) {
    return res.status(404).json({
      success: false,
      message: 'Livestream not found'
    });
  }

  if (livestream.accessType !== 'paid') {
    return res.status(400).json({
      success: false,
      message: 'This livestream does not require payment'
    });
  }

  if (livestream.price <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid price for this livestream'
    });
  }

  // Check if user already has valid access
  const existingPurchase = await LivestreamPurchase.findUserValidAccess(req.user._id, livestreamId);
  if (existingPurchase) {
    return res.status(400).json({
      success: false,
      message: 'You already have access to this livestream'
    });
  }

  // Check for pending orders
  const pendingOrder = await LivestreamPurchase.findOne({
    user: req.user._id,
    livestream: livestreamId,
    status: 'pending'
  });

  if (pendingOrder) {
    // Return existing pending order
    return res.json({
      success: true,
      data: {
        orderId: pendingOrder.razorpayOrderId,
        amount: pendingOrder.amount,
        currency: pendingOrder.currency,
        livestream: {
          id: livestream._id,
          title: livestream.title,
          description: livestream.description,
          price: livestream.price
        }
      }
    });
  }

  try {
    // Create Razorpay order
    const shortLivestreamId = livestreamId.toString().slice(-8);
    const shortTimestamp = Date.now().toString().slice(-6);

    const options = {
      amount: livestream.price * 100, // Convert to paise
      currency: 'INR',
      receipt: `ls_${shortLivestreamId}_${shortTimestamp}`,
      notes: {
        livestreamId: livestreamId.toString(),
        userId: req.user._id.toString()
      }
    };

    const order = await razorpay.orders.create(options);

    // Create purchase record
    const purchase = await LivestreamPurchase.create({
      user: req.user._id,
      livestream: livestreamId,
      amount: livestream.price,
      currency: 'INR',
      razorpayOrderId: order.id,
      status: 'pending',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        purchaseId: purchase._id,
        livestream: {
          id: livestream._id,
          title: livestream.title,
          description: livestream.description,
          price: livestream.price
        }
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order'
    });
  }
});

/**
 * @desc    Verify payment and update purchase status
 * @route   POST /api/livestream/purchase/verify
 * @access  Private
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    purchase_id
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: 'Missing payment verification parameters'
    });
  }

  try {
    // Find the purchase record
    const purchase = await LivestreamPurchase.findOne({
      _id: purchase_id,
      razorpayOrderId: razorpay_order_id,
      user: req.user._id,
      status: 'pending'
    }).populate('livestream');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase record not found or already processed'
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Verify payment with Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    }

    // Update purchase record
    purchase.razorpayPaymentId = razorpay_payment_id;
    purchase.razorpaySignature = razorpay_signature;
    purchase.status = 'completed';
    purchase.accessGranted = true;
    await purchase.save();

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        purchaseId: purchase._id,
        accessGranted: true,
        livestream: purchase.livestream
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

/**
 * @desc    Get user's livestream purchases
 * @route   GET /api/livestream/purchase/history
 * @access  Private
 */
const getUserPurchases = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const purchases = await LivestreamPurchase.getUserPurchaseHistory(req.user._id, {
    page: parseInt(page),
    limit: parseInt(limit),
    status
  });

  const total = await LivestreamPurchase.countDocuments({
    user: req.user._id,
    ...(status && { status })
  });

  res.json({
    success: true,
    data: purchases,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Check user access for a livestream
 * @route   GET /api/livestream/purchase/check-access/:livestreamId
 * @access  Private
 */
const checkAccess = asyncHandler(async (req, res) => {
  const { livestreamId } = req.params;

  const livestream = await LiveStream.findById(livestreamId);

  if (!livestream) {
    return res.status(404).json({
      success: false,
      message: 'Livestream not found'
    });
  }

  // Public streams are accessible to all
  if (livestream.accessType === 'public') {
    return res.json({
      success: true,
      hasAccess: true,
      reason: 'public',
      requiresPurchase: false
    });
  }

  // Check for paid access
  if (livestream.accessType === 'paid') {
    const purchase = await LivestreamPurchase.findUserValidAccess(req.user._id, livestreamId);
    
    return res.json({
      success: true,
      hasAccess: !!purchase,
      reason: purchase ? 'paid_access' : 'purchase_required',
      requiresPurchase: !purchase,
      purchase: purchase ? {
        id: purchase._id,
        paymentDate: purchase.paymentDate,
        amount: purchase.amount
      } : null
    });
  }

  // For other access types, check legacy ticket system
  // This would need to be implemented based on your existing ticket system
  res.json({
    success: true,
    hasAccess: false,
    reason: 'access_not_supported',
    requiresPurchase: false
  });
});

/**
 * @desc    Razorpay webhook handler
 * @route   POST /api/livestream/purchase/webhook
 * @access  Public
 */
const handleWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (!signature) {
    return res.status(400).json({
      success: false,
      message: 'Missing webhook signature'
    });
  }

  try {
    // Verify webhook signature
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const { event, payload } = req.body;

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;
      
      default:
        console.log('Unhandled webhook event:', event);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

// Webhook helper functions
async function handlePaymentCaptured(payload) {
  const { order_id, payment_id, notes } = payload;
  
  const purchase = await LivestreamPurchase.findOne({
    razorpayOrderId: order_id,
    status: 'pending'
  });

  if (purchase) {
    purchase.razorpayPaymentId = payment_id;
    purchase.status = 'completed';
    purchase.accessGranted = true;
    await purchase.save();
    console.log(`Payment captured for purchase ${purchase._id}`);
  }
}

async function handlePaymentFailed(payload) {
  const { order_id } = payload;
  
  const purchase = await LivestreamPurchase.findOne({
    razorpayOrderId: order_id,
    status: 'pending'
  });

  if (purchase) {
    purchase.status = 'failed';
    await purchase.save();
    console.log(`Payment failed for purchase ${purchase._id}`);
  }
}

module.exports = {
  createPurchaseOrder,
  verifyPayment,
  getUserPurchases,
  checkAccess,
  handleWebhook
};
