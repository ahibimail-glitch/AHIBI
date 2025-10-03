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
  const { amount, product, userId, deliveryAddress, coupon, ahibiTickets } = req.body;

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
        ...(ahibiTickets ? { ahibiTickets } : {}),
        razorpay_order_id: order.id,
        status: 'pending',
    });

    await melitaBooking.save();

    res.status(201).json({ order, melitaBooking });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ message: 'Error creating Razorpay order', error: error.message });
  }
});

// @desc    Verify payment and update booking
// @route   POST /api/melita/verify-payment
// @access  Public (Webhook)
const verifyPayment = asyncHandler(async (req, res) => {
  console.log('=== MELITA WEBHOOK RECEIVED ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Headers:', req.headers);
  
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  console.log('Signature match:', digest === req.headers['x-razorpay-signature']);

  if (digest === req.headers['x-razorpay-signature']) {
    const { order_id, payment_id } = req.body.payload.payment.entity;
    console.log('Processing payment - Order ID:', order_id, 'Payment ID:', payment_id);

    const booking = await MelitaBooking.findOne({ razorpay_order_id: order_id });
    console.log('Found booking:', booking ? booking._id : 'NOT FOUND');

    if (booking) {
      console.log('Booking ahibiTickets:', JSON.stringify(booking.ahibiTickets, null, 2));
      
      booking.razorpay_payment_id = payment_id;
      booking.razorpay_signature = req.headers['x-razorpay-signature'];
      booking.status = 'confirmed';
      await booking.save();
      console.log('Booking status updated to confirmed');

      // If AHIBI tickets were purchased, create bookings for them
      if (booking.ahibiTickets && booking.ahibiTickets.tickets && booking.ahibiTickets.tickets.length > 0) {
        console.log('AHIBI tickets found in booking, proceeding to create bookings...');
        try {
          const Booking = require('../models/Booking');
          const Event = require('../models/Event');
          
          console.log('Creating AHIBI FEST bookings for Melita order:', booking.razorpay_order_id);
          
          const event = await Event.findById(booking.ahibiTickets.eventId);
          if (!event) {
            console.error('AHIBI FEST event not found:', booking.ahibiTickets.eventId);
            throw new Error('Event not found');
          }
          
          console.log('Found AHIBI FEST event:', event.title);
          
          // Create a booking for each ticket type
          for (const ticketItem of booking.ahibiTickets.tickets) {
            console.log('Processing ticket:', ticketItem.ticketType, 'Quantity:', ticketItem.quantity);
            
            const ticketType = event.ticketTypes.find(t => t.name === ticketItem.ticketType);
            if (!ticketType) {
              console.error('Ticket type not found:', ticketItem.ticketType);
              continue;
            }
            
            console.log('Found ticket type:', ticketType.name, 'Current sold:', ticketType.sold);
            
            // Create event snapshot
            const eventSnapshot = {
              _id: event._id,
              title: event.title,
              banner: event.banner,
              startDate: event.startDate,
              endDate: event.endDate,
              location: {
                address: event.location?.address || '',
                city: event.location?.city || ''
              }
            };
            
            const ahibiBooking = new Booking({
              user: booking.user,
              event: event._id,
              eventSnapshot: eventSnapshot,
              ticketType: ticketItem.ticketType,
              quantity: ticketItem.quantity,
              price: ticketItem.price,
              total: ticketItem.price * ticketItem.quantity,
              status: 'confirmed',
              paymentStatus: 'completed',
              paymentId: payment_id,
              bookedAt: new Date(),
            });
            
            await ahibiBooking.save();
            console.log('Created AHIBI booking:', ahibiBooking._id);
            
            // Update ticket sold count
            ticketType.sold = (ticketType.sold || 0) + ticketItem.quantity;
            await event.save();
            console.log('Updated ticket sold count:', ticketType.sold);
          }
          
          console.log('Successfully created all AHIBI FEST bookings');
        } catch (ahibiError) {
          console.error('Failed to create AHIBI FEST bookings:', ahibiError);
          console.error('Error stack:', ahibiError.stack);
          // Don't fail the webhook, just log the error
        }
      }

      // If a coupon was used, increment usage count in the database
      if (booking.coupon?.code) {
        const code = String(booking.coupon.code).trim().toUpperCase();
        try {
          const couponDoc = await Coupon.findOne({ code });
          if (couponDoc) {
            // Increment timesUsed for all coupons
            couponDoc.timesUsed = (couponDoc.timesUsed || 0) + 1;
            // Never mark as 'used' - all coupons can be reused
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

// @desc    Verify payment from client (not webhook)
// @route   POST /api/melita/verify-payment-client
// @access  Private
const verifyPaymentClient = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  console.log('=== CLIENT PAYMENT VERIFICATION ===');
  console.log('Order ID:', razorpay_order_id);
  console.log('Payment ID:', razorpay_payment_id);
  
  try {
    // Verify signature
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');
    
    if (generated_signature !== razorpay_signature) {
      console.error('Signature mismatch');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
    
    console.log('Signature verified successfully');
    
    // Find the booking
    const booking = await MelitaBooking.findOne({ razorpay_order_id });
    if (!booking) {
      console.error('Booking not found for order:', razorpay_order_id);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    console.log('Found booking:', booking._id);
    console.log('Booking ahibiTickets:', JSON.stringify(booking.ahibiTickets, null, 2));
    
    // Update booking status
    booking.razorpay_payment_id = razorpay_payment_id;
    booking.razorpay_signature = razorpay_signature;
    booking.status = 'confirmed';
    await booking.save();
    console.log('Booking status updated to confirmed');
    
    // If a coupon was used, increment usage count
    if (booking.coupon?.code) {
      const code = String(booking.coupon.code).trim().toUpperCase();
      try {
        const Coupon = require('../models/Coupon');
        const couponDoc = await Coupon.findOne({ code });
        if (couponDoc) {
          // Increment timesUsed for all coupons
          couponDoc.timesUsed = (couponDoc.timesUsed || 0) + 1;
          // Never mark as 'used' - all coupons can be reused
          await couponDoc.save();
          console.log('Coupon usage incremented:', code, 'timesUsed:', couponDoc.timesUsed);
        }
      } catch (couponErr) {
        console.error('Failed to increment coupon usage:', code, couponErr?.message);
      }
    }
    
    // If AHIBI tickets were purchased, create bookings for them
    if (booking.ahibiTickets && booking.ahibiTickets.tickets && booking.ahibiTickets.tickets.length > 0) {
      console.log('AHIBI tickets found, creating bookings...');
      
      const Booking = require('../models/Booking');
      const Event = require('../models/Event');
      
      const event = await Event.findById(booking.ahibiTickets.eventId);
      if (!event) {
        console.error('AHIBI FEST event not found:', booking.ahibiTickets.eventId);
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      
      console.log('Found AHIBI FEST event:', event.title);
      
      const createdBookings = [];
      
      // Create a booking for each ticket type
      for (const ticketItem of booking.ahibiTickets.tickets) {
        console.log('Processing ticket:', ticketItem.ticketType, 'Quantity:', ticketItem.quantity);
        
        const ticketType = event.ticketTypes.find(t => t.name === ticketItem.ticketType);
        if (!ticketType) {
          console.error('Ticket type not found:', ticketItem.ticketType);
          continue;
        }
        
        console.log('Found ticket type:', ticketType.name);
        
        // Create event snapshot
        const eventSnapshot = {
          _id: event._id,
          title: event.title,
          banner: event.banner,
          startDate: event.startDate,
          endDate: event.endDate,
          location: {
            address: event.location?.address || '',
            city: event.location?.city || ''
          }
        };
        
        const ahibiBooking = new Booking({
          user: booking.user,
          event: event._id,
          eventSnapshot: eventSnapshot,
          ticketType: ticketItem.ticketType,
          quantity: ticketItem.quantity,
          price: ticketItem.price,
          total: ticketItem.price * ticketItem.quantity,
          status: 'confirmed',
          paymentStatus: 'completed',
          paymentId: razorpay_payment_id,
          bookedAt: new Date(),
        });
        
        await ahibiBooking.save();
        console.log('Created AHIBI booking:', ahibiBooking._id);
        createdBookings.push(ahibiBooking);
        
        // Update ticket sold count
        ticketType.sold = (ticketType.sold || 0) + ticketItem.quantity;
        await event.save();
        console.log('Updated ticket sold count:', ticketType.sold);
      }
      
      console.log('Successfully created', createdBookings.length, 'AHIBI FEST bookings');
    } else {
      console.log('No AHIBI tickets in this booking');
    }
    
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = { createOrder, verifyPayment, getAdminBookings, getBookingById, verifyPaymentClient };
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
