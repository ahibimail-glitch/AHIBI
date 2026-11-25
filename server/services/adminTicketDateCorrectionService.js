const crypto = require('crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Scan = require('../models/Scan');
const { createTicketQrDataUrl } = require('./officialTicketPdfService');

class TicketDateCorrectionError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

function matchesFestival(event, kind) {
  const label = `${event?.title || ''} ${event?.slug || ''}`.toLowerCase();
  if (!label.includes('hornbill') || !label.includes('festival') || dateKey(event?.startDate)?.slice(0, 4) !== '2026') return false;
  if (label.includes('ticket-to-hornbill-showcase') || label.includes('showcase day1')) return false;
  return kind === 'music' ? label.includes('music') : !label.includes('music');
}

function allowedFestivalDate(event, kind, selectedDate) {
  const key = dateKey(selectedDate);
  const fixedStart = kind === 'music' ? '2026-12-02' : '2026-12-01';
  const fixedEnd = '2026-12-10';
  return Boolean(key && key >= fixedStart && key <= fixedEnd &&
    key >= dateKey(event.startDate) && key <= dateKey(event.endDate));
}

async function correctDates({ bookingIds, selectedDate: selectedDateValue, kind, adminId }, deps = {}) {
  const BookingModel = deps.BookingModel || Booking;
  const EventModel = deps.EventModel || Event;
  const ScanModel = deps.ScanModel || Scan;
  const sessionFactory = deps.sessionFactory || (() => mongoose.startSession());
  if (!['day', 'music'].includes(kind)) throw new TicketDateCorrectionError(400, 'INVALID_FESTIVAL', 'Choose Hornbill Festival or Hornbill Music Festival.');
  if (!mongoose.isValidObjectId(adminId)) throw new TicketDateCorrectionError(401, 'ADMIN_REQUIRED', 'Admin authorization is required.');
  if (!Array.isArray(bookingIds) || bookingIds.length < 1 || bookingIds.length > 20 ||
      bookingIds.some((id) => !mongoose.isValidObjectId(id)) || new Set(bookingIds.map(String)).size !== bookingIds.length) {
    throw new TicketDateCorrectionError(400, 'INVALID_BOOKING_SELECTION', 'Select between 1 and 20 distinct bookings.');
  }
  if (typeof selectedDateValue !== 'string' || !/^2026-12-(0[1-9]|10)$/.test(selectedDateValue)) {
    throw new TicketDateCorrectionError(400, 'INVALID_EVENT_DATE', 'Choose a valid date from December 1 to 10, 2026.');
  }
  const selectedDate = new Date(`${selectedDateValue}T00:00:00.000Z`);

  const session = await sessionFactory();
  let result;
  try {
    await session.withTransaction(async () => {
      const bookings = await BookingModel.find({ _id: { $in: bookingIds } })
        .select('+ticketQrToken +adminTicketDateChanges')
        .session(session);
      if (bookings.length !== bookingIds.length) throw new TicketDateCorrectionError(404, 'BOOKING_NOT_FOUND', 'One or more selected bookings no longer exist. Refresh the list.');

      const eventIds = [...new Set(bookings.map((booking) => String(booking.event || '')))];
      if (eventIds.length !== 1 || !mongoose.isValidObjectId(eventIds[0])) {
        throw new TicketDateCorrectionError(409, 'MIXED_EVENT_SELECTION', 'Select tickets from one Hornbill event at a time.');
      }
      const event = await EventModel.findById(eventIds[0]).session(session);
      if (!event || !matchesFestival(event, kind)) throw new TicketDateCorrectionError(409, 'WRONG_FESTIVAL', 'The selected bookings do not match this Hornbill festival.');
      if (!allowedFestivalDate(event, kind, selectedDate)) throw new TicketDateCorrectionError(400, 'DATE_OUT_OF_RANGE', 'The selected date is outside this festival’s published dates.');

      const owners = new Set(bookings.map((booking) => String(booking.user || booking.customerEmail || '')));
      if (owners.size !== 1) throw new TicketDateCorrectionError(409, 'MIXED_CUSTOMERS', 'Select tickets for one customer at a time.');

      const scans = await ScanModel.countDocuments({ ticket: { $in: bookingIds } }).session(session);
      if (scans > 0 || bookings.some((booking) => booking.status === 'checked-in' || booking.entryVerified === true || booking.entryVerifiedAt || booking.entryVerifiedBy)) {
        throw new TicketDateCorrectionError(409, 'TICKET_ALREADY_USED', 'At least one selected ticket has check-in evidence and cannot be moved.');
      }
      if (bookings.some((booking) => booking.status !== 'confirmed' || booking.paymentStatus !== 'completed')) {
        throw new TicketDateCorrectionError(409, 'PAID_TICKETS_REQUIRED', 'Only confirmed, paid bookings can be moved. Resolve payment issues before changing dates.');
      }
      if (bookings.some((booking) => booking.bookingSource === 'on-spot' || booking.nuscPartnerTicket || booking.nuscOrderId)) {
        throw new TicketDateCorrectionError(409, 'SPECIAL_BOOKING', 'A linked or on-spot ticket requires its own inventory workflow.');
      }
      if (bookings.some((booking) => dateKey(booking.selectedDate) === selectedDateValue)) {
        throw new TicketDateCorrectionError(409, 'ALREADY_ON_DATE', 'A selected ticket is already assigned to that date. Refresh and select only tickets that need to move.');
      }

      const at = new Date();
      for (const booking of bookings) {
        const previousDate = booking.selectedDate || event.startDate;
        booking.selectedDate = selectedDate;
        booking.ticketQrToken = crypto.randomBytes(24).toString('hex');
        booking.qrCode = await createTicketQrDataUrl(booking, event);
        booking.updatedAt = at;
        booking.adminTicketDateChanges = [...(booking.adminTicketDateChanges || []), {
          adminId,
          at,
          previousDate,
          selectedDate,
        }];
        await booking.save({ session });
      }

      result = {
        success: true,
        message: `${bookings.length} paid ticket(s) moved to ${selectedDateValue}. Payment records were left unchanged, and each old QR code was invalidated.`,
        count: bookings.length,
        selectedDate: selectedDateValue,
        bookingIds: bookings.map((booking) => String(booking._id)),
      };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { TicketDateCorrectionError, correctDates };
