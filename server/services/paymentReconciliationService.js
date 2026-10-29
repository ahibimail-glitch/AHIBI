const crypto = require('crypto');
const Razorpay = require('razorpay');
const Booking = require('../models/Booking');
const PaymentTransaction = require('../models/PaymentTransaction');
const PendingPaymentSession = require('../models/PendingPaymentSession');
const eventPaymentSettlement = require('./eventPaymentSettlementService');
const paymentFulfillmentAlertService = require('./paymentFulfillmentAlertService');

const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000;
const RECONCILIATION_LEASE_MS = 4 * 60 * 1000;
const MAX_RECONCILIATION_ATTEMPTS = 12;
const RETRY_BACKOFF_MS = [60 * 1000, 2 * 60 * 1000, 5 * 60 * 1000, 10 * 60 * 1000, 20 * 60 * 1000, 30 * 60 * 1000];
let interval;
let initialRunTimeout;
let activeRun;
let stopping = false;

function retryAt(attemptCount, now = new Date()) {
  const delay = RETRY_BACKOFF_MS[Math.min(Math.max(0, attemptCount - 1), RETRY_BACKOFF_MS.length - 1)];
  return new Date(now.getTime() + delay);
}

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

async function clearReconciliationLease(sessionId, reconciliationLeaseId) {
  await PendingPaymentSession.updateOne(
    { _id: sessionId, reconciliationLeaseId },
    { $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 } },
  );
}

async function claimSession(candidate, now) {
  const reconciliationLeaseId = crypto.randomUUID();
  const claimed = await PendingPaymentSession.findOneAndUpdate({
    _id: candidate._id,
    settlementVersion: { $in: [1, 2] },
    needsAdminIntervention: { $ne: true },
    status: { $in: ['created', 'paid_no_booking', 'settling'] },
    $and: [
      { $or: [{ nextSettlementAttemptAt: { $lte: now } }, { nextSettlementAttemptAt: { $exists: false } }] },
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
  return claimed;
}

async function markReconciliationFailure(session, leaseId, error) {
  const attemptCount = Number(session.reconciliationAttemptCount || 0);
  const needsAdminIntervention = attemptCount >= MAX_RECONCILIATION_ATTEMPTS;
  const message = String(error?.message || 'Razorpay reconciliation failed').replace(/[\r\n\t]+/g, ' ').slice(0, 400);
  await PendingPaymentSession.updateOne({ _id: session._id, reconciliationLeaseId: leaseId }, {
    $set: {
      nextSettlementAttemptAt: needsAdminIntervention ? null : retryAt(attemptCount),
      lastSettlementAttemptAt: new Date(),
      lastSettlementErrorCode: error?.code || 'RECONCILIATION_FAILED',
      lastSettlementError: message,
      errorMessage: message,
      needsAdminIntervention,
    },
    $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 },
  });
  if (attemptCount >= 3) {
    try {
      await paymentFulfillmentAlertService.alertReconciliationNeedsReview({
        orderId: session.orderId,
        paymentId: session.paymentId,
        error,
        attemptCount,
      });
    } catch (alertError) {
      console.error('[Payment reconciliation] Could not create administrator alert:', alertError.message);
    }
  }
}

async function reconcileSession(candidate, razorpay, now) {
  const session = await claimSession(candidate, now);
  if (!session) return 'skipped';
  const leaseId = session.reconciliationLeaseId;
  let settlementAttempted = false;

  try {
    if (!session.orderId) throw Object.assign(new Error('Saved Razorpay order ID is missing.'), { code: 'ORDER_ID_MISSING' });
    const result = await razorpay.orders.fetchPayments(session.orderId);
    const items = Array.isArray(result?.items) ? result.items : [];
    const captured = items.filter((payment) => payment?.status === 'captured' && payment?.captured === true && payment?.order_id === session.orderId);

    if (captured.length === 0) {
      const needsAdminIntervention = Boolean(session.paymentId) && Number(session.reconciliationAttemptCount || 0) >= MAX_RECONCILIATION_ATTEMPTS;
      await PendingPaymentSession.updateOne({ _id: session._id, reconciliationLeaseId: leaseId }, {
        $set: {
          nextSettlementAttemptAt: needsAdminIntervention ? null : new Date(now.getTime() + RECONCILIATION_INTERVAL_MS),
          needsAdminIntervention,
          ...(needsAdminIntervention && { lastSettlementErrorCode: 'CAPTURE_NOT_FOUND', lastSettlementError: 'Razorpay did not return the previously captured payment.' }),
        },
        $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 },
      });
      if (needsAdminIntervention) {
        try {
          await paymentFulfillmentAlertService.alertReconciliationNeedsReview({
            orderId: session.orderId,
            paymentId: session.paymentId,
            error: Object.assign(new Error('Razorpay did not return the previously captured payment.'), { code: 'CAPTURE_NOT_FOUND' }),
            attemptCount: session.reconciliationAttemptCount,
          });
        } catch (alertError) {
          console.error('[Payment reconciliation] Could not create administrator alert:', alertError.message);
        }
      }
      return 'no-capture';
    }

    const orderedCaptures = captured.sort((left, right) => Number(left.created_at || 0) - Number(right.created_at || 0));
    const selectedPayment = session.paymentId
      ? orderedCaptures.find((payment) => payment.id === session.paymentId)
      : orderedCaptures.find((payment) => Number(payment.amount) === Number(session.amountPaise) && payment.currency === session.currency);

    if (!selectedPayment || Number(selectedPayment.amount) !== Number(session.amountPaise) || selectedPayment.currency !== session.currency) {
      await eventPaymentSettlement.recordPaymentNeedsReview({
        orderId: session.orderId,
        paymentId: session.paymentId || orderedCaptures[0]?.id,
        payment: session.paymentId ? orderedCaptures.find((payment) => payment.id === session.paymentId) : orderedCaptures[0],
        pending: session,
        message: 'Razorpay reports captured funds that do not match the saved checkout amount or currency.',
      });
      await clearReconciliationLease(session._id, leaseId);
      return 'needs-review';
    }

    const extraCaptures = orderedCaptures.filter((payment) => payment.id !== selectedPayment.id);
    for (const extraPayment of extraCaptures) {
      try {
        await paymentFulfillmentAlertService.alertAdditionalCapture({ orderId: session.orderId, paymentId: extraPayment.id });
      } catch (alertError) {
        console.error('[Payment reconciliation] Could not create duplicate-capture alert:', alertError.message);
      }
    }

    await eventPaymentSettlement.recordCapturedPaymentPending({
      orderId: session.orderId,
      paymentId: selectedPayment.id,
      payment: selectedPayment,
      pending: session,
    });
    settlementAttempted = true;
    await eventPaymentSettlement.settleCapturedPayment({
      razorpay,
      orderId: session.orderId,
      paymentId: selectedPayment.id,
    });
    await clearReconciliationLease(session._id, leaseId);
    return 'settled';
  } catch (error) {
    if (error?.terminal) {
      await clearReconciliationLease(session._id, leaseId);
      return 'needs-review';
    }
    if (settlementAttempted) {
      await clearReconciliationLease(session._id, leaseId);
      return 'failed';
    }
    await markReconciliationFailure(session, leaseId, error);
    if (session.paymentId) {
      try {
        await eventPaymentSettlement.recordSettlementFailure({
          orderId: session.orderId,
          paymentId: session.paymentId,
          pending: session,
          error,
        });
      } catch (recordError) {
        console.error('[Payment reconciliation] Could not record settlement failure:', recordError.message);
      }
      if (Number(session.reconciliationAttemptCount || 0) >= MAX_RECONCILIATION_ATTEMPTS) {
        await PendingPaymentSession.updateOne({ _id: session._id }, {
          $set: { needsAdminIntervention: true, nextSettlementAttemptAt: null },
        });
        await PaymentTransaction.updateOne({ orderId: session.orderId, paymentId: session.paymentId }, {
          $set: { needsAdminIntervention: true, nextReconciliationAt: null },
        });
      }
      await clearReconciliationLease(session._id, leaseId);
    }
    return 'failed';
  }
}

async function reconcileCompletedSession(candidate, razorpay, now) {
  const leaseId = crypto.randomUUID();
  const session = await PendingPaymentSession.findOneAndUpdate({
    _id: candidate._id,
    status: 'completed',
    nextIntegrityCheckAt: { $lte: now },
    needsAdminIntervention: { $ne: true },
    $or: [{ reconciliationLeaseUntil: { $exists: false } }, { reconciliationLeaseUntil: null }, { reconciliationLeaseUntil: { $lte: now } }],
  }, {
    $set: { reconciliationLeaseId: leaseId, reconciliationLeaseUntil: new Date(now.getTime() + RECONCILIATION_LEASE_MS) },
  }, { new: true });
  if (!session) return 'skipped';

  const expectedCount = (session.bookingDetails?.tickets || []).reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);
  const bookings = session.paymentId ? await Booking.find({
    paymentId: session.paymentId,
    user: session.user,
    paymentTicketKey: { $exists: true },
    status: { $in: ['confirmed', 'checked-in'] },
    paymentStatus: 'completed',
    qrCode: { $type: 'string', $ne: '' },
  }).select('_id status paymentStatus') : [];
  const complete = expectedCount > 0 && bookings.length === expectedCount && bookings.every((booking) => (
    ['confirmed', 'checked-in'].includes(booking.status) &&
    booking.paymentStatus === 'completed'
  ));

  if (complete) {
    await PendingPaymentSession.updateOne({ _id: session._id, reconciliationLeaseId: leaseId }, {
      $set: { nextIntegrityCheckAt: new Date(now.getTime() + RECONCILIATION_INTERVAL_MS) },
      $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 },
    });
    return 'integrity-ok';
  }

  if (!session.paymentId || !session.orderId || !expectedCount) {
    await eventPaymentSettlement.recordPaymentNeedsReview({
      orderId: session.orderId,
      paymentId: session.paymentId,
      pending: session,
      message: 'Completed checkout is missing its payment or expected ticket details.',
    });
    await clearReconciliationLease(session._id, leaseId);
    return 'needs-review';
  }

  await PendingPaymentSession.updateOne({ _id: session._id, reconciliationLeaseId: leaseId }, {
    $set: {
      status: 'paid_no_booking',
      nextSettlementAttemptAt: now,
      nextIntegrityCheckAt: new Date(now.getTime() + RECONCILIATION_INTERVAL_MS),
      needsAdminIntervention: false,
      errorMessage: 'Ticket integrity check found missing or incomplete dashboard tickets.',
    },
  });
  try {
    await eventPaymentSettlement.settleCapturedPayment({
      razorpay,
      orderId: session.orderId,
      paymentId: session.paymentId,
    });
    return 'repaired';
  } catch (error) {
    await clearReconciliationLease(session._id, leaseId);
    return 'repair-failed';
  }
}

async function reconcileLegacyTransaction(candidate, razorpay, now) {
  const leaseId = crypto.randomUUID();
  const transaction = await PaymentTransaction.findOneAndUpdate({
    _id: candidate._id,
    status: 'paid_no_booking',
    needsAdminIntervention: { $ne: true },
    $and: [
      { $or: [{ nextReconciliationAt: { $lte: now } }, { nextReconciliationAt: { $exists: false } }] },
      { $or: [{ reconciliationLeaseUntil: { $exists: false } }, { reconciliationLeaseUntil: null }, { reconciliationLeaseUntil: { $lte: now } }] },
    ],
  }, {
    $set: { reconciliationLeaseId: leaseId, reconciliationLeaseUntil: new Date(now.getTime() + RECONCILIATION_LEASE_MS) },
    $inc: { reconciliationAttemptCount: 1 },
  }, { new: true });
  if (!transaction) return 'skipped';

  const attemptCount = Number(transaction.reconciliationAttemptCount || 0);
  try {
    if (!transaction.orderId || !transaction.paymentId) {
      throw Object.assign(new Error('Captured payment record is missing its Razorpay IDs.'), { code: 'PAYMENT_IDS_MISSING', terminal: true });
    }
    const payment = await razorpay.payments.fetch(transaction.paymentId);
    if (payment?.status !== 'captured' || payment?.captured !== true || payment?.id !== transaction.paymentId || payment?.order_id !== transaction.orderId) {
      throw Object.assign(new Error('Razorpay has not confirmed this legacy payment as captured.'), { code: 'PAYMENT_NOT_CAPTURED' });
    }
    let pending = await eventPaymentSettlement.findSession(transaction.orderId);
    if (!pending) {
      pending = await eventPaymentSettlement.recoverCheckoutFromProviderOrder({ razorpay, orderId: transaction.orderId });
    }
    if (transaction.user && pending.user?.toString() !== transaction.user.toString()) {
      throw Object.assign(new Error('Saved checkout customer does not match the captured payment record.'), { code: 'PAYMENT_USER_MISMATCH', terminal: true });
    }
    await eventPaymentSettlement.recordCapturedPaymentPending({
      orderId: transaction.orderId,
      paymentId: transaction.paymentId,
      payment,
      pending,
      signature: transaction.signature,
    });
    await eventPaymentSettlement.settleCapturedPayment({
      razorpay,
      orderId: transaction.orderId,
      paymentId: transaction.paymentId,
      signature: transaction.signature,
    });
    return 'settled';
  } catch (error) {
    const needsAdminIntervention = Boolean(error?.terminal) || attemptCount >= MAX_RECONCILIATION_ATTEMPTS;
    const message = String(error?.message || 'Legacy payment recovery failed').replace(/[\r\n\t]+/g, ' ').slice(0, 400);
    await PaymentTransaction.updateOne({ _id: transaction._id, status: 'paid_no_booking', reconciliationLeaseId: leaseId }, {
      $set: {
        nextReconciliationAt: needsAdminIntervention ? null : retryAt(attemptCount, now),
        needsAdminIntervention,
        errorMessage: message,
      },
      $unset: { reconciliationLeaseId: 1, reconciliationLeaseUntil: 1 },
    });
    if (needsAdminIntervention) {
      try {
        await paymentFulfillmentAlertService.alertReconciliationNeedsReview({
          orderId: transaction.orderId,
          paymentId: transaction.paymentId,
          error,
          attemptCount,
        });
      } catch (alertError) {
        console.error('[Payment reconciliation] Could not create legacy-payment alert:', alertError.message);
      }
    }
    return needsAdminIntervention ? 'needs-review' : 'failed';
  }
}

async function executeReconciliation() {
  const counts = { legacySettled: 0, settled: 0, repaired: 0, failed: 0, needsReview: 0 };
  try {
    const razorpay = getRazorpay();
    const now = new Date();
    const legacyTransactions = await PaymentTransaction.find({
      status: 'paid_no_booking',
      orderId: { $type: 'string' },
      paymentId: { $type: 'string' },
      needsAdminIntervention: { $ne: true },
    $or: [{ nextReconciliationAt: { $lte: now } }, { nextReconciliationAt: { $exists: false } }],
    }).sort({ nextReconciliationAt: 1, updatedAt: 1 }).limit(100).select('_id');
    for (const candidate of legacyTransactions) {
      const result = await reconcileLegacyTransaction(candidate, razorpay, now);
      if (result === 'settled') counts.legacySettled += 1;
      if (result === 'failed') counts.failed += 1;
      if (result === 'needs-review') counts.needsReview += 1;
    }

    const pending = await PendingPaymentSession.find({
      settlementVersion: { $in: [1, 2] },
      needsAdminIntervention: { $ne: true },
      status: { $in: ['created', 'paid_no_booking', 'settling'] },
      $or: [{ nextSettlementAttemptAt: { $lte: now } }, { nextSettlementAttemptAt: { $exists: false } }],
    }).sort({ nextSettlementAttemptAt: 1, updatedAt: 1 }).limit(100).select('_id');
    for (const candidate of pending) {
      const result = await reconcileSession(candidate, razorpay, now);
      if (result === 'settled') counts.settled += 1;
      if (result === 'failed') counts.failed += 1;
      if (result === 'needs-review') counts.needsReview += 1;
    }

    const completed = await PendingPaymentSession.find({
      settlementVersion: 2,
      status: 'completed',
      nextIntegrityCheckAt: { $lte: now },
      needsAdminIntervention: { $ne: true },
    }).sort({ nextIntegrityCheckAt: 1 }).limit(100).select('_id');
    for (const candidate of completed) {
      const result = await reconcileCompletedSession(candidate, razorpay, now);
      if (result === 'repaired') counts.repaired += 1;
      if (result === 'repair-failed') counts.failed += 1;
      if (result === 'needs-review') counts.needsReview += 1;
    }
    if (counts.legacySettled || counts.settled || counts.repaired || counts.failed || counts.needsReview) {
      console.log('[Payment reconciliation] Run complete:', counts);
    }
  } catch (error) {
    console.error('[Payment reconciliation] Run failed:', error?.code || error?.message || 'Unknown error');
  }
}

function runReconciliation() {
  if (stopping || activeRun || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return activeRun || Promise.resolve();
  }
  activeRun = executeReconciliation();
  const currentRun = activeRun;
  return currentRun.finally(() => {
    if (activeRun === currentRun) activeRun = null;
  });
}

function start() {
  if (interval) return;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('[Payment reconciliation] Razorpay credentials are missing; scheduled recovery is disabled.');
    return;
  }
  stopping = false;
  initialRunTimeout = setTimeout(() => {
    initialRunTimeout = null;
    runReconciliation();
  }, 0);
  initialRunTimeout.unref?.();
  interval = setInterval(() => runReconciliation(), RECONCILIATION_INTERVAL_MS);
  interval.unref?.();
  console.log('[Payment reconciliation] Scheduled every five minutes.');
}

async function stop() {
  stopping = true;
  if (initialRunTimeout) clearTimeout(initialRunTimeout);
  initialRunTimeout = null;
  if (interval) clearInterval(interval);
  interval = null;
  if (activeRun) await activeRun;
}

module.exports = { start, stop, runReconciliation };
