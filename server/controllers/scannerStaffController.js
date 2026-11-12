const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const ScannerStaff = require('../models/ScannerStaff');

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,40}$/;

function safeStaff(staff) {
  return {
    id: String(staff._id),
    username: staff.username,
    isActive: staff.isActive,
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
  };
}

exports.list = async (_req, res) => {
  try {
    const staff = await ScannerStaff.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: staff.map(safeStaff) });
  } catch (error) {
    console.error('Unable to list scanner staff:', error);
    return res.status(500).json({ success: false, message: 'Unable to load scanner accounts.' });
  }
};

exports.create = async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!USERNAME_PATTERN.test(username)) {
    return res.status(400).json({ success: false, message: 'Username must be 3–40 letters, numbers, dots, underscores, or hyphens.' });
  }
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ success: false, message: 'Password must be at least 12 characters and no more than 72 bytes.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const staff = await ScannerStaff.create({
      username,
      password: passwordHash,
      createdBy: req.user._id,
    });
    return res.status(201).json({ success: true, data: safeStaff(staff) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'That scanner username is already in use.' });
    }
    console.error('Unable to create scanner staff:', error);
    return res.status(500).json({ success: false, message: 'Unable to create scanner account.' });
  }
};

exports.setActive = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body || {};
  if (!mongoose.isValidObjectId(id) || typeof isActive !== 'boolean') {
    return res.status(400).json({ success: false, message: 'A valid account ID and active state are required.' });
  }

  try {
    const staff = await ScannerStaff.findByIdAndUpdate(id, {
      $set: { isActive },
      $inc: { tokenVersion: 1 },
    }, { new: true });
    if (!staff) return res.status(404).json({ success: false, message: 'Scanner account not found.' });
    return res.json({ success: true, data: safeStaff(staff) });
  } catch (error) {
    console.error('Unable to update scanner account:', error);
    return res.status(500).json({ success: false, message: 'Unable to update scanner account.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { id } = req.params;
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'A valid account ID is required.' });
  }
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ success: false, message: 'Password must be at least 12 characters and no more than 72 bytes.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const staff = await ScannerStaff.findByIdAndUpdate(id, {
      $set: { password: passwordHash },
      $inc: { tokenVersion: 1 },
    }, { new: true });
    if (!staff) return res.status(404).json({ success: false, message: 'Scanner account not found.' });
    return res.json({ success: true, data: safeStaff(staff) });
  } catch (error) {
    console.error('Unable to reset scanner password:', error);
    return res.status(500).json({ success: false, message: 'Unable to reset scanner password.' });
  }
};
