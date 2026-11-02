const crypto = require('crypto');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Inventory = require('../models/NuscHomeMatchInventory');
const Scan = require('../models/Scan');
const { getNuscPartnerCredentials } = require('../middlewares/nuscPartnerAuth');
const inventory = require('./nuscHomeMatchInventoryService');
const {
  createSeasonPassTicketRecords,
  getPartnerReservationTicketReadback,
} = require('./nuscSeasonPassBookingService');

const PARTNER_ID = 'nusc';
const INVENTORY_KEY = 'nusc-il-2026-27';
const ACTIVE_BOOKING_STATUSES = ['confirmed', 'checked-in'];
const RECOVERY_LEASE_MINUTES = 30;

function addReason(reasons, code, message, evidenceRequired, matchIndex = null) {
  const key = `${code}:${matchIndex ?? 'all'}`;
  if (reasons.some((reason) => `${reason.code}:${reason.matchIndex ?? 'all'}` === key)) return;
  reasons.push({ code, message, evidenceRequired, ...(matchIndex && { matchIndex }) });
}

function sameId(left, right) {
  return left != null && right != null && String(left) === String(right);
}

function activeHold(order, now) {
  return order.status === 'confirmed' || (order.status === 'held' && new Date(order.expiresAt) > now);
}

function activeSeasonHold(order, now) {
  return (order.status === 'confirmed' && !order.stockApplied) || (order.status === 'held' && new Date(order.expiresAt) > now);
}

function buildPartnerTicketRecoveryPreview(context, now = new Date()) {
  const reasons = [];
  const inventoryDoc = context?.inventoryDoc;
  const orderReservations = context?.orderReservations || [];
  if (!orderReservations.length) {
    return {
      status: 'blocked', safe: false, orderId: context?.orderId || null,
      eligibleCount: 0, missingCount: 0, existingCount: 0, generalBookingCount: 0,
      scanRecordCount: 0, fixtures: [], reasons: [{
        code: 'RESERVATION_NOT_FOUND',
        message: 'No AHIBI partner reservation matches this NUSC order.',
        evidenceRequired: 'Verify the exact order ID and AHIBI reservation record.',
      }],
    };
  }
  if (orderReservations.length !== 1) {
    addReason(reasons, 'ORDER_RESERVATION_AMBIGUOUS', 'More than one AHIBI reservation matches this order.', 'Resolve the duplicate reservation records before recovery.');
  }

  const reservation = orderReservations[0];
  const oldReservation = (inventoryDoc?.partnerSeasonPassReservations || []).find((item) => (
    item.reservationId === reservation.replacesReservationId
  ));
  const passMatches = inventory.FIXTURE_MATCHES || [];
  const sameFixtureSet = Boolean(oldReservation) &&
    reservation.eventIds?.length === 10 && oldReservation.eventIds?.length === 10 &&
    reservation.matchDates?.length === 10 && oldReservation.matchDates?.length === 10 &&
    reservation.eventIds.every((id, index) => sameId(id, oldReservation.eventIds[index])) &&
    reservation.matchDates.every((date, index) => date === oldReservation.matchDates[index]) &&
    reservation.matchDates.every((date, index) => date === passMatches[index]?.date);

  if (reservation.status !== 'issued' || reservation.passId !== 'premium-season' ||
      !/^[A-Za-z0-9._:-]{6,128}$/.test(String(reservation.paymentId || ''))) {
    addReason(reasons, 'PAID_PREMIUM_ENTITLEMENT_UNVERIFIED', 'The reservation does not contain a completed, paid Premium issuance.', 'Require the issued Premium reservation and its payment reference recorded by the signed NUSC confirmation.');
  }
  if (!/^nsp_[a-f0-9]{40}$/.test(String(reservation.reservationId || '')) ||
      !/^nsp_[a-f0-9]{40}$/.test(String(reservation.replacesReservationId || ''))) {
    addReason(reasons, 'RESERVATION_ID_UNVERIFIED', 'The linked reservations do not use the expected NUSC partner reservation references.', 'Verify the deterministic reservation IDs from the original signed partner order requests.');
  }
  if (!/^[a-f0-9]{64}$/.test(String(reservation.memberReferenceHash || ''))) {
    addReason(reasons, 'MEMBER_REFERENCE_UNVERIFIED', 'The reservation has no valid pseudonymous partner-member reference hash.', 'Reconcile the signed partner reservation identity before recovery.');
  }
  if (context.signedSyncAvailable !== true) {
    addReason(reasons, 'SIGNED_SYNC_UNAVAILABLE', 'The existing signed NUSC reservation readback is not configured for this environment.', 'Enable the existing NUSC partner integration for the intended environment and retry the preview.');
  }
  if (!oldReservation || oldReservation.status !== 'replaced' || oldReservation.passId !== 'general-season' ||
      oldReservation.replacedByReservationId !== reservation.reservationId ||
      reservation.replacesReservationId !== oldReservation.reservationId ||
      !sameId(oldReservation.memberReferenceHash, reservation.memberReferenceHash) || !sameFixtureSet) {
    addReason(reasons, 'REPLACEMENT_LINEAGE_UNVERIFIED', 'The General-to-Premium reservation linkage or fixture set is incomplete.', 'Verify both AHIBI reservations, their reciprocal replacement links, member hash, and identical ten-fixture set.');
  }

  if (reservation.paymentId && (inventoryDoc?.partnerSeasonPassReservations || []).some((item) => (
    item.reservationId !== reservation.reservationId && item.paymentId === reservation.paymentId
  ))) {
    addReason(reasons, 'PAYMENT_REFERENCE_CONFLICT', 'The Premium payment reference is attached to another reservation.', 'Reconcile the signed payment reference and reservation history before recovery.');
  }

  const usedCount = Number(reservation.replacementUsedTicketCount);
  const cancelledCount = Number(reservation.replacementCancelledTicketCount);
  const rawEligible = Array.isArray(reservation.replacementMatchIndices)
    ? reservation.replacementMatchIndices.map(Number)
    : [];
  const uniqueEligible = new Set(rawEligible);
  const decisionsValid = Number.isInteger(usedCount) && usedCount >= 0 && usedCount <= 10 &&
    Number.isInteger(cancelledCount) && cancelledCount >= 0 && cancelledCount <= 10 &&
    usedCount + cancelledCount === 10 && rawEligible.length === cancelledCount &&
    rawEligible.length === uniqueEligible.size && rawEligible.every((index, position) => (
      Number.isInteger(index) && index >= 1 && index <= 10 && (position === 0 || index > rawEligible[position - 1])
    )) && rawEligible.length + usedCount === 10;
  if (!decisionsValid) {
    addReason(reasons, 'REPLACEMENT_DECISION_UNVERIFIABLE', 'Saved replacement decisions do not identify exactly which General fixtures were cancelled as unused.', 'Require the original AHIBI replacement transition record or authoritative per-ticket check-in evidence. Empty scan results and NUSC cancelled rows do not establish non-use.');
  }

  const eligibleIndices = decisionsValid ? rawEligible : [];
  // Replacement issuance stores these references in the same order as replacementMatchIndices.
  const expectedReferences = (reservation.bookingIds || []).map((id) => String(id));
  const referenceMappingValid = decisionsValid && expectedReferences.length === eligibleIndices.length &&
    new Set(expectedReferences).size === expectedReferences.length &&
    expectedReferences.every((id) => /^[a-f\d]{24}$/i.test(id));
  if (!referenceMappingValid) {
    addReason(reasons, 'TICKET_REFERENCE_MAPPING_UNVERIFIED', 'Saved Premium ticket references do not map one-to-one to the eligible fixture indices.', 'Require the issued reservation reference list in replacementMatchIndices order and confirmation that NUSC holds those exact references.');
  }

  // Initial season-pass issuance stores the ten original references in fixture order.
  const oldIds = (oldReservation?.bookingIds || []).map(String);
  const originalBookings = context.originalBookings || [];
  const originalByIndex = new Map();
  const originalIdToIndex = new Map(oldIds.map((id, index) => [id, index + 1]));
  const scanRecords = context.scanRecords || [];
  const scannedIds = new Set(scanRecords.map((scan) => String(scan.ticket)));
  if (oldIds.length !== 10 || new Set(oldIds).size !== 10 || oldIds.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
    addReason(reasons, 'ORIGINAL_REFERENCE_HISTORY_MISSING', 'The original General reservation does not retain ten check-in lookup references.', 'Restore the original General booking references or authoritative archived scan evidence.');
  }
  for (const booking of originalBookings) {
    const id = String(booking._id);
    const indexedByReference = originalIdToIndex.get(id);
    const matchIndex = Number(booking.nuscSeasonMatchIndex);
    if (!indexedByReference || matchIndex !== indexedByReference || originalByIndex.has(matchIndex) ||
        !sameId(booking.event, oldReservation?.eventIds?.[matchIndex - 1]) ||
        booking.nuscPartnerTicket?.reservationId !== oldReservation?.reservationId ||
        booking.nuscPartnerTicket?.partnerOrderId !== oldReservation?.partnerOrderId ||
        booking.ticketType !== oldReservation?.ticketType ||
        !sameId(booking.nuscPartnerTicket?.memberReferenceHash, oldReservation?.memberReferenceHash)) {
      addReason(reasons, 'ORIGINAL_BOOKING_MAPPING_CONFLICT', 'An existing General booking does not match its saved fixture and reservation reference.', 'Review the original booking and reservation records before recovery.', matchIndex || null);
      continue;
    }
    originalByIndex.set(matchIndex, booking);
  }

  const scanIndices = new Set();
  const premiumIdToIndex = new Map(expectedReferences.map((id, index) => [id, eligibleIndices[index]]));
  const premiumScanIndices = new Set();
  for (const scan of scanRecords) {
    const index = originalIdToIndex.get(String(scan.ticket));
    const premiumIndex = premiumIdToIndex.get(String(scan.ticket));
    if (premiumIndex) {
      premiumScanIndices.add(premiumIndex);
      continue;
    }
    if (!index) {
      addReason(reasons, 'SCAN_REFERENCE_UNMAPPED', 'A scan record cannot be mapped to an original General fixture.', 'Reconcile the scan reference with authoritative original ticket records.');
      continue;
    }
    scanIndices.add(index);
    if (!sameId(scan.event, oldReservation?.eventIds?.[index - 1])) {
      addReason(reasons, 'SCAN_FIXTURE_CONFLICT', 'A General scan record points to a different fixture than the saved booking reference.', 'Verify the scan event and original booking mapping.', index);
    }
  }

  if (decisionsValid) {
    const eligibleSet = new Set(eligibleIndices);
    for (let index = 1; index <= 10; index += 1) {
      const booking = originalByIndex.get(index);
      const usedEvidence = Boolean(booking && (
        booking.status === 'checked-in' || booking.entryVerified === true
      )) || scanIndices.has(index);
      if (eligibleSet.has(index)) {
        if (scanIndices.has(index) || booking?.status === 'checked-in' || booking?.entryVerified === true ||
            (booking && (booking.status !== 'cancelled' || booking.nuscPartnerTicket?.replacedByReservationId !== reservation.reservationId))) {
          addReason(reasons, 'CHECKIN_OR_CANCELLATION_CONFLICT', 'Saved replacement decisions conflict with current General ticket or scan evidence.', 'Review the original ticket and check-in history for this fixture.', index);
        }
      } else if (booking && !usedEvidence) {
        addReason(reasons, 'SAVED_USED_DECISION_CONFLICT', 'A fixture recorded as used has no matching check-in evidence in its surviving General booking.', 'Review archived check-in evidence or restore the original booking record.', index);
      }
    }
  }

  const targetBookings = context.targetBookings || [];
  const targetByIndex = new Map();
  for (const booking of targetBookings) {
    const index = Number(booking.nuscPartnerTicket?.ticketIndex);
    if (!eligibleIndices.includes(index) || targetByIndex.has(index)) {
      addReason(reasons, 'PREMIUM_BOOKING_SET_CONFLICT', 'Existing Premium rows contain duplicate or unexpected ticket indices.', 'Reconcile all rows for this partner order before recovery.', Number.isInteger(index) ? index : null);
      continue;
    }
    targetByIndex.set(index, booking);
  }

  const referencedBookings = new Map((context.referencedBookings || []).map((booking) => [String(booking._id), booking]));
  const activeMemberBookings = context.activeMemberBookings || [];
  const activePremiumBookings = context.activePremiumBookings || [];
  const eventsById = new Map((context.events || []).map((event) => [String(event._id), event]));
  const orderHolds = inventoryDoc?.orders || [];
  const seasonHolds = inventoryDoc?.seasonPassOrders || [];
  const targetHold = seasonHolds.find((hold) => hold.orderId === reservation.reservationId && activeSeasonHold(hold, now));
  const targetHoldDates = targetHold ? [...(targetHold.matchDates || [])].sort() : [];
  const expectedEligibleDates = eligibleIndices.map((index) => reservation.matchDates?.[index - 1]).filter(Boolean).sort();
  if (targetHold && (targetHold.ticketType !== 'Premium Pass' || Number(targetHold.quantity) !== 1 ||
      JSON.stringify(targetHoldDates) !== JSON.stringify(expectedEligibleDates))) {
    addReason(reasons, 'TARGET_HOLD_CONFLICT', 'The existing Premium inventory hold does not match the eligible fixtures.', 'Reconcile the reservation-linked hold before recovery.');
  }

  const eligibleEventIds = new Set(eligibleIndices.map((index) => String(reservation.eventIds?.[index - 1])));
  for (const other of inventoryDoc?.partnerSeasonPassReservations || []) {
    if ([reservation.reservationId, oldReservation?.reservationId].includes(other.reservationId) ||
        !sameId(other.memberReferenceHash, reservation.memberReferenceHash)) continue;
    const active = other.status === 'issued' || other.status === 'issuing' ||
      (other.status === 'held' && new Date(other.expiresAt) > now);
    if (active && (other.eventIds || []).some((id) => eligibleEventIds.has(String(id)))) {
      addReason(reasons, 'ACTIVE_RESERVATION_CONFLICT', 'Another active partner reservation overlaps an eligible fixture for this member.', 'Review the overlapping reservation and its ticket references before recovery.');
      break;
    }
  }

  const fixtures = [];
  let missingCount = 0;
  let existingCount = 0;
  let generalBookingCount = originalByIndex.size;
  const generalScanRecordCount = scanRecords.filter((scan) => originalIdToIndex.has(String(scan.ticket))).length;
  const premiumScanRecordCount = scanRecords.filter((scan) => premiumIdToIndex.has(String(scan.ticket))).length;
  for (let index = 1; index <= 10; index += 1) {
    const eligible = eligibleIndices.includes(index);
    const eventId = reservation.eventIds?.[index - 1];
    const event = eventsById.get(String(eventId));
    const expectedDate = passMatches[index - 1]?.date;
    const bookingId = eligible && referenceMappingValid ? expectedReferences[eligibleIndices.indexOf(index)] : null;
    const byReference = bookingId ? referencedBookings.get(bookingId) : null;
    const byIndex = targetByIndex.get(index);
    const booking = byIndex || byReference || null;
    const isExisting = Boolean(booking);
    if (eligible) {
      const keyBooking = byIndex;
      if (byReference && (!keyBooking || !sameId(byReference._id, keyBooking._id))) {
        addReason(reasons, 'TICKET_REFERENCE_CONFLICT', 'The preserved Premium reference is occupied by a different booking.', 'Inspect the booking ID and partner-order index before recovery.', index);
      }
      if (keyBooking && bookingId && !sameId(keyBooking._id, bookingId)) {
        addReason(reasons, 'TICKET_REFERENCE_CONFLICT', 'The Premium order index points to a different booking reference.', 'Verify the AHIBI and NUSC ticket references before recovery.', index);
      }
      if (booking && (
        !sameId(booking.event, eventId) || booking.ticketType !== 'Premium Pass' ||
        booking.paymentStatus !== 'completed' || booking.paymentProvider !== 'nusc-partner' ||
        booking.externalPaymentId !== reservation.paymentId ||
        booking.nuscSeasonPassType !== 'premium-season' || booking.nuscSeasonMatchIndex !== index ||
        booking.nuscPartnerTicket?.partnerId !== PARTNER_ID ||
        booking.nuscPartnerTicket?.partnerOrderId !== reservation.partnerOrderId ||
        booking.nuscPartnerTicket?.reservationId !== reservation.reservationId ||
        !sameId(booking.nuscPartnerTicket?.memberReferenceHash, reservation.memberReferenceHash) ||
        Number(booking.nuscPartnerTicket?.ticketIndex) !== index
      )) {
        addReason(reasons, 'PREMIUM_BOOKING_CONFLICT', 'An existing Premium booking does not match the paid reservation and fixture.', 'Reconcile the ticket reference, payment reference, status, and fixture mapping.', index);
      }
      if (booking && !ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
        addReason(reasons, 'PREMIUM_TICKET_NOT_ACTIVE', 'The saved Premium reference exists in a non-active state.', 'Review its cancellation or refund history; recovery will not reactivate it automatically.', index);
      }
      if (booking && booking.status === 'checked-in' && booking.paymentStatus !== 'completed') {
        addReason(reasons, 'CHECKED_IN_TICKET_CONFLICT', 'A checked-in Premium ticket does not have completed payment state.', 'Reconcile the ticket state before recovery.', index);
      }
      if (booking) existingCount += 1;
      else missingCount += 1;

      const otherActiveMemberTickets = activeMemberBookings.filter((item) => (
        sameId(item.event, eventId) && Number(item.nuscSeasonMatchIndex) === index &&
        ACTIVE_BOOKING_STATUSES.includes(item.status) && item.paymentStatus === 'completed' &&
        (!booking || !sameId(item._id, booking._id))
      ));
      if (otherActiveMemberTickets.length) {
        addReason(reasons, 'ACTIVE_TICKET_CONFLICT', 'Another active or checked-in partner ticket already covers this member and fixture.', 'Verify the overlapping ticket or resolve its reservation before recovery.', index);
      }
      if (premiumScanIndices.has(index) && !booking) {
        addReason(reasons, 'PREMIUM_SCAN_WITHOUT_BOOKING', 'A scan record exists for a Premium reference whose Booking row is missing.', 'Restore and reconcile the scanned ticket record before issuing any replacement.', index);
      }

      if (!event || event.slug !== `nusc-home-match-${String(expectedDate || '').replace(/-/g, '')}` ||
          reservation.matchDates?.[index - 1] !== expectedDate) {
        addReason(reasons, 'FIXTURE_MAPPING_UNVERIFIED', 'The reservation fixture does not match its current NUSC event listing.', 'Restore or verify the event ID, slug, and saved match date.', index);
      }
      const eventTicket = event?.ticketTypes?.find((ticket) => ticket.name === 'Premium Pass');
      const activeCount = activePremiumBookings.filter((item) => (
        sameId(item.event, eventId) && item.ticketType === 'Premium Pass' &&
        ACTIVE_BOOKING_STATUSES.includes(item.status) && item.paymentStatus === 'completed'
      )).length;
      const sold = eventTicket ? Number(eventTicket.sold || 0) : null;
      const capacity = eventTicket ? Number(inventory.TICKET_CAPACITIES['Premium Pass'] ?? eventTicket.quantity ?? 0) : null;
      const currentOrderHolds = orderHolds.filter((hold) => hold.matchDate === expectedDate && activeHold(hold, now))
        .reduce((sum, hold) => hold.stockApplied ? sum : sum + (hold.ticketLines || [])
          .filter((line) => line.ticketType === 'Premium Pass')
          .reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0), 0);
      const currentSeasonHolds = seasonHolds.filter((hold) => activeSeasonHold(hold, now) &&
        hold.ticketType === 'Premium Pass' && (hold.matchDates || []).includes(expectedDate) &&
        hold.orderId !== reservation.reservationId)
        .reduce((sum, hold) => sum + Number(hold.quantity || 0), 0);
      const otherHolds = currentOrderHolds + currentSeasonHolds;
      const projectedOccupancy = activeCount + (booking ? 0 : 1) + otherHolds;
      let inventoryStatus = 'not_needed';
      if (eligible) {
        inventoryStatus = 'pass';
        if (!eventTicket) {
          inventoryStatus = 'blocked';
          addReason(reasons, 'PREMIUM_INVENTORY_UNAVAILABLE', 'Premium inventory is not configured for this fixture.', 'Restore the Premium ticket type before recovery.', index);
        } else if (sold !== activeCount) {
          inventoryStatus = 'blocked';
          addReason(reasons, 'UNATTRIBUTED_SOLD_ALLOCATION', 'Stored Premium sold count differs from durable active Booking rows; this recovery cannot attribute or overwrite the difference.', 'Reconcile the sold allocation to authoritative Booking or hold records first.', index);
        } else if (projectedOccupancy > capacity) {
          inventoryStatus = 'blocked';
          addReason(reasons, 'CAPACITY_OR_HOLD_CONFLICT', 'Reissuing the missing ticket would exceed Premium capacity after active holds.', 'Resolve active holds or confirm authoritative capacity before recovery.', index);
        }
        if (targetHold && expectedEligibleDates.includes(expectedDate) && booking) {
          inventoryStatus = 'blocked';
          addReason(reasons, 'TARGET_HOLD_AND_TICKET_CONFLICT', 'This fixture has both an active reservation hold and an existing Premium ticket.', 'Reconcile the duplicate inventory allocation before recovery.', index);
        }
      }

      fixtures.push({
        matchIndex: index,
        matchDate: expectedDate || null,
        eventId: eventId ? String(eventId) : null,
        eligible,
        ticketReference: bookingId,
        premiumBookingStatus: booking?.status || 'missing',
        generalBookingPresent: Boolean(originalByIndex.get(index)),
        scanRecordsFound: scanRecords.filter((scan) => originalIdToIndex.get(String(scan.ticket)) === index).length,
        premiumScanRecordsFound: scanRecords.filter((scan) => premiumIdToIndex.get(String(scan.ticket)) === index).length,
        inventory: { sold, activeBookings: activeCount, activeHolds: otherHolds, capacity, projectedOccupancy, status: inventoryStatus },
      });
    } else {
      const eventTicket = event?.ticketTypes?.find((ticket) => ticket.name === 'Premium Pass');
      const activeCount = activePremiumBookings.filter((item) => (
        sameId(item.event, eventId) && item.ticketType === 'Premium Pass' &&
        ACTIVE_BOOKING_STATUSES.includes(item.status) && item.paymentStatus === 'completed'
      )).length;
      fixtures.push({
        matchIndex: index,
        matchDate: expectedDate || null,
        eventId: eventId ? String(eventId) : null,
        eligible: false,
        ticketReference: null,
        premiumBookingStatus: 'not_eligible',
        generalBookingPresent: Boolean(originalByIndex.get(index)),
        scanRecordsFound: scanRecords.filter((scan) => originalIdToIndex.get(String(scan.ticket)) === index).length,
        premiumScanRecordsFound: scanRecords.filter((scan) => premiumIdToIndex.get(String(scan.ticket)) === index).length,
        inventory: {
          sold: eventTicket ? Number(eventTicket.sold || 0) : null,
          activeBookings: activeCount,
          activeHolds: null,
          capacity: eventTicket ? Number(inventory.TICKET_CAPACITIES['Premium Pass'] ?? eventTicket.quantity ?? 0) : null,
          projectedOccupancy: null,
          status: 'not_needed',
        },
      });
    }
  }

  return {
    status: reasons.length ? 'blocked' : 'ready',
    safe: reasons.length === 0,
    orderId: reservation.partnerOrderId,
    reservationId: reservation.reservationId,
    passId: reservation.passId,
    reservationStatus: reservation.status,
    paymentReferencePresent: Boolean(reservation.paymentId),
    paymentProof: reservation.status === 'issued' && reservation.paymentId ? 'signed_partner_confirmation_recorded' : 'unverified',
    lineage: {
      verified: Boolean(oldReservation && oldReservation.status === 'replaced' && sameFixtureSet &&
        oldReservation.replacedByReservationId === reservation.reservationId),
      generalReservationStatus: oldReservation?.status || 'missing',
    },
    replacementDecision: {
      verified: decisionsValid,
      usedTicketCount: Number.isInteger(usedCount) ? usedCount : null,
      cancelledUnusedTicketCount: Number.isInteger(cancelledCount) ? cancelledCount : null,
      eligibleMatchIndices: eligibleIndices,
    },
    generalBookingCount,
    expectedGeneralBookingCount: 10,
    scanRecordCount: scanRecords.length,
    generalScanRecordCount,
    premiumScanRecordCount,
    scanInterpretation: 'Scan rows are checked against saved references. An empty result does not prove non-use; eligibility requires the persisted replacement decision.',
    eligibleCount: eligibleIndices.length,
    missingCount,
    existingCount,
    signedDashboardSync: context.signedSyncAvailable === true ? 'AVAILABLE' : 'UNAVAILABLE',
    fixtures,
    reasons,
  };
}

async function loadRecoveryContext(orderId) {
  const inventoryDoc = await Inventory.findOne({ key: INVENTORY_KEY }).lean();
  const allReservations = inventoryDoc?.partnerSeasonPassReservations || [];
  const orderReservations = allReservations.filter((item) => item.partnerOrderId === orderId);
  const reservation = orderReservations[0];
  if (!reservation) return { orderId, inventoryDoc, orderReservations: [] };
  const oldReservation = allReservations.find((item) => item.reservationId === reservation.replacesReservationId);
  const eventIds = reservation.eventIds || [];
  const eventQuery = Event.find({ _id: { $in: eventIds } }).select('+ticketTypes');
  const [events, targetBookings, referencedBookings, activePremiumBookings, activeMemberBookings] = await Promise.all([
    eventQuery.lean(),
    Booking.find({
      'nuscPartnerTicket.partnerId': PARTNER_ID,
      'nuscPartnerTicket.partnerOrderId': orderId,
    }).lean(),
    Booking.find({ _id: { $in: [...(oldReservation?.bookingIds || []), ...(reservation.bookingIds || [])] } }).lean(),
    Booking.find({
      event: { $in: eventIds },
      ticketType: 'Premium Pass',
      status: { $in: ACTIVE_BOOKING_STATUSES },
      paymentStatus: 'completed',
    }).lean(),
    Booking.find({
      'nuscPartnerTicket.partnerId': PARTNER_ID,
      'nuscPartnerTicket.memberReferenceHash': reservation.memberReferenceHash,
      event: { $in: eventIds },
      status: { $in: ACTIVE_BOOKING_STATUSES },
      paymentStatus: 'completed',
    }).lean(),
  ]);
  const originalIds = oldReservation?.bookingIds || [];
  const premiumIds = reservation.bookingIds || [];
  const scanRecords = originalIds.length || premiumIds.length
    ? await Scan.find({ ticket: { $in: [...originalIds, ...premiumIds] } }).select('ticket event').lean()
    : [];
  return {
    orderId,
    inventoryDoc,
    signedSyncAvailable: Boolean(getNuscPartnerCredentials()),
    orderReservations,
    reservation,
    oldReservation,
    events,
    targetBookings,
    referencedBookings,
    activePremiumBookings,
    activeMemberBookings,
    originalBookings: referencedBookings.filter((booking) => (
      (oldReservation?.bookingIds || []).some((id) => sameId(id, booking._id))
    )),
    scanRecords,
  };
}

function createPartnerTicketRecoveryService(overrides = {}) {
  const deps = {
    loadContext: loadRecoveryContext,
    claim: inventory.claimPartnerSeasonPassRecovery,
    finish: inventory.finishPartnerSeasonPassRecovery,
    reserveInventory: inventory.reserveMultiMatchOrder,
    releaseInventory: inventory.releaseMatchOrder,
    finalizeExistingHold: inventory.finalizeSeasonPassOrder,
    issue: createSeasonPassTicketRecords,
    readback: getPartnerReservationTicketReadback,
    now: () => new Date(),
    ...overrides,
  };

  async function preview(orderId) {
    return buildPartnerTicketRecoveryPreview(await deps.loadContext(orderId), deps.now());
  }

  async function recover(orderId, adminId) {
    const initialContext = await deps.loadContext(orderId);
    const initialPreview = buildPartnerTicketRecoveryPreview(initialContext, deps.now());
    const reservation = initialContext.reservation || initialContext.orderReservations?.[0];
    if (!reservation) return initialPreview;
    const token = crypto.randomUUID();
    const claim = await deps.claim({
      reservationId: reservation.reservationId,
      token,
      adminId,
      expiresAt: new Date(deps.now().getTime() + RECOVERY_LEASE_MINUTES * 60 * 1000),
    });
    if (!claim?.claimed) {
      return {
        ...initialPreview,
        status: 'blocked',
        safe: false,
        reasons: [{
          code: claim?.code || 'RECOVERY_IN_PROGRESS',
          message: claim?.code === 'RESERVATION_NOT_ISSUED'
            ? 'This reservation is no longer in issued state.'
            : 'Another Admin recovery is already running for this reservation.',
          evidenceRequired: 'Wait for the current recovery to finish, then refresh the preview.',
        }],
      };
    }

    const operationId = token;
    const holdOrderId = `nusc-recovery:${reservation.reservationId}:${token}`;
    let temporaryHoldCreated = false;
    let preserveReservationHold = false;
    let finished = false;
    let phase = 'preflight';
    const finish = async (auditDetails, bookingIds) => {
      const result = await deps.finish({
        reservationId: reservation.reservationId,
        token,
        bookingIds,
        adminId,
        auditDetails: { operationId, ...auditDetails },
      });
      finished = Boolean(result);
      return result;
    };

    try {
      const context = await deps.loadContext(orderId);
      const before = buildPartnerTicketRecoveryPreview(context, deps.now());
      if (!before.safe) {
        const recorded = await finish({
          result: 'blocked', reasonCodes: before.reasons.map((reason) => reason.code),
          eligibleMatchIndices: before.replacementDecision.eligibleMatchIndices,
          generalBookingCount: before.generalBookingCount,
          scanRecordCount: before.scanRecordCount,
          fixtureInventory: before.fixtures.filter((fixture) => fixture.eligible).map((fixture) => ({
            matchIndex: fixture.matchIndex, sold: fixture.inventory.sold,
            activeBookings: fixture.inventory.activeBookings, activeHolds: fixture.inventory.activeHolds,
            capacity: fixture.inventory.capacity,
          })),
          restoredTicketCount: 0, signedDashboardStatus: 'not_attempted',
        });
        if (!recorded) {
          before.status = 'pending';
          before.safe = false;
          before.reasons.push({ code: 'RECOVERY_AUDIT_PENDING', message: 'The blocked attempt could not be written to the reservation audit.', evidenceRequired: 'Refresh the reservation audit before retrying.' });
        }
        return before;
      }

      const missing = before.fixtures.filter((fixture) => fixture.eligible && fixture.premiumBookingStatus === 'missing');
      const activeTargetHold = (context.inventoryDoc?.seasonPassOrders || []).find((hold) => (
        hold.orderId === reservation.reservationId && activeSeasonHold(hold, deps.now())
      ));
      if (activeTargetHold) {
        preserveReservationHold = true;
      } else if (missing.length) {
        phase = 'inventory_claim';
        const eventById = new Map((context.events || []).map((event) => [String(event._id), event]));
        const matches = missing.map((fixture) => {
          const event = eventById.get(fixture.eventId);
          return {
            matchDate: fixture.matchDate,
            ticketLines: [{ ticketType: 'Premium Pass', quantity: 1 }],
            eventTicketTypes: event.ticketTypes,
            existingUserTicketCount: 0,
          };
        });
        await deps.reserveInventory({
          orderId: holdOrderId,
          userId: String(reservation.memberReferenceHash).slice(0, 24),
          matches,
          allowSalesClosed: true,
        });
        temporaryHoldCreated = true;
      }

      if (missing.length) {
        phase = 'issuance';
        const eventById = new Map((context.events || []).map((event) => [String(event._id), event]));
        const bookings = await deps.issue({
          orderId: reservation.partnerOrderId,
          fixtures: missing.map((fixture) => ({
            eventId: fixture.eventId,
            matchDate: fixture.matchDate,
            matchIndex: fixture.matchIndex,
            ticketType: 'Premium Pass',
            bookingId: fixture.ticketReference,
            event: eventById.get(fixture.eventId),
          })),
          passId: 'premium-season',
          quantity: 1,
          paymentId: reservation.paymentId,
          paymentProvider: 'nusc-partner',
          memberReferenceHash: reservation.memberReferenceHash,
          reservationId: reservation.reservationId,
          partnerId: PARTNER_ID,
          preserveUnrelatedTicketAllocations: true,
        });
        if (bookings.bookingIds.length !== missing.length || bookings.bookings.some((booking, index) => (
          !sameId(booking._id, missing[index].ticketReference)
        ))) throw new Error('RECOVERY_REFERENCE_SET_INCOMPLETE');
      }

      phase = 'hold_release';
      if (temporaryHoldCreated) {
        await deps.releaseInventory(holdOrderId);
        temporaryHoldCreated = false;
      }
      if (preserveReservationHold) {
        await deps.finalizeExistingHold(reservation.reservationId);
        preserveReservationHold = false;
      }

      phase = 'readback';
      const afterContext = await deps.loadContext(orderId);
      const after = buildPartnerTicketRecoveryPreview(afterContext, deps.now());
      const readback = await deps.readback(afterContext.reservation || reservation);
      const syncStatus = readback.complete ? 'READY_FOR_SIGNED_REFRESH' : 'PENDING_SIGNED_READBACK';
      const allReferenceIds = (afterContext.reservation?.bookingIds || reservation.bookingIds || []).map(String);
      if (!readback.complete) {
        const syncReason = {
          code: 'SIGNED_RESERVATION_READBACK_PENDING',
          message: 'AHIBI ticket rows were recovered, but the existing signed NUSC reservation readback is incomplete.',
          evidenceRequired: 'Retry the same-order signed reservation readback and verify every saved ticket reference.',
        };
        after.status = 'pending';
        after.safe = false;
        after.reasons = [...after.reasons, syncReason];
      }
      if (readback.complete && !after.safe) {
        after.status = 'pending';
        after.reasons = [...after.reasons, {
          code: 'POST_ISSUANCE_RECONCILIATION_REQUIRED',
          message: 'Ticket references are readable, but post-issuance inventory or conflict checks need review.',
          evidenceRequired: 'Review the per-fixture checks before treating recovery as complete.',
        }];
      }
      phase = 'audit';
      const auditSaved = await finish({
        result: readback.complete && after.safe ? 'completed' : 'pending',
        reasonCodes: after.reasons.map((reason) => reason.code),
        eligibleMatchIndices: before.replacementDecision.eligibleMatchIndices,
        recoveredMatchIndices: missing.map((fixture) => fixture.matchIndex),
        ticketReferences: before.fixtures.filter((fixture) => fixture.eligible)
          .map((fixture) => ({ matchIndex: fixture.matchIndex, bookingId: fixture.ticketReference })),
        restoredTicketCount: missing.length,
        signedDashboardStatus: syncStatus,
      }, allReferenceIds);
      if (!auditSaved) {
        after.status = 'pending';
        after.safe = false;
        after.reasons = [...after.reasons, {
          code: 'RECOVERY_AUDIT_PENDING',
          message: 'Tickets were restored, but the reservation audit could not be finalized.',
          evidenceRequired: 'Check the reservation lock and audit history before retrying; ticket creation is idempotent.',
        }];
      }
      const finalStatus = readback.complete && after.safe && auditSaved ? 'completed' : 'pending';
      return { ...after, status: finalStatus, safe: finalStatus === 'completed' && after.safe, restoredTicketCount: missing.length, signedDashboardSync: syncStatus };
    } catch (error) {
      if (temporaryHoldCreated) await deps.releaseInventory(holdOrderId).catch(() => {});
      const reasonCode = error.code === 'TICKET_REFERENCE_CONFLICT'
        ? error.code
        : phase === 'inventory_claim'
          ? 'INVENTORY_CLAIM_FAILED'
          : phase === 'issuance'
            ? 'ISSUANCE_PENDING'
            : phase === 'hold_release'
              ? 'INVENTORY_HOLD_RELEASE_PENDING'
              : 'RECOVERY_INTERRUPTED';
      const reasonMessage = {
        TICKET_REFERENCE_CONFLICT: 'A saved ticket reference is assigned to another booking.',
        INVENTORY_CLAIM_FAILED: 'Inventory changed during preflight or no safe temporary allocation was available.',
        ISSUANCE_PENDING: 'Ticket issuance did not finish; some idempotent rows may already exist.',
        INVENTORY_HOLD_RELEASE_PENDING: 'Tickets were issued, but the temporary inventory hold needs reconciliation.',
        RECOVERY_INTERRUPTED: 'Recovery did not finish. Existing paid order and booking history were preserved; retry the preview before another action.',
      }[reasonCode];
      if (!finished) {
        await finish({
          result: 'pending', reasonCodes: [reasonCode],
          eligibleMatchIndices: initialPreview.replacementDecision?.eligibleMatchIndices || [],
          restoredTicketCount: null, signedDashboardStatus: 'pending',
        }).catch(() => {});
      }
      return {
        ...initialPreview,
        status: 'pending',
        safe: false,
        reasons: [{
          code: reasonCode,
          message: reasonMessage,
          evidenceRequired: reasonCode === 'TICKET_REFERENCE_CONFLICT'
            ? 'Review the conflicting booking ID and partner-order index.'
            : reasonCode === 'INVENTORY_CLAIM_FAILED'
              ? 'Refresh fixture sold counts, active bookings, holds, and capacity before retrying.'
              : 'Refresh the reservation, inventory, and signed readback status; the action is idempotent.',
        }],
      };
    }
  }

  return { preview, recover };
}

const service = createPartnerTicketRecoveryService();

module.exports = {
  buildPartnerTicketRecoveryPreview,
  createPartnerTicketRecoveryService,
  loadRecoveryContext,
  previewPartnerSeasonPassTicketRecovery: service.preview,
  recoverPartnerSeasonPassTickets: service.recover,
};
