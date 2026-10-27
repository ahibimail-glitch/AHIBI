const express = require('express');
const controller = require('../controllers/nuscPartnerController');
const { authenticateNuscPartner } = require('../middlewares/nuscPartnerAuth');

const router = express.Router();
router.use(authenticateNuscPartner);

router.get('/catalog/season-passes', controller.getCatalog);
router.post('/season-pass/reservations', controller.reserveSeasonPass);
router.post('/reservations/:reservationId/confirm', controller.confirmAndIssue);
router.post('/reservations/:reservationId/replace-general', controller.replaceGeneralWithPremium);
router.post('/reservations/:reservationId/release', controller.releaseReservation);
router.get('/reservations/:reservationId', controller.getReservation);
router.get('/reservations/:reservationId/tickets/:bookingId', controller.getTicket);
router.get('/reservations/:reservationId/tickets/:bookingId/pdf', controller.getTicketPdf);
router.post('/reservations/:reservationId/tickets/:bookingId/pdf', controller.postTicketPdf);

module.exports = router;
