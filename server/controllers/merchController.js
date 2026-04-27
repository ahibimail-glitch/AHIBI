const Razorpay = require('razorpay');
const crypto = require('crypto');
const MerchOrder = require('../models/ArtistMerch');
const MerchProduct = require('../models/MerchProduct');
const User = require('../models/User');
const { fetchCartBySession } = require('../services/hornbillMerchService');
const emailService = require('../services/emailService');

const DEFAULT_TAX_RATE = Number(process.env.HORNBILL_MERCH_TAX_RATE ?? 0);
const FREE_SHIPPING_THRESHOLD = Number(process.env.HORNBILL_MERCH_FREE_SHIPPING ?? 3000);
const STANDARD_SHIPPING_FEE = Number(process.env.HORNBILL_MERCH_SHIPPING_FEE ?? 0);

let razorpayInstance;
const getRazorpay = () => {
  if (razorpayInstance) return razorpayInstance;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials are not configured');
  }

  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  return razorpayInstance;
};

const roundCurrency = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

const computeTotals = (items = []) => {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const tax = items.reduce((sum, item) => {
    const rate = typeof item.taxRate === 'number' ? item.taxRate : DEFAULT_TAX_RATE;
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0) * rate;
  }, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const total = subtotal + tax + shipping;

  return {
    subtotal: roundCurrency(subtotal),
    tax: roundCurrency(tax),
    shipping: roundCurrency(shipping),
    total: roundCurrency(total)
  };
};

const validateShippingAddress = (address = {}) => {
  const errors = {};

  if (!address.fullName?.trim()) errors.fullName = 'Full name is required';
  if (!address.phone?.trim()) {
    errors.phone = 'Phone is required';
  } else if (!/^\+?[0-9]{10,15}$/.test(address.phone.trim())) {
    errors.phone = 'Enter a valid phone number';
  }
  if (!address.addressLine1?.trim()) errors.addressLine1 = 'Address line 1 is required';
  if (!address.city?.trim()) errors.city = 'City is required';
  if (!address.state?.trim()) errors.state = 'State is required';
  if (!address.postalCode?.trim()) errors.postalCode = 'Postal code is required';
  if (!address.country?.trim()) errors.country = 'Country is required';

  return { isValid: Object.keys(errors).length === 0, errors };
};

exports.getCartBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const cart = await fetchCartBySession(sessionId);
    const totals = computeTotals(cart.items);

    return res.json({
      success: true,
      data: {
        sessionId: cart.sessionId,
        currency: cart.currency,
        items: cart.items,
        notes: cart.notes,
        totals,
        fetchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Merch] Failed to fetch cart session:', {
      sessionId: req.params.sessionId,
      error: error.message,
      stack: error.stack
    });

    // Check if it's a configuration error (should be 500, not 502)
    if (error.message.includes('not configured') || error.message.includes('environment variable')) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error. Please contact support.'
      });
    }

    // Check if it's a client error (400)
    if (error.message.includes('required') || error.message.includes('empty')) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid cart session'
      });
    }

    // Default to 502 for external API errors
    return res.status(502).json({
      success: false,
      message: error.message || 'Unable to fetch Hornbill cart at the moment. Please try again.'
    });
  }
};

// Explicit sync endpoint to update payment status from Razorpay using callback params
exports.syncPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      paymentLinkId,
      paymentId,
      paymentStatus,
    } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const order = await MerchOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const razorpay = getRazorpay();

    // Prefer live status from Razorpay over client-provided status
    let linkEntity = null;
    let paymentEntity = null;

    if (paymentLinkId || order.payment?.paymentLinkId) {
      const id = paymentLinkId || order.payment.paymentLinkId;
      try {
        linkEntity = await razorpay.paymentLink.fetch(id);
      } catch (e) {
        console.error('[Merch] Failed to fetch payment link for sync:', e.message);
      }
    }

    if (!linkEntity && (paymentId || order.payment?.transactionId)) {
      const id = paymentId || order.payment.transactionId;
      try {
        paymentEntity = await razorpay.payments.fetch(id);
      } catch (e) {
        console.error('[Merch] Failed to fetch payment for sync:', e.message);
      }
    }

    const finalStatus =
      linkEntity?.status ||
      paymentEntity?.status ||
      paymentStatus ||
      order.payment?.status;

    const isPaid =
      finalStatus === 'paid' ||
      finalStatus === 'captured' ||
      linkEntity?.status === 'paid';

    if (!isPaid) {
      return res.json({
        success: true,
        data: order,
        message: 'Payment not marked as paid by Razorpay yet',
      });
    }

    const wasPaid = order.status === 'paid';
    order.status = 'paid';
    order.payment = {
      ...(order.payment || {}),
      gatewayOrderId: linkEntity?.order_id || order.payment?.gatewayOrderId,
      paymentLinkId: linkEntity?.id || order.payment?.paymentLinkId,
      transactionId: paymentEntity?.id || paymentId || order.payment?.transactionId,
      status: finalStatus || order.payment?.status,
      amount:
        typeof (paymentEntity?.amount) === 'number'
          ? roundCurrency(paymentEntity.amount / 100)
          : order.payment?.amount,
      currency: paymentEntity?.currency || linkEntity?.currency || order.payment?.currency,
      paymentLink: order.payment?.paymentLink,
      rawResponse: paymentEntity || linkEntity || order.payment?.rawResponse,
      verifiedAt: new Date(),
      webhookEvents: order.payment?.webhookEvents || [],
    };

    await order.save();

    // Optionally send email if this is the first time we mark it paid
    if (!wasPaid) {
      try {
        const populatedOrder = await MerchOrder.findById(order._id).populate('user', 'name email');
        if (populatedOrder && populatedOrder.user) {
          await emailService.sendMerchOrderConfirmation(populatedOrder);
          console.log(`[Merch] Order confirmation email sent (sync) for order ${order._id}`);
        }
      } catch (emailError) {
        console.error('[Merch] Failed to send order confirmation email (sync):', emailError);
      }
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('[Merch] Failed to sync payment status', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync payment status',
    });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { sessionId, shippingAddress, source, metadata } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    const { isValid, errors } = validateShippingAddress(shippingAddress);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipping address',
        errors
      });
    }

    const cart = await fetchCartBySession(sessionId);
    if (!cart.items.length) {
      return res.status(400).json({ success: false, message: 'Cart is empty. Please add merch items again.' });
    }

    const totals = computeTotals(cart.items);
    if (totals.total <= 0) {
      return res.status(400).json({ success: false, message: 'Unable to compute payable amount for this cart.' });
    }

    const order = new MerchOrder({
      sessionId: cart.sessionId || sessionId,
      hornbillCartId: cart.raw?.cartId || cart.raw?.id,
      user: req.user?._id,
      items: cart.items.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        sku: item.sku,
        variant: item.variant,
        quantity: item.quantity,
        price: item.price,
        taxRate: typeof item.taxRate === 'number' ? item.taxRate : DEFAULT_TAX_RATE,
        image: item.image
      })),
      currency: cart.currency || 'INR',
      subtotal: totals.subtotal,
      tax: totals.tax,
      shipping: totals.shipping,
      total: totals.total,
      shippingAddress,
      status: 'pending',
      source: source || 'hornbill-merch',
      metadata: metadata || {},
      cartSnapshot: cart.raw
    });
    const accessToken = order.accessToken || crypto.randomBytes(24).toString('hex');
    order.accessToken = accessToken;

    const razorpay = getRazorpay();

    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://ahibi.in';

    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(totals.total * 100),
      currency: cart.currency || 'INR',
      description: 'Hornbill merch checkout',
      customer: {
        name: shippingAddress.fullName || req.user?.name,
        contact: shippingAddress.phone || req.user?.phone,
        email: req.user?.email
      },
      notes: {
        merchOrderId: order._id.toString(),
        sessionId: cart.sessionId,
        source: source || 'hornbill-merch',
        userId: req.user?._id?.toString()
      },
      reminder_enable: true,
      callback_url:
        process.env.HORNBILL_MERCH_PAYMENT_CALLBACK_URL ||
        `${frontendBaseUrl}/HornbillFestival2025/merch/success?orderId=${order._id}&accessToken=${accessToken}`,
      callback_method: 'get'
    });

    order.payment = {
      gatewayOrderId: paymentLink.order_id,
      paymentLinkId: paymentLink.id,
      status: paymentLink.status,
      amount: roundCurrency(paymentLink.amount / 100),
      currency: paymentLink.currency,
      paymentLink: paymentLink.short_url,
      notes: paymentLink.notes,
      rawResponse: paymentLink
    };

    await order.save();

    return res.status(201).json({
      success: true,
      message: 'Merch order created',
      data: {
        orderId: order._id,
        paymentLink: paymentLink.short_url,
        paymentLinkId: paymentLink.id,
        paymentStatus: paymentLink.status,
        totals,
        accessToken
      }
    });
  } catch (error) {
    console.error('[Merch] Failed to create order', error);
    return res.status(502).json({
      success: false,
      message: error?.message || 'Unable to create merch order right now'
    });
  }
};

exports.createCheckoutOrder = async (req, res) => {
  try {
    const { items = [], shippingAddress, source, metadata } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required' });
    }

    const { isValid, errors } = validateShippingAddress(shippingAddress);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipping address',
        errors
      });
    }

    const productIds = items.map((item) => item?.productId).filter(Boolean);
    const products = await MerchProduct.find({ _id: { $in: productIds }, isActive: true, isDraft: false });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    const normalizedItems = [];
    for (const item of items) {
      const product = productMap.get(String(item.productId));
      const quantity = Number(item.quantity) || 0;

      if (!product || quantity <= 0) {
        continue;
      }

      const variant = [item.size, item.color].filter(Boolean).join(' / ');

      normalizedItems.push({
        itemId: product._id.toString(),
        name: product.name,
        sku: item.sku || undefined,
        variant: variant || undefined,
        quantity,
        price: Number(product.price) || 0,
        taxRate: DEFAULT_TAX_RATE,
        image: product.images?.[0]
      });
    }

    if (!normalizedItems.length) {
      return res.status(400).json({
        success: false,
        message: 'No valid cart items were found. Please refresh and try again.'
      });
    }

    const totals = computeTotals(normalizedItems);
    if (totals.total <= 0) {
      return res.status(400).json({ success: false, message: 'Unable to compute payable amount for this cart.' });
    }

    const order = new MerchOrder({
      sessionId: `local-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      user: req.user?._id,
      items: normalizedItems,
      currency: 'INR',
      subtotal: totals.subtotal,
      tax: totals.tax,
      shipping: totals.shipping,
      total: totals.total,
      shippingAddress,
      status: 'pending',
      source: source || 'artist-merch',
      metadata: metadata || {}
    });

    const razorpay = getRazorpay();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totals.total * 100),
      currency: 'INR',
      receipt: `merch_${order._id.toString().slice(-10)}`,
      notes: {
        merchOrderId: order._id.toString(),
        userId: req.user?._id?.toString(),
        source: source || 'artist-merch'
      }
    });

    order.payment = {
      gatewayOrderId: razorpayOrder.id,
      status: 'created',
      amount: roundCurrency(razorpayOrder.amount / 100),
      currency: razorpayOrder.currency,
      notes: razorpayOrder.notes,
      rawResponse: razorpayOrder
    };

    await order.save();

    return res.status(201).json({
      success: true,
      message: 'Checkout order created',
      data: {
        merchOrderId: order._id,
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency
        },
        totals
      }
    });
  } catch (error) {
    console.error('[Merch] Failed to create checkout order', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout order'
    });
  }
};

exports.verifyCheckoutPayment = async (req, res) => {
  try {
    const { merchOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!merchOrderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment fields'
      });
    }

    const order = await MerchOrder.findById(merchOrderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user?.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (order.payment?.gatewayOrderId && order.payment.gatewayOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'Order ID mismatch' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const razorpay = getRazorpay();
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    const paymentStatus = payment?.status || 'authorized';
    const isPaid = paymentStatus === 'captured' || paymentStatus === 'authorized';
    const wasPaid = order.status === 'paid';

    order.status = isPaid ? 'paid' : order.status;
    order.payment = {
      ...(order.payment || {}),
      gatewayOrderId: razorpay_order_id,
      transactionId: razorpay_payment_id,
      status: isPaid ? 'paid' : order.payment?.status,
      amount: typeof payment?.amount === 'number' ? roundCurrency(payment.amount / 100) : order.payment?.amount,
      currency: payment?.currency || order.payment?.currency || 'INR',
      rawResponse: payment,
      verifiedAt: isPaid ? new Date() : order.payment?.verifiedAt
    };

    await order.save();

    if (isPaid && !wasPaid) {
      try {
        const populatedOrder = await MerchOrder.findById(order._id).populate('user', 'name email');
        if (populatedOrder && populatedOrder.user) {
          await emailService.sendMerchOrderConfirmation(populatedOrder);
        }
      } catch (emailError) {
        console.error('[Merch] Failed to send checkout confirmation email:', emailError);
      }
    }

    return res.json({
      success: true,
      message: isPaid ? 'Payment verified successfully' : 'Payment verification completed',
      data: order
    });
  } catch (error) {
    console.error('[Merch] Failed to verify checkout payment', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify checkout payment'
    });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 50, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } },
        { sessionId: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await MerchOrder.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await MerchOrder.countDocuments(query);

    return res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('[Merch] Failed to fetch orders', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders'
    });
  }
};

exports.getArtistOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 50, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const artistProducts = await MerchProduct.find({ artist: req.user._id }).select('_id');
    const artistProductIds = artistProducts.map((product) => product._id.toString());

    if (!artistProductIds.length) {
      return res.json({
        success: true,
        data: {
          orders: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            pages: 0
          }
        }
      });
    }

    const query = {
      'items.itemId': { $in: artistProductIds }
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } },
        { sessionId: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await MerchOrder.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await MerchOrder.countDocuments(query);

    return res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('[Merch] Failed to fetch artist orders', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch artist orders'
    });
  }
};

exports.updateArtistOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body || {};

    const allowedStatuses = ['created', 'paid', 'shipped', 'delivered', 'failed', 'cancelled', 'refunded'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const artistProducts = await MerchProduct.find({ artist: req.user._id }).select('_id');
    const artistProductIds = artistProducts.map((product) => product._id.toString());

    if (!artistProductIds.length) {
      return res.status(403).json({
        success: false,
        message: 'No products found for this artist'
      });
    }

    const order = await MerchOrder.findOne({
      _id: orderId,
      'items.itemId': { $in: artistProductIds }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this artist'
      });
    }

    order.status = status;
    await order.save();

    return res.json({
      success: true,
      message: 'Order status updated',
      data: order
    });
  } catch (error) {
    console.error('[Merch] Failed to update artist order status', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update order status'
    });
  }
};

exports.getOrderStats = async (req, res) => {
  try {
    const stats = await MerchOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0] } }
        }
      }
    ]);

    const totalOrders = await MerchOrder.countDocuments();
    const paidOrders = await MerchOrder.countDocuments({ status: 'paid' });
    const pendingOrders = await MerchOrder.countDocuments({ status: 'pending' });
    const failedOrders = await MerchOrder.countDocuments({ status: 'failed' });

    const totalRevenue = await MerchOrder.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    return res.json({
      success: true,
      data: {
        totalOrders,
        paidOrders,
        pendingOrders,
        failedOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusBreakdown: stats
      }
    });
  } catch (error) {
    console.error('[Merch] Failed to fetch order stats', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order stats'
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const accessToken = req.query.accessToken || req.headers['x-merch-access-token'];
    let order;

    if (req.user) {
      order = await MerchOrder.findById(orderId).populate('user', 'name email phone');
    } else if (accessToken) {
      order = await MerchOrder.findOne({ _id: orderId, accessToken }).populate('user', 'name email phone');
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication or access token required'
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (req.user) {
      // Check if user owns this order or is admin
      const userId = req.user?._id?.toString();
      const orderUserId = order.user?._id?.toString();
      const isAdmin = req.user?.role === 'admin';

      if (userId !== orderUserId && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    return res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('[Merch] Failed to fetch order', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order'
    });
  }
};

exports.razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || req.body;

    if (!secret) {
      return res.status(500).send('Webhook secret missing');
    }

    const payloadBuffer = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));

    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadBuffer).digest('hex');
    if (expectedSignature !== signature) {
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(payloadBuffer.toString('utf8'));
    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;
    const paymentLinkEntity = event.payload?.payment_link?.entity;

    const paymentLinkId = paymentLinkEntity?.id || paymentEntity?.payment_link_id;
    const gatewayOrderId = paymentEntity?.order_id || paymentLinkEntity?.order_id;
    const transactionId = paymentEntity?.id;

    const lookup = [];
    if (paymentLinkId) lookup.push({ 'payment.paymentLinkId': paymentLinkId });
    if (gatewayOrderId) lookup.push({ 'payment.gatewayOrderId': gatewayOrderId });
    if (paymentLinkEntity?.notes?.merchOrderId) lookup.push({ _id: paymentLinkEntity.notes.merchOrderId });
    if (paymentEntity?.notes?.merchOrderId) lookup.push({ _id: paymentEntity.notes.merchOrderId });

    const order = lookup.length
      ? await MerchOrder.findOne({ $or: lookup })
      : null;

    if (!order) {
      return res.json({ status: 'ignored' });
    }

    const paymentStatus = paymentEntity?.status || paymentLinkEntity?.status;
    const isPaid =
      eventType === 'payment_link.paid' ||
      eventType === 'payment.captured' ||
      paymentStatus === 'paid' ||
      paymentStatus === 'captured';

    const wasPaid = order.status === 'paid';
    order.status = isPaid ? 'paid' : order.status;
    order.payment = {
      ...(order.payment || {}),
      gatewayOrderId,
      paymentLinkId,
      transactionId,
      status: paymentStatus || order.payment?.status,
      amount: paymentEntity?.amount ? roundCurrency(paymentEntity.amount / 100) : order.payment?.amount,
      currency: paymentEntity?.currency || order.payment?.currency,
      paymentLink: order.payment?.paymentLink,
      rawResponse: paymentEntity || paymentLinkEntity,
      verifiedAt: isPaid ? new Date() : order.payment?.verifiedAt,
      webhookEvents: [...(order.payment?.webhookEvents || []), event]
    };

    await order.save();

    // Send confirmation email if order was just paid
    if (isPaid && !wasPaid) {
      try {
        const populatedOrder = await MerchOrder.findById(order._id).populate('user', 'name email');
        if (populatedOrder && populatedOrder.user) {
          await emailService.sendMerchOrderConfirmation(populatedOrder);
          console.log(`[Merch] Order confirmation email sent for order ${order._id}`);
        }
      } catch (emailError) {
        console.error('[Merch] Failed to send order confirmation email:', emailError);
        // Don't fail the webhook if email fails
      }
    }

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('[Merch] Webhook processing failed', error);
    return res.status(500).send('Server error');
  }
};

// ==================== Merch Product Controllers ====================

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category, variants, images, isDraft } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required'
      });
    }

    const product = new MerchProduct({
      artist: req.user._id,
      name,
      description,
      price: Number(price),
      category,
      variants: variants || [],
      images: images || [],
      isDraft: isDraft || false
    });

    await product.save();

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('[Merch] Failed to create product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create product'
    });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { artistId, category, isActive, isDraft, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {};
    
    if (artistId) {
      query.artist = artistId;
    } else if (req.user?.role === 'artist') {
      query.artist = req.user._id;
    }

    if (category) {
      query.category = category;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (isDraft !== undefined) {
      query.isDraft = isDraft === 'true';
    }

    const products = await MerchProduct.find(query)
      .populate('artist', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await MerchProduct.countDocuments(query);

    return res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('[Merch] Failed to fetch products:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch products'
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await MerchProduct.findById(productId).populate('artist', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user owns this product or is admin
    if (req.user?.role === 'artist' && product.artist._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    return res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('[Merch] Failed to fetch product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch product'
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, description, price, category, variants, images, isActive, isDraft } = req.body;

    const product = await MerchProduct.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user owns this product
    if (product.artist.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (category !== undefined) product.category = category;
    if (variants !== undefined) product.variants = variants;
    if (images !== undefined) product.images = images;
    if (isActive !== undefined) product.isActive = isActive;
    if (isDraft !== undefined) product.isDraft = isDraft;

    await product.save();

    return res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('[Merch] Failed to update product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update product'
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await MerchProduct.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user owns this product
    if (product.artist.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await MerchProduct.findByIdAndDelete(productId);

    return res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('[Merch] Failed to delete product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete product'
    });
  }
};
