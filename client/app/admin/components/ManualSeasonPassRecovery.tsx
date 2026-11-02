"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import NuscPartnerTicketRecoveryPanel from './NuscPartnerTicketRecoveryPanel';

type Channel = 'ahibi' | 'rise';
type TicketStatus = 'valid' | 'checked_in' | 'missing' | 'cancelled' | 'superseded' | 'invalid' | 'refunded' | 'duplicate_valid' | 'manual_intervention';
type PassKind = 'manual' | 'online' | 'paid';

interface AhibiUser {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface RiseMember {
  memberNumber: string;
  name: string;
  phoneMasked: string;
  tier: string;
}

interface PassTicket {
  matchIndex: number;
  matchDate: string | null;
  opponent: string;
  status: TicketStatus;
  ticketType?: string;
  zone?: string | null;
}

interface PassOrder {
  orderId: string;
  kind: PassKind;
  passId: 'general-season' | 'premium-season';
  ticketType: string;
  zone: string | null;
  status: string;
  ahibiStatus?: string;
  settlementType?: 'paid' | 'complimentary';
  tickets: PassTicket[];
  result?: { status: string; recoveredMatchIndices: number[]; relinkedMatchIndices: number[]; nuscSync?: string };
}

interface ReissuePreview {
  safe: boolean;
  status: 'ready' | 'blocked';
  paymentVerified: boolean;
  paymentProof: string;
  lineageVerified: boolean;
  dashboardSyncStatus: string | null;
  missingCount: number;
  validCount: number;
  checkedInCount: number;
  fixtures: Array<{
    matchIndex: number;
    matchDate: string | null;
    opponent: string;
    status: string;
    oldTicketReference: string | null;
    eligible: boolean;
    inventory: { sold: number | null; activeBookings: number; activeHolds: number; capacity: number | null; soldDelta: number | null; reconciliationRequired: boolean; newAllocationRequired: boolean; status: string };
  }>;
  reasons: Array<{ code: string; message: string; evidenceRequired: string; matchIndex?: number }>;
}

interface ReissueDraft {
  historical: Record<number, { outcome: '' | 'unused' | 'used'; reference: string }>;
  inventory: Record<number, string>;
  approved: boolean;
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const PASS_LABELS = { 'general-season': 'General Season Pass', 'premium-season': 'Premium Season Pass' } as const;

function adminHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` };
}

function payloadData(response: any) {
  return response?.data?.data ?? response?.data ?? {};
}

function requestErrorMessage(error: any) {
  const reasons = error?.response?.data?.details?.reasons;
  if (Array.isArray(reasons) && reasons.length) {
    return `${error?.response?.data?.message || 'Manual review is required.'} ${reasons.map((reason: any) => reason.evidenceRequired || reason.message).join(' ')}`;
  }
  return error?.response?.data?.message || error?.response?.data?.code || error?.message || 'Recovery could not be completed. Refresh the pass status before retrying.';
}

function statusLabel(status: TicketStatus) {
  return ({
    valid: 'Valid',
    checked_in: 'Checked in · retained',
    missing: 'Missing',
    cancelled: 'Cancelled - requires evidence review',
    superseded: 'Superseded',
    invalid: 'Invalid · review required',
    refunded: 'Refunded · review required',
    duplicate_valid: 'Multiple active tickets · review required',
    manual_intervention: 'Review required',
  } as Record<TicketStatus, string>)[status] || status;
}

function orderNeedsReview(order: PassOrder) {
  return ['cancelled', 'refunded', 'refund_pending', 'failed'].includes(order.status)
    || order.status === 'manual_intervention'
    || ['replaced', 'released', 'expired'].includes(order.ahibiStatus || '');
}

export default function ManualSeasonPassRecovery() {
  const [channel, setChannel] = useState<Channel>('ahibi');
  const [query, setQuery] = useState('');
  const [ahibiUsers, setAhibiUsers] = useState<AhibiUser[]>([]);
  const [riseMembers, setRiseMembers] = useState<RiseMember[]>([]);
  const [riseOrders, setRiseOrders] = useState<Array<{ memberNumber: string; order: PassOrder }>>([]);
  const [selectedUser, setSelectedUser] = useState<AhibiUser | null>(null);
  const [selectedMember, setSelectedMember] = useState<RiseMember | null>(null);
  const [orders, setOrders] = useState<PassOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searching, setSearching] = useState(false);
  const [recoveringOrderId, setRecoveringOrderId] = useState('');
  const [newReissueOrderKey, setNewReissueOrderKey] = useState('');
  const [newReissuePreview, setNewReissuePreview] = useState<Record<string, ReissuePreview>>({});
  const [newReissueDrafts, setNewReissueDrafts] = useState<Record<string, ReissueDraft>>({});
  const [newReissueLoadingId, setNewReissueLoadingId] = useState('');
  const [newReissueResult, setNewReissueResult] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const searchId = useRef(0);
  const requestIds = useRef(new Map<string, string>());

  function reissueKey(order: PassOrder) {
    return `${channel}:${order.kind}:${order.orderId}`;
  }

  function reissueDraft(order: PassOrder): ReissueDraft {
    return newReissueDrafts[reissueKey(order)] || { historical: {}, inventory: {}, approved: false };
  }

  function reissueEvidence(order: PassOrder, preview?: ReissuePreview) {
    const key = reissueKey(order);
    const draft = reissueDraft(order);
    const fixtures = preview?.fixtures || newReissuePreview[key]?.fixtures || [];
    return {
      historicalEvidence: fixtures.flatMap((fixture) => {
        const entry = draft.historical[fixture.matchIndex];
        return entry?.outcome && entry.reference.trim() && fixture.oldTicketReference ? [{
          matchIndex: fixture.matchIndex,
          ticketReference: fixture.oldTicketReference,
          reference: entry.reference.trim(),
          outcome: entry.outcome,
        }] : [];
      }),
      inventoryEvidence: fixtures.flatMap((fixture) => {
        const reference = draft.inventory[fixture.matchIndex]?.trim();
        return reference && fixture.oldTicketReference ? [{
          matchIndex: fixture.matchIndex,
          ticketReference: fixture.oldTicketReference,
          reference,
        }] : [];
      }),
    };
  }

  function updateReissueDraft(order: PassOrder, update: (current: ReissueDraft) => ReissueDraft) {
    const key = reissueKey(order);
    setNewReissueDrafts((previous) => ({
      ...previous,
      [key]: update(previous[key] || { historical: {}, inventory: {}, approved: false }),
    }));
  }

  async function loadNewReissuePreview(order: PassOrder) {
    const key = reissueKey(order);
    setNewReissueLoadingId(order.orderId);
    setError('');
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/season-pass-recovery/${channel}/reissue-preview`,
        {
          orderId: order.orderId,
          ...(channel === 'ahibi' ? { kind: order.kind } : { memberNumber: selectedMember?.memberNumber }),
          evidence: reissueEvidence(order),
        },
        { headers: { ...adminHeaders(), 'Content-Type': 'application/json' } },
      );
      const preview = payloadData(response) as ReissuePreview;
      setNewReissuePreview((previous) => ({ ...previous, [key]: preview }));
    } catch (requestError: any) {
      const details = requestError?.response?.data?.details;
      if (details?.fixtures) setNewReissuePreview((previous) => ({ ...previous, [key]: details as ReissuePreview }));
      setError(requestErrorMessage(requestError));
    } finally {
      setNewReissueLoadingId('');
    }
  }

  async function toggleNewReissue(order: PassOrder) {
    const key = reissueKey(order);
    if (newReissueOrderKey === key) {
      setNewReissueOrderKey('');
      return;
    }
    setNewReissueOrderKey(key);
    updateReissueDraft(order, (current) => ({ ...current, approved: false }));
    await loadNewReissuePreview(order);
  }

  async function reissueNewTickets(order: PassOrder) {
    const key = reissueKey(order);
    const draft = reissueDraft(order);
    if (!draft.approved) {
      setError('Confirm that you reviewed the independent check-in and inventory evidence before issuing new tickets.');
      return;
    }
    setBusy(true);
    setNewReissueLoadingId(order.orderId);
    setError('');
    setNotice('');
    try {
      const base = {
        orderId: order.orderId,
        ...(channel === 'ahibi' ? { kind: order.kind } : { memberNumber: selectedMember?.memberNumber }),
        evidence: reissueEvidence(order),
      };
      const previewResponse = await axios.post(
        `${API_URL}/api/admin/season-pass-recovery/${channel}/reissue-preview`,
        base,
        { headers: { ...adminHeaders(), 'Content-Type': 'application/json' } },
      );
      const preview = payloadData(previewResponse) as ReissuePreview;
      setNewReissuePreview((previous) => ({ ...previous, [key]: preview }));
      if (!preview.safe) {
        setError(preview.reasons.map((reason) => `${reason.matchIndex ? `Match ${reason.matchIndex}: ` : ''}${reason.evidenceRequired}`).join(' '));
        return;
      }
      const requestKey = `new:${key}`;
      const requestId = requestIds.current.get(requestKey) || crypto.randomUUID();
      requestIds.current.set(requestKey, requestId);
      const response = await axios.post(
        `${API_URL}/api/admin/season-pass-recovery/${channel}/reissue-new`,
        { ...base, requestId, approved: true },
        { headers: { ...adminHeaders(), 'Content-Type': 'application/json' } },
      );
      const result = payloadData(response);
      setNewReissueResult((previous) => ({ ...previous, [key]: result }));
      updateReissueDraft(order, (current) => ({ ...current, approved: false }));
      const count = result.reissuedMatchIndices?.length || 0;
      const dashboard = channel === 'rise' ? ` NUSC dashboard sync: ${result.dashboardSync || result.audit?.nuscSync || 'pending'}.` : '';
      setNotice(count
        ? `${count} fresh ticket${count === 1 ? '' : 's'} issued against the existing paid order. The original payment and order were retained.${dashboard}`
        : `No additional tickets were issued; the prior reissue remains linked to the existing paid order.${dashboard}`);
      await loadNewReissuePreview(order);
    } catch (requestError: any) {
      const details = requestError?.response?.data?.details;
      if (details?.fixtures) setNewReissuePreview((previous) => ({ ...previous, [key]: details as ReissuePreview }));
      setError(requestErrorMessage(requestError));
    } finally {
      setBusy(false);
      setNewReissueLoadingId('');
    }
  }

  const selectedOrders = useMemo(() => {
    if (channel === 'ahibi') return orders;
    return riseOrders.filter((entry) => entry.memberNumber === selectedMember?.memberNumber).map((entry) => entry.order);
  }, [channel, orders, riseOrders, selectedMember]);

  useEffect(() => {
    const text = query.trim();
    const id = ++searchId.current;
    setError('');
    setNotice('');
    if (selectedUser || selectedMember || text.length < (channel === 'ahibi' ? 2 : 5)) {
      setAhibiUsers([]);
      setRiseMembers([]);
      if (!selectedMember) setRiseOrders([]);
      setSearching(false);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        if (channel === 'ahibi') {
          const response = await axios.get(`${API_URL}/api/admin/users/search`, {
            params: { search: text }, headers: adminHeaders(),
          });
          if (id === searchId.current) setAhibiUsers(Array.isArray(payloadData(response).users) ? payloadData(response).users : []);
        } else {
          const response = await axios.get(`${API_URL}/api/admin/season-pass-recovery/rise/search`, {
            params: { search: text }, headers: adminHeaders(),
          });
          if (id === searchId.current) {
            const data = payloadData(response);
            setRiseMembers(Array.isArray(data.members) ? data.members : []);
            setRiseOrders(Array.isArray(data.orders) ? data.orders : []);
          }
        }
      } catch (requestError) {
        if (id === searchId.current) {
          setAhibiUsers([]);
          setRiseMembers([]);
          setRiseOrders([]);
          setError(requestErrorMessage(requestError));
        }
      } finally {
        if (id === searchId.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [channel, query, selectedMember, selectedUser]);

  async function chooseAhibiUser(user: AhibiUser) {
    setSelectedUser(user);
    setSelectedMember(null);
    setQuery('');
    setOrders([]);
    setLoadingOrders(true);
    setError('');
    setNotice('');
    try {
      const response = await axios.get(`${API_URL}/api/admin/season-pass-recovery/ahibi/orders`, {
        params: { userId: user._id }, headers: adminHeaders(),
      });
      setOrders(payloadData(response).orders || []);
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setLoadingOrders(false);
    }
  }

  function chooseRiseMember(member: RiseMember) {
    setSelectedMember(member);
    setSelectedUser(null);
    setQuery('');
    setError('');
    setNotice('');
  }

  function clearSelection() {
    setSelectedUser(null);
    setSelectedMember(null);
    setOrders([]);
    setRiseOrders([]);
    setRiseMembers([]);
    setAhibiUsers([]);
    setQuery('');
    setError('');
    setNotice('');
  }

  async function recover(order: PassOrder) {
    setBusy(true);
    setRecoveringOrderId(order.orderId);
    setError('');
    setNotice('');
    const requestId = requestIds.current.get(order.orderId) || crypto.randomUUID();
    requestIds.current.set(order.orderId, requestId);
    try {
      const isRise = channel === 'rise';
      const response = await axios.post(
        `${API_URL}/api/admin/season-pass-recovery/${isRise ? 'rise' : 'ahibi'}/recover`,
        isRise
          ? { orderId: order.orderId, memberNumber: selectedMember?.memberNumber, requestId }
          : { kind: order.kind, orderId: order.orderId, requestId },
        { headers: { ...adminHeaders(), 'Content-Type': 'application/json' } },
      );
      const result = payloadData(response);
      const updated = { ...result.order, result: result.result } as PassOrder;
      if (isRise) setRiseOrders((previous) => previous.map((entry) => (
        entry.memberNumber === selectedMember?.memberNumber && entry.order.orderId === order.orderId
          ? { ...entry, order: updated }
          : entry
      )));
      else setOrders((previous) => previous.map((item) => item.orderId === order.orderId ? updated : item));
      requestIds.current.delete(order.orderId);
      const recovered = result.result?.recoveredMatchIndices?.length || 0;
      const relinked = result.result?.relinkedMatchIndices?.length || 0;
      const syncText = isRise ? ` NUSC dashboard sync: ${result.result?.nuscSync || 'complete'}.` : '';
      setNotice(recovered || relinked
        ? `Recovery complete: ${recovered} ticket${recovered === 1 ? '' : 's'} reissued and ${relinked} reference${relinked === 1 ? '' : 's'} repaired.${syncText}`
        : `All existing tickets were verified. No duplicate tickets were issued.${syncText}`);
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setBusy(false);
      setRecoveringOrderId('');
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="season-pass-recovery-heading">
      <div>
        <h2 id="season-pass-recovery-heading" className="text-lg font-semibold">Recover / Reissue Tickets</h2>
        <p className="text-sm text-muted-foreground">Inspect the ten match tickets for an existing pass. Valid or checked-in tickets are retained; only missing tickets can be reissued against the existing paid entitlement.</p>
      </div>
      <NuscPartnerTicketRecoveryPanel />
      {error && <Alert variant="destructive"><AlertTitle>Ticket recovery</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {notice && <Alert className="border-green-200 bg-green-50 text-green-900"><AlertTitle>Recovery result</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}

      <div className="space-y-3">
        <Label>Pass recipient</Label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={channel === 'ahibi' ? 'default' : 'outline'} onClick={() => { setChannel('ahibi'); clearSelection(); }}>AHIBI user</Button>
          <Button type="button" variant={channel === 'rise' ? 'default' : 'outline'} onClick={() => { setChannel('rise'); clearSelection(); }}>NUSC RISE member</Button>
        </div>
        {selectedUser || selectedMember ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
            <p className="m-0 text-sm"><strong>{selectedUser?.name || selectedMember?.name || selectedMember?.memberNumber}</strong>{' '}
              {selectedUser ? [selectedUser.email, selectedUser.phone].filter(Boolean).join(' · ') : `${selectedMember?.memberNumber} · ${selectedMember?.tier} · ${selectedMember?.phoneMasked}`}</p>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={clearSelection}>Change recipient</Button>
          </div>
        ) : (
          <>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={channel === 'ahibi' ? 'Search by AHIBI name, email, or phone' : 'NUSC membership number or full phone number'} autoComplete="off" />
            {searching && <p className="text-sm text-muted-foreground">Searching…</p>}
            {!searching && query.trim().length >= (channel === 'ahibi' ? 2 : 5) && (
              <div className="max-h-56 overflow-y-auto rounded-md border">
                {channel === 'ahibi' ? ahibiUsers.length ? ahibiUsers.map(user => (
                  <button key={user._id} type="button" className="block w-full border-b px-3 py-2 text-left last:border-0 hover:bg-muted" onClick={() => void chooseAhibiUser(user)}>
                    <span className="block text-sm font-medium">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{[user.email, user.phone].filter(Boolean).join(' · ')}</span>
                  </button>
                )) : <p className="px-3 py-2 text-sm text-muted-foreground">No AHIBI users found.</p>
                  : riseMembers.length ? riseMembers.map(member => (
                    <button key={member.memberNumber} type="button" className="block w-full border-b px-3 py-2 text-left last:border-0 hover:bg-muted" onClick={() => chooseRiseMember(member)}>
                      <span className="block text-sm font-medium">{member.name || member.memberNumber} · {member.memberNumber}</span>
                      <span className="block text-xs text-muted-foreground">{member.tier} · {member.phoneMasked}</span>
                    </button>
                  )) : <p className="px-3 py-2 text-sm text-muted-foreground">No RISE season pass orders found for this search.</p>}
              </div>
            )}
          </>
        )}
      </div>

      {loadingOrders && <p className="text-sm text-muted-foreground">Loading season pass history…</p>}
      {(selectedUser || selectedMember) && !loadingOrders && selectedOrders.length === 0 && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">No recoverable season pass orders were found for this recipient.</p>
      )}
      {selectedOrders.map(order => {
        const requiresReview = orderNeedsReview(order) || order.tickets.some(ticket => ['invalid', 'refunded', 'duplicate_valid', 'manual_intervention'].includes(ticket.status));
        const canRecover = !requiresReview && order.tickets.length === 10;
        const newKey = reissueKey(order);
        const preview = newReissuePreview[newKey];
        const draft = reissueDraft(order);
        const hasNewTicketTargets = Boolean(preview?.fixtures.some((fixture) => fixture.eligible && ['missing', 'cancelled'].includes(fixture.status)));
        const hasDashboardSyncRetry = preview?.dashboardSyncStatus === 'pending';
        const canOfferNewReissue = order.settlementType !== 'complimentary' && order.tickets.length === 10 && !['cancelled', 'refunded', 'failed'].includes(order.status);
        return (
          <article key={`${order.kind}-${order.orderId}`} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="m-0 font-semibold">{PASS_LABELS[order.passId]} · {order.ticketType}{order.zone ? ` · ${order.zone}` : ''}</h3>
                <p className="mb-0 mt-1 text-sm text-muted-foreground">{order.kind === 'online' ? 'Online paid pass' : order.kind === 'manual' ? 'AHIBI manual pass' : 'RISE pass'} · {order.settlementType || 'paid'} · Status: {order.ahibiStatus || order.status}</p>
              </div>
              <Button type="button" disabled={busy || !canRecover} onClick={() => void recover(order)}>
                {recoveringOrderId === order.orderId ? 'Recovering…' : channel === 'rise' && order.result?.status === 'recovered' ? 'Retry dashboard sync' : 'Recover / Reissue Tickets'}
              </Button>
            </div>
            {requiresReview && <p role="status" className="m-0 text-sm text-amber-800">This pass has a refunded, voided, duplicate, replaced, or otherwise invalid ticket state. No tickets were reissued; manual review is required.</p>}
            {!requiresReview && order.tickets.length !== 10 && <p role="status" className="m-0 text-sm text-amber-800">The complete ten-match status is unavailable, so recovery is paused for safe review.</p>}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {order.tickets.map(ticket => (
                <div key={`${order.orderId}-${ticket.matchIndex}`} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">Match {ticket.matchIndex}: {ticket.opponent}</span>
                  <span className="block text-xs text-muted-foreground">{ticket.matchDate || 'Date unavailable'} · {statusLabel(ticket.status)}</span>
                </div>
              ))}
            </div>
            {canOfferNewReissue && (
              <div className="space-y-3 border-t pt-3">
                <Button type="button" variant="outline" disabled={busy || newReissueLoadingId === order.orderId} onClick={() => void toggleNewReissue(order)}>
                  {newReissueLoadingId === order.orderId ? 'Checking paid entitlement...' : newReissueOrderKey === newKey ? 'Close New Ticket Reissue' : preview?.dashboardSyncStatus === 'pending' ? 'Retry NUSC Dashboard Sync' : 'Admin Reissue New Tickets'}
                </Button>
                {newReissueOrderKey === newKey && (
                  <div className="space-y-4 rounded-md border bg-muted/20 p-4">
                    <div>
                      <h4 className="m-0 font-semibold">New ticket reissue preview</h4>
                      <p className="mb-0 mt-1 text-sm text-muted-foreground">Uses the selected paid order. No new pass or payment is created. Missing ticket use and unmatched sold allocations require independent source references.</p>
                    </div>
                    {preview && (
                      <>
                        <div className={`rounded-md border p-3 text-sm ${preview.safe ? 'border-green-300 bg-green-50 text-green-900' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>
                          <strong>{preview.safe ? 'Ready for Admin approval' : 'Blocked for manual review'}</strong>
                          <span className="ml-2">Payment: {preview.paymentVerified ? 'verified' : 'not verified'} ({preview.paymentProof})</span>
                          {channel === 'rise' && <span className="ml-2">Replacement lineage: {preview.lineageVerified ? 'verified' : 'not verified'}</span>}
                          <span className="ml-2">Missing: {preview.missingCount}; valid: {preview.validCount}; checked in: {preview.checkedInCount}</span>
                          {channel === 'rise' && preview.dashboardSyncStatus === 'pending' && <span className="ml-2 font-medium">Dashboard sync pending - action will retry the signed sync only.</span>}
                        </div>
                        {!!preview.reasons.length && (
                          <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-amber-900">
                            {preview.reasons.map((reason, index) => <li key={`${reason.code}-${reason.matchIndex || 'all'}-${index}`}>
                              {reason.matchIndex ? `Match ${reason.matchIndex}: ` : ''}{reason.message} {reason.evidenceRequired}
                            </li>)}
                          </ul>
                        )}
                        <div className="space-y-2">
                          {preview.fixtures.map((fixture) => {
                            const relevantReasons = preview.reasons.filter((reason) => reason.matchIndex === fixture.matchIndex);
                            const needsUseEvidence = (fixture.eligible && ['missing', 'cancelled'].includes(fixture.status)) || relevantReasons.some((reason) => reason.code.startsWith('CHECKIN_EVIDENCE') || reason.code === 'USED_TICKET_EVIDENCE_MISSING');
                            const needsInventoryEvidence = fixture.inventory.reconciliationRequired || relevantReasons.some((reason) => reason.code.startsWith('INVENTORY_EVIDENCE'));
                            return (
                              <div key={`${newKey}-${fixture.matchIndex}`} className="space-y-2 rounded-md border bg-background p-3 text-sm">
                                <div className="flex flex-wrap justify-between gap-2">
                                  <span className="font-medium">Match {fixture.matchIndex}: {fixture.opponent} - {fixture.status.replace(/_/g, ' ')}</span>
                                  <span className="text-muted-foreground">Sold {fixture.inventory.sold ?? 'unknown'} / active {fixture.inventory.activeBookings} / held {fixture.inventory.activeHolds} / capacity {fixture.inventory.capacity ?? 'unknown'}</span>
                                </div>
                                <p className="m-0 break-all text-xs text-muted-foreground">Old ticket reference: {fixture.oldTicketReference || 'unavailable'}{fixture.inventory.soldDelta !== null ? ` - unmatched sold allocation: ${fixture.inventory.soldDelta}` : ''}</p>
                                {needsUseEvidence && fixture.oldTicketReference && (
                                  <div className="grid gap-2 md:grid-cols-2">
                                    <Label className="space-y-1">Prior-use finding
                                      <select className="h-10 w-full rounded-md border bg-background px-3" value={draft.historical[fixture.matchIndex]?.outcome || ''} onChange={(event) => updateReissueDraft(order, (current) => ({
                                        ...current,
                                        approved: false,
                                        historical: { ...current.historical, [fixture.matchIndex]: { outcome: event.target.value as '' | 'unused' | 'used', reference: current.historical[fixture.matchIndex]?.reference || '' } },
                                      }))}>
                                        <option value="">Select verified outcome</option>
                                        <option value="unused">Authoritative record confirms unused</option>
                                        <option value="used">Authoritative record confirms used</option>
                                      </select>
                                    </Label>
                                    <Label className="space-y-1">Independent check-in source reference
                                      <Input value={draft.historical[fixture.matchIndex]?.reference || ''} onChange={(event) => updateReissueDraft(order, (current) => ({
                                        ...current,
                                        approved: false,
                                        historical: { ...current.historical, [fixture.matchIndex]: { outcome: current.historical[fixture.matchIndex]?.outcome || '', reference: event.target.value } },
                                      }))} placeholder="Archive / scan export record ID" />
                                    </Label>
                                  </div>
                                )}
                                {needsInventoryEvidence && fixture.oldTicketReference && (
                                  <Label className="block space-y-1">Independent inventory attribution reference
                                    <Input value={draft.inventory[fixture.matchIndex] || ''} onChange={(event) => updateReissueDraft(order, (current) => ({ ...current, approved: false, inventory: { ...current.inventory, [fixture.matchIndex]: event.target.value } }))} placeholder="Reservation, booking, or inventory backup record ID" />
                                  </Label>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {preview.safe && !hasNewTicketTargets && !hasDashboardSyncRetry && <p className="m-0 text-sm text-muted-foreground">No missing or cancelled ticket needs a new identity. Existing tickets remain linked to this paid order.</p>}
                      </>
                    )}
                    <Button type="button" variant="outline" disabled={newReissueLoadingId === order.orderId} onClick={() => void loadNewReissuePreview(order)}>
                      {newReissueLoadingId === order.orderId ? 'Verifying...' : 'Verify evidence and refresh preview'}
                    </Button>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" checked={draft.approved} disabled={!preview?.safe || (!hasNewTicketTargets && !hasDashboardSyncRetry) || busy} onChange={(event) => updateReissueDraft(order, (current) => ({ ...current, approved: event.target.checked }))} />
                      <span>I reviewed the independent evidence and authorize fresh tickets only for the eligible missing or cancelled fixtures.</span>
                    </label>
                    <Button type="button" disabled={busy || !preview?.safe || (!hasNewTicketTargets && !hasDashboardSyncRetry) || !draft.approved} onClick={() => void reissueNewTickets(order)}>
                      {busy && newReissueLoadingId === order.orderId ? 'Issuing tickets...' : hasDashboardSyncRetry ? 'Confirm Dashboard Sync Retry' : 'Confirm Reissue New Tickets'}
                    </Button>
                    {newReissueResult[newKey] && (
                      <div role="status" className="space-y-1 text-sm">
                        <p className="m-0">Last result: {newReissueResult[newKey].status}; dashboard sync {newReissueResult[newKey].dashboardSync || newReissueResult[newKey].audit?.nuscSync || 'not required'}.</p>
                        {(newReissueResult[newKey].audit?.oldToNewReferences || []).map((reference: any) => (
                          <p key={`${reference.matchIndex}-${reference.oldBookingId}`} className="m-0 break-all text-xs text-muted-foreground">Match {reference.matchIndex}: superseded {reference.oldBookingId || 'missing reference'} - new {reference.newBookingId}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
