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
  if (!Array.isArray(fixtures) || fixtures.length !== 10 || quantity !== 1 || !paymentId) {
    throw new Error('Season pass ticket issuance details are incomplete');
  }
  await Booking.init();

  const bookings = [];
  for (let fixtureIndex = 0; fixtureIndex < fixtures.length; fixtureIndex += 1) {
    const fixture = fixtures[fixtureIndex];
    if (fixture.matchIndex !== fixtureIndex + 1) throw new Error('Season pass fixture order is invalid');
    const event = await Event.findById(fixture.eventId).select('+ticketTypes');
    if (!event || !event.slug?.startsWith('nusc-home-match-')) throw new Error('A season pass match listing no longer exists');

    let booking = partnerId
      ? await Booking.findOne({
        'nuscPartnerTicket.partnerId': partnerId,
        'nuscPartnerTicket.partnerOrderId': orderId,
        'nuscPartnerTicket.ticketIndex': fixtureIndex + 1,
      })
      : await Booking.findOne({ nuscOrderId: orderId, nuscTicketIndex: fixtureIndex + 1 });

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
        nuscSeasonMatchIndex: fixtureIndex + 1,
        ...(zone && { nuscGeneralZone: zone }),
        ...(partnerId ? {
          nuscPartnerTicket: {
            partnerId,
            memberReferenceHash,
            reservationId,
            partnerOrderId: orderId,
            ticketIndex: fixtureIndex + 1,
          },
        } : {
          paymentId,
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          nuscOrderId: orderId,
          nuscTicketIndex: fixtureIndex + 1,
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
            'nuscPartnerTicket.ticketIndex': fixtureIndex + 1,
          })
          : await Booking.findOne({ nuscOrderId: orderId, nuscTicketIndex: fixtureIndex + 1 });
        if (!booking) throw error;
      }
    }
    bookings.push(booking);

    for (const ticket of event.ticketTypes) {
      ticket.sold = await Booking.countDocuments({
        event: event._id,
        ticketType: ticket.name,
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
