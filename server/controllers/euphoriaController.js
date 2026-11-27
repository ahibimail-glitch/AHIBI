const crypto = require('crypto');
const Razorpay = require('razorpay');
const QRCode = require('qrcode');
const EuphoriaConfig = require('../models/EuphoriaConfig');
const EuphoriaBooking = require('../models/EuphoriaBooking');
const emailService = require('../services/emailService');
const { buildEuphoriaTickets, fmtDay } = require('../services/euphoriaTicketPdfService');

const CONFIG_KEY = 'euphoria-2026';
const FESTIVAL_NAME = 'Euphoria Festival 2026';
const MAX_PEOPLE_PER_LINE = 20;

let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} catch (error) {
  console.error('[Euphoria] Failed to initialize Razorpay:', error.message);
}

const isTestKey = () => String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_test');

async function ensureConfig() {
  let config = await EuphoriaConfig.findOne({ key: CONFIG_KEY });
  if (!config) config = await EuphoriaConfig.create({ key: CONFIG_KEY });
  return config;
}

const nonNegNumber = (value, fallback) =>
  typeof value === 'number' && isFinite(value) && value >= 0 ? value : fallback;

const isValidEmail = (value) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// ---- pricing ----------------------------------------------------------------
function entryUnitPrice(config, dayCount) {
  if (dayCount === 1) return config.entryPrices.oneDay;
  if (dayCount === 2) return config.entryPrices.twoDay;
  if (dayCount === 3) return config.entryPrices.threeDay;
  return null;
}
function campingUnitPrice(config, type, nightCount) {
  if (type === 'no-tent') return config.campingNoTentPerNight * nightCount;
  if (type === 'tent') {
    if (nightCount === 1) return config.campingTent.oneNight;
    if (nightCount === 2) return config.campingTent.twoNight;
    if (nightCount === 3) return config.campingTent.threeNight;
  }
  return null;
}

// Keep only valid festival days, de-duplicated and in festival order.
function sanitizeDays(days, festivalDays) {
  const set = new Set(Array.isArray(days) ? days.map(String) : []);
  return festivalDays.filter((d) => set.has(d));
}

function istToday() {
  // 'en-CA' renders as YYYY-MM-DD; Asia/Kolkata is the festival timezone.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function genTicketNumber(prefix, orderId, personIndex) {
  const tail = String(orderId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EUPH-${prefix}-${tail}-${personIndex}-${rand}`;
}

async function buildTickets(booking, config) {
  const tickets = [];
  const entryPeople = Number(booking.entry?.people || 0);
  const campingPeople = Number(booking.camping?.people || 0);

  for (let i = 1; i <= entryPeople; i += 1) {
    const ticketNumber = genTicketNumber('E', booking.orderId, i);
    const qrCode = await QRCode.toDataURL(JSON.stringify({ t: ticketNumber, o: booking.orderId, k: CONFIG_KEY }));
    tickets.push({
      ticketNumber,
      type: 'entry',
      personIndex: i,
      campingType: null,
      validDays: booking.entry.days,
      admitsEntry: true,
      qrCode,
      status: 'active',
      checkIns: [],
    });
  }
  for (let j = 1; j <= campingPeople; j += 1) {
    const ticketNumber = genTicketNumber('C', booking.orderId, j);
    const qrCode = await QRCode.toDataURL(JSON.stringify({ t: ticketNumber, o: booking.orderId, k: CONFIG_KEY }));
    tickets.push({
      ticketNumber,
      type: 'camping',
      personIndex: j,
      campingType: booking.camping.type,
      validDays: booking.camping.days,
      admitsEntry: Boolean(config.campingIncludesEntry),
      qrCode,
      status: 'active',
      checkIns: [],
    });
  }
  return tickets;
}

async function sendEuphoriaTicketEmail(booking) {
  if (!booking || !booking.contact || !booking.contact.email) return;
  const { buffer, qrBuffers } = await buildEuphoriaTickets(booking);
  const attachments = [{ filename: 'euphoria-festival-2026-tickets.pdf', content: buffer, contentType: 'application/pdf' }];
  const rows = (booking.tickets || []).map((t, i) => {
    const cid = `euqr${i}`;
    const qr = qrBuffers.find((q) => q.ticketNumber === t.ticketNumber);
    if (qr) attachments.push({ filename: `${t.ticketNumber}.png`, content: qr.buffer, cid });
    const label = t.type === 'camping' ? `Camping Pass (${t.campingType})` : 'Festival Entry';
    const days = (t.validDays || []).map(fmtDay).join(', ');
    return `<tr><td style="padding:12px 0;border-bottom:1px solid #eee;vertical-align:top">`
      + `<div style="font-weight:700;color:#1C1C1C;font-size:15px">${label}</div>`
      + `<div style="color:#6b7280;font-size:13px;margin-top:2px">Valid: ${days}</div>`
      + `<div style="color:#6b7280;font-size:12px;margin-top:2px">${t.ticketNumber}</div></td>`
      + `<td style="width:120px;text-align:right"><img src="cid:${cid}" width="110" height="110" alt="QR"/></td></tr>`;
  }).join('');
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">`
    + `<div style="background:#e31837;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">`
    + `<div style="font-size:20px;font-weight:800">EUPHORIA FESTIVAL 2026</div>`
    + `<div style="font-size:13px;opacity:.9">11\u201313 December \u00b7 Avora Resort, Ch\u00fcmoukedima, Nagaland</div></div>`
    + `<div style="border:1px solid #eee;border-top:none;border-radius:0 0 10px 10px;padding:24px">`
    + `<p style="color:#1C1C1C;font-size:15px">Hi ${booking.contact.name}, your tickets are confirmed.</p>`
    + `<table style="width:100%;border-collapse:collapse">${rows}</table>`
    + `<p style="color:#6b7280;font-size:13px;margin-top:16px">Your tickets are also attached as a PDF. Show the QR at the gate \u2014 each pass is valid only on the day(s) shown.</p>`
    + `<p style="color:#9ca3af;font-size:12px;margin-top:16px">Organised by Nova Entertainment Nagaland \u00b7 Powered by AHIBI</p></div></div>`;
  await emailService.sendMail({ to: booking.contact.email, subject: 'Your Euphoria Festival 2026 tickets', html, attachments });
}

// Reusable settlement used by both client verify and the webhook. Enforces the
// atomic shared camping cap, then issues per-person tickets exactly once.
async function settleEuphoriaOrder({ booking, paymentId, providerPayment }) {
  if (booking.status === 'completed') {
    return { alreadyCompleted: true, booking };
  }

  let payment = providerPayment;
  if (!payment) {
    try {
      payment = await razorpay.payments.fetch(paymentId);
    } catch (providerError) {
      throw Object.assign(new Error('Payment lookup failed'), { statusCode: 503, pending: true, code: 'PAYMENT_LOOKUP_FAILED' });
    }
  }
  const captured = payment && payment.status === 'captured' && payment.captured === true &&
    payment.order_id === booking.orderId;
  if (!captured) {
    throw Object.assign(new Error('Payment not captured'), { statusCode: 409, code: 'NOT_CAPTURED' });
  }

  // --- atomic shared camping capacity ---
  if (booking.campingPeople > 0 && !booking.campingApplied) {
    const claim = await EuphoriaBooking.updateOne(
      { _id: booking._id, campingApplied: false },
      { $set: { campingApplied: true } },
    );
    if (claim.modifiedCount === 1) {
      const people = booking.campingPeople;
      const incremented = await EuphoriaConfig.findOneAndUpdate(
        { key: CONFIG_KEY, $expr: { $lte: [{ $add: ['$campingBooked', people] }, '$campingCapacity'] } },
        { $inc: { campingBooked: people } },
        { new: true },
      );
      if (!incremented) {
        // Extremely rare: capacity filled between checkout and capture. Refund.
        await EuphoriaBooking.updateOne(
          { _id: booking._id },
          { $set: { campingApplied: false, status: 'paid_no_camping', paymentId } },
        );
        try {
          const refund = await razorpay.payments.refund(paymentId, { amount: booking.amountMinor, speed: 'optimum' });
          await EuphoriaBooking.updateOne({ _id: booking._id }, {
            $set: { refund: { status: 'processed', refundId: refund.id, amountMinor: booking.amountMinor, at: new Date(), reason: 'Camping sold out' } },
          });
        } catch (refundError) {
          await EuphoriaBooking.updateOne({ _id: booking._id }, {
            $set: { refund: { status: 'failed', amountMinor: booking.amountMinor, at: new Date(), reason: 'Camping sold out — auto-refund failed, needs manual refund' } },
          });
        }
        throw Object.assign(new Error('Camping is sold out. Your payment is being refunded.'), { statusCode: 409, code: 'CAMPING_SOLD_OUT' });
      }
    }
  }

  // --- issue tickets exactly once ---
  const config = await ensureConfig();
  const fresh = await EuphoriaBooking.findById(booking._id);
  if (!fresh.tickets || fresh.tickets.length === 0) {
    const tickets = await buildTickets(fresh, config);
    await EuphoriaBooking.updateOne(
      { _id: fresh._id, 'tickets.0': { $exists: false } },
      { $set: { tickets, paymentId, status: 'completed' } },
    );
  } else {
    await EuphoriaBooking.updateOne({ _id: fresh._id }, { $set: { paymentId, status: 'completed' } });
  }
  const settled = await EuphoriaBooking.findById(booking._id);
  try {
    const claimEmail = await EuphoriaBooking.updateOne(
      { _id: settled._id, ticketsEmailed: false, status: 'completed' },
      { $set: { ticketsEmailed: true } },
    );
    if (claimEmail.modifiedCount === 1) {
      sendEuphoriaTicketEmail(settled).catch((e) => console.error('[Euphoria] ticket email failed', e && e.message));
    }
  } catch (e) { console.error('[Euphoria] email claim failed', e && e.message); }
  return { alreadyCompleted: false, booking: settled };
}

// ============================ PUBLIC CONFIG ==================================
exports.getPublicConfig = async (req, res) => {
  try {
    const config = await ensureConfig();
    const campingAvailable = Math.max(0, config.campingCapacity - config.campingBooked);
    return res.json({
      success: true,
      data: {
        festivalDays: config.festivalDays,
        entryPrices: config.entryPrices,
        campingNoTentPerNight: config.campingNoTentPerNight,
        campingTent: config.campingTent,
        campingIncludesEntry: config.campingIncludesEntry,
        campingCapacity: config.campingCapacity,
        campingAvailable,
        bookingOpen: config.bookingOpen,
      },
    });
  } catch (error) {
    console.error('[Euphoria] getPublicConfig failed', error);
    return res.status(500).json({ success: false, message: 'Failed to load Euphoria config' });
  }
};

// ============================ CREATE ORDER ==================================
exports.createOrder = async (req, res) => {
  try {
    const config = await ensureConfig();
    if (!config.bookingOpen) {
      return res.status(403).json({ success: false, message: 'Bookings for Euphoria Festival 2026 are not open yet.' });
    }
    if (!razorpay) {
      return res.status(503).json({ success: false, message: 'Payments are temporarily unavailable. Please try again shortly.' });
    }

    const body = req.body || {};
    const contact = body.contact || {};
    const name = String(contact.name || '').trim();
    const email = String(contact.email || '').trim().toLowerCase();
    const phone = contact.phone ? String(contact.phone).trim() : null;
    if (!name) return res.status(400).json({ success: false, message: 'Please provide a name for the booking.' });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });

    // ---- festival entry line ----
    const entryPeople = Math.floor(nonNegNumber(Number(body.entry?.people), 0));
    let entryDays = sanitizeDays(body.entry?.days, config.festivalDays);
    let entryUnit = 0;
    let entryAmount = 0;
    if (entryPeople > 0) {
      if (entryPeople > MAX_PEOPLE_PER_LINE) return res.status(400).json({ success: false, message: `Maximum ${MAX_PEOPLE_PER_LINE} people per booking.` });
      if (entryDays.length < 1 || entryDays.length > 3) return res.status(400).json({ success: false, message: 'Select 1 to 3 festival days for entry.' });
      entryUnit = entryUnitPrice(config, entryDays.length);
      if (entryUnit == null) return res.status(400).json({ success: false, message: 'Invalid festival entry selection.' });
      entryAmount = entryUnit * entryPeople;
    } else {
      entryDays = [];
    }

    // ---- camping line ----
    const campingType = body.camping?.type;
    const campingPeople = Math.floor(nonNegNumber(Number(body.camping?.people), 0));
    let campingDays = sanitizeDays(body.camping?.days, config.festivalDays);
    let campingUnit = 0;
    let campingAmount = 0;
    let campingTypeFinal = 'none';
    if (campingPeople > 0) {
      if (campingPeople > MAX_PEOPLE_PER_LINE) return res.status(400).json({ success: false, message: `Maximum ${MAX_PEOPLE_PER_LINE} people per booking.` });
      if (!['tent', 'no-tent'].includes(campingType)) return res.status(400).json({ success: false, message: 'Choose a tent or no-tent camping option.' });
      if (campingDays.length < 1 || campingDays.length > 3) return res.status(400).json({ success: false, message: 'Select 1 to 3 nights for camping.' });
      campingUnit = campingUnitPrice(config, campingType, campingDays.length);
      if (campingUnit == null) return res.status(400).json({ success: false, message: 'Invalid camping selection.' });
      campingAmount = campingUnit * campingPeople;
      campingTypeFinal = campingType;
    } else {
      campingDays = [];
    }

    if (entryPeople <= 0 && campingPeople <= 0) {
      return res.status(400).json({ success: false, message: 'Select festival entry and/or camping to continue.' });
    }

    const amount = entryAmount + campingAmount;
    if (amount <= 0) return res.status(400).json({ success: false, message: 'Your selection has no payable amount.' });
    const amountMinor = Math.round(amount * 100);

    // soft camping availability check (atomic guard still enforced at settlement)
    if (campingPeople > 0) {
      const available = config.campingCapacity - config.campingBooked;
      if (campingPeople > available) {
        return res.status(409).json({ success: false, code: 'CAMPING_SOLD_OUT', message: `Only ${Math.max(0, available)} camping spots left.`, campingAvailable: Math.max(0, available) });
      }
    }

    const receipt = `euph_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const order = await razorpay.orders.create({
      amount: amountMinor,
      currency: 'INR',
      receipt,
      notes: { product: 'euphoria-2026', userId: String(req.user._id) },
    });

    await EuphoriaBooking.create({
      orderId: order.id,
      receipt,
      user: req.user._id,
      contact: { name, email, phone },
      entry: { days: entryDays, people: entryPeople, unitPrice: entryUnit, amount: entryAmount },
      camping: { type: campingTypeFinal, days: campingDays, people: campingPeople, unitPrice: campingUnit, amount: campingAmount },
      amount,
      amountMinor,
      currency: 'INR',
      campingPeople,
      status: 'created',
      test: isTestKey(),
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: amountMinor,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID,
        name: FESTIVAL_NAME,
        description: 'Festival entry & camping',
        prefill: { name, email, contact: phone || undefined },
        breakdown: { entryAmount, campingAmount, total: amount },
      },
    });
  } catch (error) {
    console.error('[Euphoria] createOrder failed', error);
    return res.status(500).json({ success: false, message: 'Unable to start payment. Please try again.' });
  }
};

// ============================ VERIFY PAYMENT ==================================
function verifyPaymentSignature(orderId, paymentId, signature) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ success: false, message: 'Missing payment parameters.' });
    }
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ success: false, message: 'Transaction not legitimate.' });
    }
    const booking = await EuphoriaBooking.findOne({ orderId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This checkout belongs to a different account.' });
    }

    let settled;
    try {
      settled = await settleEuphoriaOrder({ booking, paymentId });
    } catch (settlementError) {
      return res.status(settlementError.statusCode || 503).json({
        success: false,
        pending: settlementError.statusCode !== 409,
        code: settlementError.code || 'SETTLEMENT_PENDING',
        message: settlementError.code === 'CAMPING_SOLD_OUT'
          ? settlementError.message
          : 'Payment is being checked and your tickets will appear shortly. Please do not pay again.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed.',
      data: publicBooking(settled.booking),
    });
  } catch (error) {
    console.error('[Euphoria] verifyPayment failed', error);
    return res.status(500).json({ success: false, message: 'Payment verification could not be completed yet. Please do not pay again.' });
  }
};

// Settle from the Razorpay webhook (captured payment). Isolated entry point.
exports.settleFromWebhook = async (orderId, providerPayment) => {
  const booking = await EuphoriaBooking.findOne({ orderId });
  if (!booking) return { handled: false };
  await settleEuphoriaOrder({ booking, paymentId: providerPayment?.id, providerPayment });
  return { handled: true };
};

// Shape a booking for the buyer (tickets with QR + validity).
function publicBooking(booking) {
  return {
    orderId: booking.orderId,
    status: booking.status,
    amount: booking.amount,
    contact: booking.contact,
    entry: booking.entry,
    camping: booking.camping,
    createdAt: booking.createdAt,
    tickets: (booking.tickets || []).map((t) => ({
      ticketNumber: t.ticketNumber,
      type: t.type,
      campingType: t.campingType,
      validDays: t.validDays,
      admitsEntry: t.admitsEntry,
      qrCode: t.qrCode,
      status: t.status,
      checkIns: t.checkIns,
    })),
  };
}

// ============================ BUYER VIEWS ==================================
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await EuphoriaBooking.find({ user: req.user._id, status: 'completed' }).sort({ createdAt: -1 }).limit(50);
    return res.json({ success: true, data: bookings.map(publicBooking) });
  } catch (error) {
    console.error('[Euphoria] getMyBookings failed', error);
    return res.status(500).json({ success: false, message: 'Unable to load your bookings.' });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await EuphoriaBooking.findOne({ orderId: req.params.orderId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This booking belongs to a different account.' });
    }
    // Reconcile an orphaned capture (buyer closed the tab before verify ran).
    if (booking.status !== 'completed' && razorpay) {
      try {
        const { items } = await razorpay.orders.fetchPayments(booking.orderId);
        const captured = (items || []).find((p) => p.status === 'captured' && p.captured === true);
        if (captured) {
          const settled = await settleEuphoriaOrder({ booking, paymentId: captured.id, providerPayment: captured });
          return res.json({ success: true, data: publicBooking(settled.booking) });
        }
      } catch (reconcileError) {
        // fall through and return current state
      }
    }
    return res.json({ success: true, data: publicBooking(booking) });
  } catch (error) {
    console.error('[Euphoria] getBooking failed', error);
    return res.status(500).json({ success: false, message: 'Unable to load this booking.' });
  }
};

// ============================ SCANNER ==================================
async function handleScan(req, res) {
  try {
    const body = req.body || {};
    let ticketNumber = body.ticketNumber;
    // Accept a scanned QR payload too.
    if (!ticketNumber && body.qr) {
      try { ticketNumber = JSON.parse(body.qr)?.t; } catch (e) { /* ignore */ }
    }
    ticketNumber = String(ticketNumber || '').trim();
    if (!ticketNumber) return res.status(400).json({ status: 'INVALID', message: 'No ticket provided.' });

    const actorId = req.scannerStaff ? String(req.scannerStaff._id) : (req.user ? String(req.user._id) : null);
    const actorName = req.scannerStaff ? req.scannerStaff.username : (req.user ? (req.user.name || req.user.email) : null);

    // Day override (for testing before the festival); otherwise IST today.
    const scanDay = typeof body.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : istToday();

    const booking = await EuphoriaBooking.findOne({ 'tickets.ticketNumber': ticketNumber });
    if (!booking) return res.status(404).json({ status: 'INVALID', message: 'Ticket not found.' });
    if (booking.status !== 'completed') return res.json({ status: 'INVALID', message: 'This ticket is not active.' });

    const ticket = booking.tickets.find((t) => t.ticketNumber === ticketNumber);
    if (!ticket || ticket.status !== 'active') return res.json({ status: 'INVALID', message: 'This ticket is not active.' });

    if (!ticket.validDays.includes(scanDay)) {
      return res.json({
        status: 'INVALID',
        message: `Not valid on ${scanDay}. Valid day(s): ${ticket.validDays.join(', ')}.`,
        ticketType: ticket.type,
        validDays: ticket.validDays,
      });
    }
    if (!ticket.admitsEntry) {
      return res.json({ status: 'INVALID', message: 'Camping pass — not valid for festival entry.', ticketType: ticket.type });
    }
    if (ticket.checkIns.some((c) => c.day === scanDay)) {
      const prior = ticket.checkIns.find((c) => c.day === scanDay);
      return res.json({
        status: 'ALREADY_USED',
        message: `Already checked in today (${scanDay}).`,
        attendeeName: booking.contact?.name,
        ticketType: ticket.type,
        checkedInAt: prior?.at,
      });
    }

    const pushed = await EuphoriaBooking.updateOne(
      { _id: booking._id },
      { $push: { 'tickets.$[t].checkIns': { day: scanDay, at: new Date(), by: actorId, byName: actorName } } },
      { arrayFilters: [{ 't.ticketNumber': ticketNumber, 't.checkIns.day': { $ne: scanDay } }] },
    );
    if (pushed.modifiedCount !== 1) {
      return res.json({ status: 'ALREADY_USED', message: `Already checked in today (${scanDay}).`, attendeeName: booking.contact?.name, ticketType: ticket.type });
    }

    return res.json({
      status: 'VALID',
      message: 'Entry approved.',
      attendeeName: booking.contact?.name,
      ticketType: ticket.type === 'camping' ? `Camping (${ticket.campingType})` : 'Festival entry',
      scanDay,
      validDays: ticket.validDays,
    });
  } catch (error) {
    console.error('[Euphoria] scan failed', error);
    return res.status(500).json({ status: 'INVALID', message: 'Unable to verify this ticket.' });
  }
}
exports.scanTicket = handleScan;

// ============================ ADMIN ==================================
exports.getAdminConfig = async (req, res) => {
  try {
    const config = await ensureConfig();
    return res.json({ success: true, data: config });
  } catch (error) {
    console.error('[Euphoria] getAdminConfig failed', error);
    return res.status(500).json({ success: false, message: 'Failed to load config' });
  }
};

exports.updateAdminConfig = async (req, res) => {
  try {
    const config = await ensureConfig();
    const b = req.body || {};
    if (b.entryPrices) {
      config.entryPrices.oneDay = nonNegNumber(b.entryPrices.oneDay, config.entryPrices.oneDay);
      config.entryPrices.twoDay = nonNegNumber(b.entryPrices.twoDay, config.entryPrices.twoDay);
      config.entryPrices.threeDay = nonNegNumber(b.entryPrices.threeDay, config.entryPrices.threeDay);
    }
    if (b.campingNoTentPerNight !== undefined) {
      config.campingNoTentPerNight = nonNegNumber(b.campingNoTentPerNight, config.campingNoTentPerNight);
    }
    if (b.campingTent) {
      config.campingTent.oneNight = nonNegNumber(b.campingTent.oneNight, config.campingTent.oneNight);
      config.campingTent.twoNight = nonNegNumber(b.campingTent.twoNight, config.campingTent.twoNight);
      config.campingTent.threeNight = nonNegNumber(b.campingTent.threeNight, config.campingTent.threeNight);
    }
    if (b.campingCapacity !== undefined) {
      config.campingCapacity = Math.max(0, Math.floor(nonNegNumber(b.campingCapacity, config.campingCapacity)));
    }
    if (typeof b.campingIncludesEntry === 'boolean') config.campingIncludesEntry = b.campingIncludesEntry;
    if (typeof b.bookingOpen === 'boolean') config.bookingOpen = b.bookingOpen;
    if (Array.isArray(b.festivalDays) && b.festivalDays.length) config.festivalDays = b.festivalDays;
    await config.save();
    return res.json({ success: true, message: 'Euphoria config updated', data: config });
  } catch (error) {
    console.error('[Euphoria] updateAdminConfig failed', error);
    return res.status(500).json({ success: false, message: 'Failed to update config' });
  }
};

exports.adminListBookings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const [items, total] = await Promise.all([
      EuphoriaBooking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .select('orderId paymentId contact entry camping amount status test campingPeople createdAt tickets'),
      EuphoriaBooking.countDocuments(filter),
    ]);
    const data = items.map((b) => ({
      orderId: b.orderId,
      paymentId: b.paymentId,
      contact: b.contact,
      entry: { days: b.entry.days, people: b.entry.people, amount: b.entry.amount },
      camping: { type: b.camping.type, days: b.camping.days, people: b.camping.people, amount: b.camping.amount },
      amount: b.amount,
      status: b.status,
      test: b.test,
      ticketCount: b.tickets?.length || 0,
      checkedInCount: (b.tickets || []).reduce((n, t) => n + (t.checkIns?.length ? 1 : 0), 0),
      createdAt: b.createdAt,
    }));
    return res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('[Euphoria] adminListBookings failed', error);
    return res.status(500).json({ success: false, message: 'Unable to load bookings.' });
  }
};

exports.adminStats = async (req, res) => {
  try {
    const config = await ensureConfig();
    const completed = await EuphoriaBooking.find({ status: 'completed' })
      .select('amount test entry camping tickets campingPeople');
    let revenue = 0;
    let testRevenue = 0;
    let entryPeople = 0;
    let campingPeople = 0;
    const perDayEntry = {};
    config.festivalDays.forEach((d) => { perDayEntry[d] = 0; });
    completed.forEach((b) => {
      if (b.test) testRevenue += b.amount; else revenue += b.amount;
      entryPeople += Number(b.entry?.people || 0);
      campingPeople += Number(b.camping?.people || 0);
      (b.tickets || []).forEach((t) => {
        if (t.admitsEntry) {
          t.validDays.forEach((d) => { if (perDayEntry[d] !== undefined) perDayEntry[d] += 1; });
        }
      });
    });
    return res.json({
      success: true,
      data: {
        bookings: completed.length,
        revenue,
        testRevenue,
        entryPeople,
        campingPeople,
        camping: { booked: config.campingBooked, capacity: config.campingCapacity, available: Math.max(0, config.campingCapacity - config.campingBooked) },
        expectedAttendancePerDay: perDayEntry,
        bookingOpen: config.bookingOpen,
      },
    });
  } catch (error) {
    console.error('[Euphoria] adminStats failed', error);
    return res.status(500).json({ success: false, message: 'Unable to load stats.' });
  }
};

exports.getTicketPdf = async (req, res) => {
  try {
    const booking = await EuphoriaBooking.findOne({ orderId: req.params.orderId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This booking belongs to a different account.' });
    }
    if (booking.status !== 'completed' || !(booking.tickets || []).length) {
      return res.status(409).json({ success: false, message: 'Tickets are not ready yet.' });
    }
    const { buffer } = await buildEuphoriaTickets(booking);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="euphoria-festival-2026-tickets.pdf"');
    return res.end(buffer);
  } catch (error) {
    console.error('[Euphoria] getTicketPdf failed', error);
    return res.status(500).json({ success: false, message: 'Could not generate tickets PDF.' });
  }
};

module.exports.ensureConfig = ensureConfig;
