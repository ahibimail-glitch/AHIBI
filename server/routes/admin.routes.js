const express = require('express');
const { check } = require('express-validator');
const adminController = require('../controllers/adminController');
const eventController = require('../controllers/eventController');
const { protect, authorize } = require('../middlewares/auth');
const { validateEvent } = require('../middlewares/validation');
const Booking = require('../models/Booking');
const router = express.Router();
const paymentTxController = require('../controllers/paymentTransactionController');

// Protect all admin routes
router.use(protect);
router.use(authorize('admin'));

// Event management
router.get('/events', eventController.getEvents);
router.get('/events/pending', adminController.getPendingEvents);
router.post('/events', validateEvent, eventController.createEvent);
router.put('/events/:id', eventController.updateEvent);
router.put('/events/:id/approve', eventController.approveEvent);
router.put('/events/:id/reject', eventController.rejectEvent);
router.delete('/events/:id', eventController.deleteEvent);

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

// Artist routes  
router.get('/artists', adminController.getAllArtists);
router.get('/artists/:id', adminController.getArtistById);
router.put('/artists/:id/approve', adminController.approveArtist);
router.put('/artists/:id/reject', [
  check('rejectionReason', 'Rejection reason is required').notEmpty()
], adminController.rejectArtist);

// Venue routes
router.get('/venues', adminController.getAllVenues);
router.get('/venues/:id', adminController.getVenueById);
router.put('/venues/:id/approve', adminController.approveVenue);
router.put('/venues/:id/reject', [
  check('rejectionReason', 'Rejection reason is required').notEmpty()
], adminController.rejectVenue);

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
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', [
  check('status', 'Status is required').isIn(['active', 'blocked'])
], adminController.updateUserStatus);



//Booking management routes

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
          // event display fields with snapshot fallback and final placeholder
          event: {
            title: {
              $ifNull: [
                { $ifNull: ['$eventDoc.title', '$eventSnapshot.title'] },
                'Deleted Event'
              ]
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

// Payments: list and resolve paid but not booked
router.get('/payments/paid-no-booking', paymentTxController.getPaidNoBooking);
router.get('/payments/annie-failed-bookings', paymentTxController.getAnnieFailedBookings);
router.post('/payments/resolve/:id', paymentTxController.resolveTransaction);
// Settings routes
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Venue approval routes
router.put('/venues/:id/approve', adminController.approveVenue);
router.put('/venues/:id/reject', adminController.rejectVenue);

module.exports = router;
