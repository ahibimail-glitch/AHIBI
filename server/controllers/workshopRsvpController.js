const WorkshopRsvpRegistration = require('../models/WorkshopRsvpRegistration');

const EVENT_TITLE = 'AHIBI Workshop RSVP';
const WORKSHOP_DAY_MAP = {
  'Workshop 1': 'Day 1',
  'Workshop 2': 'Day 1',
  'Workshop 3': 'Day 2',
  'Workshop 4': 'Day 2',
  'Workshop 5': 'Day 3',
  'Workshop 6': 'Day 3',
  'Workshop 7': 'Day 3',
};

const WORKSHOPS = Object.entries(WORKSHOP_DAY_MAP).map(([name, day]) => ({ name, day }));
const DAYS = ['Day 1', 'Day 2', 'Day 3'];

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}

function buildPublicPayload() {
  return {
    title: EVENT_TITLE,
    slug: 'workshop-rsvp',
    isFreeEvent: true,
    registrationLabel: 'Free RSVP',
    description:
      'Submit your registration to attend an AHIBI workshop. Your selected workshop is assigned to the corresponding event day automatically.',
    days: DAYS.map((day) => ({
      day,
      workshops: WORKSHOPS.filter((workshop) => workshop.day === day).map((workshop) => workshop.name),
    })),
    workshops: WORKSHOPS,
  };
}

exports.getEventConfig = async (req, res) => {
  return res.json({
    success: true,
    data: buildPublicPayload(),
  });
};

exports.register = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = normalizePhone(req.body?.phone);
    const location = String(req.body?.location || '').trim();
    const workshop = String(req.body?.workshop || '').trim();
    const day = WORKSHOP_DAY_MAP[workshop];

    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter your full name.' });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number.',
      });
    }

    if (!location) {
      return res.status(400).json({ success: false, message: 'Please enter your location.' });
    }

    if (!day) {
      return res.status(400).json({ success: false, message: 'Please select a valid workshop.' });
    }

    const existing = await WorkshopRsvpRegistration.findOne({ phone, workshop }).lean();
    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        message: 'You are already registered for this workshop.',
        data: existing,
      });
    }

    const registration = await WorkshopRsvpRegistration.create({
      name,
      phone,
      location,
      workshop,
      day,
      eventTitle: EVENT_TITLE,
      status: 'confirmed',
    });

    return res.status(201).json({
      success: true,
      alreadyRegistered: false,
      message: 'Registration confirmed.',
      data: registration,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await WorkshopRsvpRegistration.findOne({
        phone: normalizePhone(req.body?.phone),
        workshop: String(req.body?.workshop || '').trim(),
      }).lean();

      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        message: 'You are already registered for this workshop.',
        data: existing,
      });
    }

    console.error('[workshop-rsvp] register failed:', error);
    return res.status(500).json({
      success: false,
      message: 'We could not complete your registration. Please try again.',
    });
  }
};

exports.getAdminRegistrations = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const day = String(req.query.day || '').trim();
    const workshop = String(req.query.workshop || '').trim();

    const filter = {};
    if (day) filter.day = day;
    if (workshop) filter.workshop = workshop;

    let registrations = await WorkshopRsvpRegistration.find(filter)
      .sort({ createdAt: -1 })
      .lean();

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
