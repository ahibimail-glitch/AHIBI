const assert = require('node:assert/strict');
const test = require('node:test');
const { performance } = require('node:perf_hooks');
const scannerRequestTiming = require('../middlewares/scannerRequestTiming');

test('scanner timing separates backend, overlapping Mongo queries, named query, and transaction durations', async () => {
  const headers = {};
  let responseBody;
  const response = {
    setHeader(name, value) { headers[name] = value; },
    json(body) { responseBody = body; return this; },
  };
  let nextCalled = false;
  const request = {};

  scannerRequestTiming(request, response, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  await new Promise((resolve) => setTimeout(resolve, 15));
  const queryEndedAt = performance.now();
  request.scannerTiming.recordDatabase('scanner-auth-db', 4.2, queryEndedAt - 4.2, queryEndedAt);
  request.scannerTiming.recordDatabase('verify-scan-count-db', 2.1, queryEndedAt - 2.1, queryEndedAt);
  request.scannerTiming.recordPhase('checkin-transaction', 7.8);
  response.json({ success: true });

  assert.deepEqual(responseBody, { success: true });
  assert.match(headers['Server-Timing'], /scanner-backend;dur=\d+\.\d/);
  assert.match(headers['Server-Timing'], /scanner-app;dur=\d+\.\d/);
  assert.match(headers['Server-Timing'], /scanner-mongo;dur=4\.2/);
  assert.match(headers['Server-Timing'], /scanner-mongo-query-sum;dur=6\.3/);
  assert.match(headers['Server-Timing'], /scanner-auth-db;dur=4\.2/);
  assert.match(headers['Server-Timing'], /verify-scan-count-db;dur=2\.1/);
  assert.match(headers['Server-Timing'], /checkin-transaction;dur=7\.8/);
});
