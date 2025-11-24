const Razorpay = require('razorpay');
const crypto = require('crypto');
const MerchOrder = require('../models/HornbillMerch');
const { fetchCartBySession } = require('../services/hornbillMerchService');

const DEFAULT_TAX_RATE = Number(process.env.HORNBILL_MERCH_TAX_RATE ?? 0.12);
const FREE_SHIPPING_THRESHOLD = Number(process.env.HORNBILL_MERCH_FREE_SHIPPING ?? 3000);
const STANDARD_SHIPPING_FEE = Number(process.env.HORNBILL_MERCH_SHIPPING_FEE ?? 199);

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
    console.error('[Merch] Failed to fetch cart session', error.message);
    return res.status(502).json({
      success: false,
      message: error.message || 'Unable to fetch Hornbill cart at the moment'
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
      callback_url: process.env.HORNBILL_MERCH_PAYMENT_CALLBACK_URL || 'https://ahibi.in/payments/processing',
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

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('[Merch] Webhook processing failed', error);
    return res.status(500).send('Server error');
  }
};

