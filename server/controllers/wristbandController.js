const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const WristbandBatch = require('../models/WristbandBatch');
const WristbandAssignment = require('../models/WristbandAssignment');

exports.listBatches = async (req, res) => {
  const { eventId } = req.params;
  if (!mongoose.isValidObjectId(eventId)) return res.status(400).json({ success: false, message: 'Valid event ID is required.' });
  try {
    const [event, batches] = await Promise.all([
      Event.findById(eventId).select('_id title ticketTypes wristbandTrackingEnabled').lean(),
      WristbandBatch.find({ event: eventId }).sort({ createdAt: 1 }).lean(),
    ]);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    return res.json({ success: true, data: { event, batches } });
  } catch (error) {
    console.error('Unable to list wristband stock:', error);
    return res.status(500).json({ success: false, message: 'Unable to load wristband stock.' });
  }
};

exports.createBatch = async (req, res) => {
  const { eventId } = req.params;
  const { ticketTypeId, color, prefix = '', startNumber, endNumber } = req.body || {};
  if (!mongoose.isValidObjectId(eventId) || !mongoose.isValidObjectId(ticketTypeId)) {
    return res.status(400).json({ success: false, message: 'Valid event and ticket type IDs are required.' });
  }
  const start = Number(startNumber); const end = Number(endNumber);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end - start > 1000000) {
    return res.status(400).json({ success: false, message: 'Enter a valid serial range (maximum 1,000,001 bands per batch).' });
  }
  if (typeof color !== 'string' || !color.trim() || color.trim().length > 40 || typeof prefix !== 'string' || prefix.length > 24) {
    return res.status(400).json({ success: false, message: 'A band color and a prefix of up to 24 characters are required.' });
  }
  try {
    const session = await mongoose.startSession();
    let batch;
    try {
      await session.withTransaction(async () => {
        const event = await Event.findById(eventId).session(session);
        if (!event) throw Object.assign(new Error('Event not found.'), { status: 404 });
        const ticketType = (event.ticketTypes || []).find((item) => String(item._id) === String(ticketTypeId));
        if (!ticketType) throw Object.assign(new Error('Ticket type does not belong to this event.'), { status: 400 });
        const normalizedColor = color.trim().toUpperCase();
        const normalizedPrefix = prefix.trim();
        const existingBatches = await WristbandBatch.find({ event: event._id }).select('color prefix startNumber endNumber').session(session).lean();
        const overlapping = existingBatches.some((item) =>
          String(item.color).trim().toUpperCase() === normalizedColor && String(item.prefix || '').trim() === normalizedPrefix &&
          start <= Number(item.endNumber) && end >= Number(item.startNumber)
        );
        if (overlapping) throw Object.assign(new Error('This color and prefix already has an overlapping serial range for the event.'), { status: 409 });
        [batch] = await WristbandBatch.create([{
          event: event._id, ticketTypeId: ticketType._id, ticketTypeName: ticketType.name,
          color: normalizedColor, prefix: normalizedPrefix, startNumber: start, endNumber: end,
          nextNumber: start, createdBy: req.user._id,
        }], { session });
        event.wristbandTrackingEnabled = true;
        await event.save({ session });
      });
    } finally { await session.endSession(); }
    return res.status(201).json({ success: true, data: batch });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error('Unable to create wristband stock batch:', error);
    return res.status(500).json({ success: false, message: 'Unable to create wristband stock.' });
  }
};

exports.getReport = async (req, res) => {
  const { eventId } = req.params;
  if (!mongoose.isValidObjectId(eventId)) return res.status(400).json({ success: false, message: 'Valid event ID is required.' });
  try {
    const event = await Event.findById(eventId).select('_id title ticketTypes wristbandTrackingEnabled').lean();
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    const sales = await Booking.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId), status: { $in: ['confirmed', 'checked-in'] }, paymentStatus: { $in: ['completed'] } } },
      { $group: { _id: { $ifNull: ['$bookingSource', 'online'] }, bookings: { $sum: 1 }, tickets: { $sum: '$quantity' } } },
    ]);
    const bands = await WristbandAssignment.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId), status: 'issued' } },
      { $group: { _id: { channel: '$bookingSource', color: '$color', ticketType: '$ticketType' }, issued: { $sum: 1 } } },
    ]);
    const consumedCount = await WristbandAssignment.countDocuments({ event: eventId });
    const batches = await WristbandBatch.find({ event: eventId }).lean();
    const totalStock = batches.reduce((sum, item) => sum + Math.max(0, item.endNumber - item.startNumber + 1), 0);
    const issued = bands.reduce((sum, item) => sum + item.issued, 0);
    const ticketsSold = sales.reduce((sum, item) => sum + item.tickets, 0);
    const channel = { online: { bookings: 0, tickets: 0, bandsIssued: 0 }, 'on-spot': { bookings: 0, tickets: 0, bandsIssued: 0 } };
    sales.forEach((row) => { const key = row._id === 'on-spot' ? 'on-spot' : 'online'; channel[key] = { ...channel[key], bookings: row.bookings, tickets: row.tickets }; });
    bands.forEach((row) => { const key = row._id.channel === 'on-spot' ? 'on-spot' : 'online'; channel[key].bandsIssued += row.issued; });
    return res.json({ success: true, data: { event, salesByChannel: channel, ticketsSold, ticketsAwaitingBand: Math.max(0, ticketsSold - issued), totalStock, bandsIssued: issued, bandsConsumed: consumedCount, bandsRemaining: Math.max(0, totalStock - consumedCount), batches, bandsByColorAndType: bands } });
  } catch (error) {
    console.error('Unable to build wristband report:', error);
    return res.status(500).json({ success: false, message: 'Unable to load wristband report.' });
  }
};
