const express = require('express');
const supportController = require('../controllers/supportController');
const { protect, authorize } = require('../middlewares/auth');
const { check } = require('express-validator');

const router = express.Router();

// Protect all support routes
router.use(protect);

// User routes for support tickets
router.post(
  '/tickets', 
  [
    check('subject', 'Subject is required').notEmpty().trim(),
    check('message', 'Message is required').notEmpty().trim(),
    check('category').optional().isIn(['general', 'account', 'booking', 'payment', 'event', 'technical', 'other']),
    check('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  supportController.createTicket
);

router.get('/tickets', supportController.getUserTickets);
router.get('/tickets/:id', supportController.getTicket);

router.post(
  '/tickets/:id/reply',
  [
    check('message', 'Message is required').notEmpty().trim()
  ],
  supportController.replyToTicket
);

// Users can only close their own tickets
router.put('/tickets/:id/status', supportController.updateTicketStatus);

// Admin routes
const adminRouter = express.Router();

// Protect all admin routes with admin authorization
adminRouter.use(authorize('admin'));

adminRouter.get('/tickets', supportController.getAllTickets);
adminRouter.put('/tickets/:id/assign', supportController.assignTicket);

module.exports = { userRouter: router, adminRouter };
