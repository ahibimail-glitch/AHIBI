const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPartnerTicketRecoveryPreview,
  createPartnerTicketRecoveryService,
} = require('../services/nuscPartnerTicketRecoveryService');
const inventory = require('../services/nuscHomeMatchInventoryService');

const HEX = (value) => String(value).padStart(24, '0');

function makeContext({ unattributedIndices = [], savedDecision = true, activeMemberConflict = false } = {}) {
  const fixtures = inventory.FIXTURE_MATCHES;
  const reservationId = `nsp_${'1'.repeat(40)}`;
  const oldReservationId = `nsp_${'2'.repeat(40)}`;
  const eventIds = fixtures.map((_, index) => `event-${index + 1}`);
  const oldBookingIds = fixtures.map((_, index) => HEX(index + 101));
  const bookingIds = fixtures.map((_, index) => HEX(index + 201));
  const reservation = {
    reservationId,
    partnerOrderId: 'nusc-order-recovery-test',
    memberReferenceHash: 'a'.repeat(64),
    passId: 'premium-season',
    ticketType: 'Premium Pass',
    matchDates: fixtures.map((fixture) => fixture.date),
    eventIds,
    status: 'issued',
    paymentId: 'nusc-payment-recovery-test',
    bookingIds,
    replacesReservationId: oldReservationId,
    replacementMatchIndices: savedDecision ? fixtures.map((_, index) => index + 1) : [],
    replacementUsedTicketCount: savedDecision ? 0 : null,
    replacementCancelledTicketCount: savedDecision ? 10 : null,
    recoveryLease: null,
    operationsAudit: [],
  };
  const oldReservation = {
    reservationId: oldReservationId,
    partnerOrderId: 'nusc-order-general-test',
    memberReferenceHash: reservation.memberReferenceHash,
    passId: 'general-season',
    ticketType: 'General Pass',
    matchDates: [...reservation.matchDates],
    eventIds: [...eventIds],
    status: 'replaced',
    bookingIds: oldBookingIds,
    replacedByReservationId: reservationId,
  };
  const events = fixtures.map((fixture, index) => ({
    _id: eventIds[index],
    slug: `nusc-home-match-${fixture.date.replace(/-/g, '')}`,
    ticketTypes: [{ name: 'Premium Pass', sold: unattributedIndices.includes(index + 1) ? 1 : 0, quantity: 300 }],
  }));
  const activePremiumBookings = [];
  const activeMemberBookings = activeMemberConflict ? [{
    _id: HEX(999),
    event: eventIds[0],
    ticketType: 'Premium Pass',
    status: 'checked-in',
    paymentStatus: 'completed',
    nuscSeasonMatchIndex: 1,
    nuscPartnerTicket: {
      partnerId: 'nusc', partnerOrderId: 'another-order', reservationId: 'another-reservation',
      memberReferenceHash: reservation.memberReferenceHash,
    },
  }] : [];
  if (activeMemberConflict) activePremiumBookings.push(activeMemberBookings[0]);
  return {
    orderId: reservation.partnerOrderId,
    signedSyncAvailable: true,
    inventoryDoc: {
      key: 'nusc-il-2026-27',
      partnerSeasonPassReservations: [oldReservation, reservation],
      orders: [],
      seasonPassOrders: [],
    },
    orderReservations: [reservation],
    reservation,
    oldReservation,
    events,
    targetBookings: [],
    referencedBookings: [],
    activePremiumBookings,
    activeMemberBookings,
    originalBookings: [],
    scanRecords: [],
  };
}

function makeService(context, overrides = {}) {
  let locked = false;
  let issueCount = 0;
  let reserveCount = 0;
  let releaseCount = 0;
  const options = {
    loadContext: async () => context,
    claim: async ({ token, expiresAt }) => {
      if (locked) return { claimed: false, code: 'RECOVERY_IN_PROGRESS' };
      locked = true;
      context.reservation.recoveryLease = { token, expiresAt };
      return { claimed: true };
    },
    finish: async ({ token, bookingIds, auditDetails }) => {
      if (!locked || context.reservation.recoveryLease?.token !== token) return false;
      if (bookingIds) context.reservation.bookingIds = bookingIds;
      context.reservation.operationsAudit.push({ action: 'partner_ticket_recovery', details: auditDetails });
      context.reservation.recoveryLease = null;
      locked = false;
      return true;
    },
    reserveInventory: async (request) => { reserveCount += 1; assert.equal(request.allowSalesClosed, true); },
    releaseInventory: async () => { releaseCount += 1; },
    finalizeExistingHold: async () => null,
    issue: async (input) => {
      issueCount += 1;
      const bookings = input.fixtures.map((fixture) => {
        const booking = {
          _id: fixture.bookingId,
          event: fixture.eventId,
          ticketType: fixture.ticketType,
          status: 'confirmed',
          paymentStatus: 'completed',
          paymentProvider: 'nusc-partner',
          externalPaymentId: input.paymentId,
          nuscSeasonPassType: 'premium-season',
          nuscSeasonMatchIndex: fixture.matchIndex,
          nuscPartnerTicket: {
            partnerId: 'nusc', partnerOrderId: input.orderId, reservationId: input.reservationId,
            memberReferenceHash: input.memberReferenceHash, ticketIndex: fixture.matchIndex,
          },
        };
        fixture.event.ticketTypes[0].sold += 1;
        context.targetBookings.push(booking);
        context.referencedBookings.push(booking);
        context.activePremiumBookings.push(booking);
        context.activeMemberBookings.push(booking);
        return booking;
      });
      return { bookings, bookingIds: bookings.map((booking) => booking._id) };
    },
    readback: async () => ({ complete: context.targetBookings.length === 10 }),
    now: () => new Date('2026-11-02T12:00:00Z'),
    ...overrides,
  };
  return {
    service: createPartnerTicketRecoveryService(options),
    stats: () => ({ issueCount, reserveCount, releaseCount, locked }),
  };
}

test('paid replacement with saved decisions restores ten missing tickets using existing references', async () => {
  const context = makeContext();
  const { service, stats } = makeService(context);
  const preview = await service.preview(context.orderId);
  assert.equal(preview.safe, true);
  assert.equal(preview.generalBookingCount, 0);
  assert.equal(preview.replacementDecision.verified, true);
  assert.equal(preview.missingCount, 10);
  assert.match(preview.scanInterpretation, /empty result does not prove non-use/i);

  const result = await service.recover(context.orderId, 'admin-id');
  assert.equal(result.status, 'completed');
  assert.equal(result.restoredTicketCount, 10);
  assert.equal(result.signedDashboardSync, 'READY_FOR_SIGNED_REFRESH');
  assert.equal(context.targetBookings.length, 10);
  assert.deepEqual(context.targetBookings.map((booking) => booking._id), context.reservation.bookingIds);
  assert.equal(context.reservation.paymentId, 'nusc-payment-recovery-test');
  assert.equal(stats().reserveCount, 1);
  assert.equal(stats().releaseCount, 1);
  assert.equal(context.reservation.operationsAudit.length, 1);
  assert.equal(context.reservation.operationsAudit[0].details.restoredTicketCount, 10);
});

test('smoke-test inventory mismatch remains blocked and does not issue or alter inventory', async () => {
  const unattributed = [2, 3, 5, 6, 7, 8, 9, 10];
  const context = makeContext({ unattributedIndices: unattributed });
  context.events[0].ticketTypes[0].sold = 18;
  context.activePremiumBookings.push(...Array.from({ length: 18 }, (_, index) => ({
    _id: HEX(index + 2000), event: context.events[0]._id, ticketType: 'Premium Pass',
    status: 'confirmed', paymentStatus: 'completed',
  })));
  const { service, stats } = makeService(context);
  const preview = await service.preview(context.orderId);
  assert.equal(preview.safe, false);
  assert.equal(preview.reasons.filter((reason) => reason.code === 'UNATTRIBUTED_SOLD_ALLOCATION').length, 8);
  assert.equal(preview.fixtures[0].inventory.sold, 18);
  assert.equal(preview.fixtures[0].inventory.activeBookings, 18);
  assert.equal(preview.fixtures[0].inventory.projectedOccupancy, 19);
  assert.equal(preview.fixtures[3].inventory.sold, 0);
  assert.equal(preview.fixtures[3].inventory.projectedOccupancy, 1);

  const result = await service.recover(context.orderId, 'admin-id');
  assert.equal(result.status, 'blocked');
  assert.equal(context.targetBookings.length, 0);
  assert.equal(stats().issueCount, 0);
  assert.equal(stats().reserveCount, 0);
  assert.equal(context.events[1].ticketTypes[0].sold, 1);
});

test('missing saved General replacement/check-in decision remains blocked despite an empty scan result', async () => {
  const context = makeContext({ savedDecision: false });
  const { service, stats } = makeService(context);
  const result = await service.recover(context.orderId, 'admin-id');
  assert.equal(result.status, 'blocked');
  assert.ok(result.reasons.some((reason) => reason.code === 'REPLACEMENT_DECISION_UNVERIFIABLE'));
  assert.equal(stats().issueCount, 0);
  assert.equal(context.targetBookings.length, 0);
});

test('recovery is blocked when the signed NUSC same-order readback is unavailable', async () => {
  const context = makeContext();
  context.signedSyncAvailable = false;
  const { service, stats } = makeService(context);
  const result = await service.recover(context.orderId, 'admin-id');
  assert.equal(result.status, 'blocked');
  assert.ok(result.reasons.some((reason) => reason.code === 'SIGNED_SYNC_UNAVAILABLE'));
  assert.equal(stats().issueCount, 0);
});

test('scan evidence contradicting a saved unused decision blocks recovery', async () => {
  const context = makeContext();
  context.scanRecords.push({ ticket: context.oldReservation.bookingIds[0], event: context.oldReservation.eventIds[0] });
  const { service, stats } = makeService(context);
  const result = await service.recover(context.orderId, 'admin-id');
  assert.equal(result.status, 'blocked');
  assert.ok(result.reasons.some((reason) => reason.code === 'CHECKIN_OR_CANCELLATION_CONFLICT'));
  assert.equal(stats().issueCount, 0);
});

test('active checked-in ticket conflict blocks recovery', async () => {
  const context = makeContext({ activeMemberConflict: true });
  const { service, stats } = makeService(context);
  const result = await service.recover(context.orderId, 'admin-id');
  assert.equal(result.status, 'blocked');
  assert.ok(result.reasons.some((reason) => reason.code === 'ACTIVE_TICKET_CONFLICT'));
  assert.equal(stats().issueCount, 0);
});

test('active fixture holds are included in projected capacity before recovery', async () => {
  const context = makeContext();
  const fixture = inventory.FIXTURE_MATCHES[0];
  context.events[0].ticketTypes[0].sold = 299;
  context.activePremiumBookings = Array.from({ length: 299 }, (_, index) => ({
    _id: HEX(index + 1000), event: context.events[0]._id, ticketType: 'Premium Pass',
    status: 'confirmed', paymentStatus: 'completed',
  }));
  context.inventoryDoc.orders.push({
    orderId: 'unrelated-active-hold', userId: HEX(3333), matchDate: fixture.date,
    ticketLines: [{ ticketType: 'Premium Pass', quantity: 1 }], status: 'held',
    expiresAt: new Date('2026-11-02T13:00:00Z'), stockApplied: false,
  });
  const { service, stats } = makeService(context);
  const result = await service.recover(context.orderId, 'admin-id');
  assert.equal(result.status, 'blocked');
  const capacityReason = result.reasons.find((reason) => reason.code === 'CAPACITY_OR_HOLD_CONFLICT');
  assert.ok(capacityReason);
  assert.equal(stats().issueCount, 0);
  assert.equal(stats().reserveCount, 0);
});

test('duplicate recovery attempts are idempotent and retain one active entitlement per fixture', async () => {
  const context = makeContext();
  const { service, stats } = makeService(context);
  const first = await service.recover(context.orderId, 'admin-id');
  const second = await service.recover(context.orderId, 'admin-id');
  assert.equal(first.status, 'completed');
  assert.equal(second.status, 'completed');
  assert.equal(second.restoredTicketCount, 0);
  assert.equal(stats().issueCount, 1);
  assert.equal(context.targetBookings.length, 10);
  assert.equal(new Set(context.targetBookings.map((booking) => booking.nuscPartnerTicket.ticketIndex)).size, 10);
  assert.equal(context.reservation.operationsAudit.length, 2);
});

test('concurrent recovery claim blocks the second Admin action', async () => {
  const context = makeContext();
  let signalIssueStarted;
  let allowIssue;
  let locked = false;
  let issueCount = 0;
  const issueStarted = new Promise((resolve) => { signalIssueStarted = resolve; });
  const issueGate = new Promise((resolve) => { allowIssue = resolve; });
  const service = createPartnerTicketRecoveryService({
    loadContext: async () => context,
    claim: async ({ token, expiresAt }) => {
      if (locked) return { claimed: false, code: 'RECOVERY_IN_PROGRESS' };
      locked = true;
      context.reservation.recoveryLease = { token, expiresAt };
      return { claimed: true };
    },
    finish: async ({ token, bookingIds, auditDetails }) => {
      if (!locked || context.reservation.recoveryLease?.token !== token) return false;
      if (bookingIds) context.reservation.bookingIds = bookingIds;
      context.reservation.operationsAudit.push({ action: 'partner_ticket_recovery', details: auditDetails });
      context.reservation.recoveryLease = null;
      locked = false;
      return true;
    },
    reserveInventory: async () => {},
    releaseInventory: async () => {},
    finalizeExistingHold: async () => null,
    issue: async (input) => {
      issueCount += 1;
      signalIssueStarted();
      await issueGate;
      const bookings = input.fixtures.map((fixture) => {
        const booking = {
          _id: fixture.bookingId, event: fixture.eventId, ticketType: 'Premium Pass', status: 'confirmed',
          paymentStatus: 'completed', paymentProvider: 'nusc-partner', externalPaymentId: input.paymentId,
          nuscSeasonPassType: 'premium-season', nuscSeasonMatchIndex: fixture.matchIndex,
          nuscPartnerTicket: { partnerId: 'nusc', partnerOrderId: input.orderId, reservationId: input.reservationId, memberReferenceHash: input.memberReferenceHash, ticketIndex: fixture.matchIndex },
        };
        fixture.event.ticketTypes[0].sold += 1;
        context.targetBookings.push(booking);
        context.referencedBookings.push(booking);
        context.activePremiumBookings.push(booking);
        context.activeMemberBookings.push(booking);
        return booking;
      });
      return { bookings, bookingIds: bookings.map((booking) => booking._id) };
    },
    readback: async () => ({ complete: context.targetBookings.length === 10 }),
    now: () => new Date('2026-11-02T12:00:00Z'),
  });
  const first = service.recover(context.orderId, 'admin-a');
  await issueStarted;
  const second = await service.recover(context.orderId, 'admin-b');
  assert.equal(second.status, 'blocked');
  assert.ok(second.reasons.some((reason) => reason.code === 'RECOVERY_IN_PROGRESS'));
  allowIssue();
  const firstResult = await first;
  assert.equal(firstResult.status, 'completed');
  assert.equal(issueCount, 1);
});

test('incomplete signed same-order readback reports pending and retry does not reissue', async () => {
  const context = makeContext();
  let readbackComplete = false;
  const { service, stats } = makeService(context, {
    readback: async () => ({ complete: readbackComplete && context.targetBookings.length === 10 }),
  });
  const pending = await service.recover(context.orderId, 'admin-id');
  assert.equal(pending.status, 'pending');
  assert.equal(pending.signedDashboardSync, 'PENDING_SIGNED_READBACK');
  assert.ok(pending.reasons.some((reason) => reason.code === 'SIGNED_RESERVATION_READBACK_PENDING'));
  readbackComplete = true;
  const retried = await service.recover(context.orderId, 'admin-id');
  assert.equal(retried.status, 'completed');
  assert.equal(stats().issueCount, 1);
});
