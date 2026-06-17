const express = require('express');
const { check } = require('express-validator');
const adminController = require('../controllers/adminController');
const eventController = require('../controllers/eventController');
const dailyEventController = require('../controllers/dailyEventController');
const { protect, authorize } = require('../middlewares/auth');
const { validateEvent } = require('../middlewares/validation');
const Booking = require('../models/Booking');
const router = express.Router();
const paymentTxController = require('../controllers/paymentTransactionController');
const heliTaxiiController = require('../controllers/heliTaxiiController');

// Public admin routes (unprotected)
router.get('/users', adminController.getUsers);

// Protect all admin routes
router.use(protect);
router.use(authorize('admin'));

// Event management
router.get('/events', eventController.getEvents);
router.get('/events/pending', adminController.getPendingEvents);
router.post('/events', validateEvent, eventController.createEvent);
router.put('/events/:id', [
  check('title', 'Title is required').optional().notEmpty().trim(),
  check('description', 'Description is required').optional().not().isEmpty(),
  check('banner', 'Banner image URL is required').optional().not().isEmpty(),
  check('coverImage', 'Cover image URL is required').optional().not().isEmpty(),
  check('category', 'Category is required').optional().not().isEmpty(),
  check('startDate', 'Start date must be a valid ISO 8601 date').optional().isISO8601().toDate(),
  check('endDate', 'End date must be a valid ISO 8601 date').optional().isISO8601().toDate(),
  check('endDate').optional().custom((value, { req }) => {
    const startDate = req.body.startDate ? new Date(req.body.startDate) : null;
    if (startDate && new Date(value) <= startDate) {
      throw new Error('End date must be after start date');
    }
    return true;
  }),
  check('location.address', 'Address is required').optional().not().isEmpty(),
  check('location.city', 'City is required').optional().not().isEmpty(),
  check('location.state', 'State is required').optional().not().isEmpty(),
  check('location.country', 'Country is required').optional().not().isEmpty(),
  check('location.pincode', 'Pincode is required').optional().not().isEmpty(),
  check('ticketTypes', 'Ticket types must be an array').optional().isArray(),
  check('ticketTypes.*.name', 'Ticket type name is required').optional().not().isEmpty(),
  check('ticketTypes.*.price', 'Ticket price must be a number').optional().isNumeric(),
  check('ticketTypes.*.quantity', 'Ticket quantity must be an integer').optional().isInt({ min: 0 }),
  // Gallery validation - optional array of objects with url and caption
  check('gallery').optional().isArray(),
  check('gallery.*.url', 'Gallery image URL is required').optional().notEmpty(),
  check('gallery.*.caption', 'Gallery image caption must be a string').optional().isString(),
], eventController.updateEvent);
router.put('/events/:id/approve', eventController.approveEvent);
router.put('/events/:id/reject', eventController.rejectEvent);
router.put('/events/:id/pause', eventController.pauseEvent);
router.put('/events/:id/resume', eventController.resumeEvent);
router.delete('/events/:id', eventController.deleteEvent);

// Daily event management
router.get('/daily-events', dailyEventController.getDailyEvents);
router.post('/daily-events', dailyEventController.createDailyEvent);
router.put('/daily-events/:id', dailyEventController.updateDailyEvent);
router.put('/daily-events/:id/approve', dailyEventController.approveDailyEvent);
router.put('/daily-events/:id/reject', dailyEventController.rejectDailyEvent);
router.put('/daily-events/:id/pause', dailyEventController.pauseDailyEvent);
router.put('/daily-events/:id/resume', dailyEventController.resumeDailyEvent);
router.delete('/daily-events/:id', dailyEventController.deleteDailyEvent);

// FC25 participants
router.get('/fc25/players', eventController.getFC25PlayersAdmin);

// Dashboard statistics
router.get('/dashboard', adminController.getDashboardStats);

// Decoupled approval routes for each entity type

// Organizer routes
router.get('/organizers', adminController.getAllOrganizers);
router.get('/organizers/:id', adminController.getOrganizerById);
router.put('/organizers/:id/approve', adminController.approveOrganizer);
router.put('/organizers/:id/reject', [
  check('rejectionReason', 'Rejection reason is required').notEmpty()
], adminController.rejectOrganizer);
router.delete('/organizers/:id', adminController.deleteOrganizer);

// Artist routes  
router.get('/artists', adminController.getAllArtists);
router.get('/artists/:id', adminController.getArtistById);
router.put('/artists/:id/approve', adminController.approveArtist);
router.put('/artists/:id/reject', [
  check('rejectionReason', 'Rejection reason is required').notEmpty()
], adminController.rejectArtist);
router.delete('/artists/:id', adminController.deleteArtist);

// Venue routes
router.get('/venues', adminController.getAllVenues);
router.get('/venues/:id', adminController.getVenueById);
router.put('/venues/:id/approve', adminController.approveVenue);
router.put('/venues/:id/reject', [
  check('rejectionReason', 'Rejection reason is required').notEmpty()
], adminController.rejectVenue);
router.delete('/venues/:id', adminController.deleteVenue);

// Event routes
router.get('/events/all', adminController.getAllEvents);
router.get('/events/:id/details', adminController.getEventById);
router.put('/events/:id/approve', adminController.approveEvent);
router.put('/events/:id/reject', [
  check('rejectionReason', 'Rejection reason is required').notEmpty()
], adminController.rejectEvent);

// Legacy combined approvals route (for backward compatibility)
router.get('/approvals', adminController.getPendingApprovals);

// User management routes
router.put('/users/:id/status', [
  check('status', 'Status is required').isIn(['active', 'blocked'])
], adminController.updateUserStatus);



//Booking management routes

// Delete a booking
router.delete("/bookings/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    // Find and delete the booking
    const booking = await Booking.findByIdAndDelete(bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    res.status(200).json({ 
      message: "Booking deleted successfully",
      deletedBooking: booking
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ 
      message: "Server error while deleting booking", 
      error: error.message 
    });
  }
});

router.get("/bookings/all",  async (req, res) => {
  try {
    const bookings = await Booking.aggregate([
      { $sort: { bookedAt: -1 } },
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'eventDoc'
        }
      },
      { $unwind: { path: '$eventDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDoc'
        }
      },
      { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          bookedAt: 1,
          ticketType: 1,
          quantity: 1,
          total: 1,
          status: 1,
          paymentId: 1,
          paymentStatus: 1,
          country: 1,
          state: 1,
          modeOfPayment: 1,
          visitorType: 1,
          // keep ids for potential future use
          eventId: '$event',
          userId: '$user',
          // Use direct customer details if available, otherwise fall back to user document
          customerName: {
            $ifNull: [
              '$customerName',
              { $ifNull: ['$userDoc.name', 'Guest'] }
            ]
          },
          customerPhone: {
            $ifNull: [
              '$customerPhone',
              { $ifNull: ['$userDoc.phone', ''] }
            ]
          },
          user: {
            name: {
              $ifNull: [
                '$customerName',
                { $ifNull: ['$userDoc.name', 'Guest'] }
              ]
            },
            email: { $ifNull: ['$userDoc.email', ''] },
            phone: {
              $ifNull: [
                '$customerPhone',
                { $ifNull: ['$userDoc.phone', ''] }
              ]
            }
          },
          // flat title for consistent filtering on the client
          eventTitle: {
            $ifNull: [
              { $ifNull: ['$eventDoc.title', '$eventSnapshot.title'] },
              'Deleted Event'
            ]
          },
          eventCategory: {
            $ifNull: ['$eventDoc.category', null]
          },
          // event display fields with snapshot fallback and final placeholder
          event: {
            title: {
              $ifNull: [
                { $ifNull: ['$eventDoc.title', '$eventSnapshot.title'] },
                'Deleted Event'
              ]
            },
            category: {
              $ifNull: ['$eventDoc.category', null]
            },
            startDate: {
              $ifNull: [
                { $ifNull: ['$eventDoc.startDate', '$eventSnapshot.startDate'] },
                null
              ]
            },
            endDate: {
              $ifNull: [
                { $ifNull: ['$eventDoc.endDate', '$eventSnapshot.endDate'] },
                null
              ]
            }
          },
          eventSnapshot: 1,
          // Keep the original fields for reference
          originalCustomerName: '$customerName',
          originalCustomerPhone: '$customerPhone'
        }
      }
    ]);

    res.json({ bookings });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete booking
router.delete("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find and delete the booking
    const booking = await Booking.findByIdAndDelete(id);
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    res.json({ 
      message: "Booking deleted successfully",
      deletedBooking: booking 
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Payments: list and resolve paid but not booked
router.get('/payments/paid-no-booking', paymentTxController.getPaidNoBooking);
router.get('/payments/annie-failed-bookings', paymentTxController.getAnnieFailedBookings);
router.post('/payments/resolve/:id', paymentTxController.resolveTransaction);

// Helitaxii leads
router.get('/helitaxii/leads', heliTaxiiController.getLeadsAdmin);

// Settings routes
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Venue approval routes
router.put('/venues/:id/approve', adminController.approveVenue);
router.put('/venues/:id/reject', adminController.rejectVenue);

// Merch orders routes
const merchController = require('../controllers/merchController');
router.get('/merch/orders', merchController.getAllOrders);
router.get('/merch/orders/stats', merchController.getOrderStats);
router.get('/merch/orders/:orderId', merchController.getOrderById);

module.exports = router;
