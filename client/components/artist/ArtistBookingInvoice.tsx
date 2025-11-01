"use client";

import { useRef, useState } from "react";
import { Download, Calendar, Clock, MapPin, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// Dynamic imports for PDF generation
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';

interface ArtistBookingInvoiceProps {
  booking: {
    _id: string;
    artist: {
      _id: string;
      name: string;
      email?: string;
      phone?: string;
      city?: string;
    };
    organizer: {
      _id: string;
      name: string;
      email?: string;
      phone?: string;
    };
    event: {
      name: string;
      description?: string;
      date: string;
      startTime: string;
      endTime: string;
      duration?: number;
      venue: {
        name: string;
        address: string;
        city: string;
        state?: string;
        pincode?: string;
      };
      eventType: string;
    };
    booking: {
      status: string;
      requestedAmount: number;
      finalAmount: number;
      paymentStatus: string;
      paymentDetails?: {
        paymentId: string;
        orderId: string;
        paymentGateway: string;
      };
      paymentOrderId?: string;
    };
    contract?: {
      organizerRequirements?: string;
    };
    createdAt: string;
  };
}

export default function ArtistBookingInvoice({ booking }: ArtistBookingInvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const generateInvoiceNumber = () => {
    const bookingId = booking._id.slice(-8).toUpperCase();
    return `AHIBI-ART-${bookingId}`;
  };

  const handleDownloadInvoice = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);

    try {
      // Dynamically import required libraries
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(invoiceRef.current, {
        useCORS: true,
        background: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage({
        imageData: imgData,
        x: 10,
        y: 10,
        width: imgWidth,
        height: imgHeight,
        compression: 'FAST'
      });

      // Add footer
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Invoice Number: ${generateInvoiceNumber()} | Generated on ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );

      const fileName = `AHIBI_Artist_Booking_Invoice_${booking._id.slice(-6)}.pdf`;
      pdf.save(fileName);

      setDownloading(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setDownloading(false);
      alert('Failed to generate invoice. Please try again.');
    }
  };

  const invoiceNumber = generateInvoiceNumber();
  const invoiceDate = formatDate(new Date().toISOString());
  const bookingDate = formatDate(booking.event.date);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Booking Invoice</h3>
        <Button
          onClick={handleDownloadInvoice}
          disabled={downloading}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Download className="h-4 w-4 mr-2" />
          {downloading ? 'Generating PDF...' : 'Download Invoice'}
        </Button>
      </div>

      <Card ref={invoiceRef} className="p-8 bg-white" id="invoice-content">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-purple-600 pb-4">
            <div>
              <h1 className="text-3xl font-bold text-purple-600 mb-2">AHIBI</h1>
              <p className="text-gray-600">Next-Gen Event Management Platform</p>
              <p className="text-sm text-gray-500 mt-2">www.ahibi.com | support@ahibi.com</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">INVOICE</h2>
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Invoice #:</span> {invoiceNumber}</p>
                <p><span className="font-semibold">Date:</span> {invoiceDate}</p>
                <p><span className="font-semibold">Booking ID:</span> {booking._id}</p>
              </div>
            </div>
          </div>

          {/* Billing Details */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-3 text-purple-600 border-b border-purple-200 pb-2">
                Organizer Details
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{booking.organizer.name}</p>
                {booking.organizer.email && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {booking.organizer.email}
                  </p>
                )}
                {booking.organizer.phone && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    {booking.organizer.phone}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3 text-purple-600 border-b border-purple-200 pb-2">
                Artist Details
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{booking.artist.name}</p>
                {booking.artist.email && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {booking.artist.email}
                  </p>
                )}
                {booking.artist.phone && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    {booking.artist.phone}
                  </p>
                )}
                {booking.artist.city && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    {booking.artist.city}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="border-t border-b border-gray-200 py-4">
            <h3 className="font-semibold text-lg mb-3 text-purple-600">Event Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Event Name</p>
                <p className="font-semibold">{booking.event.name}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Event Type</p>
                <p className="font-semibold capitalize">{booking.event.eventType.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1 flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Event Date
                </p>
                <p className="font-semibold">{bookingDate}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Time
                </p>
                <p className="font-semibold">
                  {formatTime(booking.event.startTime)} - {formatTime(booking.event.endTime)}
                  {booking.event.duration && ` (${booking.event.duration} hours)`}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600 mb-1 flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  Venue
                </p>
                <p className="font-semibold">{booking.event.venue.name}</p>
                <p className="text-gray-600 text-xs mt-1">
                  {booking.event.venue.address}, {booking.event.venue.city}
                  {booking.event.venue.state && `, ${booking.event.venue.state}`}
                  {booking.event.venue.pincode && ` - ${booking.event.venue.pincode}`}
                </p>
              </div>
              {booking.event.description && (
                <div className="col-span-2">
                  <p className="text-gray-600 mb-1">Description</p>
                  <p className="text-sm">{booking.event.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="border-t border-b border-gray-200 py-4">
            <h3 className="font-semibold text-lg mb-3 text-purple-600">Payment Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Booking Amount:</span>
                <span className="font-semibold">₹{booking.booking.finalAmount || booking.booking.requestedAmount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`font-semibold ${
                  booking.booking.paymentStatus === 'fully_paid' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {booking.booking.paymentStatus === 'fully_paid' ? 'Fully Paid' : 'Pending'}
                </span>
              </div>
              {booking.booking.paymentDetails && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Payment Gateway:</span>
                    <span className="font-semibold capitalize">{booking.booking.paymentDetails.paymentGateway}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-xs">{booking.booking.paymentDetails.paymentId}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-mono text-xs">{booking.booking.paymentDetails.orderId}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-800">Total Amount Paid</span>
              <span className="text-2xl font-bold text-purple-600">
                ₹{booking.booking.finalAmount || booking.booking.requestedAmount}
              </span>
            </div>
          </div>

          {/* Special Requirements */}
          {booking.contract?.organizerRequirements && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-lg mb-2 text-purple-600">Special Requirements</h3>
              <p className="text-sm text-gray-700">{booking.contract.organizerRequirements}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-purple-600 pt-4 mt-6">
            <div className="text-center space-y-2 text-xs text-gray-500">
              <p className="font-semibold text-gray-700">Thank you for choosing AHIBI!</p>
              <p>This is a computer-generated invoice and does not require a signature.</p>
              <p>For any queries, contact support@ahibi.com</p>
              <p className="mt-4 pt-4 border-t border-gray-200">
                Invoice Generated on {new Date().toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

