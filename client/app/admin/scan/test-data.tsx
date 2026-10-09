"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';

// This component helps create test QR codes for testing the scanner
export default function TestData() {
  const router = useRouter();
  const [testBookings, setTestBookings] = React.useState([
    {
      id: '1',
      bookingId: '64f5a3b2c8761234567890ab',
      bookingCode: 'SPX20250724',
      eventTitle: 'Summer Concert',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      phone: '9876543210',
      eventDate: '2025-07-24',
      ticketType: 'VIP',
      quantity: 2,
      price: 2500,
    },
    {
      id: '2',
      bookingId: '64f5a3b2c8761234567890ac',
      bookingCode: 'SPX20250725',
      eventTitle: 'Tech Conference',
      userName: 'Jane Smith',
      userEmail: 'jane@example.com',
      phone: '9876543211',
      eventDate: '2025-07-25',
      ticketType: 'Regular',
      quantity: 1,
      price: 1200,
    }
  ]);

  const generateQrData = (booking: any) => {
    // Format 1: JSON
    const jsonData = {
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode,
      eventDate: booking.eventDate,
      userId: booking.userName
    };
    
    // Format 2: Plain text (like what we see in booking-invoice.tsx)
    const plainTextData = `Booking Id: ${booking.bookingId}
Booking Date: ${booking.eventDate}
Name: ${booking.userName}
Email: ${booking.userEmail}
Phone: ${booking.phone}
Event: ${booking.eventTitle}
Ticket: ${booking.ticketType}
Quantity: ${booking.quantity}
Total: ₹${booking.price}`;

    return {
      json: JSON.stringify(jsonData),
      plain: plainTextData
    };
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Test QR Codes</h1>
        <Button onClick={() => router.push('/admin/scan')}>
          Go to Scanner
        </Button>
      </div>

      <p className="mb-6 text-gray-600">
        Use these QR codes to test the admin verification flow. Scan them with the QR scanner in the admin panel.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {testBookings.map(booking => {
          const qrData = generateQrData(booking);
          
          return (
            <Card key={booking.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                <CardTitle>{booking.eventTitle} - {booking.ticketType}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col items-center justify-center">
                    <h3 className="font-semibold mb-4">JSON Format</h3>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <QRCode 
                        value={qrData.json}
                        size={150}
                        className="mx-auto"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Scan to test JSON format</p>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center">
                    <h3 className="font-semibold mb-4">Plain Text Format</h3>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <QRCode 
                        value={qrData.plain}
                        size={150}
                        className="mx-auto"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Scan to test text format</p>
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <h3 className="font-semibold mb-2">Booking Details:</h3>
                  <ul className="space-y-1 text-sm">
                    <li><span className="font-medium">Booking ID:</span> {booking.bookingId}</li>
                    <li><span className="font-medium">Booking Code:</span> {booking.bookingCode}</li>
                    <li><span className="font-medium">Name:</span> {booking.userName}</li>
                    <li><span className="font-medium">Event Date:</span> {booking.eventDate}</li>
                    <li><span className="font-medium">Ticket Type:</span> {booking.ticketType}</li>
                    <li><span className="font-medium">Quantity:</span> {booking.quantity}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
