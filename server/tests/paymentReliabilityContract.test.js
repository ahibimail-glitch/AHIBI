const test = require('node:test');
const assert = require('node:assert/strict');
const Booking = require('../models/Booking');
const PendingPaymentSession = require('../models/PendingPaymentSession');
const AdminNotification = require('../models/AdminNotification');
const {
  PaymentSettlementError,
  expandPaymentTicketUnits,
} = require('../services/eventPaymentSettlementService');
const { createGracefulShutdown } = require('../services/gracefulShutdownService');

test('captured payment expands to the exact stable ticket set', () => {
  const input = [
    { ticketType: 'General', ticketTypeId: 'general-id', quantity: 2, price: 500 },
    { ticketType: 'VIP', ticketTypeId: 'vip-id', quantity: 1, price: 1200, selectedDate: '2026-11-01' },
  ];
  const tickets = expandPaymentTicketUnits(input, 'pay_test_123');

  assert.equal(tickets.length, 3);
  assert.deepEqual(tickets.map((ticket) => ticket.key), [
    'pay_test_123:1',
    'pay_test_123:2',
    'pay_test_123:3',
  ]);
  assert.deepEqual(tickets.map((ticket) => ticket.ticketType), ['General', 'General', 'VIP']);
  assert.deepEqual(expandPaymentTicketUnits(input, 'pay_test_123'), tickets, 'retries must derive the same keys and counts');
});

test('invalid or excessive saved quantities fail before ticket writes', () => {
  for (const invalidTickets of [
    [],
    [{ ticketType: 'General', ticketTypeId: 'general-id', quantity: 0, price: 500 }],
    [{ ticketType: 'General', ticketTypeId: 'general-id', quantity: 1.5, price: 500 }],
    [{ ticketType: 'General', ticketTypeId: 'general-id', quantity: 11, price: 500 }],
  ]) {
    assert.throws(
      () => expandPaymentTicketUnits(invalidTickets, 'pay_test_123'),
      (error) => error instanceof PaymentSettlementError && error.code === 'INVALID_SAVED_TICKETS',
    );
  }
});

test('database schemas declare unique guards for ticket and alert idempotency', () => {
  assert.ok(Booking.schema.indexes().some(([fields, options]) => (
    fields.paymentTicketKey === 1 &&
    options.unique === true &&
    options.partialFilterExpression?.paymentTicketKey?.$type === 'string'
  )));
  assert.ok(PendingPaymentSession.schema.indexes().some(([fields, options]) => (
    fields.orderIntentId === 1 &&
    options.unique === true &&
    options.partialFilterExpression?.orderIntentId?.$type === 'string'
  )));
  assert.ok(AdminNotification.schema.indexes().some(([fields, options]) => (
    fields['metadata.dedupeKey'] === 1 &&
    options.unique === true &&
    options.partialFilterExpression?.['metadata.dedupeKey']?.$type === 'string'
  )));
});

test('graceful shutdown marks draining, stops accepting, drains jobs, then closes Mongo', async () => {
  const calls = [];
  let completeServerClose;
  const lifecycle = createGracefulShutdown({
    server: {
      listening: true,
      close(callback) {
        calls.push('server.close');
        completeServerClose = callback;
      },
    },
    socketServer: {
      disconnectSockets(force) {
        calls.push(`sockets.disconnect:${force}`);
      },
    },
    stopBackgroundJobs: async () => { calls.push('jobs.stop'); },
    disconnectDatabase: async () => { calls.push('database.disconnect'); },
    logger: { log() {}, error() {} },
  });

  const shutdown = lifecycle.shutdown('SIGTERM');
  assert.equal(lifecycle.isDraining(), true);
  await Promise.resolve();
  assert.ok(calls.includes('server.close'));
  assert.ok(calls.includes('sockets.disconnect:true'));
  assert.ok(calls.includes('jobs.stop'));
  assert.equal(calls.includes('database.disconnect'), false);

  completeServerClose();
  await shutdown;
  assert.equal(calls.at(-1), 'database.disconnect');
});
