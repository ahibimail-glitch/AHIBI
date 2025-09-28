const jwt = require('jsonwebtoken');
const AikoHallAdmin = require('../models/AikoHallAdmin');

exports.protectAiko = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await AikoHallAdmin.findById(decoded.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (admin.role !== 'aiko_hall_admin') {
        return res.status(403).json({ success: false, message: 'User is not an Aiko Hall admin' });
    }

    req.user = admin;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};
