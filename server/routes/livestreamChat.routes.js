const express = require('express');
const router = express.Router();
const livestreamChatController = require('../controllers/livestreamChatController');
const { protect } = require('../middlewares/auth');

router.get('/streams/:streamId/messages', protect, livestreamChatController.getMessages);
router.delete('/messages/:messageId', protect, livestreamChatController.deleteMessage);

module.exports = router;
