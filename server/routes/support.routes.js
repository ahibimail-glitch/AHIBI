const express = require('express');
const supportController = require('../controllers/supportController');
const { protect, authorize } = require('../middlewares/auth');
const { body, check } = require('express-validator');

const router = express.Router();

// Protect all support routes
router.use(protect);

// User routes for support tickets
router.post(
  '/tickets', 
  [
    body('subject', 'Subject is required').notEmpty().trim(),
    body('message', 'Message is required').notEmpty().trim(),
    body('category').optional().isIn(['general', 'account', 'booking', 'payment', 'event', 'technical', 'other']),
    body('priority').optional({ checkFalsy: true }).isIn(['low', 'medium', 'high', 'urgent']).withMessage('Priority must be one of: low, medium, high, urgent')
  ],
  supportController.createTicket
);

router.get('/tickets', supportController.getUserTickets);
router.get('/tickets/:id', supportController.getTicket);

router.post(
  '/tickets/:id/reply',
  [
    body('message', 'Message is required').notEmpty().trim()
  ],
  supportController.replyToTicket
);

// Users can only close their own tickets
router.put('/tickets/:id/status', supportController.updateTicketStatus);

// Admin routes
const adminRouter = express.Router();

// Protect all admin support routes and restrict to admin users
adminRouter.use(protect);
adminRouter.use(authorize('admin'));

adminRouter.get('/tickets', supportController.getAllTickets);
adminRouter.put('/tickets/:id/assign', supportController.assignTicket);

module.exports = { userRouter: router, adminRouter };
