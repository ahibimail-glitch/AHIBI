const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

// TODO: protect with admin auth middleware if available, e.g., require('../middlewares/auth').admin

router.post('/', couponController.createCoupon);
router.get('/', couponController.getCoupons);
router.post('/:code/use', couponController.markUsed);
router.delete('/:id', couponController.deleteCoupon);

module.exports = router;


