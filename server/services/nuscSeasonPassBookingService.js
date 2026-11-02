const Booking = require('../models/Booking');
const Event = require('../models/Event');

async function createSeasonPassTicketRecords({
  orderId,
  userId = null,
  fixtures,
  passId,
  quantity = 1,
  paymentId,
  paymentProvider = 'razorpay',
  zone = null,
  memberReferenceHash = null,
  reservationId = null,
  partnerId = null,
  manualOrderId = null,
  pricePerMatch = 0,
  settlementType = null,
  modeOfPayment = null,
  preserveUnrelatedTicketAllocations = false,
}) {
  if (!Array.isArray(fixtures) || fixtures.length < 1 || fixtures.length > 10 || quantity !== 1 || (!paymentId && !manualOrderId)) {
    throw new Error('Season pass ticket issuance details are incomplete');
  }
  const matchIndices = fixtures.map((fixture) => Number(fixture.matchIndex));
  if (new Set(matchIndices).size !== fixtures.length || matchIndices.some((index, indexInList) => (
    !Number.isInteger(index) || index < 1 || index > 10 || (indexInList > 0 && index <= matchIndices[indexInList - 1])
  ))) {
    throw new Error('Season pass fixture indices are invalid');
  }
  await Booking.init();

  const bookings = [];
  for (let fixtureIndex = 0; fixtureIndex < fixtures.length; fixtureIndex += 1) {
    const fixture = fixtures[fixtureIndex];
    const matchIndex = Number(fixture.matchIndex);
    const event = await Event.findById(fixture.eventId).select('+ticketTypes');
    if (!event || !event.slug?.startsWith('nusc-home-match-')) throw new Error('A season pass match listing no longer exists');

    const bookingQuery = partnerId
      ? {
        'nuscPartnerTicket.partnerId': partnerId,
        'nuscPartnerTicket.partnerOrderId': orderId,
        'nuscPartnerTicket.ticketIndex': matchIndex,
      }
      : manualOrderId
        ? { manualSeasonPassOrderId: manualOrderId, manualSeasonPassMatchIndex: matchIndex }
        : { nuscOrderId: orderId, nuscTicketIndex: matchIndex };
    let booking = await Booking.findOne(bookingQuery);

    if (!booking) {
      if (fixture.bookingId) {
        const referenceBooking = await Booking.findById(fixture.bookingId);
        if (referenceBooking) {
          const error = new Error('The preserved ticket reference is already assigned to a different booking.');
          error.code = 'TICKET_REFERENCE_CONFLICT';
          throw error;
        }
      }
      const bookingData = {
        ...(fixture.bookingId && { _id: fixture.bookingId }),
        event: event._id,
        eventSnapshot: {
          _id: event._id,
          title: event.title,
          banner: event.banner,
          startDate: event.startDate,
          endDate: event.endDate,
          location: { address: event.location?.address, city: event.location?.city },
        },
        ...(userId && { user: userId }),
        ticketType: fixture.ticketType,
        quantity: 1,
        price: partnerId ? 0 : Number(pricePerMatch),
        total: partnerId ? 0 : Number(pricePerMatch),
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentProvider,
        ...(paymentId && { externalPaymentId: paymentId }),
        nuscSeasonPassType: passId,
        nuscSeasonMatchIndex: matchIndex,
        ...(zone && { nuscGeneralZone: zone }),
        ...(partnerId ? {
          nuscPartnerTicket: {
            partnerId,
            memberReferenceHash,
            reservationId,
            partnerOrderId: orderId,
            ticketIndex: matchIndex,
          },
        } : manualOrderId ? {
          manualSeasonPassOrderId: manualOrderId,
          manualSeasonPassMatchIndex: matchIndex,
          manualSeasonPassSettlementType: settlementType,
          ...(modeOfPayment && { modeOfPayment }),
        } : {
          paymentId,
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          nuscOrderId: orderId,
          nuscTicketIndex: matchIndex,
          ticketIndex: 1,
          totalTickets: 1,
        }),
      };
      booking = new Booking(bookingData);
      try {
        await booking.save();
      } catch (error) {
        if (error.code !== 11000) throw error;
        booking = await Booking.findOne(partnerId
          ? {
            'nuscPartnerTicket.partnerId': partnerId,
            'nuscPartnerTicket.partnerOrderId': orderId,
            'nuscPartnerTicket.ticketIndex': matchIndex,
          }
          : manualOrderId
            ? { manualSeasonPassOrderId: manualOrderId, manualSeasonPassMatchIndex: matchIndex }
            : { nuscOrderId: orderId, nuscTicketIndex: matchIndex });
        if (!booking) throw error;
      }
    }
    if (fixture.bookingId && String(booking._id) !== String(fixture.bookingId)) {
      const error = new Error('The existing ticket index points to a different ticket reference.');
      error.code = 'TICKET_REFERENCE_CONFLICT';
      throw error;
    }
    bookings.push(booking);

    const ticketTypesToReconcile = preserveUnrelatedTicketAllocations
      ? event.ticketTypes.filter((ticket) => ticket.name === fixture.ticketType)
      : event.ticketTypes;
    for (const ticket of ticketTypesToReconcile) {
      ticket.sold = await Booking.countDocuments({
        event: event._id,
        ticketType: ticket.name,
        bookingSource: { $ne: 'on-spot' },
        status: { $in: ['confirmed', 'checked-in'] },
        paymentStatus: 'completed',
      });
    }
    await event.save();
  }

  const parentBookingId = bookings[0]?._id;
  if (parentBookingId && !partnerId) {
    const parentFilter = manualOrderId
      ? { manualSeasonPassOrderId: manualOrderId, parentBookingId: null, _id: { $ne: parentBookingId } }
      : { nuscOrderId: orderId, parentBookingId: null, _id: { $ne: parentBookingId } };
    await Booking.updateMany(
      parentFilter,
      { $set: { parentBookingId } }
    );
  }

  return { bookings, bookingIds: bookings.map((booking) => booking._id) };
}

const ACTIVE_BOOKING_STATUSES = ['confirmed', 'checked-in'];

async function getPartnerReservationTicketReadback(reservation) {
  const bookings = await Booking.find({
    'nuscPartnerTicket.partnerId': 'nusc',
    'nuscPartnerTicket.partnerOrderId': reservation.partnerOrderId,
  }).sort({ 'nuscPartnerTicket.ticketIndex': 1 }).lean();
  const expectedIndices = reservation.replacesReservationId
    ? (reservation.recoveryStatus === 'issued'
      ? Array.from({ length: 10 }, (_, index) => index + 1)
      : (reservation.replacementMatchIndices || []).map(Number))
    : Array.from({ length: 10 }, (_, index) => index + 1);
  const bookingIds = (reservation.bookingIds || []).map(String);
  const byIndex = new Map();
  let valid = bookings.length === expectedIndices.length && bookingIds.length === expectedIndices.length;
  for (const booking of bookings) {
    const index = Number(booking.nuscPartnerTicket?.ticketIndex);
    if (byIndex.has(index)) valid = false;
    byIndex.set(index, booking);
  }
  expectedIndices.forEach((index, position) => {
    const booking = byIndex.get(index);
    if (!booking || String(booking._id) !== bookingIds[position] ||
        Number(booking.nuscSeasonMatchIndex) !== index ||
        booking.nuscPartnerTicket?.partnerId !== 'nusc' ||
        booking.nuscPartnerTicket?.reservationId !== reservation.reservationId ||
        booking.nuscPartnerTicket?.partnerOrderId !== reservation.partnerOrderId ||
        Number(booking.nuscPartnerTicket?.ticketIndex) !== index ||
        booking.ticketType !== reservation.ticketType ||
        booking.nuscSeasonPassType !== reservation.passId ||
        String(booking.nuscPartnerTicket?.memberReferenceHash) !== String(reservation.memberReferenceHash) ||
        !String(booking.event) ||
        String(booking.event) !== String(reservation.eventIds?.[index - 1]) ||
        booking.paymentProvider !== 'nusc-partner' ||
        booking.externalPaymentId !== reservation.paymentId ||
        !ACTIVE_BOOKING_STATUSES.includes(booking.status) || booking.paymentStatus !== 'completed') valid = false;
  });
  return { complete: valid, bookings, expectedIndices };
}

module.exports = { createSeasonPassTicketRecords, getPartnerReservationTicketReadback };
