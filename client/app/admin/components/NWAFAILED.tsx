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
  user?: { _id: string; name?: string; email?: string; phone?: string } | null;
  userSnapshot?: { _id: string; name?: string; email?: string; phone?: string } | null;
  event?: { title?: string; startDate?: string } | null;
  bookingDetails?: any;
};

type PaymentUser = { _id?: string; name?: string; email?: string; phone?: string };

type LivestreamPurchaseItem = {
  _id: string;
  status?: string;
  accessGranted?: boolean;
  user?: { _id: string; email?: string; phone?: string } | null;
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const PAGE_SIZE = 25;
const TARGET_LIVESTREAM_ID = "699f410d5797a2d4ead1e556";

export default function NWAFailedPayments() {
  const [items, setItems] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [grantingAccessId, setGrantingAccessId] = useState<string | null>(null);
  const [grantingAllAccess, setGrantingAllAccess] = useState(false);
  const [livestreamStatusByUser, setLivestreamStatusByUser] = useState<Record<string, { status: string; accessGranted: boolean }>>({});
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

  const getUserKeys = (user?: { _id?: string; email?: string; phone?: string } | null) => {
    if (!user) return [] as string[];

    return [user._id, user.email?.toLowerCase(), user.phone]
      .filter((value): value is string => Boolean(value));
  };

  const getItemUserId = (item: TxItem) => item.user?._id || item.userSnapshot?._id;

  const getItemLivestreamMatch = (item: TxItem) => {
    const user = item.user || item.userSnapshot || null;
    return getUserKeys(user).map((key) => livestreamStatusByUser[key]).find(Boolean);
  };

  const fetchLivestreamStatuses = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/livestream/admin/purchases?livestreamId=${TARGET_LIVESTREAM_ID}&limit=200`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch livestream purchase statuses");

      const json = await res.json();
      const purchases: LivestreamPurchaseItem[] = json.data || [];
      const statusMap: Record<string, { status: string; accessGranted: boolean }> = {};

      purchases.forEach((purchase) => {
        const keys = getUserKeys(purchase.user);
        keys.forEach((key) => {
          statusMap[key] = {
            status: purchase.status || "unknown",
            accessGranted: Boolean(purchase.accessGranted),
          };
        });
      });

      setLivestreamStatusByUser(statusMap);
    } catch (e: any) {
      toast.error(e.message || "Failed to load livestream statuses");
    }
  };

  const fetchPaidNoBookingPage = async (pageToLoad: number, limit = PAGE_SIZE) => {
    const params = new URLSearchParams({
      page: String(pageToLoad),
      limit: String(limit),
      amount: "199",
    });
    const res = await fetch(`${apiUrl}/api/admin/payments/paid-no-booking?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || "Failed to fetch failed payments");
    return {
      items: Array.isArray(json.data?.items) ? json.data.items as TxItem[] : [],
      pagination: json.data?.pagination as PaginationInfo | undefined,
    };
  };

  const fetchItems = async (pageToLoad = page) => {
    setLoading(true);
    try {
      const data = await fetchPaidNoBookingPage(pageToLoad);
      const nextPage = data.pagination?.page || pageToLoad;
      setItems(data.items);
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
    fetchLivestreamStatuses();
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

  const grantLivestreamAccessForItem = async (item: TxItem) => {
    const userId = getItemUserId(item);

    if (!userId) {
      throw new Error("User ID not available for granting livestream access");
    }

    const res = await fetch(`${apiUrl}/api/livestream/admin/manual-purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({
        userId,
        livestreamId: TARGET_LIVESTREAM_ID,
        notes: `Granted from NWA failed payments for transaction ${item._id}`,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.message || "Failed to grant livestream access");
    }
  };

  const handleGrantLivestreamAccess = async (item: TxItem) => {
    setGrantingAccessId(item._id);

    try {
      await grantLivestreamAccessForItem(item);
      toast.success("Livestream access granted successfully");
      await fetchLivestreamStatuses();
    } catch (e: any) {
      toast.error(e.message || "Failed to grant livestream access");
    } finally {
      setGrantingAccessId(null);
    }
  };

  const handleGrantAllLivestreamAccess = async () => {
    setGrantingAllAccess(true);

    let successCount = 0;
    let failureCount = 0;
    let eligibleCount = 0;

    try {
      let pageToProcess = 1;
      let totalPages = 1;
      while (pageToProcess <= totalPages) {
        const data = await fetchPaidNoBookingPage(pageToProcess);
        totalPages = data.pagination?.totalPages || 0;

        for (const item of data.items) {
          const existingStatus = getItemLivestreamMatch(item);
          if (existingStatus?.accessGranted || !getItemUserId(item)) continue;
          eligibleCount += 1;
          try {
            await grantLivestreamAccessForItem(item);
            successCount += 1;
          } catch {
            failureCount += 1;
          }
        }

        pageToProcess += 1;
      }

      await fetchLivestreamStatuses();

      if (eligibleCount === 0) {
        toast.error("No users available to grant livestream access");
      }
      if (successCount > 0) {
        toast.success(`Granted livestream access to ${successCount} user${successCount > 1 ? "s" : ""}`);
      }

      if (failureCount > 0) {
        toast.error(`Failed to grant access for ${failureCount} user${failureCount > 1 ? "s" : ""}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load all failed payments");
    } finally {
      setGrantingAllAccess(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Paid but Not Booked</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleGrantAllLivestreamAccess}
                disabled={grantingAllAccess || loading}
              >
                {grantingAllAccess ? "Granting Access..." : "Grant Access To All"}
              </Button>
              <Button variant="outline" onClick={() => fetchItems()} disabled={loading || grantingAllAccess}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
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
                  <TableHead>Livestream Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-gray-500">
                      {loading ? "Loading..." : "No records found"}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => {
                  const u: PaymentUser = item.user || item.userSnapshot || {};
                  const livestreamMatch = getItemLivestreamMatch(item);
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
                      <TableCell>
                        <Badge variant={livestreamMatch?.accessGranted ? "default" : "secondary"}>
                          {livestreamMatch
                            ? `${livestreamMatch.status.replace(/_/g, " ")} - ${livestreamMatch.accessGranted ? "access granted" : "no access"}`
                            : "not purchased"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGrantLivestreamAccess(item)}
                            disabled={grantingAccessId === item._id || Boolean(livestreamMatch?.accessGranted)}
                          >
                            {Boolean(livestreamMatch?.accessGranted)
                              ? "Access Granted"
                              : grantingAccessId === item._id
                                ? "Granting..."
                                : "Grant Livestream Access"}
                          </Button>
                          <Button size="sm" onClick={() => handleResolve(item._id)} disabled={resolvingId === item._id}>
                            {resolvingId === item._id ? "Confirming..." : "Confirm Booking"}
                          </Button>
                        </div>
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
                disabled={loading || grantingAllAccess || page <= 1}
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
                disabled={loading || grantingAllAccess || page >= pagination.totalPages}
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


