"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  capacityCount,
  capacityRowIsEditable,
  committedCapacityCount,
  formatCapacityMetric,
} from "@/lib/nuscTicketCapacityMetrics";

type CapacityRow = {
  matchDate: string | null;
  ticketType: string;
  label: string;
  unit: string;
  capacity?: number | null;
  defaultCapacity: number;
  maxCapacity?: number | null;
  sold?: number | null;
  held?: number | null;
  offlineReserved?: number | null;
  available?: number | null;
  limitingMatchAvailability?: number;
  updatedAt?: string | null;
};

type FixtureCapacity = {
  matchDate: string;
  opponent: string;
  capacities: CapacityRow[];
};

type CapacityOverview = {
  salesEnabled: boolean;
  fixtures: FixtureCapacity[];
  singleMatchTicket: CapacityRow;
  seasonPasses: CapacityRow[];
  seasonBoxes: CapacityRow;
};

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

function rowKey(row: CapacityRow) {
  return `${row.matchDate || "global"}:${row.ticketType}`;
}

function committedCount(row: CapacityRow) {
  return committedCapacityCount(row);
}

export default function NuscTicketCapacityControls() {
  const [overview, setOverview] = useState<CapacityOverview | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const token = useMemo(() => (
    typeof window === "undefined" ? "" : localStorage.getItem("admin_token") || ""
  ), []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${apiUrl}/api/admin/nusc-home-matches/availability`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Unable to load NUSC ticket capacity.");
      setOverview(body.overview as CapacityOverview);
      setDrafts({});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load NUSC ticket capacity.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const saveCapacity = async (row: CapacityRow) => {
    const key = rowKey(row);
    const committed = committedCount(row);
    const currentCapacity = capacityCount(row.capacity);
    const maxCapacity = capacityCount(row.maxCapacity);
    if (!capacityRowIsEditable(row) || committed === null || currentCapacity === null || maxCapacity === null) {
      toast.error("Capacity details are incomplete. Reload the page before changing this row.");
      return;
    }

    const capacity = Number(drafts[key] ?? currentCapacity);
    if (!Number.isInteger(capacity) || capacity < committed || capacity > maxCapacity) {
      toast.error(`Enter a whole number from ${committed} to ${maxCapacity}.`);
      return;
    }
    setBusyKey(key);
    try {
      const response = await fetch(`${apiUrl}/api/admin/nusc-home-matches/availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchDate: row.matchDate, ticketType: row.ticketType, capacity }),
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Unable to update ticket capacity.");
      toast.success(`${row.label} capacity updated.`);
      await loadOverview();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update ticket capacity.";
      toast.error(message);
      await loadOverview();
    } finally {
      setBusyKey(null);
    }
  };

  const renderRow = (row: CapacityRow) => {
    const key = rowKey(row);
    const currentCapacity = capacityCount(row.capacity);
    const maxCapacity = capacityCount(row.maxCapacity);
    const committed = committedCount(row);
    const rowEditable = capacityRowIsEditable(row);
    const draftValue = drafts[key] ?? (currentCapacity === null ? "" : String(currentCapacity));
    const changed = currentCapacity !== null && Number(draftValue) !== currentCapacity;
    return (
      <div key={key} className="grid grid-cols-2 gap-3 border-t border-slate-100 py-4 sm:grid-cols-[minmax(180px,1.4fr)_100px_repeat(4,minmax(68px,0.7fr))_96px] sm:items-center sm:gap-4">
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <p className="font-medium text-slate-900">{row.label}</p>
          <p className="text-xs text-slate-500">{row.unit}{row.matchDate ? ` · ${row.matchDate}` : " · all matches"}</p>
        </div>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          <span>Capacity</span>
          <input
            aria-label={`${row.label} capacity${row.matchDate ? ` for ${row.matchDate}` : ""}`}
            className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
            type="number"
            min={committed ?? undefined}
            max={maxCapacity ?? undefined}
            step={1}
            value={draftValue}
            disabled={!rowEditable}
            onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
          />
          <span>Max {formatCapacityMetric(row.maxCapacity)}</span>
        </label>
        <Metric label="Sold" value={row.sold} />
        <Metric label="Held" value={row.held} />
        <Metric label="Reserved" value={row.offlineReserved} />
        <Metric label="Available" value={row.available} strong />
        <Button
          type="button"
          size="sm"
          disabled={!changed || !rowEditable || busyKey !== null || loading}
          onClick={() => void saveCapacity(row)}
          className="col-span-2 sm:col-span-1"
        >
          {busyKey === key ? "Saving…" : "Save"}
        </Button>
        {!rowEditable && (
          <p className="col-span-2 text-xs text-amber-700 sm:col-span-7">
            Some capacity counts are missing. This row is read-only until all counts load.
          </p>
        )}
      </div>
    );
  };

  if (loading && !overview) {
    return <div className="p-6 text-sm text-slate-600">Loading NUSC availability…</div>;
  }

  if (!overview) {
    return (
      <section className="space-y-4 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">NUSC ticket availability</h1>
          <p className="mt-1 text-sm text-slate-600">Adjust per-match seats, VIP boxes, and season pass limits.</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError || "Capacity information is unavailable."}</div>
        <Button onClick={() => void loadOverview()}>Try again</Button>
      </section>
    );
  }

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">NUSC ticket availability</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Set the total capacity for each ticket type. Sold tickets, checkout holds, offline reservations, and season box reservations remain committed.
          </p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${overview.salesEnabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
          Sales {overview.salesEnabled ? "open" : "closed"}
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">Single Match ticket</h2>
        <p className="mb-3 text-sm text-slate-500">Global availability shared across all 10 fixtures.</p>
        {renderRow(overview.singleMatchTicket)}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">Season pass and season box limits</h2>
        <p className="mb-3 text-sm text-slate-500">Season pass availability also follows the lowest remaining per-match inventory.</p>
        {[...overview.seasonPasses, overview.seasonBoxes].map(renderRow)}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Per-match seats and boxes</h2>
          <p className="mt-1 text-sm text-slate-500">Season box reservations reduce the Full Box availability on every fixture.</p>
        </div>
        {overview.fixtures.map((fixture) => (
          <article key={fixture.matchDate} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="font-semibold text-slate-900">{fixture.matchDate} · NUSC vs {fixture.opponent}</h3>
            <div className="mt-2">{fixture.capacities.map(renderRow)}</div>
          </article>
        ))}
      </section>
      {loadError && <p role="status" className="text-sm text-red-700">{loadError}</p>}
    </section>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: number | null | undefined; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-sm ${strong ? "font-semibold text-slate-900" : "text-slate-700"}`}>{formatCapacityMetric(value)}</p>
    </div>
  );
}
