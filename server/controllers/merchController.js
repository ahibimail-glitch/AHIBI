const Razorpay = require('razorpay');
const crypto = require('crypto');
const MerchOrder = require('../models/HornbillMerch');
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

    const razorpay = getRazorpay();

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
      callback_url: process.env.HORNBILL_MERCH_PAYMENT_CALLBACK_URL || `https://ahibi.in/HornbillFestival2025/merch/success?orderId=${order._id}`,
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
        totals
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
    const order = await MerchOrder.findById(orderId).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

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

