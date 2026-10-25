const Inventory = require('../models/NuscHomeMatchInventory');

const BOX_COUNT = 4;
const SEATS_PER_BOX = 8;
const BUYER_TICKET_LIMIT = 10;
const HOLD_MINUTES = 15;
const GENERAL_TICKET_TYPE = 'General Pass';
const MATCH_TICKET_PRICES = {
  'general pass': { price: 358.8, basePrice: 299 },
  'premium pass': { price: 1500, basePrice: 1250 },
  'united suite - single pass': { price: 7200, basePrice: 6000 },
  'united suite - full box': { price: 60000, basePrice: 50000 },
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
  { name: 'G-1', capacity: 600 },
  { name: 'G-2', capacity: 600 },
  { name: 'G-3', capacity: 450 },
  { name: 'G-4', capacity: 600 },
  { name: 'G-5', capacity: 600 },
];
const TICKET_CAPACITIES = {
  'General Pass': GENERAL_SEATING_AREAS.reduce((sum, area) => sum + area.capacity, 0),
  'Premium Pass': 250,
};
const INVENTORY_KEY = 'nusc-il-2026-27';
const FIXTURE_MATCHES = [
  { date: '2026-11-14', opponent: 'Gokulam Kerala FC' },
  { date: '2026-11-30', opponent: 'Dempo SC' },
  { date: '2026-12-15', opponent: 'Sreenidi Deccan FC' },
  { date: '2026-12-19', opponent: 'Mohammedan SC' },
  { date: '2027-01-04', opponent: 'Rajasthan United FC' },
  { date: '2027-01-09', opponent: 'FC Bengaluru United' },
  { date: '2027-01-16', opponent: 'Shillong Lajong FC' },
  { date: '2027-02-06', opponent: 'Chanmari FC' },
  { date: '2027-03-13', opponent: 'Samaleswari SC' },
  { date: '2027-03-20', opponent: 'Real Kashmir FC' },
];
const FIXTURE_DATES = FIXTURE_MATCHES.map((match) => match.date);

const SUITE_SINGLE = 'United Suite — Single pass';
const SUITE_FULL_BOX = 'United Suite — Full Box';
const SUITE_SEASON = 'United Suite — Season';
const SEASON_PASS_TICKET_TYPES = ['General Pass', 'Premium Pass'];

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

async function ensureInventory() {
  await Inventory.updateOne(
    { key: INVENTORY_KEY },
    { $setOnInsert: { key: INVENTORY_KEY, orders: [], generalZoneSales: [], seasonPassOrders: [], seasonReservations: [] } },
    { upsert: true }
  );
  return Inventory.findOne({ key: INVENTORY_KEY }).lean();
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

async function mutateInventory(mutator) {
  await ensureInventory();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const current = await Inventory.findOne({ key: INVENTORY_KEY }).lean();
    if (!current) throw new Error('NUSC suite inventory could not be initialized');
    const state = clone(current);
    state.generalZoneSales ||= [];
    state.seasonPassOrders ||= [];
    pruneExpiredHolds(state);
    const result = await mutator(state);
    const update = await Inventory.updateOne(
      { _id: current._id, __v: current.__v || 0 },
      {
        $set: {
          orders: state.orders,
          generalZoneSales: state.generalZoneSales,
          seasonPassOrders: state.seasonPassOrders,
          seasonReservations: state.seasonReservations,
          updatedAt: new Date(),
        },
        $inc: { __v: 1 },
      }
    );
    if (update.modifiedCount === 1) return result;
  }
  throw new InventoryConflict('Suite inventory changed during checkout. Please try again.', 'INVENTORY_BUSY');
}

function isSuiteType(ticketType) {
  return ticketType === SUITE_SINGLE || ticketType === SUITE_FULL_BOX;
}

function buyerTicketUnits(ticketType, quantity) {
  return ticketType === SUITE_FULL_BOX ? quantity * SEATS_PER_BOX : quantity;
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

function getBoxState(state, matchDate) {
  const activeSeasonBoxes = new Set(
    state.seasonReservations
      .filter((reservation) => reservation.status === 'active')
      .map((reservation) => reservation.boxNumber)
  );
  const orders = activeOrdersForDate(state, matchDate);

  return Array.from({ length: BOX_COUNT }, (_, index) => {
    const boxNumber = index + 1;
    const allocations = orders.flatMap((order) => order.suiteAllocations || [])
      .filter((allocation) => allocation.boxNumber === boxNumber);
    return {
      boxNumber,
      seasonReserved: activeSeasonBoxes.has(boxNumber),
      fullBoxReserved: allocations.some((allocation) => allocation.ticketType === SUITE_FULL_BOX),
      singlePassCount: allocations.filter((allocation) => allocation.ticketType === SUITE_SINGLE).length,
    };
  });
}

function getSuiteAvailability(state, matchDate) {
  const boxes = getBoxState(state, matchDate);
  const eligible = boxes.filter((box) => !box.seasonReserved && !box.fullBoxReserved);
  return {
    fullBoxes: eligible.filter((box) => box.singlePassCount === 0).length,
    singleSeats: eligible.reduce((sum, box) => sum + Math.max(0, SEATS_PER_BOX - box.singlePassCount), 0),
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

function getGeneralZoneAvailability(
  state,
  matchDate,
  ticketSold = 0,
  activeOrders = activeOrdersForDate(state, matchDate),
  activeSeasonOrders = activeSeasonPassOrdersForDate(state, matchDate)
) {
  const salesByZone = new Map(GENERAL_SEATING_AREAS.map((area) => [area.name, 0]));
  for (const sale of state.generalZoneSales || []) {
    if (sale.matchDate === matchDate && salesByZone.has(sale.zone)) {
      salesByZone.set(sale.zone, salesByZone.get(sale.zone) + Number(sale.quantity || 0));
    }
  }

  const heldByZone = new Map(GENERAL_SEATING_AREAS.map((area) => [area.name, 0]));
  let pendingConfirmedZoneSales = 0;
  let unassignedHeld = 0;
  for (const order of activeOrders) {
    if (order.stockApplied) continue;
    for (const line of order.ticketLines || []) {
      if (line.ticketType !== GENERAL_TICKET_TYPE) continue;
      if (heldByZone.has(line.zone)) {
        heldByZone.set(line.zone, heldByZone.get(line.zone) + Number(line.quantity || 0));
        if (order.status === 'confirmed') pendingConfirmedZoneSales += Number(line.quantity || 0);
      } else if (order.status === 'held') {
        unassignedHeld += Number(line.quantity || 0);
      }
    }
  }
  for (const order of activeSeasonOrders.filter((item) => item.ticketType === GENERAL_TICKET_TYPE)) {
    if (heldByZone.has(order.zone)) {
      heldByZone.set(order.zone, heldByZone.get(order.zone) + Number(order.quantity || 0));
      if (order.status === 'confirmed') pendingConfirmedZoneSales += Number(order.quantity || 0);
    } else if (order.status === 'held') {
      unassignedHeld += Number(order.quantity || 0);
    }
  }

  const recordedZoneSales = [...salesByZone.values()].reduce((sum, quantity) => sum + quantity, 0);
  const unknownSold = Math.max(0, Number(ticketSold || 0) - recordedZoneSales - pendingConfirmedZoneSales);
  let unassignedRemaining = unknownSold + unassignedHeld;
  return GENERAL_SEATING_AREAS.map((area) => {
    const knownUsed = salesByZone.get(area.name) + heldByZone.get(area.name);
    const unassignedHere = Math.min(unassignedRemaining, Math.max(0, area.capacity - knownUsed));
    unassignedRemaining -= unassignedHere;
    return {
      name: area.name,
      capacity: area.capacity,
      available: Math.max(0, area.capacity - knownUsed - unassignedHere),
    };
  });
}

function reserveMatchOrderInState(state, { orderId, userId, matchDate, ticketLines, eventTicketTypes, existingUserTicketCount = 0, allowSalesClosed = false }) {
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

    const activeOrders = activeOrdersForDate(state, matchDate);
    const activeSeasonOrders = activeSeasonPassOrdersForDate(state, matchDate);
    const requestedBuyerUnits = normalizedLines.reduce((sum, line) => sum + buyerTicketUnits(line.ticketType, line.quantity), 0);
    const buyerHeldUnits = activeOrders
      .filter((order) => String(order.userId) === String(userId))
      .reduce((sum, order) => sum + (order.ticketLines || []).reduce((lineSum, line) => lineSum + buyerTicketUnits(line.ticketType, line.quantity), 0), 0);
    const seasonBuyerHeldUnits = activeSeasonOrders
      .filter((order) => String(order.userId) === String(userId))
      .reduce((sum, order) => sum + Number(order.quantity || 0), 0);

    if (Number(existingUserTicketCount) + buyerHeldUnits + seasonBuyerHeldUnits + requestedBuyerUnits > BUYER_TICKET_LIMIT) {
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
      if (line.ticketType === SUITE_SEASON) {
        throw new InventoryConflict('United Suite season bookings are handled by staff.', 'CALL_TO_BOOK');
      }
      if (isSuiteType(line.ticketType)) continue;
      const ticket = stockByName.get(line.ticketType);
      if (!ticket) throw new InventoryConflict(`Ticket type ${line.ticketType} is not configured for this match.`, 'TICKET_NOT_CONFIGURED');
      const capacity = TICKET_CAPACITIES[line.ticketType] ?? Number(ticket.quantity || 0);
      const available = Math.max(0, capacity - Number(ticket.sold || 0) - (heldByTicketType.get(line.ticketType) || 0));
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
      activeSeasonOrders
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

    for (const line of linesWithIndex.filter((item) => item.ticketType === SUITE_FULL_BOX)) {
      for (let i = 0; i < line.quantity; i += 1) {
        const boxNumber = Array.from({ length: BOX_COUNT }, (_, index) => index + 1).find((candidate) => {
          const allocations = allocationByBox.get(candidate) || [];
          return !seasonBoxes.has(candidate) && allocations.length === 0;
        });
        if (!boxNumber) throw new InventoryConflict('No full United Suite boxes remain for this match.', 'SUITE_BOXES_UNAVAILABLE');
        const allocation = { ticketType: SUITE_FULL_BOX, ticketIndex: line.startIndex + i, boxNumber };
        suiteAllocations.push(allocation);
        allocationByBox.get(boxNumber).push(allocation);
      }
    }

    for (const line of linesWithIndex.filter((item) => item.ticketType === SUITE_SINGLE)) {
      for (let i = 0; i < line.quantity; i += 1) {
        const boxNumber = Array.from({ length: BOX_COUNT }, (_, index) => index + 1).find((candidate) => {
          if (seasonBoxes.has(candidate)) return false;
          const allocations = allocationByBox.get(candidate) || [];
          return !allocations.some((allocation) => allocation.ticketType === SUITE_FULL_BOX) &&
            allocations.filter((allocation) => allocation.ticketType === SUITE_SINGLE).length < SEATS_PER_BOX;
        });
        if (!boxNumber) throw new InventoryConflict('No United Suite seats remain for this match.', 'SUITE_SEATS_UNAVAILABLE');
        const allocation = { ticketType: SUITE_SINGLE, ticketIndex: line.startIndex + i, boxNumber };
        suiteAllocations.push(allocation);
        allocationByBox.get(boxNumber).push(allocation);
      }
    }

    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
    const order = {
      orderId,
      userId,
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
  return mutateInventory((state) => reserveMatchOrderInState(state, args));
}

async function reserveMultiMatchOrder({ orderId, userId, matches, allowSalesClosed = false }) {
  if (!TICKET_SALES_ENABLED && !allowSalesClosed) {
    throw new InventoryConflict('Tickets for NUSC home matches are not on sale yet.', 'SALES_NOT_OPEN');
  }
  if (!Array.isArray(matches) || matches.length < 2 || matches.length > FIXTURE_DATES.length ||
      new Set(matches.map((match) => match.matchDate)).size !== matches.length ||
      matches.some((match) => !FIXTURE_DATES.includes(match.matchDate))) {
    throw new InventoryConflict('Select at least two valid NUSC match dates.', 'INVALID_MATCH_DATE');
  }
  return mutateInventory((state) => matches.map((match) => reserveMatchOrderInState(state, {
    orderId: `${orderId}|${match.matchDate}`,
    userId,
    matchDate: match.matchDate,
    ticketLines: match.ticketLines,
    eventTicketTypes: match.eventTicketTypes,
    existingUserTicketCount: match.existingUserTicketCount || 0,
    allowSalesClosed: true,
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

async function reserveSeasonPassOrder({ orderId, userId, ticketType, quantity, zone = '', matches, existingUserTicketCountByDate = {}, allowSalesClosed = false }) {
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

    for (const match of matches) {
      const activeOrders = activeOrdersForDate(state, match.matchDate);
      const activeSeasonOrders = activeSeasonPassOrdersForDate(state, match.matchDate);
      const userMatchHolds = activeOrders
        .filter((order) => String(order.userId) === String(userId))
        .reduce((sum, order) => sum + (order.ticketLines || []).reduce((lineSum, line) => lineSum + buyerTicketUnits(line.ticketType, line.quantity), 0), 0);
      const userSeasonHolds = activeSeasonOrders
        .filter((order) => String(order.userId) === String(userId))
        .reduce((sum, order) => sum + Number(order.quantity || 0), 0);
      if (Number(existingUserTicketCountByDate[match.matchDate] || 0) + userMatchHolds + userSeasonHolds + normalizedQuantity > BUYER_TICKET_LIMIT) {
        throw new InventoryConflict(`You can buy at most ${BUYER_TICKET_LIMIT} tickets for ${match.matchDate}, including season passes.`, 'BUYER_TICKET_LIMIT');
      }

      const ticket = (match.ticketTypes || []).find((item) => item.name === ticketType);
      if (!ticket) throw new InventoryConflict(`${ticketType} is not configured for every home match.`, 'TICKET_NOT_CONFIGURED');
      const capacity = TICKET_CAPACITIES[ticketType] ?? Number(ticket.quantity || 0);
      const matchHeld = activeOrders.reduce((sum, order) => order.stockApplied ? sum : sum + (order.ticketLines || [])
        .filter((line) => line.ticketType === ticketType)
        .reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0), 0);
      const seasonHeld = activeSeasonOrders
        .filter((order) => order.ticketType === ticketType)
        .reduce((sum, order) => sum + Number(order.quantity || 0), 0);
      const available = Math.max(0, capacity - Number(ticket.sold || 0) - matchHeld - seasonHeld);
      if (normalizedQuantity > available) {
        throw new InventoryConflict(`Only ${available} ${ticketType} season pass(es) remain across all fixtures.`, 'TICKETS_UNAVAILABLE');
      }
      if (ticketType === GENERAL_TICKET_TYPE) {
        const zoneAvailability = getGeneralZoneAvailability(state, match.matchDate, ticket.sold || 0, activeOrders, activeSeasonOrders)
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
    state.seasonPassOrders = state.seasonPassOrders.filter((item) => item.orderId !== orderId);
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
    order.ticketLines = [];
    return order;
  });
}

async function finalizeMatchOrder(orderId) {
  return mutateInventory((state) => {
    const order = state.orders.find((item) => item.orderId === orderId);
    if (!order) return null;
    if (order.suiteAllocations?.length) {
      order.stockApplied = true;
      order.ticketLines = [];
      return order;
    }
    state.orders = state.orders.filter((item) => item.orderId !== orderId);
    return order;
  });
}

function getPublicTicketTypes(state, matchDate, eventTicketTypes = []) {
  if (!TICKET_SALES_ENABLED) {
    return eventTicketTypes.map((source) => {
      const ticket = typeof source?.toObject === 'function' ? source.toObject() : source;
      return {
        ...ticket,
        ...(getMatchTicketPrice(ticket.name) || {}),
        quantity: 0,
        sold: 0,
        ...(ticket.name === GENERAL_TICKET_TYPE && {
          zones: GENERAL_SEATING_AREAS.map((area) => ({ ...area, available: 0 })),
        }),
      };
    });
  }
  const activeOrders = activeOrdersForDate(state, matchDate);
  const activeSeasonOrders = activeSeasonPassOrdersForDate(state, matchDate);
  const suite = getSuiteAvailability(state, matchDate);
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
  return eventTicketTypes.map((source) => {
    const ticket = typeof source?.toObject === 'function' ? source.toObject() : source;
    if (ticket.name === SUITE_SINGLE) {
      return { ...ticket, ...(getMatchTicketPrice(ticket.name) || {}), quantity: suite.singleSeats, sold: 0 };
    }
    if (ticket.name === SUITE_FULL_BOX) {
      return { ...ticket, ...(getMatchTicketPrice(ticket.name) || {}), quantity: suite.fullBoxes, sold: 0 };
    }
    const capacity = TICKET_CAPACITIES[ticket.name] ?? Number(ticket.quantity || 0);
    const available = Math.max(0, capacity - Number(ticket.sold || 0) - (heldByTicketType.get(ticket.name) || 0));
    return {
      ...ticket,
      ...(getMatchTicketPrice(ticket.name) || {}),
      quantity: available,
      sold: 0,
      ...(ticket.name === GENERAL_TICKET_TYPE && {
        zones: getGeneralZoneAvailability(state, matchDate, ticket.sold || 0, activeOrders, activeSeasonOrders),
      }),
    };
  });
}

async function getMatchAvailability(matchDate, eventTicketTypes = []) {
  if (!FIXTURE_DATES.includes(matchDate)) return null;
  return mutateInventory((state) => getPublicTicketTypes(state, matchDate, eventTicketTypes));
}

async function getMatchAvailabilities(matches = []) {
  const validMatches = matches.filter((match) => FIXTURE_DATES.includes(match.matchDate));
  if (validMatches.length === 0) return {};
  return mutateInventory((state) => Object.fromEntries(validMatches.map((match) => [
    match.key,
    getPublicTicketTypes(state, match.matchDate, match.ticketTypes),
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
    const activeOrders = state.orders.filter((order) => order.status === 'confirmed' || (order.status === 'held' && new Date(order.expiresAt) > new Date()));
    const boxNumber = Array.from({ length: BOX_COUNT }, (_, index) => index + 1).find((candidate) => {
      if (alreadySeasonReserved.has(candidate)) return false;
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
  BUYER_TICKET_LIMIT,
  FIXTURE_DATES,
  GENERAL_TICKET_TYPE,
  GENERAL_SEATING_AREAS,
  getMatchTicketPrice,
  MATCH_TICKET_PRICES,
  HOLD_MINUTES,
  FIXTURE_MATCHES,
  InventoryConflict,
  NUSC_TEST_MODE_ENABLED,
  SUITE_FULL_BOX,
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
  listSeasonBoxes,
  markTicketStockApplied,
  markSeasonPassStockApplied,
  matchDateFromSlug,
  releaseMatchOrder,
  reserveMatchOrder,
  reserveMultiMatchOrder,
  confirmMultiMatchOrder,
  releaseMultiMatchOrder,
  finalizeMultiMatchOrder,
  reserveSeasonPassOrder,
  releaseSeasonPassOrder,
  releaseRefundedMatchOrder,
  reserveSeasonBox,
};
