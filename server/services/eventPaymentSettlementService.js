const crypto = require('crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Coupon = require('../models/Coupon');
const Event = require('../models/Event');
const DailyEvent = require('../models/DailyEvent');
const User = require('../models/User');
const PaymentTransaction = require('../models/PaymentTransaction');
const PendingPaymentSession = require('../models/PendingPaymentSession');
const QRCode = require('qrcode');
const { computeCouponDiscount } = require('../utils/couponDiscount');
const paymentFulfillmentAlertService = require('./paymentFulfillmentAlertService');

const SETTLEMENT_LEASE_MS = 2 * 60 * 1000;
const MAX_SETTLEMENT_ATTEMPTS = 12;
const RETRY_BACKOFF_MS = [60 * 1000, 2 * 60 * 1000, 5 * 60 * 1000, 10 * 60 * 1000, 20 * 60 * 1000, 30 * 60 * 1000];

class PaymentSettlementError extends Error {
  constructor(message, code, statusCode = 409, terminal = false) {
    super(message);
    this.name = 'PaymentSettlementError';
    this.code = code;
    this.statusCode = statusCode;
    this.terminal = terminal;
  }
}

function toPaise(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new PaymentSettlementError('Ticket price is invalid.', 'INVALID_PRICE', 400);
  }
  const paise = Math.round((amount + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(paise)) {
    throw new PaymentSettlementError('Ticket price is outside the supported range.', 'INVALID_PRICE', 400);
  }
  return paise;
}

function expandPaymentTicketUnits(tickets, paymentId, maxTickets = 10) {
  if (!Array.isArray(tickets) || !paymentId) {
    throw new PaymentSettlementError('Saved ticket details are unavailable.', 'INVALID_SAVED_TICKETS', 409);
  }

  const expected = [];
  for (const ticket of tickets) {
    const quantity = Number(ticket?.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || !ticket?.ticketType || !ticket?.ticketTypeId) {
      throw new PaymentSettlementError('Saved ticket quantity or type is invalid.', 'INVALID_SAVED_TICKETS', 409);
    }

    for (let i = 0; i < quantity; i += 1) {
      expected.push({
        key: `${paymentId}:${expected.length + 1}`,
        ticketType: ticket.ticketType,
        ticketTypeId: ticket.ticketTypeId,
        price: Number(ticket.price),
        selectedDate: ticket.selectedDate || null,
      });
      if (expected.length > maxTickets) {
        throw new PaymentSettlementError('Saved ticket quantity is invalid.', 'INVALID_SAVED_TICKETS', 409);
      }
    }
  }

  if (expected.length === 0) {
    throw new PaymentSettlementError('Saved ticket quantity is invalid.', 'INVALID_SAVED_TICKETS', 409);
  }
  return expected;
}

async function buildCanonicalCheckout({ bookingDetails, coupon, authenticatedUser }) {
  const eventId = bookingDetails?.event?._id || bookingDetails?.event;
  const dailyEventId = bookingDetails?.dailyEvent?._id || bookingDetails?.dailyEvent;
  const isDailyEvent = Boolean(dailyEventId);
  const requestedUserId = bookingDetails?.user?.id || bookingDetails?.user?._id;
  const authenticatedUserId = authenticatedUser?._id?.toString();

  if ((!mongoose.isValidObjectId(eventId) && !mongoose.isValidObjectId(dailyEventId)) ||
      (eventId && dailyEventId) || !authenticatedUserId) {
    throw new PaymentSettlementError('Event or signed-in user is invalid.', 'INVALID_CHECKOUT', 400);
  }
  if (!requestedUserId || requestedUserId.toString() !== authenticatedUserId) {
    throw new PaymentSettlementError('Booking user does not match the signed-in account.', 'USER_MISMATCH', 403);
  }

  const event = isDailyEvent ? null : await Event.findById(eventId);
  const dailyEvent = isDailyEvent ? await DailyEvent.findById(dailyEventId) : null;
  const catalog = isDailyEvent ? dailyEvent : event;
  if (!catalog) throw new PaymentSettlementError('Event was not found.', 'EVENT_NOT_FOUND', 404);

  let selectedDate = null;
  if (isDailyEvent) {
    const selectedDateValue = bookingDetails?.selectedDate || bookingDetails?.tickets?.[0]?.selectedDate;
    const selectedDateDate = selectedDateValue ? new Date(selectedDateValue) : null;
    if (!selectedDateDate || Number.isNaN(selectedDateDate.getTime())) {
      throw new PaymentSettlementError('Choose a valid event date.', 'INVALID_EVENT_DATE', 400);
    }
    const selectedDateKey = selectedDateDate.toISOString().slice(0, 10);
    const matchesDate = (dates) => (dates || []).some((date) => new Date(date).toISOString().slice(0, 10) === selectedDateKey);
    if (!matchesDate(dailyEvent.activeDates) || matchesDate(dailyEvent.excludedDates)) {
      throw new PaymentSettlementError('The selected date is not available for this event.', 'EVENT_DATE_UNAVAILABLE', 409);
    }
    if (dailyEvent.bookingEndTime && new Date(dailyEvent.bookingEndTime) < new Date()) {
      throw new PaymentSettlementError('Bookings are closed for this event.', 'BOOKING_CLOSED', 409);
    }
    selectedDate = new Date(selectedDateKey + 'T00:00:00.000Z');
  } else if (event.bookingEndTime || event.endDate) {
    const cutoff = new Date(event.bookingEndTime || event.endDate);
    if (!Number.isNaN(cutoff.getTime()) && cutoff < new Date()) {
      throw new PaymentSettlementError('Bookings are closed for this event.', 'BOOKING_CLOSED', 409);
    }
  }

  if (!Array.isArray(bookingDetails?.tickets) || bookingDetails.tickets.length === 0) {
    throw new PaymentSettlementError('Select at least one ticket.', 'NO_TICKETS', 400);
  }

  const tickets = bookingDetails.tickets.map((requested) => {
    const quantity = Number(requested.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new PaymentSettlementError('Ticket quantity is invalid.', 'INVALID_QUANTITY', 400);
    }
    const requestedName = String(requested.ticketType || '').trim();
    const requestedTypeId = requested.ticketTypeId || (mongoose.isValidObjectId(requested.ticketType) ? requested.ticketType : null);
    const matches = (catalog.ticketTypes || []).filter((ticket) => (
      requestedTypeId && mongoose.isValidObjectId(requestedTypeId)
        ? ticket._id.toString() === requestedTypeId.toString()
        : ticket.name === requestedName
    ));
    if (matches.length !== 1) {
      throw new PaymentSettlementError('A selected ticket type is no longer available.', 'TICKET_TYPE_NOT_FOUND', 409);
    }
    const ticket = matches[0];
    const pricePaise = toPaise(ticket.price);
    if (requested.price != null && toPaise(requested.price) !== pricePaise) {
      throw new PaymentSettlementError(
        'Ticket prices changed while checkout was open. Refresh checkout and review the updated total before paying.',
        'TICKET_PRICE_CHANGED',
        409,
      );
    }
    return {
      ticketType: ticket.name,
      ticketTypeId: ticket._id,
      quantity,
      price: pricePaise / 100,
      pricePaise,
    };
  });

  const subtotalPaise = tickets.reduce((sum, ticket) => sum + ticket.pricePaise * ticket.quantity, 0);
  const totalQuantity = tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  if (!Number.isSafeInteger(subtotalPaise) || totalQuantity > 10) {
    throw new PaymentSettlementError('Checkout total is outside the supported range.', 'INVALID_TOTAL', 400);
  }

  let appliedCoupon = null;
  let discountPaise = 0;
  const couponCode = coupon?.code || bookingDetails?.coupon?.code;
  if (couponCode) {
    const dbCoupon = await Coupon.findOne({ code: String(couponCode).trim().toUpperCase() });
    if (!dbCoupon || String(dbCoupon.event?.id) !== catalog._id.toString() ||
        (dbCoupon.expiresAt && new Date(dbCoupon.expiresAt) < new Date())) {
      throw new PaymentSettlementError('The selected coupon is not valid for this event.', 'COUPON_INVALID', 409);
    }
    const discountResult = computeCouponDiscount(dbCoupon, tickets.map(({ ticketType, quantity, price }) => ({ ticketType, quantity, price })));
    if (discountResult.error) {
      throw new PaymentSettlementError(discountResult.error, 'COUPON_INVALID', 409);
    }
    if (discountResult.discountAmount > 0) {
      discountPaise = Math.min(subtotalPaise, toPaise(discountResult.discountAmount));
      appliedCoupon = {
        code: dbCoupon.code,
        ticketCategory: discountResult.ticketCategory || dbCoupon.ticketCategory,
        discountPercentage: dbCoupon.discountPercentage,
        discountPrice: dbCoupon.discountPrice,
        discountAmount: discountPaise / 100,
      };
    }
  }

  const amountPaise = subtotalPaise - discountPaise;
  const userSnapshot = {
    id: authenticatedUserId,
    name: authenticatedUser.name,
    email: authenticatedUser.email,
    phone: authenticatedUser.phone,
  };
  const eventSnapshot = {
    _id: catalog._id.toString(),
    title: catalog.title,
    banner: catalog.banner,
    startDate: isDailyEvent ? selectedDate : catalog.startDate,
    endDate: isDailyEvent ? selectedDate : catalog.endDate,
    location: {
      address: catalog.location?.address,
      city: catalog.location?.city,
    },
  };

  return {
    amountPaise,
    bookingDetails: {
      ...bookingDetails,
      ...(isDailyEvent
        ? { event: undefined, dailyEvent: eventSnapshot, isDailyEvent: true, selectedDate }
        : { event: eventSnapshot, dailyEvent: undefined, isDailyEvent: false }),
      user: userSnapshot,
      tickets: tickets.map(({ pricePaise, ...ticket }) => ({ ...ticket, price: pricePaise / 100, ...(selectedDate && { selectedDate }) })),
      ...(appliedCoupon ? { coupon: appliedCoupon } : {}),
    },
    event,
    dailyEvent,
    eventId: catalog._id,
    isDailyEvent,
    tickets,
  };
}

async function findSession(orderId, orderIntentId) {
  if (orderId) {
    const byOrder = await PendingPaymentSession.findOne({ orderId });
    if (byOrder) return byOrder;
  }
  return orderIntentId ? PendingPaymentSession.findOne({ orderIntentId }) : null;
}

async function createPaymentOrder({ razorpay, bookingDetails, coupon, authenticatedUser, receipt }) {
  const canonical = await buildCanonicalCheckout({ bookingDetails, coupon, authenticatedUser });
  const orderIntentId = crypto.randomUUID();
  const pending = await PendingPaymentSession.create({
    orderIntentId,
    settlementVersion: 2,
    fulfillmentType: canonical.isDailyEvent ? 'daily_event_tickets' : 'event_tickets',
    amount: canonical.amountPaise / 100,
    amountPaise: canonical.amountPaise,
    currency: 'INR',
    bookingDetails: canonical.bookingDetails,
    user: authenticatedUser._id,
    event: canonical.isDailyEvent ? undefined : canonical.eventId,
    dailyEvent: canonical.isDailyEvent ? canonical.eventId : undefined,
    status: 'creating_order',
    nextSettlementAttemptAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  try {
    const order = await razorpay.orders.create({
      amount: canonical.amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        orderIntentId,
        checkoutSessionId: pending._id.toString(),
        userId: authenticatedUser._id.toString(),
        eventId: canonical.eventId.toString(),
        eventType: canonical.isDailyEvent ? 'daily_event' : 'event',
        ...(canonical.isDailyEvent && { selectedDate: canonical.bookingDetails.selectedDate.toISOString() }),
        tickets: JSON.stringify(canonical.bookingDetails.tickets.map(({ ticketType, ticketTypeId, quantity, price }) => ({ ticketType, ticketTypeId: String(ticketTypeId), quantity, price }))),
        coupon: canonical.bookingDetails.coupon ? JSON.stringify(canonical.bookingDetails.coupon) : undefined,
      },
    });
    if (!order?.id) throw new Error('Razorpay did not return an order ID.');

    const attached = await PendingPaymentSession.updateOne(
      { _id: pending._id, status: 'creating_order' },
      { $set: { orderId: order.id, status: 'created' } }
    );
    if (attached.matchedCount !== 1) throw new Error('Could not attach Razorpay order to saved checkout.');
    return { order, pending, canonical };
  } catch (error) {
    await PendingPaymentSession.updateOne(
      { _id: pending._id },
      { $set: { status: 'failed', errorMessage: String(error.message || 'Order creation failed').slice(0, 400) } }
    );
    throw error;
  }
}

function parseProviderNoteJson(value, code) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new PaymentSettlementError('Saved Razorpay order details are invalid.', code, 409, true);
  }
}

async function recoverCheckoutFromProviderOrder({ razorpay, orderId }) {
  const byOrder = await findSession(orderId);
  if (byOrder) return byOrder;

  const providerOrder = await razorpay.orders.fetch(orderId);
  if (!providerOrder?.id || providerOrder.id !== orderId || providerOrder.currency !== 'INR' || !Number.isSafeInteger(Number(providerOrder.amount))) {
    throw new PaymentSettlementError('Razorpay order details could not be validated.', 'PROVIDER_ORDER_INVALID', 409, true);
  }
  const notes = providerOrder.notes || {};
  const notedIntentId = notes.orderIntentId ? String(notes.orderIntentId) : null;
  const existingIntent = notedIntentId ? await findSession(null, notedIntentId) : null;
  if (existingIntent) {
    if (existingIntent.orderId && existingIntent.orderId !== orderId) {
      throw new PaymentSettlementError('Razorpay order conflicts with the saved checkout intent.', 'ORDER_INTENT_MISMATCH', 409, true);
    }
    existingIntent.orderId = orderId;
    if (existingIntent.status === 'failed') existingIntent.status = 'created';
    await existingIntent.save();
    return existingIntent;
  }

  const userId = notes.userId;
  const user = userId ? await User.findById(userId) : null;
  if (!user) throw new PaymentSettlementError('Saved customer details are unavailable for this payment.', 'CHECKOUT_USER_MISSING', 409, true);

  let bookingDetails;
  let legacyBookingIds = [];
  if (notes.bookingIds) {
    const bookingIds = String(notes.bookingIds).split(',').map((id) => id.trim()).filter(Boolean);
    if (bookingIds.length === 0 || new Set(bookingIds).size !== bookingIds.length || bookingIds.some((id) => !mongoose.isValidObjectId(id))) {
      throw new PaymentSettlementError('Saved booking references are invalid.', 'LEGACY_BOOKING_IDS_INVALID', 409, true);
    }
    const rows = await Booking.find({ _id: { $in: bookingIds }, user: user._id }).lean();
    const rowsById = new Map(rows.map((row) => [row._id.toString(), row]));
    const orderedRows = bookingIds.map((id) => rowsById.get(id));
    if (orderedRows.some((row) => !row || ['cancelled', 'refunded'].includes(row.status))) {
      throw new PaymentSettlementError('Saved bookings do not match this customer or are no longer recoverable.', 'LEGACY_BOOKINGS_MISMATCH', 409, true);
    }
    const first = orderedRows[0];
    const isDailyEvent = Boolean(first.dailyEvent || first.isDailyEvent);
    const parentId = isDailyEvent ? first.dailyEvent : first.event;
    const dateKey = first.selectedDate ? new Date(first.selectedDate).toISOString().slice(0, 10) : null;
    if (!parentId || orderedRows.some((row) => {
      const rowParentId = isDailyEvent ? row.dailyEvent : row.event;
      const rowDateKey = row.selectedDate ? new Date(row.selectedDate).toISOString().slice(0, 10) : null;
      return Boolean(row.dailyEvent || row.isDailyEvent) !== isDailyEvent ||
        rowParentId?.toString() !== parentId.toString() ||
        (isDailyEvent && rowDateKey !== dateKey) ||
        (row.razorpayOrderId && row.razorpayOrderId !== orderId);
    })) {
      throw new PaymentSettlementError('Saved bookings do not match one event checkout.', 'LEGACY_BOOKING_GROUP_MISMATCH', 409, true);
    }
    bookingDetails = {
      ...(isDailyEvent ? { dailyEvent: parentId, selectedDate: first.selectedDate } : { event: parentId }),
      user: { id: user._id },
      tickets: orderedRows.map((row) => ({
        ticketType: row.ticketType,
        ticketTypeId: row.ticketTypeId,
        quantity: row.quantity,
        price: row.price,
      })),
    };
    legacyBookingIds = bookingIds;
  } else {
    const tickets = parseProviderNoteJson(notes.tickets, 'PROVIDER_TICKETS_INVALID');
    const coupon = parseProviderNoteJson(notes.coupon, 'PROVIDER_COUPON_INVALID');
    if (!notes.eventId || !Array.isArray(tickets) || tickets.length === 0) {
      throw new PaymentSettlementError('Razorpay order does not contain a recoverable ticket snapshot.', 'CHECKOUT_SNAPSHOT_MISSING', 409, true);
    }
    const isDailyEvent = notes.eventType === 'daily_event';
    bookingDetails = {
      ...(isDailyEvent ? { dailyEvent: notes.eventId, selectedDate: notes.selectedDate } : { event: notes.eventId }),
      user: { id: user._id },
      tickets,
      ...(coupon && { coupon }),
    };
  }

  const coupon = bookingDetails.coupon || parseProviderNoteJson(notes.coupon, 'PROVIDER_COUPON_INVALID');
  const canonical = await buildCanonicalCheckout({ bookingDetails, coupon, authenticatedUser: user });
  if (canonical.amountPaise !== Number(providerOrder.amount)) {
    throw new PaymentSettlementError('Saved ticket details do not match the amount captured for this order.', 'CHECKOUT_AMOUNT_MISMATCH', 409, true);
  }

  const orderIntentId = String(notedIntentId || `legacy:${orderId}`);

  try {
    return await PendingPaymentSession.create({
      orderId,
      orderIntentId,
      settlementVersion: 2,
      fulfillmentType: canonical.isDailyEvent ? 'daily_event_tickets' : 'event_tickets',
      amount: canonical.amountPaise / 100,
      amountPaise: canonical.amountPaise,
      currency: providerOrder.currency,
      bookingDetails: canonical.bookingDetails,
      user: user._id,
      event: canonical.isDailyEvent ? undefined : canonical.eventId,
      dailyEvent: canonical.isDailyEvent ? canonical.eventId : undefined,
      legacyBookingIds,
      status: 'created',
      nextSettlementAttemptAt: new Date(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      const recovered = await findSession(orderId, orderIntentId);
      if (recovered) return recovered;
    }
    throw error;
  }
}

async function upgradeLegacySession(session) {
  if (!session || session.settlementVersion === 2) return session;
  const user = await User.findById(session.user);
  if (!user || !session.bookingDetails) {
    throw new PaymentSettlementError('Saved checkout details are unavailable for this captured payment.', 'CHECKOUT_SNAPSHOT_MISSING', 409, true);
  }
  const canonical = await buildCanonicalCheckout({
    bookingDetails: session.bookingDetails,
    coupon: session.bookingDetails.coupon,
    authenticatedUser: user,
  });
  const savedAmountPaise = session.amountPaise ?? toPaise(session.amount);
  if (canonical.amountPaise !== savedAmountPaise) {
    throw new PaymentSettlementError('Saved checkout amount no longer matches the event catalog.', 'CHECKOUT_AMOUNT_CHANGED', 409, true);
  }
  session.settlementVersion = 2;
  session.fulfillmentType = canonical.isDailyEvent ? 'daily_event_tickets' : 'event_tickets';
  session.bookingDetails = canonical.bookingDetails;
  session.amount = canonical.amountPaise / 100;
  session.amountPaise = canonical.amountPaise;
  session.currency = 'INR';
  session.event = canonical.isDailyEvent ? undefined : canonical.eventId;
  session.dailyEvent = canonical.isDailyEvent ? canonical.eventId : undefined;
  await session.save();
  return session;
}

async function recordPaymentNeedsReview({ orderId, paymentId, payment, pending, signature, message }) {
  const session = pending;
  const error = new PaymentSettlementError(message, 'PAYMENT_REQUIRES_REVIEW', 409, true);
  await PaymentTransaction.findOneAndUpdate({ orderId, paymentId }, {
    $setOnInsert: {
      orderId,
      paymentId,
      signature,
      user: session?.user,
      userSnapshot: session?.bookingDetails?.user,
      event: session?.event,
      bookingDetails: session?.bookingDetails,
    },
    $set: {
      amount: payment?.amount == null ? undefined : payment.amount / 100,
      amountPaise: payment?.amount,
      currency: payment?.currency,
      status: 'paid_no_booking',
      errorMessage: message,
      dailyEvent: session?.dailyEvent,
      needsAdminIntervention: true,
      nextReconciliationAt: null,
    },
  }, { upsert: true, new: true });
  if (session) {
    await PendingPaymentSession.updateOne({ _id: session._id }, {
      $set: {
        status: 'paid_no_booking', paymentId, errorMessage: message,
        lastSettlementErrorCode: error.code,
        lastSettlementError: String(message).slice(0, 400),
        lastSettlementAttemptAt: new Date(),
        nextSettlementAttemptAt: null,
        needsAdminIntervention: true,
      },
      $unset: { settlementLeaseId: 1, settlementLeaseUntil: 1, reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 },
    });
  }
  try {
    await paymentFulfillmentAlertService.alertCapturedPaymentNeedsTickets({
      orderId,
      paymentId,
      error: message,
      errorCode: error.code,
      attemptCount: session?.settlementAttemptCount,
      needsAdminIntervention: true,
    });
  } catch (alertError) {
    console.error('[Payment fulfillment] Could not create administrator alert:', alertError.message);
  }
}

function nextRetryAt(attemptCount, now = new Date()) {
  const delay = RETRY_BACKOFF_MS[Math.min(Math.max(0, attemptCount - 1), RETRY_BACKOFF_MS.length - 1)];
  return new Date(now.getTime() + delay);
}

async function recordSettlementFailure({ orderId, paymentId, payment, pending, signature, error, terminal = false }) {
  const current = pending || await findSession(orderId);
  const attemptCount = Number(current?.settlementAttemptCount || 0) + 1;
  const needsAdminIntervention = terminal || attemptCount >= MAX_SETTLEMENT_ATTEMPTS;
  const message = String(error?.message || 'Ticket issuance failed').slice(0, 400);
  const retryAt = needsAdminIntervention ? null : nextRetryAt(attemptCount);

  if (current) {
    const now = new Date();
    const pendingFilter = { _id: current._id, status: { $ne: 'completed' } };
    if (pending?.settlementLeaseId) {
      pendingFilter.settlementLeaseId = pending.settlementLeaseId;
    } else {
      pendingFilter.$or = [
        { status: { $ne: 'settling' } },
        { settlementLeaseUntil: { $lte: now } },
        { settlementLeaseUntil: null },
      ];
    }
    const saved = await PendingPaymentSession.updateOne(pendingFilter, {
      $set: {
        status: 'paid_no_booking',
        paymentId,
        lastSettlementAttemptAt: new Date(),
        settlementAttemptCount: attemptCount,
        nextSettlementAttemptAt: retryAt,
        lastSettlementErrorCode: error?.code || 'SETTLEMENT_FAILED',
        lastSettlementError: message,
        errorMessage: message,
        needsAdminIntervention,
      },
      $unset: { settlementLeaseId: 1, settlementLeaseUntil: 1 },
    });
    if (saved.matchedCount !== 1) {
      return { attemptCount, alreadySettled: true, nextAttemptAt: null };
    }
  }

  const transactionUpdate = {
    $setOnInsert: {
      orderId,
      paymentId,
      signature,
      amount: payment?.amount == null ? current?.amount : payment.amount / 100,
      amountPaise: payment?.amount ?? current?.amountPaise,
      currency: payment?.currency || current?.currency || 'INR',
      user: current?.user,
      userSnapshot: current?.bookingDetails?.user,
      event: current?.event,
      bookingDetails: current?.bookingDetails,
    },
    $set: {
      status: 'paid_no_booking',
      errorMessage: message,
      dailyEvent: current?.dailyEvent,
      needsAdminIntervention,
      nextReconciliationAt: retryAt,
    },
  };
  const existingTransaction = await PaymentTransaction.findOne({ orderId, paymentId }).select('status');
  if (existingTransaction) {
    if (!['completed', 'resolved'].includes(existingTransaction.status)) {
      await PaymentTransaction.updateOne({ orderId, paymentId, status: { $nin: ['completed', 'resolved'] } }, transactionUpdate);
    }
  } else {
    await PaymentTransaction.findOneAndUpdate({ orderId, paymentId }, transactionUpdate, { upsert: true, new: true });
  }

  try {
    await paymentFulfillmentAlertService.alertCapturedPaymentNeedsTickets({
      orderId,
      paymentId,
      error: message,
      errorCode: error?.code || 'SETTLEMENT_FAILED',
      attemptCount,
      needsAdminIntervention,
    });
  } catch (alertError) {
    console.error('[Payment fulfillment] Could not create administrator alert:', alertError.message);
  }

  return { attemptCount, needsAdminIntervention, nextAttemptAt: retryAt };
}

async function recordCapturedPaymentPending({ orderId, paymentId, payment, pending, signature, confirmedByWebhook = false }) {
  const confirmedCapture = confirmedByWebhook || (payment?.status === 'captured' && payment?.captured === true);
  if (!confirmedCapture || !orderId || !paymentId || payment?.id !== paymentId || (payment.order_id && payment.order_id !== orderId)) {
    throw new PaymentSettlementError('Captured payment details are incomplete or do not match the order.', 'CAPTURE_DETAILS_INVALID', 409);
  }
  if (pending?.orderId && pending.orderId !== orderId) {
    throw new PaymentSettlementError('Captured payment does not belong to the saved checkout.', 'ORDER_MISMATCH', 409, true);
  }

  const now = new Date();
  const errorMessage = 'Payment was captured and is awaiting booking settlement.';
  const terminalStatuses = ['completed', 'resolved', 'refund_pending', 'refunded'];
  // Record a verified capture before booking side effects. The conditional status
  // keeps duplicate webhooks from downgrading an already settled transaction.
  await PaymentTransaction.collection.updateOne({ orderId, paymentId }, [{
    $set: {
      signature: { $ifNull: ['$signature', { $literal: signature ?? null }] },
      amount: { $literal: payment.amount == null ? (pending?.amount ?? null) : payment.amount / 100 },
      amountPaise: { $literal: payment.amount ?? pending?.amountPaise ?? null },
      currency: { $literal: payment.currency || pending?.currency || 'INR' },
      user: { $ifNull: ['$user', { $literal: pending?.user ?? null }] },
      userSnapshot: { $ifNull: ['$userSnapshot', { $literal: pending?.bookingDetails?.user ?? null }] },
      event: { $ifNull: ['$event', { $literal: pending?.event ?? null }] },
      dailyEvent: { $ifNull: ['$dailyEvent', { $literal: pending?.dailyEvent ?? null }] },
      bookingDetails: { $ifNull: ['$bookingDetails', { $literal: pending?.bookingDetails ?? null }] },
      status: {
        $cond: [
          { $in: [{ $ifNull: ['$status', ''] }, { $literal: terminalStatuses }] },
          '$status',
          { $literal: 'paid_no_booking' },
        ],
      },
      errorMessage: {
        $cond: [
          { $in: [{ $ifNull: ['$status', ''] }, { $literal: terminalStatuses }] },
          '$errorMessage',
          { $literal: errorMessage },
        ],
      },
      createdAt: { $ifNull: ['$createdAt', { $literal: now }] },
      updatedAt: { $literal: now },
    },
  }], { upsert: true });

  if (pending && pending.status !== 'completed' && (!pending.paymentId || pending.paymentId === paymentId)) {
    await PendingPaymentSession.updateOne({
      _id: pending._id,
      status: { $ne: 'completed' },
      $or: [
        { status: { $ne: 'settling' } },
        { settlementLeaseUntil: { $lte: now } },
        { settlementLeaseUntil: { $exists: false } },
      ],
    }, {
      $set: {
        status: 'paid_no_booking', orderId, paymentId, errorMessage,
        capturedAt: pending.capturedAt || now,
        nextSettlementAttemptAt: now,
        reconciliationAttemptCount: 0,
        needsAdminIntervention: Boolean(pending.needsAdminIntervention),
      },
      $unset: { settlementLeaseId: 1, settlementLeaseUntil: 1 },
    });
  }
}

async function settleCapturedPayment({ razorpay, orderId, paymentId, orderIntentId, signature }) {
  let pending = await findSession(orderId, orderIntentId);
  if (!paymentId) throw new PaymentSettlementError('Captured payment ID is missing.', 'PAYMENT_ID_MISSING', 400);

  let payment;
  try {
    payment = await razorpay.payments.fetch(paymentId);
  } catch (providerError) {
    if (pending?.capturedAt || pending?.paymentId === paymentId) {
      await recordSettlementFailure({ orderId, paymentId, pending, signature, error: providerError });
    }
    throw new PaymentSettlementError('Razorpay could not confirm this payment yet.', 'PAYMENT_LOOKUP_FAILED', 503);
  }
  if (payment.status !== 'captured' || payment.captured !== true) {
    if (pending?.capturedAt || pending?.paymentId === paymentId) {
      const error = new PaymentSettlementError('Razorpay has not confirmed capture yet.', 'PAYMENT_NOT_CAPTURED', 503);
      await recordSettlementFailure({ orderId, paymentId, payment, pending, signature, error });
      throw error;
    }
    throw new PaymentSettlementError('Payment is not captured yet.', 'PAYMENT_NOT_CAPTURED', 503);
  }
  if (payment.id !== paymentId || payment.order_id !== orderId) {
    const error = new PaymentSettlementError('Captured payment does not belong to this order.', 'PAYMENT_ORDER_MISMATCH', 409, true);
    await recordPaymentNeedsReview({ orderId, paymentId, payment, pending, signature, message: error.message });
    throw error;
  }
  if (!pending) {
    const error = new PaymentSettlementError('Saved checkout details are unavailable for this captured payment.', 'CHECKOUT_SNAPSHOT_MISSING', 409, true);
    await recordPaymentNeedsReview({ orderId, paymentId, payment, pending, signature, message: error.message });
    throw error;
  }
  if (pending.settlementVersion !== 2) {
    try {
      pending = await upgradeLegacySession(pending);
    } catch (error) {
      await recordPaymentNeedsReview({ orderId, paymentId, payment, pending, signature, message: error.message });
      throw error;
    }
  }
  if (pending.orderId && pending.orderId !== orderId) {
    const error = new PaymentSettlementError('Payment order does not match the saved checkout.', 'ORDER_MISMATCH', 409, true);
    await recordPaymentNeedsReview({ orderId, paymentId, payment, pending, signature, message: error.message });
    throw error;
  }
  if (pending.amountPaise == null || !pending.bookingDetails || !Array.isArray(pending.bookingDetails.tickets)) {
    const error = new PaymentSettlementError('Saved checkout details are incomplete.', 'CHECKOUT_SNAPSHOT_INVALID', 409, true);
    await recordPaymentNeedsReview({ orderId, paymentId, payment, pending, signature, message: error.message });
    throw error;
  }
  if (pending.paymentId && pending.paymentId !== paymentId) {
    await recordCapturedPaymentPending({ orderId, paymentId, payment, pending, signature });
    const error = new PaymentSettlementError('A second captured payment is associated with this checkout and needs review.', 'PAYMENT_CONFLICT', 409, true);
    try {
      await paymentFulfillmentAlertService.alertCapturedPaymentNeedsTickets({
        orderId,
        paymentId,
        error: error.message,
        errorCode: error.code,
        needsAdminIntervention: true,
      });
    } catch (alertError) {
      console.error('[Payment fulfillment] Could not create administrator alert:', alertError.message);
    }
    throw error;
  }

  const expectedTicketCount = pending.bookingDetails.tickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);
  if (pending.status === 'completed') {
    const issuedBookings = await Booking.find({ paymentId, paymentTicketKey: { $exists: true } }).sort({ ticketIndex: 1 });
    const complete = issuedBookings.length === expectedTicketCount && issuedBookings.every((booking) => (
      ['confirmed', 'checked-in'].includes(booking.status) &&
      booking.paymentStatus === 'completed' &&
      Boolean(booking.qrCode)
    ));
    if (complete) {
      const transaction = await PaymentTransaction.findOneAndUpdate({ orderId, paymentId }, {
        $setOnInsert: {
          orderId,
          paymentId,
          amount: pending.amount,
          amountPaise: pending.amountPaise,
          currency: pending.currency,
          user: pending.user,
          userSnapshot: pending.bookingDetails?.user,
          event: pending.event,
          dailyEvent: pending.dailyEvent,
          bookingDetails: pending.bookingDetails,
        },
        $set: {
          status: 'completed',
          bookingIds: issuedBookings.map((booking) => booking._id),
          errorMessage: null,
          needsAdminIntervention: false,
          nextReconciliationAt: null,
        },
        $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 },
      }, { upsert: true, new: true });
      await paymentFulfillmentAlertService.resolveOrderAlerts(orderId).catch((error) => {
        console.error('[Payment fulfillment] Could not archive resolved administrator alerts:', error.message);
      });
      return { transaction, bookings: issuedBookings, alreadyCompleted: true };
    }
  }

  if (payment.amount !== pending.amountPaise || payment.currency !== pending.currency) {
    const error = new PaymentSettlementError('Captured payment amount or currency does not match the saved checkout.', 'PAYMENT_AMOUNT_MISMATCH', 409, true);
    await recordPaymentNeedsReview({ orderId, paymentId, payment, pending, signature, message: error.message });
    throw error;
  }

  await recordCapturedPaymentPending({ orderId, paymentId, payment, pending, signature });

  const now = new Date();
  const leaseId = crypto.randomUUID();
  const lease = await PendingPaymentSession.findOneAndUpdate({
    _id: pending._id,
    $and: [
      { $or: [{ paymentId: null }, { paymentId }, { paymentId: { $exists: false } }] },
      { $or: [
        { status: { $in: ['created', 'verified', 'paid_no_booking'] } },
        { status: 'completed' },
        { status: 'settling', settlementLeaseUntil: { $lte: now } },
      ] },
    ],
  }, {
    $set: {
      status: 'settling',
      paymentId,
      settlementLeaseId: leaseId,
      settlementLeaseUntil: new Date(now.getTime() + SETTLEMENT_LEASE_MS),
    },
  }, { new: true });

  if (!lease) {
    const latest = await PendingPaymentSession.findById(pending._id);
    if (latest?.status === 'completed') {
      const bookings = await Booking.find({ paymentId }).sort({ ticketIndex: 1 });
      return { transaction: await PaymentTransaction.findOne({ orderId, paymentId }), bookings, alreadyCompleted: true };
    }
    throw new PaymentSettlementError('Payment settlement is already in progress; retry shortly.', 'SETTLEMENT_IN_PROGRESS', 503);
  }

  let transaction;
  let bookings;
  try {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const currentPending = await PendingPaymentSession.findOne({ _id: lease._id, settlementLeaseId: leaseId }).session(session);
        if (!currentPending || currentPending.status !== 'settling') {
          throw new PaymentSettlementError('Payment settlement lease was lost.', 'SETTLEMENT_LEASE_LOST', 503);
        }

        const isDailyEvent = currentPending.fulfillmentType === 'daily_event_tickets' || currentPending.bookingDetails.isDailyEvent === true;
        const eventId = isDailyEvent
          ? (currentPending.dailyEvent || currentPending.bookingDetails.dailyEvent?._id)
          : (currentPending.event || currentPending.bookingDetails.event?._id);
        const catalog = isDailyEvent
          ? await DailyEvent.findById(eventId).session(session)
          : await Event.findById(eventId).session(session);
        if (!catalog) throw new PaymentSettlementError('Event record is unavailable for ticket issuance.', 'EVENT_NOT_FOUND', 409, true);

        transaction = await PaymentTransaction.findOneAndUpdate({ orderId, paymentId }, {
          $setOnInsert: {
            orderId,
            paymentId,
            signature,
            amount: currentPending.amountPaise / 100,
            amountPaise: payment.amount,
            currency: currentPending.currency,
            user: currentPending.user,
            userSnapshot: currentPending.bookingDetails.user,
            event: currentPending.event,
            dailyEvent: currentPending.dailyEvent,
            bookingDetails: currentPending.bookingDetails,
          },
          $set: { status: 'processing', errorMessage: null },
        }, { upsert: true, new: true, session });
        const expected = expandPaymentTicketUnits(
          currentPending.bookingDetails.tickets,
          paymentId,
          10,
        ).map((ticket) => ({
          ...ticket,
          selectedDate: ticket.selectedDate || currentPending.bookingDetails.selectedDate || null,
        }));

        const existing = await Booking.find({
          $or: [
            { paymentTicketKey: { $in: expected.map((ticket) => ticket.key) } },
            { razorpayOrderId: orderId, paymentId, user: currentPending.user },
            ...(currentPending.legacyBookingIds?.length ? [{ _id: { $in: currentPending.legacyBookingIds }, user: currentPending.user }] : []),
          ],
        }).sort({ ticketIndex: 1, bookedAt: 1, _id: 1 }).session(session);
        const existingByKey = new Map(existing.filter((booking) => booking.paymentTicketKey).map((booking) => [booking.paymentTicketKey, booking]));
        const legacyBookings = existing.filter((booking) => !booking.paymentTicketKey);
        const assignedLegacyBookings = new Map();
        const usedLegacyBookingIds = new Set();
        for (const expectedTicket of expected) {
          if (existingByKey.has(expectedTicket.key)) continue;
          const match = legacyBookings.find((booking) => (
            !usedLegacyBookingIds.has(booking._id.toString()) &&
            booking.ticketType === expectedTicket.ticketType &&
            (!booking.ticketTypeId || !expectedTicket.ticketTypeId || booking.ticketTypeId.toString() === expectedTicket.ticketTypeId.toString()) &&
            booking.user?.toString() === currentPending.user?.toString() &&
            (isDailyEvent ? booking.dailyEvent?.toString() === catalog._id.toString() : booking.event?.toString() === catalog._id.toString()) &&
            !['cancelled', 'refunded'].includes(booking.status)
          ));
          if (match) {
            assignedLegacyBookings.set(expectedTicket.key, match);
            usedLegacyBookingIds.add(match._id.toString());
          }
        }
        if (usedLegacyBookingIds.size !== legacyBookings.length) {
          throw new PaymentSettlementError('Existing bookings conflict with the captured checkout.', 'BOOKING_IDEMPOTENCY_CONFLICT', 409, true);
        }
        for (const expectedTicket of expected) {
          const found = existingByKey.get(expectedTicket.key) || assignedLegacyBookings.get(expectedTicket.key);
          const foundParentId = isDailyEvent ? found?.dailyEvent : found?.event;
          if (found && (
            foundParentId?.toString() !== catalog._id.toString() ||
            found.user?.toString() !== currentPending.user?.toString() ||
            found.ticketType !== expectedTicket.ticketType ||
            (found.ticketTypeId && expectedTicket.ticketTypeId && found.ticketTypeId.toString() !== expectedTicket.ticketTypeId.toString()) ||
            (found.paymentTicketKey && found.ticketIndex !== Number(expectedTicket.key.split(':').pop())) ||
            (found.paymentId && found.paymentId !== paymentId) ||
            (found.razorpayOrderId && found.razorpayOrderId !== orderId) ||
            ['cancelled', 'refunded'].includes(found.status)
          )) {
            throw new PaymentSettlementError('Existing ticket record conflicts with the saved checkout.', 'BOOKING_IDEMPOTENCY_CONFLICT', 409);
          }
        }

        const firstBookingId = existingByKey.get(expected[0].key)?._id || assignedLegacyBookings.get(expected[0].key)?._id || new mongoose.Types.ObjectId();
        const allBookings = [];
        const missingByTicketType = new Map();
        for (let i = 0; i < expected.length; i += 1) {
          const ticket = expected[i];
          const existingBooking = existingByKey.get(ticket.key) || assignedLegacyBookings.get(ticket.key);
          if (existingBooking) {
            const wasUnsettled = existingBooking.paymentStatus !== 'completed';
            existingBooking.status = existingBooking.status === 'checked-in' ? 'checked-in' : 'confirmed';
            existingBooking.paymentStatus = 'completed';
            existingBooking.paymentId = paymentId;
            existingBooking.paymentTicketKey = ticket.key;
            existingBooking.paymentProvider = 'razorpay';
            existingBooking.razorpayPaymentId = paymentId;
            existingBooking.razorpayOrderId = orderId;
            existingBooking.quantity = 1;
            existingBooking.price = ticket.price;
            existingBooking.total = ticket.price;
            existingBooking.ticketTypeId = ticket.ticketTypeId;
            existingBooking.ticketIndex = i + 1;
            existingBooking.totalTickets = expected.length;
            existingBooking.parentBookingId = firstBookingId;
            if (isDailyEvent) {
              existingBooking.dailyEvent = catalog._id;
              existingBooking.isDailyEvent = true;
              existingBooking.selectedDate = ticket.selectedDate;
              existingBooking.eventSnapshot = currentPending.bookingDetails.dailyEvent;
            } else {
              existingBooking.event = catalog._id;
              existingBooking.eventSnapshot = currentPending.bookingDetails.event;
            }
            if (!existingBooking.qrCode) {
              existingBooking.qrCode = await QRCode.toDataURL(JSON.stringify({
                bookingId: existingBooking._id,
                eventId: catalog._id,
                ticketType: ticket.ticketType,
                quantity: existingBooking.quantity || 1,
                selectedDate: ticket.selectedDate,
              }), { errorCorrectionLevel: 'H', margin: 2, color: { dark: '#4a154b', light: '#ffffff' } });
            }
            await existingBooking.save({ session });
            allBookings.push(existingBooking);
            if (wasUnsettled) {
              const group = missingByTicketType.get(ticket.ticketTypeId.toString()) || { ticketTypeId: ticket.ticketTypeId, quantity: 0, revenue: 0 };
              group.quantity += 1;
              group.revenue += ticket.price;
              missingByTicketType.set(ticket.ticketTypeId.toString(), group);
            }
            continue;
          }
          const ticketTypeId = ticket.ticketTypeId;
          if (!mongoose.isValidObjectId(ticketTypeId) || !(catalog.ticketTypes || []).some((item) => item._id.toString() === ticketTypeId.toString() && item.name === ticket.ticketType)) {
            throw new PaymentSettlementError('Saved ticket type no longer matches the event.', 'TICKET_TYPE_MISMATCH', 409);
          }
          const bookingId = i === 0 ? firstBookingId : new mongoose.Types.ObjectId();
          const qrCode = await QRCode.toDataURL(JSON.stringify({
            bookingId,
            eventId: catalog._id,
            ticketType: ticket.ticketType,
            quantity: 1,
            selectedDate: ticket.selectedDate,
          }), { errorCorrectionLevel: 'H', margin: 2, color: { dark: '#4a154b', light: '#ffffff' } });
          const booking = new Booking({
            _id: bookingId,
            ...(isDailyEvent
              ? { dailyEvent: catalog._id, isDailyEvent: true, selectedDate: ticket.selectedDate }
              : { event: catalog._id }),
            eventSnapshot: isDailyEvent ? currentPending.bookingDetails.dailyEvent : currentPending.bookingDetails.event,
            user: currentPending.user,
            ticketType: ticket.ticketType,
            ticketTypeId,
            quantity: 1,
            price: ticket.price,
            total: ticket.price,
            status: 'confirmed',
            paymentStatus: 'completed',
            paymentId,
            paymentProvider: 'razorpay',
            razorpayPaymentId: paymentId,
            razorpayOrderId: orderId,
            paymentTicketKey: ticket.key,
            ticketIndex: i + 1,
            totalTickets: expected.length,
            parentBookingId: firstBookingId,
            qrCode,
            ...(currentPending.bookingDetails.country ? { country: currentPending.bookingDetails.country } : {}),
            ...(currentPending.bookingDetails.state ? { state: currentPending.bookingDetails.state } : {}),
          });
          await booking.save({ session });
          allBookings.push(booking);
          const group = missingByTicketType.get(ticketTypeId.toString()) || { ticketTypeId, quantity: 0, revenue: 0 };
          group.quantity += 1;
          group.revenue += ticket.price;
          missingByTicketType.set(ticketTypeId.toString(), group);
        }

        for (const group of missingByTicketType.values()) {
          const update = isDailyEvent
            ? await DailyEvent.updateOne({ _id: catalog._id, 'ticketTypes._id': group.ticketTypeId }, {
                $inc: { 'ticketTypes.$.sold': group.quantity, ticketsSold: group.quantity, totalRevenue: group.revenue },
              }, { session })
            : await Event.updateOne({ _id: catalog._id, 'ticketTypes._id': group.ticketTypeId }, {
                $inc: { 'ticketTypes.$.sold': group.quantity, ticketsSold: group.quantity, totalRevenue: group.revenue },
              }, { session });
          if (update.matchedCount !== 1) {
            throw new PaymentSettlementError('Ticket inventory could not be updated.', 'INVENTORY_UPDATE_FAILED', 409);
          }
        }

        if (!transaction.couponUsageApplied && currentPending.bookingDetails.coupon?.code) {
          const applicableTickets = currentPending.bookingDetails.tickets.filter((ticket) => (
            ticket.ticketType === currentPending.bookingDetails.coupon.ticketCategory
          ));
          const usageCount = applicableTickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);
          if (usageCount > 0) {
            await Coupon.findOneAndUpdate(
              { code: currentPending.bookingDetails.coupon.code },
              { $set: { usedAt: new Date() }, $inc: { timesUsed: usageCount } },
              { session },
            );
          }
          transaction.couponUsageApplied = true;
        }

        const bookingIds = allBookings.map((booking) => booking._id);
        transaction.status = 'completed';
        transaction.bookingIds = bookingIds;
        transaction.errorMessage = undefined;
        transaction.reconciliationAttemptCount = 0;
        transaction.nextReconciliationAt = undefined;
        transaction.needsAdminIntervention = false;
        transaction.reconciliationLeaseId = undefined;
        transaction.reconciliationLeaseUntil = undefined;
        await transaction.save({ session });

        currentPending.status = 'completed';
        currentPending.bookingIds = bookingIds;
        currentPending.errorMessage = undefined;
        currentPending.settlementAttemptCount = 0;
        currentPending.reconciliationAttemptCount = 0;
        currentPending.nextSettlementAttemptAt = undefined;
        currentPending.lastSettlementErrorCode = undefined;
        currentPending.lastSettlementError = undefined;
        currentPending.needsAdminIntervention = false;
        currentPending.nextIntegrityCheckAt = new Date(Date.now() + 5 * 60 * 1000);
        currentPending.settlementLeaseId = undefined;
        currentPending.settlementLeaseUntil = undefined;
        currentPending.reconciliationLeaseId = undefined;
        currentPending.reconciliationLeaseUntil = undefined;
        await currentPending.save({ session });
        bookings = allBookings;
      });
    } finally {
      await session.endSession();
    }
    try {
      await paymentFulfillmentAlertService.resolveOrderAlerts(orderId);
    } catch (alertError) {
      console.error('[Payment fulfillment] Could not archive resolved administrator alerts:', alertError.message);
    }
  } catch (error) {
    await recordSettlementFailure({ orderId, paymentId, payment, pending: lease, signature, error, terminal: Boolean(error.terminal) });
    throw error;
  }

  return { transaction, bookings, alreadyCompleted: false };
}

module.exports = {
  PaymentSettlementError,
  buildCanonicalCheckout,
  expandPaymentTicketUnits,
  createPaymentOrder,
  recoverCheckoutFromProviderOrder,
  findSession,
  recordPaymentNeedsReview,
  recordCapturedPaymentPending,
  recordSettlementFailure,
  settleCapturedPayment,
  toPaise,
};
