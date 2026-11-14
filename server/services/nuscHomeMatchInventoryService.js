const mongoose = require('mongoose');
const Inventory = require('../models/NuscHomeMatchInventory');
const NuscHomeMatchOrder = require('../models/NuscHomeMatchOrder');
const Booking = require('../models/Booking');
const { UNITED_SUITE_BOXES, UNITED_SUITE_MAPPING_CONFIRMED } = require('../config/unitedSuiteBoxes');

const BOX_COUNT = UNITED_SUITE_BOXES.length;
const SEATS_PER_BOX = 8;
const FULL_BOX_SEATS = 10;
const SINGLE_PASS_BOX_NUMBER = 1;
const SINGLE_MATCH_BOX_NUMBERS = UNITED_SUITE_BOXES.filter((box) => box.guestCapacity === 8 && box.boxNumber !== SINGLE_PASS_BOX_NUMBER).map((box) => box.boxNumber);
const FULL_BOX_NUMBERS = UNITED_SUITE_BOXES.filter((box) => box.guestCapacity === FULL_BOX_SEATS).map((box) => box.boxNumber);
const SEASON_BOX_COUNT = 3;
const SEASON_BOX_NUMBERS = FULL_BOX_NUMBERS;
const BUYER_TICKET_LIMIT = 10;
const SINGLE_MATCH_CAPACITY = 2;
const HOLD_MINUTES = 30;
const GENERAL_TICKET_TYPE = 'General Pass';
const MATCH_TICKET_PRICES = {
  'general pass': { price: 358.8, basePrice: 299 },
  'premium pass': { price: 1500, basePrice: 1250 },
  'united suite - single pass': { price: 7500, basePrice: 6250 },
  'united suite - single match': { price: 84000, basePrice: 70000 },
  'united suite - full box': { price: 60000, basePrice: 50000 },
};
const SEASON_PASS_OPTIONS = {
  'general-season': { name: 'General Season Pass', ticketType: 'General Pass', amount: 3240 },
  'premium-season': { name: 'Premium Season Pass', ticketType: 'Premium Pass', amount: 13500 },
};
function normalizeTicketTypeName(name) {
  return String(name || '')
    .normalize('NFKC')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
function getMatchTicketPrice(ticketType) {
  return MATCH_TICKET_PRICES[normalizeTicketTypeName(ticketType)];
}
function getMongoDatabaseName() {
  try {
    return decodeURIComponent(new URL(process.env.MONGO_URI).pathname.replace(/^\/+/, '')).split('/')[0];
  } catch {
    return '';
  }
}
const NUSC_TEST_MODE_ENABLED = process.env.NUSC_HOME_MATCH_TEST_MODE === 'true' &&
  process.env.NODE_ENV !== 'production' &&
  /^rzp_test_/.test(process.env.RAZORPAY_KEY_ID || '') &&
  getMongoDatabaseName() === 'ahibi-test';
const NUSC_LIVE_SALES_ENABLED = process.env.NODE_ENV === 'production' &&
  process.env.NUSC_HOME_MATCH_TICKET_SALES_ENABLED === 'true' &&
  /^rzp_live_/.test(process.env.RAZORPAY_KEY_ID || '') &&
  getMongoDatabaseName() === 'ahibi';
const TICKET_SALES_ENABLED = (
  NUSC_TEST_MODE_ENABLED || NUSC_LIVE_SALES_ENABLED
) && process.env.NUSC_HOME_MATCH_TICKET_SALES_ENABLED === 'true';
const GENERAL_SEATING_AREAS = [
  { name: 'G-1', capacity: 550 },
  { name: 'G-2', capacity: 550 },
  { name: 'G-3', capacity: 450 },
  { name: 'G-4', capacity: 650 },
  { name: 'G-5', capacity: 600 },
];
const TICKET_CAPACITIES = {
  'General Pass': GENERAL_SEATING_AREAS.reduce((sum, area) => sum + area.capacity, 0),
  'Premium Pass': 185,
  'United Suite - Single Match': SINGLE_MATCH_CAPACITY,
};
const SEASON_PASS_CAPACITIES = Object.freeze({
  'General Pass': 50,
  'Premium Pass': 25,
});
const INVENTORY_KEY = 'nusc-il-2026-27';
const LEGACY_MATCH_DATE_ALIASES = Object.freeze({
  // Existing payment returns may still submit the originally scheduled date.
  '2027-02-06': '2026-12-07',
});
const VENUE_ONLY_MATCHES = Object.freeze({
  '2026-11-14': 'NUSC vs Gokulam Kerala FC',
});
const FIXTURE_MATCHES = [
  { date: '2026-11-14', opponent: 'Gokulam Kerala FC' },
  { date: '2026-11-30', opponent: 'Dempo SC' },
  { date: '2026-12-15', opponent: 'Sreenidi Deccan FC' },
  { date: '2026-12-19', opponent: 'Mohammedan SC' },
  { date: '2027-01-04', opponent: 'Rajasthan United FC' },
  { date: '2027-01-09', opponent: 'FC Bengaluru United' },
  { date: '2027-01-16', opponent: 'Shillong Lajong FC' },
  { date: '2026-12-07', opponent: 'Chanmari FC' },
  { date: '2027-03-13', opponent: 'Samaleswari SC' },
  { date: '2027-03-20', opponent: 'Real Kashmir FC' },
];
const FIXTURE_DATES = FIXTURE_MATCHES.map((match) => match.date);
function normalizeMatchDate(matchDate) {
  const value = String(matchDate || '');
  return LEGACY_MATCH_DATE_ALIASES[value] || value;
}
function getLegacyMatchDate(matchDate) {
  const normalizedDate = normalizeMatchDate(matchDate);
  return Object.entries(LEGACY_MATCH_DATE_ALIASES).find(([, targetDate]) => targetDate === normalizedDate)?.[0] || normalizedDate;
}
function isVenueOnlyMatchDate(matchDate) {
  return Boolean(VENUE_ONLY_MATCHES[normalizeMatchDate(matchDate)]);
}
function getVenueOnlyMatchSalesMessage(matchDate) {
  const normalizedDate = normalizeMatchDate(matchDate);
  const opponent = VENUE_ONLY_MATCHES[normalizedDate];
  if (!opponent) return null;
  const todayInIndia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return todayInIndia === normalizedDate
    ? `Online ticket sales for ${opponent} have closed. Tickets will be available at the venue today.`
    : `Online ticket sales for ${opponent} have closed.`;
}
function assertMatchOnlineSalesOpen(matchDate, allowMatchSalesClosed = false) {
  const message = getVenueOnlyMatchSalesMessage(matchDate);
  if (message && !allowMatchSalesClosed) {
    throw new InventoryConflict(message, 'MATCH_ONLINE_SALES_CLOSED');
  }
}
const OFFLINE_RESERVED_SINGLE_PASS_SEATS_BY_DATE = Object.freeze({
  '2026-11-14': 3,
});

const SUITE_SINGLE = 'United Suite — Single pass';
const SUITE_SINGLE_MATCH = 'United Suite - Single Match';
const SUITE_FULL_BOX = 'United Suite — Full Box';
const SUITE_SEASON = 'United Suite — Season';
const SEASON_PASS_TICKET_TYPES = ['General Pass', 'Premium Pass'];
const SEASON_BOX_CAPACITY_KEY = 'United Suite Season Box';
const CAPACITY_CONTROL_DEFINITIONS = [
  { ticketType: 'General Pass', label: 'General Pass', group: 'Match tickets', unit: 'seats', scope: 'match', defaultCapacity: TICKET_CAPACITIES['General Pass'], maxCapacity: TICKET_CAPACITIES['General Pass'] },
  { ticketType: 'Premium Pass', label: 'Premium Pass', group: 'Match tickets', unit: 'seats', scope: 'match', defaultCapacity: TICKET_CAPACITIES['Premium Pass'], maxCapacity: 275 },
  { ticketType: SUITE_SINGLE, label: 'United Suite — Single pass', group: 'Match tickets', unit: 'seats', scope: 'match', defaultCapacity: SEATS_PER_BOX, maxCapacity: SEATS_PER_BOX },
  { ticketType: SUITE_FULL_BOX, label: 'United Suite — Full Box', group: 'Match tickets', unit: 'boxes', scope: 'match', defaultCapacity: FULL_BOX_NUMBERS.length, maxCapacity: FULL_BOX_NUMBERS.length },
  { ticketType: SUITE_SINGLE_MATCH, label: 'United Suite — Single Match', group: 'Match tickets', unit: 'boxes', scope: 'match', defaultCapacity: SINGLE_MATCH_CAPACITY, maxCapacity: SINGLE_MATCH_CAPACITY },
  { ticketType: 'General Season Pass', label: 'General Season Pass', group: 'Season passes', unit: 'passes', scope: 'global', defaultCapacity: SEASON_PASS_CAPACITIES['General Pass'], maxCapacity: TICKET_CAPACITIES['General Pass'] },
  { ticketType: 'Premium Season Pass', label: 'Premium Season Pass', group: 'Season passes', unit: 'passes', scope: 'global', defaultCapacity: SEASON_PASS_CAPACITIES['Premium Pass'], maxCapacity: TICKET_CAPACITIES['Premium Pass'] },
  { ticketType: SEASON_BOX_CAPACITY_KEY, label: 'United Suite Season Box', group: 'Season passes', unit: 'boxes', scope: 'global', defaultCapacity: SEASON_BOX_COUNT, maxCapacity: SEASON_BOX_COUNT },
];

function getCapacityDefinition(ticketType) {
  const normalized = normalizeTicketTypeName(ticketType);
  return CAPACITY_CONTROL_DEFINITIONS.find((item) => normalizeTicketTypeName(item.ticketType) === normalized) || null;
}

function getConfiguredBox(boxNumber) {
  return UNITED_SUITE_BOXES.find((box) => box.boxNumber === Number(boxNumber)) || null;
}

function getConfiguredBoxForAllocation(allocation) {
  if (allocation && typeof allocation === 'object' && allocation.boxId) {
    return UNITED_SUITE_BOXES.find((box) => box.boxId === allocation.boxId) || null;
  }
  return getConfiguredBox(typeof allocation === 'object' ? allocation?.boxNumber : allocation);
}

function getAllocationBoxNumber(allocation) {
  return getConfiguredBoxForAllocation(allocation)?.boxNumber || Number(allocation?.boxNumber ?? allocation);
}

function getPhysicalBoxNumber(boxNumber) {
  const box = getConfiguredBoxForAllocation(boxNumber);
  if (boxNumber && typeof boxNumber === 'object' && Number.isInteger(Number(boxNumber.physicalNumber)) && Number(boxNumber.physicalNumber) > 0) return Number(boxNumber.physicalNumber);
  return UNITED_SUITE_MAPPING_CONFIRMED ? box?.physicalNumber || null : null;
}

function getBoxDisplayNumber(boxNumber) {
  return getPhysicalBoxNumber(boxNumber) || Number(typeof boxNumber === 'object' ? boxNumber.boxNumber : boxNumber);
}

function getBoxGuestCapacity(boxNumber) {
  if (boxNumber && typeof boxNumber === 'object' && Number.isInteger(Number(boxNumber.guestCapacity)) && Number(boxNumber.guestCapacity) > 0) return Number(boxNumber.guestCapacity);
  return getConfiguredBoxForAllocation(boxNumber)?.guestCapacity || SEATS_PER_BOX;
}

function createSuiteAllocation(ticketType, ticketIndex, boxNumber) {
  const box = getConfiguredBox(boxNumber);
  return {
    ticketType,
    ticketIndex,
    boxNumber,
    ...(box && { boxId: box.boxId, guestCapacity: box.guestCapacity }),
    ...(box?.physicalNumber && { physicalNumber: box.physicalNumber }),
  };
}

function assertUnitedSuiteMappingForProduction() {
  if (process.env.NODE_ENV === 'production' && !UNITED_SUITE_MAPPING_CONFIRMED) {
    throw new InventoryConflict('United Suite physical box numbers must be configured before Suite sales can open.', 'BOX_MAPPING_UNCONFIRMED');
  }
}

function getCapacityOverride(state, matchDate, ticketType) {
  const definition = getCapacityDefinition(ticketType);
  if (!definition) return null;
  const scopedMatchDate = definition.scope === 'match' ? matchDate : null;
  return (state?.capacityOverrides || []).find((override) => (
    normalizeTicketTypeName(override.ticketType) === normalizeTicketTypeName(definition.ticketType) &&
    (override.matchDate || null) === scopedMatchDate
  )) || null;
}

function getInventoryCapacity(state, matchDate, ticketType) {
  const definition = getCapacityDefinition(ticketType);
  if (!definition) return null;
  const override = getCapacityOverride(state, matchDate, definition.ticketType);
  return override ? Number(override.capacity) : definition.defaultCapacity;
}

function getInventoryAvailabilityLimit(state, matchDate, ticketType, zone = null) {
  const definition = getCapacityDefinition(ticketType);
  if (!definition) return 0;
  const scopedMatchDate = definition.scope === 'match' ? matchDate : null;
  const zoneCapacity = zone
    ? GENERAL_SEATING_AREAS.find((area) => area.name === zone)?.capacity
    : null;
  const capacity = zoneCapacity ?? getInventoryCapacity(state, scopedMatchDate, definition.ticketType);
  const override = (state?.availabilityOverrides || []).find((item) => (
    normalizeTicketTypeName(item.ticketType) === normalizeTicketTypeName(definition.ticketType) &&
    (item.matchDate || null) === scopedMatchDate &&
    (item.zone || null) === (zone || null)
  ));
  return Math.max(0, Math.min(capacity, override ? Number(override.availability) : capacity));
}

function getOfflineReservedSinglePassSeats(state, matchDate) {
  const configured = Number(OFFLINE_RESERVED_SINGLE_PASS_SEATS_BY_DATE[matchDate] || 0);
  const released = (state.offlineSinglePassReleases || [])
    .filter((item) => item.matchDate === matchDate)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  return Math.max(0, configured - released);
}

function getSeasonPassCapacity(state, ticketType) {
  const seasonTicketType = `${ticketType === GENERAL_TICKET_TYPE ? 'General' : 'Premium'} Season Pass`;
  return getInventoryCapacity(state, null, seasonTicketType);
}

class InventoryConflict extends Error {
  constructor(message, code = 'INVENTORY_UNAVAILABLE') {
    super(message);
    this.name = 'InventoryConflict';
    this.code = code;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadInventory(session, projection) {
  const query = projection
    ? Inventory.findOne({ key: INVENTORY_KEY }, projection)
    : Inventory.findOne({ key: INVENTORY_KEY });
  if (session) query.session(session);
  return query.lean();
}

async function ensureInventory(session, projection) {
  await Inventory.updateOne(
    { key: INVENTORY_KEY },
    { $setOnInsert: { key: INVENTORY_KEY, orders: [], generalZoneSales: [], seasonPassOrders: [], partnerSeasonPassReservations: [], seasonReservations: [], capacityOverrides: [], availabilityOverrides: [], offlineSinglePassReleases: [], seasonPassHistoryInitializedAt: null } },
    { upsert: true, ...(session ? { session } : {}) }
  );
  return loadInventory(session, projection);
}

function pruneExpiredHolds(state, now = new Date()) {
  state.orders = (state.orders || []).filter((order) => (
    order.status === 'confirmed' ||
    (order.status === 'held' && new Date(order.expiresAt) > now)
  ));
  state.seasonPassOrders = (state.seasonPassOrders || []).filter((order) => (
    order.status === 'confirmed' ||
    (order.status === 'held' && new Date(order.expiresAt) > now)
  ));
}

async function backfillSeasonPassHistory(session) {
  let current = await loadInventory(session);
  if (!current) current = await ensureInventory(session);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (attempt > 0) current = await loadInventory(session);
    if (!current) throw new Error('NUSC suite inventory could not be initialized');
    if (current.seasonPassHistoryInitializedAt) return;

    const query = NuscHomeMatchOrder.find({
      orderType: 'seasonPass',
      status: { $in: ['completed', 'created', 'settling', 'paid_no_booking', 'refund_pending', 'refunded'] },
      $or: [
        { status: 'completed' },
        { status: 'refunded' },
        { paymentId: { $exists: true, $nin: [null, ''] } },
      ],
    }).select('orderId user bookingDetails status createdAt');
    if (session) query.session(session);
    const historicalOrders = await query.lean();
    const seasonPassOrders = [...(current.seasonPassOrders || [])];

    for (const order of historicalOrders) {
      if (order.status === 'refunded') {
        for (let index = seasonPassOrders.length - 1; index >= 0; index -= 1) {
          if (seasonPassOrders[index].orderId === order.orderId) seasonPassOrders.splice(index, 1);
        }
        continue;
      }

      const ticketType = order.bookingDetails?.ticketType || SEASON_PASS_OPTIONS[order.bookingDetails?.passId]?.ticketType;
      const quantity = Number(order.bookingDetails?.quantity);
      if (!SEASON_PASS_CAPACITIES[ticketType] || !Number.isInteger(quantity) || quantity < 1 || !order.user) {
        throw new InventoryConflict('Season pass inventory needs reconciliation before sales can continue.', 'INVENTORY_RECONCILIATION_REQUIRED');
      }

      const existing = seasonPassOrders.find((item) => item.orderId === order.orderId);
      if (existing) {
        existing.status = 'confirmed';
        existing.stockApplied = order.status === 'completed';
        existing.expiresAt = new Date(0);
        continue;
      }

      seasonPassOrders.push({
        orderId: order.orderId,
        userId: order.user,
        ticketType,
        quantity,
        ...(order.bookingDetails?.zone && { zone: order.bookingDetails.zone }),
        matchDates: FIXTURE_DATES,
        status: 'confirmed',
        stockApplied: order.status === 'completed',
        expiresAt: new Date(0),
        createdAt: order.createdAt || new Date(),
      });
    }

    const initializedAt = new Date();
    const update = await Inventory.updateOne(
      { _id: current._id, __v: current.__v || 0 },
      {
        $set: {
          seasonPassOrders,
          seasonPassHistoryInitializedAt: initializedAt,
          updatedAt: initializedAt,
        },
        $inc: { __v: 1 },
      },
      { ...(session ? { session } : {}) }
    );
    if (update.modifiedCount === 1) return;
    if (session) throw new InventoryConflict('Suite inventory changed during checkout. Please try again.', 'INVENTORY_BUSY');
  }

  throw new InventoryConflict('Suite inventory changed during checkout. Please try again.', 'INVENTORY_BUSY');
}

async function mutateInventory(mutator, session, { pruneExpired = true } = {}) {
  let current = await loadInventory(session);
  if (!current) current = await ensureInventory(session);
  await backfillSeasonPassHistory(session);
  current = await loadInventory(session);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (attempt > 0) current = await loadInventory(session);
    if (!current) throw new Error('NUSC suite inventory could not be initialized');
    const state = clone(current);
    state.generalZoneSales ||= [];
    state.seasonPassOrders ||= [];
    state.partnerSeasonPassReservations ||= [];
    state.capacityOverrides ||= [];
    state.availabilityOverrides ||= [];
    state.offlineSinglePassReleases ||= [];
    if (pruneExpired) pruneExpiredHolds(state);
    const result = await mutator(state);
    const update = await Inventory.updateOne(
      { _id: current._id, __v: current.__v || 0 },
      {
        $set: {
          orders: state.orders,
          generalZoneSales: state.generalZoneSales,
          seasonPassOrders: state.seasonPassOrders,
          partnerSeasonPassReservations: state.partnerSeasonPassReservations,
          seasonReservations: state.seasonReservations,
          capacityOverrides: state.capacityOverrides,
          availabilityOverrides: state.availabilityOverrides,
          offlineSinglePassReleases: state.offlineSinglePassReleases,
          updatedAt: new Date(),
        },
        $inc: { __v: 1 },
      },
      { ...(session ? { session } : {}) }
    );
    if (update.modifiedCount === 1) return result;
    if (session) throw new InventoryConflict('Suite inventory changed during checkout. Please try again.', 'INVENTORY_BUSY');
  }
  throw new InventoryConflict('Suite inventory changed during checkout. Please try again.', 'INVENTORY_BUSY');
}

function isSuiteType(ticketType) {
  return ticketType === SUITE_SINGLE || ticketType === SUITE_FULL_BOX;
}

function buyerTicketUnits(ticketType, quantity) {
  if (ticketType === SUITE_FULL_BOX) return quantity * FULL_BOX_SEATS;
  if (ticketType === SUITE_SINGLE_MATCH) return quantity * SEATS_PER_BOX;
  return quantity;
}

function activeOrdersForDate(state, matchDate) {
  const now = new Date();
  return state.orders.filter((order) => (
    order.matchDate === matchDate &&
    (order.status === 'confirmed' || (order.status === 'held' && new Date(order.expiresAt) > now))
  ));
}

function activeSeasonPassOrdersForDate(state, matchDate) {
  const now = new Date();
  return (state.seasonPassOrders || []).filter((order) => (
    (order.matchDates || []).includes(matchDate) &&
    ((order.status === 'confirmed' && !order.stockApplied) || (order.status === 'held' && new Date(order.expiresAt) > now))
  ));
}

function getSingleMatchReservedCount(state, matchDate = null, now = new Date()) {
  return (state.orders || []).reduce((reserved, order) => {
    if (matchDate && order.matchDate !== matchDate) return reserved;
    const active = order.status === 'confirmed' ||
      (order.status === 'held' && new Date(order.expiresAt) > now);
    if (!active) return reserved;
    return reserved + (order.ticketLines || [])
      .filter((line) => normalizeTicketTypeName(line.ticketType) === normalizeTicketTypeName(SUITE_SINGLE_MATCH))
      .reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  }, 0);
}

function getSeasonPassQuotaUsage(state, ticketType, now = new Date()) {
  const orderIds = new Set();
  let used = 0;
  for (const order of state.seasonPassOrders || []) {
    if (order.ticketType !== ticketType || String(order.orderId || '').startsWith('nusc-recovery:')) continue;
    const active = order.status === 'confirmed' || (order.status === 'held' && new Date(order.expiresAt) > now);
    if (!active) continue;
    used += Number(order.quantity || 0);
    orderIds.add(order.orderId);
  }

  for (const reservation of state.partnerSeasonPassReservations || []) {
    if (reservation.ticketType !== ticketType || orderIds.has(reservation.reservationId)) continue;
    const active = reservation.status === 'issuing' || reservation.status === 'issued' ||
      (reservation.status === 'held' && new Date(reservation.expiresAt) > now);
    if (!active) continue;
    used += 1;
    orderIds.add(reservation.reservationId);
  }

  return { used, orderIds };
}

function getBoxState(state, matchDate) {
  const activeSeasonBoxes = new Set(
    state.seasonReservations
      .filter((reservation) => reservation.status === 'active')
      .map((reservation) => reservation.boxNumber)
  );
  const orders = activeOrdersForDate(state, matchDate);

  const boxes = UNITED_SUITE_BOXES.map((configuredBox) => {
    const boxNumber = configuredBox.boxNumber;
    const allocations = orders.flatMap((order) => order.suiteAllocations || [])
      .filter((allocation) => getAllocationBoxNumber(allocation) === boxNumber);
    return {
      boxNumber,
      guestCapacity: configuredBox.guestCapacity,
      seasonReserved: activeSeasonBoxes.has(boxNumber),
      fullBoxReserved: allocations.some((allocation) => allocation.ticketType === SUITE_FULL_BOX),
      singleMatchReserved: allocations.some((allocation) => allocation.ticketType === SUITE_SINGLE_MATCH),
      singlePassCount: allocations.filter((allocation) => allocation.ticketType === SUITE_SINGLE).length,
    };
  });
  const boxByNumber = new Map(boxes.map((box) => [box.boxNumber, box]));
  for (const order of orders) {
    const ticketCount = (order.ticketLines || [])
      .filter((line) => normalizeTicketTypeName(line.ticketType) === normalizeTicketTypeName(SUITE_SINGLE_MATCH))
      .reduce((sum, line) => sum + Number(line.quantity || 0), 0);
    const allocatedCount = (order.suiteAllocations || [])
      .filter((allocation) => normalizeTicketTypeName(allocation.ticketType) === normalizeTicketTypeName(SUITE_SINGLE_MATCH)).length;
    let unassigned = Math.max(0, ticketCount - allocatedCount);
    for (const boxNumber of SINGLE_MATCH_BOX_NUMBERS) {
      if (unassigned < 1) break;
      const box = boxByNumber.get(boxNumber);
      if (!box || box.seasonReserved || box.fullBoxReserved || box.singleMatchReserved || box.singlePassCount > 0) continue;
      box.singleMatchReserved = true;
      unassigned -= 1;
    }
  }
  return boxes;
}

function getSuiteAvailability(state, matchDate) {
  const boxes = getBoxState(state, matchDate);
  const singlePassBox = boxes.find((box) => box.boxNumber === SINGLE_PASS_BOX_NUMBER);
  const fullBoxes = boxes.filter((box) => FULL_BOX_NUMBERS.includes(box.boxNumber));
  const offlineReservedSeats = getOfflineReservedSinglePassSeats(state, matchDate);
  const availablePhysicalBoxes = fullBoxes.filter((box) => !box.seasonReserved && !box.fullBoxReserved && box.singlePassCount === 0).length;
  const occupiedBoxes = fullBoxes.length - availablePhysicalBoxes;
  const fullBoxCapacity = getInventoryCapacity(state, matchDate, SUITE_FULL_BOX);
  const singlePassUsed = (singlePassBox?.singlePassCount || 0) + offlineReservedSeats;
  const singlePassCapacity = getInventoryCapacity(state, matchDate, SUITE_SINGLE);
  const singlePassAvailability = getInventoryAvailabilityLimit(state, matchDate, SUITE_SINGLE);
  const singleMatchUsed = getSingleMatchReservedCount(state, matchDate);
  const availableSingleMatchBoxes = boxes.filter((box) => (
    SINGLE_MATCH_BOX_NUMBERS.includes(box.boxNumber) &&
    !box.seasonReserved && !box.fullBoxReserved && !box.singleMatchReserved && box.singlePassCount === 0
  )).length;
  const singleMatchCapacity = getInventoryCapacity(state, matchDate, SUITE_SINGLE_MATCH);
  return {
    fullBoxes: Math.min(availablePhysicalBoxes, Math.max(0, fullBoxCapacity - occupiedBoxes), getInventoryAvailabilityLimit(state, matchDate, SUITE_FULL_BOX)),
    fullBoxCapacity,
    singleMatchBoxes: Math.min(
      availableSingleMatchBoxes,
      Math.max(0, singleMatchCapacity - singleMatchUsed),
      Math.max(0, getInventoryAvailabilityLimit(state, matchDate, SUITE_SINGLE_MATCH) - singleMatchUsed)
    ),
    singleMatchCapacity,
    singleSeats: singlePassBox && !singlePassBox.seasonReserved && !singlePassBox.fullBoxReserved
      ? Math.min(
        Math.max(0, SEATS_PER_BOX - singlePassUsed),
        Math.max(0, singlePassCapacity - singlePassUsed),
        singlePassAvailability
      )
      : 0,
    singlePassCapacity,
  };
}

function normalizeTicketLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new InventoryConflict('Choose at least one ticket.', 'INVALID_TICKETS');
  }
  return lines.map((line) => {
    const quantity = Number(line.quantity);
    if (!line.ticketType || !Number.isInteger(quantity) || quantity < 1) {
      throw new InventoryConflict('Ticket selection is invalid.', 'INVALID_TICKETS');
    }
    const ticketType = String(line.ticketType);
    const zone = line.zone == null ? '' : String(line.zone).trim();
    if (ticketType === GENERAL_TICKET_TYPE && !GENERAL_SEATING_AREAS.some((area) => area.name === zone)) {
      throw new InventoryConflict('Choose a General seating zone before checkout.', 'GENERAL_ZONE_REQUIRED');
    }
    if (ticketType !== GENERAL_TICKET_TYPE && zone) {
      throw new InventoryConflict('A seating zone can only be selected for General Pass tickets.', 'INVALID_GENERAL_ZONE');
    }
    return { ticketType, quantity, ...(zone && { zone }) };
  });
}

async function getGeneralZoneSalesByEventIds(eventIds = []) {
  const ids = (eventIds || []).filter(Boolean);
  if (!ids.length || typeof Booking.aggregate !== 'function') return {};
  const zones = GENERAL_SEATING_AREAS.map((area) => area.name);
  const rows = await Booking.aggregate([
    { $match: { event: { $in: ids }, nuscGeneralZone: { $in: zones }, status: { $in: ['confirmed', 'checked-in'] } } },
    { $group: { _id: { event: '$event', zone: '$nuscGeneralZone' }, count: { $sum: { $ifNull: ['$quantity', 1] } } } },
  ]);
  const result = {};
  for (const row of rows || []) {
    const eventId = String(row._id?.event || '');
    const zone = String(row._id?.zone || '');
    if (!eventId || !zones.includes(zone)) continue;
    result[eventId] ||= {};
    result[eventId][zone] = Number(row.count || 0);
  }
  return result;
}

function getGeneralZoneUsage(
  state,
  matchDate,
  ticketSold = 0,
  activeOrders = activeOrdersForDate(state, matchDate),
  activeSeasonOrders = activeSeasonPassOrdersForDate(state, matchDate),
  zoneSoldCounts = {}
) {
  const salesByZone = new Map(GENERAL_SEATING_AREAS.map((area) => [area.name, 0]));
  for (const sale of state.generalZoneSales || []) {
    if (sale.matchDate === matchDate && salesByZone.has(sale.zone)) {
      salesByZone.set(sale.zone, salesByZone.get(sale.zone) + Number(sale.quantity || 0));
    }
  }
  for (const area of GENERAL_SEATING_AREAS) {
    salesByZone.set(area.name, Math.max(salesByZone.get(area.name), Math.max(0, Number(zoneSoldCounts?.[area.name]) || 0)));
  }

  const heldByZone = new Map(GENERAL_SEATING_AREAS.map((area) => [area.name, 0]));
  const pendingConfirmedByZone = new Map(GENERAL_SEATING_AREAS.map((area) => [area.name, 0]));
  let unassignedHeld = 0;
  let unassignedConfirmed = 0;
  for (const order of activeOrders) {
    if (order.stockApplied) continue;
    for (const line of order.ticketLines || []) {
      if (line.ticketType !== GENERAL_TICKET_TYPE) continue;
      if (order.status === 'held' && heldByZone.has(line.zone)) {
        heldByZone.set(line.zone, heldByZone.get(line.zone) + Number(line.quantity || 0));
      } else if (order.status === 'confirmed' && pendingConfirmedByZone.has(line.zone)) {
        pendingConfirmedByZone.set(line.zone, pendingConfirmedByZone.get(line.zone) + Number(line.quantity || 0));
      } else if (order.status === 'held') {
        unassignedHeld += Number(line.quantity || 0);
      } else if (order.status === 'confirmed') {
        unassignedConfirmed += Number(line.quantity || 0);
      }
    }
  }
  for (const order of activeSeasonOrders.filter((item) => item.ticketType === GENERAL_TICKET_TYPE)) {
    if (order.status === 'held' && heldByZone.has(order.zone)) {
      heldByZone.set(order.zone, heldByZone.get(order.zone) + Number(order.quantity || 0));
    } else if (order.status === 'confirmed' && pendingConfirmedByZone.has(order.zone)) {
      pendingConfirmedByZone.set(order.zone, pendingConfirmedByZone.get(order.zone) + Number(order.quantity || 0));
    } else if (order.status === 'held') {
      unassignedHeld += Number(order.quantity || 0);
    } else if (order.status === 'confirmed') {
      unassignedConfirmed += Number(order.quantity || 0);
    }
  }

  const knownSoldByZone = new Map(GENERAL_SEATING_AREAS.map((area) => [
    area.name,
    Math.max(salesByZone.get(area.name), pendingConfirmedByZone.get(area.name)),
  ]));
  const recordedZoneSales = [...knownSoldByZone.values()].reduce((sum, quantity) => sum + quantity, 0);
  const unknownSold = Math.max(0, Number(ticketSold || 0) - recordedZoneSales - unassignedConfirmed);
  let unassignedSoldRemaining = unknownSold + unassignedConfirmed;
  let unassignedHeldRemaining = unassignedHeld;
  return GENERAL_SEATING_AREAS.map((area) => {
    const knownSold = knownSoldByZone.get(area.name);
    const knownHeld = heldByZone.get(area.name);
    const unassignedSoldHere = Math.min(unassignedSoldRemaining, Math.max(0, area.capacity - knownSold - knownHeld));
    unassignedSoldRemaining -= unassignedSoldHere;
    const unassignedHeldHere = Math.min(unassignedHeldRemaining, Math.max(0, area.capacity - knownSold - knownHeld - unassignedSoldHere));
    unassignedHeldRemaining -= unassignedHeldHere;
    const sold = knownSold + unassignedSoldHere;
    const held = knownHeld + unassignedHeldHere;
    return {
      name: area.name,
      capacity: area.capacity,
      sold,
      held,
      committed: sold + held,
    };
  });
}

function getGeneralZoneAvailability(
  state,
  matchDate,
  ticketSold = 0,
  activeOrders = activeOrdersForDate(state, matchDate),
  activeSeasonOrders = activeSeasonPassOrdersForDate(state, matchDate),
  zoneSoldCounts = {}
) {
  const zones = getGeneralZoneUsage(state, matchDate, ticketSold, activeOrders, activeSeasonOrders, zoneSoldCounts).map((area) => ({
    ...area,
    available: Math.max(0, Math.min(area.capacity, getInventoryAvailabilityLimit(state, matchDate, GENERAL_TICKET_TYPE, area.name)) - area.committed),
  }));
  const physicalAvailable = zones.reduce((sum, area) => sum + area.available, 0);
  const committedTotal = zones.reduce((sum, area) => sum + area.committed, 0);
  let capacityRemaining = Math.min(
    physicalAvailable,
    Math.max(0, getInventoryCapacity(state, matchDate, GENERAL_TICKET_TYPE) - committedTotal),
    Math.max(0, getInventoryAvailabilityLimit(state, matchDate, GENERAL_TICKET_TYPE) - committedTotal)
  );
  return zones.map((area) => {
    const available = Math.min(area.available, capacityRemaining);
    capacityRemaining -= available;
    return { ...area, available };
  });
}

function reserveMatchOrderInState(state, {
  orderId,
  userId,
  adminId,
  matchDate,
  ticketLines,
  eventTicketTypes,
  zoneSoldCounts = {},
  existingUserTicketCount = 0,
  allowSalesClosed = false,
  allowMatchSalesClosed = false,
  skipBuyerLimit = false,
}) {
  if (!TICKET_SALES_ENABLED && !allowSalesClosed) {
    throw new InventoryConflict('Tickets for NUSC home matches are not on sale yet.', 'SALES_NOT_OPEN');
  }
  const normalizedLines = normalizeTicketLines(ticketLines);
  if (!FIXTURE_DATES.includes(matchDate)) {
    throw new InventoryConflict('This NUSC match date is not available.', 'INVALID_MATCH_DATE');
  }

    const existing = state.orders.find((order) => order.orderId === orderId);
    if (existing) {
      const sameLines = JSON.stringify(existing.ticketLines) === JSON.stringify(normalizedLines);
      if (!sameLines || String(existing.userId) !== String(userId) || existing.matchDate !== matchDate) {
        throw new InventoryConflict('This checkout order already has a different ticket selection.', 'ORDER_CONFLICT');
      }
      return existing;
    }

    assertMatchOnlineSalesOpen(matchDate, allowMatchSalesClosed);

    const singleMatchQuantity = normalizedLines
      .filter((line) => normalizeTicketTypeName(line.ticketType) === normalizeTicketTypeName(SUITE_SINGLE_MATCH))
      .reduce((sum, line) => sum + line.quantity, 0);
    const fullBoxQuantity = normalizedLines
      .filter((line) => normalizeTicketTypeName(line.ticketType) === normalizeTicketTypeName(SUITE_FULL_BOX))
      .reduce((sum, line) => sum + line.quantity, 0);
    if (singleMatchQuantity > 0 || fullBoxQuantity > 0) {
      assertUnitedSuiteMappingForProduction();
    }
    if (singleMatchQuantity > 0) {
      if (adminId) {
        throw new InventoryConflict('United Suite - Single Match is available through online checkout only.', 'TICKETS_UNAVAILABLE');
      }
      if (singleMatchQuantity > 1) {
        throw new InventoryConflict('United Suite - Single Match is limited to one ticket for one match date.', 'SUITE_SINGLE_MATCH_LIMIT');
      }
      if (getSingleMatchReservedCount(state, matchDate) + singleMatchQuantity > getInventoryAvailabilityLimit(state, matchDate, SUITE_SINGLE_MATCH)) {
        throw new InventoryConflict('United Suite - Single Match is sold out.', 'TICKETS_UNAVAILABLE');
      }
    }

    const activeOrders = activeOrdersForDate(state, matchDate);
    const activeSeasonOrders = activeSeasonPassOrdersForDate(state, matchDate);
    const requestedBuyerUnits = normalizedLines.reduce((sum, line) => sum + buyerTicketUnits(line.ticketType, line.quantity), 0);
    const buyerHeldUnits = activeOrders
      .filter((order) => String(order.userId) === String(userId))
      .reduce((sum, order) => sum + (order.ticketLines || []).reduce((lineSum, line) => lineSum + buyerTicketUnits(line.ticketType, line.quantity), 0), 0);
    const seasonBuyerHeldUnits = activeSeasonOrders
      .filter((order) => String(order.userId) === String(userId))
      .reduce((sum, order) => sum + Number(order.quantity || 0), 0);

    if (!skipBuyerLimit && Number(existingUserTicketCount) + buyerHeldUnits + seasonBuyerHeldUnits + requestedBuyerUnits > BUYER_TICKET_LIMIT) {
      throw new InventoryConflict(`You can buy at most ${BUYER_TICKET_LIMIT} tickets per match, including Suite capacity.`, 'BUYER_TICKET_LIMIT');
    }

    const stockByName = new Map((eventTicketTypes || []).map((ticket) => [ticket.name, ticket]));
    const heldByTicketType = new Map();
    for (const order of activeOrders) {
      if (order.stockApplied) continue;
      for (const line of order.ticketLines || []) {
        heldByTicketType.set(line.ticketType, (heldByTicketType.get(line.ticketType) || 0) + line.quantity);
      }
    }
    for (const order of activeSeasonOrders) {
      heldByTicketType.set(order.ticketType, (heldByTicketType.get(order.ticketType) || 0) + Number(order.quantity || 0));
    }

    for (const line of normalizedLines) {
      if (normalizeTicketTypeName(line.ticketType) === normalizeTicketTypeName(SUITE_SINGLE_MATCH)) continue;
      if (line.ticketType === SUITE_SEASON) {
        throw new InventoryConflict('United Suite season bookings are handled by staff.', 'CALL_TO_BOOK');
      }
      if (isSuiteType(line.ticketType)) continue;
      const ticket = stockByName.get(line.ticketType);
      if (!ticket) throw new InventoryConflict(`Ticket type ${line.ticketType} is not configured for this match.`, 'TICKET_NOT_CONFIGURED');
      const capacity = getInventoryCapacity(state, matchDate, line.ticketType) ?? Number(ticket.quantity || 0);
      const availabilityLimit = getInventoryAvailabilityLimit(state, matchDate, line.ticketType);
      const available = Math.max(0, Math.min(capacity, availabilityLimit) - Number(ticket.sold || 0) - (heldByTicketType.get(line.ticketType) || 0));
      if (line.quantity > available) {
        throw new InventoryConflict(`Only ${available} ${line.ticketType} ticket(s) remain for this match.`, 'TICKETS_UNAVAILABLE');
      }
    }

    const generalTicket = stockByName.get(GENERAL_TICKET_TYPE);
    const zoneAvailability = new Map(getGeneralZoneAvailability(
      state,
      matchDate,
      generalTicket?.sold || 0,
      activeOrders,
      activeSeasonOrders,
      zoneSoldCounts
    ).map((area) => [area.name, area.available]));
    for (const line of normalizedLines.filter((item) => item.ticketType === GENERAL_TICKET_TYPE)) {
      const available = zoneAvailability.get(line.zone) || 0;
      if (line.quantity > available) {
        throw new InventoryConflict(`Only ${available} seat(s) remain in ${line.zone} for this match.`, 'GENERAL_ZONE_UNAVAILABLE');
      }
      zoneAvailability.set(line.zone, available - line.quantity);
    }

    const seasonBoxes = new Set(state.seasonReservations
      .filter((reservation) => reservation.status === 'active')
      .map((reservation) => reservation.boxNumber));
    const activeAllocations = activeOrders.flatMap((order) => order.suiteAllocations || []);
    const allocationByBox = new Map();
    for (let boxNumber = 1; boxNumber <= BOX_COUNT; boxNumber += 1) {
      allocationByBox.set(boxNumber, activeAllocations.filter((allocation) => allocation.boxNumber === boxNumber));
    }

    const suiteAllocations = [];
    let ticketIndex = 1;
    const linesWithIndex = normalizedLines.map((line) => {
      const indexed = { ...line, startIndex: ticketIndex };
      ticketIndex += line.quantity;
      return indexed;
    });

    const suiteAvailability = getSuiteAvailability(state, matchDate);
    const requestedFullBoxes = linesWithIndex
      .filter((item) => item.ticketType === SUITE_FULL_BOX)
      .reduce((sum, line) => sum + line.quantity, 0);
    if (requestedFullBoxes > suiteAvailability.fullBoxes) {
      throw new InventoryConflict(`Only ${suiteAvailability.fullBoxes} United Suite full box(es) remain for this match.`, 'SUITE_BOXES_UNAVAILABLE');
    }

    for (const line of linesWithIndex.filter((item) => item.ticketType === SUITE_FULL_BOX)) {
      for (let i = 0; i < line.quantity; i += 1) {
        const boxNumber = FULL_BOX_NUMBERS.find((candidate) => {
          const allocations = allocationByBox.get(candidate) || [];
          return !seasonBoxes.has(candidate) && allocations.length === 0;
        });
        if (!boxNumber) throw new InventoryConflict('No full United Suite boxes remain for this match.', 'SUITE_BOXES_UNAVAILABLE');
        const allocation = createSuiteAllocation(SUITE_FULL_BOX, line.startIndex + i, boxNumber);
        suiteAllocations.push(allocation);
        allocationByBox.get(boxNumber).push(allocation);
      }
    }

    for (const line of linesWithIndex.filter((item) => normalizeTicketTypeName(item.ticketType) === normalizeTicketTypeName(SUITE_SINGLE_MATCH))) {
      if (line.quantity > suiteAvailability.singleMatchBoxes) {
        throw new InventoryConflict(`Only ${suiteAvailability.singleMatchBoxes} United Suite Single Match box(es) remain for this match.`, 'SUITE_BOXES_UNAVAILABLE');
      }
      for (let i = 0; i < line.quantity; i += 1) {
        const boxNumber = SINGLE_MATCH_BOX_NUMBERS.find((candidate) => {
          const allocations = allocationByBox.get(candidate) || [];
          return !seasonBoxes.has(candidate) && allocations.length === 0;
        });
        if (!boxNumber) throw new InventoryConflict('No United Suite Single Match boxes remain for this match.', 'SUITE_BOXES_UNAVAILABLE');
        const allocation = createSuiteAllocation(SUITE_SINGLE_MATCH, line.startIndex + i, boxNumber);
        suiteAllocations.push(allocation);
        allocationByBox.get(boxNumber).push(allocation);
      }
    }

    for (const line of linesWithIndex.filter((item) => item.ticketType === SUITE_SINGLE)) {
      for (let i = 0; i < line.quantity; i += 1) {
        const allocations = allocationByBox.get(SINGLE_PASS_BOX_NUMBER) || [];
        const allocatedSingleSeats = allocations.filter((allocation) => allocation.ticketType === SUITE_SINGLE).length;
        const offlineReservedSeats = getOfflineReservedSinglePassSeats(state, matchDate);
        if (seasonBoxes.has(SINGLE_PASS_BOX_NUMBER) || allocations.some((allocation) => allocation.ticketType === SUITE_FULL_BOX) ||
            allocatedSingleSeats + offlineReservedSeats >= suiteAvailability.singlePassCapacity) {
          throw new InventoryConflict('No United Suite seats remain in the single-pass box for this match.', 'SUITE_SEATS_UNAVAILABLE');
        }
        const allocation = createSuiteAllocation(SUITE_SINGLE, line.startIndex + i, SINGLE_PASS_BOX_NUMBER);
        suiteAllocations.push(allocation);
        allocationByBox.get(SINGLE_PASS_BOX_NUMBER).push(allocation);
      }
    }

    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
    const order = {
      orderId,
      ...(userId ? { userId } : {}),
      ...(adminId ? { createdByAdmin: adminId } : {}),
      matchDate,
      ticketLines: normalizedLines,
      suiteAllocations,
      status: 'held',
      expiresAt,
      stockApplied: false,
      createdAt: new Date(),
    };
    state.orders.push(order);
    return order;
}

async function reserveMatchOrder(args) {
  return mutateInventory((state) => reserveMatchOrderInState(state, {
    ...args,
    matchDate: normalizeMatchDate(args.matchDate),
  }));
}

async function recordOnSpotMatchSale({ saleId, adminId, matchDate, ticketLines, eventTicketTypes }, session) {
  if (!saleId || !adminId) throw new InventoryConflict('On-spot inventory sale details are invalid.', 'INVALID_ON_SPOT_SALE');
  matchDate = normalizeMatchDate(matchDate);

  const normalizedLines = normalizeTicketLines(ticketLines);
  return mutateInventory((state) => {
    const order = reserveMatchOrderInState(state, {
      orderId: saleId,
      adminId,
      matchDate,
      ticketLines: normalizedLines,
      eventTicketTypes,
      existingUserTicketCount: 0,
      allowSalesClosed: true,
      allowMatchSalesClosed: true,
      skipBuyerLimit: true,
    });

    for (const line of normalizedLines) {
      if (line.ticketType !== GENERAL_TICKET_TYPE || !line.zone) continue;
      const existingSale = state.generalZoneSales.find((sale) => (
        sale.orderId === saleId && sale.matchDate === matchDate && sale.zone === line.zone
      ));
      if (!existingSale) {
        state.generalZoneSales.push({
          orderId: saleId,
          matchDate,
          zone: line.zone,
          quantity: line.quantity,
        });
      }
    }

    const suiteAllocations = (order.suiteAllocations || []).map((allocation) => ({
      ticketType: allocation.ticketType,
      ticketIndex: allocation.ticketIndex,
      boxNumber: allocation.boxNumber,
    }));
    if (suiteAllocations.length) {
      order.status = 'confirmed';
      order.stockApplied = true;
      order.ticketLines = [];
    } else {
      state.orders = state.orders.filter((item) => item.orderId !== saleId);
    }

    return { suiteAllocations };
  }, session);
}

async function reserveMultiMatchOrder({ orderId, userId, matches, allowSalesClosed = false, allowMatchSalesClosed = false, skipBuyerLimit = false }) {
  if (!TICKET_SALES_ENABLED && !allowSalesClosed) {
    throw new InventoryConflict('Tickets for NUSC home matches are not on sale yet.', 'SALES_NOT_OPEN');
  }
  const normalizedMatches = Array.isArray(matches)
    ? matches.map((match) => ({ ...match, matchDate: normalizeMatchDate(match.matchDate) }))
    : matches;
  if (!Array.isArray(normalizedMatches) || normalizedMatches.length < 2 || normalizedMatches.length > FIXTURE_DATES.length ||
      new Set(normalizedMatches.map((match) => match.matchDate)).size !== normalizedMatches.length ||
      normalizedMatches.some((match) => !FIXTURE_DATES.includes(match.matchDate))) {
    throw new InventoryConflict('Select at least two valid NUSC match dates.', 'INVALID_MATCH_DATE');
  }
  if (normalizedMatches.some((match) => (match.ticketLines || []).some((line) => line.ticketType === SUITE_FULL_BOX))) {
    throw new InventoryConflict('United Suite — Full Box orders must cover one match date. Place a separate order for each date.', 'FULL_BOX_SINGLE_DATE');
  }
  if (normalizedMatches.some((match) => (match.ticketLines || []).some((line) => (
    normalizeTicketTypeName(line.ticketType) === normalizeTicketTypeName(SUITE_SINGLE_MATCH)
  )))) {
    throw new InventoryConflict('United Suite - Single Match orders must cover one match date.', 'SUITE_SINGLE_MATCH_LIMIT');
  }
  return mutateInventory((state) => normalizedMatches.map((match) => reserveMatchOrderInState(state, {
    orderId: `${orderId}|${match.matchDate}`,
    userId,
    matchDate: match.matchDate,
    ticketLines: match.ticketLines,
    eventTicketTypes: match.eventTicketTypes,
    zoneSoldCounts: match.zoneSoldCounts || {},
    existingUserTicketCount: match.existingUserTicketCount || 0,
    allowSalesClosed: true,
    allowMatchSalesClosed,
    skipBuyerLimit,
  })));
}

async function confirmMultiMatchOrder(orderId, matchDates) {
  return mutateInventory((state) => {
    const holds = matchDates.map((matchDate) => state.orders.find((item) => item.orderId === `${orderId}|${matchDate}`));
    if (holds.some((hold) => !hold)) throw new InventoryConflict('One or more ticket holds expired. Contact support if payment was captured.', 'HOLD_EXPIRED');
    if (holds.some((hold) => hold.status !== 'confirmed' && new Date(hold.expiresAt) <= new Date())) {
      throw new InventoryConflict('One or more ticket holds expired. Contact support if payment was captured.', 'HOLD_EXPIRED');
    }
    for (const hold of holds) hold.status = 'confirmed';
    return holds;
  });
}

async function releaseMultiMatchOrder(orderId) {
  return mutateInventory((state) => {
    const holds = state.orders.filter((item) => item.orderId.startsWith(`${orderId}|`));
    if (holds.some((hold) => hold.status === 'confirmed')) return holds;
    state.orders = state.orders.filter((item) => !item.orderId.startsWith(`${orderId}|`));
    return holds;
  });
}

async function finalizeMultiMatchOrder(orderId, matchDates) {
  return mutateInventory((state) => {
    const holds = matchDates.map((matchDate) => state.orders.find((item) => item.orderId === `${orderId}|${matchDate}`));
    if (holds.some((hold) => !hold)) return null;
    for (const hold of holds) {
      for (const line of hold.ticketLines || []) {
        if (line.ticketType !== GENERAL_TICKET_TYPE || !line.zone) continue;
        const existingSale = state.generalZoneSales.find((sale) => sale.orderId === hold.orderId && sale.matchDate === hold.matchDate && sale.zone === line.zone);
        if (!existingSale) state.generalZoneSales.push({ orderId: hold.orderId, matchDate: hold.matchDate, zone: line.zone, quantity: line.quantity });
      }
      hold.stockApplied = true;
      hold.ticketLines = [];
    }
    state.orders = state.orders.filter((hold) => holds.includes(hold) && hold.suiteAllocations?.length || !holds.includes(hold));
    return holds;
  });
}

async function reserveSeasonPassOrder({ orderId, userId, ticketType, quantity, zone = '', matches, existingUserTicketCountByDate = {}, allowSalesClosed = false, allowMatchSalesClosed = false, skipBuyerLimit = false }) {
  if (!TICKET_SALES_ENABLED && !allowSalesClosed) {
    throw new InventoryConflict('Tickets for NUSC home matches are not on sale yet.', 'SALES_NOT_OPEN');
  }
  const normalizedQuantity = Number(quantity);
  const normalizedZone = zone == null ? '' : String(zone).trim();
  if (!SEASON_PASS_TICKET_TYPES.includes(ticketType) || !Number.isInteger(normalizedQuantity) || normalizedQuantity < 1 || normalizedQuantity > BUYER_TICKET_LIMIT) {
    throw new InventoryConflict('Season pass selection is invalid.', 'INVALID_TICKETS');
  }
  if (ticketType === GENERAL_TICKET_TYPE && !GENERAL_SEATING_AREAS.some((area) => area.name === normalizedZone)) {
    throw new InventoryConflict('Choose a General seating zone before checkout.', 'GENERAL_ZONE_REQUIRED');
  }
  if (ticketType !== GENERAL_TICKET_TYPE && normalizedZone) {
    throw new InventoryConflict('A seating zone can only be selected for General Season Pass tickets.', 'INVALID_GENERAL_ZONE');
  }
  if (!Array.isArray(matches) || matches.length !== FIXTURE_DATES.length ||
      new Set(matches.map((match) => match.matchDate)).size !== FIXTURE_DATES.length ||
      FIXTURE_DATES.some((date) => !matches.some((match) => match.matchDate === date))) {
    throw new InventoryConflict('All 10 NUSC home fixtures must be available for a season pass.', 'INVALID_MATCH_DATE');
  }

  return mutateInventory((state) => {
    const existing = state.seasonPassOrders.find((order) => order.orderId === orderId);
    if (existing) {
      const sameDates = JSON.stringify(existing.matchDates) === JSON.stringify(FIXTURE_DATES);
      if (!sameDates || existing.ticketType !== ticketType || Number(existing.quantity) !== normalizedQuantity || String(existing.userId) !== String(userId) || String(existing.zone || '') !== normalizedZone) {
        throw new InventoryConflict('This season checkout already has a different pass selection.', 'ORDER_CONFLICT');
      }
      return existing;
    }

    const venueOnlyMatch = matches.find((match) => isVenueOnlyMatchDate(match.matchDate));
    if (venueOnlyMatch) assertMatchOnlineSalesOpen(venueOnlyMatch.matchDate, allowMatchSalesClosed);

    const quota = getSeasonPassQuotaUsage(state, ticketType);
    const seasonPassAvailability = getInventoryAvailabilityLimit(state, null, `${ticketType === GENERAL_TICKET_TYPE ? 'General' : 'Premium'} Season Pass`);
    const seasonPassAvailable = Math.max(0, Math.min(getSeasonPassCapacity(state, ticketType), seasonPassAvailability) - quota.used);
    if (normalizedQuantity > seasonPassAvailable) {
      throw new InventoryConflict(`Only ${seasonPassAvailable} ${ticketType} season pass(es) remain for the season.`, 'SEASON_PASS_LIMIT_REACHED');
    }

    for (const match of matches) {
      const activeOrders = activeOrdersForDate(state, match.matchDate);
      const activeSeasonOrders = activeSeasonPassOrdersForDate(state, match.matchDate);
      const userMatchHolds = activeOrders
        .filter((order) => String(order.userId) === String(userId))
        .reduce((sum, order) => sum + (order.ticketLines || []).reduce((lineSum, line) => lineSum + buyerTicketUnits(line.ticketType, line.quantity), 0), 0);
      const userSeasonHolds = activeSeasonOrders
        .filter((order) => String(order.userId) === String(userId))
        .reduce((sum, order) => sum + Number(order.quantity || 0), 0);
      if (!skipBuyerLimit && Number(existingUserTicketCountByDate[match.matchDate] || 0) + userMatchHolds + userSeasonHolds + normalizedQuantity > BUYER_TICKET_LIMIT) {
        throw new InventoryConflict(`You can buy at most ${BUYER_TICKET_LIMIT} tickets for ${match.matchDate}, including season passes.`, 'BUYER_TICKET_LIMIT');
      }

      const ticket = (match.ticketTypes || []).find((item) => item.name === ticketType);
      if (!ticket) throw new InventoryConflict(`${ticketType} is not configured for every home match.`, 'TICKET_NOT_CONFIGURED');
      const capacity = getInventoryCapacity(state, match.matchDate, ticketType) ?? Number(ticket.quantity || 0);
      const matchHeld = activeOrders.reduce((sum, order) => order.stockApplied ? sum : sum + (order.ticketLines || [])
        .filter((line) => line.ticketType === ticketType)
        .reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0), 0);
      const seasonHeld = activeSeasonOrders
        .filter((order) => order.ticketType === ticketType)
        .reduce((sum, order) => sum + Number(order.quantity || 0), 0);
      const available = Math.max(0, Math.min(capacity, getInventoryAvailabilityLimit(state, match.matchDate, ticketType)) - Number(ticket.sold || 0) - matchHeld - seasonHeld);
      if (normalizedQuantity > available) {
        throw new InventoryConflict(`Only ${available} ${ticketType} season pass(es) remain across all fixtures.`, 'TICKETS_UNAVAILABLE');
      }
      if (ticketType === GENERAL_TICKET_TYPE) {
        const zoneAvailability = getGeneralZoneAvailability(state, match.matchDate, ticket.sold || 0, activeOrders, activeSeasonOrders, match.zoneSoldCounts || {})
          .find((area) => area.name === normalizedZone)?.available || 0;
        if (normalizedQuantity > zoneAvailability) {
          throw new InventoryConflict(`Only ${zoneAvailability} seat(s) remain in ${normalizedZone} across all home matches.`, 'GENERAL_ZONE_UNAVAILABLE');
        }
      }
    }

    const hold = {
      orderId,
      userId,
      ticketType,
      quantity: normalizedQuantity,
      ...(normalizedZone && { zone: normalizedZone }),
      matchDates: FIXTURE_DATES,
      status: 'held',
      expiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
      createdAt: new Date(),
    };
    state.seasonPassOrders.push(hold);
    return hold;
  });
}

async function reacquirePartnerReplacementInventory({ orderId, paymentId, matchDates, matches }) {
  if (!orderId || !paymentId || !Array.isArray(matchDates) || !matchDates.length ||
      new Set(matchDates).size !== matchDates.length ||
      matchDates.some((date) => !FIXTURE_DATES.includes(date)) ||
      !Array.isArray(matches) || matches.length !== matchDates.length ||
      matches.some((match) => !matchDates.includes(match.matchDate))) {
    throw new InventoryConflict('Premium replacement inventory request is invalid.', 'INVALID_REPLACEMENT_INVENTORY');
  }

  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === orderId);
    if (!reservation || reservation.passId !== 'premium-season' || reservation.ticketType !== 'Premium Pass') {
      throw new InventoryConflict('Premium replacement reservation was not found.', 'RESERVATION_NOT_FOUND');
    }
    if (reservation.paymentId && reservation.paymentId !== paymentId) {
      throw new InventoryConflict('This Premium reservation is already tied to another payment.', 'PAYMENT_CONFLICT');
    }
    if (['issuing', 'issued'].includes(reservation.status) &&
        reservation.replacesReservationId && reservation.paymentId === paymentId) {
      return { alreadyReplacing: true, matchDates: reservation.replacementMatchIndices.map((index) => reservation.matchDates[index - 1]) };
    }
    if (!['held', 'expired'].includes(reservation.status)) {
      throw new InventoryConflict('Premium replacement reservation is no longer available.', 'RESERVATION_NOT_ACTIVE');
    }
    if ((state.partnerSeasonPassReservations || []).some((item) => (
      item.reservationId !== orderId && item.paymentId === paymentId
    ))) {
      throw new InventoryConflict('This payment has already been used for another season pass.', 'PAYMENT_ALREADY_USED');
    }

    const existing = (state.seasonPassOrders || []).find((item) => item.orderId === orderId);
    if (existing && (
      existing.status !== 'held' || existing.ticketType !== 'Premium Pass' ||
      Number(existing.quantity) !== 1 || String(existing.userId) !== String(reservation.memberReferenceHash.slice(0, 24))
    )) {
      throw new InventoryConflict('Premium replacement hold conflicts with the reservation.', 'ORDER_CONFLICT');
    }

    const quota = getSeasonPassQuotaUsage(state, 'Premium Pass');
    if (!quota.orderIds.has(orderId) && quota.used + 1 > getSeasonPassCapacity(state, 'Premium Pass')) {
      throw new InventoryConflict('No Premium Season Passes remain for the season.', 'SEASON_PASS_LIMIT_REACHED');
    }

    for (const match of matches) {
      const ticket = (match.ticketTypes || []).find((item) => item.name === 'Premium Pass');
      if (!ticket) throw new InventoryConflict('Premium Pass is not configured for every remaining match.', 'TICKET_NOT_CONFIGURED');
      const capacity = getInventoryCapacity(state, match.matchDate, 'Premium Pass') ?? Number(ticket.quantity || 0);
      const activeOrders = activeOrdersForDate(state, match.matchDate);
      const activeSeasonOrders = activeSeasonPassOrdersForDate(state, match.matchDate)
        .filter((item) => item.orderId !== orderId);
      const matchHeld = activeOrders.reduce((sum, item) => item.stockApplied ? sum : sum + (item.ticketLines || [])
        .filter((line) => line.ticketType === 'Premium Pass')
        .reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0), 0);
      const seasonHeld = activeSeasonOrders
        .filter((item) => item.ticketType === 'Premium Pass')
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const available = Math.max(0, capacity - Number(ticket.sold || 0) - matchHeld - seasonHeld);
      if (available < 1) {
        throw new InventoryConflict(`Premium Pass inventory is unavailable for ${match.matchDate}.`, 'PREMIUM_INVENTORY_UNAVAILABLE');
      }
    }

    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
    if (existing) {
      existing.matchDates = [...matchDates];
      existing.expiresAt = expiresAt;
    } else {
      state.seasonPassOrders.push({
        orderId,
        userId: reservation.memberReferenceHash.slice(0, 24),
        ticketType: 'Premium Pass',
        quantity: 1,
        matchDates: [...matchDates],
        status: 'held',
        expiresAt,
        createdAt: new Date(),
      });
    }
    reservation.status = 'held';
    reservation.expiresAt = expiresAt;
    reservation.paymentId = paymentId;
    return { expiresAt, matchDates: [...matchDates] };
  });
}

async function beginPartnerMissingTicketRecovery({ orderId, oldReservationId, paymentId, matchIndices, missingMatchIndices = matchIndices, matchDates, matches }) {
  if (!orderId || !oldReservationId || !paymentId || !Array.isArray(matchIndices) ||
      !Array.isArray(missingMatchIndices) ||
      !Array.isArray(matchDates) || !Array.isArray(matches) || matchDates.length !== matches.length ||
      new Set(matchIndices).size !== matchIndices.length ||
      new Set(missingMatchIndices).size !== missingMatchIndices.length ||
      matchIndices.some((index) => !Number.isInteger(index) || index < 1 || index > 10) ||
      missingMatchIndices.some((index) => !matchIndices.includes(index)) ||
      matchDates.length !== missingMatchIndices.length ||
      matchDates.some((date) => !FIXTURE_DATES.includes(date)) ||
      matches.some((match) => !matchDates.includes(match.matchDate))) {
    throw new InventoryConflict('Premium recovery request is invalid.', 'INVALID_RECOVERY_REQUEST');
  }

  return mutateInventory(async (state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === orderId);
    const oldReservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === oldReservationId);
    if (!reservation || reservation.passId !== 'premium-season' || reservation.ticketType !== 'Premium Pass') {
      throw new InventoryConflict('Premium reservation was not found.', 'RESERVATION_NOT_FOUND');
    }
    if (reservation.adminTicketRecovery?.status === 'processing') {
      throw new InventoryConflict('Another Admin ticket operation is in progress for this Premium entitlement.', 'RECOVERY_IN_PROGRESS');
    }
    if (!oldReservation || oldReservation.status !== 'replaced' || oldReservation.passId !== 'general-season' ||
        oldReservation.replacedByReservationId !== orderId ||
        String(oldReservation.memberReferenceHash) !== String(reservation.memberReferenceHash) ||
        reservation.status !== 'issued' || reservation.replacesReservationId !== oldReservationId ||
        reservation.paymentId !== paymentId ||
        oldReservation.eventIds?.length !== 10 || oldReservation.matchDates?.length !== 10 ||
        reservation.eventIds?.length !== 10 || reservation.matchDates?.length !== 10 ||
        oldReservation.eventIds?.some((id, index) => String(id) !== String(reservation.eventIds[index])) ||
        oldReservation.matchDates?.some((date, index) => date !== reservation.matchDates[index])) {
      throw new InventoryConflict('Premium replacement does not match the paid issued reservation.', 'RECOVERY_RESERVATION_MISMATCH');
    }
    if ((state.partnerSeasonPassReservations || []).some((item) => item.reservationId !== orderId && item.paymentId === paymentId)) {
      throw new InventoryConflict('This NUSC payment is already attached to another reservation.', 'PAYMENT_ALREADY_USED');
    }
    const existingIndices = (reservation.recoveryMatchIndices || []).map(Number);
    if (reservation.recoveryStatus === 'issued' &&
        (existingIndices.length !== matchIndices.length || existingIndices.some((value, index) => value !== matchIndices[index]))) {
      throw new InventoryConflict('A different recovery is already recorded for this replacement.', 'RECOVERY_CONFLICT');
    }
    if (reservation.recoveryStatus === 'issued') {
      if (missingMatchIndices.length) {
        throw new InventoryConflict('The completed recovery no longer matches its ticket records.', 'RECOVERY_TICKET_SET_INCOMPLETE');
      }
      return { alreadyIssued: true, recoveryMatchIndices: existingIndices };
    }
    if (reservation.recoveryStatus === 'issuing' &&
        (existingIndices.length !== matchIndices.length || existingIndices.some((value, index) => value !== matchIndices[index]))) {
      throw new InventoryConflict('A different recovery is already in progress.', 'RECOVERY_CONFLICT');
    }
    if (reservation.recoveryStatus !== 'issuing') {
      reservation.recoveryStatus = 'issuing';
      reservation.recoveryMatchIndices = [...matchIndices];
      reservation.recoveryBookingIds = [];
    }

    const recoveryHoldId = `nusc-recovery:${orderId}`;
    const existingHold = (state.seasonPassOrders || []).find((item) => item.orderId === recoveryHoldId);
    if (matchDates.length) {
      for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index];
        const matchIndex = missingMatchIndices[index];
        if (match.matchDate !== reservation.matchDates[matchIndex - 1] ||
            String(match.eventId || '') !== String(reservation.eventIds?.[matchIndex - 1] || '')) {
          throw new InventoryConflict('Premium recovery fixture metadata does not match the issued reservation.', 'RECOVERY_FIXTURE_MISMATCH');
        }
        const ticket = (match.ticketTypes || []).find((item) => item.name === 'Premium Pass');
        if (!ticket) throw new InventoryConflict('Premium Pass is not configured for a recovery match.', 'TICKET_NOT_CONFIGURED');
        const capacity = getInventoryCapacity(state, match.matchDate, 'Premium Pass') ?? Number(ticket.quantity || 0);
        const sold = Number(ticket.sold || 0);
        const liveSold = await Booking.countDocuments({
          event: reservation.eventIds[matchIndex - 1],
          ticketType: 'Premium Pass',
          bookingSource: { $ne: 'on-spot' },
          status: { $in: ['confirmed', 'checked-in'] },
          paymentStatus: 'completed',
        });
        // A missing replacement booking may be restored without taking a second
        // seat only when the event sold counter still includes that exact ticket.
        if (!Number.isInteger(sold) || sold - liveSold !== 1) {
          const error = new InventoryConflict('The prior Premium seat allocation cannot be reconciled with current bookings.', 'RECOVERY_INVENTORY_RECONCILIATION_REQUIRED');
          error.matchDate = match.matchDate;
          throw error;
        }
        const activeOrders = activeOrdersForDate(state, match.matchDate);
        const otherSeasonOrders = activeSeasonPassOrdersForDate(state, match.matchDate)
          .filter((item) => item.orderId !== recoveryHoldId);
        const matchHeld = activeOrders.reduce((sum, item) => item.stockApplied ? sum : sum + (item.ticketLines || [])
          .filter((line) => line.ticketType === 'Premium Pass')
          .reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0), 0);
        const seasonHeld = otherSeasonOrders
          .filter((item) => item.ticketType === 'Premium Pass')
          .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        if (capacity - sold - matchHeld - seasonHeld < 0) {
          const error = new InventoryConflict(`Premium Pass inventory is unavailable for ${match.matchDate}.`, 'PREMIUM_INVENTORY_UNAVAILABLE');
          error.matchDate = match.matchDate;
          throw error;
        }
      }
      const hold = existingHold || {
        orderId: recoveryHoldId,
        userId: reservation.memberReferenceHash.slice(0, 24),
        ticketType: 'Premium Pass',
        quantity: 1,
        status: 'held',
        createdAt: new Date(),
      };
      hold.matchDates = [...matchDates];
      hold.expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
      hold.status = 'held';
      if (!existingHold) state.seasonPassOrders.push(hold);
    }
    return { alreadyIssued: false, recoveryMatchIndices: [...reservation.recoveryMatchIndices] };
  });
}

async function completePartnerMissingTicketRecovery(orderId, oldReservationId, recoveryBookingIds, allBookingIds, matchIndices, retainedUsedTicketCount, cancelledUnusedTicketCount) {
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === orderId);
    const oldReservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === oldReservationId);
    if (!reservation || !oldReservation || oldReservation.status !== 'replaced' ||
        oldReservation.replacedByReservationId !== orderId || reservation.status !== 'issued' ||
        reservation.replacesReservationId !== oldReservationId || !reservation.paymentId ||
        String(oldReservation.memberReferenceHash) !== String(reservation.memberReferenceHash) ||
        oldReservation.eventIds?.length !== 10 || reservation.eventIds?.length !== 10 ||
        oldReservation.eventIds.some((id, index) => String(id) !== String(reservation.eventIds[index])) ||
        oldReservation.matchDates?.length !== 10 || reservation.matchDates?.length !== 10 ||
        oldReservation.matchDates.some((date, index) => date !== reservation.matchDates[index])) {
      throw new InventoryConflict('Premium recovery is not in progress.', 'RECOVERY_NOT_IN_PROGRESS');
    }
    const expected = (reservation.recoveryMatchIndices || []).map(Number);
    if (expected.length !== matchIndices.length || expected.some((index, position) => index !== matchIndices[position]) ||
        recoveryBookingIds.length !== expected.length || allBookingIds.length !== 10 ||
        new Set(allBookingIds.map(String)).size !== 10) {
      throw new InventoryConflict('Premium recovery ticket set is incomplete.', 'RECOVERY_TICKET_SET_INCOMPLETE');
    }
    if (reservation.recoveryStatus === 'issued') return reservation;
    if (reservation.recoveryStatus !== 'issuing') throw new InventoryConflict('Premium recovery is not in progress.', 'RECOVERY_NOT_IN_PROGRESS');
    const recoveryHoldId = `nusc-recovery:${orderId}`;
    state.seasonPassOrders = (state.seasonPassOrders || []).filter((item) => item.orderId !== recoveryHoldId);
    reservation.recoveryBookingIds = [...recoveryBookingIds];
    reservation.bookingIds = [...allBookingIds];
    reservation.replacementMatchIndices = [...new Set([...(reservation.replacementMatchIndices || []), ...matchIndices])].sort((a, b) => a - b);
    reservation.replacementUsedTicketCount = retainedUsedTicketCount;
    reservation.replacementCancelledTicketCount = cancelledUnusedTicketCount;
    reservation.recoveryStatus = 'issued';
    return reservation;
  });
}

async function confirmSeasonPassOrder(orderId) {
  return mutateInventory((state) => {
    const order = (state.seasonPassOrders || []).find((item) => item.orderId === orderId);
    if (!order) throw new InventoryConflict('This season pass hold expired. Contact support if payment was captured.', 'HOLD_EXPIRED');
    if (order.status === 'confirmed') return order;
    if (new Date(order.expiresAt) <= new Date()) {
      throw new InventoryConflict('This season pass hold expired. Contact support if payment was captured.', 'HOLD_EXPIRED');
    }
    order.status = 'confirmed';
    return order;
  });
}

async function releaseSeasonPassOrder(orderId) {
  return mutateInventory((state) => {
    const order = (state.seasonPassOrders || []).find((item) => item.orderId === orderId);
    if (!order || order.status === 'confirmed') return order || null;
    state.seasonPassOrders = state.seasonPassOrders.filter((item) => item.orderId !== orderId);
    return order;
  });
}

async function recordPartnerSeasonPassReservation(reservation) {
  return mutateInventory((state) => {
    const existing = (state.partnerSeasonPassReservations || []).find((item) =>
      item.reservationId === reservation.reservationId || item.partnerOrderId === reservation.partnerOrderId
    );
    if (existing) {
      const same = existing.reservationId === reservation.reservationId &&
        existing.memberReferenceHash === reservation.memberReferenceHash &&
        existing.passId === reservation.passId && existing.zone === reservation.zone;
      if (!same) throw new InventoryConflict('This NUSC order already has a different pass reservation.', 'ORDER_CONFLICT');
      return existing;
    }
    state.partnerSeasonPassReservations.push(reservation);
    return reservation;
  });
}

async function getPartnerSeasonPassReservation(reservationId) {
  const projection = { partnerSeasonPassReservations: 1 };
  const state = (await loadInventory(null, projection)) || await ensureInventory(null, projection);
  return (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId) || null;
}

async function beginPartnerAdminTicketRecovery({ reservationId, requestId, adminId }) {
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    if (!reservation) throw new InventoryConflict('NUSC season pass reservation was not found.', 'RESERVATION_NOT_FOUND');
    if (reservation.status !== 'issued' || !reservation.paymentId || reservation.replacesReservationId || reservation.replacedByReservationId) {
      throw new InventoryConflict('This pass is not eligible for automatic ticket recovery.', 'RECOVERY_REQUIRES_REVIEW');
    }
    const current = reservation.adminTicketRecovery || {};
    if (current.status === 'completed' && current.requestId === requestId) {
      return { reservation, alreadyCompleted: true };
    }
    if (current.status === 'processing' && current.requestId !== requestId &&
        Date.now() - new Date(current.startedAt || 0).getTime() < 5 * 60 * 1000) {
      throw new InventoryConflict('Ticket recovery is already in progress for this pass.', 'RECOVERY_IN_PROGRESS');
    }
    if (current.status === 'processing' && current.requestId === requestId) {
      return { reservation, alreadyProcessing: true };
    }
    reservation.adminTicketRecovery = {
      requestId,
      status: 'processing',
      startedAt: new Date(),
      completedAt: null,
      recoveredMatchIndices: [],
      relinkedMatchIndices: [],
      admin: adminId,
    };
    return { reservation, alreadyProcessing: false };
  }, undefined, { pruneExpired: false });
}

async function completePartnerAdminTicketRecovery({
  reservationId,
  requestId,
  adminId,
  bookingIds,
  recoveredMatchIndices = [],
  relinkedMatchIndices = [],
  manualIntervention = false,
}) {
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    if (!reservation || reservation.status !== 'issued') {
      throw new InventoryConflict('The issued pass changed during recovery.', 'RECOVERY_STATE_CHANGED');
    }
    const recovery = reservation.adminTicketRecovery || {};
    if (recovery.requestId !== requestId || recovery.status !== 'processing') {
      throw new InventoryConflict('Ticket recovery changed during processing.', 'RECOVERY_STATE_CHANGED');
    }
    if (!manualIntervention && (!Array.isArray(bookingIds) || bookingIds.length !== FIXTURE_DATES.length ||
        new Set(bookingIds.map(String)).size !== FIXTURE_DATES.length)) {
      throw new InventoryConflict('The recovered ticket set is incomplete.', 'RECOVERY_TICKET_SET_INCOMPLETE');
    }
    if (!manualIntervention) reservation.bookingIds = bookingIds;
    reservation.adminTicketRecovery = {
      requestId,
      status: manualIntervention ? 'manual_intervention' : 'completed',
      startedAt: recovery.startedAt || new Date(),
      completedAt: new Date(),
      recoveredMatchIndices: [...recoveredMatchIndices],
      relinkedMatchIndices: [...relinkedMatchIndices],
      admin: adminId,
    };
    reservation.adminTicketRecoveryAudit ||= [];
    reservation.adminTicketRecoveryAudit.push({
      requestId,
      admin: adminId,
      action: manualIntervention ? 'manual_intervention' : 'recovered',
      at: new Date(),
      details: {
        recoveredMatchIndices: [...recoveredMatchIndices],
        relinkedMatchIndices: [...relinkedMatchIndices],
      },
    });
    return reservation;
  }, undefined, { pruneExpired: false });
}

async function recordPartnerAdminTicketRecoveryProgress({ reservationId, requestId, recoveredMatchIndices = [], relinkedMatchIndices = [] }) {
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    const recovery = reservation?.adminTicketRecovery || {};
    if (!reservation || recovery.requestId !== requestId || recovery.status !== 'processing') {
      throw new InventoryConflict('Ticket recovery changed during processing.', 'RECOVERY_STATE_CHANGED');
    }
    recovery.recoveredMatchIndices = [...new Set([...(recovery.recoveredMatchIndices || []), ...recoveredMatchIndices])].sort((a, b) => a - b);
    recovery.relinkedMatchIndices = [...new Set([...(recovery.relinkedMatchIndices || []), ...relinkedMatchIndices])].sort((a, b) => a - b);
    reservation.adminTicketRecovery = recovery;
    return reservation;
  }, undefined, { pruneExpired: false });
}

async function claimPartnerSeasonPassReissue({ reservationId, requestId, adminId }) {
  if (!reservationId || !requestId || !adminId) {
    throw new InventoryConflict('Partner ticket reissue claim details are incomplete.', 'INVALID_REISSUE_CLAIM');
  }
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    if (!reservation) return { claimed: false, code: 'RESERVATION_NOT_FOUND' };
    const supportedPass = (reservation.passId === 'premium-season' && reservation.ticketType === 'Premium Pass') ||
      (reservation.passId === 'general-season' && reservation.ticketType === 'General Pass');
    if (reservation.status !== 'issued' || !reservation.paymentId || !supportedPass ||
        reservation.replacedByReservationId) {
      return { claimed: false, code: 'RESERVATION_NOT_ELIGIBLE' };
    }
    if (reservation.recoveryStatus === 'issuing') return { claimed: false, code: 'RECOVERY_IN_PROGRESS' };
    const current = reservation.adminTicketRecovery || {};
    if (current.status === 'processing') {
      const startedAt = new Date(current.startedAt || 0).getTime();
      if (!Number.isFinite(startedAt) || Date.now() - startedAt < 30 * 60 * 1000) {
        return { claimed: false, code: 'RECOVERY_IN_PROGRESS' };
      }
    }
    reservation.adminTicketRecovery = {
      requestId,
      status: 'processing',
      startedAt: new Date(),
      completedAt: null,
      recoveredMatchIndices: [],
      relinkedMatchIndices: [],
      admin: adminId,
    };
    return { claimed: true, reservation };
  }, undefined, { pruneExpired: false });
}

async function recordPartnerSeasonPassManualPaymentVerification({ reservationId, verificationId, paymentId, adminId, auditDetails = {} }) {
  if (!reservationId || !verificationId || !paymentId || !adminId ||
      auditDetails.workflow !== 'admin_manual_payment_verification' || auditDetails.status !== 'verified' ||
      auditDetails.verificationId !== verificationId || auditDetails.paymentId !== paymentId) {
    throw new InventoryConflict('Manual partner payment verification audit details are invalid.', 'INVALID_MANUAL_PAYMENT_AUDIT');
  }
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    if (!reservation || reservation.status !== 'issued' || reservation.paymentId !== paymentId) {
      throw new InventoryConflict('The paid partner reservation changed before manual payment verification was recorded.', 'MANUAL_PAYMENT_RESERVATION_CHANGED');
    }
    reservation.adminTicketRecoveryAudit ||= [];
    const existing = reservation.adminTicketRecoveryAudit.find((entry) => (
      entry.requestId === verificationId && entry.action === 'payment_verified_manually'
    ));
    if (existing) {
      const keys = ['workflow', 'status', 'verificationId', 'channel', 'orderId', 'memberNumber', 'paymentId', 'merchantSource',
        'capturedAmountMinor', 'currency', 'adminId', 'auditReason', 'source'];
      if (keys.some((key) => String(existing.details?.[key] ?? '') !== String(auditDetails[key] ?? ''))) {
        throw new InventoryConflict('This manual payment verification ID already names different evidence.', 'MANUAL_PAYMENT_VERIFICATION_ID_CONFLICT');
      }
      return existing;
    }
    const entry = {
      requestId: verificationId,
      admin: adminId,
      action: 'payment_verified_manually',
      at: auditDetails.verifiedAt || new Date(),
      details: auditDetails,
    };
    reservation.adminTicketRecoveryAudit.push(entry);
    return entry;
  }, undefined, { pruneExpired: false });
}

async function finishPartnerSeasonPassReissue({ reservationId, requestId, adminId, bookingIds, auditDetails = {}, manualIntervention = false }) {
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    const current = reservation?.adminTicketRecovery || {};
    if (!reservation || reservation.status !== 'issued' || current.requestId !== requestId || current.status !== 'processing') {
      return false;
    }
    const ids = Array.isArray(bookingIds) ? bookingIds.map(String) : [];
    const complete = ids.length === FIXTURE_DATES.length && new Set(ids).size === FIXTURE_DATES.length;
    if (!manualIntervention && !complete) {
      throw new InventoryConflict('The reissued pass does not contain one reference for each fixture.', 'REISSUE_TICKET_SET_INCOMPLETE');
    }
    if (!manualIntervention) reservation.bookingIds = bookingIds;
    reservation.adminTicketRecovery = {
      requestId,
      status: manualIntervention ? 'manual_intervention' : 'completed',
      startedAt: current.startedAt || new Date(),
      completedAt: new Date(),
      recoveredMatchIndices: [...(auditDetails.reissuedMatchIndices || [])],
      relinkedMatchIndices: [],
      admin: adminId,
    };
    reservation.adminTicketRecoveryAudit ||= [];
    const action = manualIntervention ? 'manual_intervention' : 'recovered';
    const existing = reservation.adminTicketRecoveryAudit.find((entry) => entry.requestId === requestId && entry.action === action);
    const details = { ...auditDetails, workflow: 'admin_new_ticket_reissue', bookingSetComplete: complete };
    if (existing) {
      existing.at = new Date();
      existing.details = { ...(existing.details || {}), ...details };
    } else {
      reservation.adminTicketRecoveryAudit.push({ requestId, admin: adminId, action, at: new Date(), details });
    }
    return reservation;
  }, undefined, { pruneExpired: false });
}

async function updatePartnerSeasonPassReissueSync({ reservationId, requestId, adminId, nuscSync }) {
  if (!reservationId || !requestId || !adminId || !['synced', 'pending'].includes(nuscSync)) {
    throw new InventoryConflict('Partner ticket reissue sync audit details are invalid.', 'INVALID_REISSUE_SYNC_AUDIT');
  }
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    const audit = reservation?.adminTicketRecoveryAudit?.find((entry) => (
      entry.requestId === requestId && entry.action === 'recovered' &&
      entry.details?.workflow === 'admin_new_ticket_reissue'
    ));
    if (!reservation || !audit || reservation.adminTicketRecovery?.requestId !== requestId ||
        reservation.adminTicketRecovery?.status !== 'completed') {
      throw new InventoryConflict('The completed ticket reissue audit could not be matched for dashboard synchronization.', 'REISSUE_SYNC_AUDIT_NOT_FOUND');
    }
    audit.details = { ...(audit.details || {}), nuscSync, nuscSyncUpdatedAt: new Date(), nuscSyncAdmin: adminId };
    return reservation;
  }, undefined, { pruneExpired: false });
}

async function recordPartnerReplacementAdminTicketRecovery({ reservationId, requestId, adminId, action, details = {} }) {
  if (!requestId || !adminId || !['recovered', 'manual_intervention'].includes(action)) {
    throw new InventoryConflict('Replacement ticket recovery audit details are invalid.', 'INVALID_RECOVERY_AUDIT');
  }
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    if (!reservation || !['issued', 'replaced'].includes(reservation.status) ||
        (!reservation.replacesReservationId && !reservation.replacedByReservationId)) {
      throw new InventoryConflict('The Premium replacement reservation changed during recovery.', 'RECOVERY_STATE_CHANGED');
    }
    reservation.adminTicketRecoveryAudit ||= [];
    const existing = reservation.adminTicketRecoveryAudit.find((entry) => (
      entry.requestId === requestId && entry.action === action
    ));
    if (existing) {
      existing.at = new Date();
      existing.details = { ...(existing.details || {}), ...details };
    } else {
      reservation.adminTicketRecoveryAudit.push({
        requestId,
        admin: adminId,
        action,
        at: new Date(),
        details,
      });
    }
    return reservation;
  }, undefined, { pruneExpired: false });
}

async function claimPartnerSeasonPassRecovery({ reservationId, token, adminId }) {
  if (!reservationId || !token || !adminId) {
    throw new InventoryConflict('Partner ticket recovery claim details are incomplete.', 'INVALID_RECOVERY_CLAIM');
  }
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    if (!reservation) return { claimed: false, code: 'RESERVATION_NOT_FOUND' };
    if (reservation.status !== 'issued' || reservation.passId !== 'premium-season' || !reservation.replacesReservationId) {
      return { claimed: false, code: 'RESERVATION_NOT_ISSUED' };
    }
    if (reservation.recoveryStatus === 'issuing') {
      return { claimed: false, code: 'RECOVERY_IN_PROGRESS' };
    }

    const current = reservation.adminTicketRecovery || {};
    if (current.status === 'processing' && current.requestId !== token) {
      const startedAt = new Date(current.startedAt || 0).getTime();
      if (!Number.isFinite(startedAt) || Date.now() - startedAt < 30 * 60 * 1000) {
        return { claimed: false, code: 'RECOVERY_IN_PROGRESS' };
      }
    }
    if (current.status === 'processing' && current.requestId === token) {
      return { claimed: true, alreadyClaimed: true };
    }

    reservation.adminTicketRecovery = {
      requestId: token,
      status: 'processing',
      startedAt: new Date(),
      completedAt: null,
      recoveredMatchIndices: [],
      relinkedMatchIndices: [],
      admin: adminId,
    };
    return { claimed: true };
  }, undefined, { pruneExpired: false });
}

async function finishPartnerSeasonPassRecovery({ reservationId, token, bookingIds, adminId, auditDetails = {} }) {
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    const current = reservation?.adminTicketRecovery || {};
    if (!reservation || reservation.status !== 'issued' || current.requestId !== token || current.status !== 'processing') {
      return false;
    }

    const ids = Array.isArray(bookingIds) ? bookingIds.map(String) : [];
    const expectedBookingCount = reservation.replacesReservationId && reservation.recoveryStatus !== 'issued'
      ? (reservation.replacementMatchIndices || []).length
      : FIXTURE_DATES.length;
    const hasCompleteBookingSet = ids.length === expectedBookingCount && new Set(ids).size === expectedBookingCount;
    if (hasCompleteBookingSet) reservation.bookingIds = ids;

    const completed = auditDetails.result === 'completed' && hasCompleteBookingSet;
    reservation.adminTicketRecovery = {
      requestId: token,
      status: completed ? 'completed' : 'manual_intervention',
      startedAt: current.startedAt || new Date(),
      completedAt: new Date(),
      recoveredMatchIndices: [...(auditDetails.recoveredMatchIndices || [])],
      relinkedMatchIndices: [],
      admin: adminId,
    };
    reservation.adminTicketRecoveryAudit ||= [];
    const action = completed ? 'recovered' : 'manual_intervention';
    const existing = reservation.adminTicketRecoveryAudit.find((entry) => entry.requestId === token && entry.action === action);
    const details = { ...auditDetails, bookingSetComplete: hasCompleteBookingSet };
    if (existing) {
      existing.at = new Date();
      existing.details = { ...(existing.details || {}), ...details };
    } else {
      reservation.adminTicketRecoveryAudit.push({ requestId: token, admin: adminId, action, at: new Date(), details });
    }
    return true;
  }, undefined, { pruneExpired: false });
}

async function beginPartnerSeasonPassIssuance(reservationId, paymentId) {
  const result = await mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    if (!reservation) return { error: 'RESERVATION_NOT_FOUND' };
    if (reservation.status === 'issued') {
      if (reservation.paymentId !== paymentId) return { error: 'PAYMENT_CONFLICT' };
      return { reservation, alreadyIssued: true };
    }
    if (reservation.paymentId && reservation.paymentId !== paymentId) return { error: 'PAYMENT_CONFLICT' };
    const duplicatePayment = (state.partnerSeasonPassReservations || []).find((item) =>
      item.reservationId !== reservationId && item.paymentId === paymentId
    );
    if (duplicatePayment) return { error: 'PAYMENT_ALREADY_USED' };
    if (reservation.status !== 'held' && reservation.status !== 'issuing') return { error: 'RESERVATION_NOT_ACTIVE' };
    if (reservation.status === 'held' && new Date(reservation.expiresAt) <= new Date()) {
      reservation.status = 'expired';
      state.seasonPassOrders = (state.seasonPassOrders || []).filter((item) => item.orderId !== reservationId);
      return { error: 'HOLD_EXPIRED' };
    }
    const hold = (state.seasonPassOrders || []).find((item) => item.orderId === reservationId);
    if (!hold) return { error: 'INVENTORY_HOLD_MISSING' };
    reservation.status = 'issuing';
    reservation.paymentId = paymentId;
    hold.status = 'confirmed';
    return { reservation };
  });
  if (result.error) {
    const error = new Error(result.error);
    error.code = result.error;
    throw error;
  }
  return result;
}

async function completePartnerSeasonPassIssuance(reservationId, bookingIds) {
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    if (!reservation) throw new InventoryConflict('NUSC pass reservation was not found.', 'RESERVATION_NOT_FOUND');
    if (reservation.status === 'issued') return reservation;
    if (reservation.status !== 'issuing') throw new InventoryConflict('NUSC pass reservation is not being issued.', 'RESERVATION_NOT_ACTIVE');
    reservation.bookingIds = bookingIds;
    reservation.status = 'issued';
    reservation.issuedAt = new Date();
    state.seasonPassOrders = (state.seasonPassOrders || []).filter((item) => item.orderId !== reservationId);
    return reservation;
  });
}

async function releasePartnerSeasonPassReservation(reservationId) {
  return mutateInventory((state) => {
    const reservation = (state.partnerSeasonPassReservations || []).find((item) => item.reservationId === reservationId);
    if (!reservation) return null;
    if (reservation.status === 'issued' || reservation.status === 'issuing') {
      throw new InventoryConflict('A pass that is issuing or issued cannot be released.', 'RESERVATION_NOT_RELEASABLE');
    }
    if (reservation.status === 'held') reservation.status = 'released';
    state.seasonPassOrders = (state.seasonPassOrders || []).filter((item) => item.orderId !== reservationId);
    return reservation;
  });
}

async function markSeasonPassStockApplied(orderId) {
  return mutateInventory((state) => {
    const order = (state.seasonPassOrders || []).find((item) => item.orderId === orderId);
    if (!order) return null;
    if (order.ticketType === GENERAL_TICKET_TYPE && order.zone) {
      for (const matchDate of order.matchDates || []) {
        const existingSale = state.generalZoneSales.find((sale) => sale.orderId === orderId && sale.matchDate === matchDate && sale.zone === order.zone);
        if (!existingSale) state.generalZoneSales.push({ orderId, matchDate, zone: order.zone, quantity: order.quantity });
      }
    }
    order.stockApplied = true;
    return order;
  });
}

async function finalizeSeasonPassOrder(orderId) {
  return mutateInventory((state) => {
    const order = (state.seasonPassOrders || []).find((item) => item.orderId === orderId);
    if (!order) return null;
    order.status = 'confirmed';
    order.stockApplied = true;
    return order;
  });
}

async function releaseRefundedSeasonPassOrder(orderId) {
  return mutateInventory((state) => {
    const order = (state.seasonPassOrders || []).find((item) => item.orderId === orderId);
    if (!order) return null;
    state.seasonPassOrders = (state.seasonPassOrders || []).filter((item) => item.orderId !== orderId);
    state.generalZoneSales = (state.generalZoneSales || []).filter((sale) => sale.orderId !== orderId);
    return order;
  });
}

async function confirmMatchOrder(orderId) {
  return mutateInventory((state) => {
    const order = state.orders.find((item) => item.orderId === orderId);
    if (!order) throw new InventoryConflict('This ticket hold expired. Contact support if payment was captured.', 'HOLD_EXPIRED');
    if (order.status === 'confirmed') return order;
    if (new Date(order.expiresAt) <= new Date()) {
      throw new InventoryConflict('This ticket hold expired. Contact support if payment was captured.', 'HOLD_EXPIRED');
    }
    order.status = 'confirmed';
    return order;
  });
}

async function releaseMatchOrder(orderId) {
  return mutateInventory((state) => {
    const order = state.orders.find((item) => item.orderId === orderId);
    if (!order) return null;
    if (order.status === 'confirmed') return order;
    state.orders = state.orders.filter((item) => item.orderId !== orderId);
    return order;
  });
}

async function releaseUnpaidMatchOrderForAdmin(orderId, { session } = {}) {
  return mutateInventory((state) => {
    const orders = state.orders.filter((item) => item.orderId === orderId);
    if (orders.some((order) => order.status !== 'held')) {
      throw new InventoryConflict(
        'This match inventory is already confirmed or has changed. Refresh the booking before deleting it.',
        'MATCH_INVENTORY_NOT_UNPAID',
      );
    }
    state.orders = state.orders.filter((item) => item.orderId !== orderId);
    return {
      released: orders.length > 0,
      ticketCount: orders.reduce((sum, order) => sum + (order.ticketLines || []).reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0), 0),
      suiteAllocationCount: orders.reduce((sum, order) => sum + (order.suiteAllocations || []).length, 0),
    };
  }, session);
}

async function releaseOfflineSinglePassReservationForAdmin({ bookingId, matchDate, quantity, adminId }, { session } = {}) {
  if (!mongoose.isValidObjectId(bookingId) || !mongoose.isValidObjectId(adminId)) {
    throw new InventoryConflict('The booking or Admin identity is invalid.', 'INVALID_OFFLINE_RELEASE');
  }
  if (!FIXTURE_DATES.includes(matchDate) || !Number.isSafeInteger(quantity) || quantity < 1) {
    throw new InventoryConflict('The offline Suite reservation could not be matched to this booking.', 'INVALID_OFFLINE_RELEASE');
  }

  return mutateInventory((state) => {
    const existing = state.offlineSinglePassReleases.find((item) => String(item.bookingId) === String(bookingId));
    if (existing) {
      if (existing.matchDate !== matchDate || Number(existing.quantity) !== quantity) {
        throw new InventoryConflict('A different offline Suite release is already recorded for this booking.', 'OFFLINE_RELEASE_CONFLICT');
      }
      return { released: false, idempotent: true, quantity };
    }
    if (getOfflineReservedSinglePassSeats(state, matchDate) < quantity) {
      throw new InventoryConflict('No matching offline Suite reservation remains to release for this match.', 'OFFLINE_RESERVATION_NOT_FOUND');
    }
    state.offlineSinglePassReleases.push({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      matchDate,
      quantity,
      releasedBy: new mongoose.Types.ObjectId(adminId),
      releasedAt: new Date(),
    });
    return { released: true, idempotent: false, quantity };
  }, session);
}

async function markTicketStockApplied(orderId) {
  return mutateInventory((state) => {
    const order = state.orders.find((item) => item.orderId === orderId);
    if (!order) return null;
    if (!order.stockApplied) {
      for (const line of order.ticketLines || []) {
        if (line.ticketType !== GENERAL_TICKET_TYPE || !line.zone) continue;
        const existingSale = state.generalZoneSales.find((sale) => (
          sale.orderId === orderId && sale.matchDate === order.matchDate && sale.zone === line.zone
        ));
        if (!existingSale) {
          state.generalZoneSales.push({
            orderId,
            matchDate: order.matchDate,
            zone: line.zone,
            quantity: line.quantity,
          });
        }
      }
    }
    order.stockApplied = true;
    if (!(order.ticketLines || []).some((line) => (
      normalizeTicketTypeName(line.ticketType) === normalizeTicketTypeName(SUITE_SINGLE_MATCH)
    ))) order.ticketLines = [];
    return order;
  });
}

async function finalizeMatchOrder(orderId) {
  return mutateInventory((state) => {
    const order = state.orders.find((item) => item.orderId === orderId);
    if (!order) return null;
    const hasSingleMatchTicket = (order.ticketLines || []).some((line) => (
      normalizeTicketTypeName(line.ticketType) === normalizeTicketTypeName(SUITE_SINGLE_MATCH)
    ));
    if (order.suiteAllocations?.length || hasSingleMatchTicket) {
      order.stockApplied = true;
      if (!hasSingleMatchTicket) order.ticketLines = [];
      return order;
    }
    state.orders = state.orders.filter((item) => item.orderId !== orderId);
    return order;
  });
}

function publicSuiteSingleMatchTicket(source, availableQuantity = 0, capacity = SEATS_PER_BOX) {
  const ticket = typeof source?.toObject === 'function' ? source.toObject() : (source || {});
  return {
    ...ticket,
    _id: ticket._id || 'nusc-suite-single-match',
    name: SUITE_SINGLE_MATCH,
    description: 'One private VIP box for up to 8 people for one match.',
    ...(getMatchTicketPrice(SUITE_SINGLE_MATCH) || {}),
    quantity: Math.max(0, Number(availableQuantity) || 0),
    sold: 0,
    capacity,
    benefits: [
      'Private VIP Box access',
      'Comfortable seating',
      'Best stadium viewing experience',
      'Dedicated VIP entry',
      'Complimentary food & beverages',
      'Match-day hospitality service (butler service)',
      'Dedicated parking access',
      'Complimentary Merch',
      'Exclusive discounts at club store',
    ],
  };
}

function includeSuiteSingleMatch(ticketTypes, availableQuantity = 0, capacity = SEATS_PER_BOX) {
  return ticketTypes.some((ticket) => normalizeTicketTypeName(ticket.name) === normalizeTicketTypeName(SUITE_SINGLE_MATCH))
    ? ticketTypes
    : [...ticketTypes, publicSuiteSingleMatchTicket(null, availableQuantity, capacity)];
}

function getPublicTicketTypes(state, matchDate, eventTicketTypes = [], { allowSalesClosed = false, zoneSoldCounts = {} } = {}) {
  const venueSalesOnly = isVenueOnlyMatchDate(matchDate);
  if ((!TICKET_SALES_ENABLED || venueSalesOnly) && !allowSalesClosed) {
    const ticketTypes = eventTicketTypes.map((source) => {
      const ticket = typeof source?.toObject === 'function' ? source.toObject() : source;
      if (normalizeTicketTypeName(ticket.name) === normalizeTicketTypeName(SUITE_SINGLE_MATCH)) {
        return publicSuiteSingleMatchTicket(ticket, 0, SEATS_PER_BOX);
      }
      if (ticket.name === SUITE_FULL_BOX) {
        return { ...ticket, ...(getMatchTicketPrice(ticket.name) || {}), quantity: 0, sold: 0, capacity: FULL_BOX_SEATS };
      }
      const seasonPassCapacity = SEASON_PASS_CAPACITIES[ticket.name]
        ? getSeasonPassCapacity(state, ticket.name)
        : 0;
      return {
        ...ticket,
        ...(getMatchTicketPrice(ticket.name) || {}),
        quantity: 0,
        sold: 0,
        ...(seasonPassCapacity && {
          seasonPassCapacity,
          seasonPassRemaining: 0,
          seasonPassSalesOpen: false,
        }),
        ...(ticket.name === GENERAL_TICKET_TYPE && {
          zones: GENERAL_SEATING_AREAS.map((area) => ({ ...area, available: 0 })),
        }),
      };
    });
    return includeSuiteSingleMatch(ticketTypes, 0, SEATS_PER_BOX)
      .map((ticket) => ({ ...ticket, venueSalesOnly }));
  }
  const activeOrders = activeOrdersForDate(state, matchDate);
  const activeSeasonOrders = activeSeasonPassOrdersForDate(state, matchDate);
  const suite = getSuiteAvailability(state, matchDate);
  const singleMatchRemaining = process.env.NODE_ENV === 'production' && !UNITED_SUITE_MAPPING_CONFIRMED
    ? 0
    : suite.singleMatchBoxes;
  const heldByTicketType = new Map();
  for (const order of activeOrders) {
    if (order.stockApplied) continue;
    for (const line of order.ticketLines || []) {
      heldByTicketType.set(line.ticketType, (heldByTicketType.get(line.ticketType) || 0) + line.quantity);
    }
  }
  for (const order of activeSeasonOrders) {
    heldByTicketType.set(order.ticketType, (heldByTicketType.get(order.ticketType) || 0) + Number(order.quantity || 0));
  }
  const ticketTypes = eventTicketTypes.map((source) => {
    const ticket = typeof source?.toObject === 'function' ? source.toObject() : source;
    if (normalizeTicketTypeName(ticket.name) === normalizeTicketTypeName(SUITE_SINGLE_MATCH)) {
      return publicSuiteSingleMatchTicket(ticket, singleMatchRemaining, SEATS_PER_BOX);
    }
    const seasonPassCapacity = SEASON_PASS_CAPACITIES[ticket.name]
      ? getSeasonPassCapacity(state, ticket.name)
      : 0;
    if (ticket.name === SUITE_SINGLE) {
      return { ...ticket, ...(getMatchTicketPrice(ticket.name) || {}), quantity: suite.singleSeats, sold: 0, capacity: suite.singlePassCapacity };
    }
    if (ticket.name === SUITE_FULL_BOX) {
      return {
        ...ticket,
        ...(getMatchTicketPrice(ticket.name) || {}),
        quantity: process.env.NODE_ENV === 'production' && !UNITED_SUITE_MAPPING_CONFIRMED ? 0 : suite.fullBoxes,
        sold: 0,
        capacity: FULL_BOX_SEATS,
      };
    }
    const capacity = getInventoryCapacity(state, matchDate, ticket.name) ?? Number(ticket.quantity || 0);
    const availabilityLimit = getInventoryAvailabilityLimit(state, matchDate, ticket.name);
    const available = Math.max(0, Math.min(capacity, availabilityLimit) - Number(ticket.sold || 0) - (heldByTicketType.get(ticket.name) || 0));
    const zones = ticket.name === GENERAL_TICKET_TYPE
      ? getGeneralZoneAvailability(state, matchDate, ticket.sold || 0, activeOrders, activeSeasonOrders, zoneSoldCounts)
      : null;
    return {
      ...ticket,
      ...(getMatchTicketPrice(ticket.name) || {}),
      quantity: zones ? zones.reduce((sum, zone) => sum + zone.available, 0) : available,
      capacity,
      sold: 0,
      ...(zones && { zones }),
      ...(seasonPassCapacity && {
        seasonPassCapacity,
        seasonPassRemaining: Math.max(0, Math.min(
          getSeasonPassCapacity(state, ticket.name),
          getInventoryAvailabilityLimit(state, null, `${ticket.name === 'General Pass' ? 'General' : 'Premium'} Season Pass`)
        ) - getSeasonPassQuotaUsage(state, ticket.name).used),
        seasonPassSalesOpen: TICKET_SALES_ENABLED,
      }),
    };
  });
  return includeSuiteSingleMatch(ticketTypes, singleMatchRemaining, SEATS_PER_BOX)
    .map((ticket) => ({ ...ticket, venueSalesOnly }));
}

function getCapacityRowBase(definition, matchDate, state, zone = null) {
  const override = getCapacityOverride(state, matchDate, definition.ticketType);
  const zoneCapacity = zone ? GENERAL_SEATING_AREAS.find((area) => area.name === zone)?.capacity : null;
  return {
    matchDate: definition.scope === 'match' ? matchDate : null,
    ticketType: definition.ticketType,
    ...(zone && { zone }),
    label: zone ? `${definition.label} · ${zone}` : definition.label,
    unit: definition.unit,
    capacity: zoneCapacity ?? (override ? Number(override.capacity) : definition.defaultCapacity),
    defaultCapacity: zoneCapacity ?? definition.defaultCapacity,
    maxCapacity: zoneCapacity ?? definition.maxCapacity,
    availabilityLimit: getInventoryAvailabilityLimit(state, matchDate, definition.ticketType, zone),
    availabilityOverride: (state.availabilityOverrides || []).some((item) => (
      normalizeTicketTypeName(item.ticketType) === normalizeTicketTypeName(definition.ticketType) &&
      (item.matchDate || null) === (definition.scope === 'match' ? matchDate : null) &&
      (item.zone || null) === (zone || null)
    )),
    updatedAt: override?.updatedAt || null,
  };
}

function sumOrderTickets(orders, ticketType, { includeStockApplied = false } = {}) {
  return (orders || []).reduce((sum, order) => {
    if (!includeStockApplied && order.stockApplied) return sum;
    return sum + (order.ticketLines || [])
      .filter((line) => normalizeTicketTypeName(line.ticketType) === normalizeTicketTypeName(ticketType))
      .reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0);
  }, 0);
}

function getMatchCapacityUsage(state, matchDate, ticketType, eventTicketTypes = []) {
  const capacity = getInventoryCapacity(state, matchDate, ticketType);
  const activeOrders = activeOrdersForDate(state, matchDate);
  const activeSeasonOrders = activeSeasonPassOrdersForDate(state, matchDate);
  const normalizedType = normalizeTicketTypeName(ticketType);

  if (normalizedType === normalizeTicketTypeName(SUITE_SINGLE)) {
    const box = getBoxState(state, matchDate).find((item) => item.boxNumber === SINGLE_PASS_BOX_NUMBER);
    const offlineReserved = getOfflineReservedSinglePassSeats(state, matchDate);
    const ordersForBox = activeOrders.filter((order) => (order.suiteAllocations || []).some((allocation) => (
      allocation.boxNumber === SINGLE_PASS_BOX_NUMBER && normalizeTicketTypeName(allocation.ticketType) === normalizedType
    )));
    const sold = ordersForBox.filter((order) => order.status === 'confirmed')
      .reduce((sum, order) => sum + (order.suiteAllocations || []).filter((allocation) => allocation.boxNumber === SINGLE_PASS_BOX_NUMBER && normalizeTicketTypeName(allocation.ticketType) === normalizedType).length, 0);
    const held = ordersForBox.filter((order) => order.status === 'held')
      .reduce((sum, order) => sum + (order.suiteAllocations || []).filter((allocation) => allocation.boxNumber === SINGLE_PASS_BOX_NUMBER && normalizeTicketTypeName(allocation.ticketType) === normalizedType).length, 0);
    const available = Math.min(getSuiteAvailability(state, matchDate).singleSeats, getInventoryAvailabilityLimit(state, matchDate, ticketType));
    return { sold, held, offlineReserved, available: Math.max(0, available), committed: sold + held + offlineReserved, blocked: Boolean(box?.seasonReserved || box?.fullBoxReserved) };
  }

  if (normalizedType === normalizeTicketTypeName(SUITE_SINGLE_MATCH)) {
    const sold = activeOrders.filter((order) => order.status === 'confirmed')
      .reduce((sum, order) => sum + sumOrderTickets([order], SUITE_SINGLE_MATCH, { includeStockApplied: true }), 0);
    const held = activeOrders.filter((order) => order.status === 'held')
      .reduce((sum, order) => sum + sumOrderTickets([order], SUITE_SINGLE_MATCH), 0);
    const committed = sold + held;
    return { sold, held, offlineReserved: 0, available: getSuiteAvailability(state, matchDate).singleMatchBoxes, committed };
  }

  if (normalizedType === normalizeTicketTypeName(SUITE_FULL_BOX)) {
    const fullBoxes = getBoxState(state, matchDate).filter((box) => FULL_BOX_NUMBERS.includes(box.boxNumber));
    const offlineReserved = fullBoxes.filter((box) => box.seasonReserved).length;
    const sold = activeOrders.filter((order) => order.status === 'confirmed')
      .reduce((sum, order) => sum + (order.suiteAllocations || []).filter((allocation) => (
        normalizeTicketTypeName(allocation.ticketType) === normalizedType && FULL_BOX_NUMBERS.includes(allocation.boxNumber)
      )).length, 0);
    const held = activeOrders.filter((order) => order.status === 'held')
      .reduce((sum, order) => sum + (order.suiteAllocations || []).filter((allocation) => (
        normalizeTicketTypeName(allocation.ticketType) === normalizedType && FULL_BOX_NUMBERS.includes(allocation.boxNumber)
      )).length, 0);
    const available = Math.min(getSuiteAvailability(state, matchDate).fullBoxes, getInventoryAvailabilityLimit(state, matchDate, ticketType));
    const committed = sold + held + offlineReserved;
    return { sold, held, offlineReserved, available, committed };
  }

  const eventTicket = (eventTicketTypes || []).find((item) => normalizeTicketTypeName(item.name) === normalizedType);
  const sold = Number(eventTicket?.sold || 0);
  const held = sumOrderTickets(activeOrders, ticketType) + activeSeasonOrders
    .filter((order) => normalizeTicketTypeName(order.ticketType) === normalizedType)
    .reduce((sum, order) => sum + Number(order.quantity || 0), 0);
  return {
    sold,
    held,
    offlineReserved: 0,
    available: Math.max(0, Math.min(capacity, getInventoryAvailabilityLimit(state, matchDate, ticketType)) - sold - held),
    committed: sold + held,
  };
}

function getGlobalSingleMatchUsage(state) {
  let sold = 0;
  let held = 0;
  for (const order of state.orders || []) {
    if (order.status !== 'confirmed' && !(order.status === 'held' && new Date(order.expiresAt) > new Date())) continue;
    const quantity = sumOrderTickets([order], SUITE_SINGLE_MATCH, { includeStockApplied: true });
    if (order.status === 'confirmed') sold += quantity;
    else held += quantity;
  }
  return { sold, held, offlineReserved: 0, committed: sold + held };
}

function getSeasonQuotaUsage(state, ticketType) {
  const quota = getSeasonPassQuotaUsage(state, ticketType);
  const passOrders = (state.seasonPassOrders || []).filter((order) => order.ticketType === ticketType && (
    order.status === 'held' && new Date(order.expiresAt) > new Date() ||
    order.status === 'confirmed' && !order.stockApplied
  ));
  const localHeld = passOrders.reduce((sum, order) => sum + Number(order.quantity || 0), 0);
  const knownOrderIds = new Set(passOrders.map((order) => order.orderId));
  const partnerHeld = (state.partnerSeasonPassReservations || []).filter((reservation) => (
    reservation.ticketType === ticketType && !knownOrderIds.has(reservation.reservationId) &&
    (reservation.status === 'issuing' || reservation.status === 'held' && new Date(reservation.expiresAt) > new Date())
  )).length;
  const held = localHeld + partnerHeld;
  return { sold: Math.max(0, quota.used - held), held, offlineReserved: 0, used: quota.used };
}

async function getAdminCapacityOverview({ matches = [] } = {}) {
  let state = await ensureInventory();
  state = clone(state || {});
  state.orders ||= [];
  state.generalZoneSales ||= [];
  state.seasonPassOrders ||= [];
  state.partnerSeasonPassReservations ||= [];
  state.seasonReservations ||= [];
  state.capacityOverrides ||= [];
  pruneExpiredHolds(state);

  const matchByDate = new Map((matches || []).map((match) => [match.matchDate, match]));
  const fixtures = FIXTURE_MATCHES.map((fixture) => {
    const suppliedMatch = matchByDate.get(fixture.date) || {};
    const ticketTypes = suppliedMatch.ticketTypes || [];
    const rows = CAPACITY_CONTROL_DEFINITIONS.filter((definition) => definition.scope === 'match').map((definition) => {
      const capacity = getCapacityRowBase(definition, fixture.date, state);
      const usage = getMatchCapacityUsage(state, fixture.date, definition.ticketType, ticketTypes);
      return { ...capacity, ...usage };
    });
    const generalDefinition = getCapacityDefinition(GENERAL_TICKET_TYPE);
    const generalTicket = ticketTypes.find((ticket) => normalizeTicketTypeName(ticket.name) === normalizeTicketTypeName(GENERAL_TICKET_TYPE));
    const activeOrders = activeOrdersForDate(state, fixture.date);
    const activeSeasonOrders = activeSeasonPassOrdersForDate(state, fixture.date);
    const zoneSoldCounts = suppliedMatch.zoneSoldCounts || {};
    const zoneUsage = getGeneralZoneUsage(state, fixture.date, generalTicket?.sold || 0, activeOrders, activeSeasonOrders, zoneSoldCounts);
    const availableZones = getGeneralZoneAvailability(state, fixture.date, generalTicket?.sold || 0, activeOrders, activeSeasonOrders, zoneSoldCounts);
    const generalRow = rows.find((row) => normalizeTicketTypeName(row.ticketType) === normalizeTicketTypeName(GENERAL_TICKET_TYPE));
    if (generalRow) generalRow.available = availableZones.reduce((sum, area) => sum + area.available, 0);
    const generalZones = GENERAL_SEATING_AREAS.map((area) => {
      const capacity = getCapacityRowBase(generalDefinition, fixture.date, state, area.name);
      const available = availableZones.find((item) => item.name === area.name)?.available || 0;
      const committed = zoneUsage.find((item) => item.name === area.name)?.committed || 0;
      return {
        ...capacity,
        sold: zoneUsage.find((item) => item.name === area.name)?.sold || 0,
        held: zoneUsage.find((item) => item.name === area.name)?.held || 0,
        offlineReserved: 0,
        available,
      };
    });
    return { matchDate: fixture.date, opponent: suppliedMatch.opponent || fixture.opponent, capacities: rows, generalZones };
  }).sort((first, second) => first.matchDate.localeCompare(second.matchDate));

  const seasonPasses = ['General Pass', 'Premium Pass'].map((ticketType) => {
    const definition = getCapacityDefinition(`${ticketType === 'General Pass' ? 'General' : 'Premium'} Season Pass`);
    const quotaCapacity = getCapacityRowBase(definition, null, state);
    const usage = getSeasonQuotaUsage(state, ticketType);
    const typeAvailability = fixtures.map((fixture) => (
      fixture.capacities.find((row) => normalizeTicketTypeName(row.ticketType) === normalizeTicketTypeName(ticketType))?.available ?? 0
    ));
    return {
      ...quotaCapacity,
      ...usage,
      available: Math.min(
        Math.max(0, quotaCapacity.capacity - usage.used),
        Math.max(0, quotaCapacity.availabilityLimit - usage.used),
        typeAvailability.length ? Math.min(...typeAvailability) : 0
      ),
      limitingMatchAvailability: typeAvailability.length ? Math.min(...typeAvailability) : 0,
    };
  });

  const seasonBoxDefinition = getCapacityDefinition(SEASON_BOX_CAPACITY_KEY);
  const seasonBoxCapacity = getCapacityRowBase(seasonBoxDefinition, null, state);
  const seasonBoxCount = state.seasonReservations.filter((item) => item.status === 'active').length;
  const seasonBoxes = {
    ...seasonBoxCapacity,
    sold: 0,
    held: 0,
    offlineReserved: seasonBoxCount,
    committed: seasonBoxCount,
    available: Math.max(0, Math.min(seasonBoxCapacity.capacity, seasonBoxCapacity.availabilityLimit) - seasonBoxCount),
  };

  return { salesEnabled: TICKET_SALES_ENABLED, suiteMappingConfirmed: UNITED_SUITE_MAPPING_CONFIRMED, fixtures, seasonPasses, seasonBoxes };
}

async function setCapacityOverride({ matchDate = null, ticketType, capacity, adminId, soldCount = 0 }) {
  const definition = getCapacityDefinition(ticketType);
  if (!definition) throw new InventoryConflict('Choose a supported NUSC ticket capacity.', 'INVALID_CAPACITY_TYPE');
  const scopedMatchDate = definition.scope === 'match' ? normalizeMatchDate(matchDate) : null;
  if (definition.scope === 'match' && !FIXTURE_DATES.includes(scopedMatchDate)) {
    throw new InventoryConflict('Choose a valid NUSC match date for this capacity.', 'INVALID_MATCH_DATE');
  }
  const nextCapacity = Number(capacity);
  if (!Number.isInteger(nextCapacity) || nextCapacity < 0 || nextCapacity > definition.maxCapacity) {
    throw new InventoryConflict(`Capacity must be a whole number from 0 to ${definition.maxCapacity}.`, 'INVALID_CAPACITY');
  }
  if (!adminId) throw new InventoryConflict('An admin account is required to change capacity.', 'ADMIN_REQUIRED');

  return mutateInventory((state) => {
    const usage = definition.scope === 'global' && definition.ticketType === SUITE_SINGLE_MATCH
      ? getGlobalSingleMatchUsage(state)
      : definition.ticketType === SEASON_BOX_CAPACITY_KEY
        ? (() => {
          const committed = state.seasonReservations.filter((item) => item.status === 'active').length;
          return { committed };
        })()
        : definition.ticketType === 'General Season Pass'
          ? { committed: getSeasonQuotaUsage(state, 'General Pass').used }
          : definition.ticketType === 'Premium Season Pass'
            ? { committed: getSeasonQuotaUsage(state, 'Premium Pass').used }
            : getMatchCapacityUsage(state, scopedMatchDate, definition.ticketType, [{
              name: definition.ticketType,
              sold: Math.max(0, Number(soldCount) || 0),
            }]);
    const committed = Number(usage.committed ?? (Number(usage.sold || 0) + Number(usage.held || 0) + Number(usage.offlineReserved || 0)));
    if (nextCapacity < committed) {
      const error = new InventoryConflict(`Capacity cannot be lower than the ${committed} ${definition.unit} already sold, held, or reserved.`, 'CAPACITY_BELOW_COMMITTED');
      error.committed = committed;
      error.capacity = nextCapacity;
      throw error;
    }

    const existing = state.capacityOverrides.find((item) => (
      normalizeTicketTypeName(item.ticketType) === normalizeTicketTypeName(definition.ticketType) &&
      (item.matchDate || null) === scopedMatchDate
    ));
    const updated = {
      ...(existing || {}),
      matchDate: scopedMatchDate,
      ticketType: definition.ticketType,
      capacity: nextCapacity,
      updatedBy: adminId,
      updatedAt: new Date(),
    };
    if (existing) Object.assign(existing, updated);
    else state.capacityOverrides.push(updated);
    return updated;
  });
}

async function setAvailabilityOverride({ matchDate = null, ticketType, zone = null, availability, adminId, soldCount = 0, zoneSoldCounts = {} }) {
  const definition = getCapacityDefinition(ticketType);
  if (!definition) throw new InventoryConflict('Choose a supported NUSC ticket availability.', 'INVALID_AVAILABILITY_TYPE');
  const scopedMatchDate = definition.scope === 'match' ? normalizeMatchDate(matchDate) : null;
  if (definition.scope === 'match' && !FIXTURE_DATES.includes(scopedMatchDate)) {
    throw new InventoryConflict('Choose a valid NUSC match date for this availability.', 'INVALID_MATCH_DATE');
  }
  const normalizedZone = zone == null || zone === '' ? null : String(zone).trim().toUpperCase();
  if (normalizedZone && (definition.ticketType !== GENERAL_TICKET_TYPE || !GENERAL_SEATING_AREAS.some((area) => area.name === normalizedZone))) {
    throw new InventoryConflict('Choose a valid General seating zone.', 'INVALID_ZONE');
  }
  const reset = availability === null || availability === '';
  const maxAvailability = normalizedZone
    ? GENERAL_SEATING_AREAS.find((area) => area.name === normalizedZone).capacity
    : definition.maxCapacity;
  const nextAvailability = reset ? null : Number(availability);
  if (!reset && (!Number.isSafeInteger(nextAvailability) || nextAvailability < 0 || nextAvailability > maxAvailability)) {
    throw new InventoryConflict(`Availability must be a whole number from 0 to ${maxAvailability}.`, 'INVALID_AVAILABILITY');
  }
  if (!adminId) throw new InventoryConflict('An admin account is required to change availability.', 'ADMIN_REQUIRED');

  return mutateInventory((state) => {
    state.availabilityOverrides ||= [];
    const configuredCapacity = normalizedZone
      ? maxAvailability
      : Math.min(definition.maxCapacity, getInventoryCapacity(state, scopedMatchDate, definition.ticketType));
    if (!reset && nextAvailability > configuredCapacity) {
      throw new InventoryConflict(`Availability cannot exceed the configured capacity of ${configuredCapacity}.`, 'INVALID_AVAILABILITY');
    }
    const activeOrders = scopedMatchDate ? activeOrdersForDate(state, scopedMatchDate) : [];
    const activeSeasonOrders = scopedMatchDate ? activeSeasonPassOrdersForDate(state, scopedMatchDate) : [];
    let committed = 0;
    if (normalizedZone) {
      const zoneUsage = getGeneralZoneUsage(state, scopedMatchDate, Math.max(0, Number(soldCount) || 0), activeOrders, activeSeasonOrders, zoneSoldCounts);
      committed = Number(zoneUsage.find((area) => area.name === normalizedZone)?.committed || 0);
    } else if (definition.scope === 'global' && definition.ticketType === SUITE_SINGLE_MATCH) {
      committed = getGlobalSingleMatchUsage(state).committed;
    } else if (definition.scope === 'global' && definition.ticketType === 'General Season Pass') {
      committed = getSeasonQuotaUsage(state, GENERAL_TICKET_TYPE).used;
    } else if (definition.scope === 'global' && definition.ticketType === 'Premium Season Pass') {
      committed = getSeasonQuotaUsage(state, 'Premium Pass').used;
    } else if (definition.scope === 'global' && definition.ticketType === SEASON_BOX_CAPACITY_KEY) {
      committed = state.seasonReservations.filter((reservation) => reservation.status === 'active').length;
    } else if (scopedMatchDate) {
      const usage = getMatchCapacityUsage(state, scopedMatchDate, definition.ticketType, [{
        name: definition.ticketType,
        sold: Math.max(0, Number(soldCount) || 0),
      }]);
      committed = Number(usage.committed ?? (Number(usage.sold || 0) + Number(usage.held || 0) + Number(usage.offlineReserved || 0)));
    }
    if (!reset && nextAvailability < committed) {
      const error = new InventoryConflict(`Availability cannot be lower than the ${committed} already sold, held, or reserved ${definition.unit}.`, 'AVAILABILITY_BELOW_COMMITTED');
      error.committed = committed;
      error.availability = nextAvailability;
      throw error;
    }

    const existingIndex = state.availabilityOverrides.findIndex((item) => (
      normalizeTicketTypeName(item.ticketType) === normalizeTicketTypeName(definition.ticketType) &&
      (item.matchDate || null) === scopedMatchDate &&
      (item.zone || null) === normalizedZone
    ));
    const existing = existingIndex >= 0 ? state.availabilityOverrides[existingIndex] : null;
    if (reset) {
      if (existingIndex >= 0) state.availabilityOverrides.splice(existingIndex, 1);
      return {
        matchDate: scopedMatchDate,
        ticketType: definition.ticketType,
        zone: normalizedZone,
        availability: null,
        availabilityLimit: getInventoryAvailabilityLimit(state, scopedMatchDate, definition.ticketType, normalizedZone),
        availabilityOverride: false,
      };
    }

    const updated = {
      ...(existing || {}),
      matchDate: scopedMatchDate,
      ticketType: definition.ticketType,
      zone: normalizedZone,
      availability: nextAvailability,
      updatedBy: adminId,
      updatedAt: new Date(),
    };
    if (existing) Object.assign(existing, updated);
    else state.availabilityOverrides.push(updated);
    return { ...updated, availabilityLimit: getInventoryAvailabilityLimit(state, scopedMatchDate, definition.ticketType, normalizedZone), availabilityOverride: true };
  });
}

async function getMatchAvailability(matchDate, eventTicketTypes = [], { eventId = null, zoneSoldCounts = null } = {}) {
  const normalizedMatchDate = normalizeMatchDate(matchDate);
  if (!FIXTURE_DATES.includes(normalizedMatchDate)) return null;
  const resolvedZoneSoldCounts = zoneSoldCounts || (eventId ? (await getGeneralZoneSalesByEventIds([eventId]))[String(eventId)] || {} : {});
  return mutateInventory((state) => getPublicTicketTypes(state, normalizedMatchDate, eventTicketTypes, { zoneSoldCounts: resolvedZoneSoldCounts }));
}

async function getMatchAvailabilities(matches = [], { allowSalesClosed = false } = {}) {
  const normalizedMatches = matches.map((match) => ({ ...match, matchDate: normalizeMatchDate(match.matchDate) }));
  const validMatches = normalizedMatches.filter((match) => FIXTURE_DATES.includes(match.matchDate));
  if (validMatches.length === 0) return {};
  const salesByEvent = await getGeneralZoneSalesByEventIds(validMatches.map((match) => match.eventId));
  return mutateInventory((state) => Object.fromEntries(validMatches.map((match) => [
    match.key,
    getPublicTicketTypes(state, match.matchDate, match.ticketTypes, {
      allowSalesClosed,
      zoneSoldCounts: match.zoneSoldCounts || salesByEvent[String(match.eventId)] || {},
    }),
  ])));
}

async function reserveSeasonBox({ bookingReference, adminId }) {
  const reference = String(bookingReference || '').trim();
  if (reference.length < 3 || reference.length > 80) {
    throw new InventoryConflict('Enter a season booking reference between 3 and 80 characters.', 'INVALID_REFERENCE');
  }

  return mutateInventory((state) => {
    const existing = state.seasonReservations.find((item) => item.bookingReference.toLowerCase() === reference.toLowerCase() && item.status === 'active');
    if (existing) return existing;

    const alreadySeasonReserved = new Set(state.seasonReservations
      .filter((item) => item.status === 'active')
      .map((item) => item.boxNumber));
    const seasonCapacity = Math.min(
      getInventoryCapacity(state, null, SEASON_BOX_CAPACITY_KEY),
      getInventoryAvailabilityLimit(state, null, SEASON_BOX_CAPACITY_KEY)
    );
    if (alreadySeasonReserved.size >= seasonCapacity || FIXTURE_DATES.some((date) => getSuiteAvailability(state, date).fullBoxes < 1)) {
      throw new InventoryConflict('No single box is free across every match for a season booking.', 'NO_SEASON_BOX');
    }
    const activeOrders = state.orders.filter((order) => order.status === 'confirmed' || (order.status === 'held' && new Date(order.expiresAt) > new Date()));
    const singlePassBoxHasOfflineReservations = Object.keys(OFFLINE_RESERVED_SINGLE_PASS_SEATS_BY_DATE)
      .some((date) => getOfflineReservedSinglePassSeats(state, date) > 0);
    const boxNumber = SEASON_BOX_NUMBERS.find((candidate) => {
      if (alreadySeasonReserved.has(candidate)) return false;
      if (candidate === SINGLE_PASS_BOX_NUMBER && singlePassBoxHasOfflineReservations) return false;
      return !FIXTURE_DATES.some((date) => activeOrders.some((order) => (
        order.matchDate === date && (order.suiteAllocations || []).some((allocation) => allocation.boxNumber === candidate)
      )));
    });
    if (!boxNumber) throw new InventoryConflict('No single box is free across every match for a season booking.', 'NO_SEASON_BOX');

    const reservation = {
      bookingReference: reference,
      boxNumber,
      status: 'active',
      createdBy: adminId,
      createdAt: new Date(),
    };
    state.seasonReservations.push(reservation);
    return reservation;
  });
}

async function cancelSeasonBox(reservationId, adminId) {
  return mutateInventory((state) => {
    const reservation = state.seasonReservations.find((item) => String(item._id) === String(reservationId));
    if (!reservation || reservation.status !== 'active') return null;
    reservation.status = 'cancelled';
    reservation.cancelledAt = new Date();
    reservation.cancelledBy = adminId;
    return reservation;
  });
}

async function releaseRefundedMatchOrder(orderId) {
  return mutateInventory((state) => {
    const orders = state.orders.filter((item) => item.orderId === orderId || item.orderId.startsWith(`${orderId}|`));
    if (!orders.length) return null;
    state.generalZoneSales = (state.generalZoneSales || []).filter((sale) => sale.orderId !== orderId && !String(sale.orderId || '').startsWith(`${orderId}|`));
    state.orders = state.orders.filter((item) => item.orderId !== orderId && !item.orderId.startsWith(`${orderId}|`));
    return orders;
  });
}

async function listSeasonBoxes() {
  const state = await ensureInventory();
  return (state.seasonReservations || []).filter((reservation) => reservation.status === 'active');
}

function matchDateFromSlug(slug) {
  const match = /^nusc-home-match-(\d{4})(\d{2})(\d{2})$/.exec(String(slug || ''));
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

module.exports = {
  BOX_COUNT,
  FULL_BOX_COUNT: FULL_BOX_NUMBERS.length,
  BUYER_TICKET_LIMIT,
  FIXTURE_DATES,
  GENERAL_TICKET_TYPE,
  GENERAL_SEATING_AREAS,
  getMatchTicketPrice,
  MATCH_TICKET_PRICES,
  SEASON_PASS_OPTIONS,
  HOLD_MINUTES,
  FIXTURE_MATCHES,
  normalizeMatchDate,
  isVenueOnlyMatchDate,
  getVenueOnlyMatchSalesMessage,
  getLegacyMatchDate,
  InventoryConflict,
  NUSC_TEST_MODE_ENABLED,
  SEASON_PASS_CAPACITIES,
  SINGLE_MATCH_CAPACITY,
  SINGLE_PASS_SEAT_CAPACITY: SEATS_PER_BOX,
  SUITE_FULL_BOX,
  SUITE_SINGLE_MATCH,
  SUITE_SEASON,
  SUITE_SINGLE,
  TICKET_CAPACITIES,
  TICKET_SALES_ENABLED,
  cancelSeasonBox,
  confirmMatchOrder,
  confirmSeasonPassOrder,
  finalizeMatchOrder,
  finalizeSeasonPassOrder,
  getMatchAvailability,
  getMatchAvailabilities,
  getGeneralZoneSalesByEventIds,
  getAdminCapacityOverview,
  getBoxDisplayNumber,
  getBoxGuestCapacity,
  isUnitedSuiteMappingConfirmed: () => UNITED_SUITE_MAPPING_CONFIRMED,
  setCapacityOverride,
  setAvailabilityOverride,
  listSeasonBoxes,
  markTicketStockApplied,
  markSeasonPassStockApplied,
  matchDateFromSlug,
  releaseMatchOrder,
  releaseUnpaidMatchOrderForAdmin,
  releaseOfflineSinglePassReservationForAdmin,
  reserveMatchOrder,
  reserveMultiMatchOrder,
  confirmMultiMatchOrder,
  releaseMultiMatchOrder,
  finalizeMultiMatchOrder,
  reserveSeasonPassOrder,
  reacquirePartnerReplacementInventory,
  beginPartnerMissingTicketRecovery,
  completePartnerMissingTicketRecovery,
  beginPartnerAdminTicketRecovery,
  completePartnerAdminTicketRecovery,
  recordPartnerAdminTicketRecoveryProgress,
  claimPartnerSeasonPassReissue,
  recordPartnerSeasonPassManualPaymentVerification,
  finishPartnerSeasonPassReissue,
  updatePartnerSeasonPassReissueSync,
  recordPartnerReplacementAdminTicketRecovery,
  claimPartnerSeasonPassRecovery,
  finishPartnerSeasonPassRecovery,
  releaseSeasonPassOrder,
  releaseRefundedSeasonPassOrder,
  releaseRefundedMatchOrder,
  reserveSeasonBox,
  recordPartnerSeasonPassReservation,
  getPartnerSeasonPassReservation,
  beginPartnerSeasonPassIssuance,
  completePartnerSeasonPassIssuance,
  releasePartnerSeasonPassReservation,
  recordOnSpotMatchSale,
};
