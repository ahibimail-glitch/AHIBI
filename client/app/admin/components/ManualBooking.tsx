"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Ticket, CheckCircle, XCircle, AlertCircle, Clock, QrCode, DownloadIcon, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import axios from 'axios';
import dynamic from 'next/dynamic';

// Dynamically import QRCode component with no SSR
// const QRCode = dynamic(() => import('qrcode.react').then(mod => mod.default), {
//   ssr: false,
//   loading: () => <div className="w-[200px] h-[200px] bg-gray-100 animate-pulse rounded-lg"></div>
// });

interface Event {
  _id: string;
  title: string;
  ticketTypes: TicketType[];
  startDate: string;
  endDate?: string;
  location: {
    address?: string;
    city?: string;
  };
}

interface TicketType {
  _id?: string;
  name: string;
  price: number;
  description?: string;
  sold?: number;
  capacity?: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface BookingFormData {
  event: string;
  user: string;
  ticketType: string;
  quantity: number;
  price: number;
  total: number;
}

const ManualBooking = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [qrValue, setQrValue] = useState<string>("");
  
  const [formData, setFormData] = useState<BookingFormData>({
    event: "",
    user: "",
    ticketType: "",
    quantity: 1,
    price: 0,
    total: 0
  });

  const [paymentInfo, setPaymentInfo] = useState({
    transactionId: `TXN${Date.now().toString().slice(-8)}`,
    status: 'success',
    method: 'Admin Generated'
  });

  const ticketRef = useRef<HTMLDivElement>(null);

  // Load events and users on component mount
  useEffect(() => {
    fetchEvents();
    fetchUsers();
  }, []);

  // Update ticket types when an event is selected
  useEffect(() => {
    if (selectedEvent) {
      setTicketTypes(selectedEvent.ticketTypes || []);
      setFormData(prev => ({
        ...prev,
        ticketType: "",
        price: 0,
        total: 0
      }));
    }
  }, [selectedEvent]);

  // Update price and total when ticket type or quantity changes
  useEffect(() => {
    if (formData.ticketType && formData.quantity) {
      const selectedTicket = ticketTypes.find(t => t.name === formData.ticketType);
      if (selectedTicket) {
        const price = selectedTicket.price;
        const total = price * formData.quantity;
        setFormData(prev => ({
          ...prev,
          price,
          total
        }));
      }
    }
  }, [formData.ticketType, formData.quantity, ticketTypes]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${apiUrl}/api/events`);
      setEvents(response.data.data.events || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to load events. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('admin_token');
      
      console.log("Fetching users with token:", token ? "Token exists" : "No token");
      
      // Request a high limit to get all users (1000 should be enough for most cases)
      const response = await axios.get(`${apiUrl}/api/admin/users?limit=1000`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("Users API response:", response.data);
      
      // Based on the API response structure: {success: true, message: '...', data: {users: [...]}}
      if (response.data?.data?.users && Array.isArray(response.data.data.users)) {
        console.log("Found users in response.data.data.users:", response.data.data.users.length);
        setUsers(response.data.data.users);
      } else if (response.data?.users && Array.isArray(response.data.users)) {
        console.log("Found users in response.data.users:", response.data.users.length);
        setUsers(response.data.users);
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        console.log("Found users in response.data.data:", response.data.data.length);
        setUsers(response.data.data);
      } else if (Array.isArray(response.data)) {
        console.log("Found users in response.data:", response.data.length);
        setUsers(response.data);
      } else {
        console.error("Unexpected users data format:", response.data);
        setUsers([]);
        
        // For testing: Add some dummy users if no valid data format is found
        setUsers([
          { _id: "dummy1", name: "Test User 1", email: "test1@example.com", phone: "9876543210" },
          { _id: "dummy2", name: "Test User 2", email: "test2@example.com", phone: "9876543211" },
          { _id: "dummy3", name: "Test User 3", email: "test3@example.com", phone: "9876543212" }
        ]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      
      // For testing: Add some dummy users if the API fails
      setUsers([
        { _id: "dummy1", name: "Test User 1", email: "test1@example.com", phone: "9876543210" },
        { _id: "dummy2", name: "Test User 2", email: "test2@example.com", phone: "9876543211" },
        { _id: "dummy3", name: "Test User 3", email: "test3@example.com", phone: "9876543212" }
      ]);
    }
  };

  const handleEventChange = (eventId: string) => {
    const event = events.find(e => e._id === eventId);
    setSelectedEvent(event || null);
    setFormData(prev => ({
      ...prev,
      event: eventId
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 1 : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.event || !formData.user || !formData.ticketType || !formData.quantity) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Get the full event object for the booking payload
      const eventObj = events.find(e => e._id === formData.event);
      
      // Modified payload structure to match what the regular booking endpoint expects
      const payload = {
        event: formData.event,
        user: formData.user,
        ticketType: formData.ticketType,
        quantity: formData.quantity,
        price: formData.price,
        // Add fields that might be expected by a regular booking
        paymentMethod: "admin",
        paymentStatus: "completed",
        status: "confirmed"
      };
      
      console.log("Sending booking payload:", payload);

      // Try using the admin-manual-booking endpoint with admin token
      const response = await axios.post(
        `${apiUrl}/api/bookings/admin-manual-booking`, 
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('admin_token')}`
          }
        }
      );

      console.log("Booking response:", response.data);
      setSuccess(true);
      setBookingResult(response.data);
      
      // Create QR code data
      const selectedUser = users.find(u => u._id === formData.user);
      const qrData = JSON.stringify({
        bookingId: response.data.booking?.id || response.data.id || response.data._id || "",
        name: selectedUser?.name || "Unknown User",
        ticketType: formData.ticketType,
        quantity: formData.quantity,
        bookingDate: new Date().toISOString()
      });
      
      setQrValue(qrData);
      
      toast({
        title: "Success!",
        description: "Ticket has been booked successfully.",
      });
      
      setLoading(false);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Booking Failed",
        description: error.response?.data?.message || "An error occurred while creating the booking",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      event: "",
      user: "",
      ticketType: "",
      quantity: 1,
      price: 0,
      total: 0
    });
    setSelectedEvent(null);
    setSuccess(false);
    setBookingResult(null);
    setQrValue("");
  };

  const downloadQRCode = async () => {
    if (!ticketRef.current) return;
    
    try {
      // Display loading indicator
      toast({
        title: "Generating PDF",
        description: "Please wait while we generate your ticket PDF...",
        duration: 3000,
      });
      
      // Dynamically import the required libraries
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      // Improved options for better capture
      const options = {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff',
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight,
        // Ensure the full height is captured
        height: ticketRef.current.scrollHeight,
        width: ticketRef.current.scrollWidth,
      };
      
      // Generate canvas from ticket element
      const canvas = await html2canvas(ticketRef.current, options);
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Create PDF with appropriate dimensions
      // Use A4 for more space
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calculate dimensions for the PDF
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate the best fit while preserving aspect ratio
      const imgWidth = pageWidth - 20; // 10mm margins on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // If image height is too large for the page, scale it down
      const finalImgHeight = Math.min(imgHeight, pageHeight - 20);
      const finalImgWidth = finalImgHeight * (canvas.width / canvas.height);
      
      // Center the image on the page
      const xOffset = (pageWidth - finalImgWidth) / 2;
      
      // Add image to PDF with margins
      pdf.addImage({
        imageData: imgData,
        x: xOffset, // Centered horizontally
        y: 10, // Top margin
        width: finalImgWidth,
        height: finalImgHeight,
        compression: 'FAST'
      });
      
      // Add footer text
      const footerText = `Ticket ID: ${bookingResult?.booking?.id || 'N/A'} | Generated on: ${new Date().toLocaleDateString()}`;
      const fontSize = 8;
      const textWidth = pdf.getStringUnitWidth(footerText) * fontSize / pdf.internal.scaleFactor;
      const textX = (pageWidth - textWidth) / 2;
      const textY = pageHeight - 10; // 10mm from bottom
      
      pdf.setFontSize(fontSize);
      pdf.text(footerText, textX, textY);
      
      // Generate a filename with event name and booking ID
      const eventName = selectedEvent?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'ticket';
      const fileName = `${eventName}_ticket_${bookingResult?.booking?.id?.slice(-6) || Date.now()}.pdf`;
      
      // Save the PDF
      pdf.save(fileName);
      
      toast({
        title: "Download Complete",
        description: "Your ticket has been downloaded successfully!",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download ticket. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Add formatting helpers like in booking-invoice
  const formatDate = (date: string | number | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: string | number | Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Ticket className="h-5 w-5 mr-2" />
            Manual Ticket Booking
          </CardTitle>
          <CardDescription>
            Create tickets manually for users without payment processing
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {success ? (
            <div className="max-w-md mx-auto my-10" ref={ticketRef}>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Booking Successful</AlertTitle>
                <AlertDescription className="text-green-700">
                  The ticket has been booked successfully. The QR code has been generated below.
                </AlertDescription>
              </Alert>

              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Gradient Header */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-6 py-8 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10"></div>

                    {/* Centered Header Content */}
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <img src="/images/Logo.png" className='w-1/2 h-auto mb-3' alt="Logo" />
                        <p className="text-white/90 text-sm font-medium">Booking Confirmed For</p>
                        <h1 className="text-white text-2xl font-bold tracking-tight mt-1">{selectedEvent?.title || "Event Title"}</h1>
                    </div>
                </div>


                {/* Ticket Body */}
                <div className="px-6 py-6">
                    {/* Ticket Type & Details Section */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
                        {/* --- Ticket Category Section --- */}
                        <div className="text-center mb-4">
                            <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wider">Ticket Type</p>
                            <h2 className="text-3xl font-extrabold text-indigo-700 tracking-tight">
                                {formData.ticketType || "Season Pass"}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-blue-200 pt-4">
                            <div className="text-center">
                                <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                                <p className="text-sm font-bold text-gray-900">{formatDate(selectedEvent?.startDate || new Date())}</p>
                            </div>
                            <div className="text-center">
                                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {formatTime(selectedEvent?.startDate || new Date())}
                                    {selectedEvent?.endDate && selectedEvent.endDate !== selectedEvent.startDate && (
                                        <> - {formatTime(selectedEvent.endDate)}</>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Dashed Separator */}
                    <div className="border-t-2 border-dashed border-gray-200 my-6 relative">
                        <div className="absolute left-0 top-0 w-6 h-6 bg-gray-50 rounded-full -ml-9 -mt-3"></div>
                        <div className="absolute right-0 top-0 w-6 h-6 bg-gray-50 rounded-full -mr-9 -mt-3"></div>
                    </div>

                    {/* Total Amount & Payment Details */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-lg font-bold text-gray-900">Total Amount</span>
                            <span className="text-2xl font-bold text-green-600">{formatCurrency(formData.total)}</span>
                        </div>
                        {/* <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                    <span className="text-sm font-medium text-green-800">Payment Successful</span>
                                </div>
                                <span className="text-xs font-mono text-green-700">{paymentInfo.transactionId}</span>
                            </div>
                        </div> */}
                    </div>

                    {/* QR Code Section */}
                    <div className="text-center">
                        {qrValue ? (
                            <div className="flex flex-col items-center">
                                <div className="border-4 border-blue-100 rounded-lg p-2 bg-white inline-block">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrValue)}&size=180x180&margin=10`}
                                        alt="Booking QR Code"
                                        width={180}
                                        height={180}
                                        className="mx-auto"
                                        loading="eager"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            console.error('QR image failed to load');
                                            e.currentTarget.style.display = 'none';
                                            // Show fallback message if QR fails to load
                                            const fallbackElement = document.getElementById('qr-fallback');
                                            if (fallbackElement) {
                                                fallbackElement.style.display = 'block';
                                            }
                                        }}
                                    />
                                    {/* Fallback div for QR code errors */}
                                    <div 
                                        id="qr-fallback" 
                                        className="hidden p-4 bg-gray-100 w-[180px] h-[180px] flex items-center justify-center"
                                    >
                                        <div className="text-center">
                                            <QrCode className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">QR code unavailable</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-sm font-medium text-blue-700">Scan at {selectedEvent?.location?.address || "Event Location"} for Entry</p>
                                    {/* Improved Booking Code Display */}
                                    <div className="mt-3 bg-gray-100 px-3 py-1.5 rounded-md inline-block">
                                        <p className="text-xs text-gray-500">Booking Id</p>
                                        <p className="font-mono text-sm font-bold text-gray-800 tracking-wider">
                                            {bookingResult?.booking?.id || bookingResult?.booking?._id || ""}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-4 border-2 border-dashed rounded-lg">
                                <p className="text-sm text-gray-500">
                                    QR code is being generated. Please wait...
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t mt-6">
                    <div className="flex gap-3">
                        <button
                            onClick={downloadQRCode}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center disabled:bg-blue-300"
                        >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Download Ticket
                        </button>
                        <button
                            onClick={handleReset}
                            className="flex-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center"
                        >
                            Book Another
                        </button>
                    </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="event">Select Event</Label>
                    <Select 
                      onValueChange={(value) => handleEventChange(value)} 
                      value={formData.event}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event._id} value={event._id}>
                            {event.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="user">Select User</Label>
                    <Select 
                      onValueChange={(value) => handleSelectChange("user", value)}
                      value={formData.user}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.name} ({user.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ticketType">Ticket Type</Label>
                    <Select
                      disabled={!selectedEvent}
                      onValueChange={(value) => handleSelectChange("ticketType", value)}
                      value={formData.ticketType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ticket type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketTypes.map((ticket) => (
                          <SelectItem key={ticket.name} value={ticket.name}>
                            {ticket.name} - ₹{ticket.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md mt-4">
                <h3 className="font-semibold mb-2">Order Summary</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium">Price per ticket:</div>
                  <div>₹{formData.price}</div>
                  
                  <div className="font-medium">Quantity:</div>
                  <div>{formData.quantity}</div>
                  
                  <div className="font-medium">Total Amount:</div>
                  <div className="text-lg font-bold">₹{formData.total}</div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={loading || !formData.event || !formData.user || !formData.ticketType}
                >
                  {loading ? "Processing..." : "Book Ticket"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualBooking;
