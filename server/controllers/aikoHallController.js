const AikoHall = require('../models/AikoHall');
const AikoHallBooking = require('../models/AikoHallBooking');
const { validationResult } = require('express-validator');

// @desc    Get Aiko Hall details
// @route   GET /api/aiko
// @access  Public
exports.getAikoHallDetails = async (req, res) => {
  try {
    const aikoHall = await AikoHall.getAikoHall();
    
    res.status(200).json({
      success: true,
      data: aikoHall
    });
  } catch (error) {
    console.error('Error fetching Aiko Hall details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching venue details'
    });
  }
};

// @desc    Get all bookings for Aiko Hall
// @route   GET /api/aiko/bookings
// @access  Public
exports.getBookings = async (req, res) => {
  try {
    const { date, status } = req.query;
    
    let query = {};
    
    // Filter by date if provided
    if (date) {
      query.bookingDate = new Date(date);
    }
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    const bookings = await AikoHallBooking.find(query)
      .sort({ bookingDate: 1, startTime: 1 })
      .select('-__v');
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    });
  }
};

// @desc    Create a new booking for Aiko Hall
// @route   POST /api/aiko/bookings
// @access  Public
exports.createBooking = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      customer,
      bookingDate,
      startTime,
      endTime,
      guestCount,
      specialNotes
    } = req.body;

    // Get Aiko Hall details for validation
    const aikoHall = await AikoHall.getAikoHall();

    // Validate guest count
    if (guestCount > aikoHall.adminSettings.capacity) {
      return res.status(400).json({
        success: false,
        message: `Guest count cannot exceed ${aikoHall.adminSettings.capacity}`
      });
    }

    // Calculate duration
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    
    const duration = (end - start) / (1000 * 60 * 60);

    // Validate minimum booking hours
    if (duration < aikoHall.adminSettings.minBookingHours) {
      return res.status(400).json({
        success: false,
        message: `Minimum booking duration is ${aikoHall.adminSettings.minBookingHours} hours`
      });
    }

    // Check for availability
    const isAvailable = await AikoHallBooking.checkAvailability(
      bookingDate,
      startTime,
      endTime
    );

    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'The selected time slot is not available. Please choose a different time.'
      });
    }

    // Create booking
    const booking = new AikoHallBooking({
      customer,
      bookingDate: new Date(bookingDate),
      startTime,
      endTime,
      duration,
      guestCount,
      specialNotes
    });

    await booking.save();

    // Update Aiko Hall statistics
    await AikoHall.updateOne(
      {},
      { 
        $inc: { totalBookings: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully',
      data: booking
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating booking'
    });
  }
};

// @desc    Get booking by ID
// @route   GET /api/aiko/bookings/:id
// @access  Public
exports.getBookingById = async (req, res) => {
  try {
    const booking = await AikoHallBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking'
    });
  }
};

// @desc    Update booking status (Admin only)
// @route   PUT /api/aiko/bookings/:id/status
// @access  Private (Admin)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status, rejectionReason, adminNotes } = req.body;
    
    const booking = await AikoHallBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking status
    booking.status = status;
    
    if (status === 'rejected' && rejectionReason) {
      booking.rejectionReason = rejectionReason;
      booking.rejectedAt = new Date();
    } else if (status === 'approved') {
      booking.approvedAt = new Date();
    }
    
    if (adminNotes) {
      booking.adminNotes = adminNotes;
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
      data: booking
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating booking status'
    });
  }
};

// @desc    Get booking statistics
// @route   GET /api/aiko/stats
// @access  Private (Admin)
exports.getBookingStats = async (req, res) => {
  try {
    const totalBookings = await AikoHallBooking.countDocuments();
    const pendingBookings = await AikoHallBooking.countDocuments({ status: 'pending' });
    const approvedBookings = await AikoHallBooking.countDocuments({ status: 'approved' });
    const rejectedBookings = await AikoHallBooking.countDocuments({ status: 'rejected' });
    const completedBookings = await AikoHallBooking.countDocuments({ status: 'completed' });

    // Get upcoming bookings (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingBookings = await AikoHallBooking.countDocuments({
      bookingDate: { $gte: new Date(), $lte: thirtyDaysFromNow },
      status: 'approved'
    });

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        pendingBookings,
        approvedBookings,
        rejectedBookings,
        completedBookings,
        upcomingBookings
      }
    });

  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};

// @desc    Update Aiko Hall settings (Admin only)
// @route   PUT /api/aiko/settings
// @access  Private (Admin)
exports.updateSettings = async (req, res) => {
  try {
    const { adminSettings } = req.body;
    
    const aikoHall = await AikoHall.getAikoHall();
    
    // Update admin settings
    if (adminSettings) {
      aikoHall.adminSettings = { ...aikoHall.adminSettings, ...adminSettings };
    }
    
    await aikoHall.save();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: aikoHall
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating settings'
    });
  }
};
