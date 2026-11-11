const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const NuscHomeMatchInventory = require('../models/NuscHomeMatchInventory');
const NuscHomeMatchOrder = require('../models/NuscHomeMatchOrder');

const OLD_DATE = '2027-02-06';
const NEW_DATE = '2026-12-07';
const OLD_SLUG = `nusc-home-match-${OLD_DATE.replace(/-/g, '')}`;
const NEW_SLUG = `nusc-home-match-${NEW_DATE.replace(/-/g, '')}`;
const INVENTORY_KEY = 'nusc-il-2026-27';
const OLD_START = new Date(`${OLD_DATE}T18:30:00+05:30`);
const NEW_START = new Date(`${NEW_DATE}T18:30:00+05:30`);
const APPLY = process.argv.includes('--apply');
const ALLOW_PRODUCTION = process.argv.includes('--allow-production');

function fail(message) {
  throw new Error(message);
}

function getDatabaseName() {
  try {
    const uri = new URL(process.env.MONGO_URI);
    return decodeURIComponent(uri.pathname.replace(/^\/+/, '')).split('/')[0];
  } catch {
    fail('MONGO_URI is missing or invalid.');
  }
}

function withSession(query, session) {
  return session ? query.session(session) : query;
}

function assertFixtureEvent(event, expectedStart) {
  if (!/chanmari\s+fc/i.test(event.title || '')) {
    fail(`Event ${event._id} is not the Chanmari FC listing.`);
  }
  if (new Date(event.startDate).getTime() !== expectedStart.getTime()) {
    fail(`Event ${event._id} has an unexpected kickoff time. Review it before rescheduling.`);
  }
  if (!event.endDate || new Date(event.endDate).getTime() <= new Date(event.startDate).getTime()) {
    fail(`Event ${event._id} has an invalid end time.`);
  }
}

function countDateValues(values = []) {
  return values.filter((value) => value === OLD_DATE).length;
}

function assertNoDateCollision(values = [], description) {
  if (values.includes(OLD_DATE) && values.includes(NEW_DATE)) {
    fail(`${description} already contains both fixture dates; review it before rescheduling.`);
  }
}

function getInventoryCounts(inventory) {
  if (!inventory) return null;

  for (const [name, entries] of [
    ['orders', inventory.orders],
    ['general zone sales', inventory.generalZoneSales],
    ['season pass orders', inventory.seasonPassOrders],
    ['partner season reservations', inventory.partnerSeasonPassReservations],
    ['suite season reservations', inventory.seasonReservations],
    ['suite attendance', inventory.suiteAttendance],
  ]) {
    for (const entry of entries || []) {
      const dates = Array.isArray(entry.matchDates) ? entry.matchDates : [entry.matchDate];
      assertNoDateCollision(dates.filter(Boolean), name);
    }
  }

  const oldOverrides = (inventory.capacityOverrides || []).filter((item) => item.matchDate === OLD_DATE);
  const targetOverrides = (inventory.capacityOverrides || []).filter((item) => item.matchDate === NEW_DATE);
  if (oldOverrides.some((oldItem) => targetOverrides.some((newItem) => newItem.ticketType === oldItem.ticketType))) {
    fail('Capacity overrides already exist for the target date; review them before rescheduling.');
  }
  const targetZoneSales = new Set((inventory.generalZoneSales || [])
    .filter((item) => item.matchDate === NEW_DATE)
    .map((item) => `${item.orderId}:${item.zone}`));
  if ((inventory.generalZoneSales || []).some((item) => item.matchDate === OLD_DATE && targetZoneSales.has(`${item.orderId}:${item.zone}`))) {
    fail('General-zone sales already exist for both fixture dates under the same order; review them before rescheduling.');
  }

  return {
    matchOrders: (inventory.orders || []).filter((item) => item.matchDate === OLD_DATE).length,
    generalZoneSales: (inventory.generalZoneSales || []).filter((item) => item.matchDate === OLD_DATE).length,
    seasonPassOrders: (inventory.seasonPassOrders || []).reduce((sum, item) => sum + countDateValues(item.matchDates), 0),
    partnerReservations: (inventory.partnerSeasonPassReservations || []).reduce((sum, item) => sum + countDateValues(item.matchDates), 0),
    suiteReservations: (inventory.seasonReservations || []).reduce((sum, item) => sum + countDateValues(item.matchDates), 0),
    suiteAttendance: (inventory.suiteAttendance || []).filter((item) => item.matchDate === OLD_DATE).length,
    capacityOverrides: oldOverrides.length,
  };
}

function updateSnapshotsAndDates(value, eventId, eventEnd, counts) {
  if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype === 'ObjectId') return;

  if (Array.isArray(value)) {
    for (const item of value) updateSnapshotsAndDates(item, eventId, eventEnd, counts);
    return;
  }

  if (value.matchDate === OLD_DATE) {
    value.matchDate = NEW_DATE;
    counts.bookingDetailDates += 1;
  }

  if (String(value._id || '') === String(eventId) && ('startDate' in value || 'slug' in value)) {
    value.startDate = NEW_START;
    value.endDate = eventEnd;
    if ('slug' in value) value.slug = NEW_SLUG;
    counts.eventSnapshots += 1;
  }

  for (const child of Object.values(value)) {
    updateSnapshotsAndDates(child, eventId, eventEnd, counts);
  }
}

function replaceDateList(values = []) {
  return values.map((value) => value === OLD_DATE ? NEW_DATE : value);
}

function getNuscOrderQuery(eventId) {
  return {
    $or: [
      { matchDates: OLD_DATE },
      { 'bookingDetails.fixtures.matchDate': OLD_DATE },
      { 'bookingDetails.fixtures.eventId': eventId },
      { 'bookingDetails.fixtures.event._id': eventId },
      { 'bookingDetails.event._id': eventId },
    ],
  };
}

async function createPlan(session) {
  const oldEvent = await withSession(Event.findOne({ slug: OLD_SLUG }), session);
  const newEvent = await withSession(Event.findOne({ slug: NEW_SLUG }), session);
  if (oldEvent && newEvent) fail('Both old and new Chanmari event slugs exist. No changes were made.');
  const event = oldEvent || newEvent;
  if (!event) fail('The Chanmari event was not found under either expected slug.');

  const expectedStart = oldEvent ? OLD_START : NEW_START;
  assertFixtureEvent(event, expectedStart);
  const eventEnd = oldEvent
    ? new Date(NEW_START.getTime() + (new Date(event.endDate).getTime() - OLD_START.getTime()))
    : new Date(event.endDate);

  const bookingCount = await withSession(Booking.countDocuments({ event: event._id }), session);
  const nuscOrders = await withSession(NuscHomeMatchOrder.find(getNuscOrderQuery(event._id)), session);
  const inventory = await withSession(NuscHomeMatchInventory.findOne({ key: INVENTORY_KEY }), session);

  const inventoryCounts = getInventoryCounts(inventory);
  let orderDateReferences = 0;
  let orderSnapshotCount = 0;
  for (const order of nuscOrders) {
    assertNoDateCollision([
      ...(order.matchDates || []),
      ...((order.bookingDetails?.fixtures || []).map((fixture) => fixture.matchDate)),
    ], `NUSC order ${order.orderId}`);
    const counts = { bookingDetailDates: 0, eventSnapshots: 0 };
    orderDateReferences += countDateValues(order.matchDates);
    updateSnapshotsAndDates(order.bookingDetails, event._id, eventEnd, counts);
    orderDateReferences += counts.bookingDetailDates;
    orderSnapshotCount += counts.eventSnapshots;
  }

  return {
    eventId: String(event._id),
    currentSlug: event.slug,
    targetSlug: NEW_SLUG,
    currentKickoff: new Date(event.startDate).toISOString(),
    targetKickoff: NEW_START.toISOString(),
    targetEnd: eventEnd.toISOString(),
    alreadyOnTargetDate: !oldEvent,
    linkedBookings: bookingCount,
    nuscOrders: nuscOrders.length,
    nuscOrderDateReferences: orderDateReferences,
    nuscOrderEventSnapshots: orderSnapshotCount,
    inventory: inventoryCounts,
  };
}

async function updateInventory(inventory, session) {
  if (!inventory) return;

  for (const order of inventory.orders || []) {
    if (order.matchDate === OLD_DATE) order.matchDate = NEW_DATE;
  }
  for (const sale of inventory.generalZoneSales || []) {
    if (sale.matchDate === OLD_DATE) sale.matchDate = NEW_DATE;
  }
  for (const order of inventory.seasonPassOrders || []) {
    order.matchDates = replaceDateList(order.matchDates);
  }
  for (const reservation of inventory.partnerSeasonPassReservations || []) {
    reservation.matchDates = replaceDateList(reservation.matchDates);
  }
  for (const reservation of inventory.seasonReservations || []) {
    reservation.matchDates = replaceDateList(reservation.matchDates);
  }
  for (const entry of inventory.suiteAttendance || []) {
    if (entry.matchDate === OLD_DATE) entry.matchDate = NEW_DATE;
  }
  for (const override of inventory.capacityOverrides || []) {
    if (override.matchDate === OLD_DATE) override.matchDate = NEW_DATE;
  }
  await inventory.save({ session });
}

async function runMigration(session) {
  const plan = await createPlan(session);
  if (!APPLY) return plan;

  const event = await withSession(Event.findById(plan.eventId), session);
  if (event.slug === OLD_SLUG) {
    event.slug = NEW_SLUG;
    event.startDate = NEW_START;
    event.endDate = new Date(plan.targetEnd);
    await event.save({ session });
  }

  await Booking.updateMany(
    { event: event._id },
    { $set: { 'eventSnapshot.startDate': NEW_START, 'eventSnapshot.endDate': new Date(plan.targetEnd) } },
    { session },
  );

  const orders = await withSession(NuscHomeMatchOrder.find(getNuscOrderQuery(event._id)), session);
  for (const order of orders) {
    order.matchDates = replaceDateList(order.matchDates || []);
    const counts = { bookingDetailDates: 0, eventSnapshots: 0 };
    updateSnapshotsAndDates(order.bookingDetails, event._id, new Date(plan.targetEnd), counts);
    order.markModified('bookingDetails');
    await order.save({ session });
  }

  const inventory = await withSession(NuscHomeMatchInventory.findOne({ key: INVENTORY_KEY }), session);
  await updateInventory(inventory, session);
  return plan;
}

async function main() {
  if (!process.env.MONGO_URI) fail('MONGO_URI is not configured.');
  const databaseName = getDatabaseName();
  if (!['ahibi', 'ahibi-test'].includes(databaseName)) {
    fail(`Refusing to connect to unexpected database "${databaseName}".`);
  }
  if (APPLY && databaseName === 'ahibi' && !ALLOW_PRODUCTION) {
    fail('Applying to the ahibi database requires the explicit --allow-production flag.');
  }
  if (APPLY && process.env.NODE_ENV === 'production' && !ALLOW_PRODUCTION) {
    fail('Applying while NODE_ENV=production requires the explicit --allow-production flag.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  if (!APPLY) {
    const plan = await runMigration(null);
    console.log(JSON.stringify({ mode: 'dry-run', database: databaseName, plan }, null, 2));
    console.log('No records were changed.');
    return;
  }

  const session = await mongoose.startSession();
  try {
    let plan;
    await session.withTransaction(async () => {
      plan = await runMigration(session);
    });
    console.log(JSON.stringify({ mode: 'applied', database: databaseName, plan }, null, 2));
  } finally {
    await session.endSession();
  }
}

main()
  .catch((error) => {
    const message = String(error?.message || error).replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[redacted]');
    console.error(`[NUSC fixture migration] ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
