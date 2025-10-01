const asyncHandler = require('express-async-handler');
const Razorpay = require('razorpay');
const MelitaBooking = require('../models/MelitaBooking');
const Coupon = require('../models/Coupon');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Local helper: generate a user-friendly unique coupon code (AAA-BBBB-CCCC)
function generateUniqueCode() {
  const segments = [];
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    segments.push(segment);
  }
  return segments.join('-');
}

async function createAhibiFestCoupon(discountPercentage) {
  const Event = require('../models/Event');
  const Coupon = require('../models/Coupon');
  // Find the AHIBI Fest event by title
  const event = await Event.findById("68c2c33eb6ef88c76f50ce7c").select('title ticketTypes');
  if (!event) return null;
  const category = 'General Admission';
  const hasCategory = (event.ticketTypes || []).some(t => t.name === category);
  if (!hasCategory) return null;

  // ensure unique code
  let code;
  for (let attempts = 0; attempts < 5; attempts++) {
    code = generateUniqueCode();
    const exists = await Coupon.findOne({ code });
    if (!exists) break;
    code = undefined;
  }
  if (!code) return null;

  const coupon = await Coupon.create({
    code,
    event: { id: event._id, name: event.title },
    ticketCategory: category,
    discountPercentage,
    generatedBy: { name: 'melita' },
  });
  return coupon;
}

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

      // If a coupon was used, mark it as used and increment usage count in the database
      if (booking.coupon?.code) {
        const code = String(booking.coupon.code).trim().toUpperCase();
        try {
          const couponDoc = await Coupon.findOne({ code });
          if (couponDoc && couponDoc.status !== 'used') {
            couponDoc.status = 'used';
            couponDoc.usedAt = new Date();
            couponDoc.timesUsed = (couponDoc.timesUsed || 0) + 1;
            await couponDoc.save();
          }
          // After marking used, generate an AHIBI Fest coupon once per booking
          try {
            if (!booking.rewardCouponCode) {
              const newDiscount = code === 'MELITA40' ? 40 : 50;
              const reward = await createAhibiFestCoupon(newDiscount);
              if (reward?.code) {
                booking.rewardCouponCode = reward.code;
                await booking.save();
              }
            }
          } catch (genErr) {
            console.error('Failed to generate AHIBI Fest coupon:', genErr?.message);
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
// Generate Ahibi Fest reward coupon based on used Melita coupon code
module.exports.generateRewardCoupon = asyncHandler(async (req, res) => {
  try {
    const { bookingId, usedCode } = req.body || {};
    if (!bookingId && !usedCode) return res.status(400).json({ message: 'bookingId or usedCode is required' });
    let rewardCoupon = null;
    if (bookingId) {
      const booking = await MelitaBooking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      // If already generated, return existing
      if (booking.rewardCouponCode) {
        const Coupon = require('../models/Coupon');
        rewardCoupon = await Coupon.findOne({ code: booking.rewardCouponCode });
        return res.json({ success: true, coupon: rewardCoupon });
      }
      const baseCode = booking.coupon?.code || usedCode;
      if (!baseCode) return res.status(400).json({ message: 'No used coupon found for booking' });
      const normalized = String(baseCode).trim().toUpperCase();
      const discount = normalized === 'MELITA40' ? 40 : 50;
      const created = await createAhibiFestCoupon(discount);
      if (!created) return res.status(400).json({ message: 'Failed to generate reward coupon' });
      booking.rewardCouponCode = created.code;
      await booking.save();
      return res.json({ success: true, coupon: created });
    } else {
      const normalized = String(usedCode).trim().toUpperCase();
      const discount = normalized === 'MELITA40' ? 40 : 50;
      const created = await createAhibiFestCoupon(discount);
      if (!created) return res.status(400).json({ message: 'Failed to generate reward coupon' });
      return res.json({ success: true, coupon: created });
    }
  } catch (err) {
    console.error('Reward coupon generation failed:', err?.message);
    res.status(500).json({ message: 'Server error' });
  }
});
