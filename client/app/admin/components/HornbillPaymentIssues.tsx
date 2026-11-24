"use client";

import { useEffect, useState } from "react";
import FailedPayments from "./FailedPayments";

type EventRecord = { _id: string; title?: string; slug?: string; startDate?: string };
type Attempt = {
  paymentId: string;
  code?: string | null;
  description?: string | null;
  method?: string | null;
  amount?: number | null;
  occurredAt?: string;
};
type FailureCase = {
  _id: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  status: string;
  createdAt: string;
  user?: { name?: string; email?: string; phone?: string } | null;
  paymentFailures: Attempt[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function HornbillPaymentIssues({ kind }: { kind: "day" | "music" }) {
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [items, setItems] = useState<FailureCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const title = kind === "music" ? "Hornbill Music Festival" : "Hornbill Festival";

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/events?limit=1000&includePast=true`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const events: EventRecord[] = Array.isArray(payload?.data?.events) ? payload.data.events : [];
        const matches = events.filter((event) => {
          const label = `${event.title || ""} ${event.slug || ""}`.toLowerCase();
          const isYear2026 = label.includes("2026") || String(event.startDate || "").startsWith("2026-");
          const isOldShowcase = label.includes("ticket-to-hornbill-showcase") || label.includes("showcase day1");
          return !isOldShowcase && isYear2026 && label.includes("hornbill") && label.includes("festival") &&
            (kind === "music" ? label.includes("music") : !label.includes("music"));
        }).map((event) => event._id);
        if (active) {
          setEventIds([...new Set(matches)]);
          setEventsLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not load the festival event record. Refresh this report and try again.");
          setEventsLoaded(true);
        }
      });
    return () => { active = false; };
  }, [kind]);

  useEffect(() => {
    if (!eventsLoaded || eventIds.length === 0) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("admin_token") || "";
        const params = new URLSearchParams({ eventIds: eventIds.join(",") });
        const response = await fetch(`${API_URL}/api/admin/payments/event-failures?${params}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          credentials: "include",
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || "Could not load failed payment attempts.");
        if (active) setItems(Array.isArray(body.data?.items) ? body.data.items : []);
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : "Could not load failed payment attempts.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [eventIds, eventsLoaded, refreshCount]);

  return (
    <main className="w-full min-w-0 space-y-6 p-4 md:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Payment monitoring · Hornbill 2026</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">{title} payment issues</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          Review Razorpay payment attempts and captured payments awaiting ticket issuance. Failed attempts are not proof that no payment was captured; check the captured-payment recovery list before advising a customer to pay again.
        </p>
      </header>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Captured payments with missing tickets can be safely reconciled from the section below. The action verifies the payment with Razorpay before confirming tickets. A new payment attempt must be initiated by the customer.
      </section>

      {eventsLoaded && eventIds.length > 0 ? (
        <FailedPayments eventIds={eventIds} title={`${title}: captured payment, tickets pending`} />
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          {eventsLoaded ? "No matching approved 2026 festival event was found." : "Loading event records…"}
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-950">Failed Razorpay attempts</h2>
            <p className="text-xs text-slate-500">Failed attempts recorded from signed Razorpay webhooks; a later successful attempt may exist for the same order.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{loading ? "Loading…" : `${items.length} order(s)`}</span>
            <button type="button" onClick={() => setRefreshCount((count) => count + 1)} disabled={loading || eventIds.length === 0} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50">Refresh</button>
          </div>
        </div>
        {error && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {!error && !loading && items.length === 0 && (
          <p className="p-5 text-sm text-slate-500">No failed attempts have been recorded for this event.</p>
        )}
        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Latest failure</th><th className="px-4 py-3">Method / code</th><th className="px-4 py-3">Order state</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Time</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const attempt = item.paymentFailures[0];
                  return (
                    <tr key={item._id}>
                      <td className="px-4 py-3"><div className="font-medium">{item.user?.name || "Unknown"}</div><div className="text-xs text-slate-500">{item.user?.email || item.user?.phone || "No contact saved"}</div></td>
                      <td className="px-4 py-3">{item.currency || "INR"} {Number(item.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3"><div>{attempt?.description || "Payment attempt failed"}</div><div className="font-mono text-xs text-slate-500">{attempt?.paymentId || ""}</div></td>
                      <td className="px-4 py-3">{attempt?.method || "—"}{attempt?.code ? ` · ${attempt.code}` : ""}</td>
                      <td className="px-4 py-3 capitalize">{item.status.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.orderId || "—"}</td>
                      <td className="px-4 py-3">{attempt?.occurredAt ? new Date(attempt.occurredAt).toLocaleString() : new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
