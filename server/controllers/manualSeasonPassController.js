const ApiResponse = require('../utils/apiResponse');
const manualPasses = require('../services/manualSeasonPassService');
const nuscRise = require('../services/nuscRiseIntegrationClient');
const recovery = require('../services/seasonPassRecoveryService');
const newTicketReissue = require('../services/adminNewTicketReissueService');
const PASS_OPTIONS = require('../config/nuscHomeMatchPricing');

exports.getPrices = async (_req, res) => {
  const passes = Object.fromEntries(Object.entries(PASS_OPTIONS).map(([passId, pass]) => [
    passId,
    { ticketType: pass.ticketType, amount: pass.amount, amountMinor: pass.amountMinor },
  ]));
  return ApiResponse.success(res, 'Season pass prices retrieved', { passes });
};

function sendError(res, error) {
  if (error.status && error.code) {
    return res.status(error.status).json({ success: false, code: error.code, message: error.message });
  }
  console.error('[Admin manual season pass] Request failed:', error.message);
  return res.status(500).json({ success: false, code: 'MANUAL_SEASON_PASS_FAILED', message: 'Unable to complete the season pass request.' });
}

exports.searchRiseMembers = async (req, res) => {
  try {
    const query = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const result = await nuscRise.searchRiseMembers(query);
    return ApiResponse.success(res, 'RISE member search completed', result);
  } catch (error) {
    return sendError(res, error);
  }
};

exports.getAhibiPassStatus = async (req, res) => {
  try {
    const ManualSeasonPassOrder = require('../models/ManualSeasonPassOrder');
    const Booking = require('../models/Booking');
    const order = await ManualSeasonPassOrder.findOne({ orderId: req.params.orderId }).lean();
    if (!order) return res.status(404).json({ success: false, code: 'ORDER_NOT_FOUND', message: 'Season pass reservation was not found.' });
    const bookings = order.status === 'issued'
      ? await Booking.find({ manualSeasonPassOrderId: order.orderId }).sort({ manualSeasonPassMatchIndex: 1 }).lean()
      : [];
    return ApiResponse.success(res, 'AHIBI season pass status retrieved', {
      orderId: order.orderId,
      status: order.status,
      passId: order.passId,
      ticketType: order.ticketType,
      zone: order.zone || null,
      amountMinor: order.listAmountMinor,
      currency: 'INR',
      settlementType: order.settlementType || null,
      reservationExpiresAt: order.reservationExpiresAt || null,
      bookingIds: (order.bookingIds || []).map(String),
      bookings,
      errorCode: order.errorCode || null,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.reserveAhibiPass = async (req, res) => {
  try {
    const result = await manualPasses.reserveAhibiManualSeasonPass({
      requestId: req.body?.requestId,
      userId: req.body?.userId,
      adminId: req.user?._id,
      passId: req.body?.passId,
      zone: req.body?.zone ?? null,
    });
    return ApiResponse.success(res, 'AHIBI season pass reserved', result, 201);
  } catch (error) {
    return sendError(res, error);
  }
};

exports.settleAhibiPass = async (req, res) => {
  try {
    const result = await manualPasses.settleAhibiManualSeasonPass({
      orderId: req.params.orderId,
      adminId: req.user?._id,
      settlement: req.body,
    });
    return ApiResponse.success(res, 'AHIBI season pass issued', result, 200);
  } catch (error) {
    return sendError(res, error);
  }
};

exports.cancelAhibiPass = async (req, res) => {
  try {
    const result = await manualPasses.cancelAhibiManualSeasonPass({ orderId: req.params.orderId, adminId: req.user?._id });
    return ApiResponse.success(res, 'AHIBI season pass reservation cancelled', result, 200);
  } catch (error) {
    return sendError(res, error);
  }
};

exports.reserveRisePass = async (req, res) => {
  try {
    const result = await nuscRise.reserveRiseSeasonPass({
      requestId: req.body?.requestId,
      memberNumber: req.body?.memberNumber,
      passId: req.body?.passId,
      zone: req.body?.zone ?? null,
      adminReference: String(req.user?._id || ''),
    });
    return ApiResponse.success(res, 'RISE season pass reserved', result, 201);
  } catch (error) {
    return sendError(res, error);
  }
};

exports.settleRisePass = async (req, res) => {
  try {
    const result = await nuscRise.settleRiseSeasonPass({
      orderId: req.params.orderId,
      settlementType: req.body?.settlementType,
      modeOfPayment: req.body?.modeOfPayment,
      paymentReference: req.body?.paymentReference,
      complimentaryReason: req.body?.complimentaryReason,
      adminReference: String(req.user?._id || ''),
    });
    return ApiResponse.success(res, 'RISE season pass issued', result, 200);
  } catch (error) {
    return sendError(res, error);
  }
};

exports.cancelRisePass = async (req, res) => {
  try {
    const result = await nuscRise.cancelRiseSeasonPass({
      orderId: req.params.orderId,
      adminReference: String(req.user?._id || ''),
    });
    return ApiResponse.success(res, 'RISE season pass reservation cancelled', result, 200);
  } catch (error) {
    return sendError(res, error);
  }
};

exports.getRisePassStatus = async (req, res) => {
  try {
    const result = await nuscRise.getRiseSeasonPassStatus({
      orderId: req.params.orderId,
      adminReference: String(req.user?._id || ''),
    });
    return ApiResponse.success(res, 'RISE season pass status retrieved', result, 200);
  } catch (error) {
    return sendError(res, error);
  }
};

function sendRecoveryError(res, error) {
  if (error instanceof recovery.SeasonPassRecoveryError || (error.status && error.code)) {
    return res.status(error.status).json({ success: false, code: error.code, message: error.message });
  }
  console.error('[Admin season pass recovery] Request failed:', error.code || error.name || 'recovery_error');
  return res.status(502).json({
    success: false,
    code: 'SEASON_PASS_RECOVERY_UNAVAILABLE',
    message: 'Ticket recovery could not be completed. Refresh the pass status before retrying.',
  });
}

function adminTicketSummary(ticket) {
  return {
    matchIndex: ticket.matchIndex,
    matchDate: ticket.matchDate,
    opponent: ticket.opponent,
    status: ticket.status,
    ticketType: ticket.ticketType,
    zone: ticket.zone || null,
  };
}

function adminOrderSummary(order) {
  return { ...order, tickets: (order.tickets || []).map(adminTicketSummary) };
}

exports.listAhibiRecoveryOrders = async (req, res) => {
  try {
    const orders = await recovery.listAhibiSeasonPassOrders(req.query.userId);
    return ApiResponse.success(res, 'AHIBI season pass orders retrieved', { orders: orders.map(adminOrderSummary) });
  } catch (error) {
    return sendRecoveryError(res, error);
  }
};

exports.searchRiseRecoveryOrders = async (req, res) => {
  try {
    const query = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (query.length < 5 || query.length > 32) return ApiResponse.success(res, 'RISE season pass orders retrieved', { members: [], orders: [] });
    const result = await recovery.searchRiseRecoveryOrders(query);
    return ApiResponse.success(res, 'RISE season pass orders retrieved', {
      members: result.members,
      orders: result.orders.map((entry) => ({
        memberNumber: entry.memberNumber,
        memberName: entry.memberName,
        tier: entry.tier,
        order: adminOrderSummary(entry.order),
      })),
    });
  } catch (error) {
    return sendRecoveryError(res, error);
  }
};

exports.recoverAhibiPassTickets = async (req, res) => {
  try {
    const result = await recovery.recoverAhibiSeasonPass({
      kind: req.body?.kind,
      orderId: req.body?.orderId,
      requestId: req.body?.requestId,
      adminId: req.user?._id,
    });
    return ApiResponse.success(res, 'AHIBI season pass ticket recovery completed', {
      ...result,
      order: adminOrderSummary(result.order),
      result: { ...result.result, tickets: (result.result.tickets || []).map(adminTicketSummary) },
    });
  } catch (error) {
    return sendRecoveryError(res, error);
  }
};

exports.recoverRisePassTickets = async (req, res) => {
  try {
    const result = await recovery.recoverRiseSeasonPass({
      orderId: req.body?.orderId,
      memberNumber: req.body?.memberNumber,
      requestId: req.body?.requestId,
      adminId: req.user?._id,
    });
    return ApiResponse.success(res, 'RISE season pass ticket recovery completed', {
      ...result,
      order: adminOrderSummary(result.order),
      result: { ...result.result, tickets: (result.result.tickets || []).map(adminTicketSummary) },
    });
  } catch (error) {
    return sendRecoveryError(res, error);
  }
};

function sendNewTicketReissueError(res, error) {
  if (error instanceof newTicketReissue.TicketReissueError || (error.status && error.code)) {
    return res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    });
  }
  console.error('[Admin new ticket reissue] Request failed:', error.code || error.name || 'reissue_error');
  return res.status(502).json({
    success: false,
    code: 'NEW_TICKET_REISSUE_UNAVAILABLE',
    message: 'New ticket reissue could not be completed. Refresh the entitlement and review its status before retrying.',
  });
}

function newTicketReissueInput(req) {
  return {
    channel: req.params?.channel,
    kind: req.body?.kind,
    orderId: req.body?.orderId,
    memberNumber: req.body?.memberNumber,
    requestId: req.body?.requestId,
    evidence: req.body?.evidence,
    approved: req.body?.approved,
    adminId: req.user?._id,
  };
}

exports.previewNewSeasonPassTickets = async (req, res) => {
  try {
    if (!['ahibi', 'rise'].includes(req.params?.channel)) {
      return res.status(400).json({ success: false, code: 'INVALID_CHANNEL', message: 'Select an AHIBI or RISE paid entitlement.' });
    }
    const preview = await newTicketReissue.previewNewTicketReissue(newTicketReissueInput(req));
    return ApiResponse.success(res, 'New ticket reissue preview completed', preview);
  } catch (error) {
    return sendNewTicketReissueError(res, error);
  }
};

exports.reissueNewSeasonPassTickets = async (req, res) => {
  try {
    if (!['ahibi', 'rise'].includes(req.params?.channel)) {
      return res.status(400).json({ success: false, code: 'INVALID_CHANNEL', message: 'Select an AHIBI or RISE paid entitlement.' });
    }
    const result = await newTicketReissue.reissueNewTickets(newTicketReissueInput(req));
    return ApiResponse.success(res, 'New ticket reissue completed', result);
  } catch (error) {
    return sendNewTicketReissueError(res, error);
  }
};
