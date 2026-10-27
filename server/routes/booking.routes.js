const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const DailyEvent = require("../models/DailyEvent");
const User = require("../models/User");
const auth = require("../middlewares/auth");
const QRCode = require('qrcode'); // Import QRCode library
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const whatsappService = require('../services/whatsappService');
const Scan = require("../models/Scan");
const { CheckInError, checkInBooking } = require("../services/bookingCheckInService");
const workshopRsvpController = require("../controllers/workshopRsvpController");

// Per-event purchase limits
const LIMITED_EVENT_ID = '6a17f0cfcea3b566702e86a9';
const MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT = 10;
const SERIAL_NUMBER_EVENT_ID = LIMITED_EVENT_ID;
const WORKSHOP_RSVP_EVENT_ID = workshopRsvpController.RSVP_EVENT_ID;

async function computeTicketSerialNumber(booking) {
  const eventId =
    booking.event?._id ||
    booking.event ||
    booking.eventSnapshot?._id;

  if (!eventId || String(eventId) !== SERIAL_NUMBER_EVENT_ID) {
    return null;
  }

  if (!['confirmed', 'checked-in'].includes(booking.status)) {
    return null;
  }

  const allBookings = await Booking.find({
    event: eventId,
    status: { $in: ['confirmed', 'checked-in'] },
  })
    .sort({ bookedAt: 1, ticketIndex: 1, _id: 1 })
    .select('_id quantity ticketIndex')
    .lean();

  let ticketsBefore = 0;
  const currentId = String(booking._id);
  const ticketIndex = Number(booking.ticketIndex) || 1;

  for (const row of allBookings) {
    const qty = Math.max(1, Number(row.quantity) || 1);

    if (String(row._id) === currentId) {
      return ticketsBefore + Math.min(ticketIndex, qty);
    }

    ticketsBefore += qty;
  }

  return null;
}

async function getUserTicketCountForEvent({ eventId, userId }) {
  const rows = await Booking.find({
    event: eventId,
    user: userId,
    status: { $in: ['pending', 'confirmed', 'checked-in'] },
  }).select('quantity');

  return rows.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
}

/** Collapse parent/child ticket rows from multi-ticket checkout into one booking per purchase. */
function groupUserBookingsForDisplay(bookings) {
  const groups = new Map();

  for (const booking of bookings) {
    const parentGroupKey = booking.parentBookingId
      ? booking.parentBookingId.toString()
      : booking._id.toString();
    // A NUSC season pass links bookings for different events to one order parent.
    // Keep each fixture separate in the dashboard while grouping seats for that fixture.
    const seasonMatchGroupKey = booking.nuscSeasonPassType
      ? `${parentGroupKey}:${booking.event?._id?.toString() || booking.eventSnapshot?._id?.toString() || booking.event?.toString() || 'unknown-event'}`
      : parentGroupKey;
    const groupKey = seasonMatchGroupKey;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(booking);
  }

  return Array.from(groups.values()).map((group) => {
    const parent = group.find((b) => !b.parentBookingId) || group[0];
    const sortedGroup = [...group].sort(
      (a, b) => (a.ticketIndex || 1) - (b.ticketIndex || 1)
    );
    const ticketCount = Math.max(
      Number(parent.totalTickets) || 0,
      Number(parent.quantity) || 1,
      sortedGroup.length
    );
    const groupTotal = sortedGroup.reduce(
      (sum, b) => sum + (Number(b.total) || Number(b.price) || 0),
      0
    );

    return {
      ...parent,
      quantity: ticketCount,
      total: groupTotal,
      totalTickets: ticketCount,
    };
  });
}

function mergeEventWithSnapshot(eventDoc, eventSnapshot) {
  if (!eventDoc && !eventSnapshot) return null;
  if (!eventSnapshot) return eventDoc;
  if (!eventDoc) return eventSnapshot;

  return {
    ...eventDoc,
    ...eventSnapshot,
    location: {
      ...(eventDoc.location || {}),
      ...(eventSnapshot.location || {}),
    },
  };
}

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
    const {
      event,
      user,
      quantity,
      price,
      ticketType,
      country,
      state,
      customerName,
      customerPhone,
      eventSnapshotStartDate,
      eventSnapshotEndDate,
    } = req.body;
    const bodyUser = user || (req.user && req.user._id);
    //console.log("Booking payload:", { event, user, quantity });

    // Validate input
    if (!event) {
      return res.status(400).json({ message: "Please provide event" });
    }
    // quantity validation is enforced for paid bookings below; for free/RSVP we default to 1

    // Fetch event and ticket
    console.log("Fetching event and ticket...");
    const isEvent = await Event.findById(event);
    //console.log("Event:", event);
    if (!isEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Enforce booking cutoff (bookingEndTime overrides endDate)
    const now = new Date();
    const cutoff = isEvent.bookingEndTime ? new Date(isEvent.bookingEndTime) : (isEvent.endDate ? new Date(isEvent.endDate) : null);
    if (cutoff && !isNaN(cutoff.getTime()) && now > cutoff) {
      return res.status(400).json({ message: "Bookings are closed for this event." });
    }

    // Workshop RSVP: auto-close per day, and shut down after Day 3
    if (String(event) === String(WORKSHOP_RSVP_EVENT_ID)) {
      const blockReason = workshopRsvpController.getWorkshopRegistrationBlockReason(ticketType, now);
      if (blockReason) {
        return res.status(400).json({ message: blockReason });
      }
    }

    // Determine if this is a free/RSVP booking
    const isFree = !!isEvent.isFreeEvent;

    // Enforce per-user ticket cap for specific event
    if (String(event) === LIMITED_EVENT_ID) {
      const requestedQty = isFree ? 1 : Number(quantity || 0);
      if (!isFree && (!Number.isInteger(requestedQty) || requestedQty < 1)) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      const existingCount = await getUserTicketCountForEvent({
        eventId: event,
        userId: req.user._id,
      });

      if (existingCount + requestedQty > MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT) {
        return res.status(400).json({
          message: `You can buy at most ${MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT} tickets for this event in total.`,
          limit: MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT,
          alreadyBooked: existingCount,
          requested: requestedQty,
          remaining: Math.max(0, MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT - existingCount),
        });
      }
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

    const resolvedStartDate = eventSnapshotStartDate
      ? new Date(eventSnapshotStartDate)
      : isEvent.startDate;
    const resolvedEndDate = eventSnapshotEndDate
      ? new Date(eventSnapshotEndDate)
      : isEvent.endDate;

    const snapshotStartDate =
      resolvedStartDate instanceof Date && !Number.isNaN(resolvedStartDate.getTime())
        ? resolvedStartDate
        : isEvent.startDate;
    const snapshotEndDate =
      resolvedEndDate instanceof Date && !Number.isNaN(resolvedEndDate.getTime())
        ? resolvedEndDate
        : isEvent.endDate;

    // Create booking with snapshot of event details
    const booking = new Booking({
      event: event,
      eventSnapshot: {
        _id: isEvent._id,
        title: isEvent.title,
        banner: isEvent.banner,
        startDate: snapshotStartDate,
        endDate: snapshotEndDate,
        location: {
          address: isEvent.location?.address,
          city: isEvent.location?.city
        }
      },
      user: req.user._id,
      ...(customerName && { customerName }),
      ...(customerPhone && { customerPhone }),
      quantity: isFree ? 1 : quantity,
      price: isFree ? 0 : price,
      total: isFree ? 0 : price,
      status: "confirmed",
      paymentStatus: "completed",
      ticketType: isFree ? (ticketType || 'RSVP') : ticketType,
      // Add country/state for HMF events
      ...(country && { country: country }),
      ...(state && { state: state }),
    });

    // Save booking
    await booking.save();

    // Update event tickets sold count and ticket type sold (skip for free events with no ticket types)
    if (!isFree) {
      await Event.updateOne(
        { _id: event, "ticketTypes.name": ticketType },
        {
          $inc: {
            "ticketTypes.$.sold": quantity,
            totalRevenue: price
          }
        }
      );
    }
    
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
      
      // SMS sending disabled for successful bookings

      const displayEventDate = snapshotStartDate
        ? new Date(snapshotStartDate).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Event date TBA';

      // Send WhatsApp ticket confirmation via Meta Cloud API template (non-blocking)
      if (userDetails?.phone) {
        whatsappService
          .sendTicketReadyTemplate({
            phone: userDetails.phone,
            eventName: isEvent.title,
            eventDate: displayEventDate,
            venue: isEvent.location?.address || isEvent.location?.city || 'Venue TBA',
            bookingId: booking._id,
            eventId: isEvent._id,
          })
          .then((result) => {
            if (result?.success === false) {
              console.error('[Booking] WhatsApp ticket template failed:', result.message || result.error);
              return;
            }
            console.log('[Booking] WhatsApp ticket template sent');
          })
          .catch((waError) =>
            console.error('[Booking] WhatsApp ticket template send failed:', waError?.message || waError)
          );
      }

      // Send admin WhatsApp alert (non-blocking)
      whatsappService
        .sendAdminBookingAlert({
          bookingId: booking._id,
          customerName: userDetails?.name || 'Customer',
          itemsCount: booking.quantity,
          totalAmount: booking.total,
          shippingLabel: displayEventDate,
          statusPretty: 'Confirmed'
        })
        .then(() => console.log('[Booking] Admin WhatsApp alert sent'))
        .catch((waError) =>
          console.error('[Booking] Admin WhatsApp alert failed:', waError?.message || waError)
        );

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
    // Get regular event bookings
    const bookings = await Booking.find({ user: req.user._id })
      .sort({ bookedAt: -1 })
      .populate('event', 'title banner startDate slug isExternal externalBookingUrl')
      .populate('dailyEvent', 'title banner startTime duration location')
      .lean();

    const groupedBookings = groupUserBookingsForDisplay(bookings)
      .sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());

    const normalizedBookings = groupedBookings.map(b => ({
      ...b,
      event: mergeEventWithSnapshot(b.event, b.eventSnapshot),
      bookingType: 'event'
    }));

    // Get Annie Musical bookings
    const AnnieBooking = require("../models/AnnieBooking");
    const AnnieSeat = require("../models/AnnieSeat");
    
    const annieBookings = await AnnieBooking.find({ userId: req.user._id })
      .populate('seats', 'row number price')
      .sort({ createdAt: -1 })
      .lean();

    // Format Annie Musical bookings to match regular booking structure
    const formattedAnnieBookings = annieBookings.map(booking => {
      const seatDetails = booking.seats.map(seat => `${seat.row}${seat.number}`).join(', ');
      
      return {
        _id: booking._id,
        event: {
          _id: 'annie-musical',
          title: 'Annie Musical',
          banner: '/images/annie-musical-banner.jpg', // Default banner for Annie Musical
          startDate: '2025-12-25' // Default date or you can make this dynamic
        },
        ticketType: `Seats: ${seatDetails}`,
        quantity: booking.seats.length,
        price: booking.totalPrice / booking.seats.length, // Price per seat
        total: booking.totalPrice,
        status: booking.status,
        paymentStatus: booking.status === 'confirmed' ? 'completed' : booking.status,
        bookedAt: booking.createdAt,
        bookingType: 'annie-musical',
        seats: booking.seats.map(seat => ({
          id: `${seat.row}${seat.number}`,
          price: seat.price
        }))
      };
    });

    // Combine both types of bookings and sort by date
    const allBookings = [...normalizedBookings, ...formattedAnnieBookings]
      .sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    res.json({ bookings: allBookings });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/bookings/organizer-bookings
// @desc    Get all bookings for events created by the logged-in organizer
// @access  Private (Organizer only)
router.get("/organizer-bookings", auth.protect, async (req, res) => {
  try {
    // Check if user is an organizer
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ 
        message: "Access denied. Organizer role required." 
      });
    }

    // First get all events created by this organizer
    const organizerEvents = await Event.find({ organizer: req.user._id }).select('_id');
    const eventIds = organizerEvents.map(event => event._id);

    if (eventIds.length === 0) {
      return res.json({ bookings: [] });
    }

    // Get all bookings for these events
    const bookings = await Booking.find({ event: { $in: eventIds } })
      .sort({ bookedAt: -1 })
      .populate('event', 'title banner startDate organizer')
      .populate('user', 'name email phone')
      .lean();

    const normalized = bookings.map(b => ({
      ...b,
      event: mergeEventWithSnapshot(b.event, b.eventSnapshot)
    }));

    res.json({ bookings: normalized });
  } catch (error) {
    console.error('Error fetching organizer bookings:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/bookings/organizer-daily-bookings
// @desc    Get all bookings for daily events created by the logged-in organizer
// @access  Private (Organizer only)
router.get("/organizer-daily-bookings", auth.protect, async (req, res) => {
  try {
    // Check if user is an organizer
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ 
        message: "Access denied. Organizer role required." 
      });
    }

    // First get all daily events created by this organizer
    const organizerDailyEvents = await DailyEvent.find({ organizer: req.user._id }).select('_id');
    const dailyEventIds = organizerDailyEvents.map(event => event._id);

    if (dailyEventIds.length === 0) {
      return res.json({ bookings: [] });
    }

    // Get all bookings for these daily events
    const bookings = await Booking.find({ dailyEvent: { $in: dailyEventIds }, isDailyEvent: true })
      .sort({ bookedAt: -1 })
      .populate('dailyEvent', 'title banner periodStartDate periodEndDate startTime duration location organizer')
      .populate('user', 'name email phone')
      .lean();

    // Normalize the bookings to match the regular event booking structure
    const normalized = bookings.map(b => ({
      ...b,
      event: {
        _id: b.dailyEvent?._id,
        title: b.dailyEvent?.title,
        banner: b.dailyEvent?.banner,
        startDate: b.selectedDate || b.dailyEvent?.periodStartDate,
        organizer: b.dailyEvent?.organizer
      }
    }));

    res.json({ bookings: normalized });
  } catch (error) {
    console.error('Error fetching organizer daily event bookings:', error);
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
      .populate('event', 'title banner startDate endDate location')
      .populate('user', 'name email phone')
      .lean();

    if (!booking) {
      return res.status(404).json({ 
        status: "INVALID", 
        message: "Booking not found"
      });
    }

    // Fallback to snapshot if event was deleted
    const eventData = booking.event || booking.eventSnapshot || null;

    // Check if the booking has been used for entry already
    if (booking.entryVerified) {
      return res.status(200).json({
        status: "ALREADY_USED",
        message: "This ticket has already been used for entry",
        booking: {
          id: booking._id,
          event: eventData,
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
          event: eventData,
          user: booking.user,
          quantity: booking.quantity,
          ticketType: booking.ticketType,
          status: booking.status
        }
      });
    }

    // Check if the event date is valid (not in the past)
    const eventDate = eventData?.startDate ? new Date(eventData.startDate) : new Date(booking.bookedAt || Date.now());
    const now = new Date();
    
    // Allow entry on the day of the event
    if (eventDate.toDateString() !== now.toDateString() && eventDate > now) {
      return res.status(200).json({
        status: "INVALID",
        message: "This ticket is for a future event",
        booking: {
          id: booking._id,
          event: eventData,
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
        event: eventData,
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

// @route   GET /api/bookings/related/:id
// @desc    Get all related bookings for a parent booking
// @access  Private
router.get("/related/:id", auth.protect, async (req, res) => {
  try {
    const parentBooking = await Booking.findById(req.params.id);

    if (!parentBooking) {
      return res.status(404).json({ message: "Parent booking not found" });
    }

    // Ensure the user owns the booking or is an admin
    if (parentBooking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to view this booking" });
    }

    // Find all related bookings (same parent booking ID or this booking if it's the parent)
    let relatedBookings;
    if (parentBooking.parentBookingId) {
      // This is a child booking, find all siblings and parent
      relatedBookings = await Booking.find({
        event: parentBooking.event,
        $or: [
          { _id: parentBooking.parentBookingId },
          { parentBookingId: parentBooking.parentBookingId }
        ]
      }).populate('event', 'title banner startDate').populate('user', 'name email phone').lean();
    } else {
      // This is a parent booking, find all children
      relatedBookings = await Booking.find({
        event: parentBooking.event,
        $or: [
          { _id: parentBooking._id },
          { parentBookingId: parentBooking._id }
        ]
      }).populate('event', 'title banner startDate').populate('user', 'name email phone').lean();
    }

    // Sort by ticketIndex
    relatedBookings.sort((a, b) => (a.ticketIndex || 1) - (b.ticketIndex || 1));

    // Fallback to snapshot if event was deleted
    const normalized = await Promise.all(
      relatedBookings.map(async (b) => {
        const row = {
          ...b,
          event: mergeEventWithSnapshot(b.event, b.eventSnapshot),
        };
        const ticketSerialNumber = await computeTicketSerialNumber(row);
        if (ticketSerialNumber != null) {
          row.ticketSerialNumber = ticketSerialNumber;
        }
        return row;
      })
    );

    res.json({ success: true, data: normalized });
  } catch (error) {
    console.error("Error fetching related bookings:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get a single booking by ID
// @access  Private
router.get("/:id", auth.protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('event', 'title banner startDate endDate location ticketTypes')
      .populate('user', 'name email phone')
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ensure the user owns the booking or is an admin
    const bookingUserId = (booking.user && booking.user._id) ? booking.user._id.toString() : booking.user.toString();
    if (bookingUserId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to view this booking" });
    }

    // Fallback to snapshot if event was deleted
    const normalized = {
      ...booking,
      event: mergeEventWithSnapshot(booking.event, booking.eventSnapshot)
    };

    const ticketSerialNumber = await computeTicketSerialNumber(normalized);
    if (ticketSerialNumber != null) {
      normalized.ticketSerialNumber = ticketSerialNumber;
    }

    res.json({ success: true, data: normalized });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/bookings/check-in
// @desc    Mark a ticket as checked-in
// @access  Private (Admin/Organizer)
router.post("/check-in", auth.protect, auth.authorize('admin', 'organizer'), async (req, res) => {
  try {
    const { bookingId, eventId, requestId } = req.body || {};
    const idempotencyKey = requestId || req.get('Idempotency-Key');
    if (!bookingId || !eventId) {
      return res.status(400).json({ message: 'Booking ID and event ID are required', code: 'CHECK_IN_IDENTITY_REQUIRED' });
    }

    const result = await checkInBooking({
      bookingId,
      eventId,
      requestId: idempotencyKey,
      staffId: req.user?._id,
    });
    const remainingEntries = result.remainingEntries;
    return res.status(200).json({
      message: `Check-in successful. ${remainingEntries > 0 ? remainingEntries + ' entries remaining.' : 'No more entries remaining.'}`,
      ...result,
    });

  } catch (error) {
    console.error('Error during check-in:', error);
    if (error instanceof CheckInError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'This check-in request was already processed.', code: 'REQUEST_ALREADY_PROCESSED' });
    }
    return res.status(500).json({ message: 'Server error during check-in' });
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
    const { event, user, ticketType, quantity, price, customerName, customerPhone, tickets, country, state, modeOfPayment, visitorType } = req.body;
    console.log('[Admin Booking] Manual booking request received:', { event, user, ticketType, quantity, price, tickets, visitorType });

    // Basic validation
    if (!event || !user) {
      return res.status(400).json({ message: "Event and user are required" });
    }

    const eventDoc = await Event.findById(event);
    if (!eventDoc) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Enforce booking cutoff (bookingEndTime overrides endDate)
    const now = new Date();
    const cutoff = eventDoc.bookingEndTime ? new Date(eventDoc.bookingEndTime) : (eventDoc.endDate ? new Date(eventDoc.endDate) : null);
    if (cutoff && !isNaN(cutoff.getTime()) && now > cutoff) {
      return res.status(400).json({ message: 'Bookings are closed for this event.' });
    }

    // Normalize tickets input: prefer tickets array, fallback to single ticket payload
    let ticketItems = [];
    if (Array.isArray(tickets) && tickets.length > 0) {
      ticketItems = tickets.map(t => ({ ticketType: t.ticketType, quantity: Number(t.quantity) || 1, price: Number(t.price) || 0 }));
    } else if (ticketType && quantity && price !== undefined) {
      ticketItems = [{ ticketType, quantity: Number(quantity) || 1, price: Number(price) || 0 }];
    } else {
      return res.status(400).json({ message: 'Please provide ticket details (tickets array or ticketType/quantity/price)' });
    }

    // Enforce per-user ticket cap for specific event
    if (String(eventDoc._id) === LIMITED_EVENT_ID) {
      const requestedQty = ticketItems.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
      if (!Number.isInteger(requestedQty) || requestedQty < 1) {
        return res.status(400).json({ message: 'Invalid quantity' });
      }

      const existingCount = await getUserTicketCountForEvent({
        eventId: eventDoc._id,
        userId: user,
      });

      if (existingCount + requestedQty > MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT) {
        return res.status(400).json({
          message: `This user can buy at most ${MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT} tickets for this event in total.`,
          limit: MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT,
          alreadyBooked: existingCount,
          requested: requestedQty,
          remaining: Math.max(0, MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT - existingCount),
        });
      }
    }

    // Create bookings for each ticket item (create one Booking per ticket -- quantity times)
    const createdBookings = [];
    const bookingIds = [];
    let totalTickets = 0;

    for (const item of ticketItems) {
      if (!item.ticketType || !item.quantity || item.quantity < 1) continue;

      // For each quantity, create individual booking records (maintains parity with payment flow)
      for (let i = 0; i < item.quantity; i++) {
        const newBooking = new Booking({
          event: eventDoc._id,
          eventSnapshot: {
            _id: eventDoc._id,
            title: eventDoc.title,
            banner: eventDoc.banner,
            startDate: eventDoc.startDate,
            endDate: eventDoc.endDate,
            location: {
              address: eventDoc.location?.address,
              city: eventDoc.location?.city
            }
          },
          user,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          ticketType: item.ticketType,
          quantity: 1,
          price: item.price,
          total: item.price,
          status: 'confirmed',
          paymentStatus: 'completed',
          // Add country/state for HMF events
          ...(country && { country: country }),
          ...(state && { state: state }),
          // Add mode of payment for manual HMF bookings
          ...(modeOfPayment && { modeOfPayment: modeOfPayment }),
          // Add visitor type for manual bookings
          ...(visitorType && { visitorType: visitorType }),
        });

        await newBooking.save();
        createdBookings.push(newBooking);
        bookingIds.push(newBooking._id);
        totalTickets += 1;
      }

      // Update event ticket type sold count and revenue
      await Event.updateOne(
        { _id: eventDoc._id, 'ticketTypes.name': item.ticketType },
        { $inc: { 'ticketTypes.$.sold': item.quantity, totalRevenue: item.price * item.quantity } }
      );
    }

    // Ensure event recalculation of sold tickets
    const updatedEvent = await Event.findById(eventDoc._id);
    if (updatedEvent) {
      try {
        await updatedEvent.save();
      } catch (saveErr) {
        // fallback: manually update ticketsSold
        const totalSold = updatedEvent.ticketTypes.reduce((sum, t) => sum + t.sold, 0);
        await Event.updateOne({ _id: eventDoc._id }, { $set: { ticketsSold: totalSold } });
      }
      console.log('[Admin Booking] Event updated:', updatedEvent._id);
    }
    
    // Fetch user details for sending notifications. If not found, use provided customerName/customerPhone
    let userDetails = null;
    if (user) {
      userDetails = await User.findById(user);
    }

    if (!userDetails) {
      userDetails = {
        name: customerName || 'Guest User',
        phone: customerPhone || null,
        email: null
      };
    }

    console.log('[Admin Booking] User details for notifications:', {
      userId: user,
      hasUserDetails: !!(await User.findById(user)),
      hasPhone: userDetails?.phone ? true : false,
      hasEmail: userDetails?.email ? true : false,
      phone: userDetails?.phone || 'Not available'
    });

    // Notification & QR: build a summary payload for the tickets
    try {
      console.log('[Admin Booking] Starting ticket notification process for multiple tickets');
      const bookingSummary = {
        bookingIds,
        eventId: eventDoc._id,
        ticketTypes: ticketItems.map(t => `${t.ticketType} (${t.quantity})`).join(', '),
        totalTickets
      };

      const bookingData = JSON.stringify(bookingSummary);

      // Generate QR code as data URL (summary)
      const qrCodeDataUrl = await QRCode.toDataURL(bookingData, {
        errorCorrectionLevel: 'H',
        margin: 2,
        color: { dark: '#4a154b', light: '#ffffff' }
      });

      // Commented out SMS and Email notifications for manual bookings
      console.log('[Admin Booking] Notifications disabled for manual bookings');
      
      // Uncomment the code below to re-enable notifications
      /*
      // Send ticket via SMS if phone available
      if (userDetails && userDetails.phone) {
        console.log('[Admin Booking] Preparing to send SMS to:', userDetails.phone);
        const eventDate = updatedEvent.startDate ? new Date(updatedEvent.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA';

        const ticketDetails = {
          bookingIds,
          eventName: updatedEvent.title,
          ticketType: bookingSummary.ticketTypes,
          quantity: totalTickets,
          eventDate
        };

        try {
          await smsService.sendTicket(userDetails.phone, ticketDetails);
          console.log('[Admin Booking] SMS sent to', userDetails.phone);
        } catch (smsError) {
          console.error('[Admin Booking] SMS sending error:', smsError);
        }
      }

      // Send ticket via email with QR code if email available
      if (userDetails && userDetails.email) {
        try {
          const bookingWithDetails = { event: updatedEvent, user: userDetails, bookingIds, totalTickets };
          await emailService.sendTicketEmail(bookingWithDetails, qrCodeDataUrl);
          console.log('[Admin Booking] Email sent to', userDetails.email);
        } catch (emailError) {
          console.error('[Admin Booking] Email sending error:', emailError);
        }
      }
      */

      res.status(201).json({
        message: 'Manual booking(s) created successfully',
        bookings: createdBookings.map(b => ({ id: b._id, ticketType: b.ticketType, price: b.price })),
        bookingIds,
        totalTickets,
      });

    } catch (notificationError) {
      console.error('[Admin Booking] Error sending booking notifications:', notificationError);
      res.status(201).json({
        message: 'Manual booking(s) created successfully (notification failed)',
        bookings: createdBookings.map(b => ({ id: b._id, ticketType: b.ticketType, price: b.price })),
        bookingIds,
        totalTickets,
      });
    }
  } catch (error) {
    console.error("[Admin Booking] Error creating manual booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/bookings/daily-event/:eventId
// @desc    Get all bookings for a specific daily event by the logged-in user
// @access  Private
router.get("/daily-event/:eventId", auth.protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      dailyEvent: req.params.eventId,
      user: req.user._id 
    })
      .sort({ bookedAt: -1 })
      .populate('dailyEvent', 'title banner location startTime duration ticketTypes')
      .lean();

    const normalized = bookings.map(b => ({
      ...b,
      dailyEvent: b.dailyEvent || {}
    }));

    res.json({ success: true, data: { bookings: normalized } });
  } catch (error) {
    console.error('Error fetching daily event bookings:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/bookings/:bookingId/ticket
// @desc    Download ticket as PDF
// @access  Private
router.get("/:bookingId/ticket", auth.protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      user: req.user._id
    })
      .populate('event', 'title banner startDate endDate location')
      .populate('dailyEvent', 'title banner startTime duration location')
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ticket-${booking._id}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('AHIBI', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Event Ticket', { align: 'center' });
    doc.moveDown(2);

    // Event details
    const event = booking.isDailyEvent
      ? booking.dailyEvent
      : mergeEventWithSnapshot(booking.event, booking.eventSnapshot);
    if (event) {
      doc.fontSize(18).font('Helvetica-Bold').text(event.title);
      doc.moveDown(0.5);

      if (booking.isDailyEvent && booking.selectedDate) {
        doc.fontSize(12).font('Helvetica').text(`Date: ${new Date(booking.selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
        if (event.startTime) {
          doc.text(`Time: ${event.startTime}`);
        }
      } else if (event.startDate) {
        doc.fontSize(12).font('Helvetica').text(`Date: ${new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
      }

      if (event.location) {
        doc.text(`Venue: ${event.location.address || ''}`);
        if (event.location.city) {
          doc.text(`City: ${event.location.city}`);
        }
      }
    }

    doc.moveDown(1);

    // Ticket details
    doc.fontSize(14).font('Helvetica-Bold').text('Ticket Details');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Ticket Type: ${booking.ticketType}`);
    doc.text(`Quantity: ${booking.quantity}`);
    doc.text(`Total: ₹${booking.total.toFixed(2)}`);
    doc.moveDown(0.5);
    doc.text(`Booking ID: ${booking._id}`);
    doc.text(`Status: ${booking.status.toUpperCase()}`);
    doc.moveDown(1);

    // QR Code
    if (booking.qrCode) {
      try {
        const qrImageData = booking.qrCode.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(qrImageData, 'base64');
        doc.image(qrBuffer, {
          fit: [200, 200],
          align: 'center'
        });
      } catch (err) {
        console.error('Error adding QR code to PDF:', err);
      }
    }

    doc.moveDown(2);
    doc.fontSize(10).text('Please present this ticket at the venue entrance.', { align: 'center' });
    doc.text('Thank you for booking with Ahibi!', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error generating ticket PDF:', error);
    res.status(500).json({ message: "Error generating ticket", error: error.message });
  }
});

// @route   POST /api/bookings/free
// @desc    Create free booking (RSVP) for events or daily events
// @access  Private
router.post("/free", auth.protect, async (req, res) => {
  try {
    const { bookings } = req.body;

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({ message: "Please provide bookings array" });
    }

    const createdBookings = [];

    // Enforce per-user ticket cap for specific event across the whole request
    let limitedEventRequestedQty = 0;
    for (const bookingData of bookings) {
      if (bookingData?.event && String(bookingData.event) === LIMITED_EVENT_ID) {
        limitedEventRequestedQty += Number(bookingData.quantity || 1);
      }
    }

    if (limitedEventRequestedQty > 0) {
      const existingCount = await getUserTicketCountForEvent({
        eventId: LIMITED_EVENT_ID,
        userId: req.user._id,
      });

      if (existingCount + limitedEventRequestedQty > MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT) {
        return res.status(400).json({
          message: `You can buy at most ${MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT} tickets for this event in total.`,
          limit: MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT,
          alreadyBooked: existingCount,
          requested: limitedEventRequestedQty,
          remaining: Math.max(0, MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT - existingCount),
        });
      }
    }

    for (const bookingData of bookings) {
      const { dailyEvent, event, selectedDate, ticketType, quantity } = bookingData;

      // Validate that either dailyEvent or event is provided
      if (!dailyEvent && !event) {
        return res.status(400).json({ message: "Please provide either event or dailyEvent" });
      }

      let eventDoc;
      let eventSnapshot;

      if (dailyEvent) {
        // Handle daily event booking
        eventDoc = await DailyEvent.findById(dailyEvent);
        if (!eventDoc) {
          return res.status(404).json({ message: "Daily event not found" });
        }

        if (!selectedDate) {
          return res.status(400).json({ message: "Please provide selectedDate for daily event" });
        }

        eventSnapshot = {
          _id: eventDoc._id,
          title: eventDoc.title,
          banner: eventDoc.banner,
          startDate: selectedDate,
          endDate: selectedDate,
          location: {
            address: eventDoc.location?.address,
            city: eventDoc.location?.city
          }
        };
      } else {
        // Handle regular event booking
        eventDoc = await Event.findById(event);
        if (!eventDoc) {
          return res.status(404).json({ message: "Event not found" });
        }

        eventSnapshot = {
          _id: eventDoc._id,
          title: eventDoc.title,
          banner: eventDoc.banner,
          startDate: eventDoc.startDate,
          endDate: eventDoc.endDate,
          location: {
            address: eventDoc.location?.address,
            city: eventDoc.location?.city
          }
        };
      }

      // Create booking
      // Resolve ticket type name if it's an ID
      let ticketTypeName = ticketType || 'Free RSVP';
      if (dailyEvent && ticketType) {
        const ticketTypeObj = eventDoc.ticketTypes?.find(tt => tt._id.toString() === ticketType.toString());
        if (ticketTypeObj) {
          ticketTypeName = ticketTypeObj.name;
        }
      } else if (event && ticketType) {
        const ticketTypeObj = eventDoc.ticketTypes?.find(tt => tt._id.toString() === ticketType.toString());
        if (ticketTypeObj) {
          ticketTypeName = ticketTypeObj.name;
        }
      }

      const booking = new Booking({
        ...(dailyEvent && { dailyEvent, isDailyEvent: true, selectedDate }),
        ...(event && { event }),
        eventSnapshot,
        user: req.user._id,
        quantity: quantity || 1,
        price: 0,
        total: 0,
        status: "confirmed",
        paymentStatus: "free",
        ticketType: ticketTypeName,
      });

      await booking.save();
      createdBookings.push(booking);

      // Update ticket sold count
      if (dailyEvent) {
        await DailyEvent.updateOne(
          { _id: dailyEvent, "ticketTypes._id": ticketType },
          { $inc: { "ticketTypes.$.sold": quantity || 1 } }
        );
      } else {
        await Event.updateOne(
          { _id: event, "ticketTypes._id": ticketType },
          { $inc: { "ticketTypes.$.sold": quantity || 1 } }
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "RSVP confirmed successfully",
      data: { bookings: createdBookings }
    });
  } catch (error) {
    console.error("Error creating free booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/bookings/initiate
// @desc    Initiate payment for bookings (supports both events and daily events)
// @access  Private
router.post("/initiate", auth.protect, async (req, res) => {
  try {
    const { bookings, couponCode } = req.body;
    const Razorpay = require('razorpay');

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({ message: "Please provide bookings array" });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    let totalAmount = 0;
    const createdBookings = [];
    const bookingIds = [];

    // Enforce per-user ticket cap for specific event across the whole request
    let limitedEventRequestedQty = 0;
    for (const bookingData of bookings) {
      if (bookingData?.event && String(bookingData.event) === LIMITED_EVENT_ID) {
        limitedEventRequestedQty += Number(bookingData.quantity || 0);
      }
    }

    if (limitedEventRequestedQty > 0) {
      if (!Number.isInteger(limitedEventRequestedQty) || limitedEventRequestedQty < 1) {
        return res.status(400).json({ message: 'Invalid quantity' });
      }

      const existingCount = await getUserTicketCountForEvent({
        eventId: LIMITED_EVENT_ID,
        userId: req.user._id,
      });

      if (existingCount + limitedEventRequestedQty > MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT) {
        return res.status(400).json({
          message: `You can buy at most ${MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT} tickets for this event in total.`,
          limit: MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT,
          alreadyBooked: existingCount,
          requested: limitedEventRequestedQty,
          remaining: Math.max(0, MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT - existingCount),
        });
      }
    }

    for (const bookingData of bookings) {
      const { dailyEvent, event, selectedDate, ticketType, quantity, price, total } = bookingData;

      if (!dailyEvent && !event) {
        return res.status(400).json({ message: "Please provide either event or dailyEvent" });
      }

      let eventDoc;
      let eventSnapshot;

      if (dailyEvent) {
        eventDoc = await DailyEvent.findById(dailyEvent);
        if (!eventDoc) {
          return res.status(404).json({ message: "Daily event not found" });
        }

        if (!selectedDate) {
          return res.status(400).json({ message: "Please provide selectedDate for daily event" });
        }

        eventSnapshot = {
          _id: eventDoc._id,
          title: eventDoc.title,
          banner: eventDoc.banner,
          startDate: selectedDate,
          endDate: selectedDate,
          location: {
            address: eventDoc.location?.address,
            city: eventDoc.location?.city
          }
        };
      } else {
        eventDoc = await Event.findById(event);
        if (!eventDoc) {
          return res.status(404).json({ message: "Event not found" });
        }

        eventSnapshot = {
          _id: eventDoc._id,
          title: eventDoc.title,
          banner: eventDoc.banner,
          startDate: eventDoc.startDate,
          endDate: eventDoc.endDate,
          location: {
            address: eventDoc.location?.address,
            city: eventDoc.location?.city
          }
        };
      }

      // Validate and get ticket type ID
      let ticketTypeId = ticketType;
      let ticketTypeName = ticketType;
      
      if (dailyEvent && ticketType) {
        const ticketTypeObj = eventDoc.ticketTypes?.find(tt => tt._id.toString() === ticketType.toString());
        if (ticketTypeObj) {
          ticketTypeId = ticketTypeObj._id;
          ticketTypeName = ticketTypeObj.name;
        }
      } else if (event && ticketType) {
        const ticketTypeObj = eventDoc.ticketTypes?.find(tt => tt._id.toString() === ticketType.toString());
        if (ticketTypeObj) {
          ticketTypeId = ticketTypeObj._id;
          ticketTypeName = ticketTypeObj.name;
        }
      }

      const booking = new Booking({
        ...(dailyEvent && { dailyEvent, isDailyEvent: true, selectedDate }),
        ...(event && { event }),
        eventSnapshot,
        user: req.user._id,
        quantity,
        price,
        total,
        status: "pending",
        paymentStatus: "pending",
        ticketType: ticketTypeName,
        ticketTypeId: ticketTypeId,
      });

      await booking.save();
      createdBookings.push(booking);
      bookingIds.push(booking._id);
      totalAmount += total;
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // Convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        bookingIds: bookingIds.join(','),
        userId: req.user._id.toString(),
      },
    });

    res.status(200).json({
      success: true,
      order,
      bookingIds,
    });
  } catch (error) {
    console.error("Error initiating payment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/bookings/verify
// @desc    Verify payment and confirm bookings
// @access  Private
router.post("/verify", auth.protect, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingIds } = req.body;
    const crypto = require('crypto');

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // Mark bookings as failed
      await Booking.updateMany(
        { _id: { $in: bookingIds } },
        { status: "failed", paymentStatus: "failed" }
      );
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Update bookings to confirmed
    const updatedBookings = await Booking.find({ _id: { $in: bookingIds } });

    for (const booking of updatedBookings) {
      booking.status = "confirmed";
      booking.paymentStatus = "completed";
      booking.razorpayPaymentId = razorpay_payment_id;
      booking.razorpayOrderId = razorpay_order_id;
      await booking.save();

      // Update ticket sold count
      if (booking.isDailyEvent && booking.dailyEvent && booking.ticketTypeId) {
        await DailyEvent.updateOne(
          { _id: booking.dailyEvent, "ticketTypes._id": booking.ticketTypeId },
          { $inc: { "ticketTypes.$.sold": booking.quantity, totalRevenue: booking.total } }
        );
      } else if (booking.event && booking.ticketTypeId) {
        await Event.updateOne(
          { _id: booking.event, "ticketTypes._id": booking.ticketTypeId },
          { $inc: { "ticketTypes.$.sold": booking.quantity, totalRevenue: booking.total } }
        );
      }

      // Generate QR code
      try {
        const bookingData = JSON.stringify({
          bookingId: booking._id,
          eventId: booking.isDailyEvent ? booking.dailyEvent : booking.event,
          ticketType: booking.ticketType,
          quantity: booking.quantity,
          selectedDate: booking.selectedDate
        });

        const qrCodeDataUrl = await QRCode.toDataURL(bookingData, {
          errorCorrectionLevel: 'H',
          margin: 2,
          color: {
            dark: '#4a154b',
            light: '#ffffff'
          }
        });

        booking.qrCode = qrCodeDataUrl;
        await booking.save();
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment verified and bookings confirmed",
      bookings: updatedBookings,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
