const jwt = require('jsonwebtoken');
const { performance } = require('node:perf_hooks');
const ScannerStaff = require('../models/ScannerStaff');

module.exports = async function scannerAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Scanner sign-in is required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'scanner' || !decoded.id) {
      return res.status(403).json({ success: false, message: 'Scanner access required.' });
    }

    const lookupStartedAt = performance.now();
    let staff;
    try {
      staff = await ScannerStaff.findById(decoded.id);
    } finally {
      const lookupEndedAt = performance.now();
      req.scannerTiming?.recordDatabase(
        'scanner-auth-db',
        lookupEndedAt - lookupStartedAt,
        lookupStartedAt,
        lookupEndedAt,
      );
    }
    if (!staff || !staff.isActive || staff.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Scanner session is no longer active.' });
    }

    req.scannerStaff = staff;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired scanner session.' });
    }
    console.error('Scanner authentication error:', error);
    return res.status(500).json({ success: false, message: 'Unable to authenticate scanner session.' });
  }
};
