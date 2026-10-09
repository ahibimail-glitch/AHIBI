"use client";

import { useMemo, useState } from "react";
import { Mail, Phone, Search, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCrm } from "@/app/organizer/components/crm/CrmContext";

export default function CrmAttendeesPage() {
  const { bookings } = useCrm();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBookings = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return bookings;

    return bookings.filter((booking) => {
      const name = booking.user?.name?.toLowerCase() || "";
      const email = booking.user?.email?.toLowerCase() || "";
      const phone = booking.user?.phone?.toLowerCase() || "";
      const ticketType = booking.ticketType.toLowerCase();
      return (
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        ticketType.includes(query)
      );
    });
  }, [bookings, searchQuery]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Attendees</h1>
      <p className="text-sm text-[#8b949e] mt-1">Manage and search ticket holders for this event.</p>

      <div className="mt-8 rounded-xl border border-[#21262d] bg-[#131820] p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6e7681]" />
          <Input
            placeholder="Search by name, email, phone, or ticket type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#0d1117] border-[#21262d] text-white placeholder:text-[#6e7681] focus-visible:ring-[#f97316]"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#21262d] bg-[#131820] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#21262d]">
          <h2 className="text-base font-semibold text-white">Attendee Bookings</h2>
          <p className="text-sm text-[#8b949e] mt-0.5">
            {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="text-center py-16 text-[#8b949e]">
            <Ticket className="h-10 w-10 mx-auto mb-3 text-[#6e7681]" />
            <p>No bookings yet for this event.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#21262d] hover:bg-transparent">
                    <TableHead className="text-[#8b949e]">Attendee</TableHead>
                    <TableHead className="text-[#8b949e]">Contact</TableHead>
                    <TableHead className="text-[#8b949e]">Ticket</TableHead>
                    <TableHead className="text-[#8b949e]">Status</TableHead>
                    <TableHead className="text-[#8b949e]">Booked On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking._id} className="border-[#21262d] hover:bg-[#161b26]">
                      <TableCell className="text-white">
                        <div className="font-medium">{booking.user?.name || "Guest"}</div>
                        <div className="text-sm text-[#8b949e]">
                          {booking.quantity} ticket{booking.quantity !== 1 ? "s" : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm text-[#8b949e]">
                          {booking.user?.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span>{booking.user.email}</span>
                            </div>
                          )}
                          {booking.user?.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{booking.user.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div>{booking.ticketType}</div>
                        <div className="text-sm text-[#8b949e]">₹{booking.total}</div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            booking.status === "confirmed"
                              ? "bg-green-900/40 text-green-400"
                              : "bg-yellow-900/40 text-yellow-400"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-[#8b949e]">
                        {new Date(booking.bookedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="lg:hidden p-4 space-y-3">
              {filteredBookings.map((booking) => (
                <div
                  key={booking._id}
                  className="rounded-lg border border-[#21262d] bg-[#0d1117] p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-white">{booking.user?.name || "Guest"}</h3>
                      <p className="text-sm text-[#8b949e]">
                        {booking.ticketType} · {booking.quantity} ticket
                        {booking.quantity !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        booking.status === "confirmed"
                          ? "bg-green-900/40 text-green-400"
                          : "bg-yellow-900/40 text-yellow-400"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-[#8b949e]">
                    {booking.user?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>{booking.user.email}</span>
                      </div>
                    )}
                    {booking.user?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{booking.user.phone}</span>
                      </div>
                    )}
                    <div className="pt-1 text-xs text-[#6e7681]">
                      Booked on {new Date(booking.bookedAt).toLocaleDateString()} · ₹
                      {booking.total}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
