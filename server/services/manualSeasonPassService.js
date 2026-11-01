const crypto = require('crypto');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const ManualSeasonPassOrder = require('../models/ManualSeasonPassOrder');
const User = require('../models/User');
const inventory = require('./nuscHomeMatchInventoryService');
const { createSeasonPassTicketRecords } = require('./nuscSeasonPassBookingService');
const PASS_OPTIONS = require('../config/nuscHomeMatchPricing');

const PAYMENT_METHODS = new Set(['Cash', 'Card', 'UPI']);

class ManualSeasonPassError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ManualSeasonPassError';
    this.status = status;
    this.code = code;
  }
}

function requestHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function safeOrder(order) {
  return {
    orderId: order.orderId,
    status: order.status,
    passId: order.passId,
    ticketType: order.ticketType,
    zone: order.zone || null,
    amountMinor: order.listAmountMinor,
    currency: 'INR',
    settlementType: order.settlementType || null,
    modeOfPayment: order.modeOfPayment || null,
    reservationExpiresAt: order.reservationExpiresAt || null,
    bookingIds: (order.bookingIds || []).map(String),
    errorCode: order.errorCode || null,
  };
}

async function loadFixtures(pass, { forReservation = true } = {}) {
  if (forReservation && !inventory.TICKET_SALES_ENABLED) {
    throw new ManualSeasonPassError(409, 'SALES_CLOSED', 'Season pass sales are not open.');
  }

  const slugs = inventory.FIXTURE_MATCHES.map(({ date }) => `nusc-home-match-${date.replace(/-/g, '')}`);
  const events = await Event.find({ slug: { $in: slugs } }).select('+ticketTypes');
  const eventsBySlug = new Map(events.map((event) => [event.slug, event]));
  const fixtures = inventory.FIXTURE_MATCHES.map((match, index) => {
    const slug = `nusc-home-match-${match.date.replace(/-/g, '')}`;
    return { ...match, matchDate: match.date, matchIndex: index + 1, event: eventsBySlug.get(slug) };
  });

  if (fixtures.some(({ event }) => !event || event.status !== 'approved' || event.isPublic === false)) {
    throw new ManualSeasonPassError(409, 'FIXTURES_UNAVAILABLE', 'All ten home match listings must be available.');
  }
  if (forReservation && new Date(fixtures[0].event.startDate) <= new Date()) {
    throw new ManualSeasonPassError(409, 'SALES_CLOSED', 'Season pass sales have closed because the first home match has started.');
  }
  if (fixtures.some(({ event }) => !event.ticketTypes.some((ticket) => ticket.name === pass.ticketType))) {
    throw new ManualSeasonPassError(409, 'PASS_NOT_CONFIGURED', `${pass.ticketType} is not configured for every home match.`);
  }
  return fixtures;
}

async function existingUserTicketCounts(fixtures, userId, excludeManualOrderId = null) {
  const counts = {};
  await Promise.all(fixtures.map(async (fixture) => {
    const bookings = await Booking.find({
      event: fixture.event._id,
      user: userId,
      ...(excludeManualOrderId ? { manualSeasonPassOrderId: { $ne: excludeManualOrderId } } : {}),
      status: { $in: ['pending', 'confirmed', 'checked-in'] },
      paymentStatus: { $in: ['pending', 'completed'] },
    }).select('ticketType quantity');
    counts[fixture.matchDate] = bookings.reduce((sum, booking) => {
      const quantity = Number(booking.quantity) || 0;
      return sum + (booking.ticketType === inventory.SUITE_FULL_BOX || booking.ticketType === inventory.SUITE_SEASON
        ? quantity * 8
        : quantity);
    }, 0);
  }));
  return counts;
}

async function zoneSoldCounts(fixtures, pass, zone, excludeManualOrderId = null) {
  if (pass.ticketType !== 'General Pass' || !zone) return {};
  const counts = {};
  await Promise.all(fixtures.map(async (fixture) => {
    counts[fixture.matchDate] = await Booking.countDocuments({
      event: fixture.event._id,
      ticketType: pass.ticketType,
      nuscGeneralZone: zone,
      ...(excludeManualOrderId ? { manualSeasonPassOrderId: { $ne: excludeManualOrderId } } : {}),
      status: { $in: ['confirmed', 'checked-in'] },
      paymentStatus: 'completed',
    });
  }));
  return counts;
}

async function getOrCreateOrder({ requestId, requestHashValue, userId, adminId, passId, zone }) {
  let order = await ManualSeasonPassOrder.findOne({ requestId });
  if (order) {
    if (order.requestHash !== requestHashValue) {
      throw new ManualSeasonPassError(409, 'REQUEST_ID_CONFLICT', 'This request ID was already used for different booking details.');
    }
    return order;
  }

  const pass = PASS_OPTIONS[passId];
  try {
    return await ManualSeasonPassOrder.create({
      orderId: crypto.randomUUID(),
      requestId,
      requestHash: requestHashValue,
      user: userId,
      createdBy: adminId,
      passId,
      ticketType: pass.ticketType,
      zone: zone || null,
      listAmountMinor: pass.amountMinor,
      status: 'reserving',
      operationsAudit: [{ action: 'reservation_started', admin: adminId, details: { passId, zone: zone || null } }],
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    order = await ManualSeasonPassOrder.findOne({ requestId });
    if (!order || order.requestHash !== requestHashValue) {
      throw new ManualSeasonPassError(409, 'REQUEST_ID_CONFLICT', 'This request ID was already used for different booking details.');
    }
    return order;
  }
}

async function reserveAhibiManualSeasonPass({ requestId, userId, adminId, passId, zone = null }) {
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(String(requestId || ''))) {
    throw new ManualSeasonPassError(400, 'REQUEST_ID_REQUIRED', 'Refresh the form and try again.');
  }
  const pass = PASS_OPTIONS[passId];
  if (!pass) throw new ManualSeasonPassError(400, 'INVALID_PASS', 'Choose a valid season pass.');
  if (pass.ticketType === 'Premium Pass' && zone !== null) {
    throw new ManualSeasonPassError(400, 'INVALID_ZONE', 'Premium season passes do not use a seating zone.');
  }
  if (pass.ticketType === 'General Pass' && !zone) {
    throw new ManualSeasonPassError(400, 'INVALID_ZONE', 'Choose a General seating zone.');
  }
  if (zone !== null && !inventory.GENERAL_SEATING_AREAS.some((area) => `G-${area.name.slice(1)}` === zone)) {
    throw new ManualSeasonPassError(400, 'INVALID_ZONE', 'Choose a valid General seating zone.');
  }

  const user = await User.findOne({ _id: userId, role: 'user', status: 'active' }).select('_id');
  if (!user) throw new ManualSeasonPassError(404, 'USER_NOT_ELIGIBLE', 'Select an active AHIBI user account.');

  const normalizedZone = zone || null;
  const hash = requestHash({ userId: String(user._id), passId, zone: normalizedZone });
  await ManualSeasonPassOrder.init();
  const order = await getOrCreateOrder({
    requestId,
    requestHashValue: hash,
    userId: user._id,
    adminId,
    passId,
    zone: normalizedZone,
  });

  if (order.status === 'reserved' && order.reservationExpiresAt && new Date(order.reservationExpiresAt) <= new Date()) {
    await inventory.releaseSeasonPassOrder(order.orderId);
    order.status = 'failed';
    order.errorCode = 'HOLD_EXPIRED';
    order.operationsAudit.push({ action: 'reservation_expired', admin: adminId, details: {} });
    await order.save();
  }
  if (order.status === 'issued' || order.status === 'reserved' || order.status === 'settling' || order.status === 'needs_reconciliation') {
    return safeOrder(order);
  }
  if (order.status === 'cancelled') throw new ManualSeasonPassError(409, 'ORDER_CANCELLED', 'This reservation was cancelled. Start a new booking.');
  if (order.settlementHash) throw new ManualSeasonPassError(409, 'SETTLEMENT_STARTED', 'Settlement has already started. Retry issuance for this order.');

  const fixtures = await loadFixtures(pass);
  const [existingUserTicketCountByDate, zoneSoldByDate] = await Promise.all([
    existingUserTicketCounts(fixtures, user._id),
    zoneSoldCounts(fixtures, pass, normalizedZone),
  ]);

  try {
    const hold = await inventory.reserveSeasonPassOrder({
      orderId: order.orderId,
      userId: user._id,
      ticketType: pass.ticketType,
      quantity: 1,
      zone: normalizedZone,
      zoneSoldByDate,
      matches: fixtures.map(({ matchDate, event }) => ({ matchDate, ticketTypes: event.ticketTypes })),
      existingUserTicketCountByDate,
    });
    order.status = 'reserved';
    order.reservationExpiresAt = hold.expiresAt;
    order.errorCode = null;
    order.operationsAudit.push({ action: 'inventory_reserved', admin: adminId, details: { expiresAt: hold.expiresAt } });
    await order.save();
    return safeOrder(order);
  } catch (error) {
    order.status = 'failed';
    order.errorCode = error.code || 'RESERVATION_FAILED';
    order.operationsAudit.push({ action: 'reservation_failed', admin: adminId, details: { code: order.errorCode } });
    await order.save();
    if (error instanceof inventory.InventoryConflict) {
      throw new ManualSeasonPassError(409, error.code, error.message);
    }
    throw error;
  }
}

function normalizeSettlement(input) {
  const settlementType = input?.settlementType;
  if (settlementType === 'paid') {
    const modeOfPayment = String(input?.modeOfPayment || '');
    if (!PAYMENT_METHODS.has(modeOfPayment)) {
      throw new ManualSeasonPassError(400, 'PAYMENT_METHOD_REQUIRED', 'Choose Cash, Card, or UPI.');
    }
    const paymentReference = typeof input.paymentReference === 'string' ? input.paymentReference.trim() : '';
    if (paymentReference.length > 120) throw new ManualSeasonPassError(400, 'INVALID_PAYMENT_REFERENCE', 'Payment reference is too long.');
    return {
      settlementType,
      modeOfPayment,
      paymentReference: paymentReference || null,
      complimentaryReason: null,
    };
  }
  if (settlementType === 'complimentary') {
    const complimentaryReason = typeof input?.complimentaryReason === 'string' ? input.complimentaryReason.trim() : '';
    if (complimentaryReason.length < 5 || complimentaryReason.length > 500) {
      throw new ManualSeasonPassError(400, 'COMPLIMENTARY_REASON_REQUIRED', 'Enter a complimentary booking reason between 5 and 500 characters.');
    }
    return {
      settlementType,
      modeOfPayment: null,
      paymentReference: null,
      complimentaryReason,
    };
  }
  throw new ManualSeasonPassError(400, 'INVALID_SETTLEMENT_TYPE', 'Choose paid or complimentary settlement.');
}

async function issueAhibiManualSeasonPass(order, adminId) {
  const pass = PASS_OPTIONS[order.passId];
  const fixtures = await loadFixtures(pass, { forReservation: false });
  const issued = await createSeasonPassTicketRecords({
    orderId: order.orderId,
    userId: order.user,
    fixtures: fixtures.map(({ matchDate, matchIndex, event }) => ({
      eventId: event._id,
      matchDate,
      matchIndex,
      ticketType: order.ticketType,
    })),
    passId: order.passId,
    quantity: 1,
    paymentProvider: 'manual',
    zone: order.zone,
    manualOrderId: order.orderId,
    pricePerMatch: order.settlementType === 'paid' ? order.listAmountMinor / 100 / inventory.FIXTURE_DATES.length : 0,
    settlementType: order.settlementType,
    modeOfPayment: order.modeOfPayment,
  });

  if (issued.bookings.length !== inventory.FIXTURE_DATES.length || new Set(issued.bookings.map((booking) => String(booking.event))).size !== inventory.FIXTURE_DATES.length) {
    throw new ManualSeasonPassError(502, 'INCOMPLETE_ISSUANCE', 'The pass is still being issued. Retry this order; do not create another pass.');
  }
  await inventory.markSeasonPassStockApplied(order.orderId);
  order.bookingIds = issued.bookingIds;
  order.status = 'issued';
  order.errorCode = null;
  order.operationsAudit.push({ action: 'tickets_issued', admin: adminId, details: { ticketCount: issued.bookingIds.length } });
  await order.save();
  return issued;
}

async function confirmManualSeasonPassInventory(order, adminId) {
  try {
    await inventory.confirmSeasonPassOrder(order.orderId);
    return;
  } catch (error) {
    if (!(error instanceof inventory.InventoryConflict) || error.code !== 'HOLD_EXPIRED') throw error;
  }

  const pass = PASS_OPTIONS[order.passId];
  const fixtures = await loadFixtures(pass, { forReservation: false });
  const [existingUserTicketCountByDate, zoneSoldByDate] = await Promise.all([
    existingUserTicketCounts(fixtures, order.user, order.orderId),
    zoneSoldCounts(fixtures, pass, order.zone, order.orderId),
  ]);
  // The original hold expired before settlement completed. Release that
  // exact order first so the inventory service rechecks capacity under the
  // same idempotent order key.
  await inventory.releaseSeasonPassOrder(order.orderId);
  const hold = await inventory.reserveSeasonPassOrder({
    orderId: order.orderId,
    userId: order.user,
    ticketType: order.ticketType,
    quantity: 1,
    zone: order.zone,
    zoneSoldByDate,
    matches: fixtures.map(({ matchDate, event }) => ({ matchDate, ticketTypes: event.ticketTypes })),
    existingUserTicketCountByDate,
    allowSalesClosed: true,
  });
  order.reservationExpiresAt = hold.expiresAt;
  order.operationsAudit.push({ action: 'inventory_reservation_recovered', admin: adminId, details: { expiresAt: hold.expiresAt } });
  await order.save();
  await inventory.confirmSeasonPassOrder(order.orderId);
}

async function settleAhibiManualSeasonPass({ orderId, adminId, settlement: settlementInput }) {
  let order = await ManualSeasonPassOrder.findOne({ orderId });
  if (!order) throw new ManualSeasonPassError(404, 'ORDER_NOT_FOUND', 'Season pass reservation was not found.');
  const settlement = normalizeSettlement(settlementInput);
  const settlementHash = requestHash(settlement);
  if (order.settlementHash && order.settlementHash !== settlementHash) {
    throw new ManualSeasonPassError(409, 'SETTLEMENT_CONFLICT', 'This order already has a different payment or complimentary record.');
  }
  if (order.status === 'issued') return { ...safeOrder(order), bookings: await Booking.find({ manualSeasonPassOrderId: order.orderId }).sort({ manualSeasonPassMatchIndex: 1 }).lean() };
  if (order.status === 'cancelled' || order.status === 'failed' && !order.settlementHash) {
    throw new ManualSeasonPassError(409, 'ORDER_NOT_RESERVED', 'Reserve an available season pass before recording settlement.');
  }

  if (!order.settlementHash) {
    const claimed = await ManualSeasonPassOrder.findOneAndUpdate({
      _id: order._id,
      settlementHash: null,
      status: { $in: ['reserved', 'settling', 'needs_reconciliation'] },
    }, {
      $set: {
        settlementType: settlement.settlementType,
        modeOfPayment: settlement.modeOfPayment,
        paymentReference: settlement.paymentReference,
        complimentaryReason: settlement.complimentaryReason,
        settlementHash,
        settledAmountMinor: settlement.settlementType === 'paid' ? order.listAmountMinor : 0,
        settledBy: adminId,
        settledAt: new Date(),
        status: 'settling',
        errorCode: null,
      },
      $push: {
        operationsAudit: {
          action: settlement.settlementType === 'complimentary' ? 'complimentary_recorded' : 'offline_payment_recorded',
          admin: adminId,
          at: new Date(),
          details: {
            settlementType: settlement.settlementType,
            modeOfPayment: settlement.modeOfPayment || null,
            settledAmountMinor: settlement.settlementType === 'paid' ? order.listAmountMinor : 0,
          },
        },
      },
    }, { new: true });
    if (claimed) {
      order = claimed;
    } else {
      order = await ManualSeasonPassOrder.findOne({ orderId });
      if (!order || order.settlementHash !== settlementHash) {
        throw new ManualSeasonPassError(409, 'SETTLEMENT_CONFLICT', 'This order already has a different payment or complimentary record.');
      }
    }
  } else {
    await ManualSeasonPassOrder.updateOne({
      _id: order._id,
      settlementHash,
      status: { $in: ['settling', 'needs_reconciliation'] },
    }, { $set: { status: 'settling', errorCode: null } });
    order.status = 'settling';
    order.errorCode = null;
  }

  try {
    await confirmManualSeasonPassInventory(order, adminId);
    order.status = 'settling';
    order.errorCode = null;
    await order.save();

    const issued = await issueAhibiManualSeasonPass(order, adminId);
    return { ...safeOrder(order), bookings: issued.bookings };
  } catch (error) {
    order.status = order.settlementHash ? 'needs_reconciliation' : 'failed';
    order.errorCode = error.code || 'ISSUANCE_PENDING';
    order.operationsAudit.push({
      action: order.settlementHash ? 'issuance_recovery_required' : 'reservation_lost_before_settlement',
      admin: adminId,
      details: { code: order.errorCode },
    });
    await order.save().catch((saveError) => console.error('Could not save manual season pass recovery status:', saveError.message));
    if (error instanceof ManualSeasonPassError) throw error;
    if (error instanceof inventory.InventoryConflict) {
      throw new ManualSeasonPassError(409, error.code, error.message);
    }
    throw new ManualSeasonPassError(502, 'ISSUANCE_PENDING', 'Payment was recorded, but ticket issuance needs recovery. Retry this order; do not create another pass.');
  }
}

async function cancelAhibiManualSeasonPass({ orderId, adminId }) {
  const order = await ManualSeasonPassOrder.findOne({ orderId });
  if (!order) throw new ManualSeasonPassError(404, 'ORDER_NOT_FOUND', 'Season pass reservation was not found.');
  if (order.status === 'cancelled') return safeOrder(order);
  if (order.settlementHash || !['reserved', 'failed'].includes(order.status)) {
    throw new ManualSeasonPassError(409, 'ORDER_NOT_CANCELLABLE', 'A settled or issuing pass cannot be cancelled here.');
  }
  await inventory.releaseSeasonPassOrder(order.orderId);
  order.status = 'cancelled';
  order.operationsAudit.push({ action: 'reservation_cancelled', admin: adminId, details: {} });
  await order.save();
  return safeOrder(order);
}

module.exports = {
  ManualSeasonPassError,
  cancelAhibiManualSeasonPass,
  normalizeSettlement,
  reserveAhibiManualSeasonPass,
  settleAhibiManualSeasonPass,
};
