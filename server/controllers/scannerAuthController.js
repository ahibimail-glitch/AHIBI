const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ScannerStaff = require('../models/ScannerStaff');

exports.login = async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(401).json({ success: false, message: 'Invalid scanner credentials.' });
  }

  try {
    const staff = await ScannerStaff.findOne({ username }).select('+password');
    const passwordMatches = staff ? await bcrypt.compare(password, staff.password) : false;
    if (!staff || !passwordMatches || !staff.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid scanner credentials.' });
    }

    const token = jwt.sign({
      id: String(staff._id),
      username: staff.username,
      role: 'scanner',
      tokenVersion: staff.tokenVersion,
    }, process.env.JWT_SECRET, { expiresIn: '12h' });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: String(staff._id), username: staff.username, role: 'scanner' },
      },
    });
  } catch (error) {
    console.error('Scanner login error:', error);
    return res.status(500).json({ success: false, message: 'Unable to sign in.' });
  }
};
