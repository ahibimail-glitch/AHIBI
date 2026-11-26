const axios = require('axios');
const crypto = require('crypto');

const round2 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;

/**
 * Build the paid-order webhook payload (matches docs/tourism-merch-webhook-spec.md).
 * GST is derived from the GST-inclusive line price using the per-item rate.
 */
function buildOrderPayload(order) {
  let gstTotal = 0;
  let taxableTotal = 0;

  const items = (order.items || []).map((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const lineTotal = round2(price * qty);
    const rate = typeof item.gstRate === 'number' ? item.gstRate : null;
    let gst = null;
    if (rate != null && rate >= 0) {
      const taxableValue = round2(lineTotal / (1 + rate));
      const gstAmount = round2(lineTotal - taxableValue);
      taxableTotal = round2(taxableTotal + taxableValue);
      gstTotal = round2(gstTotal + gstAmount);
      gst = { taxableValue, gstAmount };
    }
    return {
      itemId: item.itemId,
      name: item.name,
      sku: item.sku || '',
      variant: item.variant || '',
      hsn: item.hsn || '',
      gstRate: rate,
      quantity: qty,
      price,
      lineTotal,
      gst,
    };
  });

  const addr = order.shippingAddress || {};
  const pay = order.payment || {};

  return {
    event: 'order.paid',
    sentAt: new Date().toISOString(),
    order: {
      id: String(order._id || order.id),
      source: order.source,
      sessionId: order.sessionId,
      status: order.status || 'paid',
      currency: order.currency || 'INR',
      amounts: {
        subtotal: Number(order.subtotal) || 0,
        tax: Number(order.tax) || 0,
        shipping: Number(order.shipping) || 0,
        total: Number(order.total) || 0,
        taxableValue: taxableTotal,
        gstTotal,
      },
      items,
      customer: {
        name: addr.fullName || order.user?.name || '',
        email: addr.email || order.user?.email || '',
        phone: addr.phone || '',
      },
      shippingAddress: {
        fullName: addr.fullName || '',
        phone: addr.phone || '',
        email: addr.email || '',
        addressLine1: addr.addressLine1 || '',
        addressLine2: addr.addressLine2 || '',
        city: addr.city || '',
        state: addr.state || '',
        postalCode: addr.postalCode || '',
        country: addr.country || '',
      },
      payment: {
        gateway: 'razorpay',
        paymentId: pay.transactionId || '',
        paymentLinkId: pay.paymentLinkId || '',
        gatewayOrderId: pay.gatewayOrderId || '',
        status: pay.status || order.status || 'paid',
        paidAt: pay.verifiedAt ? new Date(pay.verifiedAt).toISOString() : new Date().toISOString(),
      },
    },
  };
}

/**
 * Deliver a paid-order webhook to a partner — a SINGLE attempt.
 * Scheduling and retries are handled by partnerWebhookRetryService.
 * Dormant unless partner.webhookUrl is configured (so leaving
 * TOURISM_MERCH_WEBHOOK_URL unset keeps deliveries OFF).
 */
async function deliverOnce(order, partner) {
  if (!partner || !partner.webhookUrl) {
    return { skipped: true };
  }

  const payload = buildOrderPayload(order);
  const rawBody = JSON.stringify(payload);
  const deliveryId = crypto.randomUUID();

  const headers = {
    'Content-Type': 'application/json',
    'x-ahibi-event': payload.event,
    'x-ahibi-delivery': deliveryId,
  };
  if (partner.apiKey) headers['x-api-key'] = partner.apiKey;
  if (partner.webhookSecret) {
    headers['x-ahibi-signature'] =
      'sha256=' + crypto.createHmac('sha256', partner.webhookSecret).update(rawBody).digest('hex');
  }

  try {
    const res = await axios.post(partner.webhookUrl, rawBody, { headers, timeout: 15000 });
    return { success: true, status: res.status, deliveryId };
  } catch (err) {
    return { success: false, status: err.response?.status, error: err.code || err.message, deliveryId };
  }
}

module.exports = { deliverOnce, buildOrderPayload };
