const crypto = require('crypto');
const Razorpay = require('razorpay');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const NuscHomeMatchOrder = require('../models/NuscHomeMatchOrder');
const PaymentTransaction = require('../models/PaymentTransaction');
const User = require('../models/User');
const inventory = require('../services/nuscHomeMatchInventoryService');

const SEASON_PASS_OPTIONS = {
  'general-season': { ticketType: 'General Pass', amount: 3825.2 },
  'premium-season': { ticketType: 'Premium Pass', amount: 12744 },
};

let razorpayClient;
function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay is not configured');
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

function getTicketUnits(ticketType, quantity) {
  if (ticketType === inventory.SUITE_FULL_BOX || ticketType === inventory.SUITE_SEASON) return quantity * 8;
  return quantity;
}

async function getExistingBuyerTicketUnits(eventId, userId) {
  const bookings = await Booking.find({
    event: eventId,
    user: userId,
    status: { $in: ['pending', 'confirmed', 'checked-in'] },
    paymentStatus: { $in: ['pending', 'completed'] },
  }).select('ticketType quantity');

  return bookings.reduce((sum, booking) => (
    sum + getTicketUnits(booking.ticketType, Number(booking.quantity) || 0)
  ), 0);
}

function normalizeTicketSelection(selection, event) {
  if (!Array.isArray(selection) || selection.length === 0) {
    throw new inventory.InventoryConflict('Choose at least one ticket.', 'INVALID_TICKETS');
  }

  return selection.map((item) => {
    const ticketType = String(item.ticketType || '').trim();
    const quantity = Number(item.quantity);
    const zone = item.zone == null ? '' : String(item.zone).trim();
    if (!ticketType || !Number.isInteger(quantity) || quantity < 1) {
      throw new inventory.InventoryConflict('Ticket selection is invalid.', 'INVALID_TICKETS');
    }
    if (ticketType === inventory.GENERAL_TICKET_TYPE && !inventory.GENERAL_SEATING_AREAS.some((area) => area.name === zone)) {
      throw new inventory.InventoryConflict('Choose a General seating zone before checkout.', 'GENERAL_ZONE_REQUIRED');
    }
    if (ticketType !== inventory.GENERAL_TICKET_TYPE && zone) {
      throw new inventory.InventoryConflict('A seating zone can only be selected for General Pass tickets.', 'INVALID_GENERAL_ZONE');
    }
    if (ticketType === inventory.SUITE_SEASON) {
      throw new inventory.InventoryConflict('United Suite season bookings are call-to-book.', 'CALL_TO_BOOK');
    }

    const eventTicket = event.ticketTypes.find((ticket) => ticket.name === ticketType);
    if (!eventTicket) {
      throw new inventory.InventoryConflict(`Ticket type ${ticketType} is not configured for this match.`, 'TICKET_NOT_CONFIGURED');
    }

    const price = Number(eventTicket.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new inventory.InventoryConflict(`Ticket price for ${ticketType} is unavailable.`, 'TICKET_NOT_CONFIGURED');
    }

    return { ticketType, quantity, price, ...(zone && { zone }) };
  });
}

function getSafeEventSnapshot(event) {
  return {
    _id: event._id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    banner: event.banner,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    ticketTypes: event.ticketTypes,
    termsAndConditions: event.termsAndConditions,
  };
}

function getCheckoutRequestId(req) {
  const requestId = String(req.body?.checkoutRequestId || '').trim();
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) {
    throw new inventory.InventoryConflict('Refresh checkout and try again.', 'CHECKOUT_REQUEST_ID_REQUIRED');
  }
  return requestId;
}

function hashCheckoutRequest(checkout) {
  return crypto.createHash('sha256').update(JSON.stringify(checkout)).digest('hex');
}

function getCheckoutReceipt(userId, requestId) {
  const digest = crypto.createHash('sha256').update(`${userId}:${requestId}`).digest('hex');
  return `nusc_${digest.slice(0, 32)}`;
}

async function findExistingCheckoutOrder({ userId, requestId, requestHash, amountMinor }) {
  await NuscHomeMatchOrder.init();
  const existing = await NuscHomeMatchOrder.findOne({ user: userId, checkoutRequestId: requestId });
  if (!existing) return null;
  if (existing.checkoutRequestHash !== requestHash) {
    throw new inventory.InventoryConflict('This checkout request was already used for a different ticket selection. Refresh checkout and try again.', 'CHECKOUT_REQUEST_CONFLICT');
  }
  if (existing.status === 'completed') return { alreadyCompleted: true, existing };
  if (existing.status !== 'created' || existing.paymentId) {
    throw new inventory.InventoryConflict('Payment is already being confirmed. Check My Tickets before trying again.', 'SETTLEMENT_IN_PROGRESS');
  }

  const providerOrder = await getRazorpay().orders.fetch(existing.orderId);
  if (providerOrder.status === 'paid') {
    throw new inventory.InventoryConflict('This payment has already been captured. Check My Tickets before trying again.', 'PAYMENT_ALREADY_CAPTURED');
  }
  if (Number(providerOrder.amount) !== Number(amountMinor) || providerOrder.currency !== existing.currency) {
    throw new inventory.InventoryConflict('The existing checkout order does not match this ticket total. Contact AHIBI support before retrying.', 'CHECKOUT_ORDER_MISMATCH');
  }
  return { existing, providerOrder };
}

async function createOrRecoverProviderOrder(client, orderParams, requestHash) {
  try {
    return await client.orders.create(orderParams);
  } catch (createError) {
    try {
      const listed = await client.orders.all({ receipt: orderParams.receipt, count: 1 });
      const existing = (listed?.items || []).find((order) => order.receipt === orderParams.receipt);
      if (existing) {
        const notes = existing.notes || {};
        if (Number(existing.amount) !== Number(orderParams.amount) || existing.currency !== orderParams.currency ||
            notes.checkoutRequestHash !== requestHash) {
          throw new inventory.InventoryConflict('A payment order already exists for this checkout reference with different details.', 'CHECKOUT_RECEIPT_CONFLICT');
        }
        return existing;
      }
    } catch (lookupError) {
      if (lookupError instanceof inventory.InventoryConflict) throw lookupError;
    }
    throw createError;
  }
}

async function createOrder(req, res) {
  let createdOrderId = null;
  let checkoutRequestId = null;
  let checkoutRequestHash = null;
  try {
    const bookingDetails = req.body?.bookingDetails;
    const eventId = bookingDetails?.event?._id;
    if (!eventId || !req.user?._id) {
      return res.status(400).json({ message: 'Match and signed-in user are required.' });
    }

    const user = await User.findById(req.user._id).select('name email phone');
    const event = await Event.findById(eventId).select('+ticketTypes');
    if (!user) return res.status(401).json({ message: 'Please sign in with a user account to buy tickets.' });
    if (!event || !event.slug?.startsWith('nusc-home-match-')) {
      return res.status(404).json({ message: 'NUSC match event was not found.' });
    }
    if (event.status !== 'approved' || event.isPublic === false) {
      return res.status(409).json({ message: 'Tickets are not available for this match yet.' });
    }
    if (!inventory.TICKET_SALES_ENABLED) {
      return res.status(409).json({ success: false, message: 'Tickets for NUSC home matches are not on sale yet.', code: 'SALES_NOT_OPEN' });
    }

    const matchDate = inventory.matchDateFromSlug(event.slug);
    const cutoff = event.bookingEndTime || event.endDate;
    if (cutoff && new Date() > new Date(cutoff)) {
      return res.status(400).json({ message: 'Bookings are closed for this match.' });
    }

    const tickets = normalizeTicketSelection(bookingDetails.tickets, event);
    const totalAmount = tickets.reduce((sum, ticket) => sum + ticket.price * ticket.quantity, 0);
    const amountMinor = Math.round(totalAmount * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      return res.status(400).json({ message: 'Ticket total is invalid.' });
    }

    checkoutRequestId = getCheckoutRequestId(req);
    checkoutRequestHash = hashCheckoutRequest({
      orderType: 'match',
      userId: String(user._id),
      eventId: String(event._id),
      matchDate,
      tickets: [...tickets].sort((left, right) => (
        left.ticketType.localeCompare(right.ticketType) || String(left.zone || '').localeCompare(String(right.zone || ''))
      )),
    });
    const existingCheckout = await findExistingCheckoutOrder({
      userId: user._id,
      requestId: checkoutRequestId,
      requestHash: checkoutRequestHash,
      amountMinor,
    });
    if (existingCheckout?.alreadyCompleted) {
      return res.status(200).json({ success: true, alreadyCompleted: true });
    }

    const existingUserTicketCount = await getExistingBuyerTicketUnits(event._id, user._id);
    if (existingCheckout) {
      await inventory.reserveMatchOrder({
        orderId: existingCheckout.existing.orderId,
        userId: user._id,
        matchDate,
        ticketLines: tickets,
        eventTicketTypes: event.ticketTypes,
        existingUserTicketCount,
      });
      return res.status(200).json(existingCheckout.providerOrder);
    }

    const client = getRazorpay();
    const orderParams = {
      amount: amountMinor,
      currency: 'INR',
      receipt: getCheckoutReceipt(user._id, checkoutRequestId),
      notes: {
        nuscHomeMatch: 'true',
        eventId: String(event._id),
        userId: String(user._id),
        matchDate,
        checkoutRequestHash,
      },
    };
    const providerOrder = await createOrRecoverProviderOrder(client, orderParams, checkoutRequestHash);
    createdOrderId = providerOrder.id;

    await inventory.reserveMatchOrder({
      orderId: providerOrder.id,
      userId: user._id,
      matchDate,
      ticketLines: tickets,
      eventTicketTypes: event.ticketTypes,
      existingUserTicketCount,
    });

    const canonicalBookingDetails = {
      event: getSafeEventSnapshot(event),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      tickets,
    };

    await NuscHomeMatchOrder.create({
      orderId: providerOrder.id,
      event: event._id,
      user: user._id,
      bookingDetails: canonicalBookingDetails,
      amount: totalAmount,
      amountMinor,
      currency: 'INR',
      checkoutRequestId,
      checkoutRequestHash,
      status: 'created',
    });

    return res.status(200).json(providerOrder);
  } catch (error) {
    if (error?.code === 11000 && checkoutRequestId && req.user?._id) {
      try {
        const existing = await NuscHomeMatchOrder.findOne({ user: req.user._id, checkoutRequestId });
        if (existing && existing.checkoutRequestHash === checkoutRequestHash && existing.status === 'created' && !existing.paymentId) {
          if (createdOrderId && createdOrderId !== existing.orderId) {
            try { await inventory.releaseMatchOrder(createdOrderId); } catch (releaseError) {
              console.error('[NUSC checkout] Failed to release a duplicate request hold:', releaseError.message);
            }
          }
          const providerOrder = await getRazorpay().orders.fetch(existing.orderId);
          return res.status(200).json(providerOrder);
        }
        if (existing && existing.checkoutRequestHash === checkoutRequestHash && existing.status === 'completed') {
          return res.status(200).json({ success: true, alreadyCompleted: true });
        }
      } catch (recoveryError) {
        console.error('[NUSC checkout] Failed to recover an idempotent checkout request:', recoveryError.message);
      }
    }
    if (createdOrderId) {
      try { await inventory.releaseMatchOrder(createdOrderId); } catch (releaseError) {
        console.error('[NUSC checkout] Failed to release an unused ticket hold:', releaseError.message);
      }
    }
    if (error instanceof inventory.InventoryConflict) {
      return res.status(409).json({ message: error.message, code: error.code });
    }
    const providerError = error?.error;
    const providerStatusCode = Number(error?.statusCode);
    if (providerStatusCode === 401) {
      console.error('[NUSC checkout] Razorpay rejected test credentials:', {
        statusCode: providerStatusCode,
        code: providerError?.code || null,
        description: providerError?.description || null,
      });
      return res.status(502).json({
        message: 'Razorpay rejected the configured test credentials. Check the local test key and secret.',
        code: 'PAYMENT_PROVIDER_AUTH',
      });
    }
    console.error('[NUSC checkout] Order creation failed:', error?.message || providerError?.description || 'Unknown error');
    return res.status(500).json({ message: 'Unable to start checkout. Please try again.' });
  }
}

async function createSeasonPassOrder(req, res) {
  let createdOrderId = null;
  let checkoutRequestId = null;
  let checkoutRequestHash = null;
  try {
    if (!req.user?._id) return res.status(401).json({ message: 'Please sign in to buy a season pass.' });
    if (!inventory.TICKET_SALES_ENABLED) {
      return res.status(409).json({ success: false, message: 'Season passes are not on sale yet.', code: 'SALES_NOT_OPEN' });
    }

    const passId = String(req.body?.passId || '');
    const pass = SEASON_PASS_OPTIONS[passId];
    const quantity = Number(req.body?.quantity);
    if (!pass || !Number.isInteger(quantity) || quantity < 1 || quantity > inventory.BUYER_TICKET_LIMIT) {
      return res.status(400).json({ success: false, message: 'Choose a valid season pass and quantity.' });
    }

    const user = await User.findById(req.user._id).select('name email phone');
    if (!user) return res.status(401).json({ message: 'Please sign in with a user account to buy tickets.' });

    const slugs = inventory.FIXTURE_MATCHES.map((match) => `nusc-home-match-${match.date.replace(/-/g, '')}`);
    const events = await Event.find({ slug: { $in: slugs } }).select('+ticketTypes');
    const eventsBySlug = new Map(events.map((event) => [event.slug, event]));
    const fixtures = inventory.FIXTURE_MATCHES.map((match) => {
      const slug = `nusc-home-match-${match.date.replace(/-/g, '')}`;
      return { ...match, matchDate: match.date, event: eventsBySlug.get(slug) };
    });
    if (fixtures.some(({ event }) => !event || event.status !== 'approved' || event.isPublic === false)) {
      return res.status(409).json({ success: false, message: 'All 10 home match listings must be available before season passes can be sold.' });
    }
    if (new Date(fixtures[0].event.startDate) <= new Date()) {
      return res.status(409).json({ success: false, message: 'Season pass sales have closed because the first home match has started.' });
    }
    for (const fixture of fixtures) {
      if (!fixture.event.ticketTypes.some((ticket) => ticket.name === pass.ticketType)) {
        return res.status(409).json({ success: false, message: `${pass.ticketType} is not configured for every home match.` });
      }
    }

    const existingUserTicketCountByDate = Object.fromEntries(await Promise.all(fixtures.map(async (fixture) => [
      fixture.matchDate,
      await getExistingBuyerTicketUnits(fixture.event._id, user._id),
    ])));
    const amount = pass.amount * quantity;
    const amountMinor = Math.round(amount * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      return res.status(400).json({ success: false, message: 'Season pass total is invalid.' });
    }

    checkoutRequestId = getCheckoutRequestId(req);
    checkoutRequestHash = hashCheckoutRequest({
      orderType: 'seasonPass',
      userId: String(user._id),
      passId,
      ticketType: pass.ticketType,
      quantity,
      matchDates: inventory.FIXTURE_DATES,
      amountMinor,
    });
    const existingCheckout = await findExistingCheckoutOrder({
      userId: user._id,
      requestId: checkoutRequestId,
      requestHash: checkoutRequestHash,
      amountMinor,
    });
    if (existingCheckout?.alreadyCompleted) {
      return res.status(200).json({ success: true, alreadyCompleted: true });
    }

    if (existingCheckout) {
      await inventory.reserveSeasonPassOrder({
        orderId: existingCheckout.existing.orderId,
        userId: user._id,
        ticketType: pass.ticketType,
        quantity,
        matches: fixtures.map(({ matchDate, event }) => ({ matchDate, ticketTypes: event.ticketTypes })),
        existingUserTicketCountByDate,
      });
      return res.status(200).json(existingCheckout.providerOrder);
    }

    const orderParams = {
      amount: amountMinor,
      currency: 'INR',
      receipt: getCheckoutReceipt(user._id, checkoutRequestId),
      notes: {
        nuscHomeMatch: 'true',
        orderType: 'seasonPass',
        passId,
        userId: String(user._id),
        checkoutRequestHash,
      },
    };
    const providerOrder = await createOrRecoverProviderOrder(getRazorpay(), orderParams, checkoutRequestHash);
    createdOrderId = providerOrder.id;

    await inventory.reserveSeasonPassOrder({
      orderId: providerOrder.id,
      userId: user._id,
      ticketType: pass.ticketType,
      quantity,
      matches: fixtures.map(({ matchDate, event }) => ({ matchDate, ticketTypes: event.ticketTypes })),
      existingUserTicketCountByDate,
    });

    const canonicalBookingDetails = {
      passId,
      ticketType: pass.ticketType,
      quantity,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      fixtures: fixtures.map(({ matchDate, event }, index) => ({
        matchDate,
        eventId: event._id,
        event: getSafeEventSnapshot(event),
        ticketType: pass.ticketType,
        quantity,
        price: pass.amount / inventory.FIXTURE_DATES.length,
        matchIndex: index + 1,
      })),
    };

    await NuscHomeMatchOrder.create({
      orderId: providerOrder.id,
      orderType: 'seasonPass',
      event: fixtures[0].event._id,
      user: user._id,
      bookingDetails: canonicalBookingDetails,
      amount,
      amountMinor,
      currency: 'INR',
      checkoutRequestId,
      checkoutRequestHash,
      status: 'created',
    });

    return res.status(200).json(providerOrder);
  } catch (error) {
    if (error?.code === 11000 && checkoutRequestId && req.user?._id) {
      try {
        const existing = await NuscHomeMatchOrder.findOne({ user: req.user._id, checkoutRequestId });
        if (existing && existing.checkoutRequestHash === checkoutRequestHash && existing.status === 'created' && !existing.paymentId) {
          if (createdOrderId && createdOrderId !== existing.orderId) {
            try { await inventory.releaseSeasonPassOrder(createdOrderId); } catch (releaseError) {
              console.error('[NUSC season checkout] Failed to release a duplicate request hold:', releaseError.message);
            }
          }
          const providerOrder = await getRazorpay().orders.fetch(existing.orderId);
          return res.status(200).json(providerOrder);
        }
        if (existing && existing.checkoutRequestHash === checkoutRequestHash && existing.status === 'completed') {
          return res.status(200).json({ success: true, alreadyCompleted: true });
        }
      } catch (recoveryError) {
        console.error('[NUSC season checkout] Failed to recover an idempotent checkout request:', recoveryError.message);
      }
    }
    if (createdOrderId) {
      try { await inventory.releaseSeasonPassOrder(createdOrderId); } catch (releaseError) {
        console.error('[NUSC season checkout] Failed to release an unused season hold:', releaseError.message);
      }
    }
    if (error instanceof inventory.InventoryConflict) {
      return res.status(409).json({ success: false, message: error.message, code: error.code });
    }
    const providerError = error?.error;
    const providerStatusCode = Number(error?.statusCode);
    if (providerStatusCode === 401) {
      console.error('[NUSC season checkout] Razorpay rejected test credentials:', {
        statusCode: providerStatusCode,
        code: providerError?.code || null,
        description: providerError?.description || null,
      });
      return res.status(502).json({ success: false, message: 'Razorpay rejected the configured test credentials.', code: 'PAYMENT_PROVIDER_AUTH' });
    }
    console.error('[NUSC season checkout] Order creation failed:', error?.message || providerError?.description || 'Unknown error');
    return res.status(500).json({ success: false, message: 'Unable to start season pass checkout.' });
  }
}

async function createBookingsForOrder(order, payment) {
  const event = await Event.findById(order.event);
  if (!event) throw new Error('Match event no longer exists');
  const { user, tickets } = order.bookingDetails;
  const hold = await inventory.confirmMatchOrder(order.orderId);
  const allocationByTicketIndex = new Map((hold.suiteAllocations || []).map((allocation) => [allocation.ticketIndex, allocation.boxNumber]));
  const totalTickets = tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  const createdBookings = [];
  const bookingIds = [];
  let ticketIndex = 1;

  for (const item of tickets) {
    for (let itemIndex = 0; itemIndex < item.quantity; itemIndex += 1) {
      let booking = await Booking.findOne({ nuscOrderId: order.orderId, nuscTicketIndex: ticketIndex });
      if (!booking) {
        booking = new Booking({
          event: event._id,
          eventSnapshot: {
            _id: event._id,
            title: event.title,
            banner: event.banner,
            startDate: event.startDate,
            endDate: event.endDate,
            location: { address: event.location?.address, city: event.location?.city },
          },
          user: user.id,
          ticketType: item.ticketType,
          quantity: 1,
          price: item.price,
          total: item.price,
          status: 'confirmed',
          paymentStatus: 'completed',
          paymentId: payment.id,
          razorpayPaymentId: payment.id,
          razorpayOrderId: order.orderId,
          nuscOrderId: order.orderId,
          nuscTicketIndex: ticketIndex,
          ...(allocationByTicketIndex.has(ticketIndex) && { nuscSuiteBoxNumber: allocationByTicketIndex.get(ticketIndex) }),
          ...(item.ticketType === inventory.GENERAL_TICKET_TYPE && { nuscGeneralZone: item.zone }),
          ticketIndex,
          totalTickets,
          parentBookingId: null,
        });
        try {
          await booking.save();
        } catch (error) {
          if (error.code !== 11000) throw error;
          booking = await Booking.findOne({ nuscOrderId: order.orderId, nuscTicketIndex: ticketIndex });
          if (!booking) throw error;
        }
      }
      createdBookings.push(booking);
      bookingIds.push(booking._id);
      ticketIndex += 1;
    }
  }

  const parentBookingId = createdBookings[0]?._id;
  if (parentBookingId) {
    await Booking.updateMany(
      { nuscOrderId: order.orderId, parentBookingId: null, _id: { $ne: parentBookingId } },
      { $set: { parentBookingId } }
    );
  }

  for (const ticket of event.ticketTypes) {
    const sold = await Booking.countDocuments({
      event: event._id,
      ticketType: ticket.name,
      status: { $in: ['confirmed', 'checked-in'] },
      paymentStatus: 'completed',
    });
    ticket.sold = sold;
  }
  await event.save();
  await inventory.markTicketStockApplied(order.orderId);

  return { bookings: createdBookings, bookingIds, event };
}

function summarizeSeasonBookings(fixtures = [], bookings = []) {
  return fixtures.map((fixture) => {
    const fixtureBookings = bookings.filter((booking) => String(booking.event) === String(fixture.eventId));
    return {
      matchDate: fixture.matchDate,
      eventId: fixture.eventId,
      eventTitle: fixture.event?.title,
      bookingIds: fixtureBookings.map((booking) => booking._id),
    };
  });
}

async function createSeasonPassBookingsForOrder(order, payment) {
  const { user, fixtures, passId, quantity } = order.bookingDetails;
  if (!Array.isArray(fixtures) || fixtures.length !== inventory.FIXTURE_DATES.length || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Season pass order details are incomplete');
  }
  await inventory.confirmSeasonPassOrder(order.orderId);

  const createdBookings = [];
  const bookingIds = [];
  for (let fixtureIndex = 0; fixtureIndex < fixtures.length; fixtureIndex += 1) {
    const fixture = fixtures[fixtureIndex];
    if (fixture.matchIndex !== fixtureIndex + 1 || fixture.matchDate !== inventory.FIXTURE_DATES[fixtureIndex]) {
      throw new Error('Season pass fixtures do not match the published home schedule');
    }
    const event = await Event.findById(fixture.eventId).select('+ticketTypes');
    if (!event || !event.slug?.startsWith('nusc-home-match-')) throw new Error('A season pass match listing no longer exists');

    for (let ticketIndex = 1; ticketIndex <= quantity; ticketIndex += 1) {
      const nuscTicketIndex = fixtureIndex * quantity + ticketIndex;
      let booking = await Booking.findOne({ nuscOrderId: order.orderId, nuscTicketIndex });
      if (!booking) {
        booking = new Booking({
          event: event._id,
          eventSnapshot: {
            _id: event._id,
            title: event.title,
            banner: event.banner,
            startDate: event.startDate,
            endDate: event.endDate,
            location: { address: event.location?.address, city: event.location?.city },
          },
          user: user.id,
          ticketType: fixture.ticketType,
          quantity: 1,
          price: fixture.price,
          total: fixture.price,
          status: 'confirmed',
          paymentStatus: 'completed',
          paymentId: payment.id,
          razorpayPaymentId: payment.id,
          razorpayOrderId: order.orderId,
          nuscOrderId: order.orderId,
          nuscTicketIndex,
          nuscSeasonPassType: passId,
          nuscSeasonMatchIndex: fixtureIndex + 1,
          ticketIndex,
          totalTickets: quantity,
          parentBookingId: null,
        });
        try {
          await booking.save();
        } catch (error) {
          if (error.code !== 11000) throw error;
          booking = await Booking.findOne({ nuscOrderId: order.orderId, nuscTicketIndex });
          if (!booking) throw error;
        }
      }
      createdBookings.push(booking);
      bookingIds.push(booking._id);
    }

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

  const parentBookingId = createdBookings[0]?._id;
  if (parentBookingId) {
    await Booking.updateMany(
      { nuscOrderId: order.orderId, parentBookingId: null, _id: { $ne: parentBookingId } },
      { $set: { parentBookingId } }
    );
  }
  await inventory.markSeasonPassStockApplied(order.orderId);

  return {
    bookings: createdBookings,
    bookingIds,
    event: await Event.findById(order.event),
    seasonMatches: summarizeSeasonBookings(fixtures, createdBookings),
  };
}

async function settleCapturedPayment(orderId, payment, signature, { adminRecovery = false } = {}) {
  let order = await NuscHomeMatchOrder.findOne({ orderId });
  if (!order) throw new Error('NUSC payment order was not found');
  if (order.status === 'completed') {
    const bookings = await Booking.find({ nuscOrderId: orderId }).sort({ nuscTicketIndex: 1 });
    return {
      alreadyCompleted: true,
      order,
      bookings,
      ...(order.orderType === 'seasonPass' && { seasonMatches: summarizeSeasonBookings(order.bookingDetails.fixtures, bookings) }),
    };
  }
  if (order.status === 'paid_no_booking' && !adminRecovery) {
    throw new inventory.InventoryConflict('Payment was captured but no tickets were issued. Contact support for resolution.', 'PAID_NO_BOOKING');
  }

  const now = new Date();
  const claimed = await NuscHomeMatchOrder.findOneAndUpdate(
    {
      _id: order._id,
      $or: [
        { status: 'created' },
        { status: 'settling', settlementLeaseUntil: { $lte: now } },
        ...(adminRecovery ? [{ status: 'paid_no_booking' }] : []),
      ],
    },
    { $set: { status: 'settling', paymentId: payment.id, settlementLeaseUntil: new Date(now.getTime() + 3 * 60 * 1000), errorMessage: null } },
    { new: true }
  );
  if (!claimed) {
    order = await NuscHomeMatchOrder.findOne({ orderId });
    if (order?.status === 'completed') {
      const bookings = await Booking.find({ nuscOrderId: orderId }).sort({ nuscTicketIndex: 1 });
      return {
        alreadyCompleted: true,
        order,
        bookings,
        ...(order.orderType === 'seasonPass' && { seasonMatches: summarizeSeasonBookings(order.bookingDetails.fixtures, bookings) }),
      };
    }
    throw new inventory.InventoryConflict('Payment is being confirmed. Refresh your tickets in a moment.', 'SETTLEMENT_IN_PROGRESS');
  }

  try {
    if (payment.status !== 'captured' || String(payment.order_id) !== String(order.orderId) ||
        Number(payment.amount) !== Number(order.amountMinor) || payment.currency !== order.currency) {
      throw new Error('Razorpay payment details do not match this match order.');
    }

    const { bookings, bookingIds, event, seasonMatches } = claimed.orderType === 'seasonPass'
      ? await createSeasonPassBookingsForOrder(claimed, payment)
      : await createBookingsForOrder(claimed, payment);
    await PaymentTransaction.findOneAndUpdate(
      { orderId: claimed.orderId, paymentId: payment.id },
      {
        $set: {
          orderId: claimed.orderId,
          paymentId: payment.id,
          signature,
          amount: claimed.amount,
          currency: claimed.currency,
          user: claimed.user,
          userSnapshot: claimed.bookingDetails.user,
          event: claimed.event,
          bookingDetails: claimed.bookingDetails,
          status: 'completed',
          bookingIds,
          errorMessage: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    order = await NuscHomeMatchOrder.findOneAndUpdate(
      { _id: claimed._id, status: 'settling' },
      { $set: { status: 'completed', bookingIds, paymentId: payment.id, settlementLeaseUntil: null, errorMessage: null } },
      { new: true }
    );

    try {
      if (claimed.orderType === 'seasonPass') {
        await inventory.finalizeSeasonPassOrder(claimed.orderId);
      } else {
        await inventory.finalizeMatchOrder(claimed.orderId);
      }
    } catch (cleanupError) {
      console.error('[NUSC checkout] Completed order inventory cleanup failed:', cleanupError.message);
    }

    if (bookings.length && claimed.bookingDetails.user.email) {
      const emailService = require('../services/emailService');
      const isSeasonPass = claimed.orderType === 'seasonPass';
      const seasonPassName = claimed.bookingDetails.passId === 'premium-season'
        ? 'Premium Season Pass'
        : 'General Season Pass';
      emailService.sendTicketEmail(
        claimed.bookingDetails.user.email,
        claimed.bookingDetails.user.name || 'Customer',
        {
          eventName: isSeasonPass ? `NUSC ${seasonPassName}` : event.title,
          eventDate: isSeasonPass ? 'All 10 home fixtures' : (event.startDate ? new Date(event.startDate).toLocaleDateString('en-IN') : 'TBA'),
          eventTime: isSeasonPass ? '6:30 PM' : (event.startDate ? new Date(event.startDate).toLocaleTimeString('en-IN') : 'TBA'),
          ticketType: isSeasonPass
            ? `${claimed.bookingDetails.ticketType} · all 10 matches`
            : claimed.bookingDetails.tickets.map((ticket) => (
              `${ticket.ticketType}${ticket.zone ? ` · ${ticket.zone}` : ''} (${ticket.quantity})`
            )).join(', '),
          quantity: isSeasonPass
            ? claimed.bookingDetails.quantity
            : claimed.bookingDetails.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0),
          bookingId: bookings[0]._id,
          qrCode: null,
        }
      ).catch((error) => console.error('[NUSC checkout] Ticket email failed:', error.message));
    }

    return { alreadyCompleted: false, order, bookings, seasonMatches };
  } catch (error) {
    if (error.code === 'HOLD_EXPIRED') {
      await NuscHomeMatchOrder.updateOne(
        { _id: claimed._id, status: 'settling' },
        { $set: { status: 'paid_no_booking', errorMessage: error.message, settlementLeaseUntil: null, paymentId: payment.id } }
      );
      await PaymentTransaction.findOneAndUpdate(
        { orderId: claimed.orderId, paymentId: payment.id },
        {
          $set: {
            orderId: claimed.orderId,
            paymentId: payment.id,
            signature,
            amount: claimed.amount,
            currency: claimed.currency,
            user: claimed.user,
            event: claimed.event,
            bookingDetails: claimed.bookingDetails,
            status: 'paid_no_booking',
            errorMessage: error.message,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      throw new inventory.InventoryConflict('Payment was captured after the ticket hold expired. Contact support for a refund or rebooking.', 'PAID_NO_BOOKING');
    }

    await NuscHomeMatchOrder.updateOne(
      { _id: claimed._id, status: 'settling' },
      { $set: { status: adminRecovery ? 'paid_no_booking' : 'created', errorMessage: error.message, settlementLeaseUntil: null } }
    );
    throw error;
  }
}

async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
    }

    const order = await NuscHomeMatchOrder.findOne({ orderId: razorpay_order_id, user: req.user?._id });
    if (!order) return res.status(404).json({ success: false, message: 'Match order was not found.' });

    const digest = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (digest !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment signature is invalid.' });
    }

    const payment = await getRazorpay().payments.fetch(razorpay_payment_id);
    if (payment.status !== 'captured') {
      return res.status(409).json({ success: false, message: 'Payment has not been captured yet.' });
    }

    const result = await settleCapturedPayment(razorpay_order_id, payment, razorpay_signature);
    const booking = result.bookings[0];
    return res.status(result.alreadyCompleted ? 200 : 201).json({
      success: true,
      message: result.alreadyCompleted ? 'Booking was already confirmed.' : 'NUSC match booking confirmed.',
      booking,
      allBookings: result.bookings,
      bookingIds: result.bookings.map((item) => item._id),
      totalTickets: result.bookings.length,
      ...(result.seasonMatches && { seasonMatches: result.seasonMatches }),
    });
  } catch (error) {
    if (error instanceof inventory.InventoryConflict) {
      return res.status(error.code === 'PAID_NO_BOOKING' ? 409 : 409).json({ success: false, message: error.message, code: error.code });
    }
    console.error('[NUSC checkout] Payment verification failed:', error.message);
    return res.status(500).json({ success: false, message: 'Payment could not be confirmed yet. Please check your tickets again shortly.' });
  }
}

async function reserveSeason(req, res) {
  try {
    const reservation = await inventory.reserveSeasonBox({
      bookingReference: req.body?.bookingReference,
      adminId: req.user?._id,
    });
    return res.status(201).json({ success: true, reservation });
  } catch (error) {
    if (error instanceof inventory.InventoryConflict) {
      return res.status(409).json({ success: false, message: error.message, code: error.code });
    }
    console.error('[NUSC suite] Season box reservation failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to reserve a season box.' });
  }
}

async function listSeasonReservations(req, res) {
  try {
    const reservations = await inventory.listSeasonBoxes();
    return res.status(200).json({ success: true, reservations });
  } catch (error) {
    console.error('[NUSC suite] Season reservation list failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load season reservations.' });
  }
}

async function cancelSeason(req, res) {
  try {
    const reservation = await inventory.cancelSeasonBox(req.params.id, req.user?._id);
    if (!reservation) return res.status(404).json({ success: false, message: 'Active season box reservation was not found.' });
    return res.status(200).json({ success: true, reservation });
  } catch (error) {
    console.error('[NUSC suite] Season box cancellation failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to cancel the season reservation.' });
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listAdminOrders(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const status = String(req.query.status || '').trim();
    const query = {};
    if (status && ['created', 'settling', 'completed', 'paid_no_booking', 'failed', 'refund_pending', 'refunded'].includes(status)) {
      query.status = status;
    }
    const term = String(req.query.search || '').trim().slice(0, 120);
    if (term) {
      const pattern = new RegExp(escapeRegex(term), 'i');
      query.$or = [
        { orderId: pattern },
        { paymentId: pattern },
        { 'bookingDetails.user.name': pattern },
        { 'bookingDetails.user.email': pattern },
        { 'bookingDetails.user.phone': pattern },
      ];
    }

    const [orders, total] = await Promise.all([
      NuscHomeMatchOrder.find(query)
        .populate('user', 'name email phone')
        .populate('event', 'title startDate slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NuscHomeMatchOrder.countDocuments(query),
    ]);
    const bookings = await Booking.find({ nuscOrderId: { $in: orders.map((order) => order.orderId) } })
      .select('nuscOrderId event ticketType quantity total status paymentStatus paymentId nuscTicketIndex nuscSeasonMatchIndex nuscSeasonPassType nuscSuiteBoxNumber entryVerified qrCode')
      .populate('event', 'title startDate')
      .sort({ nuscTicketIndex: 1 })
      .lean();
    const bookingsByOrder = new Map();
    for (const booking of bookings) {
      const orderId = booking.nuscOrderId;
      if (!bookingsByOrder.has(orderId)) bookingsByOrder.set(orderId, []);
      bookingsByOrder.get(orderId).push(booking);
    }
    const now = Date.now();
    return res.json({
      success: true,
      orders: orders.map((order) => ({
        ...order,
        refundStatus: order.refundStatus || 'not_requested',
        recoveryAvailable: order.status === 'paid_no_booking' || (
          order.status === 'settling' && order.settlementLeaseUntil && new Date(order.settlementLeaseUntil).getTime() <= now
        ),
        bookings: bookingsByOrder.get(order.orderId) || [],
      })),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[NUSC admin] Order list failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load NUSC ticket orders.' });
  }
}

async function retryPaidOrder(req, res) {
  try {
    const order = await NuscHomeMatchOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'NUSC order was not found.' });
    const staleSettlement = order.status === 'settling' && order.settlementLeaseUntil && new Date(order.settlementLeaseUntil) <= new Date();
    if (order.status !== 'paid_no_booking' && !staleSettlement) {
      return res.status(409).json({ success: false, message: 'Only paid orders without tickets or expired settlement attempts can be retried.' });
    }

    const paymentId = order.paymentId;
    if (!paymentId) return res.status(409).json({ success: false, message: 'No captured payment is attached to this order.' });
    const payment = await getRazorpay().payments.fetch(paymentId);
    if (payment.status !== 'captured' || String(payment.order_id) !== String(order.orderId) ||
        Number(payment.amount) !== Number(order.amountMinor) || payment.currency !== order.currency) {
      return res.status(409).json({ success: false, message: 'The captured payment does not match this NUSC order.' });
    }

    if (order.orderType === 'seasonPass') {
      const fixtures = order.bookingDetails.fixtures || [];
      const matches = [];
      const existingUserTicketCountByDate = {};
      for (const fixture of fixtures) {
        const event = await Event.findById(fixture.eventId).select('+ticketTypes');
        if (!event || !event.slug?.startsWith('nusc-home-match-')) {
          return res.status(409).json({ success: false, message: 'A season match listing is unavailable; refund this order or restore its listing.' });
        }
        matches.push({ matchDate: fixture.matchDate, ticketTypes: event.ticketTypes });
        existingUserTicketCountByDate[fixture.matchDate] = await getExistingBuyerTicketUnits(event._id, order.user);
      }
      await inventory.reserveSeasonPassOrder({
        orderId: order.orderId,
        userId: order.user,
        ticketType: order.bookingDetails.ticketType,
        quantity: order.bookingDetails.quantity,
        matches,
        existingUserTicketCountByDate,
        allowSalesClosed: true,
      });
    } else {
      const event = await Event.findById(order.event).select('+ticketTypes');
      if (!event || !event.slug?.startsWith('nusc-home-match-')) {
        return res.status(409).json({ success: false, message: 'The match listing is unavailable; refund this order or restore its listing.' });
      }
      await inventory.reserveMatchOrder({
        orderId: order.orderId,
        userId: order.user,
        matchDate: inventory.matchDateFromSlug(event.slug),
        ticketLines: order.bookingDetails.tickets,
        eventTicketTypes: event.ticketTypes,
        existingUserTicketCount: await getExistingBuyerTicketUnits(event._id, order.user),
        allowSalesClosed: true,
      });
    }

    const result = await settleCapturedPayment(order.orderId, payment, null, { adminRecovery: true });
    await NuscHomeMatchOrder.updateOne(
      { _id: order._id },
      { $push: { operationsAudit: { action: 'ticket_reissue', admin: req.user._id, details: { bookingCount: result.bookings.length } } } }
    );
    return res.json({ success: true, message: 'Captured payment verified and tickets issued.', bookingCount: result.bookings.length });
  } catch (error) {
    if (error instanceof inventory.InventoryConflict) {
      return res.status(409).json({ success: false, message: error.message, code: error.code });
    }
    console.error('[NUSC admin] Ticket recovery failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to recover tickets for this order.' });
  }
}

async function applyRefundToTickets(order, adminId, refund) {
  const bookings = await Booking.find({ nuscOrderId: order.orderId }).select('event ticketType');
  await Booking.updateMany(
    { nuscOrderId: order.orderId },
    { $set: { status: 'refunded', paymentStatus: 'refunded', updatedAt: new Date() } }
  );
  const eventIds = [...new Set(bookings.map((booking) => String(booking.event)))];
  for (const eventId of eventIds) {
    const event = await Event.findById(eventId).select('+ticketTypes');
    if (!event) continue;
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
  if (order.orderType === 'match') await inventory.releaseRefundedMatchOrder(order.orderId);

  const fullyProcessed = refund.status === 'processed';
  const now = new Date();
  await NuscHomeMatchOrder.updateOne(
    { _id: order._id },
    {
      $set: {
        status: fullyProcessed ? 'refunded' : 'refund_pending',
        refundStatus: fullyProcessed ? 'processed' : 'pending',
        refundId: refund.id || order.refundId,
        refundedAmountMinor: Number(refund.amount || order.amountMinor),
        refundedAt: now,
        errorMessage: fullyProcessed ? null : 'Refund accepted by Razorpay and is awaiting processing.',
      },
      $push: { operationsAudit: { action: 'full_refund', admin: adminId, at: now, details: { refundId: refund.id || null, amountMinor: Number(refund.amount || order.amountMinor), providerStatus: refund.status || 'pending' } } },
    }
  );
  await PaymentTransaction.updateMany(
    { orderId: order.orderId, paymentId: order.paymentId },
    { $set: { status: fullyProcessed ? 'refunded' : 'refund_pending', errorMessage: null } }
  );
}

async function refundOrder(req, res) {
  let claimed;
  let originalOrderStatus;
  try {
    const existingOrder = await NuscHomeMatchOrder.findById(req.params.id).select('status');
    if (!existingOrder) return res.status(404).json({ success: false, message: 'NUSC order was not found.' });
    originalOrderStatus = existingOrder.status;
    claimed = await NuscHomeMatchOrder.findOneAndUpdate(
      {
        _id: req.params.id,
        status: { $in: ['completed', 'paid_no_booking'] },
        $or: [{ refundStatus: 'not_requested' }, { refundStatus: { $exists: false } }],
      },
      {
        $set: { status: 'refund_pending', refundStatus: 'requested', refundRequestedBy: req.user._id },
        $push: { operationsAudit: { action: 'refund_requested', admin: req.user._id, details: { amountMinor: existingOrder.amountMinor } } },
      },
      { new: true }
    );
    if (!claimed) {
      const current = await NuscHomeMatchOrder.findById(req.params.id);
      if (!current) return res.status(404).json({ success: false, message: 'NUSC order was not found.' });
      return res.status(409).json({ success: false, message: current.refundStatus === 'requested' || current.refundStatus === 'pending' ? 'A refund is already in progress. Check its status before taking another action.' : 'This order cannot be refunded in its current state.' });
    }

    if (!claimed.paymentId) {
      await NuscHomeMatchOrder.updateOne({ _id: claimed._id }, { $set: { refundStatus: 'failed_review', errorMessage: 'No payment ID is attached to this order.' } });
      return res.status(409).json({ success: false, message: 'No payment ID is attached to this order.' });
    }
    const ticketAlreadyUsed = await Booking.exists({ nuscOrderId: claimed.orderId, $or: [{ status: 'checked-in' }, { entryVerified: true }] });
    if (ticketAlreadyUsed) {
      await NuscHomeMatchOrder.updateOne({ _id: claimed._id }, { $set: { status: 'completed', refundStatus: 'failed_review', errorMessage: 'A ticket was already checked in; refund requires manual review.' } });
      return res.status(409).json({ success: false, message: 'A ticket was already checked in. This refund requires manual review.' });
    }

    const razorpay = getRazorpay();
    const payment = await razorpay.payments.fetch(claimed.paymentId);
    if (String(payment.order_id) !== String(claimed.orderId) || Number(payment.amount) !== Number(claimed.amountMinor) || payment.currency !== claimed.currency) {
      await NuscHomeMatchOrder.updateOne({ _id: claimed._id }, { $set: { status: originalOrderStatus, refundStatus: 'failed_review', errorMessage: 'Payment details do not match the NUSC order.' } });
      return res.status(409).json({ success: false, message: 'Payment details do not match the NUSC order.' });
    }
    if (Number(payment.amount_refunded || 0) >= Number(claimed.amountMinor)) {
      await applyRefundToTickets(claimed, req.user._id, { id: null, amount: claimed.amountMinor, status: 'processed' });
      return res.json({ success: true, message: 'The payment was already fully refunded; ticket records are now synchronized.' });
    }
    if (payment.status !== 'captured' || Number(payment.amount_refunded || 0) > 0) {
      await NuscHomeMatchOrder.updateOne({ _id: claimed._id }, { $set: { status: originalOrderStatus, refundStatus: 'failed_review', errorMessage: 'Payment is not eligible for an automatic full refund.' } });
      return res.status(409).json({ success: false, message: 'Payment is not eligible for an automatic full refund; review it in Razorpay.' });
    }

    const refund = await razorpay.payments.refund(claimed.paymentId, {
      amount: claimed.amountMinor,
      receipt: `nusc_${claimed._id}`,
      notes: { nuscOrderId: claimed.orderId, adminId: String(req.user._id) },
    });
    if (String(refund.payment_id) !== String(claimed.paymentId) || Number(refund.amount) !== Number(claimed.amountMinor)) {
      throw new Error('Razorpay refund response did not match the requested full refund.');
    }
    await applyRefundToTickets(claimed, req.user._id, refund);
    return res.json({ success: true, message: refund.status === 'processed' ? 'Refund processed and tickets invalidated.' : 'Refund requested; tickets have been invalidated while Razorpay processes it.', refundStatus: refund.status || 'pending', refundId: refund.id });
  } catch (error) {
    if (claimed) {
      await NuscHomeMatchOrder.updateOne(
        { _id: claimed._id, refundStatus: 'requested' },
        { $set: { errorMessage: 'Refund provider response was uncertain. Reconcile its status before retrying.' } }
      ).catch(() => {});
    }
    console.error('[NUSC admin] Refund request failed:', error.message);
    return res.status(502).json({ success: false, message: 'Refund outcome could not be confirmed. Check refund status before retrying.' });
  }
}

async function reconcileRefund(req, res) {
  try {
    const order = await NuscHomeMatchOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'NUSC order was not found.' });
    if (order.refundStatus === 'processed') return res.json({ success: true, refundStatus: 'processed', message: 'Refund is already recorded as processed.' });
    if (order.refundStatus !== 'requested' && order.refundStatus !== 'pending') {
      return res.status(409).json({ success: false, message: 'There is no refund awaiting reconciliation.' });
    }
    const payment = await getRazorpay().payments.fetch(order.paymentId);
    if (Number(payment.amount_refunded || 0) >= Number(order.amountMinor)) {
      await applyRefundToTickets(order, req.user._id, { id: order.refundId, amount: order.amountMinor, status: 'processed' });
      return res.json({ success: true, refundStatus: 'processed', message: 'Razorpay confirms a full refund; ticket records are synchronized.' });
    }
    if (Number(payment.amount_refunded || 0) > 0) {
      await NuscHomeMatchOrder.updateOne(
        { _id: order._id },
        { $set: { refundStatus: 'failed_review', errorMessage: 'Razorpay reports a partial refund; manual review is required.' }, $push: { operationsAudit: { action: 'refund_reconciliation', admin: req.user._id, details: { amountRefundedMinor: Number(payment.amount_refunded) } } } }
      );
      return res.status(409).json({ success: false, message: 'Razorpay reports a partial refund. Manual review is required.' });
    }
    await NuscHomeMatchOrder.updateOne(
      { _id: order._id },
      { $set: { refundStatus: 'pending', errorMessage: 'Razorpay does not yet report the full refund.' }, $push: { operationsAudit: { action: 'refund_reconciliation', admin: req.user._id, details: { amountRefundedMinor: 0 } } } }
    );
    return res.status(202).json({ success: true, refundStatus: 'pending', message: 'Razorpay has not confirmed the full refund yet. No duplicate refund was submitted.' });
  } catch (error) {
    console.error('[NUSC admin] Refund reconciliation failed:', error.message);
    return res.status(502).json({ success: false, message: 'Unable to check refund status with Razorpay.' });
  }
}

async function seedTestFixtures(req, res) {
  if (!inventory.NUSC_TEST_MODE_ENABLED || !inventory.TICKET_SALES_ENABLED) {
    return res.status(404).json({ success: false, message: 'Test fixture setup is unavailable.' });
  }

  try {
    const user = await User.findById(req.user?._id).select('name');
    if (!user) return res.status(401).json({ success: false, message: 'Sign in with your AHIBI test account.' });

    const ticketTypes = [
      { name: 'General Pass', description: 'General Gallery seating and digital QR entry.', price: 360, basePrice: 360, quantity: inventory.TICKET_CAPACITIES['General Pass'], capacity: 1, benefits: ['General Gallery seating', 'Designated General Gates', 'Digital QR ticket entry'] },
      { name: 'Premium Pass', description: 'Reserved premium seating with a complimentary snack box.', price: 1416, basePrice: 1416, quantity: inventory.TICKET_CAPACITIES['Premium Pass'], capacity: 1, benefits: ['Reserved chair seating', 'Better viewing location', 'Complimentary snack box'] },
      { name: inventory.SUITE_SINGLE, description: 'One person, one match, one seat in a United Suite box.', price: 8896, basePrice: 8896, quantity: inventory.BOX_COUNT * 8, capacity: 1, benefits: ['Private VIP Box access', 'Food and beverages', 'Dedicated VIP entry and parking'] },
      { name: inventory.SUITE_FULL_BOX, description: 'One private United Suite box for up to eight people for one match.', price: 70800, basePrice: 70800, quantity: inventory.BOX_COUNT, capacity: 8, benefits: ['Private VIP Box access', 'Food and beverages', 'Butler service and dedicated parking'] },
    ];

    let createdCount = 0;
    let existingCount = 0;
    for (const match of inventory.FIXTURE_MATCHES) {
      const slug = `nusc-home-match-${match.date.replace(/-/g, '')}`;
      const existing = await Event.findOne({ slug });
      if (existing) {
        if (String(existing.organizer) !== String(user._id)) {
          return res.status(409).json({ success: false, message: `The test listing for ${match.date} belongs to a different user. No listing was changed.` });
        }
        existing.convenience = { percentage: 0, fixedAmount: 0, includeGst: false, gstPercentage: 18 };
        await existing.save();
        existingCount += 1;
        continue;
      }

      const startDate = new Date(`${match.date}T18:30:00+05:30`);
      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
      await Event.create({
        title: `NUSC Home Match vs ${match.opponent}`,
        slug,
        description: `NUSC Indian Football League home match vs ${match.opponent}. Kick-off at 6:30 PM at Chümoukedima Football Stadium. Sandbox test listing.`,
        banner: '/images/nusc-home-match-series.svg',
        coverImage: '/images/nusc-home-match-series.svg',
        organizer: user._id,
        organizerInfo: { id: user._id, name: user.name || 'AHIBI Test Account' },
        createdBy: user._id,
        startDate,
        endDate,
        category: 'Sports',
        location: {
          address: 'Chümoukedima Football Stadium',
          city: 'Chümoukedima',
          state: 'Nagaland',
          country: 'India',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        ticketTypes: ticketTypes.map((ticket) => ({ ...ticket, sold: 0 })),
        convenience: { percentage: 0, fixedAmount: 0, includeGst: false, gstPercentage: 18 },
        termsAndConditions: 'Sandbox test listing. Tickets are valid only in the AHIBI test environment.',
        status: 'approved',
        approvalStatus: 'approved',
        isPublic: true,
        isFeatured: false,
        isFreeEvent: false,
      });
      createdCount += 1;
    }

    return res.status(201).json({
      success: true,
      message: 'Sandbox NUSC match listings are ready.',
      createdCount,
      existingCount,
      matchDates: inventory.FIXTURE_DATES,
    });
  } catch (error) {
    console.error('[NUSC test setup] Fixture creation failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to prepare the NUSC sandbox listings.' });
  }
}

module.exports = {
  cancelSeason,
  createOrder,
  createSeasonPassOrder,
  listSeasonReservations,
  listAdminOrders,
  reconcileRefund,
  refundOrder,
  reserveSeason,
  retryPaidOrder,
  seedTestFixtures,
  settleCapturedPayment,
  verifyPayment,
};
