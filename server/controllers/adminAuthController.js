const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

/**
 * @desc    Admin login with username & password
 * @route   POST /api/admin/login
 * @access  Public (admin only)
 */
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    // Find admin by username
    const admin = await Admin.findOne({ username }).select('+password');
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT
    const payload = {
      id: admin._id,
      username: admin.username,
      role: 'admin',
      tokenVersion: Number(admin.tokenVersion || 0),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: admin._id,
          username: admin.username,
          role: 'admin'
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Change the authenticated administrator's password and revoke all existing sessions. */
exports.changePassword = async (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (newPassword.length < 12 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    return res.status(400).json({ success: false, message: 'New password must be at least 12 characters and no more than 72 bytes.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ success: false, message: 'Choose a new password different from the current password.' });
  }

  try {
    const admin = await Admin.findById(req.user._id).select('+password');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin account not found.' });
    const matches = await bcrypt.compare(currentPassword, admin.password);
    if (!matches) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    admin.password = await bcrypt.hash(newPassword, 12);
    admin.tokenVersion = Number(admin.tokenVersion || 0) + 1;
    await admin.save();
    return res.json({ success: true, message: 'Password changed. Please sign in again; other admin sessions have been revoked.' });
  } catch (error) {
    console.error('Admin password change error:', error);
    return res.status(500).json({ success: false, message: 'Unable to change admin password.' });
  }
};
