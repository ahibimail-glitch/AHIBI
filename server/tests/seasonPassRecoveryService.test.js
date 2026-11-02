const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const SERVER = path.resolve(__dirname, '..');
const reservationId = `nsp_${'a'.repeat(40)}`;
const partnerOrderId = 'nusc-order-11111111-1111-4111-8111-111111111111';
const memberNumber = 'NUSC12345678';
const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const adminId = '000000000000000000000002';
const oldReservationId = `nsp_${'c'.repeat(40)}`;

function objectId(number) {
  return Number(number).toString(16).padStart(24, '0');
}

function query(value) {
  return {
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean() { return Promise.resolve(value); },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}

function makeRecoveryHarness(options = {}) {
  const eventIds = Array.from({ length: 10 }, (_, index) => objectId(index + 101));
  const matchDates = ['2026-11-14', '2026-11-30', '2026-12-15', '2026-12-19', '2027-01-04', '2027-01-09', '2027-01-16', '2027-02-06', '2027-03-13', '2027-03-20'];
  const fixtures = eventIds.map((eventId, index) => ({ eventId, matchDate: matchDates[index], matchIndex: index + 1, ticketType: 'Premium Pass' }));
  const reservation = {
    reservationId,
    partnerOrderId,
    memberReferenceHash: 'opaque-hash',
    status: 'issued',
    paymentId: 'pay_test_reference',
    passId: 'premium-season',
    ticketType: 'Premium Pass',
    zone: null,
    eventIds,
    matchDates,
    bookingIds: [],
    ...(options.replacement && { replacesReservationId: oldReservationId }),
  };
  const oldReservation = options.replacement ? {
    reservationId: oldReservationId,
    partnerOrderId: 'nusc-original-general-order',
    memberReferenceHash: reservation.memberReferenceHash,
    passId: 'general-season',
    ticketType: 'General Pass',
    status: 'replaced',
    replacedByReservationId: reservationId,
    eventIds: [...eventIds],
    matchDates: [...matchDates],
    bookingIds: Array.from({ length: 10 }, (_, index) => objectId(index + 701)),
  } : null;
  const makeBooking = (index, overrides = {}) => ({
    _id: objectId(index + 1),
    event: eventIds[index],
    status: 'confirmed',
    paymentStatus: 'completed',
    paymentProvider: 'nusc-partner',
    externalPaymentId: reservation.paymentId,
    entryVerified: false,
    ticketType: 'Premium Pass',
    nuscGeneralZone: undefined,
    nuscSeasonMatchIndex: index + 1,
    nuscPartnerTicket: {
      partnerId: 'nusc',
      memberReferenceHash: reservation.memberReferenceHash,
      partnerOrderId,
      reservationId,
      ticketIndex: index + 1,
    },
    ...overrides,
  });
  const replacementOriginalBookings = options.replacement ? [0, 1].map((index) => ({
    ...makeBooking(index),
    _id: objectId(index + 701),
    ticketType: 'General Pass',
    nuscPartnerTicket: {
      partnerId: 'nusc',
      memberReferenceHash: reservation.memberReferenceHash,
      partnerOrderId: oldReservation.partnerOrderId,
      reservationId: oldReservationId,
      ticketIndex: index + 1,
    },
  })) : [];
  const bookings = [
    ...Array.from({ length: 10 }, (_, index) => makeBooking(index))
      .filter((_, index) => !options.missingIndices?.includes(index + 1) && !(options.replacement && index < 2)),
    ...replacementOriginalBookings,
  ];
  if (options.mismatchedIndex) bookings[options.mismatchedIndex - 1].nuscPartnerTicket.reservationId = 'stale-reservation-reference';
  reservation.bookingIds = bookings.map(booking => booking._id);
  const current = { reservation };
  const issuerCalls = [];
  const syncCalls = [];
  const replacementCalls = [];
  const replacementAudits = [];
  let partialFailure = Boolean(options.partialFailure);

  const Booking = {
    find(filter) {
      const orderClause = filter.$or?.find(clause => clause['nuscPartnerTicket.partnerOrderId']);
      const idsClause = filter.$or?.find(clause => clause._id?.$in);
      let found = bookings;
      if (orderClause) found = found.filter(booking => booking.nuscPartnerTicket.partnerOrderId === orderClause['nuscPartnerTicket.partnerOrderId']);
      if (idsClause) {
        const ids = new Set(idsClause._id.$in.map(String));
        found = [...new Map([...found, ...bookings.filter(booking => ids.has(String(booking._id)))].map(item => [String(item._id), item])).values()];
      }
      return query(found);
    },
    async updateOne(filter, update) {
      const booking = bookings.find(item => String(item._id) === String(filter._id));
      if (!booking || booking.status !== filter.status || booking.paymentStatus !== filter.paymentStatus) return { modifiedCount: 0 };
      booking.nuscPartnerTicket.reservationId = update.$set['nuscPartnerTicket.reservationId'];
      return { modifiedCount: 1 };
    },
  };
  const Scan = {
    findOne() { return query(null); },
    find() { return query(options.replacement ? [0, 1].map((index) => ({
      ticket: objectId(index + 701), event: eventIds[index], partnerId: 'nusc',
    })) : []); },
  };
  const Inventory = {
    FIXTURE_MATCHES: matchDates.map((date, index) => ({ date, opponent: `Opponent ${index + 1}` })),
    FIXTURE_DATES: matchDates,
    async getPartnerSeasonPassReservation(id) {
      return id === oldReservationId ? oldReservation : reservation;
    },
    async beginPartnerAdminTicketRecovery(input) {
      const recovery = reservation.adminTicketRecovery || {};
      if (recovery.status === 'completed' && recovery.requestId === input.requestId) return { reservation, alreadyCompleted: true };
      if (recovery.status === 'processing' && recovery.requestId === input.requestId) return { reservation, alreadyProcessing: true };
      reservation.adminTicketRecovery = {
        requestId: input.requestId, status: 'processing', startedAt: new Date(), recoveredMatchIndices: [], relinkedMatchIndices: [],
      };
      return { reservation, alreadyProcessing: false };
    },
    async recordPartnerAdminTicketRecoveryProgress(input) {
      const state = reservation.adminTicketRecovery;
      state.recoveredMatchIndices = [...new Set([...state.recoveredMatchIndices, ...(input.recoveredMatchIndices || [])])].sort((a, b) => a - b);
      state.relinkedMatchIndices = [...new Set([...state.relinkedMatchIndices, ...(input.relinkedMatchIndices || [])])].sort((a, b) => a - b);
      return reservation;
    },
    async completePartnerAdminTicketRecovery(input) {
      reservation.adminTicketRecovery = {
        requestId: input.requestId,
        status: input.manualIntervention ? 'manual_intervention' : 'completed',
        recoveredMatchIndices: input.recoveredMatchIndices || [],
        relinkedMatchIndices: input.relinkedMatchIndices || [],
      };
      if (!input.manualIntervention) reservation.bookingIds = input.bookingIds;
      return reservation;
    },
    async recordPartnerReplacementAdminTicketRecovery(input) {
      replacementAudits.push(input);
      return reservation;
    },
  };
  const riseOrder = {
    orderId: '11111111-1111-4111-8111-111111111111',
    kind: 'paid',
    status: 'paid',
    passId: 'premium-season',
    ticketType: 'Premium Pass',
    settlementType: 'paid',
    ahibiStatus: options.needsReconciliation ? 'needs_reconciliation' : 'issued',
    reservationId,
    partnerOrderId,
    tickets: eventIds.map((eventId, index) => ({
      matchIndex: index + 1,
      eventId,
      ticketId: options.missingIndices?.includes(index + 1) ? objectId(index + 301) : objectId(index + 1),
    })),
  };
  const nuscRise = {
    async searchRiseRecoveryOrders(queryText) {
      assert.equal(queryText, memberNumber);
      return { members: [{ memberNumber, name: 'Test Member', orders: [riseOrder] }] };
    },
    async syncRiseRecoveryTickets(payload) {
      syncCalls.push(payload);
      return { status: 'synced' };
    },
  };
  const issuer = {
    async createSeasonPassTicketRecords(input) {
      issuerCalls.push(input);
      const newlyCreated = [];
      for (const fixture of input.fixtures) {
        let existing = bookings.find(booking => booking.nuscPartnerTicket.partnerOrderId === input.orderId
          && booking.nuscPartnerTicket.ticketIndex === fixture.matchIndex);
        if (!existing) {
          existing = makeBooking(fixture.matchIndex - 1);
          existing._id = objectId(bookings.length + 500);
          existing.nuscPartnerTicket.reservationId = input.reservationId;
          bookings.push(existing);
          newlyCreated.push(existing);
        }
        if (partialFailure && newlyCreated.length === 1) {
          partialFailure = false;
          throw new Error('simulated partial issuance');
        }
      }
      return { bookings: newlyCreated, bookingIds: newlyCreated.map(item => item._id) };
    },
  };
  const replacementService = {
    ReplacementError: class ReplacementError extends Error {},
    async recoverMissingGeneralReplacementTickets(input) {
      replacementCalls.push(input);
      if (options.replacementError) {
        const error = new Error(options.replacementError);
        error.name = 'ReplacementError';
        error.code = options.replacementError;
        error.status = 409;
        throw error;
      }
      const recoveredMatchIndices = options.missingIndices || [1, 2];
      const issuedBookingIds = [];
      for (const index of recoveredMatchIndices) {
        let existing = bookings.find((booking) => booking.nuscPartnerTicket.reservationId === reservationId &&
          booking.nuscPartnerTicket.ticketIndex === index);
        if (!existing) {
          existing = makeBooking(index - 1);
          existing._id = objectId(bookings.length + 500);
          bookings.push(existing);
        }
        issuedBookingIds.push(existing._id);
      }
      const alreadyIssued = Boolean(reservation.recoveryStatus === 'issued');
      reservation.bookingIds = Array.from({ length: 10 }, (_, offset) => {
        const index = offset + 1;
        return index < 3
          ? replacementOriginalBookings[index - 1]._id
          : bookings.find((booking) => booking.nuscPartnerTicket.reservationId === reservationId &&
            booking.nuscPartnerTicket.ticketIndex === index)?._id;
      });
      reservation.recoveryStatus = 'issued';
      return {
        reservation,
        issuedBookingIds,
        recoveredMatchIndices: alreadyIssued ? [] : recoveredMatchIndices,
        relinkedMatchIndices: [1, 2],
        alreadyIssued,
      };
    },
  };
  const modules = [
    ['models/Booking', Booking],
    ['models/Event', { find() { return query([]); } }],
    ['models/ManualSeasonPassOrder', {}],
    ['models/NuscHomeMatchOrder', {}],
    ['models/PaymentTransaction', { async updateOne() {} }],
    ['models/Scan', Scan],
    ['services/nuscHomeMatchInventoryService', Inventory],
    ['services/nuscRiseIntegrationClient', nuscRise],
    ['services/nuscSeasonPassBookingService', issuer],
    ['services/nuscSeasonPassReplacementService', replacementService],
  ];
  const originals = new Map();
  for (const [relative, exports] of modules) {
    const filename = require.resolve(path.join(SERVER, relative));
    originals.set(filename, require.cache[filename]);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
  }
  const servicePath = require.resolve(path.join(SERVER, 'services/seasonPassRecoveryService'));
  originals.set(servicePath, require.cache[servicePath]);
  delete require.cache[servicePath];
  const service = require(servicePath);
  return {
    service, reservation, oldReservation, riseOrder, bookings, issuerCalls, syncCalls, replacementCalls, replacementAudits,
    async recover(id = requestId) {
      return service.recoverRiseSeasonPass({ orderId: riseOrder.orderId, memberNumber, requestId: id, adminId });
    },
    restore() {
      for (const [filename, cached] of originals) {
        if (cached) require.cache[filename] = cached;
        else delete require.cache[filename];
      }
    },
  };
}

function makeAhibiRecoveryHarness(kind, missingIndex) {
  const eventIds = Array.from({ length: 10 }, (_, index) => objectId(index + 201));
  const matchDates = ['2026-11-14', '2026-11-30', '2026-12-15', '2026-12-19', '2027-01-04', '2027-01-09', '2027-01-16', '2027-02-06', '2027-03-13', '2027-03-20'];
  const fixtures = eventIds.map((eventId, index) => ({
    eventId,
    matchDate: matchDates[index],
    matchIndex: index + 1,
    ticketType: 'Premium Pass',
    opponent: `Opponent ${index + 1}`,
  }));
  const events = fixtures.map((fixture, index) => ({
    _id: fixture.eventId,
    slug: `nusc-home-match-${fixture.matchDate.replace(/-/g, '')}`,
    title: `NUSC vs Opponent ${index + 1}`,
  }));
  const userId = objectId(88);
  const orderId = kind === 'manual' ? 'manual-pass-recovery-1' : 'online-pass-recovery-1';
  const order = kind === 'manual' ? {
    orderId, user: userId, status: 'issued', passId: 'premium-season', ticketType: 'Premium Pass', zone: null,
    listAmountMinor: 324000, settledAmountMinor: 324000, settlementType: 'paid', modeOfPayment: 'UPI',
    settlementHash: 'existing-settlement-hash', bookingIds: [], operationsAudit: [],
    async save() { this.saveCount = (this.saveCount || 0) + 1; },
  } : {
    orderId, orderType: 'seasonPass', user: userId, status: 'completed', passId: 'premium-season',
    paymentId: 'pay_existing_capture', amountMinor: 324000, bookingIds: [], operationsAudit: [],
    bookingDetails: { passId: 'premium-season', ticketType: 'Premium Pass', zone: null, fixtures },
  };
  const makeBooking = (fixture) => ({
    _id: objectId(400 + fixture.matchIndex),
    user: userId,
    event: fixture.eventId,
    status: 'confirmed',
    paymentStatus: 'completed',
    entryVerified: false,
    ticketType: fixture.ticketType,
    nuscSeasonPassType: 'premium-season',
    nuscSeasonMatchIndex: fixture.matchIndex,
    ...(kind === 'manual' ? {
      manualSeasonPassOrderId: orderId,
      manualSeasonPassMatchIndex: fixture.matchIndex,
      manualSeasonPassSettlementType: 'paid',
      paymentProvider: 'manual',
    } : {
      nuscOrderId: orderId,
      externalPaymentId: order.paymentId,
      paymentProvider: 'razorpay',
    }),
  });
  const bookings = fixtures.filter((fixture) => fixture.matchIndex !== missingIndex).map(makeBooking);
  order.bookingIds = bookings.map((booking) => booking._id);
  const calls = { issuer: [], reserve: 0, stock: 0, paymentLink: 0 };
  const Booking = {
    find(filter) {
      const primary = filter.$or?.[0] || {};
      const ids = new Set((filter.$or?.[1]?._id?.$in || []).map(String));
      const values = bookings.filter((booking) => (
        (primary.manualSeasonPassOrderId && booking.manualSeasonPassOrderId === primary.manualSeasonPassOrderId) ||
        (primary.nuscOrderId && booking.nuscOrderId === primary.nuscOrderId) ||
        ids.has(String(booking._id))
      ));
      return query(values);
    },
  };
  const Inventory = {
    FIXTURE_MATCHES: matchDates.map((date, index) => ({ date, opponent: `Opponent ${index + 1}` })),
    FIXTURE_DATES: matchDates,
    async markSeasonPassStockApplied() { calls.stock += 1; },
    async reserveSeasonPassOrder() { calls.reserve += 1; throw new Error('recovery must not reserve inventory again'); },
  };
  const issuer = {
    async createSeasonPassTicketRecords(input) {
      calls.issuer.push(input);
      const added = [];
      for (const fixture of input.fixtures) {
        const existing = bookings.find((booking) => kind === 'manual'
          ? booking.manualSeasonPassMatchIndex === fixture.matchIndex
          : booking.nuscSeasonMatchIndex === fixture.matchIndex);
        if (!existing) {
          const booking = makeBooking(fixture);
          bookings.push(booking);
          added.push(booking);
        }
      }
      return { bookings: added, bookingIds: added.map((booking) => booking._id) };
    },
  };
  const modules = [
    ['models/Booking', Booking],
    ['models/Event', { find: async () => events }],
    ['models/ManualSeasonPassOrder', {
      findOne: async () => order,
      async findOneAndUpdate(_filter, update) { if (order.adminTicketReissue?.status === 'processing') return null; order.adminTicketReissue = update.$set.adminTicketReissue; return order; },
      async updateOne(_filter, update) { for (const [path, value] of Object.entries(update.$set || {})) { const [root, field, leaf] = path.split('.'); order[root] ||= {}; if (leaf) { order[root][field] ||= {}; order[root][field][leaf] = value; } else order[root][field] = value; } },
    }],
    ['models/NuscHomeMatchOrder', {
      findOne: async () => order,
      async findOneAndUpdate(_filter, update) { if (order.adminTicketReissue?.status === 'processing') return null; order.adminTicketReissue = update.$set.adminTicketReissue; return order; },
      async updateOne(_filter, update) {
        for (const [path, value] of Object.entries(update.$set || {})) {
          const parts = path.split('.');
          const last = parts.pop();
          const parent = parts.reduce((current, key) => (current[key] ||= {}), order);
          parent[last] = value;
        }
        Object.assign(order, Object.fromEntries(Object.entries(update.$set || {}).filter(([path]) => !path.includes('.'))));
      },
    }],
    ['models/PaymentTransaction', { async updateOne() { calls.paymentLink += 1; } }],
    ['models/Scan', { findOne() { return query(null); } }],
    ['services/nuscHomeMatchInventoryService', Inventory],
    ['services/nuscRiseIntegrationClient', {}],
    ['services/nuscSeasonPassBookingService', issuer],
  ];
  const originals = new Map();
  for (const [relative, exports] of modules) {
    const filename = require.resolve(path.join(SERVER, relative));
    originals.set(filename, require.cache[filename]);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
  }
  const servicePath = require.resolve(path.join(SERVER, 'services/seasonPassRecoveryService'));
  originals.set(servicePath, require.cache[servicePath]);
  delete require.cache[servicePath];
  const service = require(servicePath);
  return {
    service, order, bookings, calls,
    async recover() { return service.recoverAhibiSeasonPass({ kind, orderId, requestId, adminId }); },
    restore() {
      for (const [filename, cached] of originals) {
        if (cached) require.cache[filename] = cached;
        else delete require.cache[filename];
      }
    },
  };
}

test('missing AHIBI booking is reissued at its original match index and synced to the NUSC dashboard', async () => {
  const harness = makeRecoveryHarness({ missingIndices: [5] });
  try {
    const result = await harness.recover();
    assert.equal(result.result.status, 'recovered');
    assert.deepEqual(result.result.recoveredMatchIndices, [5]);
    assert.equal(harness.issuerCalls.length, 1);
    assert.deepEqual(harness.issuerCalls[0].fixtures.map(fixture => fixture.matchIndex), [5]);
    assert.equal(harness.reservation.bookingIds.length, 10);
    assert.equal(harness.syncCalls.length, 1);
    assert.equal(harness.syncCalls[0].tickets.length, 10);
    assert.equal(harness.syncCalls[0].tickets[4].status, 'confirmed');
  } finally { harness.restore(); }
});

test('a mismatched but unused partner reservation reference is repaired without reissuing', async () => {
  const harness = makeRecoveryHarness({ mismatchedIndex: 3 });
  try {
    const result = await harness.recover();
    assert.deepEqual(result.result.relinkedMatchIndices, [3]);
    assert.equal(harness.issuerCalls.length, 0);
    assert.equal(harness.bookings[2].nuscPartnerTicket.reservationId, reservationId);
    assert.equal(harness.syncCalls.length, 1);
  } finally { harness.restore(); }
});

test('partial issuance retries the same pass and records both recovered matches', async () => {
  const harness = makeRecoveryHarness({ missingIndices: [4, 8], partialFailure: true });
  try {
    await assert.rejects(harness.recover(), /simulated partial issuance/);
    assert.deepEqual(harness.reservation.adminTicketRecovery.recoveredMatchIndices, [4]);
    const retry = await harness.recover();
    assert.equal(retry.result.status, 'recovered');
    assert.deepEqual(retry.result.recoveredMatchIndices, [4, 8]);
    assert.equal(harness.reservation.bookingIds.length, 10);
    assert.equal(harness.syncCalls.length, 1);
  } finally { harness.restore(); }
});

test('paid RISE passes marked needs_reconciliation can be completed from their issued reservation', async () => {
  const harness = makeRecoveryHarness({ needsReconciliation: true, missingIndices: [9] });
  try {
    const result = await harness.recover();
    assert.deepEqual(result.result.recoveredMatchIndices, [9]);
    assert.equal(harness.issuerCalls.length, 1);
    assert.equal(harness.reservation.status, 'issued');
    assert.equal(harness.syncCalls.length, 1);
  } finally { harness.restore(); }
});

test('duplicate recovery request is idempotent and does not issue a second ticket set', async () => {
  const harness = makeRecoveryHarness({ missingIndices: [6] });
  try {
    await harness.recover();
    const retry = await harness.recover();
    assert.equal(retry.result.status, 'already_recovered');
    assert.equal(harness.issuerCalls.length, 1);
    assert.equal(harness.syncCalls.length, 2);
  } finally { harness.restore(); }
});

test('RISE Premium replacement recovery syncs two used General references and all eight Premium tickets', async () => {
  const harness = makeRecoveryHarness({ replacement: true, missingIndices: [3, 4, 5, 6, 7, 8, 9, 10] });
  try {
    const result = await harness.recover();
    assert.equal(result.result.status, 'recovered');
    assert.deepEqual(result.result.recoveredMatchIndices, [3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(result.result.relinkedMatchIndices, [1, 2]);
    assert.deepEqual(harness.replacementCalls, [{
      premiumReservationId: reservationId,
      oldReservationId,
      paymentId: 'pay_test_reference',
    }]);
    assert.equal(harness.issuerCalls.length, 0, 'Admin must not create a second replacement issuance path');
    assert.equal(harness.bookings.length, 10);
    assert.equal(harness.syncCalls.length, 1);
    assert.equal(harness.syncCalls[0].tickets.length, 10);
    assert.equal(harness.syncCalls[0].tickets[0].status, 'used');
    assert.ok(harness.syncCalls[0].tickets[0].ticketAccessPath.includes(oldReservationId));
    assert.equal(harness.syncCalls[0].tickets[2].status, 'confirmed');
    assert.equal(harness.replacementAudits[0].action, 'recovered');
    assert.deepEqual(harness.replacementAudits[0].details.recoveredMatchIndices, [3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(harness.replacementAudits[0].details.relinkedMatchIndices, [1, 2]);
  } finally { harness.restore(); }
});

test('repeated Admin recovery reuses the idempotent replacement workflow and does not create duplicate tickets', async () => {
  const harness = makeRecoveryHarness({ replacement: true, missingIndices: [3, 4, 5, 6, 7, 8, 9, 10] });
  try {
    await harness.recover();
    const retry = await harness.recover();
    assert.equal(retry.result.status, 'already_recovered');
    assert.equal(harness.replacementCalls.length, 2);
    assert.equal(harness.bookings.length, 10);
    assert.equal(harness.issuerCalls.length, 0);
    assert.equal(harness.syncCalls.length, 2);
  } finally { harness.restore(); }
});

test('a mismatched RISE payment reference stays in manual review before recovery starts', async () => {
  const harness = makeRecoveryHarness({ replacement: true });
  harness.riseOrder.paymentId = 'different-payment-reference';
  try {
    await assert.rejects(harness.recover(), (error) => (
      error.status === 409 && error.code === 'REPLACEMENT_MANUAL_REVIEW' && /payment reference/.test(error.message)
    ));
    assert.equal(harness.replacementCalls.length, 0);
    assert.equal(harness.issuerCalls.length, 0);
    assert.equal(harness.syncCalls.length, 0);
  } finally { harness.restore(); }
});

test('a refunded Premium order is never synchronized or reissued', async () => {
  const harness = makeRecoveryHarness({ replacement: true });
  harness.riseOrder.status = 'refunded';
  try {
    await assert.rejects(harness.recover(), (error) => (
      error.status === 409 && error.code === 'REPLACEMENT_MANUAL_REVIEW' && /payment as refunded/.test(error.message)
    ));
    assert.equal(harness.replacementCalls.length, 0);
    assert.equal(harness.issuerCalls.length, 0);
    assert.equal(harness.syncCalls.length, 0);
  } finally { harness.restore(); }
});

test('inconsistent replacement ticket state returns manual review without using Admin issuance', async () => {
  const harness = makeRecoveryHarness({ replacement: true, missingIndices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], replacementError: 'RECOVERY_NOT_APPLICABLE' });
  try {
    await assert.rejects(harness.recover(), error => (
      error.status === 409 && error.code === 'REPLACEMENT_MANUAL_REVIEW' && /recorded match set/.test(error.message)
    ));
    assert.equal(harness.replacementCalls.length, 1);
    assert.equal(harness.issuerCalls.length, 0);
    assert.equal(harness.syncCalls.length, 0);
    assert.equal(harness.replacementAudits[0].action, 'manual_intervention');
  } finally { harness.restore(); }
});

test('checked-in partner ticket with a stale reservation reference is held for review', async () => {
  const harness = makeRecoveryHarness({ mismatchedIndex: 3 });
  harness.bookings[2].status = 'checked-in';
  harness.bookings[2].entryVerified = true;
  try {
    await assert.rejects(harness.recover(), error => error.code === 'CHECKED_IN_REFERENCE_MISMATCH');
    assert.equal(harness.issuerCalls.length, 0);
    assert.equal(harness.syncCalls.length, 0);
    assert.equal(harness.reservation.adminTicketRecovery.status, 'manual_intervention');
  } finally { harness.restore(); }
});

test('a refunded ticket remains invalid even if its old scan metadata says checked in', async () => {
  const harness = makeRecoveryHarness({ missingIndices: [4] });
  harness.bookings[0].status = 'refunded';
  harness.bookings[0].paymentStatus = 'refunded';
  harness.bookings[0].entryVerified = true;
  try {
    await assert.rejects(harness.recover(), error => error.code === 'INVALID_TICKET_STATE');
    assert.equal(harness.issuerCalls.length, 0);
    assert.equal(harness.syncCalls.length, 0);
  } finally { harness.restore(); }
});

test('duplicate active partner tickets stop recovery before issuance', async () => {
  const harness = makeRecoveryHarness({ missingIndices: [7] });
  harness.bookings.push({ ...harness.bookings[0], _id: objectId(999) });
  try {
    await assert.rejects(harness.recover(), error => error.code === 'DUPLICATE_VALID_TICKETS');
    assert.equal(harness.issuerCalls.length, 0);
    assert.equal(harness.syncCalls.length, 0);
  } finally { harness.restore(); }
});

test('AHIBI manual pass reissues one missing match without reserving inventory or changing settlement', async () => {
  const harness = makeAhibiRecoveryHarness('manual', 6);
  try {
    const result = await harness.recover();
    assert.deepEqual(result.result.recoveredMatchIndices, [6]);
    assert.equal(harness.calls.issuer.length, 1);
    assert.deepEqual(harness.calls.issuer[0].fixtures.map((fixture) => fixture.matchIndex), [6]);
    assert.equal(harness.calls.issuer[0].paymentProvider, 'manual');
    assert.equal(harness.calls.issuer[0].settlementType, 'paid');
    assert.equal(harness.order.settledAmountMinor, 324000);
    assert.equal(harness.order.status, 'issued');
    assert.equal(harness.order.bookingIds.length, 10);
    assert.equal(harness.calls.reserve, 0);
    assert.equal(harness.calls.stock, 1);
  } finally { harness.restore(); }
});

test('AHIBI online pass reissues a missing ticket under its original payment and repairs payment links', async () => {
  const harness = makeAhibiRecoveryHarness('online', 2);
  try {
    const result = await harness.recover();
    assert.deepEqual(result.result.recoveredMatchIndices, [2]);
    assert.equal(harness.calls.issuer.length, 1);
    assert.equal(harness.calls.issuer[0].paymentId, 'pay_existing_capture');
    assert.equal(harness.calls.issuer[0].paymentProvider, 'razorpay');
    assert.equal(harness.order.bookingIds.length, 10);
    assert.equal(harness.calls.paymentLink, 1);
    assert.equal(harness.calls.reserve, 0);
  } finally { harness.restore(); }
});

test('AHIBI booking ID pointing at a different order is held for manual review', async () => {
  const harness = makeAhibiRecoveryHarness('manual', 6);
  harness.bookings[0].manualSeasonPassOrderId = 'some-other-pass';
  try {
    await assert.rejects(harness.recover(), error => error.code === 'TICKET_ORDER_MISMATCH');
    assert.equal(harness.calls.issuer.length, 0);
    assert.equal(harness.calls.reserve, 0);
    assert.equal(harness.order.operationsAudit.at(-1).action, 'ticket_recovery_blocked');
  } finally { harness.restore(); }
});
