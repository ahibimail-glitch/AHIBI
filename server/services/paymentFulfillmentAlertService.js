const AdminNotification = require('../models/AdminNotification');

function safeMessage(error) {
  const message = String(error?.message || error || 'Unknown settlement error')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 400);
  return message || 'Unknown settlement error';
}

async function upsertPaymentAlert({ dedupeKey, title, message, orderId, paymentId, webhookEventId, eventType, attemptCount, errorCode, needsAdminIntervention = false }) {
  if (!dedupeKey) return null;
  const priority = needsAdminIntervention ? 'urgent' : 'high';
  const metadata = {
    dedupeKey,
    orderId: orderId || null,
    paymentId: paymentId || null,
    webhookEventId: webhookEventId || null,
    eventType: eventType || null,
    attemptCount: Number(attemptCount || 0),
    errorCode: errorCode || null,
    needsAdminIntervention: Boolean(needsAdminIntervention),
    lastError: safeMessage(message),
  };
  const values = {
    type: 'payment_failed',
    title,
    message: safeMessage(message),
    priority,
    category: 'payment',
    status: 'unread',
    actionRequired: true,
    actionType: 'review',
    entityType: 'Payment',
    metadata,
    triggeredBy: { userType: 'System', name: 'Payment fulfillment monitor' },
    redirectUrl: '/admin',
  };

  try {
    return await AdminNotification.findOneAndUpdate(
      { 'metadata.dedupeKey': dedupeKey },
      { $set: values, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return AdminNotification.findOne({ 'metadata.dedupeKey': dedupeKey });
    }
    throw error;
  }
}

async function alertCapturedPaymentNeedsTickets({ orderId, paymentId, error, errorCode, attemptCount, needsAdminIntervention = false }) {
  return upsertPaymentAlert({
    dedupeKey: 'payment-fulfillment:' + orderId,
    title: needsAdminIntervention ? 'Captured payment needs ticket review' : 'Captured payment is awaiting tickets',
    message: 'Captured Razorpay payment for order ' + orderId + ' has no confirmed tickets yet. ' + safeMessage(error),
    orderId,
    paymentId,
    attemptCount,
    errorCode,
    needsAdminIntervention,
  });
}

async function alertWebhookProcessingFailure({ orderId, paymentId, webhookEventId, eventType, error }) {
  const eventKey = webhookEventId || [orderId || 'unknown-order', paymentId || 'unknown-payment', eventType || 'unknown-event'].join(':');
  return upsertPaymentAlert({
    dedupeKey: 'razorpay-webhook:' + eventKey,
    title: 'Razorpay webhook processing failed',
    message: 'A verified Razorpay ' + (eventType || 'payment') + ' webhook could not be processed for order ' + (orderId || 'unknown') + '. ' + safeMessage(error),
    orderId,
    paymentId,
    webhookEventId,
    eventType,
    errorCode: error?.code,
    needsAdminIntervention: true,
  });
}

async function alertReconciliationNeedsReview({ orderId, paymentId, error, attemptCount }) {
  return upsertPaymentAlert({
    dedupeKey: 'payment-reconciliation:' + orderId,
    title: 'Payment reconciliation needs review',
    message: 'The payment status for order ' + orderId + ' could not be reconciled automatically. ' + safeMessage(error),
    orderId,
    paymentId,
    attemptCount,
    errorCode: error?.code || 'RECONCILIATION_FAILED',
    needsAdminIntervention: true,
  });
}

async function alertAdditionalCapture({ orderId, paymentId }) {
  return upsertPaymentAlert({
    dedupeKey: 'payment-duplicate-capture:' + orderId + ':' + paymentId,
    title: 'Additional captured payment needs review',
    message: 'Razorpay reports more than one captured payment for order ' + orderId + '. Review payment ' + paymentId + ' for a duplicate charge.',
    orderId,
    paymentId,
    errorCode: 'MULTIPLE_CAPTURED_PAYMENTS',
    needsAdminIntervention: true,
  });
}

async function resolveOrderAlerts(orderId) {
  if (!orderId) return;
  await AdminNotification.updateMany(
    {
      category: 'payment',
      'metadata.orderId': orderId,
      'metadata.dedupeKey': { $regex: /^(payment-fulfillment|payment-reconciliation|razorpay-webhook):/ },
      status: { $ne: 'archived' },
    },
    { $set: { status: 'archived', actionRequired: false, actionType: 'none' } }
  );
}

module.exports = {
  alertCapturedPaymentNeedsTickets,
  alertWebhookProcessingFailure,
  alertReconciliationNeedsReview,
  alertAdditionalCapture,
  resolveOrderAlerts,
};
