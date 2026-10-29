const { performance } = require('perf_hooks');

const RESERVATION_PATH = '/api/nusc-partner/v1/season-pass/reservations';

function isReservationRequest(req) {
  const path = String(req.originalUrl || req.url || '').split('?')[0];
  return req.method === 'POST' && path === RESERVATION_PATH;
}

function elapsedMs(startedAt) {
  return Number((performance.now() - startedAt).toFixed(1));
}

function startStage(req) {
  return req.nuscSeasonPassTiming ? performance.now() : null;
}

function finishStage(req, stage, startedAt) {
  const timing = req.nuscSeasonPassTiming;
  if (!timing || startedAt === null) return;
  timing.stages.set(stage, elapsedMs(startedAt));
}

function measureStage(req, stage, callback) {
  if (!req.nuscSeasonPassTiming) return callback();

  const startedAt = performance.now();
  try {
    return Promise.resolve(callback()).finally(() => finishStage(req, stage, startedAt));
  } catch (error) {
    finishStage(req, stage, startedAt);
    throw error;
  }
}

function measureSyncStage(req, stage, callback) {
  if (!req.nuscSeasonPassTiming) return callback();

  const startedAt = performance.now();
  try {
    return callback();
  } finally {
    finishStage(req, stage, startedAt);
  }
}

function logTimings(timing) {
  const elapsedByStage = Object.fromEntries(timing.stages);
  elapsedByStage.total_request = elapsedMs(timing.startedAt);

  console.info(JSON.stringify({
    stage: 'nusc_season_pass_reservation',
    elapsedMs: elapsedByStage,
  }));
}

function nuscSeasonPassReservationTiming(req, res, next) {
  if (!isReservationRequest(req)) return next();

  const timing = {
    startedAt: performance.now(),
    stages: new Map(),
  };
  req.nuscSeasonPassTiming = timing;

  res.once('finish', () => {
    logTimings(timing);
  });

  return next();
}

module.exports = {
  finishStage,
  measureStage,
  measureSyncStage,
  nuscSeasonPassReservationTiming,
  startStage,
};
