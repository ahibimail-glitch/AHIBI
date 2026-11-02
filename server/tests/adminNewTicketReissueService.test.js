const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminNewTicketReissueService } = require('../services/adminNewTicketReissueService');

const memberNumber = 'NUSC12345678';
const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const adminId = '000000000000000000000002';

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

function getPath(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value);
}

function setPath(value, path, next) {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce((current, key) => (current[key] ||= {}), value);
  parent[last] = next;
}

function makeHarness(options = {}) {
  const dates = ['2026-11-14', '2026-11-30', '2026-12-15', '2026-12-19', '2027-01-04', '2027-01-09', '2027-01-16', '2027-02-06', '2027-03-13', '2027-03-20'];
  const eventIds = dates.map((_, index) => objectId(index + 1001));
  const premiumIds = dates.map((_, index) => objectId(index + 2001));
  const generalIds = dates.map((_, index) => objectId(index + 3001));
  const eligible = options.replacement ? (options.eligibleIndices || dates.map((_, index) => index + 1)) : dates.map((_, index) => index + 1);
  const reservationId = 'nsp_' + 'a'.repeat(40);
  const oldReservationId = 'nsp_' + 'b'.repeat(40);
  const partnerOrderId = 'nusc-order-11111111-1111-4111-8111-111111111111';
  const activeOtherBookings = [];
  const bookings = [];
  const capacity = 100;
  const events = dates.map((date, index) => ({
    _id: eventIds[index],
    slug: `nusc-home-match-${date.replace(/-/g, '')}`,
    title: `NUSC vs Opponent ${index + 1}`,
    location: { address: 'Ground', city: 'City' },
    startDate: new Date(`${date}T18:00:00Z`),
    endDate: new Date(`${date}T21:00:00Z`),
    ticketTypes: [{ name: 'Premium Pass', quantity: capacity, sold: options.sold?.[index] ?? 0 }],
  }));
  const reservation = {
    reservationId,
    partnerOrderId,
    memberReferenceHash: 'a'.repeat(64),
    status: 'issued',
    paymentId: 'nusc-payment-authoritative-123',
    passId: 'premium-season',
    ticketType: 'Premium Pass',
    zone: null,
    eventIds,
    matchDates: dates,
    bookingIds: [...premiumIds],
    ...(options.replacement && {
      replacesReservationId: oldReservationId,
      recoveryStatus: 'issued',
      replacementMatchIndices: [...eligible],
      replacementUsedTicketCount: 10 - eligible.length,
      replacementCancelledTicketCount: eligible.length,
    }),
  };
  const oldReservation = options.replacement ? {
    reservationId: oldReservationId,
    partnerOrderId: 'nusc-order-general-original',
    memberReferenceHash: reservation.memberReferenceHash,
    passId: 'general-season',
    ticketType: 'General Pass',
    status: 'replaced',
    replacedByReservationId: reservationId,
    eventIds: [...eventIds],
    matchDates: [...dates],
    bookingIds: [...generalIds],
  } : null;
  const addBooking = (index, values = {}) => {
    const row = {
      _id: objectId(4001 + bookings.length),
      event: eventIds[index],
      status: 'confirmed',
      paymentStatus: 'completed',
      paymentProvider: 'nusc-partner',
      externalPaymentId: reservation.paymentId,
      entryVerified: false,
      ticketType: 'Premium Pass',
      nuscSeasonPassType: 'premium-season',
      nuscSeasonMatchIndex: index + 1,
      nuscPartnerTicket: {
        partnerId: 'nusc',
        memberReferenceHash: reservation.memberReferenceHash,
        partnerOrderId,
        reservationId,
        ticketIndex: index + 1,
      },
      ...values,
    };
    bookings.push(row);
    return row;
  };

  for (const index of options.activeMatches || []) {
    const row = addBooking(index - 1, { _id: premiumIds[index - 1], status: index === 1 ? 'checked-in' : 'confirmed' });
    if (row.status === 'checked-in') row.entryVerified = true;
  }
  for (const index of options.cancelledMatches || []) {
    addBooking(index - 1, { _id: premiumIds[index - 1], status: 'cancelled' });
  }
  for (let index = 0; index < 18; index += 1) {
    if (options.smoke && index < 18) {
      activeOtherBookings.push({
        _id: objectId(5001 + index),
        event: eventIds[0],
        status: 'confirmed',
        paymentStatus: 'completed',
        ticketType: 'Premium Pass',
        bookingSource: 'online',
        nuscPartnerTicket: { partnerId: 'nusc', memberReferenceHash: objectId(8001), ticketIndex: 1 },
      });
    }
  }
  if (options.conflictingMember) {
    bookings.push({
      _id: objectId(7001),
      event: eventIds[0],
      status: 'confirmed',
      paymentStatus: 'completed',
      paymentProvider: 'nusc-partner',
      externalPaymentId: 'other-paid-order',
      ticketType: 'Premium Pass',
      nuscSeasonMatchIndex: 1,
      nuscPartnerTicket: { partnerId: 'nusc', memberReferenceHash: reservation.memberReferenceHash, partnerOrderId: 'different-order', reservationId: 'different-reservation', ticketIndex: 1 },
    });
  }
  bookings.push(...activeOtherBookings);

  const signedOrder = {
    orderId: '11111111-1111-4111-8111-111111111111',
    kind: 'paid',
    status: 'paid',
    settlementType: 'paid',
    passId: 'premium-season',
    ticketType: 'Premium Pass',
    reservationId,
    partnerOrderId,
    paymentId: reservation.paymentId,
    tickets: dates.map((date, index) => ({ matchIndex: index + 1, eventId: eventIds[index], ticketId: premiumIds[index], matchDate: date })),
  };
  const inventoryDoc = {
    key: 'nusc-il-2026-27',
    orders: options.hold ? [{ orderId: 'another-active-hold', matchDate: dates[0], status: 'held', expiresAt: new Date(Date.now() + 60 * 60 * 1000), ticketLines: [{ ticketType: 'Premium Pass', quantity: 100 }] }] : [],
    seasonPassOrders: [],
    partnerSeasonPassReservations: [...(oldReservation ? [oldReservation] : []), reservation],
  };
  const scanRows = options.scanMatch ? [{ ticket: premiumIds[options.scanMatch - 1], event: eventIds[options.scanMatch - 1], partnerId: 'nusc' }] : [];
  const held = [];
  const issuerCalls = [];
  const syncCalls = [];
  let syncBehavior = options.syncBehavior || (async () => ({ status: 'synced' }));
  let lock = false;

  const Booking = {
    find(filter = {}) {
      if (Array.isArray(filter.$or)) {
        const found = bookings.filter((booking) => filter.$or.some((clause) => {
          if (clause._id?.$in) return clause._id.$in.some((id) => String(id) === String(booking._id));
          return Object.entries(clause).every(([path, expected]) => String(getPath(booking, path)) === String(expected));
        }));
        return query(found);
      }
      let found = bookings;
      if (filter.event?.$in) found = found.filter((booking) => filter.event.$in.some((id) => String(id) === String(booking.event)));
      if (filter.ticketType) found = found.filter((booking) => booking.ticketType === filter.ticketType || filter.ticketType.$in?.includes(booking.ticketType));
      if (filter.status?.$in) found = found.filter((booking) => filter.status.$in.includes(booking.status));
      if (filter.paymentStatus) found = found.filter((booking) => booking.paymentStatus === filter.paymentStatus);
      if (filter.bookingSource?.$ne) found = found.filter((booking) => booking.bookingSource !== filter.bookingSource.$ne);
      if (filter['nuscPartnerTicket.partnerId']) found = found.filter((booking) => getPath(booking, 'nuscPartnerTicket.partnerId') === filter['nuscPartnerTicket.partnerId']);
      if (filter['nuscPartnerTicket.memberReferenceHash']) found = found.filter((booking) => getPath(booking, 'nuscPartnerTicket.memberReferenceHash') === filter['nuscPartnerTicket.memberReferenceHash']);
      return query(found);
    },
    async updateOne(filter, update) {
      const booking = bookings.find((row) => Object.entries(filter).every(([path, value]) => String(getPath(row, path)) === String(value)));
      if (!booking) return { modifiedCount: 0 };
      for (const [path, value] of Object.entries(update.$set || {})) setPath(booking, path, value);
      for (const path of Object.keys(update.$unset || {})) {
        const parts = path.split('.');
        const last = parts.pop();
        const parent = parts.reduce((current, key) => current?.[key], booking);
        if (parent) delete parent[last];
      }
      return { modifiedCount: 1 };
    },
  };
  const Event = {
    find(filter) {
      const ids = filter._id?.$in || [];
      return query(events.filter((event) => ids.some((id) => String(id) === String(event._id))));
    },
  };
  const Inventory = { findOne: () => query(inventoryDoc) };
  const Scan = {
    find(filter) {
      const refs = filter.ticket?.$in || [];
      const eventFilter = filter.event?.$in || [];
      return query(scanRows.filter((scan) => refs.some((id) => String(id) === String(scan.ticket)) && eventFilter.some((id) => String(id) === String(scan.event))));
    },
  };
  const inventoryService = {
    FIXTURE_MATCHES: dates.map((date, index) => ({ date, opponent: `Opponent ${index + 1}` })),
    TICKET_CAPACITIES: { 'Premium Pass': capacity, 'General Pass': capacity },
    GENERAL_SEATING_AREAS: ['G-1', 'G-2', 'G-3', 'G-4', 'G-5'].map((name) => ({ name, capacity })),
    matchDateFromSlug: (slug) => {
      const match = /^nusc-home-match-(\d{4})(\d{2})(\d{2})$/.exec(slug || '');
      return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
    },
    async claimPartnerSeasonPassReissue({ requestId: id, adminId: actor }) {
      if (lock) return { claimed: false, code: 'RECOVERY_IN_PROGRESS' };
      lock = true;
      reservation.adminTicketRecovery = { requestId: id, admin: actor, status: 'processing', startedAt: new Date() };
      return { claimed: true, reservation };
    },
    async finishPartnerSeasonPassReissue(input) {
      if (!input.manualIntervention) reservation.bookingIds = [...input.bookingIds];
      reservation.adminTicketRecovery = { requestId: input.requestId, admin: input.adminId, status: input.manualIntervention ? 'manual_intervention' : 'completed' };
      reservation.adminTicketRecoveryAudit ||= [];
      const action = input.manualIntervention ? 'manual_intervention' : 'recovered';
      reservation.adminTicketRecoveryAudit.push({ requestId: input.requestId, action, admin: input.adminId, details: input.auditDetails });
      return reservation;
    },
    async updatePartnerSeasonPassReissueSync({ requestId: id, nuscSync }) {
      const entry = reservation.adminTicketRecoveryAudit.find((row) => row.requestId === id && row.action === 'recovered');
      entry.details.nuscSync = nuscSync;
      return reservation;
    },
    async reserveMatchOrder(input) { held.push(input); return input; },
    async releaseMatchOrder(id) { return id; },
    async releaseSeasonPassOrder(id) { return id; },
  };
  const nuscRise = {
    async searchRiseRecoveryOrders(number) {
      assert.equal(number, memberNumber);
      return { members: [{ memberNumber, orders: [signedOrder] }] };
    },
    async syncRiseRecoveryTickets(payload) {
      syncCalls.push(payload);
      return syncBehavior(payload);
    },
  };
  let nextBookingId = 9001;
  const issue = async (input) => {
    issuerCalls.push(input);
    const issued = input.fixtures.map((fixture) => {
      const row = {
        _id: objectId(nextBookingId++),
        event: fixture.eventId,
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentProvider: 'nusc-partner',
        externalPaymentId: reservation.paymentId,
        ticketType: fixture.ticketType,
        nuscSeasonPassType: reservation.passId,
        nuscSeasonMatchIndex: fixture.matchIndex,
        nuscPartnerTicket: {
          partnerId: 'nusc',
          memberReferenceHash: reservation.memberReferenceHash,
          partnerOrderId,
          reservationId,
          ticketIndex: fixture.matchIndex,
        },
        adminTicketReissue: {
          requestId: input.reissueRequestId,
          oldBookingId: input.reissueOldBookingIds[fixture.matchIndex],
          status: 'issued',
        },
      };
      bookings.push(row);
      return row;
    });
    return { bookings: issued, bookingIds: issued.map((row) => row._id) };
  };
  const service = createAdminNewTicketReissueService({
    Booking, Event, Inventory, Scan, inventory: inventoryService, nuscRise, issue,
    now: () => new Date(),
  });
  const input = (overrides = {}) => ({
    channel: 'rise', orderId: signedOrder.orderId, memberNumber, requestId, adminId, ...overrides,
  });
  const evidence = ({ unused = 10, inventory = [] } = {}) => ({
    historicalEvidence: Array.from({ length: unused }, (_, offset) => ({
      matchIndex: offset + 1,
      ticketReference: premiumIds[offset],
      reference: `checkin-archive-match-${String(offset + 1).padStart(2, '0')}`,
      outcome: 'unused',
    })),
    inventoryEvidence: inventory.map((index) => ({
      matchIndex: index,
      ticketReference: premiumIds[index - 1],
      reference: `inventory-backup-fixture-${String(index).padStart(2, '0')}`,
    })),
  });
  return { service, input, evidence, reservation, oldReservation, premiumIds, generalIds, eventIds, dates, events, bookings, activeOtherBookings, held, issuerCalls, syncCalls, Booking, Event, Inventory, Scan, inventoryService, signedOrder, setSyncBehavior: (behavior) => { syncBehavior = behavior; } };
}

test('smoke-test replacement with missing bookings and eight unattributed allocations remains blocked', async () => {
  const sold = [18, 1, 1, 0, 1, 1, 1, 1, 1, 1];
  const h = makeHarness({ replacement: true, smoke: true, sold });
  const preview = await h.service.preview(h.input());
  assert.equal(preview.safe, false);
  assert.equal(preview.lineageVerified, true);
  assert.equal(preview.missingCount, 10);
  assert.equal(preview.reasons.filter((reason) => reason.code === 'CHECKIN_EVIDENCE_REQUIRED').length, 10);
  assert.equal(preview.reasons.filter((reason) => reason.code === 'INVENTORY_EVIDENCE_REQUIRED').length, 8);
  assert.equal(preview.fixtures[0].inventory.soldDelta, 0);
  assert.equal(preview.fixtures[3].inventory.soldDelta, 0);
  await assert.rejects(h.service.reissue(h.input({ evidence: {}, approved: true })), (error) => error.code === 'REISSUE_REQUIRES_REVIEW');
  assert.equal(h.issuerCalls.length, 0);
  assert.equal(h.held.length, 0);
  assert.equal(h.reservation.adminTicketRecovery, undefined);
});

test('missing original General Booking and scan history cannot turn a saved used fixture into proof of use', async () => {
  const h = makeHarness({ replacement: true, eligibleIndices: [1, 2, 3, 4, 5, 6, 7, 8] });
  const preview = await h.service.preview(h.input());
  assert.equal(preview.lineageVerified, true);
  assert.equal(preview.safe, false);
  assert.deepEqual(preview.reasons.filter((reason) => reason.code === 'USED_TICKET_EVIDENCE_MISSING').map((reason) => reason.matchIndex), [9, 10]);
});

test('reissues against the same paid replacement, preserves audit links, and only reserves fixtures without a prior sold unit', async () => {
  const h = makeHarness({ replacement: true, smoke: true, sold: [18, 1, 1, 0, 1, 1, 1, 1, 1, 1] });
  const proof = h.evidence({ inventory: [2, 3, 5, 6, 7, 8, 9, 10] });
  const result = await h.service.reissue(h.input({ evidence: proof, approved: true }));
  assert.equal(result.status, 'reissued');
  assert.equal(result.reissuedMatchIndices.length, 10);
  assert.equal(result.tickets.length, 10);
  assert.equal(new Set(result.tickets.map((ticket) => ticket.bookingId)).size, 10);
  assert.equal(h.issuerCalls.length, 1);
  assert.equal(h.issuerCalls[0].orderId, h.reservation.partnerOrderId);
  assert.equal(h.issuerCalls[0].paymentId, h.reservation.paymentId);
  assert.equal(h.issuerCalls[0].passId, 'premium-season');
  assert.equal(h.issuerCalls[0].reissueRequestId, requestId);
  assert.equal(h.issuerCalls[0].preserveUnrelatedTicketAllocations, true);
  assert.deepEqual(h.held.map((hold) => hold.matchDate).sort(), [h.dates[0], h.dates[3]].sort());
  assert.equal(h.reservation.bookingIds.length, 10);
  assert.equal(h.reservation.adminTicketRecoveryAudit[0].details.workflow, 'admin_new_ticket_reissue');
  assert.equal(h.reservation.adminTicketRecoveryAudit[0].details.oldToNewReferences.length, 10);
  assert.equal(h.syncCalls.length, 1);
  assert.equal(h.syncCalls[0].orderId, h.service ? '11111111-1111-4111-8111-111111111111' : '');
  assert.equal(h.syncCalls[0].tickets.length, 10);
  assert.equal(h.oldReservation.bookingIds.length, 10);
});

test('checked-in tickets are retained and never reissued', async () => {
  const h = makeHarness({ activeMatches: [1], sold: [1] });
  const proof = h.evidence({ unused: 10 }).historicalEvidence.filter((item) => item.matchIndex !== 1);
  const result = await h.service.reissue(h.input({ evidence: { historicalEvidence: proof }, approved: true }));
  assert.equal(result.status, 'reissued');
  assert.equal(result.reissuedMatchIndices.includes(1), false);
  assert.deepEqual(result.preservedMatchIndices, [1]);
  assert.equal(result.tickets.find((ticket) => ticket.matchIndex === 1).status, 'used');
  assert.equal(h.issuerCalls[0].fixtures.some((fixture) => fixture.matchIndex === 1), false);
});

test('cancelled booking gets a fresh identity with the old booking link retained', async () => {
  const h = makeHarness({ cancelledMatches: [1], sold: [0] });
  const old = h.bookings.find((booking) => String(booking._id) === String(h.premiumIds[0]));
  const result = await h.service.reissue(h.input({ evidence: h.evidence(), approved: true }));
  const replacement = result.tickets.find((ticket) => ticket.matchIndex === 1);
  assert.notEqual(replacement.bookingId, String(old._id));
  assert.equal(old.status, 'cancelled');
  assert.equal(old.adminTicketReissue.status, 'superseded');
  assert.equal(old.adminTicketReissue.newBookingId, replacement.bookingId);
  assert.equal(h.issuerCalls[0].reissueOldBookingIds[1], String(old._id));
});

test('repeated request is idempotent and concurrent requests cannot double issue', async () => {
  const h = makeHarness();
  const payload = h.input({ evidence: h.evidence(), approved: true });
  const [first, concurrent] = await Promise.allSettled([h.service.reissue(payload), h.service.reissue(payload)]);
  assert.equal(h.issuerCalls.length, 1);
  assert.ok([first, concurrent].some((result) => result.status === 'fulfilled'));
  const repeated = await h.service.reissue(payload);
  assert.equal(repeated.status, 'already_completed');
  assert.equal(h.issuerCalls.length, 1);
});

test('a restarted Admin action finalizes a partial issue without recreating its already issued fixture', async () => {
  const h = makeHarness();
  h.events[0].ticketTypes[0].sold = 1;
  h.bookings.push({
    _id: objectId(8801),
    event: h.eventIds[0],
    status: 'confirmed',
    paymentStatus: 'completed',
    paymentProvider: 'nusc-partner',
    externalPaymentId: h.reservation.paymentId,
    ticketType: 'Premium Pass',
    nuscSeasonPassType: 'premium-season',
    nuscSeasonMatchIndex: 1,
    nuscPartnerTicket: { partnerId: 'nusc', memberReferenceHash: h.reservation.memberReferenceHash, partnerOrderId: h.reservation.partnerOrderId, reservationId: h.reservation.reservationId, ticketIndex: 1 },
    adminTicketReissue: { requestId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', status: 'issued', oldBookingId: h.premiumIds[0] },
  });
  const result = await h.service.reissue(h.input({ requestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', evidence: h.evidence(), approved: true }));
  assert.equal(h.issuerCalls[0].fixtures.length, 9);
  assert.equal(h.issuerCalls[0].fixtures.some((fixture) => fixture.matchIndex === 1), false);
  assert.equal(result.tickets.find((ticket) => ticket.matchIndex === 1).bookingId, objectId(8801));
  assert.equal(result.audit.oldToNewReferences.find((link) => link.matchIndex === 1).oldBookingId, h.premiumIds[0]);
  assert.equal(result.reissuedMatchIndices.length, 10);
});

test('failed signed dashboard sync stays pending and retries the same ticket set without issuing again', async () => {
  const h = makeHarness({ syncBehavior: async () => { throw new Error('network unavailable'); } });
  const payload = h.input({ evidence: h.evidence(), approved: true });
  const first = await h.service.reissue(payload);
  assert.equal(first.status, 'dashboard_sync_pending');
  h.setSyncBehavior(async () => ({ status: 'synced' }));
  const retry = await h.service.reissue(h.input({ requestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', evidence: h.evidence(), approved: true }));
  assert.equal(retry.status, 'already_completed');
  assert.equal(retry.audit.nuscSync, 'synced');
  assert.equal(h.issuerCalls.length, 1);
  assert.equal(h.syncCalls.length, 2);
  assert.equal(h.syncCalls[1].requestId, requestId);
  assert.deepEqual(h.syncCalls[0].tickets.map((ticket) => ticket.bookingId), h.syncCalls[1].tickets.map((ticket) => ticket.bookingId));
});

test('wrong paid-ticket reference in the historical source blocks issuance', async () => {
  const h = makeHarness();
  const proof = h.evidence();
  proof.historicalEvidence[0].ticketReference = objectId(99999);
  const preview = await h.service.preview(h.input({ evidence: proof }));
  assert.equal(preview.safe, false);
  assert.ok(preview.reasons.some((reason) => reason.code === 'CHECKIN_EVIDENCE_TICKET_MISMATCH'));
  assert.equal(h.issuerCalls.length, 0);
});

test('an active ticket for the same member and fixture blocks reissue', async () => {
  const h = makeHarness({ conflictingMember: true });
  const preview = await h.service.preview(h.input({ evidence: h.evidence() }));
  assert.equal(preview.safe, false);
  assert.ok(preview.reasons.some((reason) => reason.code === 'MEMBER_ACTIVE_TICKET_CONFLICT' && reason.matchIndex === 1));
  await assert.rejects(h.service.reissue(h.input({ evidence: h.evidence(), approved: true })), (error) => error.code === 'REISSUE_REQUIRES_REVIEW');
  assert.equal(h.issuerCalls.length, 0);
});

test('an existing inventory hold that consumes capacity blocks additional allocation', async () => {
  const h = makeHarness({ hold: true });
  const preview = await h.service.preview(h.input({ evidence: h.evidence() }));
  assert.equal(preview.safe, false);
  assert.ok(preview.reasons.some((reason) => reason.code === 'CAPACITY_UNAVAILABLE' && reason.matchIndex === 1));
});

test('online paid status is insufficient until the matching Razorpay payment is captured', async () => {
  const h = makeHarness();
  const order = {
    _id: objectId(900),
    orderId: 'razorpay-season-order-123',
    orderType: 'seasonPass',
    status: 'completed',
    refundStatus: 'not_requested',
    paymentId: 'pay_authoritative_123',
    user: objectId(901),
    amountMinor: 324000,
    currency: 'INR',
    bookingIds: [...h.premiumIds],
    bookingDetails: {
      passId: 'premium-season',
      ticketType: 'Premium Pass',
      fixtures: h.eventIds.map((eventId, index) => ({ eventId, matchDate: h.dates[index], matchIndex: index + 1, ticketType: 'Premium Pass' })),
    },
  };
  const transaction = { status: 'completed', user: order.user, amountPaise: order.amountMinor, currency: 'INR' };
  let payment = { id: order.paymentId, order_id: order.orderId, amount: order.amountMinor, currency: 'INR', status: 'authorized', captured: false, amount_refunded: 0 };
  const service = createAdminNewTicketReissueService({
    Booking: h.Booking,
    Event: h.Event,
    Inventory: h.Inventory,
    Scan: h.Scan,
    NuscHomeMatchOrder: { findOne: () => query(order) },
    PaymentTransaction: { findOne: () => query(transaction) },
    inventory: h.inventoryService,
    razorpay: () => ({ payments: { fetch: async () => payment } }),
    now: () => new Date(),
  });
  const input = { channel: 'ahibi', kind: 'online', orderId: order.orderId, adminId };
  const denied = await service.preview(input);
  assert.equal(denied.paymentVerified, false);
  assert.ok(denied.reasons.some((reason) => reason.code === 'PAID_ENTITLEMENT_UNVERIFIED'));
  payment = { ...payment, status: 'captured', captured: true };
  const captured = await service.preview(input);
  assert.equal(captured.paymentVerified, true);
  assert.equal(captured.paymentProof, 'razorpay_captured_and_transaction_completed');
});

test('paid NUSC General season passes can reissue only with the saved General seating zone', async () => {
  const h = makeHarness();
  h.reservation.passId = 'general-season';
  h.reservation.ticketType = 'General Pass';
  h.reservation.zone = 'G-1';
  h.signedOrder.passId = 'general-season';
  h.signedOrder.ticketType = 'General Pass';
  h.events.forEach((event) => { event.ticketTypes = [{ name: 'General Pass', quantity: 100, sold: 0 }]; });
  const result = await h.service.reissue(h.input({ evidence: h.evidence(), approved: true }));
  assert.equal(result.status, 'reissued');
  assert.equal(h.issuerCalls[0].passId, 'general-season');
  assert.equal(h.issuerCalls[0].zone, 'G-1');
  assert.equal(h.issuerCalls[0].paymentId, h.reservation.paymentId);
});
