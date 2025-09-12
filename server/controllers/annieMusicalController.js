const asyncHandler = require("express-async-handler");
const crypto = require('crypto');
const Razorpay = require('razorpay');
const AnnieSeat = require("../models/AnnieSeat");
const AnnieBooking = require("../models/AnnieBooking");
const Scan = require("../models/Scan");
const User = require("../models/User");
const mongoose = require('mongoose'); // mongoose is required for sessions

const SEATING_CHART = {
  rows: 5,
  cols: 10,
  pricing: {
    default: 100,
    premium: 150, // e.g., for last 2 rows
  },
};

// Helper function to seed seats into the database
const seedSeats = async () => {
  const seatCount = await AnnieSeat.countDocuments();
  if (seatCount === 0) {
    console.log('No seats found. Seeding database...');
    const seatsToCreate = [];
    for (let i = 0; i < SEATING_CHART.rows; i++) {
      const row = String.fromCharCode(65 + i); // A, B, C...
      for (let j = 1; j <= SEATING_CHART.cols; j++) {
        const price = i >= SEATING_CHART.rows - 2 ? SEATING_CHART.pricing.premium : SEATING_CHART.pricing.default;
        seatsToCreate.push({ row, number: j, price, status: 'available' });
      }
    }
    await AnnieSeat.insertMany(seatsToCreate);
    console.log(`${seatsToCreate.length} seats have been created.`);
  }
};

// Seed the database on server start
seedSeats().catch(console.error);

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Get all seats for Annie Musical
// @route   GET /api/annie-musical/seats
// @access  Public
const getSeats = asyncHandler(async (req, res) => {
  const seats = await AnnieSeat.find().sort({ row: 1, number: 1 });
  res.json(seats);
});

// @desc    Create a new booking (lock seats)
// @route   POST /api/annie-musical/book
// @access  Private
const createBooking = asyncHandler(async (req, res) => {
  const { seatIds } = req.body;
  const userId = req.user.id; // Assuming protect middleware adds user to req

  if (!seatIds || seatIds.length === 0) {
    res.status(400);
    throw new Error("Seat IDs are required");
  }

  // Use a transaction to ensure atomicity
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seats = await AnnieSeat.find({ _id: { $in: seatIds } }).session(session);

    if (seats.length !== seatIds.length) {
      throw new Error("One or more selected seats do not exist.");
    }

    const unavailableSeats = seats.filter((seat) => seat.status !== "available");
    if (unavailableSeats.length > 0) {
      throw new Error(
        `Sorry, the following seats are no longer available: ${unavailableSeats
          .map((s) => `${s.row}${s.number}`)
          .join(", ")}`
      );
    }

    const totalPrice = seats.reduce((acc, seat) => acc + seat.price, 0);
    const expiresAt = new Date(Date.now() + 10  * 60 * 1000); // 10 minutes from now

    // Lock the seats
    await AnnieSeat.updateMany(
      { _id: { $in: seatIds } },
      { $set: { status: "selected" } },
      { session }
    );

    // Create the booking
    const booking = new AnnieBooking({
      userId,
      seats: seatIds,
      totalPrice,
      status: "pending",
      expiresAt,
    });

    // Create Razorpay order
    const orderOptions = {
      amount: totalPrice * 100, // Amount in paise
      currency: "INR",
      receipt: booking._id.toString(),
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);
    booking.razorpayOrderId = razorpayOrder.id;
    await booking.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      message: "Booking created successfully. Please complete payment.",
      booking,
      razorpayOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400);
    throw new Error(error.message || "Failed to create booking");
  } finally {
    session.endSession();
  }
});

// @desc    Confirm a booking after payment
// @route   POST /api/annie-musical/confirm
// @access  Private
const confirmBooking = asyncHandler(async (req, res) => {
  const { bookingId, paymentId, orderId, signature } = req.body;
  
  if (!bookingId || !paymentId || !orderId) {
    res.status(400);
    throw new Error("Missing required payment details");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the booking
    const booking = await AnnieBooking.findById(bookingId).session(session);
    
    if (!booking) {
      res.status(404);
      throw new Error("Booking not found");
    }

    // Verify this is the correct order
    if (booking.razorpayOrderId !== orderId) {
      res.status(400);
      throw new Error("Order ID mismatch");
    }

    // Check if booking is already confirmed
    if (booking.status === 'confirmed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({
        success: true,
        message: "Booking already confirmed",
        booking
      });
    }

    console.log(`Direct confirmation for booking ${bookingId} with payment ${paymentId}`);

    // Update booking status
    booking.status = 'confirmed';
    booking.razorpayPaymentId = paymentId;
    booking.razorpaySignature = signature;
    // Set expiresAt to a far future date instead of null to satisfy validation
    booking.expiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years in the future
    await booking.save({ session });

    // Update seats to booked status
    const updateResult = await AnnieSeat.updateMany(
      { _id: { $in: booking.seats } },
      { $set: { status: 'booked' } },
      { session }
    );

    console.log(`Updated ${updateResult.modifiedCount} seats to 'booked' status`);

    await session.commitTransaction();
    console.log(`Booking ${bookingId} confirmed successfully via direct confirmation`);

    // Return the updated booking
    const populatedBooking = await AnnieBooking.findById(bookingId)
      .populate('userId', 'name email phone')
      .populate('seats', 'row number price');

    res.status(200).json({
      success: true,
      message: "Booking confirmed successfully",
      booking: populatedBooking
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Booking confirmation error:', error);
    res.status(500);
    throw new Error(error.message || "Failed to confirm booking");
  } finally {
    session.endSession();
  }
});

// @desc    Handle Razorpay webhook for payment confirmation
// @route   POST /api/annie-musical/webhook
// @access  Public (but verified via webhook signature)
const handleWebhook = asyncHandler(async (req, res) => {
  const webhookSignature = req.headers['x-razorpay-signature'];
  const webhookBody = JSON.stringify(req.body);

  if (!webhookSignature) {
    console.error('Webhook error: Missing signature');
    res.status(400);
    throw new Error("Missing webhook signature");
  }

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(webhookBody)
    .digest('hex');

  if (webhookSignature !== expectedSignature) {
    console.error('Webhook error: Invalid signature');
    res.status(400);
    throw new Error("Invalid webhook signature");
  }

  const { event, payload } = req.body;
  console.log(`Webhook received: ${event}`, JSON.stringify(payload).substring(0, 200) + '...');

  // Handle payment.captured event
  if (event === 'payment.captured' || event === 'payment.authorized') {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      console.log(`Processing payment event for order: ${orderId}, payment: ${paymentId}`);

      // Find booking by razorpayOrderId
      const booking = await AnnieBooking.findOne({ razorpayOrderId: orderId }).session(session);

      if (!booking) {
        console.error(`Booking not found for order ID: ${orderId}`);
        await session.abortTransaction();
        session.endSession();
        return res.status(200).json({ status: 'ok', message: 'No booking found for this order' });
      }

      if (booking.status === 'confirmed') {
        console.log(`Booking ${booking._id} already confirmed`);
        await session.abortTransaction();
        session.endSession();
        return res.status(200).json({ status: 'ok', message: 'Booking already confirmed' });
      }

      console.log(`Confirming booking ${booking._id} with payment ${paymentId}`);

      // Update booking status and payment details
      booking.status = 'confirmed';
      booking.razorpayPaymentId = paymentId;
      booking.expiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years in the future
      await booking.save({ session });

      // Update seats to booked
      const updateResult = await AnnieSeat.updateMany(
        { _id: { $in: booking.seats } },
        { $set: { status: 'booked' } },
        { session }
      );
      
      console.log(`Updated ${updateResult.modifiedCount} seats to 'booked' status`);

      await session.commitTransaction();
      console.log(`Booking ${booking._id} confirmed via webhook successfully`);
      session.endSession();

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Webhook processing error:', error);
      // Don't throw here, just log the error and return 200 to Razorpay
      return res.status(200).json({ status: 'error', message: error.message });
    }
  } else {
    console.log(`Received non-payment webhook event: ${event}, no action taken`);
  }

  res.status(200).json({ status: 'ok' });
});

// @desc    Confirm a booking by admin (without payment verification)
// @route   POST /api/annie-musical/admin/confirm/:id
// @access  Private/Admin
const adminConfirmBooking = asyncHandler(async (req, res) => {
  const bookingId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await AnnieBooking.findById(bookingId).session(session);

    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }

    if (booking.status === 'confirmed') {
      await session.commitTransaction();
      return res.status(200).json({
        message: 'Booking already confirmed.',
        updatedBooking: booking,
      });
    }

    if (booking.status !== 'pending') {
      res.status(400);
      throw new Error(`Only pending bookings can be confirmed by admin. Current status: ${booking.status}`);
    }

    // Update booking and seats
    booking.status = 'confirmed';
    booking.expiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years in the future
    await booking.save({ session });

    await AnnieSeat.updateMany(
      { _id: { $in: booking.seats } },
      { $set: { status: 'booked' } },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      message: 'Booking confirmed by admin successfully!',
      updatedBooking: booking,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Admin Confirmation Error:', error);
    res.status(400);
    throw new Error(error.message || 'Failed to confirm booking by admin');
  } finally {
    session.endSession();
  }
});

// @desc    Get total revenue from confirmed bookings
// @route   GET /api/annie-musical/revenue
// @access  Private/Admin
const getRevenue = asyncHandler(async (req, res) => {
  // Implementation to follow
});

// @desc    Get all Annie Musical bookings for admin
// @route   GET /api/annie-musical/admin/bookings
// @access  Private/Admin
const getAdminBookings = asyncHandler(async (req, res) => {
  try {
    const bookings = await AnnieBooking.find({ status: 'confirmed' })
      .populate('userId', 'name email phone')
      .populate('seats', 'row number price')
      .sort({ createdAt: -1 });

    const formattedBookings = bookings.map(booking => {
      const seatDetails = booking.seats.map(seat => ({
        id: `${seat.row}${seat.number}`,
        price: seat.price,
        category: seat.row >= 'D' ? 'Premium' : 'Standard'
      }));

      return {
        _id: booking._id,
        user: {
          name: booking.userId?.name || 'Unknown',
          email: booking.userId?.email || 'Unknown',
          phone: booking.userId?.phone || 'N/A'
        },
        seats: seatDetails,
        totalAmount: booking.totalPrice,
        paymentStatus: booking.status === 'confirmed' ? 'completed' : booking.status,
        paymentId: booking.razorpayPaymentId,
        transactionId: booking.razorpayOrderId,
        bookedAt: booking.createdAt,
        status: booking.status
      };
    });

    res.json({
      success: true,
      bookings: formattedBookings,
      total: formattedBookings.length
    });
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    res.status(500);
    throw new Error('Failed to fetch bookings');
  }
});

// @desc    Get single Annie Musical booking details
// @route   GET /api/annie-musical/booking/:id
// @access  Private
const getBookingDetails = asyncHandler(async (req, res) => {
  try {
    const booking = await AnnieBooking.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('seats', 'row number price');

    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }

    // Check if user owns this booking or is admin
    if (booking.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized to view this booking');
    }

    const seatDetails = booking.seats.map(seat => ({
      id: `${seat.row}${seat.number}`,
      price: seat.price,
      category: seat.row >= 'D' ? 'Premium' : 'Standard'
    }));

    const formattedBooking = {
      _id: booking._id,
      user: {
        name: booking.userId?.name || 'Unknown',
        email: booking.userId?.email || 'Unknown',
        phone: booking.userId?.phone || 'N/A'
      },
      seats: seatDetails,
      totalAmount: booking.totalPrice,
      paymentStatus: booking.status === 'confirmed' ? 'completed' : booking.status,
      paymentId: booking.razorpayPaymentId,
      transactionId: booking.razorpayOrderId,
      bookedAt: booking.createdAt,
      status: booking.status
    };

    res.json({
      success: true,
      booking: formattedBooking
    });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500);
    throw new Error('Failed to fetch booking details');
  }
});

// @desc    Get user's confirmed Annie Musical bookings
// @route   GET /api/annie-musical/my-bookings
// @access  Private
const getUserBookings = asyncHandler(async (req, res) => {
  try {
    const bookings = await AnnieBooking.find({ 
      userId: req.user.id, 
      status: 'confirmed' 
    })
      .populate('seats', 'row number price')
      .sort({ createdAt: -1 });

    const formattedBookings = bookings.map(booking => {
      const seatDetails = booking.seats.map(seat => ({
        id: `${seat.row}${seat.number}`,
        price: seat.price,
        category: seat.row >= 'D' ? 'Premium' : 'Standard'
      }));

      return {
        _id: booking._id,
        seats: seatDetails,
        totalAmount: booking.totalPrice,
        paymentId: booking.razorpayPaymentId,
        transactionId: booking.razorpayOrderId,
        bookedAt: booking.createdAt,
        status: booking.status
      };
    });

    res.json({
      success: true,
      bookings: formattedBookings,
      total: formattedBookings.length
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500);
    throw new Error('Failed to fetch user bookings');
  }
});

// Add a cleanup job for expired bookings
// This function should be called periodically (e.g., via a cron job)
const cleanupExpiredBookings = async () => {
  const now = new Date();
  
  try {
    // Find expired bookings - ONLY pending ones with expiration time in the past
    const expiredBookings = await AnnieBooking.find({
      status: 'pending',
      expiresAt: { $lt: now }
    });
    
    if (expiredBookings.length === 0) {
      console.log('No expired bookings to clean up');
      return;
    }
    
    console.log(`Found ${expiredBookings.length} expired bookings to clean up`);
    
    // Get all seat IDs from expired bookings
    const seatIdsToRelease = expiredBookings.flatMap(booking => booking.seats);
    
    // Only release seats that are currently in 'selected' status
    // This prevents releasing seats that might have been manually set to 'booked'
    // or are in the process of being confirmed by the webhook
    const updateResult = await AnnieSeat.updateMany(
      { 
        _id: { $in: seatIdsToRelease },
        status: 'selected' // Only update seats that are still in selected status
      },
      { $set: { status: 'available' } }
    );
    
    // Mark bookings as expired
    await AnnieBooking.updateMany(
      { _id: { $in: expiredBookings.map(b => b._id) } },
      { $set: { status: 'expired' } }
    );
    
    console.log(`Released ${updateResult.modifiedCount} seats from ${expiredBookings.length} expired bookings`);
  } catch (error) {
    console.error('Error cleaning up expired bookings:', error);
  }
};

// Run cleanup job every 5 minutes
setInterval(cleanupExpiredBookings, 5 * 60 * 1000);

// Run cleanup on server start
cleanupExpiredBookings().catch(console.error);

// @desc    Verify Annie Musical ticket for QR scanner
// @route   POST /api/annie-musical/verify-ticket
// @access  Private (Admin)
const verifyAnnieTicket = asyncHandler(async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    // First check in AnnieBooking collection
    let booking = await AnnieBooking.findById(bookingId)
      .populate('userId', 'name email phone')
      .populate('seats', 'row number price');

    if (!booking) {
      // Also check in main Booking collection for Annie Musical bookings
      booking = await Booking.findById(bookingId).populate('user', 'name email phone');
      
      if (!booking) {
        return res.status(404).json({ 
          message: 'Annie Musical booking not found', 
          status: 'INVALID' 
        });
      }

      // Handle main Booking collection Annie Musical tickets
      if (booking.event && booking.event.toString() === '000000000000000000000001') {
        // This is an Annie Musical booking in main collection
        const scanCount = await Scan.countDocuments({ ticket: bookingId });
        
        if (scanCount >= 1) {
          return res.status(200).json({
            message: 'This Annie Musical ticket has already been used.',
            status: 'ALREADY_USED',
            bookingId: booking._id,
            userId: booking.user._id,
            userName: booking.user.name,
            userEmail: booking.user.email,
            userPhone: booking.user.phone,
            seats: [{ id: 'General', price: booking.price, category: 'Standard' }],
            totalAmount: booking.total,
            checkedInAt: booking.checkedInAt,
            paymentId: booking.paymentId,
            transactionId: booking.transactionId,
            bookedAt: booking.bookedAt
          });
        }

        return res.status(200).json({
          message: 'Annie Musical ticket verified successfully.',
          status: 'VALID',
          bookingId: booking._id,
          userId: booking.user._id,
          userName: booking.user.name,
          userEmail: booking.user.email,
          userPhone: booking.user.phone,
          seats: [{ id: 'General', price: booking.price, category: 'Standard' }],
          totalAmount: booking.total,
          paymentId: booking.paymentId,
          transactionId: booking.transactionId,
          bookedAt: booking.bookedAt
        });
      }
    }

    // Handle AnnieBooking collection
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        message: `Annie Musical booking status is ${booking.status}, not confirmed`,
        status: 'INVALID'
      });
    }

    // Check if already used (using booking ID as ticket reference)
    const scanCount = await Scan.countDocuments({ ticket: bookingId });
    
    if (scanCount >= 1) {
      return res.status(200).json({
        message: 'This Annie Musical ticket has already been used.',
        status: 'ALREADY_USED',
        bookingId: booking._id,
        userId: booking.userId._id,
        userName: booking.userId.name,
        userEmail: booking.userId.email,
        userPhone: booking.userId.phone,
        seats: booking.seats.map(seat => ({
          id: `${seat.row}${seat.number}`,
          price: seat.price,
          category: seat.row >= 'D' ? 'Premium' : 'Standard'
        })),
        totalAmount: booking.totalPrice,
        checkedInAt: booking.checkedInAt,
        paymentId: booking.razorpayPaymentId,
        transactionId: booking.razorpayOrderId,
        bookedAt: booking.createdAt
      });
    }

    // Ticket is valid
    res.status(200).json({
      message: 'Annie Musical ticket verified successfully.',
      status: 'VALID',
      bookingId: booking._id,
      userId: booking.userId._id,
      userName: booking.userId.name,
      userEmail: booking.userId.email,
      userPhone: booking.userId.phone,
      seats: booking.seats.map(seat => ({
        id: `${seat.row}${seat.number}`,
        price: seat.price,
        category: seat.row >= 'D' ? 'Premium' : 'Standard'
      })),
      totalAmount: booking.totalPrice,
      paymentId: booking.razorpayPaymentId,
      transactionId: booking.razorpayOrderId,
      bookedAt: booking.createdAt
    });

  } catch (error) {
    console.error('Error verifying Annie Musical ticket:', error);
    res.status(500).json({ message: 'Server error during Annie Musical ticket verification' });
  }
});

// @desc    Check-in Annie Musical ticket
// @route   POST /api/annie-musical/check-in
// @access  Private (Admin)
const checkInAnnieTicket = asyncHandler(async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    // Check both collections
    let booking = await AnnieBooking.findById(bookingId);
    let isMainBooking = false;

    if (!booking) {
      booking = await Booking.findById(bookingId);
      isMainBooking = true;
      
      if (!booking) {
        return res.status(404).json({ message: 'Annie Musical booking not found' });
      }
    }

    // Check if already scanned
    const existingScan = await Scan.findOne({ ticket: bookingId });
    if (existingScan) {
      return res.status(400).json({ 
        message: 'This Annie Musical ticket has already been used for entry.',
        error: 'TICKET_ALREADY_USED'
      });
    }

    // Create scan record
    const newScan = new Scan({
      ticket: bookingId,
      event: isMainBooking ? booking.event : '000000000000000000000001', // Annie Musical event ID
      user: isMainBooking ? booking.user : booking.userId,
    });
    await newScan.save();

    // Update booking status
    if (isMainBooking) {
      booking.status = 'checked-in';
      booking.checkedInAt = new Date();
    } else {
      booking.checkedInAt = new Date();
    }
    await booking.save();

    res.status(200).json({
      message: 'Annie Musical check-in successful.',
      status: 'CHECKED_IN',
      checkedInAt: booking.checkedInAt
    });

  } catch (error) {
    console.error('Error during Annie Musical check-in:', error);
    res.status(500).json({ message: 'Server error during Annie Musical check-in' });
  }
});

// @desc    Check-out Annie Musical ticket
// @route   POST /api/annie-musical/check-out
// @access  Private (Admin)
const checkOutAnnieTicket = asyncHandler(async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    // Find and delete the scan record
    const scan = await Scan.findOneAndDelete({ ticket: bookingId });
    
    if (!scan) {
      return res.status(400).json({ message: 'No scan record found for this Annie Musical ticket.' });
    }

    // Update booking status
    let booking = await AnnieBooking.findById(bookingId);
    let isMainBooking = false;

    if (!booking) {
      booking = await Booking.findById(bookingId);
      isMainBooking = true;
    }

    if (booking) {
      if (isMainBooking) {
        booking.status = 'confirmed';
      }
      booking.checkedOutAt = new Date();
      await booking.save();
    }

    res.status(200).json({
      message: 'Annie Musical check-out successful. Ticket can be reused.',
      status: 'VALID',
      checkedOutAt: booking?.checkedOutAt
    });

  } catch (error) {
    console.error('Error during Annie Musical check-out:', error);
    res.status(500).json({ message: 'Server error during Annie Musical check-out' });
  }
});

// @desc    Get all customers for admin selection
// @route   GET /api/annie-musical/admin/customers
// @access  Private/Admin
const getCustomers = asyncHandler(async (req, res) => {
  try {
    const { search } = req.query;
    let query = { role: 'user' };

    if (search) {
      query = {
        ...query,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const customers = await User.find(query)
      .select('name email phone city createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      customers: customers.map(customer => ({
        _id: customer._id,
        name: customer.name || 'N/A',
        email: customer.email || 'N/A',
        phone: customer.phone,
        city: customer.city || 'N/A',
        createdAt: customer.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500);
    throw new Error('Failed to fetch customers');
  }
});

// @desc    Create manual booking by admin for existing customer
// @route   POST /api/annie-musical/admin/manual-booking
// @access  Private/Admin
const createManualBooking = asyncHandler(async (req, res) => {
  const { customerId, seatIds } = req.body;

  if (!customerId || !seatIds || seatIds.length === 0) {
    res.status(400);
    throw new Error("Customer ID and seat IDs are required");
  }

  // Verify customer exists
  const customer = await User.findById(customerId);
  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  // Use a transaction to ensure atomicity
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seats = await AnnieSeat.find({ _id: { $in: seatIds } }).session(session);

    if (seats.length !== seatIds.length) {
      throw new Error("One or more selected seats do not exist.");
    }

    const unavailableSeats = seats.filter((seat) => seat.status !== "available");
    if (unavailableSeats.length > 0) {
      throw new Error(
        `Sorry, the following seats are no longer available: ${unavailableSeats
          .map((s) => `${s.row}${s.number}`)
          .join(", ")}`
      );
    }

    const totalPrice = seats.reduce((acc, seat) => acc + seat.price, 0);

    // Update seats to booked status directly (no payment needed)
    await AnnieSeat.updateMany(
      { _id: { $in: seatIds } },
      { $set: { status: "booked" } },
      { session }
    );

    // Create the booking with confirmed status
    const booking = new AnnieBooking({
      userId: customerId,
      seats: seatIds,
      totalPrice,
      status: "confirmed",
      expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years in the future
      razorpayPaymentId: `manual_${Date.now()}`, // Manual booking identifier
      razorpayOrderId: `manual_order_${Date.now()}`,
    });

    await booking.save({ session });

    // Also create entry in main Booking collection for QR compatibility
    const Booking = require("../models/Booking");
    const mainBooking = new Booking({
      user: customerId,
      event: new mongoose.Types.ObjectId('000000000000000000000001'), // Annie Musical event ID
      ticketType: 'Annie Musical Seat',
      quantity: seats.length,
      price: totalPrice / seats.length,
      total: totalPrice,
      paymentId: `manual_${Date.now()}`,
      status: 'confirmed',
      paymentStatus: 'completed',
      bookedAt: new Date()
    });

    await mainBooking.save({ session });

    await session.commitTransaction();

    // Populate the booking for response
    const populatedBooking = await AnnieBooking.findById(booking._id)
      .populate('userId', 'name email phone')
      .populate('seats', 'row number price');

    res.status(201).json({
      success: true,
      message: "Manual booking created successfully",
      booking: {
        _id: populatedBooking._id,
        customer: {
          name: populatedBooking.userId.name,
          email: populatedBooking.userId.email,
          phone: populatedBooking.userId.phone
        },
        seats: populatedBooking.seats.map(seat => ({
          id: `${seat.row}${seat.number}`,
          price: seat.price,
          category: seat.row >= 'D' ? 'Premium' : 'Standard'
        })),
        totalAmount: populatedBooking.totalPrice,
        paymentStatus: 'completed',
        paymentId: populatedBooking.razorpayPaymentId,
        transactionId: populatedBooking.razorpayOrderId,
        bookedAt: populatedBooking.createdAt,
        status: populatedBooking.status
      }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400);
    throw new Error(error.message || "Failed to create manual booking");
  } finally {
    session.endSession();
  }
});

module.exports = {
  getSeats,
  createBooking,
  confirmBooking,
  getRevenue,
  getAdminBookings,
  getBookingDetails,
  adminConfirmBooking,
  handleWebhook,
  getUserBookings,
  cleanupExpiredBookings, // Export for testing or manual triggering
  verifyAnnieTicket,
  checkInAnnieTicket,
  checkOutAnnieTicket,
  getCustomers,
  createManualBooking,
};
