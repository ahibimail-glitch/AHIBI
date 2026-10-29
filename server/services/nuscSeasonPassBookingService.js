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
}) {
  if (!Array.isArray(fixtures) || fixtures.length < 1 || fixtures.length > 10 || quantity !== 1 || !paymentId) {
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

    let booking = partnerId
      ? await Booking.findOne({
        'nuscPartnerTicket.partnerId': partnerId,
        'nuscPartnerTicket.partnerOrderId': orderId,
        'nuscPartnerTicket.ticketIndex': matchIndex,
      })
      : await Booking.findOne({ nuscOrderId: orderId, nuscTicketIndex: matchIndex });

    if (!booking) {
      const bookingData = {
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
        price: 0,
        total: 0,
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentProvider,
        externalPaymentId: paymentId,
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
        booking = partnerId
          ? await Booking.findOne({
            'nuscPartnerTicket.partnerId': partnerId,
            'nuscPartnerTicket.partnerOrderId': orderId,
            'nuscPartnerTicket.ticketIndex': matchIndex,
          })
          : await Booking.findOne({ nuscOrderId: orderId, nuscTicketIndex: matchIndex });
        if (!booking) throw error;
      }
    }
    bookings.push(booking);

    for (const ticket of event.ticketTypes) {
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
    await Booking.updateMany(
      { nuscOrderId: orderId, parentBookingId: null, _id: { $ne: parentBookingId } },
      { $set: { parentBookingId } }
    );
  }

  return { bookings, bookingIds: bookings.map((booking) => booking._id) };
}

module.exports = { createSeasonPassTicketRecords };
