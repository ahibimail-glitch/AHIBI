"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface MerchOrder {
  _id: string;
  createdAt: string;
  status: "created" | "pending" | "paid" | "shipped" | "delivered" | "failed" | "cancelled" | "refunded";
  total: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    variant?: string;
  }>;
  payment?: {
    transactionId?: string;
  };
}

const statusPillClass: Record<string, string> = {
  created: "bg-slate-100 text-slate-700 border-slate-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  shipped: "bg-blue-100 text-blue-700 border-blue-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  failed: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  refunded: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function ArtistMerchOrdersPage() {
  const [allOrders, setAllOrders] = useState<MerchOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("artist_token");

        const response = await fetch(`/api/artist/merch/orders`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Failed to fetch merch orders");
        }

        const fetchedOrders = (data.data.orders || []).filter(
          (order: MerchOrder) => order.status !== "pending"
        );
        setAllOrders(fetchedOrders);
      } catch (err: any) {
        setError(err?.message || "Failed to fetch merch orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const updateOrderStatus = async (orderId: string, status: MerchOrder["status"]) => {
    try {
      setUpdatingOrderId(orderId);
      setError(null);
      const token = localStorage.getItem("artist_token");

      const response = await fetch(`/api/artist/merch/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to update order status");
      }

      setAllOrders((prev) => prev.map((order) => (order._id === orderId ? { ...order, status } : order)));
    } catch (err: any) {
      setError(err?.message || "Failed to update order status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return allOrders.filter((order) => {
      const statusMatch = statusFilter === "all" ? true : order.status === statusFilter;
      if (!statusMatch) return false;

      if (!searchValue) return true;

      const searchableText = [
        order._id,
        order.shippingAddress?.fullName || "",
        order.shippingAddress?.phone || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchValue);
    });
  }, [allOrders, search, statusFilter]);

  const totalRevenue = useMemo(
    () =>
      allOrders
        .filter((order) => ["paid", "shipped", "delivered"].includes(order.status))
        .reduce((sum, order) => sum + (order.total || 0), 0),
    [allOrders]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link
          href="/artist/dashboard/merch"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Merch
        </Link>

        <div className="mt-4 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Merch Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track all orders placed for your merch products.</p>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, order id"
              className="w-full sm:w-72 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="created">Created</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Orders</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{allOrders.length}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Orders Delivered</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{allOrders.filter((order) => order.status === "delivered").length}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Revenue</p>
            <p className="mt-2 text-3xl font-bold text-foreground">₹{totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading orders...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : filteredOrders.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No merch orders found yet.
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order._id}
                className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Order ID</p>
                    <p className="font-mono text-xs sm:text-sm text-foreground">{order._id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusPillClass[order.status] || "bg-muted text-foreground border-border"
                      }`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                    <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order._id, e.target.value as MerchOrder["status"])}
                      disabled={updatingOrderId === order._id}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    >
                      <option value="created">CREATED</option>
                      <option value="paid">PAID</option>
                      <option value="shipped">SHIPPED</option>
                      <option value="delivered">DELIVERED</option>
                      <option value="failed">FAILED</option>
                      <option value="cancelled">CANCELLED</option>
                      <option value="refunded">REFUNDED</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-2">
                    {order.items.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="rounded-xl border border-border bg-background/70 p-3"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {item.name} x {item.quantity}
                        </p>
                        {item.variant && <p className="text-xs text-muted-foreground">{item.variant}</p>}
                        <p className="mt-1 text-sm text-foreground">₹{(item.quantity * item.price).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-border bg-background/70 p-3">
                    <p className="text-sm font-semibold text-foreground">{order.shippingAddress.fullName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{order.shippingAddress.phone}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p className="text-xs text-muted-foreground">{order.shippingAddress.country}</p>
                    <p className="mt-3 text-sm font-semibold text-foreground">Total: ₹{order.total.toFixed(2)}</p>
                    {order.payment?.transactionId && (
                      <p className="mt-1 break-all text-xs text-muted-foreground">Txn: {order.payment.transactionId}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
