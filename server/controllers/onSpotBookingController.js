const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const nuscInventory = require('../services/nuscHomeMatchInventoryService');

const PAYMENT_METHODS = new Set(['Cash', 'UPI', 'Card']);

class OnSpotBookingError extends Error {
  constructor(message, status = 400, code = 'ON_SPOT_BOOKING_INVALID') {
    super(message);
    this.name = 'OnSpotBookingError';
    this.status = status;
    this.code = code;
  }
}

function serializeEvent(event, now, nuscTicketTypes = null, matchDate = null) {
  const cutoff = event.bookingEndTime || event.endDate;
  if (cutoff && new Date(cutoff) < now) return null;
  const ticketTypes = nuscTicketTypes || event.ticketTypes || [];

  return {
    _id: String(event._id),
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    isNuscHomeMatch: Boolean(nuscTicketTypes),
    matchDate,
    ticketTypes: ticketTypes.map((ticket) => {
      if (nuscTicketTypes) {
        return {
          _id: String(ticket._id),
          name: ticket.name,
          price: Number(ticket.price),
          available: Math.max(0, Number(ticket.quantity) || 0),
          ...(Array.isArray(ticket.zones) && {
            zones: ticket.zones.map((zone) => ({
              name: zone.name,
              available: Math.max(0, Number(zone.available) || 0),
            })),
          }),
        };
      }
      const capacity = Math.max(0, Number(ticket.quantity) || 0);
      const sold = Math.max(0, Number(ticket.sold) || 0);
      return {
        _id: String(ticket._id),
        name: ticket.name,
        price: Number(ticket.price),
        available: Math.max(0, capacity - sold),
      };
    }).filter((ticket) => Number.isFinite(ticket.price) && ticket.price >= 0),
  };
}

exports.listEvents = async (req, res) => {
  try {
    const events = await Event.find({
      status: 'approved',
    })
      .select('title slug startDate endDate bookingEndTime location ticketTypes')
      .sort({ startDate: 1 })
      .lean();

    const nuscMatches = events
      .map((event) => ({ event, matchDate: nuscInventory.matchDateFromSlug(event.slug) }))
      .filter(({ matchDate }) => matchDate && nuscInventory.FIXTURE_DATES.includes(matchDate));
    const nuscTicketTypesByEventId = await nuscInventory.getMatchAvailabilities(
      nuscMatches.map(({ event, matchDate }) => ({
        key: String(event._id),
        matchDate,
        ticketTypes: event.ticketTypes,
      })),
      { allowSalesClosed: true }
    );
    const now = new Date();
    const nuscEventIds = new Set(nuscMatches.map(({ event }) => String(event._id)));
    return res.json({
      events: events
        .filter((event) => !String(event.slug || '').startsWith('nusc-home-match-') || nuscEventIds.has(String(event._id)))
        .map((event) => {
          const match = nuscMatches.find(({ event: matchEvent }) => String(matchEvent._id) === String(event._id));
          return match
            ? serializeEvent(event, now, nuscTicketTypesByEventId[String(event._id)] || [], match.matchDate)
            : serializeEvent(event, now);
        })
        .filter((event) => event && event.ticketTypes.length > 0),
    });
  } catch (error) {
    console.error('List on-spot booking events error:', error);
    return res.status(500).json({ message: 'Could not load events for on-spot booking.' });
  }
};

exports.createBooking = async (req, res) => {
  const eventId = String(req.body?.eventId || '').trim();
  const ticketTypeId = String(req.body?.ticketTypeId || '').trim();
  const customerName = String(req.body?.customerName || '').trim();
  const customerPhone = String(req.body?.customerPhone || '').trim();
  const customerEmail = String(req.body?.customerEmail || '').trim().toLowerCase();
  const zone = String(req.body?.zone || '').trim();
  const modeOfPayment = String(req.body?.modeOfPayment || '').trim();
  const quantity = Number(req.body?.quantity);
  const requestId = String(req.get('Idempotency-Key') || req.body?.requestId || '').trim();

  if (!mongoose.isValidObjectId(eventId) || !mongoose.isValidObjectId(ticketTypeId)) {
    return res.status(400).json({ message: 'Select a valid event and ticket type.', code: 'INVALID_EVENT_OR_TICKET' });
  }
  if (!customerName || customerName.length > 100) {
    return res.status(400).json({ message: 'Enter a customer name of up to 100 characters.', code: 'INVALID_CUSTOMER_NAME' });
  }
  const phoneDigits = customerPhone.replace(/\D/g, '');
  if (customerPhone.length > 25 || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return res.status(400).json({ message: 'Enter a valid customer phone number.', code: 'INVALID_CUSTOMER_PHONE' });
  }
  if (customerEmail && (customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))) {
    return res.status(400).json({ message: 'Enter a valid customer email address.', code: 'INVALID_CUSTOMER_EMAIL' });
  }
  if (!PAYMENT_METHODS.has(modeOfPayment)) {
    return res.status(400).json({ message: 'Select Cash, UPI, or Card as the payment method.', code: 'INVALID_PAYMENT_METHOD' });
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: 'Ticket quantity must be a positive whole number.', code: 'INVALID_QUANTITY' });
  }
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(requestId)) {
    return res.status(400).json({ message: 'A valid booking request ID is required.', code: 'INVALID_REQUEST_ID' });
  }

  let session;
  let createdBookings = [];
  let eventTitle = '';
  let unitPrice = 0;
  let ticketTypeName = '';
  let nuscSuiteBoxNumbers = [];
  let recordedZone = '';
  let idempotentReplay = false;

  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      nuscSuiteBoxNumbers = [];
      recordedZone = '';
      const priorBookings = await Booking.find({ onSpotRequestId: requestId })
        .sort({ ticketIndex: 1 })
        .session(session);
      if (priorBookings.length) {
        const priorBooking = priorBookings[0];
        const matchesRequest = priorBookings.length === 1 &&
          String(priorBooking.event) === eventId &&
          String(priorBooking.ticketTypeId) === ticketTypeId &&
          priorBooking.customerName === customerName &&
          priorBooking.customerPhone === customerPhone &&
          (priorBooking.customerEmail || '') === customerEmail &&
          (priorBooking.nuscGeneralZone || '') === zone &&
          priorBooking.modeOfPayment === modeOfPayment &&
          priorBooking.quantity === quantity;
        if (!matchesRequest) {
          throw new OnSpotBookingError('This request ID already belongs to a different booking. Start a new booking.', 409, 'REQUEST_ID_CONFLICT');
        }

        createdBookings = [priorBooking];
        eventTitle = priorBooking.eventSnapshot?.title || '';
        unitPrice = Number(priorBooking.price) || 0;
        ticketTypeName = priorBooking.ticketType;
        nuscSuiteBoxNumbers = priorBooking.nuscSuiteBoxNumbers || (priorBooking.nuscSuiteBoxNumber ? [priorBooking.nuscSuiteBoxNumber] : []);
        recordedZone = priorBooking.nuscGeneralZone || '';
        idempotentReplay = true;
        return;
      }

      const event = await Event.findById(eventId).session(session);
      if (!event) throw new OnSpotBookingError('Event not found.', 404, 'EVENT_NOT_FOUND');
      const matchDate = nuscInventory.matchDateFromSlug(event.slug);
      const isNuscHomeMatch = String(event.slug || '').startsWith('nusc-home-match-');
      if (isNuscHomeMatch && !nuscInventory.FIXTURE_DATES.includes(matchDate)) {
        throw new OnSpotBookingError('This NUSC home match is not configured for on-spot sales.', 409, 'SPECIAL_EVENT_INVENTORY');
      }
      if (event.status !== 'approved') {
        throw new OnSpotBookingError('This event is not open for on-spot sales.', 409, 'EVENT_NOT_AVAILABLE');
      }

      const cutoff = event.bookingEndTime || event.endDate;
      if (cutoff && new Date(cutoff) < new Date()) {
        throw new OnSpotBookingError('Bookings are closed for this event.', 409, 'BOOKING_CLOSED');
      }

      const ticketType = event.ticketTypes.id(ticketTypeId);
      if (!ticketType) {
        throw new OnSpotBookingError('Ticket type not found for this event.', 404, 'TICKET_TYPE_NOT_FOUND');
      }

      const capacity = Math.max(0, Number(ticketType.quantity) || 0);
      const sold = Math.max(0, Number(ticketType.sold) || 0);
      if (quantity > capacity - sold) {
        throw new OnSpotBookingError(`Only ${Math.max(0, capacity - sold)} ticket(s) remain for this type.`, 409, 'TICKETS_UNAVAILABLE');
      }

      const eventTicketPrice = Number(ticketType.price);
      if (!Number.isFinite(eventTicketPrice) || eventTicketPrice < 0) {
        throw new OnSpotBookingError('This ticket type has an invalid price.', 409, 'INVALID_TICKET_PRICE');
      }

      if (isNuscHomeMatch) {
        const configuredPrice = nuscInventory.getMatchTicketPrice(ticketType.name);
        unitPrice = Number(configuredPrice?.price);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new OnSpotBookingError('This NUSC ticket type is not configured for on-spot sales.', 409, 'INVALID_TICKET_PRICE');
        }
        if (ticketType.name === nuscInventory.GENERAL_TICKET_TYPE) {
          if (!nuscInventory.GENERAL_SEATING_AREAS.some((area) => area.name === zone)) {
            throw new OnSpotBookingError('Choose a General seating zone for this NUSC ticket.', 400, 'GENERAL_ZONE_REQUIRED');
          }
        } else if (zone) {
          throw new OnSpotBookingError('A seating zone can only be selected for a NUSC General Pass.', 400, 'INVALID_GENERAL_ZONE');
        }

        const onSpotInventory = await nuscInventory.recordOnSpotMatchSale({
          saleId: `on-spot-${requestId}`,
          adminId: req.user._id,
          matchDate,
          ticketLines: [{ ticketType: ticketType.name, quantity, ...(zone ? { zone } : {}) }],
          eventTicketTypes: event.ticketTypes,
        }, session);
        nuscSuiteBoxNumbers = onSpotInventory.suiteAllocations.map((allocation) => allocation.boxNumber);
        recordedZone = zone;
      } else {
        if (zone) throw new OnSpotBookingError('Seating zones are only used for NUSC home matches.', 400, 'INVALID_ZONE');
        unitPrice = eventTicketPrice;
      }

      const inventoryResult = await Event.updateOne(
        {
          _id: event._id,
          status: 'approved',
          ticketTypes: {
            $elemMatch: {
              _id: ticketType._id,
              price: eventTicketPrice,
              quantity: { $gte: quantity },
              $or: [
                { sold: { $lte: capacity - quantity } },
                { sold: { $exists: false } },
              ],
            },
          },
        },
        {
          $inc: {
            'ticketTypes.$.sold': quantity,
            ticketsSold: quantity,
            totalRevenue: unitPrice * quantity,
          },
        },
        { session }
      );

      if ((inventoryResult.modifiedCount ?? inventoryResult.nModified) !== 1) {
        throw new OnSpotBookingError('Tickets or pricing changed. Refresh the event and try again.', 409, 'TICKET_INVENTORY_CHANGED');
      }

      const eventSnapshot = {
        _id: event._id,
        title: event.title,
        banner: event.banner,
        startDate: event.startDate,
        endDate: event.endDate,
        location: {
          address: event.location?.address,
          city: event.location?.city,
        },
      };
      const bookedAt = new Date();
      const booking = new Booking({
        _id: new mongoose.Types.ObjectId(),
        event: event._id,
        eventSnapshot,
        customerName,
        customerPhone,
        ...(customerEmail ? { customerEmail } : {}),
        ticketType: ticketType.name,
        ticketTypeId: ticketType._id,
        quantity,
        price: unitPrice,
        total: unitPrice * quantity,
        status: 'confirmed',
        paymentStatus: 'completed',
        modeOfPayment,
        bookingSource: 'on-spot',
        onSpotRequestId: requestId,
        onSpotCreatedBy: req.user._id,
        ...(recordedZone ? { nuscGeneralZone: recordedZone } : {}),
        ...(nuscSuiteBoxNumbers.length ? {
          nuscSuiteBoxNumbers,
          ...(nuscSuiteBoxNumbers.length === 1 ? { nuscSuiteBoxNumber: nuscSuiteBoxNumbers[0] } : {}),
        } : {}),
        ticketIndex: 1,
        totalTickets: quantity,
        bookedAt,
      });

      await booking.save({ session });
      createdBookings = [booking];
      eventTitle = event.title;
      ticketTypeName = ticketType.name;
    });

    return res.status(201).json({
      message: 'On-spot sale recorded.',
      event: { _id: eventId, title: eventTitle },
      customer: { name: customerName, phone: customerPhone, email: customerEmail || '' },
      modeOfPayment,
      total: unitPrice * quantity,
      idempotentReplay,
      booking: {
        _id: String(createdBookings[0]._id),
        ticketType: ticketTypeName,
        quantity: createdBookings[0].quantity,
        price: createdBookings[0].price,
        total: createdBookings[0].total,
        status: createdBookings[0].status,
        paymentStatus: createdBookings[0].paymentStatus,
        modeOfPayment: createdBookings[0].modeOfPayment,
        nuscGeneralZone: createdBookings[0].nuscGeneralZone || '',
        nuscSuiteBoxNumbers: createdBookings[0].nuscSuiteBoxNumbers || [],
      },
    });
  } catch (error) {
    if (error instanceof OnSpotBookingError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    if (error instanceof nuscInventory.InventoryConflict) {
      return res.status(409).json({ message: error.message, code: error.code });
    }
    console.error('Create on-spot booking error:', error);
    return res.status(500).json({ message: 'Could not record this on-spot booking.' });
  } finally {
    if (session) await session.endSession();
  }
};
