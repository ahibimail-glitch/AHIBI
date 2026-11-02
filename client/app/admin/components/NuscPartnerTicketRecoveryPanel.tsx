"use client";

import { useState, type FormEvent } from 'react';
import axios from 'axios';

type RecoveryFixture = {
  matchIndex: number;
  matchDate: string | null;
  eligible: boolean;
  ticketReference: string | null;
  premiumBookingStatus: string;
  generalBookingPresent: boolean;
  scanRecordsFound: number;
  premiumScanRecordsFound: number;
  inventory: {
    sold: number | null;
    activeBookings: number;
    activeHolds: number | null;
    capacity: number | null;
    projectedOccupancy: number | null;
    status: string;
  };
};

type RecoveryResult = {
  status: 'ready' | 'blocked' | 'pending' | 'completed';
  safe: boolean;
  orderId: string;
  reservationId?: string;
  paymentReferencePresent: boolean;
  paymentProof?: string;
  lineage?: { verified: boolean; generalReservationStatus: string };
  replacementDecision?: {
    verified: boolean;
    usedTicketCount: number | null;
    cancelledUnusedTicketCount: number | null;
    eligibleMatchIndices: number[];
  };
  generalBookingCount: number;
  expectedGeneralBookingCount: number;
  scanRecordCount: number;
  scanInterpretation: string;
  eligibleCount: number;
  missingCount: number;
  existingCount: number;
  restoredTicketCount?: number;
  signedDashboardSync?: string;
  fixtures: RecoveryFixture[];
  reasons: Array<{ code: string; message: string; evidenceRequired: string; matchIndex?: number }>;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

function adminHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` };
}

function responseErrorMessage(error: any) {
  return error?.response?.data?.message || error?.response?.data?.code || error?.message || 'Recovery checks could not be completed.';
}

function recoveryUrl(orderId: string) {
  return `${API_URL}/api/admin/nusc-home-matches/partner-season-passes/${encodeURIComponent(orderId)}`;
}

export default function NuscPartnerTicketRecoveryPanel() {
  const [orderId, setOrderId] = useState('');
  const [result, setResult] = useState<RecoveryResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedOrderId = orderId.trim();
    if (!selectedOrderId) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await axios.get(`${recoveryUrl(selectedOrderId)}/recovery-preview`, { headers: adminHeaders() });
      setResult(response.data?.recovery || null);
    } catch (requestError) {
      setError(responseErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  const canRetryReadback = result?.status === 'pending' && result.signedDashboardSync === 'PENDING_SIGNED_READBACK' && result.missingCount === 0;
  const canRecover = Boolean(result && ((result.safe && result.missingCount > 0) || canRetryReadback));

  async function recover() {
    if (!result || !canRecover) return;
    const confirmation = canRetryReadback
      ? `Retry the existing signed reservation readback for paid order ${result.orderId}? No tickets will be issued.`
      : `Restore ${result.missingCount} missing ticket record(s) against existing paid order ${result.orderId}? No new order or charge will be created.`;
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    setError('');
    try {
      const response = await axios.post(`${recoveryUrl(result.orderId)}/recover-missing-tickets`, {}, { headers: adminHeaders() });
      setResult(response.data?.recovery || null);
    } catch (requestError) {
      setError(responseErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4" aria-labelledby="nusc-partner-recovery-heading">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Existing paid NUSC entitlement</p>
        <h3 id="nusc-partner-recovery-heading" className="mt-1 font-semibold">Partner Premium ticket recovery</h3>
        <p className="mt-1 text-sm text-muted-foreground">Preview the signed order lineage, saved replacement decision, ticket references, check-in evidence, conflicts, and fixture inventory. Recovery only restores missing ticket rows for this order.</p>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={preview}>
        <label className="min-w-0 flex-1 text-sm font-medium">
          NUSC order ID
          <input
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            maxLength={120}
            required
            autoComplete="off"
            placeholder="Existing paid Premium order ID"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
          />
        </label>
        <button type="submit" disabled={busy || !orderId.trim()} className="self-end rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {busy ? 'Checking...' : 'Preview recovery'}
        </button>
      </form>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      {result && <div className="space-y-3 border-t border-slate-200 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-muted-foreground">Order {result.orderId}</p>
            <p role="status" className="mt-1 text-sm font-semibold">
              {result.status === 'ready' ? 'Preflight passed' : result.status === 'completed' ? 'Recovery completed' : result.status === 'pending' ? 'Recovery pending' : 'Manual review required'}
            </p>
          </div>
          <button type="button" onClick={() => void recover()} disabled={busy || !canRecover} className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? 'Working...' : canRetryReadback ? 'Retry signed readback' : `Recover ${result.missingCount} missing ticket(s)`}
          </button>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p className="rounded-md bg-background p-3"><span className="block text-xs text-muted-foreground">Paid reference</span><strong>{result.paymentReferencePresent ? 'Present' : 'Unverified'}</strong></p>
          <p className="rounded-md bg-background p-3"><span className="block text-xs text-muted-foreground">Replacement lineage</span><strong>{result.lineage?.verified ? 'Verified' : 'Unverified'}</strong></p>
          <p className="rounded-md bg-background p-3"><span className="block text-xs text-muted-foreground">Saved decision</span><strong>{result.replacementDecision?.verified ? `${result.replacementDecision.usedTicketCount} used / ${result.replacementDecision.cancelledUnusedTicketCount} cancelled` : 'Unverified'}</strong></p>
          <p className="rounded-md bg-background p-3"><span className="block text-xs text-muted-foreground">Original history / scans</span><strong>{result.generalBookingCount}/{result.expectedGeneralBookingCount} bookings / {result.scanRecordCount} scan rows</strong></p>
        </div>
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">{result.scanInterpretation}</p>
        {result.signedDashboardSync && <p className="text-sm">Signed same-order NUSC readback: <strong>{result.signedDashboardSync.replaceAll('_', ' ')}</strong></p>}
        {result.reasons.length > 0 && <div className="space-y-2" role="alert">
          <h4 className="text-sm font-semibold text-red-900">Manual review reasons</h4>
          {result.reasons.map((reason, index) => <div key={`${reason.code}-${reason.matchIndex || index}`} className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-950">
            <strong>{reason.code.replaceAll('_', ' ')}{reason.matchIndex ? ` / Fixture ${String(reason.matchIndex).padStart(2, '0')}` : ''}</strong>
            <p className="mt-1">{reason.message}</p>
            <p className="mt-1 text-xs">Evidence needed: {reason.evidenceRequired}</p>
          </div>)}
        </div>}
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="min-w-[860px] w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground"><tr><th className="p-2">Fixture</th><th className="p-2">Eligible</th><th className="p-2">Premium row</th><th className="p-2">General row</th><th className="p-2">Scans G / P</th><th className="p-2">Sold / active</th><th className="p-2">Holds / capacity</th><th className="p-2">Inventory</th></tr></thead>
            <tbody className="divide-y">{result.fixtures.map((fixture) => <tr key={fixture.matchIndex}>
              <td className="p-2">{String(fixture.matchIndex).padStart(2, '0')} / {fixture.matchDate || 'date unavailable'}</td>
              <td className="p-2">{fixture.eligible ? 'Yes' : 'No'}</td>
              <td className="p-2">{fixture.premiumBookingStatus}{fixture.ticketReference ? ` / ${fixture.ticketReference.slice(0, 8)}...` : ''}</td>
              <td className="p-2">{fixture.generalBookingPresent ? 'Present' : 'Missing'}</td>
              <td className="p-2">{fixture.scanRecordsFound} / {fixture.premiumScanRecordsFound}</td>
              <td className="p-2">{fixture.inventory.sold ?? '-'} / {fixture.inventory.activeBookings}</td>
              <td className="p-2">{fixture.inventory.activeHolds ?? '-'} / {fixture.inventory.capacity ?? '-'}</td>
              <td className="p-2">{fixture.inventory.status.replaceAll('_', ' ')}{fixture.inventory.projectedOccupancy !== null ? ` / projected ${fixture.inventory.projectedOccupancy}` : ''}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">This action preserves the existing paid order and ticket references. It does not charge again or create another season pass.</p>
      </div>}
    </section>
  );
}
