const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const ScannerStaff = require('../models/ScannerStaff');
const ScannerActivity = require('../models/ScannerActivity');
const Event = require('../models/Event');

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,40}$/;

function safeStaff(staff) {
  return {
    id: String(staff._id),
    username: staff.username,
    isActive: staff.isActive,
    eventAssignments: staff.eventAssignments || null,
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

exports.activity = async (_req, res) => {
  try {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const match = { createdAt: { $gte: periodStart } };
    const [summaryRows, byStaff, byEvent, recent] = await Promise.all([
      ScannerActivity.aggregate([
        { $match: match },
        { $group: {
          _id: null,
          total: { $sum: 1 },
          errors: { $sum: { $cond: [{ $eq: ['$outcome', 'error'] }, 1, 0] } },
          averageDurationMs: { $avg: '$durationMs' },
        } },
      ]),
      ScannerActivity.aggregate([
        { $match: { ...match, scannerStaff: { $exists: true } } },
        { $group: { _id: '$scannerStaff', total: { $sum: 1 }, errors: { $sum: { $cond: [{ $eq: ['$outcome', 'error'] }, 1, 0] } } } },
        { $sort: { total: -1 } }, { $limit: 20 },
        { $lookup: { from: ScannerStaff.collection.name, localField: '_id', foreignField: '_id', as: 'staff' } },
        { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, staffId: '$_id', username: { $ifNull: ['$staff.username', 'Disabled or deleted account'] }, total: 1, errors: 1 } },
      ]),
      ScannerActivity.aggregate([
        { $match: { ...match, event: { $exists: true } } },
        { $group: { _id: '$event', total: { $sum: 1 }, errors: { $sum: { $cond: [{ $eq: ['$outcome', 'error'] }, 1, 0] } } } },
        { $sort: { total: -1 } }, { $limit: 20 },
        { $lookup: { from: Event.collection.name, localField: '_id', foreignField: '_id', as: 'event' } },
        { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, eventId: '$_id', title: { $ifNull: ['$event.title', 'Deleted event'] }, total: 1, errors: 1 } },
      ]),
      ScannerActivity.find(match).sort({ createdAt: -1 }).limit(100)
        .populate({ path: 'scannerStaff', select: 'username' })
        .populate({ path: 'event', select: 'title' })
        .lean(),
    ]);
    const summary = summaryRows[0] || { total: 0, errors: 0, averageDurationMs: 0 };
    return res.json({ success: true, data: {
      periodStart,
      summary: { total: summary.total, errors: summary.errors, averageDurationMs: Math.round(summary.averageDurationMs || 0) },
      byStaff,
      byEvent,
      recent: recent.map((item) => ({
        id: String(item._id),
        username: item.scannerStaff?.username || 'Unverified account',
        eventTitle: item.event?.title || 'No event recorded',
        action: item.action,
        outcome: item.outcome,
        statusCode: item.statusCode,
        errorCode: item.errorCode || '',
        durationMs: Math.round(item.durationMs || 0),
        createdAt: item.createdAt,
      })),
    } });
  } catch (error) {
    console.error('Unable to load scanner activity:', error);
    return res.status(500).json({ success: false, message: 'Unable to load scanner activity.' });
  }
};

exports.setAssignments = async (req, res) => {
  const { id } = req.params;
  const assignments = req.body?.eventAssignments;
  if (!mongoose.isValidObjectId(id) || !Array.isArray(assignments)) {
    return res.status(400).json({ success: false, message: 'A valid account and event assignment list are required.' });
  }
  const seen = new Set();
  for (const item of assignments) {
    if (!mongoose.isValidObjectId(item?.event) || seen.has(String(item.event)) ||
      ['canScan', 'canIssueWristbands', 'canSellOnsite', 'canViewCounts'].some((key) => typeof item[key] !== 'boolean')) {
      return res.status(400).json({ success: false, message: 'Each event must be unique and include all four permission flags.' });
    }
    seen.add(String(item.event));
  }
  try {
    const staff = await ScannerStaff.findByIdAndUpdate(id, { $set: { eventAssignments: assignments } }, { new: true, runValidators: true });
    if (!staff) return res.status(404).json({ success: false, message: 'Scanner account not found.' });
    return res.json({ success: true, data: safeStaff(staff) });
  } catch (error) {
    console.error('Unable to assign scanner events:', error);
    return res.status(500).json({ success: false, message: 'Unable to update scanner event assignments.' });
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
      eventAssignments: [],
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
