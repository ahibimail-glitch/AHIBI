const express = require('express');
const { check } = require('express-validator');
const adminAuthController = require('../controllers/adminAuthController');

const router = express.Router();

// @route   POST /api/admin/login
// @desc    Admin login with email/password
// @access  Public
router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').notEmpty()
], adminAuthController.login);

module.exports = router;
