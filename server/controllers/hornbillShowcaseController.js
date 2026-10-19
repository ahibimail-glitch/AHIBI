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
  return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(String(email || ''));
}

async function resolveOrganizer() {
  if (process.env.HORNBILL_SHOWCASE_ORGANIZER_ID) {
    const byId = await User.findById(process.env.HORNBILL_SHOWCASE_ORGANIZER_ID);
    if (byId) return byId;
  }

  const preferred = await User.findOne({
    role: 'organizer',
    status: 'active',
    $or: [{ email: /tafma/i }, { name: /tafma/i }, { email: /ahibi/i }],
  });
  if (preferred) return preferred;

  const anyOrganizer = await User.findOne({ role: 'organizer', status: 'active' });
  if (anyOrganizer) return anyOrganizer;

  return User.findOne({ role: 'admin', status: 'active' });
}

/**
 * Keep the rescheduled showcase event live: restore cancelled/outdated rows
 * and sync title/dates/copy from config whenever the public API is hit.
 */
async function ensureShowcaseEvent() {
  let event = await Event.findOne({ slug: SLUG });
  const organizer = event?.organizer ? null : await resolveOrganizer();

  const ticketTypePayload = {
    name: EVENT_DEF.ticketType.name,
    description: EVENT_DEF.ticketType.description,
    price: 0,
    basePrice: 0,
    quantity: EVENT_DEF.ticketType.quantity,
    capacity: EVENT_DEF.ticketType.capacity,
    benefits: EVENT_DEF.ticketType.benefits,
  };

  const sharedFields = {
    title: EVENT_DEF.title,
    slug: SLUG,
    description: EVENT_DEF.description,
    banner: EVENT_DEF.banner,
    coverImage: EVENT_DEF.coverImage,
    category: EVENT_DEF.category,
    tags: EVENT_DEF.tags,
    startDate: EVENT_DEF.startDate,
    endDate: EVENT_DEF.endDate,
    bookingEndTime: EVENT_DEF.bookingEndTime,
    location: EVENT_DEF.location,
    isFreeEvent: true,
    isVirtual: false,
    isPublic: true,
    isFeatured: true,
    isExternal: true,
    externalBookingUrl: EVENT_DEF.externalBookingUrl,
    status: 'approved',
    approvalStatus: 'approved',
    termsAndConditions: EVENT_DEF.termsAndConditions,
  };

  if (event) {
    const needsSync =
      event.status !== 'approved' ||
      event.title !== EVENT_DEF.title ||
      String(event.banner || '') !== EVENT_DEF.banner ||
      String(event.coverImage || '') !== EVENT_DEF.coverImage ||
      String(event.externalBookingUrl || '') !== EVENT_DEF.externalBookingUrl ||
      !event.isFreeEvent ||
      !event.isPublic ||
      !event.isExternal ||
      new Date(event.startDate).getTime() !== new Date(EVENT_DEF.startDate).getTime() ||
      new Date(event.endDate).getTime() !== new Date(EVENT_DEF.endDate).getTime() ||
      new Date(event.bookingEndTime || 0).getTime() !== new Date(EVENT_DEF.bookingEndTime).getTime();

    if (!needsSync) return event;

    const keepSold =
      (event.ticketTypes || []).find((t) => t.name === EVENT_DEF.ticketType.name)?.sold || 0;
    Object.assign(event, sharedFields);
    event.ticketTypes = [
      {
        ...(event.ticketTypes?.[0]?.toObject?.() || event.ticketTypes?.[0] || {}),
        ...ticketTypePayload,
        sold: keepSold,
      },
    ];
    if (organizer) {
      event.organizer = organizer._id;
      event.createdBy = event.createdBy || organizer._id;
      event.organizerInfo = {
        id: organizer._id,
        name: organizer.name || 'TAFMA',
        email: organizer.email || '',
        phone: organizer.phone || '',
      };
    }
    event.markModified('ticketTypes');
    event.markModified('location');
    await event.save();
    return event;
  }

  if (!organizer) {
    return null;
  }

  event = await Event.create({
    ...sharedFields,
    ticketTypes: [{ ...ticketTypePayload, sold: 0 }],
    organizer: organizer._id,
    createdBy: organizer._id,
    organizerInfo: {
      id: organizer._id,
      name: organizer.name || 'TAFMA',
      email: organizer.email || '',
      phone: organizer.phone || '',
    },
  });
  return event;
}

async function findShowcaseEvent() {
  return ensureShowcaseEvent();
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
    gatesOpenLabel: EVENT_DEF.gatesOpenLabel,
    dateLabel: EVENT_DEF.dateLabel,
    endTimeLabel: '10:30 PM',
    location: event.location,
    termsAndConditions: EVENT_DEF.termsAndConditions || event.termsAndConditions,
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
  const guestName = booking.customerName || booking.user?.name || 'Guest';
  return {
    bookingId: String(booking._id),
    registrationNumber: `TTH-${String(booking._id).slice(-8).toUpperCase()}`,
    name: guestName,
    phone: booking.customerPhone || '',
    email: booking.user?.email || '',
    city: booking.state || '',
    country: booking.country || 'India',
    ticketType: booking.ticketType,
    qrCodeDataUrl,
    event: {
      title: event.title,
      subtitle: EVENT_DEF.subtitle,
      dateLabel: EVENT_DEF.dateLabel,
      gatesOpenLabel: EVENT_DEF.gatesOpenLabel,
      venue: EVENT_DEF.venueLabel,
      bannerDesktop: EVENT_DEF.banner,
    },
    message: `Thank you for registering, ${guestName}! Your free pass is ready. Download it below or open My Tickets on your dashboard anytime. Show this QR code at the gate for check-in.`,
  };
}

function authTokenForUser(user) {
  try {
    if (user && typeof user.getSignedJwtToken === 'function') {
      return user.getSignedJwtToken();
    }
  } catch (_) {}
  return null;
}

function registrationResponse({
  alreadyRegistered,
  message,
  booking,
  event,
  qrCodeDataUrl,
  user,
  status = 200,
}) {
  const payload = passPayload(booking, event, qrCodeDataUrl);
  const token = authTokenForUser(user);
  return {
    status,
    body: {
      success: true,
      alreadyRegistered,
      message,
      data: {
        ...payload,
        ...(token ? { token } : {}),
        passUrl: `/ticket-to-hornbill/pass/${payload.bookingId}`,
        dashboardUrl: '/profile',
      },
    },
  };
}

exports.getDay1Event = async (req, res) => {
  try {
    const event = await findShowcaseEvent();
    if (!event) {
      return res.status(404).json({
        success: false,
        message:
          'Ticket to Hornbill event is not configured yet. Run the ensure-hornbill-showcase-day1 script on the server.',
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
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    const event = await findShowcaseEvent();
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
      return res.status(400).json({
        success: false,
        message: 'Registration for Ticket to Hornbill has closed',
      });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      const userPayload = {
        phone,
        name,
        email,
        role: 'user',
        status: 'active',
        authProvider: 'phone_otp',
        city: city || '',
      };
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
      if (email && user.email !== email) updates.email = email;
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

    const existing = await Booking.findOne({
      event: event._id,
      status: { $in: ['confirmed', 'checked-in'] },
      $or: [{ customerPhone: phone }, { user: user._id }],
    }).sort({ bookedAt: 1 });

    if (existing) {
      if (!existing.customerPhone) {
        existing.customerPhone = phone;
        existing.customerName = existing.customerName || name;
        try {
          await existing.save();
        } catch (_) {}
      }
      const qrCodeDataUrl = await buildQrDataUrl(existing, event._id);
      const response = registrationResponse({
        alreadyRegistered: true,
        message:
          'You are already registered with this phone number. Your pass is ready — download it below or check My Tickets on your dashboard.',
        booking: existing,
        event,
        qrCodeDataUrl,
        user,
      });
      return res.status(response.status).json(response.body);
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
      if (createBookingErr?.code === 11000) {
        const raced = await Booking.findOne({
          event: event._id,
          $or: [{ customerPhone: phone }, { user: user._id }],
          status: { $in: ['confirmed', 'checked-in'] },
        }).sort({ bookedAt: 1 });
        if (raced) {
          const qrCodeDataUrl = await buildQrDataUrl(raced, event._id);
          const response = registrationResponse({
            alreadyRegistered: true,
            message:
              'You are already registered with this phone number. Your pass is ready — download it below or check My Tickets on your dashboard.',
            booking: raced,
            event,
            qrCodeDataUrl,
            user,
          });
          return res.status(response.status).json(response.body);
        }
      }
      throw createBookingErr;
    }

    await Event.updateOne(
      { _id: event._id, 'ticketTypes.name': EVENT_DEF.ticketType.name },
      { $inc: { 'ticketTypes.$.sold': 1, ticketsSold: 1 } }
    );

    const qrCodeDataUrl = await buildQrDataUrl(booking, event._id);
    const response = registrationResponse({
      alreadyRegistered: false,
      message:
        'Thank you for registering! Your free pass is ready — download it below or find it anytime under My Tickets on your dashboard.',
      booking,
      event,
      qrCodeDataUrl,
      user,
      status: 201,
    });
    return res.status(response.status).json(response.body);
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
    const event = await findShowcaseEvent();
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Ticket to Hornbill event is not configured yet.',
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
      registrationNumber: `TTH-${String(b._id).slice(-8).toUpperCase()}`,
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

    const event = await findShowcaseEvent();
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

exports.SHOWCASE_EVENT_ID_HINT = '6ab402a990e6bc7f24d420a2';
exports.SLUG = SLUG;
