"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Buyer = { name?: string; email?: string; phone?: string } | null;

type PaidNoBookingOrder = {
  _id: string;
  orderId: string;
  paymentId: string;
  orderType: "match" | "multiMatch" | "seasonPass";
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  paymentCreatedAt: string | null;
  user: Buyer;
  event: { title?: string; startDate?: string } | null;
  bookingDetails?: {
    ticketType?: string;
    quantity?: number;
    user?: Buyer;
    tickets?: Array<{ ticketType: string; quantity: number }>;
  };
  errorMessage?: string | null;
  expectedTicketCount: number | null;
  ticketRecordCount: number;
  issuedTicketCount: number;
  dashboardTicketCount: number;
  missingTicketCount: number | null;
  recoveryAvailable: boolean;
  dashboardAccessRepairAvailable: boolean;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function NuscPaidNoBooking() {
  const [orders, setOrders] = useState<PaidNoBookingOrder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [verificationIssueCount, setVerificationIssueCount] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const token = useMemo(() => (
    typeof window === "undefined" ? "" : localStorage.getItem("admin_token") || ""
  ), []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${apiUrl}/api/admin/nusc-home-matches/paid-no-booking`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || "Unable to load paid NUSC orders.");
      }
      setOrders(Array.isArray(body.orders) ? body.orders : []);
      setVerificationIssueCount(Number(body.verificationIssueCount) || 0);
    } catch (error) {
      setOrders([]);
      setVerificationIssueCount(0);
      const message = error instanceof Error ? error.message : "Unable to load paid NUSC orders.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => {
      const buyer = order.user || order.bookingDetails?.user;
      return [
        buyer?.name,
        buyer?.email,
        buyer?.phone,
        order.orderId,
        order.paymentId,
        order.event?.title,
        order.bookingDetails?.ticketType,
      ].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [orders, search]);

  const recoverOrder = async (order: PaidNoBookingOrder) => {
    if (!order.recoveryAvailable || busyId || loading) return;
    const confirmed = window.confirm(
      `Razorpay confirms this payment was captured. Reconcile this order so the purchasing account can see all expected tickets? Missing ticket records will be issued and eligible existing records will be linked to the correct account.`,
    );
    if (!confirmed) return;

    setBusyId(order._id);
    try {
      const response = await fetch(
        `${apiUrl}/api/admin/nusc-home-matches/orders/${encodeURIComponent(order._id)}/retry-fulfillment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentId: order.paymentId }),
          credentials: "include",
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Ticket recovery did not complete.");
      toast.success(body.message || "NUSC tickets issued.");
      await loadOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ticket recovery did not complete.";
      toast.error(message);
      await loadOrders();
    } finally {
      setBusyId(null);
    }
  };

  const repairDashboardAccess = async (order: PaidNoBookingOrder) => {
    if (!order.dashboardAccessRepairAvailable || busyId || loading) return;
    const confirmed = window.confirm(
      "Razorpay confirms this payment was captured and the complete ticket set exists. Link the unused tickets to the purchasing account so they appear in the customer's dashboard?",
    );
    if (!confirmed) return;

    setBusyId(order._id);
    try {
      const response = await fetch(
        `${apiUrl}/api/admin/nusc-home-matches/orders/${encodeURIComponent(order._id)}/repair-dashboard-access`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Dashboard access repair did not complete.");
      toast.success(body.message || "Dashboard access repaired.");
      await loadOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dashboard access repair did not complete.";
      toast.error(message);
      await loadOrders();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="w-full min-w-0 space-y-5 p-4 md:p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">NUSC · I-League Home Matches</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Paid but Not Booked</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Captured NUSC payments where the purchasing account cannot see all the tickets it bought. This checks the same account ownership and paid-status rules used by the customer profile.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Open NUSC cases</p>
          <p className="text-2xl font-bold text-slate-950">{orders.length}</p>
        </div>
        <label className="w-full max-w-xl text-sm font-medium text-slate-700">
          Search customers and orders
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, phone, order ID, or payment ID"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 focus-visible:ring-red-500"
          />
        </label>
      </section>

      {verificationIssueCount > 0 && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {verificationIssueCount} potential order(s) could not be confirmed as captured by Razorpay, so they are not included in this paid-customer list. Refresh after checking provider availability.
        </div>
      )}

      {loadError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{loadError}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-950">Customers with missing NUSC tickets</h2>
          <span className="text-sm text-slate-500">{visibleOrders.length} case(s)</span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="min-w-[1180px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Match / ticket</th>
                <th className="px-4 py-3 font-semibold">Order and payment</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Payment captured</th>
                <th className="px-4 py-3 font-semibold">Dashboard visibility</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && orders.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Checking NUSC orders and Razorpay payments…</td></tr>
              )}
              {!loading && !loadError && visibleOrders.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">{orders.length ? "No customers match your search." : "No captured NUSC payments are missing dashboard tickets."}</td></tr>
              )}
              {visibleOrders.map((order) => {
                const buyer = order.user || order.bookingDetails?.user;
                const busy = busyId === order._id;
                const label = order.orderType === "seasonPass"
                  ? `${order.bookingDetails?.ticketType || "NUSC season pass"} · ${order.bookingDetails?.quantity || 1} pass(es)`
                  : order.event?.title || order.bookingDetails?.tickets?.map((ticket) => `${ticket.ticketType} × ${ticket.quantity}`).join(", ") || "NUSC home match";
                return (
                  <tr key={order._id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{buyer?.name || "Buyer unavailable"}</p>
                      <p className="text-xs text-slate-600">{buyer?.email || "No email"}</p>
                      <p className="text-xs text-slate-600">{buyer?.phone || "No phone"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      <p className="break-all">{order.orderId}</p>
                      <p className="mt-1 break-all text-slate-500">{order.paymentId}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatAmount(order.amount, order.currency)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Captured</span>
                      <p className="mt-1 text-xs text-slate-500">{new Date(order.paymentCreatedAt || order.createdAt).toLocaleString("en-IN")}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {order.expectedTicketCount === null
                        ? `${order.dashboardTicketCount} visible to buyer · expected count unavailable`
                        : `${order.dashboardTicketCount} visible to buyer · ${order.expectedTicketCount} expected · ${order.missingTicketCount} missing`}
                      <p className="mt-1 text-xs text-slate-500">{order.ticketRecordCount} record(s) exist across accounts; {order.issuedTicketCount} are confirmed as issued.</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold capitalize text-amber-800">{order.status.replaceAll("_", " ")}</span>
                      {order.errorMessage && <p className="mt-1 max-w-56 truncate text-xs text-slate-500" title={order.errorMessage}>{order.errorMessage}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {order.recoveryAvailable ? (
                        <button
                          type="button"
                          onClick={() => void recoverOrder(order)}
                          disabled={busyId !== null || loading}
                          className="whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? "Reconciling…" : "Reconcile ticket delivery"}
                        </button>
                      ) : order.dashboardAccessRepairAvailable ? (
                        <button
                          type="button"
                          onClick={() => void repairDashboardAccess(order)}
                          disabled={busyId !== null || loading}
                          className="whitespace-nowrap rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? "Repairing…" : "Restore dashboard access"}
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-amber-800">Manual review required</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
