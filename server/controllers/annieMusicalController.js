const asyncHandler = require("express-async-handler");
const crypto = require('crypto');
const Razorpay = require('razorpay');
const AnnieSeat = require("../models/AnnieSeat");
const AnnieBooking = require("../models/AnnieBooking");
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
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

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
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingId,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
    res.status(400);
    throw new Error("Payment verification details are required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await AnnieBooking.findById(bookingId).session(session);

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status === 'confirmed') {
      res.status(200).json({ message: "Booking already confirmed.", updatedBooking: booking });
      return;
    }

    // Verify Razorpay signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      throw new Error("Invalid payment signature. Booking cancelled.");
    }

    // Update booking and seats
    booking.status = 'confirmed';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpaySignature = razorpay_signature;
    await booking.save({ session });

    await AnnieSeat.updateMany(
      { _id: { $in: booking.seats } },
      { $set: { status: 'booked' } },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      message: "Booking confirmed successfully!",
      updatedBooking: booking,
    });
  } catch (error) {
    await session.abortTransaction();
    // If something fails, we should consider reverting seat status
    // For now, we just log the error
    console.error("Confirmation Error:", error);
    res.status(400);
    throw new Error(error.message || "Failed to confirm booking");
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
    const bookings = await AnnieBooking.find()
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

module.exports = {
  getSeats,
  createBooking,
  confirmBooking,
  getRevenue,
  getAdminBookings,
  getBookingDetails,
};
