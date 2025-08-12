const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/auth');

router.post('/create-order', protect, paymentController.createOrder);
router.post('/verify-payment', protect, paymentController.verifyPayment);
router.post('/webhook/razorpay', express.raw({ type: '*/*' }), paymentController.razorpayWebhook);

module.exports = router;
