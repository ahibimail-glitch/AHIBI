"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { addDays, format, startOfDay } from "date-fns";
import { Download, Eye, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Booking {
  _id: string;
  eventId?: string;
  eventTitle: string;
  eventCategory?: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  bookedAt: string;
  quantity: number;
  total: number;
  status: string;
  paymentStatus?: string;
  ticketType?: string;
  bookingSource?: "online" | "on-spot";
  modeOfPayment?: "Cash" | "UPI" | "Card";
}

interface BookingFilters {
  category?: string;
  eventId?: string;
  source?: string;
  status?: string;
  ticketType?: string;
  name?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
}

interface BookingPage {
  bookings: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface BookingOptions {
  events: Array<{ _id: string; title: string; category: string }>;
  categories: string[];
  ticketTypes: string[];
  statuses: string[];
}

interface BookingStats {
  totalBookings: number;
  totalTickets: number;
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
}

interface BookingDetails extends Booking {
  event?: {
    title?: string;
    banner?: string;
    startDate?: string;
    endDate?: string;
    location?: { address?: string; city?: string };
  };
  eventSnapshot?: { title?: string };
  user?: { name?: string; email?: string; phone?: string } | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentId?: string;
  externalPaymentId?: string;
  entryVerified?: boolean;
  entryVerifiedAt?: string;
  qrCode?: string;
  price?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  "checked-in": "Checked in",
};

async function adminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const headers = new Headers(init.headers);
  headers.set("Authorization", token ? `Bearer ${token}` : "");
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
    mode: "cors",
  });

  if (!response.ok) {
    const body = await response.json().catch((): null => null);
    if (response.status === 403) {
      throw new Error("Access denied: you do not have permission to view these bookings.");
    }
    throw new Error(body?.message || "The booking request failed.");
  }
  return response.json() as Promise<T>;
}

function makeQueryString(values: object) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (typeof value === "string" && value) params.set(key, value);
  });
  return params.toString();
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value == null || value === "" ? "—" : value}</dd>
    </div>
  );
}

function ActiveFilterBadge({ children, label, onRemove }: { children: ReactNode; label: string; onRemove: () => void }) {
  return (
    <Badge variant="outline" className="flex items-center gap-1">
      {children}
      <button type="button" aria-label={`Remove ${label} filter`} onClick={onRemove}>
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

export default function Bookings() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BookingsContent />
    </QueryClientProvider>
  );
}

function BookingsContent() {
  const queryClient = useQueryClient();
  const isBrowser = typeof window !== "undefined";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nameFilter, setNameFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [debouncedPhone, setDebouncedPhone] = useState("");
  const [ticketTypeFilter, setTicketTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedName(nameFilter.trim());
      setDebouncedPhone(phoneFilter.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [nameFilter, phoneFilter]);

  const filters = useMemo<BookingFilters>(
    () => ({
      category: categoryFilter === "all" ? undefined : categoryFilter,
      eventId: eventFilter === "all" ? undefined : eventFilter,
      source: sourceFilter === "all" ? undefined : sourceFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      ticketType: ticketTypeFilter === "all" ? undefined : ticketTypeFilter,
      name: debouncedName || undefined,
      phone: debouncedPhone || undefined,
      startDate: dateFilter ? startOfDay(dateFilter).toISOString() : undefined,
      endDate: dateFilter ? startOfDay(addDays(dateFilter, 1)).toISOString() : undefined,
    }),
    [categoryFilter, eventFilter, sourceFilter, statusFilter, ticketTypeFilter, debouncedName, debouncedPhone, dateFilter],
  );

  const filterQuery = useMemo(() => makeQueryString(filters), [filters]);
  const pageQuery = useMemo(
    () => makeQueryString({ ...filters, page: String(page), limit: String(pageSize) }),
    [filters, page, pageSize],
  );

  const optionsQuery = useQuery({
    queryKey: ["admin-booking-options"],
    queryFn: () => adminJson<BookingOptions>("/api/admin/bookings/options"),
    enabled: isBrowser,
    staleTime: 5 * 60 * 1000,
  });
  const pageQueryResult = useQuery({
    queryKey: ["admin-bookings", pageQuery],
    queryFn: () => adminJson<BookingPage>(`/api/admin/bookings?${pageQuery}`),
    enabled: isBrowser,
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });
  const statsQuery = useQuery({
    queryKey: ["admin-booking-stats", filterQuery],
    queryFn: () => adminJson<BookingStats>(`/api/admin/bookings/stats${filterQuery ? `?${filterQuery}` : ""}`),
    enabled: isBrowser,
    staleTime: 30 * 1000,
  });
  const detailsQuery = useQuery({
    queryKey: ["admin-booking-details", selectedBookingId],
    queryFn: () => adminJson<{ booking: BookingDetails }>(`/api/admin/bookings/${selectedBookingId}`),
    enabled: !!selectedBookingId && isBrowser,
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (bookingId: string) =>
      adminJson<{ message: string }>(`/api/admin/bookings/${bookingId}`, { method: "DELETE" }),
    onSuccess: (_result, bookingId) => {
      toast.success("Booking deleted successfully");
      if (selectedBookingId === bookingId) setSelectedBookingId(null);
      const currentPage = queryClient.getQueryData<BookingPage>(["admin-bookings", pageQuery]);
      if (page > 1 && currentPage?.bookings.length === 1) setPage((current) => current - 1);
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-booking-stats"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete booking"),
  });

  const bookings = pageQueryResult.data?.bookings || [];
  const total = pageQueryResult.data?.pagination.total || 0;
  const totalPages = Math.max(1, pageQueryResult.data?.pagination.totalPages || 0);
  const options = optionsQuery.data;
  const categories = options?.categories || [];
  const visibleEvents = (options?.events || []).filter(
    (event) => categoryFilter === "all" || event.category === categoryFilter,
  );
  const ticketTypes = options?.ticketTypes || [];
  const statuses = options?.statuses || Object.keys(STATUS_LABELS);
  const stats = statsQuery.data;
  const firstRow = total ? (page - 1) * pageSize + 1 : 0;
  const lastRow = Math.min((page - 1) * pageSize + bookings.length, total);

  const changeCategory = (value: string) => {
    setCategoryFilter(value);
    setEventFilter("all");
    setTicketTypeFilter("all");
    setPage(1);
  };

  const changeEvent = (value: string) => {
    setEventFilter(value);
    setTicketTypeFilter("all");
    setPage(1);
  };

  const resetFilters = () => {
    setCategoryFilter("all");
    setSourceFilter("all");
    setEventFilter("all");
    setStatusFilter("all");
    setNameFilter("");
    setPhoneFilter("");
    setTicketTypeFilter("all");
    setDateFilter(undefined);
    setPage(1);
  };

  const deleteBooking = (bookingId: string) => {
    if (!window.confirm("Are you sure you want to delete this booking? This action cannot be undone.")) return;
    deleteMutation.mutate(bookingId);
  };

  const exportBookings = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `${API_URL}/api/admin/bookings/export${filterQuery ? `?${filterQuery}` : ""}`,
        {
          headers: { Authorization: token ? `Bearer ${token}` : "", Accept: "text/csv" },
          credentials: "include",
          mode: "cors",
        },
      );
      if (!response.ok) {
        const body = await response.json().catch((): null => null);
        throw new Error(body?.message || "Failed to export bookings");
      }

      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bookings-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export bookings");
    }
  };

  const activeFilters =
    categoryFilter !== "all" || sourceFilter !== "all" || eventFilter !== "all" || statusFilter !== "all" ||
    nameFilter || phoneFilter || ticketTypeFilter !== "all" || dateFilter;
  const selectedEventTitle = options?.events.find((event) => event._id === eventFilter)?.title;
  const detail = detailsQuery.data?.booking;

  if (pageQueryResult.isPending && !pageQueryResult.data) {
    return (
      <div className="flex min-h-40 items-center justify-center" role="status" aria-label="Loading bookings">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    );
  }

  if (pageQueryResult.isError && !pageQueryResult.data) {
    return (
      <div className="py-8 text-center">
        <h3 className="mb-2 text-lg font-medium text-red-600">Error loading bookings</h3>
        <p className="mb-4 text-gray-500">{pageQueryResult.error.message}</p>
        <Button variant="outline" onClick={() => pageQueryResult.refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <>
      <Card className="border-0 bg-white/70 shadow-lg backdrop-blur-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Bookings</CardTitle>
            <CardDescription>
              {!stats
                ? `${total.toLocaleString()} bookings`
                : `${(stats?.totalBookings ?? total).toLocaleString()} bookings · ${(stats?.totalTickets ?? 0).toLocaleString()} tickets`}
              {filterQuery ? " matching the current filters" : " total"}
            </CardDescription>
          </div>
          <Button onClick={exportBookings} className="flex items-center gap-2" disabled={total === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-8">
            <div>
              <Label htmlFor="category-filter">Event Category</Label>
              <Select value={categoryFilter} onValueChange={changeCategory}>
                <SelectTrigger id="category-filter"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="source-filter">Booking Source</Label>
              <Select value={sourceFilter} onValueChange={(value) => { setSourceFilter(value); setPage(1); }}>
                <SelectTrigger id="source-filter"><SelectValue placeholder="All bookings" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All bookings</SelectItem>
                  <SelectItem value="on-spot">On spot only</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="event-filter">Event</Label>
              <Select value={eventFilter} onValueChange={changeEvent}>
                <SelectTrigger id="event-filter"><SelectValue placeholder="All events" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {visibleEvents.map((event) => <SelectItem key={event._id} value={event._id}>{event.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status-filter">Booking Status</Label>
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
                <SelectTrigger id="status-filter"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status] || status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name-filter">Customer Name</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input id="name-filter" placeholder="Search by name" value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} className="pl-8 pr-8" />
                {nameFilter && <button type="button" aria-label="Clear name search" onClick={() => setNameFilter("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-gray-500" /></button>}
              </div>
            </div>

            <div>
              <Label htmlFor="phone-filter">Phone Number</Label>
              <div className="relative">
                <Input id="phone-filter" placeholder="Search by phone" value={phoneFilter} onChange={(event) => setPhoneFilter(event.target.value)} className="pr-8" />
                {phoneFilter && <button type="button" aria-label="Clear phone search" onClick={() => setPhoneFilter("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-gray-500" /></button>}
              </div>
            </div>

            <div>
              <Label htmlFor="ticket-type-filter">Ticket Type</Label>
              <Select value={ticketTypeFilter} onValueChange={(value) => { setTicketTypeFilter(value); setPage(1); }}>
                <SelectTrigger id="ticket-type-filter"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {ticketTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-filter">Booking Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" id="date-filter">
                    {dateFilter ? format(dateFilter, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFilter} onSelect={(date) => { setDateFilter(date); setPage(1); }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {optionsQuery.isError && <p className="mb-4 text-sm text-amber-700">Some filter options could not be loaded.</p>}
          {activeFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">Active filters:</span>
              {categoryFilter !== "all" && <ActiveFilterBadge label="category" onRemove={() => changeCategory("all")}>Category: {categoryFilter}</ActiveFilterBadge>}
              {sourceFilter !== "all" && <ActiveFilterBadge label="source" onRemove={() => { setSourceFilter("all"); setPage(1); }}>Source: {sourceFilter === "on-spot" ? "On spot" : "Online"}</ActiveFilterBadge>}
              {eventFilter !== "all" && <ActiveFilterBadge label="event" onRemove={() => changeEvent("all")}>Event: {selectedEventTitle || "Selected event"}</ActiveFilterBadge>}
              {statusFilter !== "all" && <ActiveFilterBadge label="status" onRemove={() => { setStatusFilter("all"); setPage(1); }}>Status: {STATUS_LABELS[statusFilter] || statusFilter}</ActiveFilterBadge>}
              {nameFilter && <ActiveFilterBadge label="name" onRemove={() => setNameFilter("")}>Name: {nameFilter}</ActiveFilterBadge>}
              {phoneFilter && <ActiveFilterBadge label="phone" onRemove={() => setPhoneFilter("")}>Phone: {phoneFilter}</ActiveFilterBadge>}
              {ticketTypeFilter !== "all" && <ActiveFilterBadge label="ticket type" onRemove={() => { setTicketTypeFilter("all"); setPage(1); }}>Ticket type: {ticketTypeFilter}</ActiveFilterBadge>}
              {dateFilter && <ActiveFilterBadge label="date" onRemove={() => { setDateFilter(undefined); setPage(1); }}>Date: {format(dateFilter, "PP")}</ActiveFilterBadge>}
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 px-2">Clear all</Button>
            </div>
          )}

          {pageQueryResult.isError && pageQueryResult.data && (
            <p className="mb-3 text-sm text-red-600">Could not refresh this page: {pageQueryResult.error.message}</p>
          )}
          <div className={pageQueryResult.isFetching ? "overflow-x-auto opacity-60" : "overflow-x-auto"}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Booked Date</TableHead>
                  <TableHead>Ticket Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell>{booking.eventTitle || "NA"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{booking.user?.name || "Guest"}</span>
                        {booking.bookingSource === "on-spot" && <Badge className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50">On spot</Badge>}
                      </div>
                      <div className="text-xs text-gray-500">{booking.user?.email || "NA"}</div>
                    </TableCell>
                    <TableCell>{booking.user?.phone || "NA"}</TableCell>
                    <TableCell>{booking.bookedAt ? new Date(booking.bookedAt).toLocaleDateString() : "NA"}</TableCell>
                    <TableCell>{booking.ticketType || "NA"}</TableCell>
                    <TableCell><Badge variant="outline">{STATUS_LABELS[booking.status] || booking.status || "Unknown"}</Badge></TableCell>
                    <TableCell>{booking.quantity}</TableCell>
                    <TableCell>₹{booking.total}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" aria-label="View booking details" onClick={() => setSelectedBookingId(booking._id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" aria-label="Delete booking" disabled={deleteMutation.isPending} onClick={() => deleteBooking(booking._id)} className="h-8 w-8 p-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!bookings.length && (
            <div className="py-8 text-center">
              <p className="text-gray-500">{activeFilters ? "No bookings match your filters." : "There are no bookings to display."}</p>
              {activeFilters && <Button variant="outline" onClick={resetFilters} className="mt-2">Clear all filters</Button>}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {firstRow.toLocaleString()}–{lastRow.toLocaleString()} of {total.toLocaleString()} bookings
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="page-size" className="text-sm">Rows per page</Label>
              <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                <SelectTrigger id="page-size" className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" disabled={page <= 1 || pageQueryResult.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
              <span className="min-w-20 text-center text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages || pageQueryResult.isFetching} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedBookingId} onOpenChange={(open) => { if (!open) setSelectedBookingId(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Booking details</DialogTitle></DialogHeader>
          {detailsQuery.isPending && <p className="py-6 text-sm text-muted-foreground">Loading booking details…</p>}
          {detailsQuery.isError && <p className="py-6 text-sm text-red-600">{detailsQuery.error.message}</p>}
          {detail && (
            <>
              <dl className="divide-y rounded-md border px-4">
                <DetailRow label="Booking ID" value={detail._id} />
                <DetailRow label="Event" value={detail.event?.title || detail.eventSnapshot?.title || detail.eventTitle || "Deleted Event"} />
                <DetailRow label="Customer" value={detail.user?.name || detail.customerName || "Guest"} />
                <DetailRow label="Email" value={detail.user?.email || detail.customerEmail || "—"} />
                <DetailRow label="Phone" value={detail.user?.phone || detail.customerPhone || "—"} />
                <DetailRow label="Booked on" value={detail.bookedAt ? new Date(detail.bookedAt).toLocaleString() : "—"} />
                <DetailRow label="Ticket type" value={detail.ticketType || "—"} />
                <DetailRow label="Quantity" value={detail.quantity} />
                <DetailRow label="Unit price" value={detail.price == null ? "—" : `₹${detail.price}`} />
                <DetailRow label="Total" value={detail.total == null ? "—" : `₹${detail.total}`} />
                <DetailRow label="Booking status" value={STATUS_LABELS[detail.status] || detail.status || "—"} />
                <DetailRow label="Payment status" value={detail.paymentStatus || "—"} />
                <DetailRow label="Payment reference" value={detail.paymentId || detail.externalPaymentId || "—"} />
                <DetailRow label="Payment method" value={detail.modeOfPayment || "—"} />
                <DetailRow label="Booking source" value={detail.bookingSource === "on-spot" ? "On spot" : "Online"} />
                <DetailRow label="Check-in" value={detail.entryVerified ? "Checked in" : "Not checked in"} />
                {detail.entryVerifiedAt && <DetailRow label="Checked in at" value={new Date(detail.entryVerifiedAt).toLocaleString()} />}
              </dl>
              {detail.qrCode && (
                <div className="mt-4 flex flex-col items-center gap-2 rounded-md border p-4">
                  <span className="text-sm font-medium">Ticket QR code</span>
                  <img src={detail.qrCode} alt="Booking ticket QR code" className="h-48 w-48 object-contain" />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
