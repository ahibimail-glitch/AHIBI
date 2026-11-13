const { performance } = require('node:perf_hooks');

function duration(value) {
  return Math.max(0, Number(value) || 0).toFixed(1);
}

function totalDatabaseWallTime(intervals, requestStart, responseEnd) {
  const sorted = intervals
    .map(({ startedAt, endedAt }) => ({
      startedAt: Math.max(requestStart, startedAt),
      endedAt: Math.min(responseEnd, endedAt),
    }))
    .filter(({ startedAt, endedAt }) => endedAt > startedAt)
    .sort((left, right) => left.startedAt - right.startedAt);
  if (sorted.length === 0) return 0;

  let totalMs = 0;
  let rangeStart = sorted[0].startedAt;
  let rangeEnd = sorted[0].endedAt;
  for (const interval of sorted.slice(1)) {
    if (interval.startedAt <= rangeEnd) {
      rangeEnd = Math.max(rangeEnd, interval.endedAt);
    } else {
      totalMs += rangeEnd - rangeStart;
      rangeStart = interval.startedAt;
      rangeEnd = interval.endedAt;
    }
  }
  return totalMs + rangeEnd - rangeStart;
}

module.exports = function scannerRequestTiming(req, res, next) {
  const startedAt = performance.now();
  const databaseTimings = new Map();
  const databaseIntervals = [];
  const phaseTimings = new Map();

  req.scannerTiming = {
    recordDatabase(name, elapsedMs, queryStartedAt, queryEndedAt) {
      databaseTimings.set(name, (databaseTimings.get(name) || 0) + elapsedMs);
      const endedAt = Number.isFinite(queryEndedAt) ? queryEndedAt : performance.now();
      const startedAt = Number.isFinite(queryStartedAt) ? queryStartedAt : endedAt - elapsedMs;
      databaseIntervals.push({ startedAt, endedAt });
    },
    recordPhase(name, elapsedMs) {
      phaseTimings.set(name, (phaseTimings.get(name) || 0) + elapsedMs);
    },
  };

  const json = res.json.bind(res);
  res.json = (body) => {
    const responseEndedAt = performance.now();
    const backendMs = Math.max(0, responseEndedAt - startedAt);
    const databaseQuerySumMs = [...databaseTimings.values()].reduce((sum, elapsedMs) => sum + elapsedMs, 0);
    const databaseWallMs = totalDatabaseWallTime(databaseIntervals, startedAt, responseEndedAt);
    const appMs = Math.max(0, backendMs - databaseWallMs);
    const metrics = [
      `scanner-backend;dur=${duration(backendMs)}`,
      `scanner-app;dur=${duration(appMs)}`,
      `scanner-mongo;dur=${duration(databaseWallMs)}`,
      `scanner-mongo-query-sum;dur=${duration(databaseQuerySumMs)}`,
      ...[...databaseTimings].map(([name, elapsedMs]) => `${name};dur=${duration(elapsedMs)}`),
      ...[...phaseTimings].map(([name, elapsedMs]) => `${name};dur=${duration(elapsedMs)}`),
    ];
    res.setHeader('Server-Timing', metrics.join(', '));
    return json(body);
  };

  next();
};
