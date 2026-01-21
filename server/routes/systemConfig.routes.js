const express = require('express');
const router = express.Router();
const systemConfigController = require('../controllers/systemConfigController');
const { protect, authorize } = require('../middlewares/auth');

// Get system configuration (admin only)
router.get('/config', protect, authorize('admin'), systemConfigController.getSystemConfig);

// Update system configuration (admin only)
router.put('/config', protect, authorize('admin'), systemConfigController.updateSystemConfig);

// Get Kaki Marketing branding settings (public)
router.get('/branding', systemConfigController.getKakiMarketingBranding);

module.exports = router;
