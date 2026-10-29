"use client";

import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { ChevronDown, ChevronUp, Download, Filter, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Booking {
  _id: string;
  eventId?: string;
  eventTitle?: string;
  event?: { _id?: string; title?: string };
  eventSnapshot?: { _id?: string; title?: string; startDate?: string };
  user?: { name?: string; email?: string; phone?: string };
  bookedAt: string;
  ticketType?: string;
  quantity?: number;
  total?: number;
  status?: string;
  paymentId?: string;
  paymentStatus?: string;
  country?: string;
  state?: string;
  modeOfPayment?: string;
  visitorType?: string;
}

interface FilterOptions {
  events: Array<{ _id: string; title: string; category: string }>;
  ticketTypes: string[];
  statuses: string[];
  countries: string[];
  states: string[];
  visitorTypes: string[];
}

interface BookingPage {
  bookings: Booking[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface BookingStats {
  totalBookings: number;
  totalTickets: number;
}

interface TicketFilters {
  eventIds: string;
  eventId?: string;
  paymentSource?: string;
  ticketType?: string;
  status?: string;
  country?: string;
  state?: string;
  visitorType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function adminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const headers = new Headers(init.headers);
  headers.set("Authorization", token ? `Bearer ${token}` : "");
  headers.set("Accept", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include", mode: "cors" });
  if (!response.ok) {
    const body = await response.json().catch((): null => null);
    throw new Error(body?.message || "The booking request failed.");
  }
  return response.json() as Promise<T>;
}

function toQueryString(values: object) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (typeof value === "string" && value) params.set(key, value);
  });
  return params.toString();
}

function localDayStart(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function localDayAfter(value: string) {
  return addDays(new Date(`${value}T00:00:00`), 1).toISOString();
}

export default function EventTicketBookings({ title, eventIds }: { title: string; eventIds: string[] }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <EventTicketBookingsContent title={title} eventIds={eventIds} />
    </QueryClientProvider>
  );
}

function EventTicketBookingsContent({ title, eventIds }: { title: string; eventIds: string[] }) {
  const queryClient = useQueryClient();
  const isBrowser = typeof window !== "undefined";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [selectedTicketType, setSelectedTicketType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedVisitorType, setSelectedVisitorType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

  const eventScope = eventIds.join(",");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters = useMemo<TicketFilters>(
    () => ({
      eventIds: eventScope,
      eventId: selectedEvent === "all" ? undefined : selectedEvent,
      paymentSource: selectedSource === "all" ? undefined : selectedSource,
      ticketType: selectedTicketType === "all" ? undefined : selectedTicketType,
      status: selectedStatus === "all" ? undefined : selectedStatus,
      country: selectedCountry === "all" ? undefined : selectedCountry,
      state: selectedState === "all" ? undefined : selectedState,
      visitorType: selectedVisitorType === "all" ? undefined : selectedVisitorType,
      search: debouncedSearch || undefined,
      startDate: startDate ? localDayStart(startDate) : undefined,
      endDate: endDate ? localDayAfter(endDate) : undefined,
    }),
    [eventScope, selectedEvent, selectedSource, selectedTicketType, selectedStatus, selectedCountry, selectedState, selectedVisitorType, debouncedSearch, startDate, endDate],
  );
  const filterQuery = useMemo(() => toQueryString(filters), [filters]);
  const pageQuery = useMemo(
    () => toQueryString({ ...filters, page: String(page), limit: String(pageSize), view: "tickets" }),
    [filters, page, pageSize],
  );

  const optionQuery = useQuery({
    queryKey: ["admin-ticket-booking-options", eventScope],
    queryFn: () => adminJson<FilterOptions>(`/api/admin/bookings/options?eventIds=${encodeURIComponent(eventScope)}`),
    enabled: isBrowser,
    staleTime: 5 * 60 * 1000,
  });
  const bookingsQuery = useQuery({
    queryKey: ["admin-ticket-bookings", pageQuery],
    queryFn: () => adminJson<BookingPage>(`/api/admin/bookings?${pageQuery}`),
    enabled: isBrowser,
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });
  const statsQuery = useQuery({
    queryKey: ["admin-ticket-booking-stats", filterQuery],
    queryFn: () => adminJson<BookingStats>(`/api/admin/bookings/stats?${filterQuery}`),
    enabled: isBrowser,
    staleTime: 30 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (bookingId: string) => adminJson<{ message: string }>(`/api/admin/bookings/${bookingId}`, { method: "DELETE" }),
    onSuccess: (_result, _bookingId) => {
      const currentPage = queryClient.getQueryData<BookingPage>(["admin-ticket-bookings", pageQuery]);
      if (page > 1 && currentPage?.bookings.length === 1) setPage((current) => current - 1);
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-booking-stats"] });
      toast.success("Booking deleted successfully");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete booking"),
  });

  const bookings = bookingsQuery.data?.bookings || [];
  const total = statsQuery.data?.totalBookings ?? bookingsQuery.data?.pagination.total ?? 0;
  const options = optionQuery.data;
  const activeFiltersCount = [
    debouncedSearch,
    selectedEvent !== "all" ? selectedEvent : "",
    selectedTicketType !== "all" ? selectedTicketType : "",
    selectedStatus !== "all" ? selectedStatus : "",
    selectedSource !== "all" ? selectedSource : "",
    selectedCountry !== "all" ? selectedCountry : "",
    selectedState !== "all" ? selectedState : "",
    selectedVisitorType !== "all" ? selectedVisitorType : "",
    startDate,
    endDate,
  ].filter(Boolean).length;
  const totalPages = Math.max(1, bookingsQuery.data?.pagination.totalPages || 0);
  const firstRow = total ? (page - 1) * pageSize + 1 : 0;
  const lastRow = Math.min((page - 1) * pageSize + bookings.length, total);

  const clearAllFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedEvent("all");
    setSelectedTicketType("all");
    setSelectedStatus("all");
    setSelectedSource("all");
    setSelectedCountry("all");
    setSelectedState("all");
    setSelectedVisitorType("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const setFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const deleteBooking = (bookingId: string) => {
    if (!window.confirm("Are you sure you want to delete this booking? This action cannot be undone.")) return;
    deleteMutation.mutate(bookingId);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${API_URL}/api/admin/bookings/export?${filterQuery}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "", Accept: "text/csv" },
        credentials: "include",
        mode: "cors",
      });
      if (!response.ok) {
        const body = await response.json().catch((): null => null);
        throw new Error(body?.message || "Failed to export bookings");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export bookings");
    } finally {
      setExporting(false);
    }
  };

  if (bookingsQuery.isPending && !bookingsQuery.data) {
    return <div className="py-8 text-center text-sm text-gray-600">Loading {title.toLowerCase()}…</div>;
  }
  if (bookingsQuery.isError && !bookingsQuery.data) {
    return (
      <div className="py-8 text-center">
        <p className="mb-3 text-sm text-red-600">{bookingsQuery.error.message}</p>
        <Button variant="outline" onClick={() => bookingsQuery.refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {statsQuery.data
              ? `${statsQuery.data.totalBookings.toLocaleString()} bookings · ${statsQuery.data.totalTickets.toLocaleString()} tickets`
              : `${total.toLocaleString()} bookings`}
            {` for selected ${title.startsWith("HMF") ? "HMF" : "HF"} events`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Search by event, name, email, phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-56 flex-1"
              />
              <Button variant="outline" onClick={() => setShowFilters((shown) => !shown)} className="whitespace-nowrap">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>}
                {showFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
              {activeFiltersCount > 0 && <Button variant="ghost" size="sm" onClick={clearAllFilters}><X className="mr-2 h-4 w-4" />Clear</Button>}
              <Button variant="outline" onClick={handleExport} disabled={total === 0 || exporting}>
                <Download className="mr-2 h-4 w-4" />{exporting ? "Preparing…" : "Export CSV"}
              </Button>
            </div>

            {showFilters && (
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <FilterSelect label="Event" value={selectedEvent} onChange={setFilter(setSelectedEvent)} options={options?.events.map((event) => ({ value: event._id, label: event.title })) || []} allLabel="All Events" />
                    <FilterSelect label="Ticket Type" value={selectedTicketType} onChange={setFilter(setSelectedTicketType)} options={options?.ticketTypes.map((value) => ({ value, label: value })) || []} allLabel="All Types" />
                    <FilterSelect label="Status" value={selectedStatus} onChange={setFilter(setSelectedStatus)} options={options?.statuses.map((value) => ({ value, label: value })) || []} allLabel="All Statuses" />
                    <FilterSelect label="Source" value={selectedSource} onChange={setFilter(setSelectedSource)} options={[{ value: "online", label: "Online" }, { value: "manual", label: "Manual" }]} allLabel="All Sources" />
                    <FilterSelect label="Country" value={selectedCountry} onChange={setFilter(setSelectedCountry)} options={options?.countries.map((value) => ({ value, label: value })) || []} allLabel="All Countries" />
                    <FilterSelect label="State" value={selectedState} onChange={setFilter(setSelectedState)} options={options?.states.map((value) => ({ value, label: value })) || []} allLabel="All States" />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} />
                    </div>
                    <FilterSelect label="Visitor Type" value={selectedVisitorType} onChange={setFilter(setSelectedVisitorType)} options={options?.visitorTypes.map((value) => ({ value, label: value })) || []} allLabel="All Visitor Types" />
                  </div>
                </CardContent>
              </Card>
            )}

            {bookingsQuery.isError && bookingsQuery.data && <p className="text-sm text-red-600">Could not refresh this page: {bookingsQuery.error.message}</p>}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Showing <strong>{firstRow.toLocaleString()}–{lastRow.toLocaleString()}</strong> of <strong>{total.toLocaleString()}</strong> bookings</span>
            </div>
          </div>

          <div className={bookingsQuery.isFetching ? "overflow-x-auto rounded-md border opacity-60" : "overflow-x-auto rounded-md border"}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Ticket Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Mode of Payment</TableHead>
                  <TableHead>Visitor Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Booked At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell>{booking.event?.title || booking.eventTitle || booking.eventSnapshot?.title || "Deleted Event"}</TableCell>
                    <TableCell>{booking.ticketType || "-"}</TableCell>
                    <TableCell>{booking.quantity ?? "-"}</TableCell>
                    <TableCell>₹{booking.total ?? 0}</TableCell>
                    <TableCell><Badge variant="outline">{booking.status || "Unknown"}</Badge></TableCell>
                    <TableCell><Badge variant={booking.paymentId ? "secondary" : "outline"}>{booking.paymentId ? "Online" : "Manual"}</Badge></TableCell>
                    <TableCell>{booking.country || "-"}</TableCell>
                    <TableCell>{booking.state || "-"}</TableCell>
                    <TableCell>
                      {booking.paymentId ? <Badge variant="secondary">Online</Badge> : <Badge variant="outline">{booking.modeOfPayment || "Manual"}</Badge>}
                    </TableCell>
                    <TableCell>{booking.visitorType || "-"}</TableCell>
                    <TableCell>
                      <div>{booking.user?.name || "Guest"}</div>
                      <div className="text-xs text-muted-foreground">{booking.user?.email || ""}</div>
                    </TableCell>
                    <TableCell>{booking.bookedAt ? format(new Date(booking.bookedAt), "yyyy-MM-dd HH:mm") : "-"}</TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" aria-label="Delete booking" disabled={deleteMutation.isPending} onClick={() => deleteBooking(booking._id)} className="h-8 w-8 p-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!bookings.length && <div className="py-8 text-center text-sm text-gray-500">No bookings match the current filters.</div>}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" disabled={page <= 1 || bookingsQuery.isFetching} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages || bookingsQuery.isFetching} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
}) {
  const id = `ticket-filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}><SelectValue placeholder={allLabel} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
