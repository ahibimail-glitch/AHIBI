"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, CheckCircle, User, Calendar, Clock, Users, Hash, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Navbar from '../../../Navbar';
import Footer from '../../../Footer';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface BookingDetails {
  _id: string;
  user: { name: string; email: string; phone: string };
  bookingDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  specialNotes: string;
  pricing: { totalAmount: number; paymentStatus: string };
  paymentDetails: { paymentId: string };
  bookedAt: string;
}

export default function BookingInvoicePage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bookingId) {
      const fetchBookingDetails = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/aiko/bookings/${bookingId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          if (data.success) {
            setBooking(data.data);
          } else {
            toast.error(data.message || 'Failed to fetch booking details.');
          }
        } catch (error) {
          toast.error('An error occurred while fetching booking details.');
        } finally {
          setLoading(false);
        }
      };
      fetchBookingDetails();
    }
  }, [bookingId]);

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);

    try {
      const canvas = await html2canvas(invoiceRef.current, { useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`AikoHall-Invoice-${booking?._id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500">Booking not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-12 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Booking Confirmed!</h1>
              <p className="text-gray-500">Thank you for your booking. Here is your invoice.</p>
            </div>
            <Button onClick={handleDownloadPdf} disabled={downloading}>
              <Download className="h-4 w-4 mr-2" />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </Button>
          </div>

          <Card ref={invoiceRef} className="p-8 bg-white shadow-lg">
            <CardHeader className="border-b pb-6 mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-purple-700">INVOICE</h2>
                        <p className="text-sm text-gray-500">Aiko Hall, Dimapur</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">Booking ID</p>
                        <p className="text-gray-600 text-sm">{booking._id}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Billed To:</h3>
                  <div className="flex items-center mb-2">
                    <User className="h-4 w-4 mr-2 text-gray-500"/>
                    <span>{booking.user.name}</span>
                  </div>
                  <p className="text-sm text-gray-600 pl-6">{booking.user.email}</p>
                  <p className="text-sm text-gray-600 pl-6">{booking.user.phone}</p>
                </div>
                <div className="text-right">
                    <h3 className="font-semibold text-gray-700 mb-3">Payment Details:</h3>
                    <p className="text-sm"><strong>Date:</strong> {format(new Date(booking.bookedAt), 'PPP')}</p>
                    <p className="text-sm"><strong>Payment ID:</strong> {booking.paymentDetails?.paymentId || 'N/A'}</p>
                    <Badge className={`${booking.pricing.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} mt-2`}>
                        {booking.pricing.paymentStatus}
                    </Badge>
                </div>
              </div>

              <h3 className="font-semibold text-gray-700 mb-3">Booking Summary:</h3>
              <div className="border rounded-lg">
                <div className="p-4 flex justify-between items-center border-b">
                    <div className='flex items-center'>
                        <Calendar className="h-5 w-5 mr-3 text-purple-600"/>
                        <div>
                            <p className='font-medium'>Event Date</p>
                            <p className='text-sm text-gray-600'>{format(new Date(booking.bookingDate), 'PPP')}</p>
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <Clock className="h-5 w-5 mr-3 text-purple-600"/>
                        <div>
                            <p className='font-medium'>Timings</p>
                            <p className='text-sm text-gray-600'>{booking.startTime} - {booking.endTime}</p>
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <Users className="h-5 w-5 mr-3 text-purple-600"/>
                        <div>
                            <p className='font-medium'>Guests</p>
                            <p className='text-sm text-gray-600'>{booking.guestCount}</p>
                        </div>
                    </div>
                </div>
                {booking.specialNotes && (
                    <div className="p-4 border-b">
                        <p className='font-medium'>Special Notes</p>
                        <p className='text-sm text-gray-600 mt-1'>{booking.specialNotes}</p>
                    </div>
                )}
                <div className="p-4 flex justify-end items-center bg-gray-50">
                    <p className='font-semibold text-lg'>Total Amount Paid:</p>
                    <p className='font-bold text-xl text-purple-700 ml-4'>₹{booking.pricing.totalAmount.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="mt-12 text-center text-xs text-gray-500">
                <p>Thank you for choosing Aiko Hall. We look forward to hosting your event!</p>
                <p>This is a computer-generated invoice and does not require a signature.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
