const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * @desc    Admin login with email & password
 * @route   POST /api/admin/login
 * @access  Public (admin only)
 */
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find admin by email and select password
    const user = await User.findOne({ email, role: 'admin' }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if admin is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been blocked.' });
    }

    // Generate JWT
    const token = user.getSignedJwtToken();
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          profilePic: user.profilePic
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
