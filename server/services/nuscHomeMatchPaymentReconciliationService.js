const crypto = require('crypto');

const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000;
const RECONCILIATION_LEASE_MS = 4 * 60 * 1000;
const MAX_RECONCILIATION_ATTEMPTS = 12;
const RETRY_BACKOFF_MS = [60 * 1000, 2 * 60 * 1000, 5 * 60 * 1000, 10 * 60 * 1000, 20 * 60 * 1000, 30 * 60 * 1000];

function retryAt(attemptCount, now) {
  const delay = RETRY_BACKOFF_MS[Math.min(Math.max(0, attemptCount - 1), RETRY_BACKOFF_MS.length - 1)];
  return new Date(now.getTime() + delay);
}

function safeMessage(error) {
  return String(error?.message || error || 'NUSC payment reconciliation failed')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 400);
}

function expectedTicketCount(order) {
  const quantityOf = (tickets = []) => tickets.reduce((sum, ticket) => sum + Math.max(0, Number(ticket.quantity) || 0), 0);
  if (order.orderType === 'seasonPass') {
    return Math.max(0, Number(order.bookingDetails?.quantity) || 0) * (order.bookingDetails?.fixtures?.length || 0);
  }
  if (order.orderType === 'multiMatch') {
    return (order.bookingDetails?.fixtures || []).reduce((sum, fixture) => sum + quantityOf(fixture.tickets), 0);
  }
  return quantityOf(order.bookingDetails?.tickets);
}

function createNuscHomeMatchPaymentReconciliationService({
  NuscHomeMatchOrder,
  PaymentTransaction,
  Booking,
  recoverCapturedOrder,
  alertService,
  logger = console,
}) {
  async function claimOrder(candidate, now) {
    const reconciliationLeaseId = crypto.randomUUID();
    return NuscHomeMatchOrder.findOneAndUpdate({
      _id: candidate._id,
      status: { $in: ['created', 'paid_no_booking', 'settling'] },
      needsAdminIntervention: { $ne: true },
      $and: [
        { $or: [{ nextReconciliationAt: { $lte: now } }, { nextReconciliationAt: { $exists: false } }, { nextReconciliationAt: null }] },
        { $or: [{ reconciliationLeaseUntil: { $exists: false } }, { reconciliationLeaseUntil: null }, { reconciliationLeaseUntil: { $lte: now } }] },
        { $or: [{ status: { $ne: 'settling' } }, { settlementLeaseUntil: { $lte: now } }, { settlementLeaseUntil: null }] },
      ],
    }, {
      $set: {
        reconciliationLeaseId,
        reconciliationLeaseUntil: new Date(now.getTime() + RECONCILIATION_LEASE_MS),
        lastReconciliationAt: now,
      },
      $inc: { reconciliationAttemptCount: 1 },
    }, { new: true });
  }

  async function recordCapturedTransaction(order, payment, errorMessage = 'Payment was captured and ticket issuance is being reconciled.', {
    forcePending = false,
    needsAdminIntervention = false,
  } = {}) {
    const existing = await PaymentTransaction.findOne({ orderId: order.orderId, paymentId: payment.id }).select('status');
    if (!forcePending && existing && ['completed', 'resolved'].includes(existing.status)) return;

    await PaymentTransaction.findOneAndUpdate({ orderId: order.orderId, paymentId: payment.id }, {
      $setOnInsert: {
        orderId: order.orderId,
        paymentId: payment.id,
        amount: Number(payment.amount) / 100,
        amountPaise: payment.amount,
        currency: payment.currency,
        user: order.user,
        userSnapshot: order.bookingDetails?.user,
        event: order.event,
        bookingDetails: order.bookingDetails,
      },
      $set: {
        amount: Number(payment.amount) / 100,
        amountPaise: payment.amount,
        currency: payment.currency,
        user: order.user,
        userSnapshot: order.bookingDetails?.user,
        event: order.event,
        bookingDetails: order.bookingDetails,
        status: 'paid_no_booking',
        errorMessage,
        needsAdminIntervention,
        nextReconciliationAt: needsAdminIntervention ? null : new Date(),
      },
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  async function persistCapture(order, payment, leaseId, now) {
    if (payment?.status !== 'captured' || payment?.captured !== true || payment.id == null ||
        String(payment.order_id) !== String(order.orderId)) {
      throw Object.assign(new Error('Razorpay has not confirmed a capture for this NUSC order.'), { code: 'PAYMENT_NOT_CAPTURED' });
    }
    if (order.paymentId && order.paymentId !== payment.id) {
      throw Object.assign(new Error('A different payment is already attached to this NUSC order.'), { code: 'PAYMENT_CONFLICT', terminal: true });
    }

    const updated = await NuscHomeMatchOrder.updateOne({
      _id: order._id,
      reconciliationLeaseId: leaseId,
      status: { $nin: ['completed', 'refund_pending', 'refunded'] },
      $or: [{ paymentId: null }, { paymentId: { $exists: false } }, { paymentId: payment.id }],
    }, {
      $set: {
        paymentId: payment.id,
        capturedAt: order.capturedAt || now,
        nextReconciliationAt: now,
        needsAdminIntervention: false,
      },
    });
    if (updated.matchedCount !== 1) {
      const latest = await NuscHomeMatchOrder.findById(order._id).select('status paymentId');
      if (latest?.status === 'completed') return 'completed';
      throw Object.assign(new Error('The NUSC order changed while its payment was being reconciled.'), { code: 'ORDER_STATE_CHANGED' });
    }

    await recordCapturedTransaction(order, payment);
    return Number(payment.amount) === Number(order.amountMinor) && payment.currency === order.currency
      ? 'captured'
      : 'amount-mismatch';
  }

  async function releaseClaim(order, leaseId) {
    await NuscHomeMatchOrder.updateOne(
      { _id: order._id, reconciliationLeaseId: leaseId },
      { $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 } },
    );
  }

  async function scheduleNoCapture(order, leaseId, now, error) {
    const attemptCount = Number(order.reconciliationAttemptCount || 0);
    const needsAdminIntervention = attemptCount >= MAX_RECONCILIATION_ATTEMPTS;
    const message = safeMessage(error || 'No captured payment was found for this NUSC order yet.');
    const updated = await NuscHomeMatchOrder.updateOne({ _id: order._id, reconciliationLeaseId: leaseId }, {
      $set: {
        nextReconciliationAt: needsAdminIntervention ? null : retryAt(attemptCount, now),
        lastReconciliationErrorCode: error?.code || (needsAdminIntervention ? 'CAPTURE_NOT_FOUND' : null),
        lastReconciliationError: message,
        needsAdminIntervention,
      },
      $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 },
    });
    if (needsAdminIntervention && order.paymentId) {
      await alertService.alertReconciliationNeedsReview({
        orderId: order.orderId,
        paymentId: order.paymentId,
        error: Object.assign(new Error(message), { code: error?.code || 'CAPTURE_NOT_FOUND' }),
        attemptCount,
      });
    }
    return updated.matchedCount === 1 ? (needsAdminIntervention ? 'needs-review' : 'no-capture') : 'skipped';
  }

  async function recordFailure(order, payment, leaseId, now, error) {
    if (error?.code === 'PAYMENT_CONFLICT' && payment?.id) {
      await releaseClaim(order, leaseId);
      await alertService.alertAdditionalCapture({ orderId: order.orderId, paymentId: payment.id });
      return 'needs-review';
    }

    const latest = await NuscHomeMatchOrder.findById(order._id).select('status');
    if (latest?.status === 'completed') {
      await releaseClaim(order, leaseId);
      return 'settled';
    }

    const attemptCount = Number(order.reconciliationAttemptCount || 0);
    const message = safeMessage(error);
    const captured = payment?.status === 'captured' && payment?.captured === true;
    const needsAdminIntervention = Boolean(error?.terminal) || attemptCount >= MAX_RECONCILIATION_ATTEMPTS;
    const updated = await NuscHomeMatchOrder.updateOne({
      _id: order._id,
      reconciliationLeaseId: leaseId,
      status: { $ne: 'completed' },
    }, {
      $set: {
        ...(captured && { status: 'paid_no_booking', paymentId: payment.id, capturedAt: order.capturedAt || now }),
        errorMessage: message,
        lastReconciliationErrorCode: error?.code || 'RECONCILIATION_FAILED',
        lastReconciliationError: message,
        nextReconciliationAt: needsAdminIntervention ? null : retryAt(attemptCount, now),
        needsAdminIntervention,
      },
      $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 },
    });
    if (updated.matchedCount !== 1) return 'skipped';

    if (captured) {
      await recordCapturedTransaction(order, payment, message);
      await alertService.alertCapturedPaymentNeedsTickets({
        orderId: order.orderId,
        paymentId: payment.id,
        error: message,
        errorCode: error?.code || 'RECONCILIATION_FAILED',
        attemptCount,
        needsAdminIntervention,
      });
      return needsAdminIntervention ? 'needs-review' : 'failed';
    }

    if (needsAdminIntervention && order.paymentId) {
      await alertService.alertReconciliationNeedsReview({
        orderId: order.orderId,
        paymentId: order.paymentId,
        error,
        attemptCount,
      });
    }
    return needsAdminIntervention ? 'needs-review' : 'failed';
  }

  async function reconcileOrder(candidate, razorpay, now) {
    const order = await claimOrder(candidate, now);
    if (!order) return 'skipped';
    const leaseId = order.reconciliationLeaseId;
    let payment;

    try {
      if (order.paymentId) {
        payment = await razorpay.payments.fetch(order.paymentId);
      } else {
        const response = await razorpay.orders.fetchPayments(order.orderId);
        const captured = (Array.isArray(response?.items) ? response.items : []).filter((item) => (
          item?.status === 'captured' && item?.captured === true && String(item.order_id) === String(order.orderId)
        ));
        if (!captured.length) return scheduleNoCapture(order, leaseId, now);

        captured.sort((left, right) => Number(left.created_at || 0) - Number(right.created_at || 0));
        const matching = captured.find((item) => Number(item.amount) === Number(order.amountMinor) && item.currency === order.currency);
        payment = matching || captured[0];
        for (const extra of captured.filter((item) => item.id !== payment.id)) {
          await alertService.alertAdditionalCapture({ orderId: order.orderId, paymentId: extra.id });
        }
      }

      if (payment?.status !== 'captured' || payment?.captured !== true) {
        return scheduleNoCapture(order, leaseId, now, Object.assign(
          new Error('Razorpay has not confirmed this NUSC payment as captured yet.'),
          { code: 'PAYMENT_NOT_CAPTURED' },
        ));
      }

      const captureState = await persistCapture(order, payment, leaseId, now);
      if (captureState === 'completed') {
        await releaseClaim(order, leaseId);
        return 'settled';
      }
      if (captureState === 'amount-mismatch') {
        throw Object.assign(new Error('The captured payment amount or currency does not match this NUSC order.'), {
          code: 'PAYMENT_AMOUNT_MISMATCH',
          terminal: true,
        });
      }

      await recoverCapturedOrder(order.orderId, payment);
      await NuscHomeMatchOrder.updateOne({ _id: order._id, reconciliationLeaseId: leaseId }, {
        $set: {
          nextReconciliationAt: null,
          nextIntegrityCheckAt: new Date(now.getTime() + RECONCILIATION_INTERVAL_MS),
          reconciliationAttemptCount: 0,
          needsAdminIntervention: false,
          lastReconciliationErrorCode: null,
          lastReconciliationError: null,
        },
        $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 },
      });
      await alertService.resolveOrderAlerts(order.orderId);
      return 'settled';
    } catch (error) {
      try {
        return await recordFailure(order, payment, leaseId, now, error);
      } catch (recordError) {
        logger.error('[NUSC payment reconciliation] Could not record recovery failure:', safeMessage(recordError));
        await releaseClaim(order, leaseId).catch(() => {});
        return 'failed';
      }
    }
  }

  async function reconcileCompletedOrder(candidate, now) {
    const leaseId = crypto.randomUUID();
    const order = await NuscHomeMatchOrder.findOneAndUpdate({
      _id: candidate._id,
      status: 'completed',
      needsAdminIntervention: { $ne: true },
      nextIntegrityCheckAt: { $lte: now },
      $or: [
        { reconciliationLeaseUntil: { $exists: false } },
        { reconciliationLeaseUntil: null },
        { reconciliationLeaseUntil: { $lte: now } },
      ],
    }, {
      $set: {
        reconciliationLeaseId: leaseId,
        reconciliationLeaseUntil: new Date(now.getTime() + RECONCILIATION_LEASE_MS),
        lastReconciliationAt: now,
      },
      $inc: { reconciliationAttemptCount: 1 },
    }, { new: true });
    if (!order) return 'skipped';

    const expected = expectedTicketCount(order);
    const bookings = await Booking.find({ nuscOrderId: order.orderId })
      .select('user status paymentStatus paymentId nuscTicketIndex')
      .lean();
    const validBookings = bookings.filter((booking) => (
      String(booking.user?._id || booking.user) === String(order.user?._id || order.user) &&
      booking.paymentId === order.paymentId &&
      ['confirmed', 'checked-in'].includes(booking.status) &&
      booking.paymentStatus === 'completed'
    ));
    const ticketIndexes = new Set(validBookings.map((booking) => Number(booking.nuscTicketIndex)).filter(Number.isInteger));
    const complete = expected > 0 && bookings.length === expected && validBookings.length === expected && ticketIndexes.size === expected;
    if (complete) {
      await NuscHomeMatchOrder.updateOne({ _id: order._id, reconciliationLeaseId: leaseId }, {
        $set: {
          nextIntegrityCheckAt: new Date(now.getTime() + RECONCILIATION_INTERVAL_MS),
          reconciliationAttemptCount: 0,
        },
        $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 },
      });
      return 'integrity-ok';
    }

    const identityMismatch = bookings.length >= expected && validBookings.length !== expected;
    const needsAdminIntervention = !expected || !order.paymentId || identityMismatch || bookings.length > expected;
    const message = needsAdminIntervention
      ? 'NUSC order integrity data is inconsistent and needs administrator review.'
      : 'Ticket integrity check found missing NUSC dashboard tickets.';
    const updated = await NuscHomeMatchOrder.updateOne({
      _id: order._id,
      reconciliationLeaseId: leaseId,
      status: 'completed',
    }, {
      $set: {
        status: 'paid_no_booking',
        nextReconciliationAt: needsAdminIntervention ? null : now,
        nextIntegrityCheckAt: null,
        needsAdminIntervention,
        lastReconciliationErrorCode: needsAdminIntervention ? 'NUSC_TICKET_INTEGRITY_REVIEW' : 'NUSC_TICKETS_MISSING',
        lastReconciliationError: message,
        errorMessage: message,
      },
      $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 },
    });
    if (updated.matchedCount !== 1) return 'skipped';

    if (order.paymentId) {
      await recordCapturedTransaction(order, {
        id: order.paymentId,
        order_id: order.orderId,
        amount: order.amountMinor,
        currency: order.currency,
        status: 'captured',
        captured: true,
      }, message, { forcePending: true, needsAdminIntervention });
      await alertService.alertCapturedPaymentNeedsTickets({
        orderId: order.orderId,
        paymentId: order.paymentId,
        error: message,
        errorCode: needsAdminIntervention ? 'NUSC_TICKET_INTEGRITY_REVIEW' : 'NUSC_TICKETS_MISSING',
        attemptCount: order.reconciliationAttemptCount,
        needsAdminIntervention,
      });
    } else {
      await alertService.alertReconciliationNeedsReview({
        orderId: order.orderId,
        paymentId: null,
        error: message,
        attemptCount: order.reconciliationAttemptCount,
      });
    }
    return needsAdminIntervention ? 'integrity-needs-review' : 'integrity-pending';
  }

  async function run(razorpay, now = new Date()) {
    const counts = { settled: 0, failed: 0, needsReview: 0, noCapture: 0, skipped: 0, integrityOk: 0, integrityPending: 0, integrityNeedsReview: 0 };
    const candidates = await NuscHomeMatchOrder.find({
      status: { $in: ['created', 'paid_no_booking', 'settling'] },
      needsAdminIntervention: { $ne: true },
      createdAt: { $lte: new Date(now.getTime() - RECONCILIATION_INTERVAL_MS) },
      $or: [{ nextReconciliationAt: { $lte: now } }, { nextReconciliationAt: { $exists: false } }, { nextReconciliationAt: null }],
    }).sort({ nextReconciliationAt: 1, createdAt: 1 }).limit(100).select('_id').lean();

    for (const candidate of candidates) {
      const result = await reconcileOrder(candidate, razorpay, now);
      if (result === 'settled') counts.settled += 1;
      else if (result === 'failed') counts.failed += 1;
      else if (result === 'needs-review') counts.needsReview += 1;
      else if (result === 'no-capture') counts.noCapture += 1;
      else counts.skipped += 1;
    }
    const completedOrders = await NuscHomeMatchOrder.find({
      status: 'completed',
      needsAdminIntervention: { $ne: true },
      nextIntegrityCheckAt: { $lte: now },
      $or: [{ reconciliationLeaseUntil: { $exists: false } }, { reconciliationLeaseUntil: null }, { reconciliationLeaseUntil: { $lte: now } }],
    }).sort({ nextIntegrityCheckAt: 1 }).limit(100).select('_id').lean();
    for (const candidate of completedOrders) {
      const result = await reconcileCompletedOrder(candidate, now);
      if (result === 'integrity-ok') counts.integrityOk += 1;
      else if (result === 'integrity-pending') counts.integrityPending += 1;
      else if (result === 'integrity-needs-review') counts.integrityNeedsReview += 1;
      else counts.skipped += 1;
    }
    return counts;
  }

  return { run, reconcileOrder, reconcileCompletedOrder };
}

module.exports = {
  createNuscHomeMatchPaymentReconciliationService,
  MAX_RECONCILIATION_ATTEMPTS,
  RECONCILIATION_INTERVAL_MS,
  retryAt,
};
