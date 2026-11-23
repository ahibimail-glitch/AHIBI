const mongoose = require('mongoose');
const WristbandBatch = require('../models/WristbandBatch');
const WristbandAssignment = require('../models/WristbandAssignment');

class WristbandError extends Error {
  constructor(message, code, status = 409) {
    super(message);
    this.name = 'WristbandError';
    this.code = code;
    this.status = status;
  }
}

function serialCode(batch, number) {
  const color = String(batch.color || '').trim().toUpperCase().replace(/\s+/g, '-');
  return `${color}:${batch.prefix || ''}${number}`;
}

async function issueWristbands({ booking, event, staffId, adminId, canIssueWristbands = false, session }) {
  if (!event?.wristbandTrackingEnabled) return [];

  const quantity = Math.max(1, Number(booking.quantity) || 1);
  const existing = await WristbandAssignment.find({
    event: event._id,
    booking: booking._id,
    status: 'issued',
  }).session(session).sort({ ticketUnitIndex: 1 }).lean();
  const existingByUnit = new Map(existing.map((item) => [Number(item.ticketUnitIndex), item]));
  if (existingByUnit.size < quantity && !canIssueWristbands && !adminId) {
    throw new WristbandError('This account is not assigned to issue wristbands for this event.', 'WRISTBAND_PERMISSION_REQUIRED', 403);
  }
  const ticketTypeId = booking.ticketTypeId || (event.ticketTypes || []).find((ticket) => ticket.name === booking.ticketType)?._id;
  if (!ticketTypeId) {
    throw new WristbandError('This ticket type is not mapped to a wristband stock batch.', 'WRISTBAND_TICKET_TYPE_UNMAPPED');
  }

  const assigned = [...existing];
  for (let ticketUnitIndex = 1; ticketUnitIndex <= quantity; ticketUnitIndex += 1) {
    if (existingByUnit.has(ticketUnitIndex)) continue;
    const availableFilter = {
      event: event._id,
      ticketTypeId,
      active: true,
      $expr: { $lte: ['$nextNumber', '$endNumber'] },
    };
    const allocationOptions = { new: false, sort: { createdAt: 1, _id: 1 }, session };
    let batch = null;
    if (staffId && mongoose.isValidObjectId(staffId)) {
      batch = await WristbandBatch.findOneAndUpdate(
        { ...availableFilter, assignedScannerStaff: staffId },
        { $inc: { nextNumber: 1 } },
        allocationOptions,
      );
    }
    if (!batch) {
      batch = await WristbandBatch.findOneAndUpdate({
        ...availableFilter,
        ...(staffId && mongoose.isValidObjectId(staffId) ? {
          $or: [
            { assignedScannerStaff: { $exists: false } },
            { assignedScannerStaff: null },
          ],
        } : {}),
      }, { $inc: { nextNumber: 1 } }, allocationOptions);
    }
    if (!batch) {
      throw new WristbandError(`No wristbands remain for ${booking.ticketType}. Ask a supervisor to add stock.`, 'WRISTBAND_STOCK_EXHAUSTED');
    }

    const serialNumber = Number(batch.nextNumber);
    const assignment = new WristbandAssignment({
      event: event._id,
      booking: booking._id,
      ticketUnitIndex,
      batch: batch._id,
      serialNumber,
      bandCode: serialCode(batch, serialNumber),
      color: batch.color,
      ticketType: booking.ticketType,
      bookingSource: booking.bookingSource || 'online',
      ...(staffId && mongoose.isValidObjectId(staffId) ? { issuedBy: staffId } : {}),
      ...(adminId && mongoose.isValidObjectId(adminId) ? { issuedByAdmin: adminId } : {}),
    });
    await assignment.save({ session });
    assigned.push(assignment.toObject());
  }

  return assigned.sort((left, right) => Number(left.ticketUnitIndex) - Number(right.ticketUnitIndex));
}

module.exports = { WristbandError, issueWristbands, serialCode };
