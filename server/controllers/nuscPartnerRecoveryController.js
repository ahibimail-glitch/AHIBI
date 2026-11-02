const {
  previewPartnerSeasonPassTicketRecovery,
  recoverPartnerSeasonPassTickets,
} = require('../services/nuscPartnerTicketRecoveryService');

function isValidOrderId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{6,120}$/.test(value);
}

exports.previewPartnerSeasonPassTicketRecovery = async (req, res) => {
  const orderId = String(req.params.orderId || '').trim();
  if (!isValidOrderId(orderId)) {
    return res.status(400).json({ success: false, code: 'INVALID_ORDER_ID', message: 'Enter a valid NUSC order ID.' });
  }
  try {
    const recovery = await previewPartnerSeasonPassTicketRecovery(orderId);
    const notFound = recovery.reasons?.some((reason) => reason.code === 'RESERVATION_NOT_FOUND');
    return res.status(notFound ? 404 : 200).json({
      success: !notFound,
      message: notFound ? 'No partner reservation matches this NUSC order.' : undefined,
      recovery,
    });
  } catch (error) {
    console.error('[NUSC Admin recovery] Preview checks unavailable:', error.code || error.name || 'unknown');
    return res.status(503).json({
      success: false,
      code: 'RECOVERY_CHECKS_UNAVAILABLE',
      message: 'Recovery checks could not be completed. No ticket changes were made; retry the preview.',
    });
  }
};

exports.recoverPartnerSeasonPassTickets = async (req, res) => {
  const orderId = String(req.params.orderId || '').trim();
  if (!isValidOrderId(orderId)) {
    return res.status(400).json({ success: false, code: 'INVALID_ORDER_ID', message: 'Enter a valid NUSC order ID.' });
  }
  try {
    const recovery = await recoverPartnerSeasonPassTickets(orderId, req.user._id);
    const notFound = recovery.reasons?.some((reason) => reason.code === 'RESERVATION_NOT_FOUND');
    return res.status(notFound ? 404 : 200).json({
      success: !notFound,
      message: notFound ? 'No partner reservation matches this NUSC order.' : undefined,
      recovery,
    });
  } catch (error) {
    console.error('[NUSC Admin recovery] Ticket recovery checks unavailable:', error.code || error.name || 'unknown');
    return res.status(503).json({
      success: false,
      code: 'RECOVERY_CHECKS_UNAVAILABLE',
      message: 'Recovery did not complete because a required check was unavailable. Refresh the preview before retrying.',
    });
  }
};
