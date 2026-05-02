const express = require('express');
const router = express.Router();
const futsalTournamentController = require('../controllers/futsalTournamentController');
const { protect } = require('../middlewares/auth');

// ============ TOURNAMENT REGISTRATION ROUTES (PUBLIC) ============
router.post('/tournaments/register', futsalTournamentController.createRegistrationOrder);
router.post('/tournaments/verify-payment', futsalTournamentController.verifyPayment);
router.get('/tournaments/registration/number/:registrationNumber', futsalTournamentController.getRegistrationByNumber);
router.get('/tournaments/registration/:id', futsalTournamentController.getRegistrationById);
router.get('/tournaments/registration/by-invoice/:invoiceNumber', futsalTournamentController.getRegistrationByInvoiceNumber);
router.get('/tournaments/invoice/:invoiceNumber', futsalTournamentController.downloadInvoice);

// ============ ADMIN ROUTES (PROTECTED) ============
router.get('/tournaments/registrations', protect, futsalTournamentController.getAllRegistrations);

module.exports = router;
