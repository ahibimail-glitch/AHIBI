const ApiResponse = require('../utils/apiResponse');
const manualPasses = require('../services/manualSeasonPassService');
const nuscRise = require('../services/nuscRiseIntegrationClient');
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
