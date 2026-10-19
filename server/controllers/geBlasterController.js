const crypto = require('crypto');
const Razorpay = require('razorpay');
const QRCode = require('qrcode');
const DailyEvent = require('../models/DailyEvent');
const Booking = require('../models/Booking');
const User = require('../models/User');

let whatsappService = null;
try {
  whatsappService = require('../services/whatsappService');
} catch (e) {
  whatsappService = null;
}

const EVENT_SLUG = 'ge-blaster';
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;
const PRICE_PER_PLAYER = 350;
const SPECIAL_BULLETS_CONTACT = '+91 8787401331';
const PENDING_HOLD_MINUTES = 10;

// A slot is "taken" when a confirmed/checked-in booking exists for that date+slot,
// or a pending booking for it was created within the hold window (payment in progress).
function takenStatusFilter() {
  const holdSince = new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000);
  return {
    $or: [
      { status: { $in: ['confirmed', 'checked-in'] } },
      { status: 'pending', updatedAt: { $gte: holdSince } },
    ],
  };
}

// Day range [start, end) in IST for a YYYY-MM-DD string.
function istDayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function toIstDateStr(d) {
  // Format a Date as YYYY-MM-DD in IST
  const ist = new Date(new Date(d).getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

async function getEvent() {
  return DailyEvent.findOne({ slug: EVENT_SLUG });
}

function slotFromEvent(event, slotId) {
  return (event.ticketTypes || []).find((t) => String(t._id) === String(slotId)) || null;
}

function isActiveDate(event, dateStr) {
  const active = (event.activeDates || []).map((d) => toIstDateStr(d));
  const excluded = (event.excludedDates || []).map((d) => toIstDateStr(d));
  if (excluded.includes(dateStr)) return false;
  if (active.length === 0) return true; // no restriction configured
  return active.includes(dateStr);
}

const DISPLAY_TITLE = 'GEL Blaster — Daily Blaster Experience';

// GET /api/ge-blaster
exports.getConfig = async (req, res) => {
  try {
    const event = await getEvent();
    if (!event) {
      return res.status(404).json({ success: false, message: 'GEL Blaster event is not set up yet.' });
    }

    // Keep listing + booking page title on the GEL Blaster branding.
    if (event.title !== DISPLAY_TITLE || /GE Blaster/i.test(String(event.description || ''))) {
      event.title = DISPLAY_TITLE;
      if (event.description) {
        event.description = String(event.description).replace(/GE Blaster/gi, 'GEL Blaster');
      }
      if (event.organizerInfo?.name && /GE Blaster/i.test(event.organizerInfo.name)) {
        event.organizerInfo.name = 'GEL Blaster';
      }
      try {
        await event.save();
      } catch (_) {}
    }

    const slots = (event.ticketTypes || []).map((t) => ({
      id: String(t._id),
      name: t.name,
      price: t.price,
    }));

    return res.json({
      success: true,
      data: {
        eventId: String(event._id),
        slug: EVENT_SLUG,
        title: DISPLAY_TITLE,
        description: event.description,
        banner: event.banner,
        gallery: (event.gallery || []).map((g) => ({ url: g.url, caption: g.caption || '' })),
        pricePerPlayer: slots[0] ? slots[0].price : PRICE_PER_PLAYER,
        minPlayers: MIN_PLAYERS,
        maxPlayers: MAX_PLAYERS,
        startTime: event.startTime,
        location: event.location || {},
        specialBulletsContact: SPECIAL_BULLETS_CONTACT,
        slots,
        activeDates: (event.activeDates || []).map((d) => toIstDateStr(d)).sort(),
        excludedDates: (event.excludedDates || []).map((d) => toIstDateStr(d)),
      },
    });
  } catch (error) {
    console.error('[ge-blaster] getConfig failed:', error);
    return res.status(500).json({ success: false, message: 'Could not load GEL Blaster details.' });
  }
};

// GET /api/ge-blaster/availability?date=YYYY-MM-DD
exports.getAvailability = async (req, res) => {
  try {
    const dateStr = String(req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ success: false, message: 'Provide a valid date (YYYY-MM-DD).' });
    }

    const event = await getEvent();
    if (!event) {
      return res.status(404).json({ success: false, message: 'GEL Blaster event is not set up yet.' });
    }

    const active = isActiveDate(event, dateStr);
    const { start, end } = istDayRange(dateStr);

    const takenBookings = await Booking.find({
      dailyEvent: event._id,
      selectedDate: { $gte: start, $lt: end },
      ...takenStatusFilter(),
    }).select('ticketTypeId').lean();

    const takenSlotIds = new Set(takenBookings.map((b) => String(b.ticketTypeId)));

    const slots = (event.ticketTypes || []).map((t) => ({
      id: String(t._id),
      name: t.name,
      price: t.price,
      status: !active ? 'closed' : takenSlotIds.has(String(t._id)) ? 'booked' : 'available',
    }));

    return res.json({
      success: true,
      data: { date: dateStr, active, slots },
    });
  } catch (error) {
    console.error('[ge-blaster] getAvailability failed:', error);
    return res.status(500).json({ success: false, message: 'Could not check availability.' });
  }
};

// POST /api/ge-blaster/initiate  (auth)
exports.initiate = async (req, res) => {
  try {
    const { date, slotId, players, customerName, customerPhone, needSpecialBullets } = req.body;

    const dateStr = String(date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ success: false, message: 'Please select a valid date.' });
    }

    const playerCount = Number(players);
    if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
      return res.status(400).json({
        success: false,
        message: `Group size must be between ${MIN_PLAYERS} and ${MAX_PLAYERS} players.`,
      });
    }

    if (!customerName || !String(customerName).trim()) {
      return res.status(400).json({ success: false, message: 'Please provide the primary customer name.' });
    }
    const phoneDigits = String(customerPhone || '').replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid phone number.' });
    }

    const event = await getEvent();
    if (!event) {
      return res.status(404).json({ success: false, message: 'GEL Blaster event is not set up yet.' });
    }

    if (!isActiveDate(event, dateStr)) {
      return res.status(400).json({ success: false, message: 'GEL Blaster is not running on the selected date.' });
    }

    const slot = slotFromEvent(event, slotId);
    if (!slot) {
      return res.status(400).json({ success: false, message: 'Please select a valid time slot.' });
    }

    const { start, end } = istDayRange(dateStr);

    // Exclusivity: ensure the slot is still free
    const existing = await Booking.findOne({
      dailyEvent: event._id,
      selectedDate: { $gte: start, $lt: end },
      ticketTypeId: slot._id,
      ...takenStatusFilter(),
    }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'That slot was just taken. Please pick another available slot.',
      });
    }

    const pricePerPlayer = slot.price || PRICE_PER_PLAYER;
    const total = pricePerPlayer * playerCount;

    // selectedDate at noon IST to avoid day-boundary drift
    const selectedDate = new Date(`${dateStr}T12:00:00+05:30`);

    const booking = new Booking({
      dailyEvent: event._id,
      isDailyEvent: true,
      selectedDate,
      eventSnapshot: {
        _id: event._id,
        title: event.title,
        banner: event.banner,
        startDate: selectedDate,
        endDate: selectedDate,
        location: {
          address: event.location && event.location.address,
          city: event.location && event.location.city,
        },
      },
      user: req.user._id,
      ticketType: slot.name,
      ticketTypeId: slot._id,
      quantity: playerCount,
      playerCount,
      price: pricePerPlayer,
      total,
      status: 'pending',
      paymentStatus: 'pending',
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      needSpecialBullets: !!needSpecialBullets,
    });
    await booking.save();

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `geb_${Date.now()}`,
      notes: {
        bookingId: String(booking._id),
        userId: String(req.user._id),
        slot: slot.name,
        date: dateStr,
        players: String(playerCount),
      },
    });

    return res.status(200).json({
      success: true,
      order,
      bookingId: String(booking._id),
      amount: total,
      slot: slot.name,
      date: dateStr,
      players: playerCount,
    });
  } catch (error) {
    console.error('[ge-blaster] initiate failed:', error);
    return res.status(500).json({ success: false, message: 'Could not start the booking. Please try again.' });
  }
};

// POST /api/ge-blaster/verify  (auth)
exports.verify = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking || String(booking.user) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      booking.status = 'cancelled';
      booking.paymentStatus = 'failed';
      await booking.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed.' });
    }

    // Final exclusivity re-check (exclude this booking) to prevent double-sell
    const { start, end } = istDayRange(toIstDateStr(booking.selectedDate));
    const clash = await Booking.findOne({
      _id: { $ne: booking._id },
      dailyEvent: booking.dailyEvent,
      selectedDate: { $gte: start, $lt: end },
      ticketTypeId: booking.ticketTypeId,
      status: { $in: ['confirmed', 'checked-in'] },
    }).lean();

    if (clash) {
      // Someone else confirmed the same slot first; flag for manual refund.
      booking.status = 'cancelled';
      booking.paymentStatus = 'completed';
      booking.razorpayPaymentId = razorpay_payment_id;
      booking.razorpayOrderId = razorpay_order_id;
      await booking.save();
      return res.status(409).json({
        success: false,
        message: 'That slot was confirmed by another group moments earlier. Your payment will be refunded — please book a different slot or contact support.',
        refundRequired: true,
      });
    }

    booking.status = 'confirmed';
    booking.paymentStatus = 'completed';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpayOrderId = razorpay_order_id;
    await booking.save();

    try {
      const qr = await QRCode.toDataURL(
        JSON.stringify({
          bookingId: String(booking._id),
          eventId: String(booking.dailyEvent),
          ticketType: booking.ticketType,
          players: booking.playerCount,
          selectedDate: booking.selectedDate,
        }),
        { errorCorrectionLevel: 'H', margin: 2, color: { dark: '#0b1f3a', light: '#ffffff' } }
      );
      booking.qrCode = qr;
      await booking.save();
    } catch (qrErr) {
      console.error('[ge-blaster] QR generation failed:', qrErr && qrErr.message);
    }

    // WhatsApp confirmation (non-blocking)
    try {
      const u = await User.findById(booking.user).select('name phone');
      const phone = booking.customerPhone || (u && u.phone);
      if (whatsappService && phone) {
        whatsappService
          .sendBookingConfirmedTemplate({
            phone,
            customerName: booking.customerName || (u && u.name) || 'Guest',
            eventName: 'GEL Blaster — Daily Blaster Experience',
            eventDate: toIstDateStr(booking.selectedDate),
            eventTime: booking.ticketType,
            venue: (booking.eventSnapshot && booking.eventSnapshot.location && booking.eventSnapshot.location.address) || 'GEL Blaster, Nagaland',
            tickets: `${booking.playerCount} players`,
            bookingId: String(booking._id),
            eventId: String(booking.dailyEvent),
          })
          .catch((e) => console.error('[ge-blaster] WhatsApp confirm failed:', e && e.message));
      }
    } catch (waErr) {
      console.error('[ge-blaster] WhatsApp confirm error:', waErr && waErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Booking confirmed.',
      booking: {
        id: String(booking._id),
        date: toIstDateStr(booking.selectedDate),
        slot: booking.ticketType,
        players: booking.playerCount,
        total: booking.total,
        reference: `GEB-${String(booking._id).slice(-6).toUpperCase()}`,
        qrCode: booking.qrCode,
      },
    });
  } catch (error) {
    console.error('[ge-blaster] verify failed:', error);
    return res.status(500).json({ success: false, message: 'Could not verify the payment.' });
  }
};

// GET /api/ge-blaster/admin/bookings  (admin)  — grouped by date + slot
exports.getAdminBookings = async (req, res) => {
  try {
    const event = await getEvent();
    if (!event) {
      return res.status(404).json({ success: false, message: 'GEL Blaster event is not set up yet.' });
    }

    const filter = {
      dailyEvent: event._id,
      status: { $in: ['confirmed', 'checked-in'] },
    };
    if (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
      const { start, end } = istDayRange(req.query.date);
      filter.selectedDate = { $gte: start, $lt: end };
    }

    const bookings = await Booking.find(filter)
      .sort({ selectedDate: 1, ticketType: 1, createdAt: 1 })
      .populate('user', 'name phone email')
      .lean();

    const rows = bookings.map((b) => ({
      id: String(b._id),
      reference: `GEB-${String(b._id).slice(-6).toUpperCase()}`,
      date: toIstDateStr(b.selectedDate),
      slot: b.ticketType,
      players: b.playerCount || b.quantity,
      amount: b.total,
      customerName: b.customerName || (b.user && b.user.name) || '',
      customerPhone: b.customerPhone || (b.user && b.user.phone) || '',
      needSpecialBullets: !!b.needSpecialBullets,
      checkedIn: b.status === 'checked-in' || !!b.entryVerified,
      status: b.status,
      createdAt: b.createdAt,
    }));

    const revenue = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const playersTotal = rows.reduce((sum, r) => sum + (r.players || 0), 0);

    return res.json({
      success: true,
      data: {
        eventId: String(event._id),
        total: rows.length,
        revenue,
        playersTotal,
        bookings: rows,
      },
    });
  } catch (error) {
    console.error('[ge-blaster] getAdminBookings failed:', error);
    return res.status(500).json({ success: false, message: 'Could not load GEL Blaster bookings.' });
  }
};

// POST /api/ge-blaster/admin/seed  (admin) — create/refresh the event using the LIVE app connection
exports.adminSeed = async (req, res) => {
  try {
    const ownerEmail = String((req.body && req.body.ownerEmail) || '').toLowerCase().trim();

    let owner = null;
    if (ownerEmail) {
      owner = await User.findOne({ email: ownerEmail });
      if (owner && owner.role !== 'organizer') {
        owner.role = 'organizer';
        await owner.save();
      }
    }
    if (!owner) owner = await User.findOne().sort({ createdAt: 1 });
    if (!owner) {
      return res.status(400).json({ success: false, message: 'No users exist to own the event. Create a user first.' });
    }

    const SLOTS = ['3:00 PM – 3:40 PM', '3:40 PM – 4:20 PM', '4:20 PM – 5:00 PM'];
    const GALLERY = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ url: `/ge-blaster/gallery-${n}.jpg`, caption: 'GEL Blaster Nagaland' }));
    const DESCRIPTION = [
      'Book a private 40-minute GEL Blaster session for your group. Each time slot is exclusive to one booking and can accommodate 2 to 6 players.',
      '',
      'How it works: pick a date, choose an available 40-minute slot, and select how many players (2–6). The total is calculated automatically at ₹350 per player. Once payment is successful, the full slot is reserved for your group and becomes unavailable to everyone else.',
      '',
      'Precision • Power • Performance. Quality gel, max impact, non-toxic. Play hard, stay safe.',
      '',
      'Participation is subject to GEL Blaster safety rules and operator eligibility requirements. Need special bullets? Contact +91 8787401331 (call or WhatsApp).',
    ].join('\n');

    const istNow = new Date(Date.now() + 5.5 * 3600 * 1000);
    const startStr = istNow.toISOString().slice(0, 10);
    const base = new Date(`${startStr}T12:00:00+05:30`);
    const days = 60;
    const activeDates = [];
    for (let i = 0; i < days; i += 1) activeDates.push(new Date(base.getTime() + i * 86400000));

    const address = 'GEL Blaster, Nagaland';
    const city = 'Dimapur';

    let event = await DailyEvent.findOne({ slug: EVENT_SLUG });

    const baseFields = {
      title: 'GEL Blaster — Daily Blaster Experience',
      description: DESCRIPTION,
      banner: '/ge-blaster/banner.jpg',
      coverImage: '/ge-blaster/banner.jpg',
      gallery: GALLERY,
      organizer: owner._id,
      organizerInfo: { id: owner._id, name: owner.name || 'GEL Blaster' },
      duration: { hours: 0, minutes: 40 },
      startTime: '15:00',
      periodStartDate: activeDates[0],
      periodEndDate: activeDates[activeDates.length - 1],
      activeDates,
      category: 'Sports',
      status: 'approved',
      approvalStatus: 'approved',
      isPublic: true,
      isFreeEvent: false,
      location: { address, city, coordinates: { type: 'Point', coordinates: [93.7266, 25.9091] } },
    };

    if (!event) {
      event = new DailyEvent({
        ...baseFields,
        slug: EVENT_SLUG,
        createdBy: owner._id,
        tags: ['gel blaster', 'adventure', 'team', 'nagaland'],
        ticketTypes: SLOTS.map((name) => ({
          name,
          description: 'Exclusive 40-minute slot · 2–6 players · ₹350 per player',
          price: PRICE_PER_PLAYER,
          quantity: 1,
          sold: 0,
          capacity: 6,
        })),
        termsAndConditions:
          'One slot = one booking. A successful booking reserves the full 40-minute session for your group (2–6 players). Participation is subject to GEL Blaster safety rules and operator eligibility.',
      });
      await event.save();
    } else {
      Object.assign(event, baseFields);
      if (!event.ticketTypes || event.ticketTypes.length === 0) {
        event.ticketTypes = SLOTS.map((name) => ({
          name,
          description: 'Exclusive 40-minute slot · 2–6 players · ₹350 per player',
          price: PRICE_PER_PLAYER,
          quantity: 1,
          sold: 0,
          capacity: 6,
        }));
      } else {
        event.ticketTypes.forEach((t) => {
          t.price = PRICE_PER_PLAYER;
          t.capacity = 6;
          t.description = 'Exclusive 40-minute slot · 2–6 players · ₹350 per player';
        });
        event.markModified('ticketTypes');
      }
      await event.save();
    }

    return res.json({
      success: true,
      message: 'GEL Blaster event created/refreshed.',
      data: {
        eventId: String(event._id),
        slug: event.slug,
        organizer: String(event.organizer),
        organizerPromoted: !!ownerEmail && owner.role === 'organizer',
        activeDates: event.activeDates.length,
        slots: event.ticketTypes.map((t) => ({ id: String(t._id), name: t.name, price: t.price })),
      },
    });
  } catch (error) {
    console.error('[ge-blaster] adminSeed failed:', error);
    return res.status(500).json({ success: false, message: error.message || 'Seed failed.' });
  }
};
