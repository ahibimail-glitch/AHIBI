const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const DailyEvent = require('../models/DailyEvent');
const Scan = require('../models/Scan');
const PaymentTransaction = require('../models/PaymentTransaction');
const NuscHomeMatchOrder = require('../models/NuscHomeMatchOrder');
const AdminBookingDeletion = require('../models/AdminBookingDeletion');
const nuscInventory = require('./nuscHomeMatchInventoryService');

const PAYMENT_STATUSES = ['pending', 'failed', 'completed'];
const BOOKING_STATUSES = ['pending', 'confirmed'];

class BookingDeletionError extends Error {
  constructor(message, code, status = 409) {
    super(message);
    this.name = 'BookingDeletionError';
    this.code = code;
    this.status = status;
  }
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function fail(message, code, status = 409) {
  throw new BookingDeletionError(message, code, status);
}

function validateRequest({ bookingId, adminId, confirmNoPayment, reason }) {
  if (typeof bookingId !== 'string' || !/^[a-f\d]{24}$/i.test(bookingId) || !mongoose.isValidObjectId(bookingId)) {
    fail('The booking ID is invalid.', 'INVALID_BOOKING_ID', 400);
  }
  if (!mongoose.isValidObjectId(adminId)) {
    fail('The Admin identity could not be verified.', 'ADMIN_ID_REQUIRED', 401);
  }
  if (confirmNoPayment !== true) {
    fail('Confirm that the customer received no payment online or offline before deleting this booking.', 'NO_PAYMENT_CONFIRMATION_REQUIRED', 400);
  }
  if (typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 500) {
    fail('Provide a short reason confirming why this unpaid booking is being deleted.', 'DELETION_REASON_REQUIRED', 400);
  }
}

function validateBookingState(booking) {
  if (booking.status === 'checked-in' || booking.entryVerified === true || hasValue(booking.entryVerifiedAt) || hasValue(booking.entryVerifiedBy)) {
    fail('This booking has check-in evidence. Deletion is blocked so its ticket and scan history remain intact.', 'BOOKING_CHECKED_IN');
  }
  if (booking.status === 'refunded' || booking.paymentStatus === 'refunded') {
    fail('This booking is already refunded. Keep its payment and ticket history intact.', 'BOOKING_ALREADY_REFUNDED');
  }
  if (!BOOKING_STATUSES.includes(booking.status)) {
    fail('Only pending or confirmed bookings can be deleted through this action.', 'BOOKING_STATUS_UNSAFE');
  }
  if (!PAYMENT_STATUSES.includes(booking.paymentStatus)) {
    fail('The payment state is not safe to delete. Refresh the booking and review its payment status.', 'BOOKING_PAYMENT_STATE_UNSAFE');
  }
  if (hasValue(booking.onSpotRequestId)) {
    fail('This booking is linked to an on-spot request. Use that request workflow so its inventory history remains consistent.', 'ON_SPOT_REQUEST_LINKED');
  }
  if (
    hasValue(booking.paymentId) || hasValue(booking.externalPaymentId) || hasValue(booking.paymentTicketKey) ||
    hasValue(booking.razorpayPaymentId)
  ) {
    fail('This booking has a payment reference. Use the payment workflow instead of deleting it.', 'BOOKING_PAYMENT_REFERENCE_EXISTS');
  }
  if (booking.parentBookingId && String(booking.parentBookingId) !== String(booking._id)) {
    fail('This ticket belongs to a multi-ticket order. Delete or cancel the complete order through its order workflow.', 'BOOKING_ORDER_LINKED');
  }
  if (
    hasValue(booking.manualSeasonPassOrderId) || hasValue(booking.nuscSeasonPassType) ||
    booking.nuscPartnerTicket?.partnerId || booking.nuscPartnerTicket?.reservationId || booking.nuscPartnerTicket?.partnerOrderId
  ) {
    fail("This booking is linked to a season-pass or partner reservation. Use that reservation's cancellation workflow.", 'BOOKING_RESERVATION_LINKED');
  }
  if (booking.adminTicketReissue && Object.keys(booking.adminTicketReissue).length > 0) {
    fail('This booking is linked to an Admin ticket reissue. Keep its entitlement history intact.', 'BOOKING_REISSUE_LINKED');
  }
  if (hasValue(booking.razorpayOrderId) && String(booking.razorpayOrderId) !== String(booking.nuscOrderId || '')) {
    fail('This booking is linked to an online checkout order. Review the payment order before deleting it.', 'BOOKING_ONLINE_ORDER_LINKED');
  }
}

async function assertNoCapturedPayment(booking, session) {
  const orderIds = [...new Set([booking.nuscOrderId, booking.razorpayOrderId].filter(hasValue).map(String))];
  const filters = [{ bookingIds: booking._id }, ...orderIds.map((orderId) => ({ orderId }))];
  const transaction = await PaymentTransaction.findOne({ $or: filters }).session(session).lean();
  if (transaction && (hasValue(transaction.paymentId) || transaction.status !== 'failed')) {
    fail('A payment transaction is linked to this booking. Deletion is blocked; review the payment record first.', 'BOOKING_PAYMENT_TRANSACTION_EXISTS');
  }
}

async function releaseNuscMatchHold(booking, event, adminId, session) {
  const isNuscMatch = typeof event?.slug === 'string' && event.slug.startsWith('nusc-home-match-');
  if (!hasValue(booking.nuscOrderId)) {
    if (!isNuscMatch) return null;
    if (booking.ticketType === nuscInventory.SUITE_SINGLE) {
      const matchDate = nuscInventory.matchDateFromSlug(event.slug);
      if (!matchDate) {
        fail('The NUSC match date could not be resolved. The booking and inventory were left unchanged.', 'NUSC_MATCH_DATE_NOT_FOUND');
      }
      try {
        const release = await nuscInventory.releaseOfflineSinglePassReservationForAdmin({
          bookingId: booking._id,
          matchDate,
          quantity: Number(booking.quantity),
          adminId,
        }, { session });
        return {
          inventoryType: 'nusc_offline_single_pass_reserve',
          released: release.released,
          quantity: release.quantity,
        };
      } catch (error) {
        if (error.code) fail(error.message, error.code);
        throw error;
      }
    }
    if ([nuscInventory.SUITE_FULL_BOX, nuscInventory.SUITE_SINGLE_MATCH].includes(booking.ticketType)) {
      fail('This NUSC Suite booking has no linked inventory order. Its box allocation cannot be identified safely.', 'NUSC_SUITE_ORDER_LINK_MISSING');
    }
    return null;
  }

  const order = await NuscHomeMatchOrder.findOne({ orderId: booking.nuscOrderId }).session(session);
  if (!order || order.orderType !== 'match') {
    fail('The NUSC match order could not be verified. The booking and inventory were left unchanged.', 'NUSC_ORDER_NOT_FOUND');
  }
  if (order.status !== 'failed') {
    fail('The NUSC order is not in a terminal unpaid state. Use its payment workflow instead of deleting this booking.', 'NUSC_ORDER_NOT_UNPAID');
  }
  if (hasValue(order.paymentId) || (order.bookingIds || []).length > 0) {
    fail('The NUSC order has payment or linked-ticket evidence. Deletion is blocked.', 'NUSC_ORDER_PAYMENT_OR_TICKETS_EXIST');
  }

  const siblingCount = await Booking.countDocuments({ nuscOrderId: booking.nuscOrderId }).session(session);
  if (siblingCount !== 1) {
    fail('This NUSC order contains multiple ticket records. Delete the complete order through its order workflow.', 'NUSC_ORDER_HAS_MULTIPLE_TICKETS');
  }

  const fixtures = order.bookingDetails?.fixtures;
  if ((Array.isArray(fixtures) && fixtures.length !== 1) || (order.matchDates || []).length > 1) {
    fail('This NUSC order covers multiple matches. Delete the complete order through its order workflow.', 'NUSC_ORDER_HAS_MULTIPLE_MATCHES');
  }
  if (!isNuscMatch) {
    fail('The NUSC order does not match this event. The booking and inventory were left unchanged.', 'NUSC_EVENT_MISMATCH');
  }

  try {
    const release = await nuscInventory.releaseUnpaidMatchOrderForAdmin(booking.nuscOrderId, { session });
    return {
      inventoryType: 'nusc_match_hold',
      released: release.released,
      quantity: Math.max(release.ticketCount, release.suiteAllocationCount),
    };
  } catch (error) {
    if (error.code) {
      fail(error.message, error.code);
    }
    throw error;
  }
}

async function reconcileTicketCounter({ booking, inventoryDocument, inventoryType, session }) {
  if (!inventoryDocument) {
    fail('The event record is unavailable, so its ticket inventory could not be released.', 'BOOKING_EVENT_NOT_FOUND');
  }
  const ticket = (inventoryDocument.ticketTypes || []).find((item) => (
    (booking.ticketTypeId && String(item._id) === String(booking.ticketTypeId)) || item.name === booking.ticketType
  ));
  if (!ticket) {
    fail('The ticket type no longer exists on this event. The booking and inventory were left unchanged.', 'BOOKING_TICKET_TYPE_NOT_FOUND');
  }

  const bookingScope = booking.dailyEvent
    ? { dailyEvent: booking.dailyEvent }
    : { event: inventoryDocument._id };
  const [otherPaid = { quantity: 0 }] = await Booking.aggregate([
    {
      $match: {
        ...bookingScope,
        _id: { $ne: booking._id },
        ticketType: booking.ticketType,
        status: { $in: ['confirmed', 'checked-in'] },
        paymentStatus: 'completed',
      },
    },
    { $group: { _id: null, quantity: { $sum: { $ifNull: ['$quantity', 0] } } } },
  ]).session(session);

  const quantity = Number(booking.quantity);
  const sold = Number(ticket.sold || 0);
  const otherSold = Number(otherPaid.quantity || 0);
  if (sold === otherSold) {
    return { inventoryType, released: 0 };
  }
  if (sold !== otherSold + quantity) {
    fail('The event ticket count does not match its active paid bookings. Inventory was left unchanged; reconcile the event count before deleting this booking.', 'BOOKING_INVENTORY_COUNT_MISMATCH');
  }

  ticket.sold = sold - quantity;
  await inventoryDocument.save({ session });
  return { inventoryType, released: quantity };
}

async function deleteUnpaidBooking({ bookingId, adminId, confirmNoPayment, reason }) {
  validateRequest({ bookingId, adminId, confirmNoPayment, reason });
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      result = null;
      const objectId = new mongoose.Types.ObjectId(bookingId);
      const booking = await Booking.findById(objectId).select('+scannerCheckInRequests').session(session);
      if (!booking) {
        const priorDeletion = await AdminBookingDeletion.findOne({ bookingId: objectId, action: 'deleted_unpaid_booking' }).session(session).lean();
        if (priorDeletion) {
          result = {
            success: true,
            idempotentReplay: true,
            slotReleased: priorDeletion.inventoryQuantity > 0,
            message: 'This booking was already deleted and its recorded inventory release is complete.',
          };
          return;
        }
        fail('Booking not found.', 'BOOKING_NOT_FOUND', 404);
      }

      validateBookingState(booking);
      if (booking.scannerCheckInRequests?.length) {
        fail('A scanner check-in request exists for this booking. Deletion is blocked so attendance history remains intact.', 'BOOKING_CHECK_IN_REQUEST_EXISTS');
      }
      const scans = await Scan.countDocuments({ ticket: booking._id }).session(session);
      if (scans > 0) {
        fail('Scan history exists for this booking. Deletion is blocked so check-in evidence remains intact.', 'BOOKING_SCAN_HISTORY_EXISTS');
      }
      await assertNoCapturedPayment(booking, session);

      const eventId = booking.event || booking.eventSnapshot?._id || null;
      const event = eventId ? await Event.findById(eventId).session(session) : null;
      const nuscRelease = await releaseNuscMatchHold(booking, event, adminId, session);
      const ticketCounter = booking.dailyEvent
        ? await reconcileTicketCounter({
          booking,
          inventoryDocument: await DailyEvent.findById(booking.dailyEvent).session(session),
          inventoryType: 'daily_event_ticket',
          session,
        })
        : await reconcileTicketCounter({
          booking,
          inventoryDocument: event,
          inventoryType: 'event_ticket',
          session,
        });
      const inventory = {
        inventoryType: nuscRelease?.inventoryType || ticketCounter.inventoryType,
        released: nuscRelease
          ? Math.max(nuscRelease.released ? nuscRelease.quantity : 0, ticketCounter.released)
          : ticketCounter.released,
        ticketCounterReleased: ticketCounter.released,
      };

      const deleteFilter = {
        _id: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        entryVerified: { $ne: true },
        entryVerifiedAt: null,
        entryVerifiedBy: null,
        $and: [{
          $or: [
            { scannerCheckInRequests: { $exists: false } },
            { scannerCheckInRequests: { $size: 0 } },
          ],
        }],
        paymentId: { $in: [null, ''] },
        externalPaymentId: { $in: [null, ''] },
        paymentTicketKey: { $in: [null, ''] },
        razorpayPaymentId: { $in: [null, ''] },
        onSpotRequestId: { $in: [null, ''] },
      };
      if (booking.__v !== undefined) deleteFilter.__v = booking.__v;
      if (hasValue(booking.nuscOrderId)) deleteFilter.nuscOrderId = booking.nuscOrderId;
      else deleteFilter.nuscOrderId = { $in: [null, ''] };
      if (hasValue(booking.razorpayOrderId)) deleteFilter.razorpayOrderId = booking.razorpayOrderId;
      else deleteFilter.razorpayOrderId = { $in: [null, ''] };
      const deleted = await Booking.deleteOne(deleteFilter, { session });
      if (deleted.deletedCount !== 1) {
        fail('The booking changed while deletion was running. Refresh and review its payment and check-in state.', 'BOOKING_STATE_CHANGED');
      }

      await AdminBookingDeletion.create([{
        bookingId: booking._id,
        eventId: booking.event || booking.eventSnapshot?._id || null,
        dailyEventId: booking.dailyEvent || null,
        adminId,
        action: 'deleted_unpaid_booking',
        ticketType: booking.ticketType,
        quantity: booking.quantity,
        total: Math.max(0, Number(booking.total) || 0),
        previousStatus: booking.status,
        previousPaymentStatus: booking.paymentStatus,
        orderId: booking.nuscOrderId || null,
        reason: reason.trim(),
        inventoryType: inventory.inventoryType,
        inventoryQuantity: inventory.released,
        ticketCounterQuantity: inventory.ticketCounterReleased,
      }], { session });

      result = {
        success: true,
        idempotentReplay: false,
        slotReleased: inventory.released > 0,
        message: inventory.released > 0
          ? `Booking deleted and ${inventory.released} ticket slot${inventory.released === 1 ? '' : 's'} released.`
          : 'Booking deleted. No sold inventory was attributed to this booking.',
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { BookingDeletionError, deleteUnpaidBooking };
