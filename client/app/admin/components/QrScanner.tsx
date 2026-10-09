"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { QrCode, Upload, Search, CheckCircle, XCircle, AlertCircle, Clock, Camera, Smartphone } from "lucide-react";
import axios from 'axios';
import RealQrScanner from './RealQrScanner';
import jsQR from 'jsqr';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Event {
  _id: string;
  title: string;
}

interface BookingVerification {
  bookingId: string;
  eventDate: string;
  userId: string;
  ticketType: string;
  status?: 'VALID' | 'INVALID' | 'ALREADY_USED' | 'PENDING' | 'CHECKED_IN';
  checkedInAt?: string;
  checkedOutAt?: string;
  verificationMessage?: string;
  capacity?: number;
  usedEntries?: number;
  remainingEntries?: number;
}

const QrScanner = () => {
  const [activeTab, setActiveTab] = useState<string>("scan");
  const [manualCode, setManualCode] = useState<string>("");
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [verification, setVerification] = useState<BookingVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<BookingVerification[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showAlreadyUsedAnimation, setShowAlreadyUsedAnimation] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        // Fetch all events without pagination limit
        const response = await fetch(`${apiUrl}/api/events?limit=10000`);
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
        setEvents(data.data.events);
      } catch (err: any) {
        setError('Could not load events. Please refresh the page.');
        console.error("Error fetching events:", err);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (showAlreadyUsedAnimation) {
      const timer = setTimeout(() => {
        setShowAlreadyUsedAnimation(false);
      }, 2000); // Show for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [showAlreadyUsedAnimation]);

  // Function to handle QR code scanning from real camera
  const handleRealQrScan = (qrData: string) => {
    setScanning(false);
    setError(null);
    setVerification(null);

    try {
      let bookingPayload: { bookingId: string } | null = null;
      let parsedData: any = null;

      try {
        parsedData = JSON.parse(qrData);
        if (parsedData.bookingId) {
          bookingPayload = {
            bookingId: parsedData.bookingId,
          };
        }
      } catch (e) {
        // Not a JSON object, treat as plain text booking ID
        bookingPayload = { bookingId: qrData };
      }

      if (!bookingPayload || !bookingPayload.bookingId) {
        throw new Error("Invalid QR code: No booking ID found.");
      }

      // If we have the full QR data, use it to create a more complete object
      if (parsedData && parsedData.bookingId) {
        const bookingToVerify: BookingVerification = {
          bookingId: parsedData.bookingId,
          userId: parsedData.name || 'Unknown',
          ticketType: parsedData.ticketType || 'Unknown',
          eventDate: parsedData.bookingDate || new Date().toISOString(),
          status: 'VALID',
          verificationMessage: "Ticket data loaded. Ready to verify entry."
        };
        verifyBooking(bookingToVerify);
      } else {
        // Handle plain text QR codes
        const bookingToVerify: BookingVerification = {
          bookingId: bookingPayload.bookingId,
          userId: 'Unknown',
          ticketType: 'Unknown',
          eventDate: new Date().toISOString(),
          status: 'VALID',
          verificationMessage: "Ticket data loaded. Ready to verify entry."
        };
        verifyBooking(bookingToVerify);
      }
    } catch (err: any) {
      console.error("Error parsing QR data:", err);
      setError(err.message || "Invalid QR code format. Please try again.");
    }
  };

  // Start scanning with real QR scanner
  const startRealScan = () => {
    setScanning(true);
    setError(null);
  };

  // Handle QR scanner errors
  const handleScannerError = (err: any) => {
    console.error("Scanner error:", err);
    setError("Camera error: " + (err.message || "Unknown error"));
    setScanning(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("file is using");
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUpload(file);
    setScanning(true);
    setError(null);
    setVerification(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          setError("Could not process the uploaded image.");
          setScanning(false);
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        const imageData = context.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        setScanning(false);

        if (code) {
          try {
            // Try parsing as JSON if possible
            const parsedData = JSON.parse(code.data);
            console.log('QR code contains JSON data:', parsedData);
          } catch (e) {
            // Not JSON, that's OK
            console.log('QR code contains text data:', code.data);
          }

          handleRealQrScan(code.data);
        } else {
          setError("No QR code found in the uploaded image.");
        }
      };
      img.onerror = () => {
        setError("Failed to load the image file.");
        setScanning(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
      setScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setError("Please enter a booking code");
      return;
    }

    // In a real implementation, we would search for the booking by code
    // For now, we'll assume the booking code is the booking ID for simplicity
    const bookingData: BookingVerification = {
      bookingId: manualCode, // Using the manual code as the booking ID
      eventDate: new Date().toISOString(),
      userId: "Unknown", // Will be populated from the API response
      ticketType: "Unknown", // Will be populated from the API response
      verificationMessage: "Ticket verified. Ready to scan entry.",
      status: "VALID", // Assuming valid unless we know otherwise
    };

    verifyBooking(bookingData);
  };

  // Function to verify booking with backend
  const verifyBooking = async (bookingData: BookingVerification) => {
    setError(null);

    try {
      // Get API URL with fallback
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // Check if we have a valid ticket ID (in our case, it's stored as bookingId)
      if (!bookingData.bookingId) {
        throw new Error("Invalid ticket ID");
      }

      // First, we need to get the ticket information to retrieve user details
      // This would typically be a separate API call to get ticket info
      // Here we'll just use a placeholder as we don't have that API yet

      // Create a verified booking object based on the QR data
      if (!selectedEvent) {
        throw new Error("Please select an event before scanning.");
      }

      const response = await fetch(`${apiUrl}/api/bookings/verify-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: bookingData.bookingId,
          eventId: selectedEvent
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Verification failed');
      }

      const verifiedBooking: BookingVerification = {
        ...bookingData,
        ...result, // Populate with response from backend
      };
      console.log(verifiedBooking);
      setVerification(verifiedBooking);

      if (verifiedBooking.status === 'ALREADY_USED') {
        setShowAlreadyUsedAnimation(true);
      }

      // Add to recent scans
      setRecentScans(prev => [verifiedBooking, ...prev].slice(0, 10));

      // Reset form
      setManualCode("");
      setFileUpload(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (err: any) {
      console.error("Error verifying booking:", err);
      setError(err.message || "Failed to verify ticket. Please try again.");
    }
  };

  // Helper function to get verification message
  const getVerificationMessage = (verification: BookingVerification): string => {
    if (verification.verificationMessage) {
      return verification.verificationMessage;
    }

    // Check if this is a season pass
    if (isSeasonPass(verification.ticketType)) {
      return verification.status === 'VALID' 
        ? "Season pass verified! Valid for all events."
        : verification.status === 'ALREADY_USED'
          ? "Season pass already used at this event."
          : "Season pass verification failed.";
    }

    return verification.status === 'VALID' 
      ? "Ticket verified successfully!"
      : verification.status === 'ALREADY_USED'
        ? "This ticket has already been used."
        : "Ticket verification failed.";
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'VALID':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" /> Valid
          </Badge>
        );
      case 'INVALID':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" /> Invalid
          </Badge>
        );
      case 'ALREADY_USED':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            <AlertCircle className="h-3 w-3 mr-1" /> Already Used
          </Badge>
        );
      case 'CHECKED_IN':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" /> Checked In
          </Badge>
        );
      case 'PENDING':
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  // Helper to check if ticket is a season pass
  const isSeasonPass = (ticketType: string | undefined): boolean => {
    if (!ticketType) return false;
    return ticketType.toLowerCase().includes('season');
  };

  const handleAllowEntry = async () => {
    if (!verification || !verification.bookingId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${apiUrl}/api/bookings/check-in`, {
        bookingId: verification.bookingId,
      });

      const result = response.data;

      if (result.status === 'CHECKED_IN') {
        const updatedVerification: BookingVerification = {
          ...verification,
          status: 'CHECKED_IN',
          checkedInAt: result.checkedInAt,
          verificationMessage: 'Check-in successful.',
        };
        setVerification(updatedVerification);

        // Update in recent scans
        setRecentScans(prev =>
          prev.map(scan =>
            scan.bookingId === updatedVerification.bookingId ? updatedVerification : scan
          )
        );
      } else {
        throw new Error(result.message || 'Failed to check-in');
      }
    } catch (err: any) {
      console.error("Error allowing entry:", err);
      setError(err.response?.data?.message || "Failed to record entry. Please try again.");
    }
  };

  const handleDenyEntry = () => {
    // Reset the verification
    setVerification(null);
  };

  const handleCheckout = async () => {
    if (!verification || !verification.bookingId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${apiUrl}/api/bookings/check-out`, {
        bookingId: verification.bookingId,
      });

      const result = response.data;

      if (result.status === 'VALID') {
        const updatedVerification: BookingVerification = {
          ...verification,
          status: 'VALID',
          checkedOutAt: result.checkedOutAt,
          verificationMessage: 'Check-out successful. Ticket can be reused.',
        };
        setVerification(updatedVerification);

        // Update in recent scans
        setRecentScans(prev =>
          prev.map(scan =>
            scan.bookingId === updatedVerification.bookingId ? updatedVerification : scan
          )
        );
      } else {
        throw new Error(result.message || 'Failed to check-out');
      }
    } catch (err: any) {
      console.error("Error checking out:", err);
      setError(err.response?.data?.message || "Failed to record check-out. Please try again.");
    }
  };

  return (
    <div className="container mx-auto">
      {/* Animation Overlay for Already Used Tickets */}
      {showAlreadyUsedAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-in fade-in-0">
          <div className="bg-white p-10 rounded-lg shadow-2xl flex flex-col items-center animate-in fade-in-0 zoom-in-95">
            <AlertCircle className="h-28 w-28 text-amber-500" />
            <p className="mt-5 text-4xl font-bold text-gray-800">Already Used</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scanner Section */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="mr-2 h-5 w-5" />
                QR Code Scanner
              </CardTitle>
              <CardDescription>
                Select an event, then scan QR codes from tickets to verify entry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label htmlFor="event-select" className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
                <Select onValueChange={setSelectedEvent} defaultValue={selectedEvent || ""}>
                  <SelectTrigger id="event-select">
                    <SelectValue placeholder="Choose an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.length > 0 ? (
                      events.map(event => (
                        <SelectItem key={event._id} value={event._id}>
                          {event.title}
                        </SelectItem>
                      ))
                    ) : null}
                  </SelectContent>
                </Select>
                {events.length === 0 && (
                  <div className="text-sm text-gray-500 px-2 py-1">No active events found</div>
                )}
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="scan">Camera Scan</TabsTrigger>
                  <TabsTrigger value="upload">Upload Image</TabsTrigger>
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                </TabsList>

                <TabsContent value="scan" className="space-y-4">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 h-64 overflow-hidden">
                    {scanning ? (
                      <div className="w-full h-full">
                        <RealQrScanner
                          onScan={handleRealQrScan}
                          onError={handleScannerError}
                          isActive={scanning}
                        />
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="bg-red-500/70 hover:bg-red-600"
                            onClick={() => setScanning(false)}
                          >
                            Stop
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Camera className="h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-4">Position the QR code in front of the camera</p>
                        <Button onClick={startRealScan}>
                          <Smartphone className="w-4 h-4 mr-2" />
                          Start Camera Scanning
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 h-64">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                    />
                    {scanning ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-500">Processing image...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-4">Upload an image containing a QR code</p>
                        <Button onClick={() => fileInputRef.current?.click()}>
                          Select Image
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <form onSubmit={handleManualSubmit}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="booking-code">Booking Code</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="booking-code"
                            placeholder="Enter booking code (e.g., SPX2024072501)"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                          />
                          <Button type="submit">
                            <Search className="h-4 w-4 mr-2" />
                            Verify
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

          {/* Verification Result Section */}
        <div className="md:col-span-2">
          {verification && (
            <Card className={`border-2 ${verification.status === 'VALID' ? 'border-green-500' : verification.status === 'CHECKED_IN' ? 'border-blue-500' : 'border-red-500'}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Verification Result</span>
                  {getStatusBadge(verification.status)}
                </CardTitle>
                <CardDescription>{getVerificationMessage(verification)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">Booking ID: {verification.bookingId}</div>
                <p><span className="font-semibold">User ID:</span> {verification.userId}</p>
                <p><span className="font-semibold">Ticket:</span> {verification.ticketType}</p>
                {verification.capacity && verification.capacity > 1 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                    <p className="font-semibold">Ticket Capacity: {verification.capacity}</p>
                    <div className="flex justify-between mt-1">
                      <span>Used: {verification.usedEntries || 0}</span>
                      <span>Remaining: {verification.remainingEntries || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div 
                        className={`h-2.5 rounded-full ${verification.remainingEntries === 0 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${((verification.usedEntries || 0) / (verification.capacity || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {verification.checkedInAt && (
                  <p><span className="font-semibold">Checked In:</span> {new Date(verification.checkedInAt).toLocaleString()}</p>
                )}
                {verification.checkedOutAt && (
                  <p><span className="font-semibold">Last Checked Out:</span> {new Date(verification.checkedOutAt).toLocaleString()}</p>
                )}
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                {verification.status === 'VALID' && (
                  <Button onClick={handleAllowEntry} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" /> Allow Entry
                  </Button>
                )}
                {verification.status === 'ALREADY_USED' && (
                  <Button onClick={handleCheckout} className="bg-blue-600 hover:bg-blue-700">
                    <CheckCircle className="mr-2 h-4 w-4" /> Check Out
                  </Button>
                )}
                <Button variant="outline" onClick={handleDenyEntry}>
                  <XCircle className="mr-2 h-4 w-4" />
                  {verification.status === 'VALID' ? 'Deny' : 'Clear'}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default QrScanner;
