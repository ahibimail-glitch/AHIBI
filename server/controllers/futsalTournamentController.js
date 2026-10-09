const Razorpay = require('razorpay');
const crypto = require('crypto');
const ApiResponse = require('../utils/apiResponse');
const FutsalTournamentRegistration = require('../models/FutsalTournamentRegistration');
const futsalTournamentInvoiceService = require('../services/futsalTournamentInvoiceService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const idTypeLabels = {
  aadhar: 'Aadhar Card',
  pan: 'PAN Card',
  voter_id: 'Voter ID',
};

const validatePlayer = (player) => {
  if (!player || typeof player !== 'object') return 'Invalid player details';
  if (!player.fullName?.trim()) return 'Player full name is required';
  if (player.phone && !/^\d{10}$/.test(String(player.phone))) return 'Player phone must be a 10-digit number';
  if (!player.idType || !['aadhar', 'pan', 'voter_id'].includes(player.idType)) return 'Valid ID type (aadhar, pan, voter_id) is required';
  if (!player.idNumber?.trim()) return 'ID number is required';
  return null;
};

const validateContact = (contact, role) => {
  if (!contact) return null;
  if (contact.fullName && !contact.fullName.trim()) return `${role} name is invalid`;
  if (contact.phone && !/^\d{10}$/.test(String(contact.phone))) return `${role} phone must be a 10-digit number`;
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact.email))) return `${role} email is invalid`;
  return null;
};

const serializeRegistration = (registration) => ({
  id: registration._id,
  tournamentName: registration.tournamentName,
  teamName: registration.teamName,
  registrationNumber: registration.registrationNumber,
  invoiceNumber: registration.invoiceNumber,
  invoiceUrl: registration.invoiceUrl,
  paymentStatus: registration.paymentStatus,
  amount: registration.amount,
  currency: registration.currency,
  player: registration.player,
  numberOfPlayers: registration.numberOfPlayers,
  players: registration.players,
  teamManager: registration.teamManager,
  teamCoach: registration.teamCoach,
  tournamentDetails: registration.tournamentDetails,
  registrationDate: registration.registrationDate || registration.createdAt,
  razorpayPaymentId: registration.razorpayPaymentId,
  razorpayOrderId: registration.razorpayOrderId,
});

exports.createRegistrationOrder = async (req, res) => {
  try {
    const { teamName, numberOfPlayers, player, players, teamManager, teamCoach, declarationsAccepted } = req.body;

    // Validate team name
    if (!teamName || typeof teamName !== 'string' || !teamName.trim()) {
      return ApiResponse.badRequest(res, 'Team name is required');
    }

    // Validate number of players
    if (!numberOfPlayers || typeof numberOfPlayers !== 'number' || numberOfPlayers < 6 || numberOfPlayers > 10) {
      return ApiResponse.badRequest(res, 'Number of players must be between 6 and 10');
    }

    // Validate player (captain)
    if (!player || typeof player !== 'object') {
      return ApiResponse.badRequest(res, 'Player details are required');
    }

    const playerError = validatePlayer(player);
    if (playerError) {
      return ApiResponse.badRequest(res, playerError);
    }

    // Validate players array
    if (!players || !Array.isArray(players) || players.length < 6 || players.length > 10) {
      return ApiResponse.badRequest(res, 'Players array must contain between 6 and 10 player names');
    }

    // Validate each player name
    for (let i = 0; i < players.length; i++) {
      if (!players[i] || typeof players[i] !== 'string' || !players[i].trim()) {
        return ApiResponse.badRequest(res, `Player ${i + 1} name is required`);
      }
    }

    // Ensure players array length matches numberOfPlayers
    if (players.length !== numberOfPlayers) {
      return ApiResponse.badRequest(res, `Number of players (${numberOfPlayers}) must match the number of player names provided (${players.length})`);
    }

    if (teamManager) {
      const error = validateContact(teamManager, 'Team Manager');
      if (error) return ApiResponse.badRequest(res, error);
    }

    if (teamCoach) {
      const error = validateContact(teamCoach, 'Team Coach');
      if (error) return ApiResponse.badRequest(res, error);
    }

    if (!declarationsAccepted) {
      return ApiResponse.badRequest(res, 'You must accept the declarations to proceed');
    }

    const amount = 3500;

    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `FTTREG_${Date.now()}`,
      notes: {
        tournament: 'Turf Titans Tournament T3',
        teamName: teamName,
        playerCount: String(numberOfPlayers),
      },
    });

    const registrationNumber = `FTT-${Date.now()}`;
    const invoiceNumber = `INV-FTT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

    const registration = await FutsalTournamentRegistration.create({
      teamName: String(teamName).trim(),
      numberOfPlayers: Number(numberOfPlayers),
      player: {
        fullName: String(player.fullName).trim(),
        phone: player.phone ? String(player.phone).trim() : undefined,
        idType: player.idType,
        idNumber: String(player.idNumber).trim(),
      },
      players: players.map(p => String(p).trim()),
      teamManager: teamManager ? {
        fullName: teamManager.fullName ? String(teamManager.fullName).trim() : undefined,
        phone: teamManager.phone ? String(teamManager.phone).trim() : undefined,
        email: teamManager.email ? String(teamManager.email).trim() : undefined,
      } : undefined,
      teamCoach: teamCoach ? {
        fullName: teamCoach.fullName ? String(teamCoach.fullName).trim() : undefined,
        phone: teamCoach.phone ? String(teamCoach.phone).trim() : undefined,
        email: teamCoach.email ? String(teamCoach.email).trim() : undefined,
      } : undefined,
      tournament: 'Turf Titans Tournament T3',
      registrationNumber,
      invoiceNumber,
      status: 'pending',
      razorpayOrderId: razorpayOrder.id,
    });

    return ApiResponse.success(res, 'Futsal tournament registration order created successfully', {
      requiresPayment: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      registrationId: registration._id,
      registration: serializeRegistration(registration),
    }, 201);
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to create futsal tournament registration order', error);
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

    const registration = await FutsalTournamentRegistration.findById(registrationId);
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
      const invoiceData = await futsalTournamentInvoiceService.generateInvoice(registration);
      registration.invoicePdf = invoiceData.buffer;
      registration.invoicePdfContentType = invoiceData.contentType || 'application/pdf';
      registration.invoiceGeneratedAt = new Date();
      registration.invoiceUrl = `/api/futsal/tournaments/invoice/${registration.invoiceNumber}`;
      await registration.save();
    } catch (invoiceError) {
      console.error('Futsal tournament invoice generation error:', invoiceError);
    }

    return ApiResponse.success(res, 'Payment verified and registration confirmed successfully', {
      registration: serializeRegistration(registration),
    });
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to verify futsal tournament payment', error);
  }
};

exports.getRegistrationById = async (req, res) => {
  try {
    const registration = await FutsalTournamentRegistration.findById(req.params.id);
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

exports.getRegistrationByInvoiceNumber = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    const registration = await FutsalTournamentRegistration.findOne({ invoiceNumber });

    if (!registration) {
      return ApiResponse.error(res, 'Registration not found', 404);
    }

    ApiResponse.success(res, { registration }, 'Registration found successfully');
  } catch (error) {
    console.error('Error fetching registration by invoice number:', error);
    ApiResponse.serverError(res, 'Failed to fetch registration');
  }
};

exports.getRegistrationByNumber = async (req, res) => {
  try {
    const registration = await FutsalTournamentRegistration.findOne({ registrationNumber: req.params.registrationNumber });
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
    const registration = await FutsalTournamentRegistration.findOne({
      invoiceNumber: req.params.invoiceNumber,
      paymentStatus: 'confirmed',
    }).select('+invoicePdf');

    if (!registration) {
      return ApiResponse.notFound(res, 'Invoice not found');
    }

    if (!registration.invoicePdf) {
      const invoiceData = await futsalTournamentInvoiceService.generateInvoice(registration);
      registration.invoicePdf = invoiceData.buffer;
      registration.invoicePdfContentType = invoiceData.contentType || 'application/pdf';
      registration.invoiceGeneratedAt = new Date();
      registration.invoiceUrl = `/api/futsal/tournaments/invoice/${registration.invoiceNumber}`;
      await registration.save();
    }

    res.setHeader('Content-Type', registration.invoicePdfContentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${registration.invoiceNumber}.pdf"`);
    return res.status(200).send(registration.invoicePdf);
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to download invoice', error);
  }
};

exports.getAllRegistrations = async (req, res) => {
  try {
    const { status, paymentStatus } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const registrations = await FutsalTournamentRegistration.find(filter).sort({ createdAt: -1 });
    
    return ApiResponse.success(res, 'Registrations fetched successfully', {
      registrations: registrations.map(serializeRegistration),
      count: registrations.length,
    });
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to fetch registrations', error);
  }
};
