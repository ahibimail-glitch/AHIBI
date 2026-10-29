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

function getSeasonPassOnlineStatus(matchesByDate, availabilityByEventId) {
  const fixtureTickets = Object.fromEntries(nuscInventory.FIXTURE_DATES.map((date) => {
    const match = matchesByDate.get(date);
    const tickets = match ? availabilityByEventId[String(match.event._id)] || [] : [];
    return [date, new Map(tickets.map((ticket) => [ticket.name, ticket]))];
  }));

  return Object.fromEntries(Object.entries(nuscInventory.SEASON_PASS_OPTIONS).map(([passId, option]) => {
    const tickets = nuscInventory.FIXTURE_DATES.map((date) => fixtureTickets[date].get(option.ticketType));
    if (option.ticketType === nuscInventory.GENERAL_TICKET_TYPE) {
      const zones = nuscInventory.GENERAL_SEATING_AREAS.map((area) => ({
        name: area.name,
        onlineSoldOut: tickets.some((ticket) => {
          const zone = ticket?.zones?.find((item) => item.name === area.name);
          return !zone || Number(zone.available) < 1;
        }),
      }));
      return [passId, {
        onlineSoldOut: !zones.some((zone) => !zone.onlineSoldOut),
        zones,
      }];
    }

    return [passId, { onlineSoldOut: tickets.some((ticket) => !ticket || Number(ticket.quantity) < 1) }];
  }));
}

function serializeEvent(event, now, nuscTicketTypes = null, matchDate = null, seasonPassOptions = null, seasonPassOnlineStatus = {}) {
  const cutoff = event.bookingEndTime || event.endDate;
  if (cutoff && new Date(cutoff) < now) return null;
  const ticketTypes = nuscTicketTypes || event.ticketTypes || [];
  const isNuscHomeMatch = Boolean(nuscTicketTypes);

  const serializedTicketTypes = ticketTypes.map((ticket) => {
    const onlineAvailable = isNuscHomeMatch
      ? Math.max(0, Number(ticket.quantity) || 0)
      : Math.max(0, (Number(ticket.quantity) || 0) - (Number(ticket.sold) || 0));
    return {
      _id: String(ticket._id),
      selectionKey: String(ticket._id),
      ticketTypeId: String(ticket._id),
      name: ticket.name,
      price: Number(ticket.price),
      onlineAvailable,
      onlineSoldOut: onlineAvailable < 1,
      ...(isNuscHomeMatch && Array.isArray(ticket.zones) && {
        zones: ticket.zones.map((zone) => ({
          name: zone.name,
          onlineAvailable: Math.max(0, Number(zone.available) || 0),
          onlineSoldOut: Number(zone.available) < 1,
        })),
      }),
    };
  }).filter((ticket) => Number.isFinite(ticket.price) && ticket.price >= 0);

  if (isNuscHomeMatch && seasonPassOptions) {
    for (const [passId, option] of Object.entries(seasonPassOptions)) {
      const sourceTicket = (event.ticketTypes || []).find((ticket) => ticket.name === option.ticketType);
      if (!sourceTicket) continue;
      const selectionKey = `${String(sourceTicket._id)}:season:${passId}`;
      const onlineStatus = seasonPassOnlineStatus[passId] || { onlineSoldOut: false };
      serializedTicketTypes.push({
        _id: String(sourceTicket._id),
        selectionKey,
        ticketTypeId: String(sourceTicket._id),
        name: option.name,
        price: Number(option.amount),
        onlineSoldOut: Boolean(onlineStatus.onlineSoldOut),
        nuscSeasonPassType: passId,
        ...(Array.isArray(onlineStatus.zones) && { zones: onlineStatus.zones }),
      });
    }
  }

  return {
    _id: String(event._id),
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    isNuscHomeMatch,
    matchDate,
    ticketTypes: serializedTicketTypes,
  };
}

exports.listEvents = async (req, res) => {
  try {
    const events = await Event.find({
      status: 'approved',
    })
      .select('title slug startDate endDate bookingEndTime location ticketTypes isPublic')
      .sort({ startDate: 1 })
      .lean();

    const now = new Date();
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
    const matchesByDate = new Map(nuscMatches.map((match) => [match.matchDate, match]));
    const firstFixture = matchesByDate.get(nuscInventory.FIXTURE_DATES[0])?.event;
    const allSeasonFixturesActive = nuscInventory.FIXTURE_DATES.every((date) => {
      const match = matchesByDate.get(date);
      if (!match || match.event.isPublic === false) return false;
      const cutoff = match.event.bookingEndTime || match.event.endDate;
      const active = !cutoff || new Date(cutoff) >= now;
      const passesConfigured = Object.values(nuscInventory.SEASON_PASS_OPTIONS).every((option) => (
        (match.event.ticketTypes || []).some((ticket) => ticket.name === option.ticketType)
      ));
      return active && passesConfigured;
    });
    const includeSeasonPasses = Boolean(
      allSeasonFixturesActive && firstFixture && new Date(firstFixture.startDate) > now
    );
    const seasonPassOnlineStatus = includeSeasonPasses
      ? getSeasonPassOnlineStatus(matchesByDate, nuscTicketTypesByEventId)
      : {};
    const nuscEventIds = new Set(nuscMatches.map(({ event }) => String(event._id)));
    return res.json({
      events: events
        .filter((event) => !String(event.slug || '').startsWith('nusc-home-match-') || nuscEventIds.has(String(event._id)))
        .map((event) => {
          const match = nuscMatches.find(({ event: matchEvent }) => String(matchEvent._id) === String(event._id));
          return match
            ? serializeEvent(
              event,
              now,
              nuscTicketTypesByEventId[String(event._id)] || [],
              match.matchDate,
              includeSeasonPasses ? nuscInventory.SEASON_PASS_OPTIONS : null,
              seasonPassOnlineStatus,
            )
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
  const seasonPassType = String(req.body?.nuscSeasonPassType || '').trim();
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
  if (seasonPassType && !nuscInventory.SEASON_PASS_OPTIONS[seasonPassType]) {
    return res.status(400).json({ message: 'Select a valid NUSC season pass type.', code: 'INVALID_SEASON_PASS' });
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
          (priorBooking.nuscSeasonPassType || '') === seasonPassType &&
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

      const eventTicketPrice = Number(ticketType.price);
      if (!Number.isFinite(eventTicketPrice) || eventTicketPrice < 0) {
        throw new OnSpotBookingError('This ticket type has an invalid price.', 409, 'INVALID_TICKET_PRICE');
      }

      if (seasonPassType) {
        const seasonPass = nuscInventory.SEASON_PASS_OPTIONS[seasonPassType];
        if (!isNuscHomeMatch || ticketType.name !== seasonPass.ticketType) {
          throw new OnSpotBookingError('Season passes are only available for matching NUSC ticket types.', 409, 'INVALID_SEASON_PASS');
        }

        const fixtureSlugs = nuscInventory.FIXTURE_DATES.map((date) => `nusc-home-match-${date.replace(/-/g, '')}`);
        const fixtures = await Event.find({
          slug: { $in: fixtureSlugs },
          status: 'approved',
          isPublic: { $ne: false },
        })
          .select('slug startDate ticketTypes')
          .session(session);
        const fixturesBySlug = new Map(fixtures.map((fixture) => [fixture.slug, fixture]));
        if (nuscInventory.FIXTURE_DATES.some((date) => {
          const fixture = fixturesBySlug.get(`nusc-home-match-${date.replace(/-/g, '')}`);
          return !fixture || !fixture.ticketTypes.some((item) => item.name === seasonPass.ticketType);
        })) {
          throw new OnSpotBookingError('All 10 NUSC home matches must be active to record a season pass.', 409, 'SEASON_PASS_NOT_AVAILABLE');
        }
        const firstFixture = fixturesBySlug.get(fixtureSlugs[0]);
        if (!firstFixture?.startDate || new Date(firstFixture.startDate) <= new Date()) {
          throw new OnSpotBookingError('NUSC season pass sales have closed because the first home match has started.', 409, 'SEASON_PASS_SALES_CLOSED');
        }

        unitPrice = Number(seasonPass.amount);
        ticketTypeName = seasonPass.name;
        if (seasonPassType === 'general-season') {
          if (!nuscInventory.GENERAL_SEATING_AREAS.some((area) => area.name === zone)) {
            throw new OnSpotBookingError('Choose a General seating zone for this NUSC season pass.', 400, 'GENERAL_ZONE_REQUIRED');
          }
          recordedZone = zone;
        } else if (zone) {
          throw new OnSpotBookingError('A seating zone can only be selected for a General Season Pass.', 400, 'INVALID_GENERAL_ZONE');
        }
      } else if (isNuscHomeMatch) {
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
        recordedZone = zone;
      } else {
        if (zone) throw new OnSpotBookingError('Seating zones are only used for NUSC home matches.', 400, 'INVALID_ZONE');
        unitPrice = eventTicketPrice;
      }
      if (!ticketTypeName) ticketTypeName = ticketType.name;

      const inventoryResult = await Event.updateOne(
        {
          _id: event._id,
          status: 'approved',
          ticketTypes: {
            $elemMatch: {
              _id: ticketType._id,
              price: eventTicketPrice,
            },
          },
        },
        {
          $inc: { totalRevenue: unitPrice * quantity },
        },
        { session }
      );

      if ((inventoryResult.matchedCount ?? inventoryResult.n) !== 1) {
        throw new OnSpotBookingError('Ticket pricing changed. Refresh the event and try again.', 409, 'TICKET_PRICE_CHANGED');
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
        ticketType: ticketTypeName,
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
        ...(seasonPassType ? { nuscSeasonPassType: seasonPassType } : {}),
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
      ticketTypeName = booking.ticketType;
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
        nuscSeasonPassType: createdBookings[0].nuscSeasonPassType || '',
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
