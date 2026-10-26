const crypto = require('crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Coupon = require('../models/Coupon');
const Event = require('../models/Event');
const PaymentTransaction = require('../models/PaymentTransaction');
const PendingPaymentSession = require('../models/PendingPaymentSession');
const { computeCouponDiscount } = require('../utils/couponDiscount');

const SETTLEMENT_LEASE_MS = 2 * 60 * 1000;

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

async function buildCanonicalCheckout({ bookingDetails, coupon, authenticatedUser }) {
  const eventId = bookingDetails?.event?._id || bookingDetails?.event;
  const requestedUserId = bookingDetails?.user?.id || bookingDetails?.user?._id;
  const authenticatedUserId = authenticatedUser?._id?.toString();

  if (!mongoose.isValidObjectId(eventId) || !authenticatedUserId) {
    throw new PaymentSettlementError('Event or signed-in user is invalid.', 'INVALID_CHECKOUT', 400);
  }
  if (!requestedUserId || requestedUserId.toString() !== authenticatedUserId) {
    throw new PaymentSettlementError('Booking user does not match the signed-in account.', 'USER_MISMATCH', 403);
  }

  const event = await Event.findById(eventId);
  if (!event) throw new PaymentSettlementError('Event was not found.', 'EVENT_NOT_FOUND', 404);

  if (!Array.isArray(bookingDetails?.tickets) || bookingDetails.tickets.length === 0) {
    throw new PaymentSettlementError('Select at least one ticket.', 'NO_TICKETS', 400);
  }

  const tickets = bookingDetails.tickets.map((requested) => {
    const quantity = Number(requested.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new PaymentSettlementError('Ticket quantity is invalid.', 'INVALID_QUANTITY', 400);
    }
    const requestedName = String(requested.ticketType || '').trim();
    const matches = event.ticketTypes.filter((ticket) => (
      requested.ticketTypeId && mongoose.isValidObjectId(requested.ticketTypeId)
        ? ticket._id.toString() === requested.ticketTypeId.toString()
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
  if (!Number.isSafeInteger(subtotalPaise)) {
    throw new PaymentSettlementError('Checkout total is outside the supported range.', 'INVALID_TOTAL', 400);
  }

  let appliedCoupon = null;
  let discountPaise = 0;
  const couponCode = coupon?.code || bookingDetails?.coupon?.code;
  if (couponCode) {
    const dbCoupon = await Coupon.findOne({ code: String(couponCode).trim().toUpperCase() });
    if (dbCoupon && String(dbCoupon.event?.id) === event._id.toString() &&
        (!dbCoupon.expiresAt || new Date(dbCoupon.expiresAt) >= new Date())) {
      const discountResult = computeCouponDiscount(dbCoupon, tickets.map(({ ticketType, quantity, price }) => ({ ticketType, quantity, price })));
      if (!discountResult.error && discountResult.discountAmount > 0) {
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
  }

  const amountPaise = subtotalPaise - discountPaise;
  const userSnapshot = {
    id: authenticatedUserId,
    name: authenticatedUser.name,
    email: authenticatedUser.email,
    phone: authenticatedUser.phone,
  };
  const eventSnapshot = {
    _id: event._id.toString(),
    title: event.title,
    banner: event.banner,
    startDate: event.startDate,
    endDate: event.endDate,
    location: {
      address: event.location?.address,
      city: event.location?.city,
    },
  };

  return {
    amountPaise,
    bookingDetails: {
      ...bookingDetails,
      event: eventSnapshot,
      user: userSnapshot,
      tickets: tickets.map(({ pricePaise, ...ticket }) => ({ ...ticket, price: pricePaise / 100 })),
      ...(appliedCoupon ? { coupon: appliedCoupon } : {}),
    },
    event,
    tickets,
  };
}

async function findSession(orderId, orderIntentId) {
  const filters = [];
  if (orderId) filters.push({ orderId });
  if (orderIntentId) filters.push({ orderIntentId });
  return filters.length ? PendingPaymentSession.findOne({ $or: filters }) : null;
}

async function recordPaymentNeedsReview({ orderId, paymentId, payment, pending, signature, message }) {
  const session = pending;
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
    },
  }, { upsert: true, new: true });
  if (session) {
    await PendingPaymentSession.updateOne({ _id: session._id }, {
      $set: { status: 'paid_no_booking', paymentId, errorMessage: message },
      $unset: { settlementLeaseId: 1, settlementLeaseUntil: 1 },
    });
  }
}

async function settleCapturedPayment({ razorpay, orderId, paymentId, orderIntentId, signature }) {
  const pending = await findSession(orderId, orderIntentId);
  if (!paymentId) throw new PaymentSettlementError('Captured payment ID is missing.', 'PAYMENT_ID_MISSING', 400);

  const payment = await razorpay.payments.fetch(paymentId);
  if (payment.status !== 'captured' || payment.captured !== true) {
    throw new PaymentSettlementError('Payment is not captured yet.', 'PAYMENT_NOT_CAPTURED', 503);
  }
  if (payment.id !== paymentId || payment.order_id !== orderId) {
    const error = new PaymentSettlementError('Captured payment does not belong to this order.', 'PAYMENT_ORDER_MISMATCH', 409, true);
    await recordPaymentNeedsReview({ orderId, paymentId, payment, pending, signature, message: error.message });
    throw error;
  }
  if (!pending || pending.settlementVersion !== 2) {
    const error = new PaymentSettlementError('Saved checkout details are unavailable for this captured payment.', 'CHECKOUT_SNAPSHOT_MISSING', 409, true);
    await recordPaymentNeedsReview({ orderId, paymentId, payment, pending, signature, message: error.message });
    throw error;
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
    throw new PaymentSettlementError('A different payment is already associated with this checkout.', 'PAYMENT_CONFLICT', 409);
  }
  if (pending.status === 'completed') {
    const bookings = await Booking.find({ paymentId, paymentTicketKey: { $exists: true } }).sort({ ticketIndex: 1 });
    return { transaction: await PaymentTransaction.findOne({ orderId, paymentId }), bookings, alreadyCompleted: true };
  }

  if (payment.amount !== pending.amountPaise || payment.currency !== pending.currency) {
    const error = new PaymentSettlementError('Captured payment amount or currency does not match the saved checkout.', 'PAYMENT_AMOUNT_MISMATCH', 409, true);
    await recordPaymentNeedsReview({ orderId, paymentId, payment, pending, signature, message: error.message });
    throw error;
  }

  const now = new Date();
  const leaseId = crypto.randomUUID();
  const lease = await PendingPaymentSession.findOneAndUpdate({
    _id: pending._id,
    $and: [
      { $or: [{ paymentId: null }, { paymentId }, { paymentId: { $exists: false } }] },
      { $or: [
        { status: { $in: ['created', 'verified', 'paid_no_booking'] } },
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

        const eventId = currentPending.bookingDetails.event?._id;
        const event = await Event.findById(eventId).session(session);
        if (!event) throw new PaymentSettlementError('Event record is unavailable for ticket issuance.', 'EVENT_NOT_FOUND', 409);

        const priorTransaction = await PaymentTransaction.findOne({ orderId, paymentId }).session(session);
        if (priorTransaction?.status === 'completed') {
          const completedBookings = await Booking.find({ paymentId, paymentTicketKey: { $exists: true } }).sort({ ticketIndex: 1 }).session(session);
          if (completedBookings.length > 0) {
            currentPending.status = 'completed';
            currentPending.bookingIds = completedBookings.map((booking) => booking._id);
            currentPending.settlementLeaseId = undefined;
            currentPending.settlementLeaseUntil = undefined;
            await currentPending.save({ session });
            transaction = priorTransaction;
            bookings = completedBookings;
            return;
          }
        }

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
            bookingDetails: currentPending.bookingDetails,
          },
          $set: { status: 'processing', errorMessage: null },
        }, { upsert: true, new: true, session });
        const expected = [];
        for (const ticket of currentPending.bookingDetails.tickets) {
          for (let i = 0; i < ticket.quantity; i += 1) {
            expected.push({
              key: `${paymentId}:${expected.length + 1}`,
              ticketType: ticket.ticketType,
              ticketTypeId: ticket.ticketTypeId,
              price: Number(ticket.price),
            });
          }
        }
        if (expected.length === 0 || expected.length > 10) {
          throw new PaymentSettlementError('Saved ticket quantity is invalid.', 'INVALID_SAVED_TICKETS', 409);
        }

        const existing = await Booking.find({ paymentTicketKey: { $in: expected.map((ticket) => ticket.key) } }).session(session);
        const existingByKey = new Map(existing.map((booking) => [booking.paymentTicketKey, booking]));
        for (const expectedTicket of expected) {
          const found = existingByKey.get(expectedTicket.key);
          if (found && (
            found.event?.toString() !== event._id.toString() ||
            found.user?.toString() !== currentPending.user?.toString() ||
            found.ticketType !== expectedTicket.ticketType ||
            found.ticketIndex !== Number(expectedTicket.key.split(':').pop())
          )) {
            throw new PaymentSettlementError('Existing ticket record conflicts with the saved checkout.', 'BOOKING_IDEMPOTENCY_CONFLICT', 409);
          }
        }

        const firstBookingId = existingByKey.get(expected[0].key)?._id || new mongoose.Types.ObjectId();
        const allBookings = [];
        const missingByTicketType = new Map();
        for (let i = 0; i < expected.length; i += 1) {
          const ticket = expected[i];
          const existingBooking = existingByKey.get(ticket.key);
          if (existingBooking) {
            allBookings.push(existingBooking);
            continue;
          }
          const ticketTypeId = ticket.ticketTypeId;
          if (!mongoose.isValidObjectId(ticketTypeId) || !event.ticketTypes.some((item) => item._id.toString() === ticketTypeId.toString() && item.name === ticket.ticketType)) {
            throw new PaymentSettlementError('Saved ticket type no longer matches the event.', 'TICKET_TYPE_MISMATCH', 409);
          }
          const booking = new Booking({
            _id: i === 0 ? firstBookingId : undefined,
            event: event._id,
            eventSnapshot: currentPending.bookingDetails.event,
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
          const update = await Event.updateOne({ _id: event._id, 'ticketTypes._id': group.ticketTypeId }, {
            $inc: {
              'ticketTypes.$.sold': group.quantity,
              ticketsSold: group.quantity,
              totalRevenue: group.revenue,
            },
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
        await transaction.save({ session });

        currentPending.status = 'completed';
        currentPending.bookingIds = bookingIds;
        currentPending.errorMessage = undefined;
        currentPending.settlementLeaseId = undefined;
        currentPending.settlementLeaseUntil = undefined;
        await currentPending.save({ session });
        bookings = allBookings;
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    await PendingPaymentSession.updateOne({ _id: lease._id, settlementLeaseId: leaseId }, {
      $set: { status: 'paid_no_booking', errorMessage: error.message },
      $unset: { settlementLeaseId: 1, settlementLeaseUntil: 1 },
    });
    await PaymentTransaction.findOneAndUpdate({ orderId, paymentId }, {
      $setOnInsert: {
        orderId,
        paymentId,
        signature,
        amount: payment.amount / 100,
        amountPaise: payment.amount,
        currency: payment.currency,
        user: lease.user,
        userSnapshot: lease.bookingDetails.user,
        event: lease.event,
        bookingDetails: lease.bookingDetails,
      },
      $set: { status: 'paid_no_booking', errorMessage: error.message },
    }, { upsert: true, new: true });
    throw error;
  }

  return { transaction, bookings, alreadyCompleted: false };
}

module.exports = {
  PaymentSettlementError,
  buildCanonicalCheckout,
  findSession,
  recordPaymentNeedsReview,
  settleCapturedPayment,
  toPaise,
};
