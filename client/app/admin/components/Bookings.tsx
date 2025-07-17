"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface Booking {
  id: string;
  event: string;
  customer: string;
  date: string;
  amount: string;
  status: string;
}

interface BookingsProps {
  bookings?: Booking[];
}

export default function Bookings({ bookings: propBookings }: BookingsProps) {
  // Use bookings from props or fallback to sample data if not provided
  const bookings: Booking[] = propBookings?.length ? propBookings : [
    {
      id: "BKG-001",
      event: "Summer Music Festival 2024",
      customer: "Aarav Sharma",
      date: "2025-07-15",
      amount: "₹1,500",
      status: "Confirmed",
    },
    {
      id: "BKG-002",
      event: "Tech Summit 2025",
      customer: "Diya Patel",
      date: "2025-08-20",
      amount: "₹2,000",
      status: "Pending",
    },
    {
      id: "BKG-003",
      event: "Art Exhibition",
      customer: "Rohan Kumar",
      date: "2025-09-05",
      amount: "₹800",
      status: "Confirmed",
    },
    {
      id: "BKG-004",
      event: "Food Festival",
      customer: "Priya Singh",
      date: "2025-10-10",
      amount: "₹1,200",
      status: "Cancelled",
    },
    {
      id: "BKG-005",
      event: "Comedy Night",
      customer: "Vikram Reddy",
      date: "2025-11-15",
      amount: "₹1,000",
      status: "Confirmed",
    },
  ];

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Booking Management</CardTitle>
        <CardDescription>
          View and manage all bookings across the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking ID</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-mono text-xs">
                  {booking.id}
                </TableCell>
                <TableCell>{booking.event}</TableCell>
                <TableCell>{booking.customer}</TableCell>
                <TableCell>{booking.date}</TableCell>
                <TableCell>{booking.amount}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      booking.status === "Confirmed"
                        ? "default"
                        : booking.status === "Pending"
                        ? "outline"
                        : booking.status === "Cancelled"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
