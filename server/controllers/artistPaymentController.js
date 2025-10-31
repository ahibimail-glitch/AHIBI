const ArtistPaymentService = require('../services/artistPaymentService');
const ApiResponse = require('../utils/apiResponse');
const { validationResult } = require('express-validator');

/**
 * @desc    Get artist payment history
 * @route   GET /api/artist/payments/history
 * @access  Private (Artist only)
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    
    const result = await ArtistPaymentService.getPaymentHistory(req.user.id, options);
    
    return ApiResponse.success(res, 'Payment history retrieved successfully', result);

  } catch (error) {
    console.error('Get Payment History Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving payment history', error.message);
  }
};

/**
 * @desc    Get artist earnings summary
 * @route   GET /api/artist/payments/earnings
 * @access  Private (Artist only)
 */
exports.getEarningsSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {};
    
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;
    
    const summary = await ArtistPaymentService.getEarningsSummary(req.user.id, dateRange);
    
    return ApiResponse.success(res, 'Earnings summary retrieved successfully', {
      summary
    });

  } catch (error) {
    console.error('Get Earnings Summary Error:', error);
    return ApiResponse.serverError(res, 'Error retrieving earnings summary', error.message);
  }
};

/**
 * @desc    Generate payment invoice for booking
 * @route   GET /api/artist/payments/invoice/:bookingId
 * @access  Private (Artist only)
 */
exports.generatePaymentInvoice = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const invoice = await ArtistPaymentService.generatePaymentInvoice(bookingId);
    
    return ApiResponse.success(res, 'Payment invoice generated successfully', {
      invoice
    });

  } catch (error) {
    console.error('Generate Payment Invoice Error:', error);
    return ApiResponse.serverError(res, 'Error generating payment invoice', error.message);
  }
};

/**
 * @desc    Process advance payment (webhook endpoint)
 * @route   POST /api/artist/payments/advance-payment
 * @access  Private (Webhook)
 */
exports.processAdvancePayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { bookingId, paymentData } = req.body;
    
    const result = await ArtistPaymentService.processAdvancePayment(bookingId, paymentData);
    
    return ApiResponse.success(res, result.message, {
      booking: result.booking,
      paymentTransaction: result.paymentTransaction
    });

  } catch (error) {
    console.error('Process Advance Payment Error:', error);
    return ApiResponse.serverError(res, 'Error processing advance payment', error.message);
  }
};

/**
 * @desc    Process full payment (webhook endpoint)
 * @route   POST /api/artist/payments/full-payment
 * @access  Private (Webhook)
 */
exports.processFullPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { bookingId, paymentData } = req.body;
    
    const result = await ArtistPaymentService.processFullPayment(bookingId, paymentData);
    
    return ApiResponse.success(res, result.message, {
      booking: result.booking,
      paymentTransaction: result.paymentTransaction
    });

  } catch (error) {
    console.error('Process Full Payment Error:', error);
    return ApiResponse.serverError(res, 'Error processing full payment', error.message);
  }
};

/**
 * @desc    Process refund (admin only)
 * @route   POST /api/artist/payments/refund
 * @access  Private (Admin only)
 */
exports.processRefund = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { bookingId, refundAmount, reason } = req.body;
    
    const result = await ArtistPaymentService.processRefund(bookingId, refundAmount, reason);
    
    return ApiResponse.success(res, result.message, {
      booking: result.booking,
      refundTransaction: result.refundTransaction
    });

  } catch (error) {
    console.error('Process Refund Error:', error);
    return ApiResponse.serverError(res, 'Error processing refund', error.message);
  }
};

module.exports = {
  getPaymentHistory: exports.getPaymentHistory,
  getEarningsSummary: exports.getEarningsSummary,
  generatePaymentInvoice: exports.generatePaymentInvoice,
  processAdvancePayment: exports.processAdvancePayment,
  processFullPayment: exports.processFullPayment,
  processRefund: exports.processRefund
};
