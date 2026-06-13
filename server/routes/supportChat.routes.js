const express = require('express');
const supportChatController = require('../controllers/supportChatController');
const { protect, authorize } = require('../middlewares/auth');
const { body } = require('express-validator');

const router = express.Router();

// User routes - protected
router.use(protect);

// Get or create user's conversation
router.get('/chat', supportChatController.getOrCreateConversation);

// Send message in conversation
router.post('/chat/message', supportChatController.sendMessage);

// Admin routes
const adminRouter = express.Router();
adminRouter.use(protect);
adminRouter.use(authorize('admin'));

// Get all conversations
adminRouter.get('/conversations', supportChatController.getAllConversations);

// Get statistics (must be before /:id)
adminRouter.get('/stats', supportChatController.getStats);

// Get conversation by ID
adminRouter.get('/:id', supportChatController.getConversationById);

// Send admin reply
adminRouter.post('/:id/reply', supportChatController.sendAdminReply);

// Update conversation status
adminRouter.put(
  '/:id/status',
  [
    body('status', 'Status is required').isIn(['active', 'resolved'])
  ],
  supportChatController.updateConversationStatus
);

// Assign conversation
adminRouter.put(
  '/:id/assign',
  [
    body('adminId', 'Admin ID is required').notEmpty()
  ],
  supportChatController.assignConversation
);

module.exports = { userRouter: router, adminRouter };
