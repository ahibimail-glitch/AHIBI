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

interface BookingVerification {
  bookingId: string;
  eventDate: string;
  userId: string;
  ticketType: string;
  status?: 'VALID' | 'INVALID' | 'ALREADY_USED' | 'PENDING';
  checkedInAt?: string;
  verificationMessage?: string;
}

const QrScanner = () => {
  const [activeTab, setActiveTab] = useState<string>("scan");
  const [manualCode, setManualCode] = useState<string>("");
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [verification, setVerification] = useState<BookingVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recentScans, setRecentScans] = useState<BookingVerification[]>([]);

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
      // In a full implementation, we would make an API call to get more ticket details
      const verifiedBooking: BookingVerification = {
        bookingId: bookingData.bookingId,
        eventDate: new Date().toISOString(), // This would come from the ticket API
        userId: bookingData.userId || 'unknown', // This would come from the ticket API
        status: 'VALID', // Assuming valid unless we know otherwise
        verificationMessage: "Ticket verified. Ready to scan entry.",
        ticketType: bookingData.ticketType, // This would come from the ticket API
      };

      // Check for existing scans to determine if already used
      // Note: In a production app, this would be another API call to check status
      console.log(verifiedBooking);
      setVerification(verifiedBooking);

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

  const getVerificationMessage = (status: string): string => {
    switch (status) {
      case 'VALID':
        return "Booking is valid. Allow entry.";
      case 'INVALID':
        return "Invalid booking. Entry not allowed.";
      case 'ALREADY_USED':
        return "This ticket has already been used for entry.";
      default:
        return "Unknown status";
    }
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
      case 'PENDING':
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  const handleAllowEntry = async () => {
    if (!verification) return;

    try {
      // Get API URL with fallback
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // Make API call to scan QR code and record entry
      const response = await axios.post(`${apiUrl}/api/qr/scan`, {
        ticketId: verification.bookingId,  // Using bookingId as ticketId
        userId: verification.userId        // Using userId from verification
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      // Extract detailed information from response
      const { ticketDetails, userDetails, eventDetails } = response.data;
      
      // Update verification status with the additional information
      const updatedVerification: BookingVerification = {
        ...verification,
        status: 'ALREADY_USED',
        checkedInAt: new Date().toISOString(),
        userId: userDetails?.name || verification.userId,
        ticketType: ticketDetails?.ticketType || verification.ticketType,
        eventDate: eventDetails?.date || verification.eventDate,
        verificationMessage: `Entry allowed and recorded successfully. ${ticketDetails?.remainingEntries > 0 ? `${ticketDetails.remainingEntries} entries remaining.` : ''}`
      };

      setVerification(updatedVerification);

      // Update in recent scans
      setRecentScans(prev =>
        prev.map(scan =>
          scan.bookingId === updatedVerification.bookingId ? updatedVerification : scan
        )
      );

    } catch (err: any) {
      console.error("Error allowing entry:", err);

      // Handle specific error codes from our QR scan endpoint
      if (err.response?.data?.error === 'ALREADY_ENTERED') {
        setError("This ticket has already been used. No multiple entries allowed.");
      } else if (err.response?.data?.error === 'TICKET_EXHAUSTED') {
        setError("This ticket has reached its maximum capacity. No more entries allowed.");
      } else {
        setError(err.response?.data?.message || "Failed to record entry. Please try again.");
      }
    }
  };

  const handleDenyEntry = () => {
    // Reset the verification
    setVerification(null);
  };

  return (
    <div className="container mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scanner Section */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="mr-2 h-5 w-5" />
                QR Code Scanner
              </CardTitle>
              <CardDescription>
                Scan event tickets to verify attendees
              </CardDescription>
            </CardHeader>
            <CardContent>
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

          {/* Verification Result */}
          {verification && (
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold">Verification Result</CardTitle>
                {getStatusBadge(verification.status)}
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Booking ID</p>
                      <p className="font-mono">{verification.bookingId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Ticket Type</p>
                      <p className="font-mono">{verification.ticketType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Event Date</p>
                      <p>{new Date(verification.eventDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">User</p>
                      <p>{verification.userId}</p>
                    </div>
                    {verification.checkedInAt && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-500">Checked In At</p>
                        <p>{new Date(verification.checkedInAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <Alert className={
                    verification.status === 'VALID' ? "bg-green-50 border-green-200 text-green-800" :
                      verification.status === 'INVALID' ? "bg-red-50 border-red-200 text-red-800" :
                        "bg-amber-50 border-amber-200 text-amber-800"
                  }>
                    <AlertTitle className="font-bold">
                      {verification.status === 'VALID' ? "Valid Ticket" :
                        verification.status === 'INVALID' ? "Invalid Ticket" :
                          "Already Used"}
                    </AlertTitle>
                    <AlertDescription>
                      {verification.verificationMessage}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                {verification.status === 'VALID' ? (
                  <>
                    <Button variant="outline" onClick={handleDenyEntry}>Deny Entry</Button>
                    <Button onClick={handleAllowEntry}>Allow Entry</Button>
                  </>
                ) : (
                  <Button variant="outline" className="ml-auto" onClick={() => setVerification(null)}>
                    Close
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Recent Scans Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>
                Last {recentScans.length} ticket verifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentScans.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No recent scans</p>
                ) : (
                  recentScans.map((scan, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setVerification(scan)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{scan.userId}</p>
                        </div>
                        {getStatusBadge(scan.status)}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {scan.checkedInAt ?
                          `Checked in: ${new Date(scan.checkedInAt).toLocaleTimeString()}` :
                          `Scanned: ${new Date().toLocaleTimeString()}`
                        }
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QrScanner;
