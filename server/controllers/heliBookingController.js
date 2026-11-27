const crypto = require('crypto');
const Razorpay = require('razorpay');
const QRCode = require('qrcode');
const HeliConfig = require('../models/HeliConfig');
const HeliBooking = require('../models/HeliBooking');
const HeliSeatInventory = require('../models/HeliSeatInventory');
const emailService = require('../services/emailService');
const { buildHeliTicket, fmtDate } = require('../services/heliTicketPdfService');

const KEY = 'heli-2026';
const MAX_SEATS_PER_BOOKING = 6;

let razorpay;
try {
  razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
} catch (e) { console.error('[Heli] Razorpay init failed', e.message); }

const isTestKey = () => String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_test');
const nonNeg = (v, f) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : f);
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

async function ensureConfig() {
  let c = await HeliConfig.findOne({ key: KEY });
  if (!c) c = await HeliConfig.create({ key: KEY });
  return c;
}
const findProduct = (config, id) => (config.products || []).find((p) => p.id === id && p.active !== false);
const findSlot = (product, slotId) => (product.slots || []).find((s) => s.id === slotId);

async function ensureInventory(date, productId, slotId, capacity) {
  return HeliSeatInventory.findOneAndUpdate(
    { key: KEY, date, productId, slotId },
    { $set: { capacity }, $setOnInsert: { booked: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

function verifySig(orderId, paymentId, signature) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function publicBooking(b) {
  return {
    orderId: b.orderId, status: b.status, bookingRef: b.bookingRef, qrCode: b.qrCode,
    productName: b.productName, sector: b.sector, date: b.date, slotLabel: b.slotLabel,
    seats: b.seats, passengers: b.passengers, amount: b.amount, contact: b.contact, createdAt: b.createdAt,
  };
}

async function sendHeliEmail(booking) {
  if (!booking?.contact?.email) return;
  const { buffer, qrBuffer } = await buildHeliTicket(booking);
  const attachments = [
    { filename: 'hornbill-heli-taxi-2026.pdf', content: buffer, contentType: 'application/pdf' },
    { filename: 'qr.png', content: qrBuffer, cid: 'heliqr' },
  ];
  const paxRows = (booking.passengers || []).map((p, i) => `<li>${i + 1}. ${p.name}${p.phone ? ` (${p.phone})` : ''}</li>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">`
    + `<div style="background:#0b5cab;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">`
    + `<div style="font-size:20px;font-weight:800">Hornbill Heli Taxi 2026</div>`
    + `<div style="font-size:13px;opacity:.9">Booking confirmed</div></div>`
    + `<div style="border:1px solid #eee;border-top:none;border-radius:0 0 10px 10px;padding:24px">`
    + `<p style="color:#1C1C1C;font-size:15px">Hi ${booking.contact.name}, your booking is confirmed.</p>`
    + `<table style="font-size:14px;color:#1C1C1C"><tr><td style="color:#6b7280;padding:3px 12px 3px 0">Ride</td><td><b>${booking.productName}${booking.sector ? ` — ${booking.sector}` : ''}</b></td></tr>`
    + `<tr><td style="color:#6b7280;padding:3px 12px 3px 0">Date</td><td><b>${fmtDate(booking.date)}</b></td></tr>`
    + `<tr><td style="color:#6b7280;padding:3px 12px 3px 0">Slot</td><td><b>${booking.slotLabel}</b></td></tr>`
    + `<tr><td style="color:#6b7280;padding:3px 12px 3px 0">Seats</td><td><b>${booking.seats}</b></td></tr>`
    + `<tr><td style="color:#6b7280;padding:3px 12px 3px 0">Reference</td><td><b>${booking.bookingRef}</b></td></tr></table>`
    + `<ul style="font-size:13px;color:#1C1C1C">${paxRows}</ul>`
    + `<div style="margin-top:8px"><img src="cid:heliqr" width="130" height="130" alt="QR"/></div>`
    + `<p style="color:#6b7280;font-size:12px;margin-top:12px">Each flight carries 6 passengers and operates only when full — our team will confirm your flight time. Tickets also attached as PDF.</p>`
    + `<p style="color:#9ca3af;font-size:12px">Powered by AHIBI</p></div></div>`;
  await emailService.sendMail({ to: booking.contact.email, subject: 'Your Hornbill Heli Taxi 2026 booking', html, attachments });
}

async function settleHeliOrder({ booking, paymentId, providerPayment }) {
  if (booking.status === 'completed') return { alreadyCompleted: true, booking };

  let payment = providerPayment;
  if (!payment) {
    try { payment = await razorpay.payments.fetch(paymentId); }
    catch (e) { throw Object.assign(new Error('Payment lookup failed'), { statusCode: 503, pending: true, code: 'PAYMENT_LOOKUP_FAILED' }); }
  }
  const captured = payment && payment.status === 'captured' && payment.captured === true && payment.order_id === booking.orderId;
  if (!captured) throw Object.assign(new Error('Payment not captured'), { statusCode: 409, code: 'NOT_CAPTURED' });

  // atomic seat inventory
  if (!booking.seatsApplied) {
    const claim = await HeliBooking.updateOne({ _id: booking._id, seatsApplied: false }, { $set: { seatsApplied: true } });
    if (claim.modifiedCount === 1) {
      const config = await ensureConfig();
      const product = findProduct(config, booking.productId);
      const slot = product ? findSlot(product, booking.slotId) : null;
      const capacity = slot ? slot.capacity : 0;
      await ensureInventory(booking.date, booking.productId, booking.slotId, capacity);
      const inc = await HeliSeatInventory.findOneAndUpdate(
        { key: KEY, date: booking.date, productId: booking.productId, slotId: booking.slotId,
          $expr: { $lte: [{ $add: ['$booked', booking.seats] }, '$capacity'] } },
        { $inc: { booked: booking.seats } }, { new: true },
      );
      if (!inc) {
        await HeliBooking.updateOne({ _id: booking._id }, { $set: { seatsApplied: false, status: 'no_seats', paymentId } });
        try {
          const refund = await razorpay.payments.refund(paymentId, { amount: booking.amountMinor, speed: 'optimum' });
          await HeliBooking.updateOne({ _id: booking._id }, { $set: { refund: { status: 'processed', refundId: refund.id, amountMinor: booking.amountMinor, at: new Date(), reason: 'Slot sold out' } } });
        } catch (re) {
          await HeliBooking.updateOne({ _id: booking._id }, { $set: { refund: { status: 'failed', amountMinor: booking.amountMinor, at: new Date(), reason: 'Slot sold out — auto-refund failed, refund manually' } } });
        }
        throw Object.assign(new Error('This slot just sold out. Your payment is being refunded.'), { statusCode: 409, code: 'NO_SEATS' });
      }
    }
  }

  // issue booking ref + QR once
  const fresh = await HeliBooking.findById(booking._id);
  if (!fresh.bookingRef) {
    const tail = String(fresh.orderId).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
    const bookingRef = `HELI-${tail}-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrCode = await QRCode.toDataURL(bookingRef);
    await HeliBooking.updateOne({ _id: fresh._id, bookingRef: null }, { $set: { bookingRef, qrCode, paymentId, status: 'completed' } });
  } else {
    await HeliBooking.updateOne({ _id: fresh._id }, { $set: { paymentId, status: 'completed' } });
  }
  const settled = await HeliBooking.findById(booking._id);
  try {
    const claimEmail = await HeliBooking.updateOne({ _id: settled._id, ticketsEmailed: false, status: 'completed' }, { $set: { ticketsEmailed: true } });
    if (claimEmail.modifiedCount === 1) sendHeliEmail(settled).catch((e) => console.error('[Heli] email failed', e && e.message));
  } catch (e) { console.error('[Heli] email claim failed', e && e.message); }
  return { alreadyCompleted: false, booking: settled };
}

// ===================== PUBLIC =====================
exports.getPublicConfig = async (req, res) => {
  try {
    const c = await ensureConfig();
    return res.json({ success: true, data: {
      operatingDays: c.operatingDays,
      bookingOpen: c.bookingOpen,
      products: (c.products || []).filter((p) => p.active !== false).map((p) => ({
        id: p.id, name: p.name, sector: p.sector, type: p.type, description: p.description,
        pricePerSeat: p.pricePerSeat, seatsPerFlight: p.seatsPerFlight,
        slots: p.slots.map((s) => ({ id: s.id, label: s.label, capacity: s.capacity })),
      })),
    } });
  } catch (e) { console.error('[Heli] getPublicConfig', e); return res.status(500).json({ success: false, message: 'Failed to load heli config' }); }
};

exports.getAvailability = async (req, res) => {
  try {
    const date = String(req.query.date || '');
    const c = await ensureConfig();
    if (!c.operatingDays.includes(date)) return res.status(400).json({ success: false, message: 'Invalid date.' });
    const inv = await HeliSeatInventory.find({ key: KEY, date });
    const booked = {};
    inv.forEach((i) => { booked[`${i.productId}|${i.slotId}`] = i.booked; });
    const data = [];
    (c.products || []).forEach((p) => p.slots.forEach((s) => {
      const b = booked[`${p.id}|${s.id}`] || 0;
      data.push({ productId: p.id, slotId: s.id, capacity: s.capacity, booked: b, available: Math.max(0, s.capacity - b) });
    }));
    return res.json({ success: true, data });
  } catch (e) { console.error('[Heli] getAvailability', e); return res.status(500).json({ success: false, message: 'Failed to load availability' }); }
};

exports.createOrder = async (req, res) => {
  try {
    const c = await ensureConfig();
    if (!c.bookingOpen) return res.status(403).json({ success: false, message: 'Heli Taxi bookings are not open yet.' });
    if (!razorpay) return res.status(503).json({ success: false, message: 'Payments are temporarily unavailable.' });

    const b = req.body || {};
    const contact = b.contact || {};
    const name = String(contact.name || '').trim();
    const email = String(contact.email || '').trim().toLowerCase();
    const phone = contact.phone ? String(contact.phone).trim() : null;
    if (!name) return res.status(400).json({ success: false, message: 'Please provide a booking name.' });
    if (!isEmail(email)) return res.status(400).json({ success: false, message: 'Please provide a valid email.' });

    const product = findProduct(c, b.productId);
    if (!product) return res.status(400).json({ success: false, message: 'Invalid ride selected.' });
    const slot = findSlot(product, b.slotId);
    if (!slot) return res.status(400).json({ success: false, message: 'Invalid time slot.' });
    const date = String(b.date || '');
    if (!c.operatingDays.includes(date)) return res.status(400).json({ success: false, message: 'Invalid date.' });

    const passengers = Array.isArray(b.passengers)
      ? b.passengers.map((p) => ({ name: String(p?.name || '').trim(), phone: p?.phone ? String(p.phone).trim() : null })).filter((p) => p.name)
      : [];
    const seats = passengers.length;
    if (seats < 1) return res.status(400).json({ success: false, message: 'Add at least one passenger.' });
    if (seats > MAX_SEATS_PER_BOOKING) return res.status(400).json({ success: false, message: `A single booking can have at most ${MAX_SEATS_PER_BOOKING} passengers (one flight).` });

    const amount = seats * product.pricePerSeat;
    const amountMinor = Math.round(amount * 100);

    // soft availability check
    const invDoc = await HeliSeatInventory.findOne({ key: KEY, date, productId: product.id, slotId: slot.id });
    const booked = invDoc ? invDoc.booked : 0;
    if (booked + seats > slot.capacity) {
      return res.status(409).json({ success: false, code: 'NO_SEATS', message: `Only ${Math.max(0, slot.capacity - booked)} seat(s) left for that slot.` });
    }

    const receipt = `heli_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const order = await razorpay.orders.create({ amount: amountMinor, currency: 'INR', receipt, notes: { product: 'heli-2026', userId: String(req.user._id) } });

    await HeliBooking.create({
      orderId: order.id, receipt, user: req.user._id,
      contact: { name, email, phone },
      productId: product.id, productName: product.name, sector: product.sector,
      slotId: slot.id, slotLabel: slot.label, date,
      pricePerSeat: product.pricePerSeat, seats, passengers,
      amount, amountMinor, status: 'created', test: isTestKey(),
    });

    return res.status(200).json({ success: true, data: {
      orderId: order.id, amount: amountMinor, currency: 'INR', key: process.env.RAZORPAY_KEY_ID,
      name: 'Hornbill Heli Taxi 2026', description: `${product.name}${product.sector ? ` — ${product.sector}` : ''}`,
      prefill: { name, email, contact: phone || undefined }, breakdown: { seats, pricePerSeat: product.pricePerSeat, total: amount },
    } });
  } catch (e) { console.error('[Heli] createOrder', e); return res.status(500).json({ success: false, message: 'Unable to start payment. Please try again.' }); }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (!orderId || !paymentId || !signature) return res.status(400).json({ success: false, message: 'Missing payment parameters.' });
    if (!verifySig(orderId, paymentId, signature)) return res.status(400).json({ success: false, message: 'Transaction not legitimate.' });
    const booking = await HeliBooking.findOne({ orderId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (String(booking.user) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'This checkout belongs to a different account.' });
    let settled;
    try { settled = await settleHeliOrder({ booking, paymentId }); }
    catch (se) {
      return res.status(se.statusCode || 503).json({ success: false, pending: se.statusCode !== 409,
        code: se.code || 'SETTLEMENT_PENDING',
        message: se.code === 'NO_SEATS' ? se.message : 'Payment is being checked and your booking will appear shortly. Please do not pay again.' });
    }
    return res.status(201).json({ success: true, message: 'Booking confirmed.', data: publicBooking(settled.booking) });
  } catch (e) { console.error('[Heli] verifyPayment', e); return res.status(500).json({ success: false, message: 'Payment verification could not be completed yet. Please do not pay again.' }); }
};

exports.settleFromWebhook = async (orderId, providerPayment) => {
  const booking = await HeliBooking.findOne({ orderId });
  if (!booking) return { handled: false };
  await settleHeliOrder({ booking, paymentId: providerPayment?.id, providerPayment });
  return { handled: true };
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await HeliBooking.findOne({ orderId: req.params.orderId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (String(booking.user) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'This booking belongs to a different account.' });
    if (booking.status !== 'completed' && razorpay) {
      try {
        const { items } = await razorpay.orders.fetchPayments(booking.orderId);
        const captured = (items || []).find((p) => p.status === 'captured' && p.captured === true);
        if (captured) { const s = await settleHeliOrder({ booking, paymentId: captured.id, providerPayment: captured }); return res.json({ success: true, data: publicBooking(s.booking) }); }
      } catch (e) { /* fall through */ }
    }
    return res.json({ success: true, data: publicBooking(booking) });
  } catch (e) { console.error('[Heli] getBooking', e); return res.status(500).json({ success: false, message: 'Unable to load booking.' }); }
};

exports.getMyBookings = async (req, res) => {
  try {
    const rows = await HeliBooking.find({ user: req.user._id, status: 'completed' }).sort({ createdAt: -1 }).limit(50);
    return res.json({ success: true, data: rows.map(publicBooking) });
  } catch (e) { return res.status(500).json({ success: false, message: 'Unable to load your bookings.' }); }
};

exports.getTicketPdf = async (req, res) => {
  try {
    const booking = await HeliBooking.findOne({ orderId: req.params.orderId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (String(booking.user) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'This booking belongs to a different account.' });
    if (booking.status !== 'completed') return res.status(409).json({ success: false, message: 'Booking not ready yet.' });
    const { buffer } = await buildHeliTicket(booking);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="hornbill-heli-taxi-2026.pdf"');
    return res.end(buffer);
  } catch (e) { console.error('[Heli] getTicketPdf', e); return res.status(500).json({ success: false, message: 'Could not generate PDF.' }); }
};

// ===================== ADMIN =====================
exports.getAdminConfig = async (req, res) => {
  try { const c = await ensureConfig(); return res.json({ success: true, data: c }); }
  catch (e) { return res.status(500).json({ success: false, message: 'Failed to load config' }); }
};

exports.updateAdminConfig = async (req, res) => {
  try {
    const c = await ensureConfig();
    const b = req.body || {};
    if (typeof b.bookingOpen === 'boolean') c.bookingOpen = b.bookingOpen;
    if (Array.isArray(b.operatingDays) && b.operatingDays.length) c.operatingDays = b.operatingDays;
    // Edit price + per-slot capacity by product id (structure stays fixed).
    if (Array.isArray(b.products)) {
      b.products.forEach((pin) => {
        const p = (c.products || []).find((x) => x.id === pin.id);
        if (!p) return;
        if (pin.pricePerSeat !== undefined) p.pricePerSeat = nonNeg(Number(pin.pricePerSeat), p.pricePerSeat);
        if (typeof pin.active === 'boolean') p.active = pin.active;
        if (Array.isArray(pin.slots)) {
          pin.slots.forEach((sin) => {
            const s = p.slots.find((x) => x.id === sin.id);
            if (s && sin.capacity !== undefined) s.capacity = Math.max(0, Math.floor(nonNeg(Number(sin.capacity), s.capacity)));
          });
        }
      });
      c.markModified('products');
    }
    await c.save();
    return res.json({ success: true, message: 'Heli config updated', data: c });
  } catch (e) { console.error('[Heli] updateAdminConfig', e); return res.status(500).json({ success: false, message: 'Failed to update config' }); }
};

exports.adminListBookings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) filter.date = req.query.date;
    const [items, total] = await Promise.all([
      HeliBooking.find(filter).sort({ date: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      HeliBooking.countDocuments(filter),
    ]);
    return res.json({ success: true, data: items.map((b) => ({
      orderId: b.orderId, bookingRef: b.bookingRef, contact: b.contact, productName: b.productName, sector: b.sector,
      date: b.date, slotLabel: b.slotLabel, seats: b.seats, passengers: b.passengers, amount: b.amount,
      status: b.status, test: b.test, paymentId: b.paymentId, createdAt: b.createdAt,
    })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) { console.error('[Heli] adminListBookings', e); return res.status(500).json({ success: false, message: 'Unable to load bookings.' }); }
};

exports.adminStats = async (req, res) => {
  try {
    const c = await ensureConfig();
    const completed = await HeliBooking.find({ status: 'completed' });
    let revenue = 0, testRevenue = 0, seatsSold = 0;
    const byFlight = {}; // date|product|slot -> seats
    completed.forEach((b) => {
      if (b.test) testRevenue += b.amount; else revenue += b.amount;
      seatsSold += b.seats;
      const k = `${b.date}|${b.productId}|${b.slotId}`;
      byFlight[k] = (byFlight[k] || 0) + b.seats;
    });
    // Build per-slot fill with under-6 flag (a flight needs 6 to fly).
    const flights = Object.entries(byFlight).map(([k, seats]) => {
      const [date, productId, slotId] = k.split('|');
      const product = (c.products || []).find((p) => p.id === productId);
      const slot = product ? (product.slots || []).find((s) => s.id === slotId) : null;
      const per = product ? product.seatsPerFlight : 6;
      return { date, productId, productName: product ? product.name : productId, sector: product ? product.sector : '',
        slotId, slotLabel: slot ? slot.label : slotId, seats, capacity: slot ? slot.capacity : 0,
        fullFlights: Math.floor(seats / per), unfilledRemainder: seats % per, willNotFly: seats < per };
    }).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return res.json({ success: true, data: {
      bookings: completed.length, revenue, testRevenue, seatsSold,
      bookingOpen: c.bookingOpen, flights,
    } });
  } catch (e) { console.error('[Heli] adminStats', e); return res.status(500).json({ success: false, message: 'Unable to load stats.' }); }
};

exports.adminManifestCsv = async (req, res) => {
  try {
    const filter = { status: 'completed' };
    if (req.query.date) filter.date = req.query.date;
    const rows = await HeliBooking.find(filter).sort({ date: 1, productName: 1, slotLabel: 1, createdAt: 1 });
    const cell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const header = ['Date', 'Ride', 'Sector', 'Slot', 'Passenger', 'Passenger Phone', 'Booked By', 'Contact Phone', 'Contact Email', 'Seats (booking)', 'Amount', 'Booking Ref', 'Payment ID', 'Status', 'Booked At'];
    const lines = [header.map(cell).join(',')];
    rows.forEach((b) => {
      const pax = (b.passengers && b.passengers.length) ? b.passengers : [{ name: b.contact?.name, phone: b.contact?.phone }];
      pax.forEach((p) => {
        lines.push([
          fmtDate(b.date), b.productName, b.sector, b.slotLabel, p.name, p.phone,
          b.contact?.name, b.contact?.phone, b.contact?.email, b.seats, b.amount, b.bookingRef, b.paymentId,
          b.status + (b.test ? ' (test)' : ''), b.createdAt ? new Date(b.createdAt).toISOString() : '',
        ].map(cell).join(','));
      });
    });
    const csv = '﻿' + lines.join('\r\n'); // BOM for Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="heli-taxi-2026-manifest${req.query.date ? '-' + req.query.date : ''}.csv"`);
    return res.end(csv);
  } catch (e) { console.error('[Heli] adminManifestCsv', e); return res.status(500).json({ success: false, message: 'Could not generate manifest.' }); }
};

module.exports.ensureConfig = ensureConfig;
