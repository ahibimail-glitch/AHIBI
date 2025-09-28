const AikoHallAdmin = require('../models/AikoHallAdmin');
const { validationResult } = require('express-validator');

/**
 * @desc    Login Aiko Hall Admin
 * @route   POST /api/aiko/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide an email and password' });
  }

  try {
    // Find admin by email
    const admin = await AikoHallAdmin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Create token
    const token = admin.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: admin._id,
          email: admin.email,
          role: admin.role
        }
      }
    });

  } catch (error) {
    console.error('Aiko Hall Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
