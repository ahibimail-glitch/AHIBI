"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type TxItem = {
  _id: string;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  status: string;
  createdAt: string;
  user?: { name?: string; email?: string; phone?: string } | null;
  userSnapshot?: { name?: string; email?: string; phone?: string } | null;
  event?: { title?: string; startDate?: string } | null;
  bookingDetails?: any;
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const PAGE_SIZE = 25;

export default function FailedPayments() {
  const [items, setItems] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("admin_token") || "";
  }, []);

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000", []);

  const fetchItems = async (pageToLoad = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageToLoad), limit: String(PAGE_SIZE) });
      const res = await fetch(`${apiUrl}/api/admin/payments/paid-no-booking?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch failed payments");
      const json = await res.json();
      const data = json.data || {};
      const nextPage = data.pagination?.page || pageToLoad;
      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(nextPage);
      setPagination({
        page: nextPage,
        limit: data.pagination?.limit || PAGE_SIZE,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      console.log('[FailedPayments] Attempting to resolve transaction:', id);
      
      const res = await fetch(`${apiUrl}/api/admin/payments/resolve/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      
      console.log('[FailedPayments] Response status:', res.status);
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[FailedPayments] Error response:', err);
        throw new Error(err.message || "Failed to resolve transaction");
      }
      
      const result = await res.json();
      console.log('[FailedPayments] Success response:', result);
      
      toast.success("Booking confirmed successfully");
      const pageToLoad = items.length === 1 && page > 1 ? page - 1 : page;
      setPage(pageToLoad);
      await fetchItems(pageToLoad);
    } catch (e: any) {
      console.error('[FailedPayments] Error in handleResolve:', e);
      toast.error(e.message || "Failed to resolve");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Paid but Not Booked</h2>
            <Button variant="outline" onClick={() => fetchItems()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-gray-500">
                      {loading ? "Loading..." : "No records found"}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => {
                  const u = item.user || item.userSnapshot || {};
                  const eventTitle = item.event?.title || 
                                   item.bookingDetails?.event?.title || 
                                   (item.bookingDetails?.event ? 'Event ID: ' + item.bookingDetails.event._id : '-');
                  
                  return (
                    <TableRow key={item._id}>
                      <TableCell className="font-mono text-xs">{item.paymentId || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{item.orderId || "-"}</TableCell>
                      <TableCell>
                        {item.amount != null ? `₹${item.amount}` : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{u.name || "Unknown"}</span>
                          <span className="text-xs text-gray-500">{u.email || "No email"}</span>
                          <span className="text-xs text-gray-500">{u.phone || "No phone"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{eventTitle}</span>
                          {item.event?.startDate && (
                            <span className="text-xs text-gray-500">
                              {new Date(item.event.startDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleResolve(item._id)} disabled={resolvingId === item._id}>
                          {resolvingId === item._id ? "Confirming..." : "Confirm Booking"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {pagination.total === 0
                ? "0 records"
                : `Showing ${(page - 1) * pagination.limit + 1}–${Math.min(page * pagination.limit, pagination.total)} of ${pagination.total} records`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const previousPage = page - 1;
                  setPage(previousPage);
                  fetchItems(previousPage);
                }}
                disabled={loading || page <= 1}
              >
                Previous
              </Button>
              <span>Page {pagination.totalPages === 0 ? 0 : page} of {Math.max(pagination.totalPages, 1)}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  fetchItems(nextPage);
                }}
                disabled={loading || page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


