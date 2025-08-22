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

// Pending approvals routes
router.get('/approvals', adminController.getPendingApprovals);
router.put('/approvals/organizer/:id', [
  check('status', 'Status is required').isIn(['approved', 'rejected']),
  check('rejectionReason', 'Rejection reason is required when status is rejected')
    .if((value, { req }) => req.body.status === 'rejected')
    .notEmpty()
], adminController.processOrganizerApproval);

router.put('/approvals/artist/:id', [
  check('status', 'Status is required').isIn(['approved', 'rejected']),
  check('rejectionReason', 'Rejection reason is required when status is rejected')
    .if((value, { req }) => req.body.status === 'rejected')
    .notEmpty()
], adminController.processArtistApproval);

router.put('/approvals/venue/:id', [
  check('status', 'Status is required').isIn(['approved', 'rejected']),
  check('rejectionReason', 'Rejection reason is required when status is rejected')
    .if((value, { req }) => req.body.status === 'rejected')
    .notEmpty()
], adminController.processVenueApproval);

router.put('/approvals/event/:id', [
  check('status', 'Status is required').isIn(['approved', 'rejected']),
  check('rejectionReason', 'Rejection reason is required when status is rejected')
    .if((value, { req }) => req.body.status === 'rejected')
    .notEmpty()
], adminController.processEventApproval);

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
          // user display fields
          user: {
            name: '$userDoc.name',
            email: '$userDoc.email'
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
          eventSnapshot: 1
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
router.post('/payments/resolve/:id', paymentTxController.resolveTransaction);
// Settings routes
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
