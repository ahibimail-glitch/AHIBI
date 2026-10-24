const express = require('express');
const { protect } = require('../middlewares/auth');
const controller = require('../controllers/nuscHomeMatchController');

const router = express.Router();

router.post('/checkout/create-order', protect, controller.createOrder);
router.post('/checkout/season/create-order', protect, controller.createSeasonPassOrder);
router.post('/checkout/verify-payment', protect, controller.verifyPayment);
router.post('/test-fixtures/seed', protect, controller.seedTestFixtures);

module.exports = router;
