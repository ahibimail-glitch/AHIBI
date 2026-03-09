const Razorpay = require('razorpay');
const crypto = require('crypto');
const ApiResponse = require('../utils/apiResponse');
const SportsTournamentRegistration = require('../models/SportsTournamentRegistration');
const sportsTournamentInvoiceService = require('../services/sportsTournamentInvoiceService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const categoryLabels = {
  mens_doubles: "Men's Doubles",
  womens_doubles: "Women's Doubles",
  mixed_doubles: "Mixed Doubles",
  team_event: 'Team Event',
};

const validatePlayer = (player) => {
  if (!player || typeof player !== 'object') return 'Invalid player details';
  if (!player.fullName?.trim()) return 'Player full name is required';
  if (!player.age || Number(player.age) < 5 || Number(player.age) > 99) return 'Player age must be between 5 and 99';
  if (!['male', 'female'].includes(player.gender)) return 'Player gender is invalid';
  if (!/^\d{10}$/.test(String(player.phone || ''))) return 'Player phone must be a 10-digit number';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(player.email || ''))) return 'Player email is invalid';
  return null;
};

const serializeRegistration = (registration) => ({
  id: registration._id,
  tournamentName: registration.tournamentName,
  registrationNumber: registration.registrationNumber,
  invoiceNumber: registration.invoiceNumber,
  invoiceUrl: registration.invoiceUrl,
  paymentStatus: registration.paymentStatus,
  amount: registration.amount,
  currency: registration.currency,
  categories: registration.categories,
  categoryLabels: registration.categories.map((category) => categoryLabels[category] || category),
  players: registration.players,
  registrationDate: registration.registrationDate,
  razorpayPaymentId: registration.razorpayPaymentId,
  razorpayOrderId: registration.razorpayOrderId,
});

exports.createRegistrationOrder = async (req, res) => {
  try {
    const { categories, player1, player2, checks } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return ApiResponse.badRequest(res, 'At least one category must be selected');
    }

    if (categories.length > 2) {
      return ApiResponse.badRequest(res, 'Maximum 2 categories are allowed');
    }

    const uniqueCategories = [...new Set(categories)];
    if (uniqueCategories.length !== categories.length) {
      return ApiResponse.badRequest(res, 'Duplicate categories are not allowed');
    }

    const players = [player1, player2];
    for (const player of players) {
      const error = validatePlayer(player);
      if (error) return ApiResponse.badRequest(res, error);
    }

    if (!Array.isArray(checks) || checks.length !== 3 || !checks.every(Boolean)) {
      return ApiResponse.badRequest(res, 'All declarations must be accepted');
    }

    const amount = categories.length * 1500;

    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `SPTREG_${Date.now()}`,
      notes: {
        tournament: 'Nagaland Pickleball Classic Tournament 2026',
        categoryCount: String(categories.length),
        categories: categories.join(','),
        player1Name: player1.fullName,
        player2Name: player2.fullName,
      },
    });

    const registration = await SportsTournamentRegistration.create({
      categories,
      players: players.map((player) => ({
        ...player,
        age: Number(player.age),
      })),
      declarationsAccepted: true,
      amount,
      currency: 'INR',
      paymentStatus: 'pending',
      status: 'pending',
      razorpayOrderId: razorpayOrder.id,
    });

    return ApiResponse.success(res, 'Tournament registration order created successfully', {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      registrationId: registration._id,
      registration: serializeRegistration(registration),
    }, 201);
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to create tournament registration order', error);
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !registrationId) {
      return ApiResponse.badRequest(res, 'Missing payment verification details');
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return ApiResponse.badRequest(res, 'Payment verification failed');
    }

    const registration = await SportsTournamentRegistration.findById(registrationId);
    if (!registration) {
      return ApiResponse.notFound(res, 'Registration not found');
    }

    if (registration.razorpayOrderId !== razorpay_order_id) {
      return ApiResponse.badRequest(res, 'Order mismatch for registration');
    }

    registration.paymentStatus = 'confirmed';
    registration.status = 'confirmed';
    registration.razorpayPaymentId = razorpay_payment_id;
    registration.razorpaySignature = razorpay_signature;
    registration.transactionId = razorpay_payment_id;
    await registration.save();

    try {
      const invoiceData = await sportsTournamentInvoiceService.generateInvoice(registration);
      registration.invoicePdf = invoiceData.buffer;
      registration.invoicePdfContentType = invoiceData.contentType || 'application/pdf';
      registration.invoiceGeneratedAt = new Date();
      registration.invoiceUrl = `/api/sports/tournaments/invoice/${registration.invoiceNumber}`;
      await registration.save();
    } catch (invoiceError) {
      console.error('Tournament invoice generation error:', invoiceError);
    }

    return ApiResponse.success(res, 'Payment verified and registration confirmed successfully', {
      registration: serializeRegistration(registration),
    });
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to verify tournament payment', error);
  }
};

exports.getRegistrationById = async (req, res) => {
  try {
    const registration = await SportsTournamentRegistration.findById(req.params.id);
    if (!registration) {
      return ApiResponse.notFound(res, 'Registration not found');
    }
    return ApiResponse.success(res, 'Registration fetched successfully', {
      registration: serializeRegistration(registration),
    });
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to fetch registration', error);
  }
};

exports.getRegistrationByNumber = async (req, res) => {
  try {
    const registration = await SportsTournamentRegistration.findOne({ registrationNumber: req.params.registrationNumber });
    if (!registration) {
      return ApiResponse.notFound(res, 'Registration not found');
    }
    return ApiResponse.success(res, 'Registration fetched successfully', {
      registration: serializeRegistration(registration),
    });
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to fetch registration', error);
  }
};

exports.downloadInvoice = async (req, res) => {
  try {
    const registration = await SportsTournamentRegistration.findOne({
      invoiceNumber: req.params.invoiceNumber,
      paymentStatus: 'confirmed',
    }).select('+invoicePdf');

    if (!registration) {
      return ApiResponse.notFound(res, 'Invoice not found');
    }

    if (!registration.invoicePdf) {
      const invoiceData = await sportsTournamentInvoiceService.generateInvoice(registration);
      registration.invoicePdf = invoiceData.buffer;
      registration.invoicePdfContentType = invoiceData.contentType || 'application/pdf';
      registration.invoiceGeneratedAt = new Date();
      registration.invoiceUrl = `/api/sports/tournaments/invoice/${registration.invoiceNumber}`;
      await registration.save();
    }

    res.setHeader('Content-Type', registration.invoicePdfContentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${registration.invoiceNumber}.pdf"`);
    return res.status(200).send(registration.invoicePdf);
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to download invoice', error);
  }
};
