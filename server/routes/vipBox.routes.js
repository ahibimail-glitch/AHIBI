const express = require('express');
const router = express.Router();
const c = require('../controllers/vipBoxController');
const { protect, authorize } = require('../middlewares/auth');
const scannerAuth = require('../middlewares/scannerAuth');

// Rep console (scanner-staff login). One master QR opens it.
router.post('/console', scannerAuth, c.openConsole);
router.post('/assign', scannerAuth, c.assign);
router.post('/add-guest', scannerAuth, c.addGuest);
router.post('/remove-guest', scannerAuth, c.removeGuest);
router.get('/board', scannerAuth, c.getBoard);

// Admin
router.get('/admin/config', protect, authorize('admin'), c.getAdminConfig);
router.put('/admin/boxes', protect, authorize('admin'), c.updateBoxes);
router.get('/admin/guests', protect, authorize('admin'), c.getGuests);
router.post('/admin/guest', protect, authorize('admin'), c.createGuest);
router.put('/admin/guest/:passRef', protect, authorize('admin'), c.updateGuest);
router.delete('/admin/guest/:passRef', protect, authorize('admin'), c.deleteGuest);
router.get('/admin/board', protect, authorize('admin'), c.getBoard);
router.post('/admin/reset', protect, authorize('admin'), c.resetMatch);
router.post('/admin/assign', protect, authorize('admin'), c.adminAssign);
router.post('/admin/add-guest', protect, authorize('admin'), c.adminAddGuest);
router.post('/admin/remove-guest', protect, authorize('admin'), c.adminRemoveGuest);

module.exports = router;
