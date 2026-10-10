const express = require('express');
const controller = require('../controllers/blobHostMigrationController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// One-time (idempotent) blob-host rewrite. Admin only.
router.post('/blob-host', protect, authorize('admin'), controller.migrateBlobHost);

module.exports = router;
