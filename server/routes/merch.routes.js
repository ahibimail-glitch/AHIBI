const express = require('express');
const router = express.Router();
const merchController = require('../controllers/merchController');
const { protect } = require('../middlewares/auth');

router.get('/cart/session/:sessionId', merchController.getCartBySession);
router.post('/orders', protect, merchController.createOrder);
router.get('/orders/:orderId', protect, merchController.getOrderById);

module.exports = router;

