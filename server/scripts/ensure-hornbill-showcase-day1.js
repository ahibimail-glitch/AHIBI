/**
 * Ensure Ticket to Hornbill — Band Battle & Festival Showcase (6 Nov 2026) exists.
 *
 * Usage (from server/):
 *   node scripts/ensure-hornbill-showcase-day1.js
 *
 * Optional env:
 *   HORNBILL_SHOWCASE_ORGANIZER_ID  — User _id to set as organizer
 *   FRONTEND_URL                    — used to absolutize banner paths
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const { SLUG, EVENT: DEF } = require('../config/hornbillShowcaseDay1');

function absoluteAsset(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const base = (process.env.FRONTEND_URL || 'https://www.ahibi.in').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

async function connect() {
  const srvUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!srvUri) throw new Error('MONGO_URI is not set');

  const fallbackUri =
    srvUri
      .replace('mongodb+srv://', 'mongodb://')
      .replace(
        '@cluster0.oasjxzb.mongodb.net',
        '@ac-honjbme-shard-00-00.oasjxzb.mongodb.net:27017,ac-honjbme-shard-00-01.oasjxzb.mongodb.net:27017,ac-honjbme-shard-00-02.oasjxzb.mongodb.net:27017'
      ) +
    (srvUri.includes('?') || srvUri.includes('mongodb+srv://') ? '' : '') ;

  // Force a clean slate between attempts — srv DNS often fails on some networks.
  const attempts = [];
  attempts.push({ label: 'srv', uri: srvUri });
  if (srvUri.startsWith('mongodb+srv://')) {
    const base = srvUri
      .replace('mongodb+srv://', 'mongodb://')
      .replace(
        '@cluster0.oasjxzb.mongodb.net',
        '@ac-honjbme-shard-00-00.oasjxzb.mongodb.net:27017,ac-honjbme-shard-00-01.oasjxzb.mongodb.net:27017,ac-honjbme-shard-00-02.oasjxzb.mongodb.net:27017'
      );
    const withParams = `${base}${base.includes('?') ? '&' : '?'}tls=true&authSource=admin`;
    attempts.push({ label: 'fallback-shards', uri: withParams });
  }

  let lastError;
  for (const attempt of attempts) {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      console.log('Connecting via', attempt.label, '...');
      await mongoose.connect(attempt.uri, {
        family: 4,
        serverSelectionTimeoutMS: 25000,
        bufferCommands: false,
      });
      // Prove the connection actually works before continuing.
      await mongoose.connection.db.admin().command({ ping: 1 });
      console.log('Mongo connected via', attempt.label);
      return;
    } catch (error) {
      lastError = error;
      console.log('Connect failed via', attempt.label + ':', String(error.message || error).slice(0, 140));
      try {
        await mongoose.disconnect();
      } catch (_) {}
    }
  }
  throw lastError || new Error('Could not connect to MongoDB');
}

async function resolveOrganizer() {
  if (process.env.HORNBILL_SHOWCASE_ORGANIZER_ID) {
    const byId = await User.findById(process.env.HORNBILL_SHOWCASE_ORGANIZER_ID);
    if (byId) return byId;
  }

  const preferred = await User.findOne({
    role: 'organizer',
    status: 'active',
    $or: [
      { email: /tafma/i },
      { name: /tafma/i },
      { email: /ahibi/i },
    ],
  });
  if (preferred) return preferred;

  const anyOrganizer = await User.findOne({ role: 'organizer', status: 'active' });
  if (anyOrganizer) return anyOrganizer;

  const admin = await User.findOne({ role: 'admin', status: 'active' });
  if (admin) return admin;

  throw new Error('No organizer/admin user found to attach as event organizer');
}

async function run() {
  await connect();
  const organizer = await resolveOrganizer();
  console.log('Organizer:', organizer._id.toString(), organizer.name || organizer.email);

  const banner = DEF.banner; // keep site-relative so Next/Image serves from /public
  const coverImage = DEF.coverImage;

  const payload = {
    title: DEF.title,
    slug: SLUG,
    description: DEF.description,
    banner,
    coverImage,
    category: DEF.category,
    tags: DEF.tags,
    startDate: DEF.startDate,
    endDate: DEF.endDate,
    bookingEndTime: DEF.bookingEndTime,
    location: DEF.location,
  isFreeEvent: true,
  isVirtual: false,
  isPublic: true,
  isFeatured: true,
  isExternal: true,
  externalBookingUrl: '/ticket-to-hornbill',
  status: 'approved',
  approvalStatus: 'approved',
  termsAndConditions: DEF.termsAndConditions,
    ticketTypes: [
      {
        name: DEF.ticketType.name,
        description: DEF.ticketType.description,
        price: 0,
        basePrice: 0,
        quantity: DEF.ticketType.quantity,
        sold: 0,
        capacity: DEF.ticketType.capacity,
        benefits: DEF.ticketType.benefits,
      },
    ],
    organizer: organizer._id,
    createdBy: organizer._id,
    organizerInfo: {
      id: organizer._id,
      name: organizer.name || 'TAFMA',
      email: organizer.email || '',
      phone: organizer.phone || '',
    },
  };

  let event = await Event.findOne({ slug: SLUG });
  if (event) {
    const keepSold = (event.ticketTypes || []).find((t) => t.name === DEF.ticketType.name)?.sold || 0;
    Object.assign(event, {
      ...payload,
      ticketTypes: [
        {
          ...(event.ticketTypes?.[0]?.toObject?.() || {}),
          ...payload.ticketTypes[0],
          sold: keepSold,
        },
      ],
    });
    await event.save();
    console.log('Updated existing Ticket to Hornbill event:', event._id.toString());
  } else {
    event = await Event.create(payload);
    console.log('Created Ticket to Hornbill event:', event._id.toString());
  }

  console.log('\n--- Ticket to Hornbill ready ---');
  console.log('slug:', event.slug);
  console.log('_id:', event._id.toString());
  console.log('date:', '6 Nov 2026, 4:00 PM – 10:30 PM IST');
  console.log('Public page: https://www.ahibi.in/ticket-to-hornbill');
  console.log('API: GET /api/hornbill-showcase/day1');
  console.log(
    '\nOptional: add this _id to HF_IDS in client/app/admin/components/HFTickets.tsx for admin reporting.'
  );

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('ensure-hornbill-showcase-day1 failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
