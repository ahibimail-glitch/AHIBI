const QRCode = require('qrcode');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { SLUG, EVENT: EVENT_DEF } = require('../config/hornbillShowcaseDay1');

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}

function isValidEmail(email) {
  if (!email) return true;
  return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
}

async function findDay1Event() {
  return Event.findOne({ slug: SLUG });
}

function publicEventPayload(event) {
  const now = Date.now();
  const cutoff = event.bookingEndTime
    ? new Date(event.bookingEndTime).getTime()
    : event.endDate
      ? new Date(event.endDate).getTime()
      : null;
  const isOpen = event.status === 'approved' && (!cutoff || now <= cutoff);

  return {
    id: String(event._id),
    slug: event.slug,
    title: event.title,
    subtitle: EVENT_DEF.subtitle,
    description: event.description,
    bannerDesktop: EVENT_DEF.banner,
    bannerMobile: EVENT_DEF.coverImage || EVENT_DEF.banner,
    startDate: event.startDate,
    endDate: event.endDate,
    gatesOpenLabel: 'Gates open at 04:00 PM',
    dateLabel: '16th October, 2026',
    location: event.location,
    isFreeEvent: true,
    isOpen,
    website: 'https://www.hornbillmusicfestival.com',
  };
}

async function buildQrDataUrl(booking, eventId) {
  const payload = JSON.stringify({
    bookingId: String(booking._id),
    eventId: String(eventId),
    ticketType: booking.ticketType,
    quantity: booking.quantity || 1,
    name: booking.customerName || '',
  });
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 320,
    color: { dark: '#0a0a0a', light: '#ffffff' },
  });
}

function passPayload(booking, event, qrCodeDataUrl) {
  return {
    bookingId: String(booking._id),
    registrationNumber: `TTH-D1-${String(booking._id).slice(-8).toUpperCase()}`,
    name: booking.customerName || booking.user?.name || 'Guest',
    phone: booking.customerPhone || '',
    email: booking.user?.email || '',
    city: booking.state || '',
    country: booking.country || 'India',
    ticketType: booking.ticketType,
    qrCodeDataUrl,
    event: {
      title: event.title,
      subtitle: EVENT_DEF.subtitle,
      dateLabel: '16th October, 2026',
      gatesOpenLabel: 'Gates open at 04:00 PM',
      venue: 'Talkatora Stadium, New Delhi',
      bannerDesktop: EVENT_DEF.banner,
    },
    message: `Thank you for registering, ${booking.customerName || 'guest'}! Your personalised Day 1 pass is ready. Show this QR code at the gate for check-in.`,
  };
}

exports.getDay1Event = async (req, res) => {
  try {
    const event = await findDay1Event();
    if (!event) {
      return res.status(404).json({
        success: false,
        message:
          'Day 1 Showcase event is not configured yet. Run the ensure-hornbill-showcase-day1 script on the server.',
      });
    }
    return res.json({ success: true, data: publicEventPayload(event) });
  } catch (error) {
    console.error('[hornbill-showcase] getDay1Event failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load event' });
  }
};

exports.registerDay1 = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = normalizePhone(req.body?.phone);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const city = String(req.body?.city || '').trim();
    const country = String(req.body?.country || 'India').trim() || 'India';

    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter your full name' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number',
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    const event = await findDay1Event();
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Registration is not available yet. Please try again later.',
      });
    }
    if (event.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Registration is not open for this event' });
    }

    const now = Date.now();
    const cutoff = event.bookingEndTime
      ? new Date(event.bookingEndTime).getTime()
      : event.endDate
        ? new Date(event.endDate).getTime()
        : null;
    if (cutoff && now > cutoff) {
      return res.status(400).json({ success: false, message: 'Registration for Day 1 has closed' });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      const userPayload = {
        phone,
        name,
        role: 'user',
        status: 'active',
        authProvider: 'phone_otp',
        city: city || '',
      };
      if (email) userPayload.email = email;
      try {
        user = await User.create(userPayload);
      } catch (createErr) {
        if (createErr?.code === 11000) {
          user = await User.findOne({ phone });
        } else {
          throw createErr;
        }
      }
    } else {
      const updates = {};
      if (name && user.name !== name) updates.name = name;
      if (email && !user.email) updates.email = email;
      if (city && !user.city) updates.city = city;
      if (Object.keys(updates).length) {
        await User.updateOne({ _id: user._id }, { $set: updates });
        Object.assign(user, updates);
      }
    }

    if (!user) {
      return res.status(500).json({
        success: false,
        message: 'Could not create your registration profile. Please try again.',
      });
    }

    // One pass per phone (and per user account) — check before create
    const existing = await Booking.findOne({
      event: event._id,
      status: { $in: ['confirmed', 'checked-in'] },
      $or: [{ customerPhone: phone }, { user: user._id }],
    }).sort({ bookedAt: 1 });

    if (existing) {
      // Backfill phone if an older row is missing it
      if (!existing.customerPhone) {
        existing.customerPhone = phone;
        existing.customerName = existing.customerName || name;
        try {
          await existing.save();
        } catch (_) {}
      }
      const qrCodeDataUrl = await buildQrDataUrl(existing, event._id);
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        message: 'You are already registered with this phone number. Here is your pass.',
        data: passPayload(existing, event, qrCodeDataUrl),
      });
    }

    let booking;
    try {
      booking = await Booking.create({
        event: event._id,
        eventSnapshot: {
          _id: event._id,
          title: event.title,
          banner: event.banner,
          startDate: event.startDate,
          endDate: event.endDate,
          location: {
            address: event.location?.address,
            city: event.location?.city,
          },
        },
        user: user._id,
        customerName: name,
        customerPhone: phone,
        ticketType: EVENT_DEF.ticketType.name,
        quantity: 1,
        price: 0,
        total: 0,
        status: 'confirmed',
        paymentStatus: 'completed',
        country,
        state: city || undefined,
        ticketIndex: 1,
        totalTickets: 1,
      });
    } catch (createBookingErr) {
      // Unique index race: another request just created this phone's pass
      if (createBookingErr?.code === 11000) {
        const raced = await Booking.findOne({
          event: event._id,
          $or: [{ customerPhone: phone }, { user: user._id }],
          status: { $in: ['confirmed', 'checked-in'] },
        }).sort({ bookedAt: 1 });
        if (raced) {
          const qrCodeDataUrl = await buildQrDataUrl(raced, event._id);
          return res.status(200).json({
            success: true,
            alreadyRegistered: true,
            message: 'You are already registered with this phone number. Here is your pass.',
            data: passPayload(raced, event, qrCodeDataUrl),
          });
        }
      }
      throw createBookingErr;
    }

    await Event.updateOne(
      { _id: event._id, 'ticketTypes.name': EVENT_DEF.ticketType.name },
      { $inc: { 'ticketTypes.$.sold': 1, ticketsSold: 1 } }
    );

    const qrCodeDataUrl = await buildQrDataUrl(booking, event._id);

    return res.status(201).json({
      success: true,
      alreadyRegistered: false,
      message: 'Registration successful. Your personalised pass is ready.',
      data: passPayload(booking, event, qrCodeDataUrl),
    });
  } catch (error) {
    console.error('[hornbill-showcase] registerDay1 failed:', error);
    return res.status(500).json({
      success: false,
      message: 'We could not complete your registration. Please try again.',
    });
  }
};

exports.listDay1Registrations = async (req, res) => {
  try {
    const event = await findDay1Event();
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Day 1 Showcase event is not configured yet.',
      });
    }

    const q = String(req.query.q || '').trim();
    const status = String(req.query.status || '').trim();
    const filter = { event: event._id };
    if (status) filter.status = status;

    let bookings = await Booking.find(filter)
      .populate('user', 'name email phone city')
      .sort({ bookedAt: -1 })
      .lean();

    if (q) {
      const needle = q.toLowerCase();
      bookings = bookings.filter((b) => {
        const hay = [
          b.customerName,
          b.customerPhone,
          b.country,
          b.state,
          b.user?.name,
          b.user?.email,
          b.user?.phone,
          String(b._id),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    const rows = bookings.map((b) => ({
      _id: String(b._id),
      registrationNumber: `TTH-D1-${String(b._id).slice(-8).toUpperCase()}`,
      name: b.customerName || b.user?.name || '',
      phone: b.customerPhone || b.user?.phone || '',
      email: b.user?.email || '',
      city: b.state || b.user?.city || '',
      country: b.country || '',
      ticketType: b.ticketType || '',
      status: b.status || '',
      paymentStatus: b.paymentStatus || '',
      bookedAt: b.bookedAt,
    }));

    return res.json({
      success: true,
      data: {
        event: {
          id: String(event._id),
          slug: event.slug,
          title: event.title,
          startDate: event.startDate,
        },
        total: rows.length,
        registrations: rows,
      },
    });
  } catch (error) {
    console.error('[hornbill-showcase] listDay1Registrations failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load registrations' });
  }
};

exports.getDay1Pass = async (req, res) => {
  try {
    const bookingId = String(req.params.bookingId || '').trim();
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    const event = await findDay1Event();
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const booking = await Booking.findById(bookingId).populate('user', 'name email phone');
    if (!booking || String(booking.event) !== String(event._id)) {
      return res.status(404).json({ success: false, message: 'Pass not found' });
    }

    const qrCodeDataUrl = await buildQrDataUrl(booking, event._id);
    return res.json({
      success: true,
      data: passPayload(booking, event, qrCodeDataUrl),
    });
  } catch (error) {
    console.error('[hornbill-showcase] getDay1Pass failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load pass' });
  }
};
