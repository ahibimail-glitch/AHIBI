/**
 * Seed / update the GE Blaster — Daily Blaster Experience event.
 *
 * Usage (from the server/ directory):
 *   node scripts/seedGeBlaster.js
 *
 * Optional environment variables:
 *   GEB_OWNER_EMAIL   Email of the AHIBI user (venue owner) to set as organizer.
 *                     If omitted/not found, the first user in the DB is used.
 *   GEB_START_DATE    First active date, YYYY-MM-DD (default: today, IST).
 *   GEB_DAYS          Number of consecutive active days to create (default: 60).
 *   GEB_ADDRESS       Venue address string (default: "GE Blaster, Nagaland").
 *   GEB_CITY          Venue city (default: "Dimapur").
 *
 * Safe to re-run: if the event already exists it updates content (banner,
 * gallery, description, dates) but PRESERVES the existing slot ticketTypes
 * (and their ids) so existing bookings stay linked.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DailyEvent = require('../models/DailyEvent');
const User = require('../models/User');

const SLUG = 'ge-blaster';
const PRICE_PER_PLAYER = 350;

const SLOTS = [
  '3:00 PM – 3:40 PM',
  '3:40 PM – 4:20 PM',
  '4:20 PM – 5:00 PM',
];

const GALLERY = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
  url: `/ge-blaster/gallery-${n}.jpg`,
  caption: 'GE Blaster Nagaland',
}));

const DESCRIPTION = [
  'Book a private 40-minute GE Blaster session for your group. Each time slot is exclusive to one booking and can accommodate 2 to 6 players.',
  '',
  'How it works: pick a date, choose an available 40-minute slot, and select how many players (2–6). The total is calculated automatically at ₹350 per player. Once payment is successful, the full slot is reserved for your group and becomes unavailable to everyone else.',
  '',
  'Precision • Power • Performance. Quality gel, max impact, non-toxic. Play hard, stay safe.',
  '',
  'Participation is subject to GE Blaster safety rules and operator eligibility requirements. Need special bullets? Contact +91 8787401331 (call or WhatsApp).',
].join('\n');

function istTodayStr() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function buildActiveDates(startStr, days) {
  const dates = [];
  const base = new Date(`${startStr}T12:00:00+05:30`);
  for (let i = 0; i < days; i += 1) {
    dates.push(new Date(base.getTime() + i * 24 * 60 * 60 * 1000));
  }
  return dates;
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI (or MONGODB_URI) is not set. Run this from the server/ directory with your .env present.');
    process.exit(1);
  }

  mongoose.set('strictQuery', true);
  mongoose.set('bufferTimeoutMS', 30000);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  await mongoose.connection.asPromise();
  console.log('Connected to MongoDB.');

  // Resolve organizer / createdBy user
  let owner = null;
  if (process.env.GEB_OWNER_EMAIL) {
    owner = await User.findOne({ email: process.env.GEB_OWNER_EMAIL.toLowerCase().trim() });
    if (owner) console.log(`Owner resolved: ${owner.email} (${owner._id})`);
    else console.warn(`No user found for GEB_OWNER_EMAIL=${process.env.GEB_OWNER_EMAIL}; falling back to first user.`);
    if (owner && owner.role !== 'organizer') {
      owner.role = 'organizer';
      await owner.save();
      console.log(`Promoted ${owner.email} to role 'organizer' (so they see GE Blaster bookings in the organizer dashboard).`);
    }
  }
  if (!owner) {
    owner = await User.findOne().sort({ createdAt: 1 });
    if (!owner) {
      console.error('No users exist in the database to own the event. Create a user first.');
      process.exit(1);
    }
    console.log(`Using fallback owner: ${owner.email || owner._id}`);
  }

  const startStr = (process.env.GEB_START_DATE || istTodayStr()).trim();
  const days = Math.max(1, parseInt(process.env.GEB_DAYS || '60', 10));
  const activeDates = buildActiveDates(startStr, days);
  const periodStartDate = activeDates[0];
  const periodEndDate = activeDates[activeDates.length - 1];
  const address = process.env.GEB_ADDRESS || 'GE Blaster, Nagaland';
  const city = process.env.GEB_CITY || 'Dimapur';

  let event = await DailyEvent.findOne({ slug: SLUG });

  if (!event) {
    event = new DailyEvent({
      title: 'GE Blaster — Daily Blaster Experience',
      slug: SLUG,
      description: DESCRIPTION,
      banner: '/ge-blaster/banner.jpg',
      coverImage: '/ge-blaster/banner.jpg',
      gallery: GALLERY,
      organizer: owner._id,
      organizerInfo: { id: owner._id, name: owner.name || 'GE Blaster' },
      createdBy: owner._id,
      duration: { hours: 0, minutes: 40 },
      startTime: '15:00',
      periodStartDate,
      periodEndDate,
      activeDates,
      excludedDates: [],
      category: 'Sports',
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
        'One slot = one booking. A successful booking reserves the full 40-minute session for your group (2–6 players). Participation is subject to GE Blaster safety rules and operator eligibility.',
      status: 'approved',
      approvalStatus: 'approved',
      isPublic: true,
      isFreeEvent: false,
      location: { address, city },
    });
    await event.save();
    console.log('Created GE Blaster event.');
  } else {
    // Update content but preserve slot ticketTypes & their ids
    event.title = 'GE Blaster — Daily Blaster Experience';
    event.description = DESCRIPTION;
    event.banner = '/ge-blaster/banner.jpg';
    event.coverImage = '/ge-blaster/banner.jpg';
    event.gallery = GALLERY;
    event.organizer = owner._id;
    event.organizerInfo = { id: owner._id, name: owner.name || 'GE Blaster' };
    event.duration = { hours: 0, minutes: 40 };
    event.startTime = '15:00';
    event.periodStartDate = periodStartDate;
    event.periodEndDate = periodEndDate;
    event.activeDates = activeDates;
    event.category = 'Sports';
    event.status = 'approved';
    event.approvalStatus = 'approved';
    event.isPublic = true;
    event.isFreeEvent = false;
    event.location = { address, city };

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
      // Keep existing slot ids (so bookings stay linked) but refresh price/description.
      event.ticketTypes.forEach((t) => {
        t.price = PRICE_PER_PLAYER;
        t.capacity = 6;
        t.description = 'Exclusive 40-minute slot · 2–6 players · ₹350 per player';
      });
      event.markModified('ticketTypes');
    }
    await event.save();
    console.log('Updated existing GE Blaster event (slots preserved).');
  }

  console.log('\n==== GE BLASTER EVENT ====');
  console.log('Event _id   :', String(event._id));
  console.log('Slug        :', event.slug);
  console.log('Organizer   :', String(event.organizer));
  console.log('Active dates :', event.activeDates.length, `(from ${startStr} for ${days} days)`);
  console.log('Slots:');
  event.ticketTypes.forEach((t) => console.log('  -', t.name, '| id:', String(t._id)));
  console.log('Public page  : /ge-blaster');
  console.log('==========================\n');

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  try { await mongoose.disconnect(); } catch (e) {}
  process.exit(1);
});
