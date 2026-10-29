const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const PendingPaymentSession = require('../models/PendingPaymentSession');
const NuscHomeMatchOrder = require('../models/NuscHomeMatchOrder');
const nuscHomeMatchController = require('./nuscHomeMatchController');
const eventPaymentSettlement = require('../services/eventPaymentSettlementService');
const paymentFulfillmentAlertService = require('../services/paymentFulfillmentAlertService');

// Per-event purchase limits
const LIMITED_EVENT_ID = '6a17f0cfcea3b566702e86a9';
const MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT = 10;

async function getUserTicketCountForEvent({ eventId, userId }) {
  const rows = await Booking.find({
    event: eventId,
    user: userId,
    status: { $in: ['pending', 'confirmed', 'checked-in'] },
  }).select('quantity');

  return rows.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
}

function verifyPaymentSignature(orderId, paymentId, signature) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

// Debug environment variables

// Initialize Razorpay with error handling
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('Razorpay initialized successfully');
} catch (error) {
  console.error('Failed to initialize Razorpay:', error.message);
}

exports.createOrder = async (req, res) => {
  try {
    const { currency, receipt, bookingDetails, coupon } = req.body;
    // NUSC home match orders must use the inventory-aware checkout flow.
    const requestedEventId = bookingDetails?.event?._id || bookingDetails?.event;
    if (requestedEventId) {
      const requestedEvent = await Event.findById(requestedEventId).select('slug');
      if (requestedEvent?.slug?.startsWith('nusc-home-match-')) {
        return res.status(409).json({ message: 'Use the NUSC home match checkout for these tickets.' });
      }
    }

    // Enforce per-user ticket cap for specific event before taking payment
    try {
      const eventId = requestedEventId;
      const userId = req.user?._id;
      const requestedTickets = Array.isArray(bookingDetails?.tickets)
        ? bookingDetails.tickets.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0)
        : 0;

      if (eventId && userId && String(eventId) === LIMITED_EVENT_ID && requestedTickets > 0) {
        const existingCount = await getUserTicketCountForEvent({ eventId, userId });
        if (existingCount + requestedTickets > MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT) {
          return res.status(400).json({
            message: `You can buy at most ${MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT} tickets for this event in total.`,
            limit: MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT,
            alreadyBooked: existingCount,
            requested: requestedTickets,
            remaining: Math.max(0, MAX_TICKETS_PER_USER_FOR_LIMITED_EVENT - existingCount),
          });
        }
      }
    } catch (e) {
      // If limit check fails unexpectedly, do not block order creation here
    }

    // Enforce booking cutoff (bookingEndTime overrides endDate)
    try {
      const eventId = requestedEventId;
      if (eventId) {
        const eventDoc = await Event.findById(eventId).select('endDate bookingEndTime');
        if (eventDoc) {
          const now = new Date();
          const cutoff = eventDoc.bookingEndTime ? new Date(eventDoc.bookingEndTime) : (eventDoc.endDate ? new Date(eventDoc.endDate) : null);
          if (cutoff && !isNaN(cutoff.getTime()) && now > cutoff) {
            return res.status(400).json({ message: 'Bookings are closed for this event.' });
          }
        }
      }
    } catch (e) {
      // If event lookup fails, do not block order creation here
    }

    if (String(currency || 'INR').toUpperCase() !== 'INR') {
      return res.status(400).json({ message: 'Only INR checkout is supported.' });
    }

    const { order } = await eventPaymentSettlement.createPaymentOrder({
      razorpay,
      bookingDetails,
      coupon,
      authenticatedUser: req.user,
      receipt,
    });
    return res.status(200).json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).send(error.message);
  }
};

exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
  try {
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ success: false, message: 'Missing required payment parameters.' });
    }
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ success: false, message: 'Transaction not legitimate.' });
    }

    let savedCheckout = await eventPaymentSettlement.findSession(orderId);
    if (!savedCheckout) {
      let payment;
      try {
        payment = await razorpay.payments.fetch(paymentId);
      } catch (providerError) {
        return res.status(503).json({
          success: false,
          pending: true,
          code: 'PAYMENT_LOOKUP_FAILED',
          message: 'Payment is being checked. Please do not pay again.',
        });
      }
      if (payment?.status !== 'captured' || payment?.captured !== true || payment?.order_id !== orderId) {
        return res.status(409).json({ success: false, message: 'Razorpay has not confirmed this payment as captured.' });
      }
      try {
        savedCheckout = await eventPaymentSettlement.recoverCheckoutFromProviderOrder({ razorpay, orderId });
      } catch (recoveryError) {
        if (recoveryError.terminal) {
          await eventPaymentSettlement.recordPaymentNeedsReview({
            orderId,
            paymentId,
            payment,
            signature,
            message: recoveryError.message,
          });
        }
        return res.status(recoveryError.statusCode || 503).json({
          success: false,
          pending: true,
          code: recoveryError.code || 'CHECKOUT_RECOVERY_PENDING',
          message: 'Payment was captured. Ticket issuance is being reconciled automatically; please do not pay again.',
        });
      }
    }

    if (savedCheckout.user?.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ success: false, message: 'This checkout belongs to a different account.' });
    }

    let settled;
    try {
      settled = await eventPaymentSettlement.settleCapturedPayment({
        razorpay,
        orderId,
        paymentId,
        signature,
      });
    } catch (settlementError) {
      return res.status(settlementError.statusCode || 503).json({
        success: false,
        pending: true,
        code: settlementError.code || 'SETTLEMENT_PENDING',
        message: settlementError.terminal
          ? 'Payment was received, but ticket issuance needs reconciliation. Please do not pay again.'
          : 'Payment is being checked and ticket issuance will retry. Please do not pay again.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Bookings created successfully.',
      booking: settled.bookings[0],
      allBookings: settled.bookings,
      bookingIds: settled.bookings.map((booking) => booking._id),
      totalTickets: settled.bookings.length,
      ticketTypes: savedCheckout.bookingDetails.tickets.map((ticket) => ({
        type: ticket.ticketType,
        quantity: ticket.quantity,
        price: ticket.price,
      })),
      alreadyProcessed: settled.alreadyCompleted,
    });
  } catch (error) {
    console.error('[Payment verification] Request failed:', error?.code || error?.message || 'Unknown error');
    return res.status(500).json({ success: false, message: 'Payment verification could not be completed yet. Please do not pay again.' });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    let checkout = await eventPaymentSettlement.findSession(req.params.orderId);
    if (!checkout) return res.status(404).json({ success: false, message: 'Checkout was not found.' });
    if (checkout.user?.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ success: false, message: 'This checkout belongs to a different account.' });
    }

    if (checkout.status === 'completed' && checkout.paymentId) {
      let bookings = await Booking.find({
        paymentId: checkout.paymentId,
        user: req.user._id,
        paymentTicketKey: { $exists: true },
        status: { $in: ['confirmed', 'checked-in'] },
        paymentStatus: 'completed',
        qrCode: { $type: 'string', $ne: '' },
      }).sort({ ticketIndex: 1 }).select('_id status paymentStatus');
      const expectedCount = (checkout.bookingDetails?.tickets || []).reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);
      const complete = bookings.length === expectedCount && bookings.every((booking) => (
        ['confirmed', 'checked-in'].includes(booking.status) &&
        booking.paymentStatus === 'completed'
      ));
      if (!complete && expectedCount > 0) {
        try {
          await eventPaymentSettlement.settleCapturedPayment({
            razorpay,
            orderId: checkout.orderId,
            paymentId: checkout.paymentId,
          });
          checkout = await PendingPaymentSession.findById(checkout._id);
          bookings = await Booking.find({
            paymentId: checkout.paymentId,
            user: req.user._id,
            paymentTicketKey: { $exists: true },
            status: { $in: ['confirmed', 'checked-in'] },
            paymentStatus: 'completed',
            qrCode: { $type: 'string', $ne: '' },
          }).sort({ ticketIndex: 1 }).select('_id status paymentStatus');
        } catch (settlementError) {
          // The scheduled reconciler will continue retrying this captured checkout.
        }
      }
      const issued = bookings.filter((booking) => ['confirmed', 'checked-in'].includes(booking.status) && booking.paymentStatus === 'completed');
      if (issued.length === expectedCount && expectedCount > 0) {
        return res.json({
          success: true,
          pending: false,
          status: 'completed',
          bookingIds: issued.map((booking) => booking._id),
          booking: { _id: issued[0]._id },
        });
      }
    }

    return res.json({
      success: false,
      pending: true,
      status: checkout.status,
      message: 'Payment is being checked and tickets will appear automatically. Please do not pay again.',
    });
  } catch (error) {
    console.error('[Payment status] Lookup failed:', error?.code || error?.message || 'Unknown error');
    return res.status(500).json({ success: false, pending: true, message: 'Payment status is temporarily unavailable. Please do not pay again.' });
  }
};

exports.razorpayWebhook = async (req, res) => {
  let signatureVerified = false;
  let eventType;
  let orderId;
  let paymentId;
  const webhookEventId = req.headers['x-razorpay-event-id'];

  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = req.rawBody || req.body;
    if (!secret) {
      console.error('[Razorpay Webhook] Missing webhook secret.');
      return res.status(500).send('Server webhook not configured');
    }
    if (!Buffer.isBuffer(body) || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) {
      return res.status(400).send('Invalid webhook request');
    }

    const expected = crypto.createHmac('sha256', secret).update(body).digest();
    const received = Buffer.from(signature, 'hex');
    if (received.length !== expected.length || !crypto.timingSafeEqual(expected, received)) {
      console.error('[Razorpay Webhook] Invalid signature.');
      return res.status(400).send('Invalid signature');
    }
    signatureVerified = true;

    let event;
    try {
      event = JSON.parse(body.toString('utf8'));
    } catch (error) {
      throw Object.assign(new Error('Signed webhook payload is not valid JSON.'), { code: 'WEBHOOK_INVALID_JSON' });
    }
    eventType = event.event;
    const payment = event.payload?.payment?.entity;
    const order = event.payload?.order?.entity;
    orderId = payment?.order_id || order?.id;
    paymentId = payment?.id;

    if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
      return res.json({ status: 'ok' });
    }
    if (!paymentId || !orderId) {
      if (eventType === 'order.paid') return res.json({ status: 'awaiting_payment_capture_webhook' });
      throw new Error('Captured payment webhook is missing its order or payment ID.');
    }

    const captureConfirmedByWebhook = payment?.status === 'captured' &&
      payment?.captured === true &&
      payment?.id === paymentId &&
      payment?.order_id === orderId;
    if (captureConfirmedByWebhook) {
      // The signed webhook contains the capture snapshot; persist it before a
      // provider lookup can fail and leave the captured payment invisible.
      const pending = await eventPaymentSettlement.findSession(orderId, payment?.notes?.orderIntentId);
      await eventPaymentSettlement.recordCapturedPaymentPending({
        orderId,
        paymentId,
        payment,
        pending,
        confirmedByWebhook: true,
      });
    }

    const providerPayment = await razorpay.payments.fetch(paymentId);
    if (providerPayment?.status !== 'captured' || providerPayment?.captured !== true ||
        providerPayment?.id !== paymentId || providerPayment?.order_id !== orderId) {
      throw new Error('Razorpay has not confirmed the payment capture for this order.');
    }

    const nuscOrder = await NuscHomeMatchOrder.findOne({ orderId });
    if (nuscOrder) {
      try {
        await nuscHomeMatchController.settleCapturedPayment(orderId, providerPayment);
      } catch (settlementError) {
        if (settlementError.code !== 'PAID_NO_BOOKING') throw settlementError;
        await paymentFulfillmentAlertService.alertCapturedPaymentNeedsTickets({
          orderId,
          paymentId,
          error: settlementError.message,
          errorCode: settlementError.code,
          needsAdminIntervention: true,
        });
      }
      return res.json({ status: 'ok' });
    }

    let pending = await eventPaymentSettlement.findSession(orderId, payment?.notes?.orderIntentId);
    if (!pending) {
      try {
        pending = await eventPaymentSettlement.recoverCheckoutFromProviderOrder({ razorpay, orderId });
      } catch (recoveryError) {
        if (recoveryError.terminal) {
          await eventPaymentSettlement.recordPaymentNeedsReview({
            orderId,
            paymentId,
            payment: providerPayment,
            signature,
            message: recoveryError.message,
          });
          return res.json({ status: 'manual_reconciliation_required' });
        }
        throw recoveryError;
      }
    }

    await eventPaymentSettlement.recordCapturedPaymentPending({
      orderId,
      paymentId,
      payment: providerPayment,
      pending,
      signature,
    });
    try {
      const settled = await eventPaymentSettlement.settleCapturedPayment({
        razorpay,
        orderId,
        paymentId,
        orderIntentId: payment?.notes?.orderIntentId,
        signature,
      });
      return res.json({ status: 'ok', settled: true, alreadyCompleted: settled.alreadyCompleted });
    } catch (settlementError) {
      if (settlementError.terminal) {
        return res.json({ status: 'manual_reconciliation_required' });
      }
      throw settlementError;
    }
  } catch (error) {
    console.error('[Razorpay Webhook] Processing failed:', error?.code || error?.message || 'Unknown error');
    if (signatureVerified) {
      try {
        await paymentFulfillmentAlertService.alertWebhookProcessingFailure({
          orderId,
          paymentId,
          webhookEventId,
          eventType,
          error,
        });
      } catch (alertError) {
        console.error('[Razorpay Webhook] Could not create administrator alert:', alertError.message);
      }
    }
    return res.status(500).send('Webhook processing failed');
  }
};
