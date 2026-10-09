const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { protect } = require('../middlewares/auth');

// TODO: protect with admin auth middleware if available, e.g., require('../middlewares/auth').admin

router.post('/', couponController.createCoupon);
router.get('/', couponController.getCoupons);
router.post('/:code/use', couponController.markUsed);
router.delete('/:id', couponController.deleteCoupon);

// Public endpoint to validate coupon prior to checkout
router.post('/validate', protect, couponController.validateCoupon);

module.exports = router;


