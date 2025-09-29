const asyncHandler = require('express-async-handler');
const Razorpay = require('razorpay');
const MelitaBooking = require('../models/MelitaBooking');
const Coupon = require('../models/Coupon');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create a Razorpay order
// @route   POST /api/melita/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { amount, product, userId, deliveryAddress, coupon } = req.body;

  const options = {
    amount: amount * 100, // amount in the smallest currency unit
    currency: 'INR',
    receipt: `receipt_order_${new Date().getTime()}`,
  };

  try {
    const order = await razorpay.orders.create(options);

    const melitaBooking = new MelitaBooking({
        user: userId,
        product: product,
        deliveryAddress: deliveryAddress,
        amount: amount,
        ...(coupon ? { coupon } : {}),
        razorpay_order_id: order.id,
        status: 'pending',
    });

    await melitaBooking.save();

    res.status(201).json({ order, melitaBooking });
  } catch (error) {
    res.status(500).json({ message: 'Error creating Razorpay order', error });
  }
});

// @desc    Verify payment and update booking
// @route   POST /api/melita/verify-payment
// @access  Public (Webhook)
const verifyPayment = asyncHandler(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest === req.headers['x-razorpay-signature']) {
    const { order_id, payment_id } = req.body.payload.payment.entity;

    const booking = await MelitaBooking.findOne({ razorpay_order_id: order_id });

    if (booking) {
      booking.razorpay_payment_id = payment_id;
      booking.razorpay_signature = req.headers['x-razorpay-signature'];
      booking.status = 'confirmed';
      await booking.save();

      // If a coupon was used, mark it as used in the database (if it exists)
      if (booking.coupon?.code) {
        const code = String(booking.coupon.code).trim().toUpperCase();
        try {
          const couponDoc = await Coupon.findOne({ code });
          if (couponDoc && couponDoc.status !== 'used') {
            couponDoc.status = 'used';
            couponDoc.usedAt = new Date();
            await couponDoc.save();
          }
        } catch (e) {
          // Log and continue; do not fail webhook on coupon mark-used failure
          console.error('Failed to mark coupon used for Melita:', code, e?.message);
        }
      }

      // TODO: Implement invoice generation and email notification
    }

  } else {
    // Signature mismatch
    return res.status(400).json({ message: 'Invalid signature' });
  }

  res.status(200).json({ status: 'ok' });
});

// @desc    Get all Melita bookings (for admin)
// @route   GET /api/melita/admin/bookings
// @access  Admin
const getAdminBookings = asyncHandler(async (req, res) => {
    const bookings = await MelitaBooking.find().populate('user', 'name email');
    res.json(bookings);
});

// @desc    Get a single Melita booking by ID
// @route   GET /api/melita/bookings/:id
// @access  Private
const getBookingById = asyncHandler(async (req, res) => {
    const booking = await MelitaBooking.findById(req.params.id).populate('user', 'name email');

    if (booking) {
        res.json(booking);
    } else {
        res.status(404);
        throw new Error('Booking not found');
    }
});

module.exports = { createOrder, verifyPayment, getAdminBookings, getBookingById };
