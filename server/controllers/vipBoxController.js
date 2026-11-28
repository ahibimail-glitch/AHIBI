const crypto = require('crypto');
const VipBoxConfig = require('../models/VipBoxConfig');
const VipBoxPass = require('../models/VipBoxPass');
const { DEFAULT_PASSES } = require('../models/VipBoxPass');

const KEY = 'nusc-dempo-vip';

async function ensureConfig() {
  let c = await VipBoxConfig.findOne({ key: KEY });
  if (!c) c = await VipBoxConfig.create({ key: KEY });
  if (!c.masterToken) { c.masterToken = `NUSCVIP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`; await c.save(); }
  return c;
}

const makeRef = (box) => `G-${box || 'X'}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

// Seed the known box leads as guests (not arrived, unseated) once.
async function seedGuests() {
  const count = await VipBoxPass.countDocuments({ key: KEY });
  if (count > 0) return;
  await VipBoxPass.insertMany(DEFAULT_PASSES.map((p) => ({
    key: KEY, passRef: makeRef(p.homeBox), guestName: p.guestName,
    homeBox: p.homeBox, currentBox: null, present: false, isWalkIn: false, active: true,
  })));
}

function presentInBox(guests, box, exceptRef) {
  return guests.filter((g) => g.present && g.currentBox === box && g.passRef !== exceptRef).length;
}

async function snapshot() {
  const config = await ensureConfig();
  const guests = await VipBoxPass.find({ key: KEY, active: true }).sort({ homeBox: 1, guestName: 1 });
  const g = (x) => ({ passRef: x.passRef, guestName: x.guestName, homeBox: x.homeBox, currentBox: x.currentBox, present: x.present, isWalkIn: x.isWalkIn });
  return {
    matchLabel: config.matchLabel,
    boxes: config.boxes.map((b) => ({
      number: b.number, capacity: b.capacity, fixed: b.fixed,
      occupants: guests.filter((x) => x.present && x.currentBox === b.number).map(g),
    })),
    guests: guests.map(g),
  };
}

function actor(req) {
  if (req.scannerStaff) return { id: String(req.scannerStaff._id), name: req.scannerStaff.username };
  if (req.user) return { id: String(req.user._id), name: req.user.name || req.user.email };
  return { id: null, name: null };
}

// Core seat/move with capacity enforcement. toBox=null unseats (marks not-arrived).
async function seatGuest({ passRef, toBox, present, actorInfo }) {
  const guest = await VipBoxPass.findOne({ key: KEY, passRef });
  if (!guest) return { error: 'Guest not found.', status: 404 };
  const config = await ensureConfig();
  if (toBox !== null && toBox !== undefined) {
    const box = config.boxes.find((b) => b.number === Number(toBox));
    if (!box) return { error: 'Invalid box.', status: 400 };
    const guests = await VipBoxPass.find({ key: KEY, active: true });
    if (presentInBox(guests, box.number, passRef) + 1 > box.capacity) {
      return { error: `Box ${box.number} is full (capacity ${box.capacity}).`, status: 409 };
    }
    guest.currentBox = box.number;
    guest.present = present === undefined ? true : present;
  } else {
    guest.currentBox = null;
    guest.present = false;
  }
  guest.scanLog.push({ at: new Date(), by: actorInfo.id, byName: actorInfo.name, toBox: guest.currentBox });
  await guest.save();
  return { guest };
}

// ================= REP CONSOLE (scanner staff) =================
exports.openConsole = async (req, res) => {
  try {
    const token = String((req.body && (req.body.token || req.body.qr)) || '').trim();
    const config = await ensureConfig();
    await seedGuests();
    if (!token || token !== config.masterToken) {
      return res.status(403).json({ success: false, message: 'Invalid or missing VIP console code.' });
    }
    return res.json({ success: true, data: await snapshot() });
  } catch (e) { console.error('[VIP] openConsole', e); return res.status(500).json({ success: false, message: 'Could not open console.' }); }
};

exports.assign = async (req, res) => {
  try {
    const b = req.body || {};
    const r = await seatGuest({ passRef: String(b.passRef || ''), toBox: b.toBox === null ? null : Number(b.toBox), present: b.present, actorInfo: actor(req) });
    if (r.error) return res.status(r.status).json({ success: false, message: r.error });
    return res.json({ success: true, message: 'Updated', data: await snapshot() });
  } catch (e) { console.error('[VIP] assign', e); return res.status(500).json({ success: false, message: 'Update failed.' }); }
};

exports.addGuest = async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const toBox = Number(b.toBox);
    if (!name) return res.status(400).json({ success: false, message: 'Guest name required.' });
    const config = await ensureConfig();
    const box = config.boxes.find((x) => x.number === toBox);
    if (!box) return res.status(400).json({ success: false, message: 'Invalid box.' });
    const guests = await VipBoxPass.find({ key: KEY, active: true });
    if (presentInBox(guests, box.number) + 1 > box.capacity) return res.status(409).json({ success: false, message: `Box ${box.number} is full.` });
    await VipBoxPass.create({ key: KEY, passRef: makeRef(toBox), guestName: name, homeBox: toBox, currentBox: toBox, present: true, isWalkIn: true, active: true });
    return res.json({ success: true, message: 'Guest added', data: await snapshot() });
  } catch (e) { console.error('[VIP] addGuest', e); return res.status(500).json({ success: false, message: 'Could not add guest.' }); }
};

exports.removeGuest = async (req, res) => {
  try {
    const passRef = String((req.body && req.body.passRef) || '');
    const guest = await VipBoxPass.findOne({ key: KEY, passRef });
    if (!guest) return res.status(404).json({ success: false, message: 'Guest not found.' });
    if (guest.isWalkIn) await VipBoxPass.deleteOne({ _id: guest._id });
    else { guest.present = false; guest.currentBox = null; await guest.save(); }
    return res.json({ success: true, message: 'Removed', data: await snapshot() });
  } catch (e) { console.error('[VIP] removeGuest', e); return res.status(500).json({ success: false, message: 'Could not remove guest.' }); }
};

// ================= ADMIN =================
exports.getAdminConfig = async (req, res) => {
  try {
    await seedGuests();
    const c = await ensureConfig();
    return res.json({ success: true, data: { matchLabel: c.matchLabel, boxes: c.boxes, masterToken: c.masterToken } });
  } catch (e) { console.error('[VIP] getAdminConfig', e); return res.status(500).json({ success: false, message: 'Failed to load config' }); }
};

exports.updateBoxes = async (req, res) => {
  try {
    const c = await ensureConfig();
    const b = req.body || {};
    if (typeof b.matchLabel === 'string' && b.matchLabel.trim()) c.matchLabel = b.matchLabel.trim();
    if (Array.isArray(b.boxes)) {
      b.boxes.forEach((bin) => {
        const box = c.boxes.find((x) => x.number === bin.number);
        if (box && bin.capacity !== undefined) box.capacity = Math.max(0, Math.floor(Number(bin.capacity) || 0));
        if (box && typeof bin.fixed === 'boolean') box.fixed = bin.fixed;
      });
      c.markModified('boxes');
    }
    await c.save();
    return res.json({ success: true, message: 'Saved', data: { matchLabel: c.matchLabel, boxes: c.boxes, masterToken: c.masterToken } });
  } catch (e) { console.error('[VIP] updateBoxes', e); return res.status(500).json({ success: false, message: 'Failed to save' }); }
};

exports.getGuests = async (req, res) => {
  try {
    await seedGuests();
    const c = await ensureConfig();
    return res.json({ success: true, data: { matchLabel: c.matchLabel, ...(await snapshot()) } });
  } catch (e) { console.error('[VIP] getGuests', e); return res.status(500).json({ success: false, message: 'Failed to load guests' }); }
};

exports.createGuest = async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.guestName || b.name || '').trim();
    const homeBox = Number(b.homeBox);
    if (!name || !homeBox) return res.status(400).json({ success: false, message: 'guestName and homeBox required.' });
    await VipBoxPass.create({ key: KEY, passRef: makeRef(homeBox), guestName: name, homeBox, currentBox: null, present: false, isWalkIn: false, active: true });
    return res.json({ success: true, message: 'Guest added' });
  } catch (e) { console.error('[VIP] createGuest', e); return res.status(500).json({ success: false, message: 'Failed to add guest' }); }
};

exports.updateGuest = async (req, res) => {
  try {
    const guest = await VipBoxPass.findOne({ key: KEY, passRef: req.params.passRef });
    if (!guest) return res.status(404).json({ success: false, message: 'Guest not found.' });
    const b = req.body || {};
    if (typeof b.guestName === 'string' && b.guestName.trim()) guest.guestName = b.guestName.trim();
    if (b.homeBox !== undefined) guest.homeBox = Number(b.homeBox);
    if (typeof b.active === 'boolean') guest.active = b.active;
    await guest.save();
    return res.json({ success: true, message: 'Saved' });
  } catch (e) { console.error('[VIP] updateGuest', e); return res.status(500).json({ success: false, message: 'Failed to update' }); }
};

exports.deleteGuest = async (req, res) => {
  try { await VipBoxPass.deleteOne({ key: KEY, passRef: req.params.passRef }); return res.json({ success: true, message: 'Deleted' }); }
  catch (e) { return res.status(500).json({ success: false, message: 'Failed to delete' }); }
};

exports.getBoard = async (req, res) => {
  try { return res.json({ success: true, data: await snapshot() }); }
  catch (e) { console.error('[VIP] getBoard', e); return res.status(500).json({ success: false, message: 'Failed to load board' }); }
};

// Reset seating/arrival for a new match (keeps roster + same QR).
exports.resetMatch = async (req, res) => {
  try {
    await VipBoxPass.updateMany({ key: KEY }, { $set: { present: false, currentBox: null } });
    // optional: delete walk-ins from the previous match
    if (req.body && req.body.clearWalkIns) await VipBoxPass.deleteMany({ key: KEY, isWalkIn: true });
    return res.json({ success: true, message: 'Reset for new match', data: await snapshot() });
  } catch (e) { console.error('[VIP] resetMatch', e); return res.status(500).json({ success: false, message: 'Failed to reset' }); }
};

// Admin can also drive the console (same ops).
exports.adminAssign = exports.assign;
exports.adminAddGuest = exports.addGuest;
exports.adminRemoveGuest = exports.removeGuest;

module.exports.ensureConfig = ensureConfig;
