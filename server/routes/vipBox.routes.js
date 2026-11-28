const express = require('express');
const router = express.Router();
const c = require('../controllers/vipBoxController');
const { protect, authorize } = require('../middlewares/auth');
const scannerAuth = require('../middlewares/scannerAuth');

// Rep scanner (scanner-staff login)
router.post('/scan', scannerAuth, c.scan);
router.post('/allocate', scannerAuth, c.allocate);
router.get('/board', scannerAuth, c.getBoard);

// Admin
router.get('/admin/config', protect, authorize('admin'), c.getAdminConfig);
router.put('/admin/boxes', protect, authorize('admin'), c.updateBoxes);
router.get('/admin/passes', protect, authorize('admin'), c.getPasses);
router.post('/admin/pass', protect, authorize('admin'), c.createPass);
router.put('/admin/pass/:passRef', protect, authorize('admin'), c.updatePass);
router.delete('/admin/pass/:passRef', protect, authorize('admin'), c.deletePass);
router.get('/admin/board', protect, authorize('admin'), c.getBoard);
router.post('/admin/reset', protect, authorize('admin'), c.resetAllocations);
router.post('/admin/scan', protect, authorize('admin'), c.scan);
router.post('/admin/allocate', protect, authorize('admin'), c.allocate);

module.exports = router;
