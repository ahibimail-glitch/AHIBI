const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/auth');

router.post('/create-order', protect, paymentController.createOrder);
router.post('/verify-payment', protect, paymentController.verifyPayment);
router.get('/status/:orderId', protect, paymentController.getPaymentStatus);
router.post('/webhook/razorpay', paymentController.razorpayWebhook);

module.exports = router;
