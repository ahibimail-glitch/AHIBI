const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Scan = require('../models/Scan');

const PAYMENT_REFERENCE_FIELDS = [
  'paymentId',
  'paymentProvider',
  'externalPaymentId',
  'paymentTicketKey',
  'razorpayPaymentId',
  'razorpayOrderId',
];

const EXTERNAL_ORDER_FIELDS = [
  'nuscOrderId',
  'nuscTicketIndex',
  'nuscSeasonPassType',
  'nuscSeasonMatchIndex',
  'manualSeasonPassOrderId',
  'manualSeasonPassMatchIndex',
  'manualSeasonPassSettlementType',
  'nuscPartnerTicket',
  'onSpotRequestId',
  'onSpotCreatedBy',
  'parentBookingId',
];

class AdminBookingLifecycleError extends Error {
  constructor(message, code, status = 409) {
    super(message);
    this.name = 'AdminBookingLifecycleError';
    this.code = code;
    this.status = status;
  }
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function partnerOrPassLinked(booking) {
  return Boolean(
    booking.nuscPartnerTicket?.partnerId ||
    booking.nuscPartnerTicket?.reservationId ||
    booking.nuscPartnerTicket?.partnerOrderId ||
    hasValue(booking.nuscOrderId) ||
    hasValue(booking.nuscSeasonPassType) ||
    hasValue(booking.manualSeasonPassOrderId) ||
    booking.paymentProvider === 'nusc-partner' ||
    booking.bookingSource === 'on-spot' ||
    hasValue(booking.onSpotRequestId)
  );
}

function paymentReferencePresent(booking) {
  return booking.paymentStatus === 'completed' || booking.paymentStatus === 'refunded' ||
    PAYMENT_REFERENCE_FIELDS.some((field) => hasValue(booking[field]));
}

function issued(booking) {
  return booking.status === 'confirmed' || hasValue(booking.qrCode);
}

function safeCancellationFilter(bookingId) {
  const filter = {
    _id: bookingId,
    status: 'pending',
    paymentStatus: { $in: ['pending', 'failed'] },
    entryVerified: { $ne: true },
    entryVerifiedAt: null,
    entryVerifiedBy: null,
    bookingSource: { $ne: 'on-spot' },
  };
  for (const field of [...PAYMENT_REFERENCE_FIELDS, ...EXTERNAL_ORDER_FIELDS]) {
    filter[field] = null;
  }
  return filter;
}

function cancellationBlocked(booking) {
  if (
    booking.status === 'checked-in' ||
    booking.entryVerified === true ||
    hasValue(booking.entryVerifiedAt) ||
    hasValue(booking.entryVerifiedBy)
  ) {
    return new AdminBookingLifecycleError(
      'This booking has check-in evidence. Deletion and cancellation are blocked so its ticket and scan history remain intact; use the event manual-review process.',
      'BOOKING_CHECKED_IN',
    );
  }
  if (booking.status === 'refunded' || booking.paymentStatus === 'refunded') {
    return new AdminBookingLifecycleError(
      'This booking is already refunded. Its record and payment history must be retained; no further deletion is allowed.',
      'BOOKING_ALREADY_REFUNDED',
    );
  }
  if (partnerOrPassLinked(booking)) {
    return new AdminBookingLifecycleError(
      'This booking is linked to NUSC RISE, an on-spot sale, or a season-pass reservation. Use that order\'s cancellation or inventory workflow; generic booking deletion is blocked.',
      'PARTNER_RESERVATION_LINKED',
    );
  }
  if (issued(booking)) {
    return new AdminBookingLifecycleError(
      'This is an active or issued ticket. Deletion is blocked; use the existing event cancellation/refund workflow to preserve ticket and inventory history.',
      'BOOKING_ISSUED',
    );
  }
  if (paymentReferencePresent(booking)) {
    return new AdminBookingLifecycleError(
      'This booking has a completed payment or payment reference. Deletion is blocked; use the order\'s payment cancellation/refund workflow.',
      'BOOKING_PAID',
    );
  }
  if (booking.status !== 'pending') {
    return new AdminBookingLifecycleError(
      'Only unpaid, unissued pending bookings can be cancelled here. This booking is retained; review its order and inventory history before taking another action.',
      'BOOKING_NOT_CANCELLABLE',
    );
  }
  if (!['pending', 'failed'].includes(booking.paymentStatus)) {
    return new AdminBookingLifecycleError(
      'The payment state is not a verified unpaid state. The booking is retained for payment review.',
      'BOOKING_PAYMENT_STATE_UNSAFE',
    );
  }
  return null;
}

function safeBookingSummary(booking) {
  return { _id: booking._id, status: booking.status, paymentStatus: booking.paymentStatus };
}

async function cancelPendingBooking({ bookingId, adminId }, deps = {}) {
  const BookingModel = deps.BookingModel || Booking;
  const ScanModel = deps.ScanModel || Scan;
  const sessionFactory = deps.sessionFactory || (() => mongoose.startSession());
  if (typeof bookingId !== 'string' || !/^[a-f\d]{24}$/i.test(bookingId) || !mongoose.isValidObjectId(bookingId)) {
    throw new AdminBookingLifecycleError('The booking ID is invalid.', 'INVALID_BOOKING_ID', 400);
  }
  if (!mongoose.isValidObjectId(adminId)) {
    throw new AdminBookingLifecycleError('The Admin identity could not be verified.', 'ADMIN_ID_REQUIRED', 401);
  }

  const session = await sessionFactory();
  let result;
  try {
    await session.withTransaction(async () => {
      const booking = await BookingModel.findById(bookingId).session(session);
      if (!booking) {
        throw new AdminBookingLifecycleError('Booking not found.', 'BOOKING_NOT_FOUND', 404);
      }
      if (booking.status === 'cancelled') {
        result = {
          success: true,
          code: 'BOOKING_ALREADY_CANCELLED',
          message: 'This booking is already cancelled. Its record, payment references, reservation metadata, and scan history were retained.',
          idempotentReplay: true,
          booking: safeBookingSummary(booking),
        };
        return;
      }

      const scanCount = await ScanModel.countDocuments({ ticket: booking._id }).session(session);
      if (scanCount > 0) {
        throw new AdminBookingLifecycleError(
          'Scan history exists for this booking. Deletion and cancellation are blocked so check-in evidence remains intact; use the event manual-review process.',
          'BOOKING_SCAN_HISTORY_EXISTS',
        );
      }

      const blocked = cancellationBlocked(booking);
      if (blocked) throw blocked;

      const at = new Date();
      const updated = await BookingModel.findOneAndUpdate(
        safeCancellationFilter(bookingId),
        {
          $set: { status: 'cancelled', updatedAt: at },
          $push: {
            adminLifecycleAudit: {
              $each: [{
                action: 'cancelled_unissued_pending_booking',
                adminId,
                at,
                previousStatus: booking.status,
                previousPaymentStatus: booking.paymentStatus,
              }],
            },
          },
        },
        { new: true, runValidators: true, session },
      );

      if (updated) {
        result = {
          success: true,
          code: 'BOOKING_CANCELLED',
          message: 'Unpaid pending booking cancelled and retained for audit. Payment, reservation, scan history, and inventory were not changed.',
          idempotentReplay: false,
          booking: safeBookingSummary(updated),
        };
        return;
      }

      const current = await BookingModel.findById(bookingId).session(session);
      if (current?.status === 'cancelled') {
        result = {
          success: true,
          code: 'BOOKING_ALREADY_CANCELLED',
          message: 'This booking was cancelled by another Admin action. Its record and audit history were retained.',
          idempotentReplay: true,
          booking: safeBookingSummary(current),
        };
        return;
      }
      if (current) {
        const currentScanCount = await ScanModel.countDocuments({ ticket: current._id }).session(session);
        if (currentScanCount > 0) {
          throw new AdminBookingLifecycleError(
            'Scan history appeared while this action was running. Deletion and cancellation are blocked so check-in evidence remains intact; review the event manually.',
            'BOOKING_SCAN_HISTORY_EXISTS',
          );
        }
        const currentBlock = cancellationBlocked(current);
        if (currentBlock) throw currentBlock;
      }
      throw new AdminBookingLifecycleError(
        'The booking changed while this action was being processed. Refresh the record and review its payment, ticket, and inventory state.',
        'BOOKING_STATE_CHANGED',
      );
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { AdminBookingLifecycleError, cancelPendingBooking };
