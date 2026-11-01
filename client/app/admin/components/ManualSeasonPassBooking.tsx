"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ManualSeasonPassRecovery from './ManualSeasonPassRecovery';

type Channel = 'ahibi' | 'rise';
type PassId = 'general-season' | 'premium-season';
type SettlementType = 'paid' | 'complimentary';

interface PassPrice {
  ticketType: string;
  amountMinor: number;
  amount: number;
}

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
  passId: PassId;
  expiresAt?: string | null;
}

interface PassOrder {
  orderId: string;
  status: string;
  passId: PassId;
  ticketType: string;
  zone: string | null;
  amountMinor: number;
  currency: string;
  settlementType?: SettlementType | null;
  modeOfPayment?: string | null;
  paymentMethod?: string | null;
  reservationExpiresAt?: string | null;
  bookingIds?: string[];
  bookings?: Array<Record<string, any>>;
  tickets?: Array<Record<string, any>>;
  errorCode?: string | null;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const PASS_LABELS: Record<PassId, string> = {
  'general-season': 'General Season Pass',
  'premium-season': 'Premium Season Pass',
};
const ZONES = ['G-1', 'G-2', 'G-3', 'G-4', 'G-5'];

function formatRupees(amountMinor: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amountMinor / 100);
}

function payloadData(response: any) {
  return response?.data?.data ?? response?.data ?? {};
}

function errorMessage(error: any) {
  return error?.response?.data?.message || error?.response?.data?.code || error?.message || 'Request failed. Retry this order before starting another.';
}

function adminHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` };
}

export default function ManualSeasonPassBooking() {
  const [operationMode, setOperationMode] = useState<'booking' | 'recovery'>('booking');
  const [channel, setChannel] = useState<Channel>('ahibi');
  const [query, setQuery] = useState('');
  const [ahibiUsers, setAhibiUsers] = useState<AhibiUser[]>([]);
  const [riseMembers, setRiseMembers] = useState<RiseMember[]>([]);
  const [selectedAhibiUser, setSelectedAhibiUser] = useState<AhibiUser | null>(null);
  const [selectedRiseMember, setSelectedRiseMember] = useState<RiseMember | null>(null);
  const [prices, setPrices] = useState<Partial<Record<Channel, Partial<Record<PassId, PassPrice>>>>>({});
  const [passId, setPassId] = useState<PassId>('general-season');
  const [zone, setZone] = useState('');
  const [settlementType, setSettlementType] = useState<SettlementType>('paid');
  const [modeOfPayment, setModeOfPayment] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [complimentaryReason, setComplimentaryReason] = useState('');
  const [order, setOrder] = useState<PassOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [reservationAttempted, setReservationAttempted] = useState(false);
  const searchId = useRef(0);
  const requestId = useRef(crypto.randomUUID());

  const selectedRecipient = channel === 'ahibi' ? selectedAhibiUser : selectedRiseMember;
  const currentPrice = prices[channel]?.[passId];
  const totalAmountMinor = order?.amountMinor ?? currentPrice?.amountMinor ?? 0;
  const displayName = selectedAhibiUser?.name || selectedRiseMember?.name?.trim() || '';
  const canSettle = Boolean(order && ['reserved', 'settling', 'needs_reconciliation'].includes(order.status));
  const successTickets = useMemo(() => order?.tickets || order?.bookings || [], [order]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      axios.get(`${API_URL}/api/admin/manual-season-passes/pricing`, { headers: adminHeaders() }),
      axios.get(`${API_URL}/api/admin/manual-season-passes/rise/members/search`, { params: { search: '' }, headers: adminHeaders() }),
    ]).then(([ahibiResult, riseResult]) => {
      if (active) {
        const ahibiPasses = ahibiResult.status === 'fulfilled' ? payloadData(ahibiResult.value).passes || {} : {};
        const risePasses = riseResult.status === 'fulfilled' ? payloadData(riseResult.value).passes || {} : {};
        setPrices({ ahibi: ahibiPasses, rise: risePasses });
        if (ahibiResult.status === 'rejected') setError(errorMessage(ahibiResult.reason));
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const text = query.trim();
    const id = ++searchId.current;
    if (selectedRecipient || text.length < (channel === 'ahibi' ? 2 : 5)) {
      setAhibiUsers([]);
      setRiseMembers([]);
      setSearching(false);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        const endpoint = channel === 'ahibi'
          ? `${API_URL}/api/admin/users/search`
          : `${API_URL}/api/admin/manual-season-passes/rise/members/search`;
        const response = await axios.get(endpoint, { params: { search: text }, headers: adminHeaders() });
        if (id !== searchId.current) return;
        const data = payloadData(response);
        if (channel === 'ahibi') setAhibiUsers(Array.isArray(data.users) ? data.users : []);
        else setRiseMembers(Array.isArray(data.members) ? data.members : []);
      } catch (requestError) {
        if (id === searchId.current) {
          setAhibiUsers([]);
          setRiseMembers([]);
          setError(errorMessage(requestError));
        }
      } finally {
        if (id === searchId.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [channel, query, selectedRecipient]);

  function resetAll() {
    setQuery('');
    setSelectedAhibiUser(null);
    setSelectedRiseMember(null);
    setPassId('general-season');
    setZone('');
    setSettlementType('paid');
    setModeOfPayment('');
    setPaymentReference('');
    setComplimentaryReason('');
    setOrder(null);
    setError('');
    setReservationAttempted(false);
    requestId.current = crypto.randomUUID();
  }

  async function reservePass(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRecipient) return setError(channel === 'ahibi' ? 'Select an active AHIBI user.' : 'Select an eligible RISE member.');
    if (passId === 'general-season' && !zone) return setError('Choose a General seating zone.');
    setBusy(true);
    setReservationAttempted(true);
    setError('');
    try {
      const isRise = channel === 'rise';
      const response = await axios.post(
        `${API_URL}/api/admin/manual-season-passes${isRise ? '/rise' : ''}/reserve`,
        {
          requestId: requestId.current,
          ...(isRise ? { memberNumber: selectedRiseMember!.memberNumber } : { userId: selectedAhibiUser!._id }),
          passId,
          zone: passId === 'general-season' ? zone : null,
        },
        { headers: { ...adminHeaders(), 'Content-Type': 'application/json' } },
      );
      setOrder(payloadData(response));
    } catch (requestError) {
      setError(errorMessage(requestError));
      const status = (requestError as any)?.response?.status;
      const code = (requestError as any)?.response?.data?.code;
      if ((status >= 400 && status < 500) || ['NUSC_RISE_NOT_CONFIGURED', 'NUSC_RISE_URL_INVALID'].includes(code)) {
        setReservationAttempted(false);
        requestId.current = crypto.randomUUID();
      }
    } finally {
      setBusy(false);
    }
  }

  async function settlePass(event: React.FormEvent) {
    event.preventDefault();
    if (!order) return;
    if (settlementType === 'paid' && !modeOfPayment) return setError('Choose Cash, Card, or UPI.');
    if (settlementType === 'complimentary' && complimentaryReason.trim().length < 5) return setError('Enter a complimentary booking reason.');
    setBusy(true);
    setError('');
    try {
      const isRise = channel === 'rise';
      const response = await axios.post(
        `${API_URL}/api/admin/manual-season-passes${isRise ? '/rise' : ''}/${encodeURIComponent(order.orderId)}/settle`,
        {
          settlementType,
          modeOfPayment: settlementType === 'paid' ? modeOfPayment : undefined,
          paymentReference: settlementType === 'paid' ? paymentReference.trim() || undefined : undefined,
          complimentaryReason: settlementType === 'complimentary' ? complimentaryReason.trim() : undefined,
        },
        { headers: { ...adminHeaders(), 'Content-Type': 'application/json' } },
      );
      setOrder(payloadData(response));
    } catch (requestError) {
      setError(errorMessage(requestError));
      if (channel === 'rise' && order) {
        try {
          const status = await axios.get(`${API_URL}/api/admin/manual-season-passes/rise/${encodeURIComponent(order.orderId)}/status`, { headers: adminHeaders() });
          const latest = payloadData(status);
          if (latest?.status) setOrder(latest);
        } catch { /* The next manual retry is idempotent and checks the same order. */ }
      } else if (channel === 'ahibi' && order) {
        try {
          const status = await axios.get(`${API_URL}/api/admin/manual-season-passes/${encodeURIComponent(order.orderId)}/status`, { headers: adminHeaders() });
          const latest = payloadData(status);
          if (latest?.status) setOrder(latest);
        } catch { /* The next manual retry is idempotent and checks the same order. */ }
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancelPass() {
    if (!order) return;
    setBusy(true);
    setError('');
    try {
      const isRise = channel === 'rise';
      const response = await axios.post(
        `${API_URL}/api/admin/manual-season-passes${isRise ? '/rise' : ''}/${encodeURIComponent(order.orderId)}/cancel`,
        {},
        { headers: { ...adminHeaders(), 'Content-Type': 'application/json' } },
      );
      setOrder(payloadData(response));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (operationMode === 'recovery') {
    return (
      <section className="space-y-5" aria-labelledby="season-pass-operations-heading">
        <div className="space-y-3">
          <h2 id="season-pass-operations-heading" className="text-lg font-semibold">Season Pass Operations</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setOperationMode('booking')}>Book Season Pass</Button>
            <Button type="button" variant="default" aria-pressed="true">Recover / Reissue Tickets</Button>
          </div>
        </div>
        <ManualSeasonPassRecovery />
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="manual-season-pass-heading">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" aria-pressed="true">Book Season Pass</Button>
        <Button type="button" variant="outline" onClick={() => setOperationMode('recovery')}>Recover / Reissue Tickets</Button>
      </div>
      <div>
        <h2 id="manual-season-pass-heading" className="text-lg font-semibold">Season Pass Booking</h2>
        <p className="text-sm text-muted-foreground">Reserve capacity first, then record offline payment or a complimentary issue. Each pass creates one ticket for each of the ten home matches.</p>
      </div>

      {error && <Alert variant="destructive"><AlertTitle>Season pass request</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {order?.status === 'issued' ? (
        <Alert className="border-green-200 bg-green-50 text-green-900">
          <AlertTitle>Season pass issued</AlertTitle>
          <AlertDescription>
            {PASS_LABELS[order.passId]} issued for {displayName || (channel === 'rise' ? selectedRiseMember?.memberNumber : 'the selected AHIBI user')}.
            {' '}Recorded total: {formatRupees(order.amountMinor)}. {successTickets.length || 10} match tickets are now available in the recipient account.
          </AlertDescription>
        </Alert>
      ) : order?.status === 'cancelled' ? (
        <Alert><AlertTitle>Reservation cancelled</AlertTitle><AlertDescription>The held inventory has been released. No tickets were issued.</AlertDescription></Alert>
      ) : null}

      {!order && (
        <form onSubmit={reservePass} className="space-y-5">
          <fieldset disabled={busy || reservationAttempted} className="space-y-5 disabled:opacity-75">
            <div className="space-y-2">
              <Label>Recipient account</Label>
              <div className="flex flex-wrap gap-2">
                {(['ahibi', 'rise'] as const).map((value) => (
                  <Button key={value} type="button" variant={channel === value ? 'default' : 'outline'} onClick={() => { setChannel(value); setQuery(''); setSelectedAhibiUser(null); setSelectedRiseMember(null); setError(''); requestId.current = crypto.randomUUID(); }}>
                    {value === 'ahibi' ? 'AHIBI user' : 'NUSC RISE member'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-pass-recipient-search">{channel === 'ahibi' ? 'Search AHIBI users' : 'Search RISE members'}</Label>
              {selectedAhibiUser || selectedRiseMember ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
                  <p className="m-0 text-sm">
                    <strong>{displayName}</strong>{' '}
                    {selectedAhibiUser ? [selectedAhibiUser.email, selectedAhibiUser.phone].filter(Boolean).join(' · ') : `${selectedRiseMember?.memberNumber} · ${selectedRiseMember?.tier} · ${selectedRiseMember?.phoneMasked}`}
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedAhibiUser(null); setSelectedRiseMember(null); setQuery(''); requestId.current = crypto.randomUUID(); }}>Change recipient</Button>
                </div>
              ) : (
                <>
                  <Input id="manual-pass-recipient-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={channel === 'ahibi' ? 'Name, email, or phone' : 'NUSC membership number or full phone number'} autoComplete="off" />
                  {searching && <p className="text-sm text-muted-foreground">Searching…</p>}
                  {!searching && query.trim().length >= (channel === 'ahibi' ? 2 : 5) && (
                    <div className="max-h-56 overflow-y-auto rounded-md border">
                      {(channel === 'ahibi' ? ahibiUsers : riseMembers).length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No eligible recipients found.</p>
                      ) : channel === 'ahibi' ? ahibiUsers.map((user) => (
                        <button key={user._id} type="button" className="block w-full border-b px-3 py-2 text-left last:border-0 hover:bg-muted" onClick={() => { setSelectedAhibiUser(user); setQuery(''); requestId.current = crypto.randomUUID(); }}>
                          <span className="block text-sm font-medium">{user.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{[user.email, user.phone].filter(Boolean).join(' · ')}</span>
                        </button>
                      )) : riseMembers.map((member) => (
                        <button key={member.memberNumber} type="button" className="block w-full border-b px-3 py-2 text-left last:border-0 hover:bg-muted" onClick={() => { setSelectedRiseMember(member); setPassId(member.passId); setZone(''); setQuery(''); requestId.current = crypto.randomUUID(); }}>
                          <span className="block text-sm font-medium">{member.name.trim() || member.memberNumber} · {member.memberNumber}</span>
                          <span className="block text-xs text-muted-foreground">{member.tier} · {member.phoneMasked}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manual-season-pass-type">Season pass</Label>
                <select id="manual-season-pass-type" value={passId} disabled={channel === 'rise' && Boolean(selectedRiseMember)} onChange={(event) => { setPassId(event.target.value as PassId); setZone(''); requestId.current = crypto.randomUUID(); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {(['general-season', 'premium-season'] as const).map((id) => <option key={id} value={id}>{PASS_LABELS[id]}</option>)}
                </select>
              </div>
              {passId === 'general-season' && <div className="space-y-2">
                <Label htmlFor="manual-season-pass-zone">General seating zone</Label>
                <select id="manual-season-pass-zone" value={zone} onChange={(event) => { setZone(event.target.value); requestId.current = crypto.randomUUID(); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Choose a zone</option>
                  {ZONES.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>}
            </div>

            <div className="rounded-md bg-muted/40 p-4 text-sm">
              <div className="flex justify-between gap-3"><span>{PASS_LABELS[passId]} · 10 match tickets</span><strong>{currentPrice ? formatRupees(currentPrice.amountMinor) : 'Price unavailable'}</strong></div>
              <p className="mb-0 mt-2 text-xs text-muted-foreground">The server sets the price. This is the total payable for the selected sales channel.</p>
            </div>

          </fieldset>
          {!reservationAttempted ? (
              <Button type="submit" disabled={busy || !selectedRecipient || !currentPrice || (passId === 'general-season' && !zone)}>{busy ? 'Reserving inventory…' : 'Reserve Season Pass'}</Button>
            ) : (
              <div className="space-y-2">
                <Alert><AlertTitle>Reservation response not confirmed</AlertTitle><AlertDescription>Retry with the same request to retrieve the existing reservation. Keep this recipient and pass selection unchanged.</AlertDescription></Alert>
                <Button type="submit" disabled={busy}>{busy ? 'Checking reservation…' : 'Retry reservation'}</Button>
              </div>
            )}
        </form>
      )}

      {order && !['issued', 'cancelled'].includes(order.status) && (
        <div className="space-y-5 rounded-lg border p-4">
          <div>
            <h3 className="font-semibold">{PASS_LABELS[order.passId]} · {order.ticketType}</h3>
            <p className="mb-1 mt-1 text-sm text-muted-foreground">Recipient: {displayName || (channel === 'rise' ? selectedRiseMember?.memberNumber : 'selected AHIBI account')}{selectedRiseMember ? ` (${selectedRiseMember.memberNumber})` : ''}</p>
            <p className="m-0 text-sm">{order.zone ? `Zone ${order.zone} · ` : ''}Total: <strong>{formatRupees(totalAmountMinor)}</strong> · Status: {order.status}</p>
            {order.reservationExpiresAt && order.status === 'reserved' && <p className="mb-0 mt-1 text-xs text-amber-700">Inventory hold expires {new Date(order.reservationExpiresAt).toLocaleString()}.</p>}
            {order.errorCode && <p className="mb-0 mt-1 text-xs text-amber-700">Recovery reference: {order.errorCode}</p>}
          </div>

          {canSettle && <form onSubmit={settlePass} className="space-y-4">
            <div className="space-y-2">
              <Label>Settlement type</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={settlementType === 'paid' ? 'default' : 'outline'} onClick={() => setSettlementType('paid')}>Paid offline</Button>
                <Button type="button" variant={settlementType === 'complimentary' ? 'default' : 'outline'} onClick={() => setSettlementType('complimentary')}>Complimentary</Button>
              </div>
            </div>
            {settlementType === 'paid' ? <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manual-season-pass-payment-method">Mode of payment</Label>
                <select id="manual-season-pass-payment-method" value={modeOfPayment} onChange={(event) => setModeOfPayment(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Choose Cash, Card, or UPI</option>
                  {['Cash', 'Card', 'UPI'].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label htmlFor="manual-season-pass-payment-reference">Payment reference (optional)</Label><Input id="manual-season-pass-payment-reference" maxLength={120} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Receipt or terminal reference" /></div>
            </div> : <div className="space-y-2"><Label htmlFor="manual-season-pass-complimentary-reason">Complimentary reason</Label><Input id="manual-season-pass-complimentary-reason" minLength={5} maxLength={500} value={complimentaryReason} onChange={(event) => setComplimentaryReason(event.target.value)} placeholder="Reason and approval reference" /></div>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>{busy ? 'Recording and issuing…' : order.settlementType ? 'Retry issuance' : `Record settlement and issue · ${formatRupees(totalAmountMinor)}`}</Button>
              {!order.settlementType && order.status === 'reserved' && <Button type="button" variant="outline" disabled={busy} onClick={cancelPass}>Cancel reservation</Button>}
            </div>
            {order.settlementType && <p className="m-0 text-xs text-amber-700">Settlement is already recorded. Retry will use the existing record; do not collect payment again.</p>}
          </form>}
        </div>
      )}

      {order && ['issued', 'cancelled'].includes(order.status) && <div className="flex justify-end"><Button type="button" variant="outline" onClick={resetAll}>Book Another Season Pass</Button></div>}
    </section>
  );
}
