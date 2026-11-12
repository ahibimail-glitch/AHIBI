const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { protect, authorize } = require('../middlewares/auth');

// @route   POST /api/qr/scan
// @desc    Scan a QR code and record it
// @access  Private
router.post('/scan', protect, authorize('admin', 'organizer'), qrController.scanQrCode);

module.exports = router;
