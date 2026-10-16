const Booking = require('../models/Booking');

const EVENT_TITLE = 'AHIBI Workshop RSVP';
const RSVP_EVENT_ID = '6ac644e31e7f6f9476b839c0';
const WORKSHOPS = [
  {
    name: 'Loin Loom Weaving',
    day: 'Day 1',
    dateLabel: '15 Oct 2026',
    timeLabel: '12:30 PM - 2:00 PM',
    startDateTime: '2026-10-15T12:30:00+05:30',
    endDateTime: '2026-10-15T14:00:00+05:30',
    speaker: 'Vekuvolu Dozo',
    image: '/rsvp-workshop/WhatsApp Image 2026-10-06 at 10.33.22 PM.jpeg',
  },
  {
    name: 'Textile Dyeing Techniques',
    day: 'Day 1',
    dateLabel: '15 Oct 2026',
    timeLabel: '2:30 PM - 3:30 PM',
    startDateTime: '2026-10-15T14:30:00+05:30',
    endDateTime: '2026-10-15T15:30:00+05:30',
    speaker: 'Ninoto Zhimomi',
    image: '/rsvp-workshop/WhatsApp Image 2026-10-06 at 10.33.19 PM.jpeg',
  },
  {
    name: 'Product Photography Using Smartphones',
    day: 'Day 2',
    dateLabel: '16 Oct 2026',
    timeLabel: '12:30 PM - 1:30 PM',
    startDateTime: '2026-10-16T12:30:00+05:30',
    endDateTime: '2026-10-16T13:30:00+05:30',
    speaker: 'Beltezzar Thong',
    image: '/rsvp-workshop/WhatsApp Image 2026-10-06 at 10.33.21 PM (1).jpeg',
  },
  {
    name: 'Branding & Design for MSEs',
    day: 'Day 2',
    dateLabel: '16 Oct 2026',
    timeLabel: '2:00 PM - 3:00 PM',
    startDateTime: '2026-10-16T14:00:00+05:30',
    endDateTime: '2026-10-16T15:00:00+05:30',
    speaker: 'Sinlo Kemp',
    image: '/rsvp-workshop/WhatsApp Image 2026-10-06 at 10.33.21 PM.jpeg',
  },
  {
    name: 'Startup Readiness & Innovation',
    day: 'Day 3',
    dateLabel: '17 Oct 2026',
    timeLabel: '12:30 PM - 1:30 PM',
    startDateTime: '2026-10-17T12:30:00+05:30',
    endDateTime: '2026-10-17T13:30:00+05:30',
    speaker: 'Yanpvuo Kikon',
    image: '/rsvp-workshop/WhatsApp Image 2026-10-06 at 10.33.20 PM.jpeg',
  },
  {
    name: 'Art & About',
    day: 'Day 3',
    dateLabel: '17 Oct 2026',
    timeLabel: '2:00 PM - 3:00 PM',
    startDateTime: '2026-10-17T14:00:00+05:30',
    endDateTime: '2026-10-17T15:00:00+05:30',
    speaker: 'Ariapongla',
    image: '/rsvp-workshop/WhatsApp Image 2026-10-06 at 10.33.20 PM (1).jpeg',
  },
  {
    name: 'Banana-Fibre Tapestry Weaving',
    day: 'Day 3',
    dateLabel: '17 Oct 2026',
    timeLabel: '2:00 PM - 3:00 PM',
    startDateTime: '2026-10-17T14:00:00+05:30',
    endDateTime: '2026-10-17T15:00:00+05:30',
    speaker: 'Nengneithem Hengna',
    image: '/rsvp-workshop/WhatsApp Image 2026-10-06 at 10.33.19 PM (1).jpeg',
  },
  {
    name: 'Financial Literacy for Entrepreneurs',
    day: 'Day 1',
    dateLabel: '15 Oct 2026',
    timeLabel: '4:00 PM - 5:00 PM',
    startDateTime: '2026-10-15T16:00:00+05:30',
    endDateTime: '2026-10-15T17:00:00+05:30',
    speaker: 'Banajit Huzuri',
    image: '/rsvp-workshop/financial-literacy.png',
  },
  {
    name: 'Pehchan Card: Gateway to Government Schemes',
    day: 'Day 3',
    dateLabel: '17 Oct 2026',
    timeLabel: '11:00 AM - 12:00 PM',
    startDateTime: '2026-10-17T11:00:00+05:30',
    endDateTime: '2026-10-17T12:00:00+05:30',
    speaker: 'Rima Sonar',
    image: '/rsvp-workshop/pehchan-card.png',
  },
];
const WORKSHOP_DAY_MAP = Object.fromEntries(
  WORKSHOPS.map((workshop) => [workshop.name, workshop.day])
);
const DAYS = ['Day 1', 'Day 2', 'Day 3'];

/** Calendar date (YYYY-MM-DD) for each workshop day, IST. */
const DAY_DATES = {
  'Day 1': '2026-10-15',
  'Day 2': '2026-10-16',
  'Day 3': '2026-10-17',
};

/**
 * Per-day RSVP cutoff (IST):
 * - Day 1 & Day 2 close at the start of that day (00:00 IST) so past/current days stop taking RSVPs.
 * - Day 3 stays open through the day and closes at end of Day 3; then the whole RSVP shuts down.
 */
function getDayCloseAt(day) {
  const date = DAY_DATES[day];
  if (!date) return null;
  const isFinalDay = day === DAYS[DAYS.length - 1];
  return isFinalDay
    ? new Date(`${date}T23:59:59.999+05:30`)
    : new Date(`${date}T00:00:00+05:30`);
}

function getEventCloseAt() {
  const lastDay = DAYS[DAYS.length - 1];
  const date = DAY_DATES[lastDay];
  return date ? new Date(`${date}T23:59:59.999+05:30`) : null;
}

function isDayClosed(day, now = new Date()) {
  const closeAt = getDayCloseAt(day);
  if (!closeAt || Number.isNaN(closeAt.getTime())) return false;
  return now.getTime() >= closeAt.getTime();
}

function isEventClosed(now = new Date()) {
  const closeAt = getEventCloseAt();
  if (!closeAt || Number.isNaN(closeAt.getTime())) return false;
  return now.getTime() > closeAt.getTime();
}

function getWorkshopRegistrationBlockReason(ticketType, now = new Date()) {
  if (isEventClosed(now)) {
    return 'Workshop RSVP has closed. Registration is no longer available.';
  }
  const { workshopName, day } = getWorkshopMetaFromTicketType(ticketType);
  if (!day) {
    return null;
  }
  if (isDayClosed(day, now)) {
    return `Registration for ${day}${workshopName ? ` (${workshopName})` : ''} has closed.`;
  }
  return null;
}

const WORKSHOP_CAPACITY = {
  'Loin Loom Weaving': 20,
  'Textile Dyeing Techniques': 50,
  'Product Photography Using Smartphones': 50,
  'Branding & Design for MSEs': 50,
  'Startup Readiness & Innovation': 50,
  'Art & About': 20,
  'Banana-Fibre Tapestry Weaving': 20,
  'Financial Literacy for Entrepreneurs': 50,
  'Pehchan Card: Gateway to Government Schemes': 'No Bar',
};

function getWorkshopMetaFromTicketType(ticketType) {
  const normalized = String(ticketType || '').trim();
  const match = WORKSHOPS.find(
    (workshop) =>
      normalized === workshop.name ||
      normalized.endsWith(`• ${workshop.name}`) ||
      normalized.endsWith(`- ${workshop.name}`)
  );

  if (!match) {
    return {
      workshopName: normalized,
      day: WORKSHOP_DAY_MAP[normalized] || '',
    };
  }

  return {
    workshopName: match.name,
    day: match.day,
  };
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}

function buildPublicPayload(now = new Date()) {
  const eventClosed = isEventClosed(now);
  const eventCloseAt = getEventCloseAt();
  const dayClosedMap = Object.fromEntries(DAYS.map((day) => [day, eventClosed || isDayClosed(day, now)]));

  return {
    eventId: RSVP_EVENT_ID,
    title: EVENT_TITLE,
    slug: 'workshop-rsvp',
    isFreeEvent: true,
    registrationLabel: 'Free RSVP',
    description:
      'Submit your registration to attend an AHIBI workshop. Your selected workshop is assigned to the corresponding event day automatically.',
    isClosed: eventClosed,
    closesAt: eventCloseAt ? eventCloseAt.toISOString() : null,
    days: DAYS.map((day) => {
      const closeAt = getDayCloseAt(day);
      return {
        day,
        isClosed: Boolean(dayClosedMap[day]),
        closesAt: closeAt ? closeAt.toISOString() : null,
        workshops: WORKSHOPS.filter((workshop) => workshop.day === day).map((workshop) => workshop.name),
      };
    }),
    workshops: WORKSHOPS.map((workshop) => ({
      ...workshop,
      isClosed: Boolean(dayClosedMap[workshop.day]),
      capacity: WORKSHOP_CAPACITY[workshop.name] || null,
    })),
  };
}

exports.RSVP_EVENT_ID = RSVP_EVENT_ID;
exports.isEventClosed = isEventClosed;
exports.isDayClosed = isDayClosed;
exports.getWorkshopRegistrationBlockReason = getWorkshopRegistrationBlockReason;

exports.getEventConfig = async (req, res) => {
  return res.json({
    success: true,
    data: buildPublicPayload(),
  });
};

exports.getAdminRegistrations = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const day = String(req.query.day || '').trim();
    const workshop = String(req.query.workshop || '').trim();

    const filter = {
      event: RSVP_EVENT_ID,
      status: { $in: ['confirmed', 'checked-in'] },
    };

    let registrations = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'name phone city')
      .lean();

    registrations = registrations
      .map((booking) => {
        const { workshopName, day: mappedDay } = getWorkshopMetaFromTicketType(booking.ticketType);
        return {
          _id: String(booking._id),
          registrationNumber: `AWR-${String(booking._id).slice(-6).toUpperCase()}`,
          name: booking.customerName || booking.user?.name || '',
          phone: booking.customerPhone || booking.user?.phone || '',
          location: booking.state || booking.user?.city || '',
          workshop: workshopName,
          day: mappedDay,
          status: booking.status || '',
          createdAt: booking.createdAt || booking.bookedAt,
        };
      })
      .filter((registration) => registration.workshop && registration.day);

    if (day) {
      registrations = registrations.filter((registration) => registration.day === day);
    }

    if (workshop) {
      registrations = registrations.filter((registration) => registration.workshop === workshop);
    }

    if (q) {
      const needle = q.toLowerCase();
      registrations = registrations.filter((registration) =>
        [registration.registrationNumber, registration.name, registration.phone, registration.location]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle)
      );
    }

    const statsBase = registrations.reduce(
      (acc, registration) => {
        acc.total += 1;
        acc.byDay[registration.day] = (acc.byDay[registration.day] || 0) + 1;
        acc.byWorkshop[registration.workshop] = (acc.byWorkshop[registration.workshop] || 0) + 1;
        return acc;
      },
      { total: 0, byDay: {}, byWorkshop: {} }
    );

    return res.json({
      success: true,
      data: {
        event: buildPublicPayload(),
        filters: { q, day, workshop },
        total: registrations.length,
        stats: statsBase,
        registrations,
      },
    });
  } catch (error) {
    console.error('[workshop-rsvp] getAdminRegistrations failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not load workshop registrations.',
    });
  }
};

// Organizer-facing view of workshop RSVP registrations.
// Gated to the WENN Bazaar organizer (matched by phone); override via WORKSHOP_RSVP_ORGANIZER_PHONE.
exports.getOrganizerRegistrations = async (req, res) => {
  try {
    const allowed = normalizePhone(process.env.WORKSHOP_RSVP_ORGANIZER_PHONE || '8837227218');
    const mine = normalizePhone(req.user && (req.user.phone || req.user.contactInfo?.phone));
    if (!mine || mine !== allowed) {
      return res.status(403).json({
        success: false,
        message: 'Your organizer account is not linked to the Workshop RSVP event.',
      });
    }
    return exports.getAdminRegistrations(req, res);
  } catch (error) {
    console.error('[workshop-rsvp] getOrganizerRegistrations failed:', error);
    return res.status(500).json({ success: false, message: 'Could not load workshop registrations.' });
  }
};
