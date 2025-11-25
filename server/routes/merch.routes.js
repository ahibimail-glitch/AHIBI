const express = require('express');
const router = express.Router();
const merchController = require('../controllers/merchController');
const { protect, optionalAuth } = require('../middlewares/auth');

router.get('/cart/session/:sessionId', merchController.getCartBySession);
router.post('/orders', protect, merchController.createOrder);
router.get('/orders/:orderId', optionalAuth, merchController.getOrderById);
router.post('/orders/:orderId/sync-payment', merchController.syncPaymentStatus);

module.exports = router;

