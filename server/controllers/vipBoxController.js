const QRCode = require('qrcode');
const VipBoxConfig = require('../models/VipBoxConfig');
const VipBoxPass = require('../models/VipBoxPass');
const { DEFAULT_PASSES } = require('../models/VipBoxPass');

const KEY = 'nusc-dempo-vip';

async function ensureConfig() {
  let c = await VipBoxConfig.findOne({ key: KEY });
  if (!c) c = await VipBoxConfig.create({ key: KEY });
  return c;
}

function makeRef(box) {
  return `VIP-${box}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

async function seedPasses() {
  const count = await VipBoxPass.countDocuments({ key: KEY });
  if (count > 0) return;
  await VipBoxPass.insertMany(DEFAULT_PASSES.map((p) => ({
    key: KEY, passRef: makeRef(p.homeBox), guestName: p.guestName,
    homeBox: p.homeBox, currentBox: p.homeBox, fixed: false, active: true,
  })));
}

async function boardSnapshot() {
  const config = await ensureConfig();
  const passes = await VipBoxPass.find({ key: KEY, active: true }).sort({ homeBox: 1 });
  return config.boxes.map((b) => ({
    number: b.number, capacity: b.capacity, fixed: b.fixed,
    occupants: passes.filter((p) => p.currentBox === b.number).map((p) => ({ passRef: p.passRef, guestName: p.guestName, homeBox: p.homeBox })),
  }));
}

// ---------------- ADMIN ----------------
exports.getAdminConfig = async (req, res) => {
  try {
    await seedPasses();
    const config = await ensureConfig();
    return res.json({ success: true, data: { matchLabel: config.matchLabel, boxes: config.boxes } });
  } catch (e) { console.error('[VIP] getAdminConfig', e); return res.status(500).json({ success: false, message: 'Failed to load config' }); }
};

exports.updateBoxes = async (req, res) => {
  try {
    const config = await ensureConfig();
    const b = req.body || {};
    if (typeof b.matchLabel === 'string' && b.matchLabel.trim()) config.matchLabel = b.matchLabel.trim();
    if (Array.isArray(b.boxes)) {
      b.boxes.forEach((bin) => {
        const box = config.boxes.find((x) => x.number === bin.number);
        if (box && bin.capacity !== undefined) box.capacity = Math.max(0, Math.floor(Number(bin.capacity) || 0));
        if (box && typeof bin.fixed === 'boolean') box.fixed = bin.fixed;
      });
      config.markModified('boxes');
    }
    await config.save();
    return res.json({ success: true, message: 'Saved', data: { matchLabel: config.matchLabel, boxes: config.boxes } });
  } catch (e) { console.error('[VIP] updateBoxes', e); return res.status(500).json({ success: false, message: 'Failed to save' }); }
};

exports.getPasses = async (req, res) => {
  try {
    await seedPasses();
    const config = await ensureConfig();
    const passes = await VipBoxPass.find({ key: KEY }).sort({ homeBox: 1 });
    const data = await Promise.all(passes.map(async (p) => ({
      passRef: p.passRef, guestName: p.guestName, homeBox: p.homeBox, currentBox: p.currentBox,
      fixed: p.fixed, active: p.active,
      qrCode: await QRCode.toDataURL(p.passRef, { margin: 1, width: 360 }),
    })));
    return res.json({ success: true, data: { matchLabel: config.matchLabel, passes: data } });
  } catch (e) { console.error('[VIP] getPasses', e); return res.status(500).json({ success: false, message: 'Failed to load passes' }); }
};

exports.createPass = async (req, res) => {
  try {
    const b = req.body || {};
    const guestName = String(b.guestName || '').trim();
    const homeBox = Number(b.homeBox);
    if (!guestName || !homeBox) return res.status(400).json({ success: false, message: 'guestName and homeBox are required.' });
    const pass = await VipBoxPass.create({ key: KEY, passRef: makeRef(homeBox), guestName, homeBox, currentBox: homeBox, fixed: Boolean(b.fixed), active: true });
    return res.json({ success: true, data: { passRef: pass.passRef } });
  } catch (e) { console.error('[VIP] createPass', e); return res.status(500).json({ success: false, message: 'Failed to create pass' }); }
};

exports.updatePass = async (req, res) => {
  try {
    const pass = await VipBoxPass.findOne({ key: KEY, passRef: req.params.passRef });
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found.' });
    const b = req.body || {};
    if (typeof b.guestName === 'string' && b.guestName.trim()) pass.guestName = b.guestName.trim();
    if (b.homeBox !== undefined) pass.homeBox = Number(b.homeBox);
    if (typeof b.active === 'boolean') pass.active = b.active;
    if (b.currentBox !== undefined) pass.currentBox = b.currentBox === null ? null : Number(b.currentBox);
    await pass.save();
    return res.json({ success: true, message: 'Saved' });
  } catch (e) { console.error('[VIP] updatePass', e); return res.status(500).json({ success: false, message: 'Failed to update pass' }); }
};

exports.deletePass = async (req, res) => {
  try {
    await VipBoxPass.deleteOne({ key: KEY, passRef: req.params.passRef });
    return res.json({ success: true, message: 'Deleted' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Failed to delete pass' }); }
};

exports.getBoard = async (req, res) => {
  try { return res.json({ success: true, data: await boardSnapshot() }); }
  catch (e) { console.error('[VIP] getBoard', e); return res.status(500).json({ success: false, message: 'Failed to load board' }); }
};

exports.resetAllocations = async (req, res) => {
  try {
    const passes = await VipBoxPass.find({ key: KEY });
    await Promise.all(passes.map((p) => VipBoxPass.updateOne({ _id: p._id }, { $set: { currentBox: p.homeBox } })));
    return res.json({ success: true, message: 'Allocations reset to home boxes', data: await boardSnapshot() });
  } catch (e) { return res.status(500).json({ success: false, message: 'Failed to reset' }); }
};

// ---------------- SCAN / ALLOCATE (rep or admin) ----------------
function actor(req) {
  if (req.scannerStaff) return { id: String(req.scannerStaff._id), name: req.scannerStaff.username };
  if (req.user) return { id: String(req.user._id), name: req.user.name || req.user.email };
  return { id: null, name: null };
}

exports.scan = async (req, res) => {
  try {
    let passRef = String((req.body && (req.body.passRef || req.body.qr)) || '').trim();
    if (!passRef) return res.status(400).json({ success: false, message: 'No pass provided.' });
    const pass = await VipBoxPass.findOne({ key: KEY, passRef });
    if (!pass) return res.status(404).json({ success: false, found: false, message: 'Pass not recognised.' });
    if (!pass.active) return res.json({ success: false, found: true, message: 'This pass is inactive.' });
    const boxes = await boardSnapshot();
    return res.json({ success: true, found: true, data: {
      pass: { passRef: pass.passRef, guestName: pass.guestName, homeBox: pass.homeBox, currentBox: pass.currentBox, fixed: pass.fixed },
      boxes,
    } });
  } catch (e) { console.error('[VIP] scan', e); return res.status(500).json({ success: false, message: 'Scan failed.' }); }
};

exports.allocate = async (req, res) => {
  try {
    const b = req.body || {};
    const passRef = String(b.passRef || '').trim();
    const toBox = Number(b.toBox);
    const pass = await VipBoxPass.findOne({ key: KEY, passRef });
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found.' });
    const config = await ensureConfig();
    const box = config.boxes.find((x) => x.number === toBox);
    if (!box) return res.status(400).json({ success: false, message: 'Invalid box.' });
    const a = actor(req);
    const fromBox = pass.currentBox;
    pass.currentBox = toBox;
    pass.scanLog.push({ at: new Date(), by: a.id, byName: a.name, fromBox, toBox });
    await pass.save();
    return res.json({ success: true, message: `${pass.guestName} allocated to Box ${toBox}.`, data: {
      pass: { passRef: pass.passRef, guestName: pass.guestName, homeBox: pass.homeBox, currentBox: pass.currentBox },
      boxes: await boardSnapshot(),
    } });
  } catch (e) { console.error('[VIP] allocate', e); return res.status(500).json({ success: false, message: 'Allocation failed.' }); }
};

module.exports.ensureConfig = ensureConfig;
