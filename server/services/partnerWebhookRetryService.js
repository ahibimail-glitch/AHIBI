const MerchOrder = require('../models/ArtistMerch');
const { resolvePartner } = require('./merchPartners');
const partnerWebhook = require('./partnerWebhookService');

const INTERVAL_MS = 2 * 60 * 1000;         // scan every 2 minutes
const MAX_ATTEMPTS = 8;                     // give up (and flag) after this many
const BACKOFF_MS = [60e3, 5 * 60e3, 15 * 60e3, 30 * 60e3, 60 * 60e3, 2 * 60 * 60e3];
const BATCH = 20;

let interval = null;
let activeRun = false;
let stopping = false;

function nextAttemptAt(attemptCount, now = new Date()) {
  const delay = BACKOFF_MS[Math.min(Math.max(0, attemptCount - 1), BACKOFF_MS.length - 1)];
  return new Date(now.getTime() + delay);
}

/**
 * Make one delivery attempt for an order and update its webhookDelivery state.
 */
async function processOrderDoc(order) {
  const partner = resolvePartner(order.source);
  const wd = (order.webhookDelivery && order.webhookDelivery.toObject)
    ? order.webhookDelivery.toObject()
    : (order.webhookDelivery || {});

  // If this source has no webhook configured, don't keep scanning it.
  if (!partner.webhookUrl) {
    wd.status = 'disabled';
    wd.nextAttemptAt = undefined;
    order.webhookDelivery = wd;
    await order.save();
    return { skipped: true };
  }

  const res = await partnerWebhook.deliverOnce(order, partner);
  wd.attemptCount = (wd.attemptCount || 0) + 1;
  wd.lastAttemptAt = new Date();
  wd.lastDeliveryId = res.deliveryId;

  if (res.success) {
    wd.status = 'delivered';
    wd.deliveredAt = new Date();
    wd.lastStatusCode = res.status;
    wd.lastError = undefined;
    wd.nextAttemptAt = undefined;
    wd.needsAdminIntervention = false;
    console.log(`[PartnerWebhookRetry] delivered order ${order._id} (attempt ${wd.attemptCount})`);
  } else {
    wd.lastStatusCode = res.status;
    wd.lastError = String(res.error || 'delivery failed');
    if (wd.attemptCount >= MAX_ATTEMPTS) {
      wd.status = 'exhausted';
      wd.nextAttemptAt = undefined;
      wd.needsAdminIntervention = true;
      console.error(`[PartnerWebhookRetry] EXHAUSTED order ${order._id} after ${wd.attemptCount} attempts: ${wd.lastError}`);
    } else {
      wd.status = 'pending';
      wd.nextAttemptAt = nextAttemptAt(wd.attemptCount);
      console.warn(`[PartnerWebhookRetry] attempt ${wd.attemptCount} failed for order ${order._id} (${wd.lastError}); next at ${wd.nextAttemptAt.toISOString()}`);
    }
  }

  order.webhookDelivery = wd;
  await order.save();
  return res;
}

/**
 * Immediate attempt for a freshly paid order. Safe to call fire-and-forget.
 */
async function enqueueAndTry(orderId) {
  try {
    const order = await MerchOrder.findById(orderId);
    if (!order || !order.webhookDelivery) return;
    if (order.webhookDelivery.status === 'delivered') return;
    await processOrderDoc(order);
  } catch (e) {
    console.error('[PartnerWebhookRetry] immediate attempt error:', e.message);
  }
}

/**
 * Background scan: retry all pending deliveries that are due.
 */
async function runOnce() {
  if (activeRun || stopping) return;
  activeRun = true;
  try {
    const now = new Date();
    const due = await MerchOrder.find({
      'webhookDelivery.status': 'pending',
      'webhookDelivery.nextAttemptAt': { $lte: now },
    }).limit(BATCH);

    for (const order of due) {
      if (stopping) break;
      try {
        await processOrderDoc(order);
      } catch (e) {
        console.error(`[PartnerWebhookRetry] process error for order ${order._id}:`, e.message);
      }
    }
  } catch (e) {
    console.error('[PartnerWebhookRetry] run error:', e.message);
  } finally {
    activeRun = false;
  }
}

/**
 * Admin manual resend: reset the delivery window and try now.
 */
async function resend(orderId) {
  const order = await MerchOrder.findById(orderId);
  if (!order) return { success: false, error: 'order not found' };
  const partner = resolvePartner(order.source);
  if (!partner.webhookUrl) return { success: false, error: 'webhook not configured for this source' };

  const prev = (order.webhookDelivery && order.webhookDelivery.toObject)
    ? order.webhookDelivery.toObject()
    : (order.webhookDelivery || {});
  order.webhookDelivery = {
    ...prev,
    status: 'pending',
    attemptCount: 0,
    nextAttemptAt: new Date(),
    needsAdminIntervention: false,
    lastError: undefined,
  };
  await order.save();

  const res = await processOrderDoc(order);
  return { success: !!(res && res.success), status: res && res.status, deliveryId: res && res.deliveryId };
}

function start() {
  if (interval) return;
  stopping = false;
  interval = setInterval(runOnce, INTERVAL_MS);
  console.log('[PartnerWebhookRetry] started');
}

function stop() {
  stopping = true;
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

module.exports = { start, stop, runOnce, enqueueAndTry, resend, processOrderDoc };
