const AikoHall = require('../models/AikoHall');
const AikoHallBooking = require('../models/AikoHallBooking');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Get Aiko Hall details
// @route   GET /api/aiko
// @access  Public
exports.getAikoHallDetails = async (req, res) => {
  try {
    const aikoHall = await AikoHall.getAikoHall();
    res.status(200).json({ success: true, data: aikoHall });
  } catch (error) {
    console.error('Error fetching Aiko Hall details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all bookings for Aiko Hall
// @route   GET /api/aiko/bookings
// @access  Public
exports.getBookings = async (req, res) => {
  try {
    const bookings = await AikoHallBooking.find(req.query || {})
      .populate('user', 'name email phone')
      .sort({ bookingDate: -1, startTime: -1 });
    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a Razorpay order for Aiko Hall booking
// @route   POST /api/aiko/bookings/create-order
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { bookingDate, startTime, endTime, guestCount } = req.body;

    // Check if a booking already exists for this date
    const existingBooking = await AikoHallBooking.findOne({
      bookingDate: new Date(bookingDate),
      status: { $in: ['approved', 'pending'] },
    });

    if (existingBooking) {
      return res.status(409).json({ success: false, message: 'This date is already booked. Please select another date.' });
    }
    const userId = req.user.id;

    const aikoHall = await AikoHall.getAikoHall();
    const pricePerHour = aikoHall.adminSettings.pricePerHour || 2000;

    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    if (end <= start) end.setDate(end.getDate() + 1);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (durationHours < aikoHall.adminSettings.minBookingHours) {
      return res.status(400).json({ success: false, message: `Minimum booking is ${aikoHall.adminSettings.minBookingHours} hours.` });
    }

    const totalAmount = durationHours * pricePerHour;

    const options = {
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `receipt_aiko_${new Date().getTime()}`,
      notes: {
        userId, bookingDate, startTime, endTime, guestCount, durationHours,
      }
    };

    const order = await razorpay.orders.create(options);
    if (!order) return res.status(500).send('Error creating Razorpay order');

    res.status(200).json(order);
  } catch (error) {
    console.error('Error creating Aiko Hall order:', error);
    res.status(500).send(error.message);
  }
};

// @desc    Verify payment and create booking
// @route   POST /api/aiko/bookings/verify-payment
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails } = req.body;
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Transaction not legit!' });
    }

    const { bookingDate, startTime, endTime, guestCount, specialNotes, durationHours } = bookingDetails;
    
    const booking = new AikoHallBooking({
      user: req.user.id,
      bookingDate: new Date(bookingDate),
      startTime,
      endTime,
      duration: durationHours,
      guestCount,
      specialNotes,
      status: 'approved',
      pricing: {
        totalAmount: (bookingDetails.amount / 100),
        paymentStatus: 'paid',
      },
      paymentDetails: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        signature: razorpay_signature,
        paymentGateway: 'Razorpay',
      }
    });

    await booking.save();

    await AikoHall.updateOne({}, { $inc: { totalBookings: 1, totalRevenue: booking.pricing.totalAmount } });

    res.status(201).json({ success: true, message: 'Booking created successfully', data: booking });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).send(error.message);
  }
};


// @desc    Get booking by ID
// @route   GET /api/aiko/bookings/:id
// @access  Public
exports.getBookingById = async (req, res) => {
  try {
    const booking = await AikoHallBooking.findById(req.params.id).populate('user', 'name email phone');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    // Ensure the user who booked is the one requesting, or an admin
    if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
    }
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error fetching booking by ID:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update booking status (Admin only)
// @route   PUT /api/aiko/bookings/:id/status
// @access  Private (Admin)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status, rejectionReason, adminNotes } = req.body;
    const booking = await AikoHallBooking.findById(req.params.id);

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    booking.status = status;
    if (status === 'rejected') booking.rejectionReason = rejectionReason;
    if (adminNotes) booking.adminNotes = adminNotes;

    await booking.save();
    res.status(200).json({ success: true, message: `Booking ${status} successfully`, data: booking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get booking statistics
// @route   GET /api/aiko/stats
// @access  Private (Admin)
exports.getBookingStats = async (req, res) => {
  try {
    const stats = {
      totalBookings: await AikoHallBooking.countDocuments(),
      pendingBookings: await AikoHallBooking.countDocuments({ status: 'pending' }),
      approvedBookings: await AikoHallBooking.countDocuments({ status: 'approved' }),
    };
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update Aiko Hall settings (Admin only)
// @route   PUT /api/aiko/settings
// @access  Private (Admin)
exports.updateSettings = async (req, res) => {
  try {
    const aikoHall = await AikoHall.getAikoHall();
    const { adminSettings, ...otherFields } = req.body;

    // Handle adminSettings separately to merge them
    if (adminSettings) {
      aikoHall.adminSettings = { ...aikoHall.adminSettings, ...adminSettings };
    }

    // Handle other top-level fields
    for (const key in otherFields) {
      if (Object.prototype.hasOwnProperty.call(aikoHall, key)) {
        if (typeof otherFields[key] === 'object' && !Array.isArray(otherFields[key]) && aikoHall[key]) {
          aikoHall[key] = { ...aikoHall[key], ...otherFields[key] };
        } else {
          aikoHall[key] = otherFields[key];
        }
      }
    }

    // Consolidate redundant fields
    if (adminSettings && adminSettings.capacity !== undefined) {
      aikoHall.maxCapacity = adminSettings.capacity;
    }
    if (adminSettings && adminSettings.minBookingHours !== undefined) {
      aikoHall.minBookingHours = adminSettings.minBookingHours;
    }
    if (adminSettings && adminSettings.terms !== undefined) {
      aikoHall.bookingTerms = adminSettings.terms;
      aikoHall.notes = adminSettings.terms; // Or handle separately if needed
    }

    await aikoHall.save();
    res.status(200).json({ success: true, message: 'Settings updated successfully', data: aikoHall });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Server error while updating settings' });
  }
};

// Note: The original createBooking is no longer used for user-facing bookings but can be repurposed for admin manual bookings later.
exports.createBooking = async (req, res) => {
    res.status(405).json({ success: false, message: 'This endpoint is not available for direct booking. Please use the payment flow.' });
};
