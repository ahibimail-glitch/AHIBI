const mongoose = require('mongoose');
const ScannerActivity = require('../models/ScannerActivity');

module.exports = function scannerActivityAudit(req, res, next) {
  const startedAt = process.hrtime.bigint();
  let responseBody;
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return sendJson(body);
  };

  res.once('finish', () => {
    const routePath = req.route?.path || req.path;
    const action = `${req.method} ${String(routePath).slice(0, 100)}`;
    const eventId = req.body?.eventId || req.params?.eventId || req.query?.eventId;
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const statusCode = res.statusCode || 500;
    const audit = {
      ...(req.scannerStaff?._id ? { scannerStaff: req.scannerStaff._id } : {}),
      ...(mongoose.isValidObjectId(eventId) ? { event: eventId } : {}),
      action,
      outcome: statusCode >= 400 ? 'error' : 'success',
      statusCode,
      ...(typeof responseBody?.code === 'string' ? { errorCode: responseBody.code.slice(0, 100) } : {}),
      durationMs: Math.max(0, durationMs),
    };

    // Audit storage must never delay or change the scanner operation response.
    void ScannerActivity.create(audit).catch((error) => {
      console.error('Unable to record scanner activity:', error.message);
    });
  });

  next();
};
