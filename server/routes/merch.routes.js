const express = require('express');
const router = express.Router();
const merchController = require('../controllers/merchController');
const { protect, optionalAuth } = require('../middlewares/auth');

// Cart and Order routes
router.get('/cart/session/:sessionId', merchController.getCartBySession);
router.post('/orders', protect, merchController.createOrder);
router.post('/orders/checkout', protect, merchController.createCheckoutOrder);
router.post('/orders/verify-payment', protect, merchController.verifyCheckoutPayment);
router.get('/orders/:orderId', optionalAuth, merchController.getOrderById);
router.post('/orders/:orderId/sync-payment', merchController.syncPaymentStatus);
router.post('/webhook/razorpay', merchController.razorpayWebhook);

// Product routes
router.post('/products', protect, merchController.createProduct);
router.get('/products', merchController.getProducts);
router.get('/products/:productId', merchController.getProductById);
router.put('/products/:productId', protect, merchController.updateProduct);
router.delete('/products/:productId', protect, merchController.deleteProduct);

module.exports = router;

