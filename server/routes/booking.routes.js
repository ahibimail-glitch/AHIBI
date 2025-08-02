const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const User = require("../models/User");
const auth = require("../middlewares/auth");
const QRCode = require('qrcode'); // Import QRCode library
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const Scan = require("../models/Scan");

// @route   POST /api/bookings/verify-ticket
// @desc    Verify a ticket for an event
// @access  Private (Admin)
router.post("/verify-ticket", async (req, res) => {
  try {
    const { bookingId, eventId } = req.body;
    console.log(req.body);
    if (!bookingId || !eventId) {
      return res.status(400).json({ message: 'Booking ID and Event ID are required' });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found', status: 'INVALID' });
    }

    // Check if this is a season pass ticket
    const isSeasonPass = booking.ticketType && 
      (booking.ticketType.toLowerCase().includes('season') )

    // If it's not a season pass, verify that the event matches
    if (!isSeasonPass && booking.event.toString() !== eventId) {
      return res.status(400).json({ 
        message: 'This ticket is not for the selected event', 
        status: 'INVALID' 
      });
    }

    // If we got here, the ticket is valid (either for this event or it's a season pass)

    // Get the event to check ticket capacity
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found', status: 'INVALID' });
    }

    // Find the ticket type in the event to get capacity
    const ticketTypeInfo = event.ticketTypes.find(t => t.name === booking.ticketType);
    const capacity = ticketTypeInfo?.capacity || 1; // Default to 1 if not specified

    // Get scan count for this booking
    const scanCount = await Scan.countDocuments({ ticket: bookingId });

    // Check if all entries are used
    if (scanCount >= capacity) {
      return res.status(200).json({
        message: `This ticket has reached its maximum capacity (${capacity}). No more entries allowed.`,
        status: 'ALREADY_USED',
        checkedInAt: booking.checkedInAt,
        capacity: capacity,
        usedEntries: scanCount,
        remainingEntries: 0
      });
    }

    // If ticket is checked-in but still has remaining capacity
    if (booking.status === 'checked-in' && scanCount > 0) {
      return res.status(200).json({
        message: `Ticket has been used ${scanCount} time(s). ${capacity - scanCount} entries remaining.`,
        status: 'VALID',
        bookingId: booking._id,
        userId: booking.user,
        ticketType: booking.ticketType,
        eventDate: booking.createdAt,
        capacity: capacity,
        usedEntries: scanCount,
        remainingEntries: capacity - scanCount
      });
    }

    res.status(200).json({
      message: 'Ticket verified successfully.',
      status: 'VALID',
      bookingId: booking._id,
      userId: booking.user,
      ticketType: booking.ticketType,
      eventDate: booking.createdAt, // Or event start date if available
      capacity: capacity,
      usedEntries: scanCount,
      remainingEntries: capacity - scanCount
    });

  } catch (error) {
    console.error('Error verifying ticket:', error);
    res.status(500).json({ message: 'Server error during ticket verification' });
  }
});


// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private
router.post("/", auth.protect, async (req, res) => {
  try {
    // console.log("Booking payload:", req.body);
    const { event, user, quantity, price, ticketType } = req.body;
    //console.log("Booking payload:", { event, user, quantity });

    // Validate input
    if (!event || !user || !quantity || quantity < 1) {
      return res.status(400).json({
        message: "Please provide event,user, and valid quantity",
      });
    }

    // Fetch event and ticket
    console.log("Fetching event and ticket...");
    const isEvent = await Event.findById(event);
    //console.log("Event:", event);
    if (!isEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Fetch user details for sending notifications
    const userDetails = await User.findById(req.user._id);
    console.log('[Booking] User details for sending notifications:', {
      userId: req.user._id,
      hasUserDetails: !!userDetails,
      hasPhone: userDetails?.phone ? true : false,
      hasEmail: userDetails?.email ? true : false,
      phone: userDetails?.phone || 'Not available'
    });
    
    console.log(price)

    // Create booking
    const booking = new Booking({
      event: event,
      user: req.user._id,
      quantity,
      price: price,
      total: price,
      status: "confirmed",
      paymentStatus: "completed",
      ticketType: ticketType,
    });

    // Save booking
    await booking.save();

    // Update event tickets sold count and ticket type sold
    await Event.updateOne(
      { _id: event, "ticketTypes.name": ticketType },
      {
        $inc: {
          "ticketTypes.$.sold": quantity,
          totalRevenue: price
        }
      }
    );
    
    // Fetch and save the event to trigger the pre-save hook that recalculates ticketsSold
    const updatedEvent = await Event.findById(event);
    if (updatedEvent) {
      await updatedEvent.save(); // This will recalculate ticketsSold based on ticketTypes.sold
    }

    // Generate QR code for the ticket
    try {
      console.log('[Booking] Starting ticket notification process');
      const bookingData = JSON.stringify({
        bookingId: booking._id,
        eventId: event,
        ticketType: ticketType,
        quantity: quantity
      });
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(bookingData, {
        errorCorrectionLevel: 'H',
        margin: 2,
        color: {
          dark: '#4a154b',  // Dots color
          light: '#ffffff'  // Background color
        }
      });
      console.log('[Booking] QR code generated successfully');
      
      // Send ticket via SMS
      if (userDetails && userDetails.phone) {
        console.log('[Booking] Preparing to send SMS to:', userDetails.phone);
        // Format date for SMS
        const eventDate = updatedEvent.startDate ? 
          new Date(updatedEvent.startDate).toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }) : 'TBA';
        
        // Prepare ticket details
        const ticketDetails = {
          bookingId: booking._id,
          eventName: updatedEvent.title,
          ticketType: ticketType,
          eventDate: eventDate
        };
        console.log('[Booking] Sending ticket details via SMS:', ticketDetails);
        
        // Send SMS with ticket details
        try {
          const smsResult = await smsService.sendTicket(userDetails.phone, ticketDetails);
          console.log('[Booking] SMS result:', smsResult);
        } catch (smsError) {
          console.error('[Booking] SMS sending error:', smsError);
        }
      } else {
        console.log('[Booking] Cannot send SMS - no valid phone number found');
      }
      
      // Send ticket via email with QR code
      if (userDetails && userDetails.email) {
        // Rest of the email sending code remains unchanged
        res.status(201).json({
          message: "Booking created successfully",
          booking: {
            id: booking._id,
            event: booking.event,
            quantity: booking.quantity,
            price: booking.price,
            total: booking.total,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            bookedAt: booking.bookedAt,
          },
        });
      } else {
        res.status(201).json({
          message: "Booking created successfully",
          booking: {
            id: booking._id,
            event: booking.event,
            quantity: booking.quantity,
            price: booking.price,
            total: booking.total,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            bookedAt: booking.bookedAt,
          },
        });
      }

    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/bookings/my-bookings
// @desc    Get all bookings for the logged-in user
// @access  Private
router.get("/my-bookings", auth.protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).sort({ bookedAt: -1 });
    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/bookings/all
// @desc    Get all bookings (admin only)
// @access  Private (Admin only)


// @route   POST /api/bookings/verify-qr
// @desc    Verify a booking QR code
// @access  Private (Admin only)
router.post("/verify-qr", async (req, res) => {
  console.log("Helloo")
  console.log(req.body)
  try {
    const { bookingId, bookingCode } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId)
      .populate('event')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({ 
        status: "INVALID", 
        message: "Booking not found"
      });
    }

    // Check if the booking has been used for entry already
    if (booking.entryVerified) {
      return res.status(200).json({
        status: "ALREADY_USED",
        message: "This ticket has already been used for entry",
        booking: {
          id: booking._id,
          event: booking.event,
          user: booking.user,
          quantity: booking.quantity,
          ticketType: booking.ticketType,
          status: booking.status,
          entryVerified: booking.entryVerified,
          entryVerifiedAt: booking.entryVerifiedAt
        }
      });
    }

    // Check if the booking is confirmed
    if (booking.status !== 'confirmed') {
      return res.status(200).json({
        status: "INVALID",
        message: `Booking status is ${booking.status}, not confirmed`,
        booking: {
          id: booking._id,
          event: booking.event,
          user: booking.user,
          quantity: booking.quantity,
          ticketType: booking.ticketType,
          status: booking.status
        }
      });
    }

    // Check if the event date is valid (not in the past)
    const eventDate = new Date(booking.event.startDate);
    const now = new Date();
    
    // Allow entry on the day of the event
    if (eventDate.toDateString() !== now.toDateString() && eventDate > now) {
      return res.status(200).json({
        status: "INVALID",
        message: "This ticket is for a future event",
        booking: {
          id: booking._id,
          event: booking.event,
          user: booking.user,
          quantity: booking.quantity,
          ticketType: booking.ticketType,
          status: booking.status,
          eventDate: eventDate
        }
      });
    }

    // If all checks pass, the booking is valid
    return res.status(200).json({
      status: "VALID",
      message: "Booking is valid",
      booking: {
        id: booking._id,
        event: booking.event,
        user: booking.user,
        quantity: booking.quantity,
        ticketType: booking.ticketType,
        status: booking.status
      }
    });
  } catch (error) {
    console.error("Error verifying booking QR code:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/bookings/mark-entry
// @desc    Mark a booking as used for entry
// @access  Private (Admin only)
router.post("/mark-entry", auth.protect, auth.authorize('admin'), async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    // Find and update the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Mark as verified
    booking.entryVerified = true;
    booking.entryVerifiedAt = new Date();
    booking.entryVerifiedBy = req.user._id;
    
    await booking.save();

    return res.status(200).json({
      status: "SUCCESS",
      message: "Entry recorded successfully",
      booking: {
        id: booking._id,
        entryVerified: booking.entryVerified,
        entryVerifiedAt: booking.entryVerifiedAt
      }
    });
  } catch (error) {
    console.error("Error marking booking entry:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get a single booking by ID
// @access  Private
router.get("/:id", auth.protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('event')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ensure the user owns the booking or is an admin
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to view this booking" });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/bookings/check-in
// @desc    Mark a ticket as checked-in
// @access  Private (Admin)
router.post("/check-in", async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId).populate('event');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Get the event to check ticket capacity
    const event = await Event.findById(booking.event._id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Find the ticket type in the event to get capacity
    const ticketTypeInfo = event.ticketTypes.find(t => t.name === booking.ticketType);
    const capacity = ticketTypeInfo?.capacity || 1; // Default to 1 if not specified

    // Get scan count for this booking
    const scanCount = await Scan.countDocuments({ ticket: bookingId });

    // Check if all entries are used
    if (scanCount >= capacity) {
      return res.status(400).json({ 
        message: `This ticket has reached its maximum capacity (${capacity}). No more entries allowed.`,
        error: 'TICKET_EXHAUSTED'
      });
    }

    // Create a new scan record
    const newScan = new Scan({
      ticket: bookingId,
      event: booking.event._id,
      user: booking.user, // Add the user field from the booking
    });
    await newScan.save();

    // Mark as checked-in (only update status if this is the first scan)
    if (scanCount === 0) {
      booking.status = 'checked-in';
      booking.checkedInAt = new Date();
      await booking.save();
    }

    // Calculate remaining entries
    const remainingEntries = capacity - scanCount - 1;

    res.status(200).json({
      message: `Check-in successful. ${remainingEntries > 0 ? remainingEntries + ' entries remaining.' : 'No more entries remaining.'}`,
      status: 'CHECKED_IN',
      checkedInAt: booking.checkedInAt,
      capacity: capacity,
      usedEntries: scanCount + 1,
      remainingEntries: remainingEntries
    });

  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({ message: 'Server error during check-in' });
  }
});

// @route   POST /api/bookings/check-out
// @desc    Mark a checked-in ticket as valid again (allow reuse)
// @access  Private (Admin)
router.post("/check-out", async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Find the most recent scan for this booking
    const scans = await Scan.find({ ticket: bookingId }).sort({ createdAt: -1 }).limit(1);
    
    if (scans.length === 0) {
      return res.status(400).json({ message: 'No scan records found for this ticket.' });
    }

    // Delete the most recent scan to free up one entry
    await Scan.findByIdAndDelete(scans[0]._id);

    // Get updated scan count
    const remainingScans = await Scan.countDocuments({ ticket: bookingId });
    
    // If no more scans exist, reset the booking status
    if (remainingScans === 0) {
      booking.status = 'confirmed';
      await booking.save();
    }

    booking.checkedOutAt = new Date();
    await booking.save();

    // Get the event to check ticket capacity
    const event = await Event.findById(booking.event);
    const ticketTypeInfo = event?.ticketTypes.find(t => t.name === booking.ticketType);
    const capacity = ticketTypeInfo?.capacity || 1;

    res.status(200).json({
      message: 'Check-out successful. One entry has been freed up.',
      status: 'VALID',
      checkedOutAt: booking.checkedOutAt,
      capacity: capacity,
      usedEntries: remainingScans,
      remainingEntries: capacity - remainingScans
    });

  } catch (error) {
    console.error('Error during check-out:', error);
    res.status(500).json({ message: 'Server error during check-out' });
  }
});

// @route   POST /api/bookings/admin-manual-booking
// @desc    Create a new booking manually by admin
// @access  Private (Admin)
router.post("/admin-manual-booking",  async (req, res) => {
  try {
    const { event, user, ticketType, quantity, price } = req.body;
    console.log('[Admin Booking] Manual booking request received:', { event, user, ticketType, quantity, price });

    // Validate input
    if (!event || !user || !ticketType || !quantity || quantity < 1) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Create booking
    const booking = new Booking({
      event,
      user,
      ticketType,
      quantity,
      price,
      total: price,
      status: "confirmed",
      paymentStatus: "completed"
    });

    await booking.save();
    console.log('[Admin Booking] Booking created with ID:', booking._id);

    // Update ticket type sold count
    await Event.updateOne(
      { _id: event, "ticketTypes.name": ticketType },
      {
        $inc: {
          "ticketTypes.$.sold": quantity,
          totalRevenue: price
        }
      }
    );

    // Update total tickets sold
    const updatedEvent = await Event.findById(event);
    if (updatedEvent) {
      await updatedEvent.save(); // This will recalculate ticketsSold
      console.log('[Admin Booking] Event updated:', updatedEvent._id);
    }
    
    // Fetch user details for sending notifications
    const userDetails = await User.findById(user);
    console.log('[Admin Booking] User details for notifications:', {
      userId: user,
      hasUserDetails: !!userDetails,
      hasPhone: userDetails?.phone ? true : false,
      hasEmail: userDetails?.email ? true : false,
      phone: userDetails?.phone || 'Not available'
    });
    
    // Generate QR code for the ticket
    try {
      console.log('[Admin Booking] Starting ticket notification process');
      const bookingData = JSON.stringify({
        bookingId: booking._id,
        eventId: event,
        ticketType: ticketType,
        quantity: quantity
      });
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(bookingData, {
        errorCorrectionLevel: 'H',
        margin: 2,
        color: {
          dark: '#4a154b',  // Dots color
          light: '#ffffff'  // Background color
        }
      });
      console.log('[Admin Booking] QR code generated successfully');
      
      // Send ticket via SMS
      if (userDetails && userDetails.phone) {
        console.log('[Admin Booking] Preparing to send SMS to:', userDetails.phone);
        // Format date for SMS
        const eventDate = updatedEvent.startDate ? 
          new Date(updatedEvent.startDate).toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }) : 'TBA';
        
        // Prepare ticket details
        const ticketDetails = {
          bookingId: booking._id,
          eventName: updatedEvent.title,
          ticketType: ticketType,
          eventDate: eventDate
        };
        console.log('[Admin Booking] Sending ticket details via SMS:', ticketDetails);
        
        // Send SMS with ticket details - use await to properly catch errors
        try {
          const smsResult = await smsService.sendTicket(userDetails.phone, ticketDetails);
          console.log('[Admin Booking] SMS result:', smsResult);
        } catch (smsError) {
          console.error('[Admin Booking] SMS sending error:', smsError);
        }
      } else {
        console.log('[Admin Booking] Cannot send SMS - no valid phone number found');
      }
      
      // Send ticket via email with QR code
      if (userDetails && userDetails.email) {
        console.log('[Admin Booking] Preparing to send email to:', userDetails.email);
        // Prepare booking object with populated data for email template
        const bookingWithDetails = {
          ...booking._doc,
          user: userDetails,
          event: updatedEvent
        };
        
        // Send email with ticket details and QR code - use await to properly catch errors
        try {
          const emailResult = await emailService.sendTicketEmail(bookingWithDetails, qrCodeDataUrl);
          console.log('[Admin Booking] Email result:', emailResult);
        } catch (emailError) {
          console.error('[Admin Booking] Email sending error:', emailError);
        }
      } else {
        console.log('[Admin Booking] Cannot send email - no valid email found');
      }
      
      res.status(201).json({
        message: "Manual booking created successfully",
        booking: {
          id: booking._id,
          event: booking.event,
          user: booking.user,
          ticketType: booking.ticketType,
          quantity: booking.quantity,
          price: booking.price,
          total: booking.total,
          status: booking.status
        }
      });
      
    } catch (notificationError) {
      // Log notification errors but don't fail the booking process
      console.error('[Admin Booking] Error sending booking notifications:', notificationError);
      
      // Still return success for the booking itself
      res.status(201).json({
        message: "Manual booking created successfully (notification failed)",
        booking: {
          id: booking._id,
          event: booking.event,
          user: booking.user,
          ticketType: booking.ticketType,
          quantity: booking.quantity,
          price: booking.price,
          total: booking.total,
          status: booking.status
        }
      });
    }
  } catch (error) {
    console.error("[Admin Booking] Error creating manual booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
