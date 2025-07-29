"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface Booking {
  _id: string;
  event: {
    title: string;
    startDate: string;
    endDate: string;
  };
  user: {
    name: string;
    email: string;
  };
  bookedAt: string;
  quantity: number;
  total: number;
  status: string;
}

interface BookingsProps {
  bookings?: Booking[];
}

export default function Bookings({ bookings: propBookings }: BookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("admin_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const response = await fetch(`${apiUrl}/api/admin/bookings/all`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : "",
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include',
          mode: 'cors'
        });
        
        
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Access Denied: You do not have permission to view this page.');
          }
          throw new Error('Failed to fetch bookings');
        }

        const data = await response.json();
        console.log(data)
        setBookings(data.bookings);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load bookings';
        console.error('Error fetching bookings:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-red-600 mb-2">Error loading bookings</h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-600 mb-2">No bookings found</h3>
        <p className="text-gray-500">There are no bookings to display.</p>
      </div>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Bookings</CardTitle>
        {/* <CardDescription>Total Bookings</CardDescription> */}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Booked Date</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Total Amount</TableHead>
              {/* <TableHead>Status</TableHead> */}
              {/* <TableHead>Actions</TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking._id}>
                <TableCell>{booking.event?.title||"NA"}</TableCell>
                <TableCell>{booking.user?.name||"NA"}</TableCell>
                <TableCell>{new Date(booking.bookedAt).toLocaleDateString()}</TableCell>
                <TableCell>{booking.quantity}</TableCell>
                <TableCell>₹{booking.total}</TableCell>
                {/* <TableCell>
                  <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                    {booking.status}
                  </Badge>
                </TableCell> */}
                {/* <TableCell>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell> */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
