const express = require('express');
const router = express.Router();
const { getPublicTermsByCategory } = require('../controllers/publicTermsController');

// GET /api/public/terms/:category - Get terms for specific category (public)
router.get('/:category', getPublicTermsByCategory);

module.exports = router;
