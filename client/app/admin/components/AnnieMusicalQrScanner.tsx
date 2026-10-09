"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { QrCode, Upload, Search, CheckCircle, XCircle, AlertCircle, Clock, Camera, Smartphone, Music } from "lucide-react";
import axios from 'axios';
import RealQrScanner from './RealQrScanner';
import jsQR from 'jsqr';

interface AnnieBookingVerification {
  bookingId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  seats: Array<{
    id: string;
    price: number;
    category: string;
  }>;
  totalAmount: number;
  status?: 'VALID' | 'INVALID' | 'ALREADY_USED' | 'PENDING' | 'CHECKED_IN';
  checkedInAt?: string;
  checkedOutAt?: string;
  verificationMessage?: string;
  paymentId?: string;
  transactionId?: string;
  bookedAt?: string;
}

const AnnieMusicalQrScanner = () => {
  const [activeTab, setActiveTab] = useState<string>("scan");
  const [manualCode, setManualCode] = useState<string>("");
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [verification, setVerification] = useState<AnnieBookingVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<AnnieBookingVerification[]>([]);
  const [showAlreadyUsedAnimation, setShowAlreadyUsedAnimation] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAlreadyUsedAnimation) {
      const timer = setTimeout(() => {
        setShowAlreadyUsedAnimation(false);
      }, 2000);
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

      // Verify Annie Musical booking
      verifyAnnieBooking(bookingPayload.bookingId);
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

    verifyAnnieBooking(manualCode);
  };

  // Function to verify Annie Musical booking with backend
  const verifyAnnieBooking = async (bookingId: string) => {
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      if (!bookingId) {
        throw new Error("Invalid booking ID");
      }

      // Get admin token from localStorage
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error("Admin authentication required. Please login again.");
      }

      const response = await fetch(`${apiUrl}/api/annie-musical/verify-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          bookingId: bookingId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Verification failed');
      }

      const verifiedBooking: AnnieBookingVerification = {
        bookingId: result.bookingId,
        userId: result.userId,
        userName: result.userName,
        userEmail: result.userEmail,
        userPhone: result.userPhone,
        seats: result.seats,
        totalAmount: result.totalAmount,
        status: result.status,
        verificationMessage: result.message,
        paymentId: result.paymentId,
        transactionId: result.transactionId,
        bookedAt: result.bookedAt,
        checkedInAt: result.checkedInAt,
        checkedOutAt: result.checkedOutAt
      };

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
      console.error("Error verifying Annie Musical booking:", err);
      setError(err.message || "Failed to verify Annie Musical ticket. Please try again.");
    }
  };

  // Helper function to get verification message
  const getVerificationMessage = (verification: AnnieBookingVerification): string => {
    if (verification.verificationMessage) {
      return verification.verificationMessage;
    }

    return verification.status === 'VALID' 
      ? "Annie Musical ticket verified successfully!"
      : verification.status === 'ALREADY_USED'
        ? "This Annie Musical ticket has already been used."
        : "Annie Musical ticket verification failed.";
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

  const handleAllowEntry = async () => {
    if (!verification || !verification.bookingId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error("Admin authentication required. Please login again.");
      }

      const response = await axios.post(`${apiUrl}/api/annie-musical/check-in`, {
        bookingId: verification.bookingId,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      const result = response.data;

      if (result.status === 'CHECKED_IN') {
        const updatedVerification: AnnieBookingVerification = {
          ...verification,
          status: 'CHECKED_IN',
          checkedInAt: result.checkedInAt,
          verificationMessage: 'Annie Musical check-in successful.',
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
      
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error("Admin authentication required. Please login again.");
      }

      const response = await axios.post(`${apiUrl}/api/annie-musical/check-out`, {
        bookingId: verification.bookingId,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      const result = response.data;

      if (result.status === 'VALID') {
        const updatedVerification: AnnieBookingVerification = {
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
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Animation Overlay for Already Used Tickets */}
      {showAlreadyUsedAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-in fade-in-0">
          <div className="bg-white p-6 md:p-10 rounded-lg shadow-2xl flex flex-col items-center animate-in fade-in-0 zoom-in-95 mx-4">
            <AlertCircle className="h-16 w-16 md:h-28 md:w-28 text-amber-500" />
            <p className="mt-3 md:mt-5 text-2xl md:text-4xl font-bold text-gray-800">Already Used</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Scanner Section */}
        <div className="lg:col-span-1 order-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Music className="mr-2 h-5 w-5 text-purple-600" />
                Annie Musical QR Scanner
              </CardTitle>
              <CardDescription>
                Scan QR codes from Annie Musical tickets to verify entry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 text-xs md:text-sm">
                  <TabsTrigger value="scan" className="px-2 py-1">Camera</TabsTrigger>
                  <TabsTrigger value="upload" className="px-2 py-1">Upload</TabsTrigger>
                  <TabsTrigger value="manual" className="px-2 py-1">Manual</TabsTrigger>
                </TabsList>

                <TabsContent value="scan" className="space-y-4">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-purple-300 rounded-lg bg-purple-50 h-48 md:h-64 overflow-hidden">
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
                      <div className="flex flex-col items-center px-4">
                        <Camera className="h-12 w-12 md:h-16 md:w-16 text-purple-400 mb-3 md:mb-4" />
                        <p className="text-purple-600 mb-3 md:mb-4 text-sm md:text-base text-center">Position the Annie Musical QR code in front of the camera</p>
                        <Button onClick={startRealScan} className="bg-purple-600 hover:bg-purple-700 text-sm md:text-base">
                          <Smartphone className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                          Start Camera
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="flex flex-col items-center justify-center p-4 md:p-6 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50 h-48 md:h-64">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                    />
                    {scanning ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-purple-600 mb-3 md:mb-4"></div>
                        <p className="text-purple-600 text-sm md:text-base">Processing image...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center px-4">
                        <Upload className="h-12 w-12 md:h-16 md:w-16 text-purple-400 mb-3 md:mb-4" />
                        <p className="text-purple-600 mb-3 md:mb-4 text-sm md:text-base text-center">Upload an image containing an Annie Musical QR code</p>
                        <Button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 hover:bg-purple-700 text-sm md:text-base">
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
                        <Label htmlFor="booking-code" className="text-sm md:text-base">Annie Musical Booking Code</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            id="booking-code"
                            placeholder="Enter Annie Musical booking code"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            className="flex-1 text-sm md:text-base"
                          />
                          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-sm md:text-base whitespace-nowrap">
                            <Search className="h-3 w-3 md:h-4 md:w-4 mr-2" />
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
        <div className="lg:col-span-2 order-2">
          {verification && (
            <Card className={`border-2 ${verification.status === 'VALID' ? 'border-green-500' : verification.status === 'CHECKED_IN' ? 'border-blue-500' : 'border-red-500'}`}>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="flex items-center text-base md:text-lg">
                    <Music className="mr-2 h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                    Annie Musical Verification
                  </span>
                  {getStatusBadge(verification.status)}
                </CardTitle>
                <CardDescription className="text-sm md:text-base">{getVerificationMessage(verification)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <div className="font-mono text-xs md:text-sm bg-purple-50 p-2 md:p-3 rounded border border-purple-200 break-all">
                  <strong>Booking ID:</strong> {verification.bookingId}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2">
                    <p className="text-sm md:text-base"><span className="font-semibold">Customer:</span> {verification.userName}</p>
                    <p className="text-sm md:text-base break-all"><span className="font-semibold">Email:</span> {verification.userEmail}</p>
                    <p className="text-sm md:text-base"><span className="font-semibold">Phone:</span> {verification.userPhone}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm md:text-base"><span className="font-semibold">Total Amount:</span> ₹{verification.totalAmount}</p>
                    {verification.paymentId && (
                      <p className="text-sm md:text-base break-all"><span className="font-semibold">Payment ID:</span> {verification.paymentId}</p>
                    )}
                    {verification.transactionId && (
                      <p className="text-sm md:text-base break-all"><span className="font-semibold">Transaction ID:</span> {verification.transactionId}</p>
                    )}
                  </div>
                </div>

                {verification.seats && verification.seats.length > 0 && (
                  <div className="mt-3 md:mt-4 p-2 md:p-3 bg-purple-50 rounded border border-purple-200">
                    <p className="font-semibold mb-2 text-sm md:text-base">Seats Booked:</p>
                    <div className="flex flex-wrap gap-1 md:gap-2">
                      {verification.seats.map((seat, index) => (
                        <Badge key={index} variant="outline" className="border-purple-300 text-purple-700 text-xs md:text-sm">
                          {seat.id} ({seat.category}) - ₹{seat.price}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                  {verification.checkedInAt && (
                    <p><span className="font-semibold">Checked In:</span> {new Date(verification.checkedInAt).toLocaleString()}</p>
                  )}
                  {verification.checkedOutAt && (
                    <p><span className="font-semibold">Last Checked Out:</span> {new Date(verification.checkedOutAt).toLocaleString()}</p>
                  )}
                  {verification.bookedAt && (
                    <p><span className="font-semibold">Booked At:</span> {new Date(verification.bookedAt).toLocaleString()}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-3 md:pt-6">
                {verification.status === 'VALID' && (
                  <Button onClick={handleAllowEntry} className="bg-green-600 hover:bg-green-700 text-sm md:text-base w-full sm:w-auto">
                    <CheckCircle className="mr-2 h-3 w-3 md:h-4 md:w-4" /> Allow Entry
                  </Button>
                )}
                {verification.status === 'ALREADY_USED' && (
                  <Button onClick={handleCheckout} className="bg-blue-600 hover:bg-blue-700 text-sm md:text-base w-full sm:w-auto">
                    <CheckCircle className="mr-2 h-3 w-3 md:h-4 md:w-4" /> Check Out
                  </Button>
                )}
                <Button variant="outline" onClick={handleDenyEntry} className="text-sm md:text-base w-full sm:w-auto">
                  <XCircle className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                  {verification.status === 'VALID' ? 'Deny' : 'Clear'}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Recent Scans Section */}
          {recentScans.length > 0 && (
            <Card className="mt-4 md:mt-6">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="flex items-center text-base md:text-lg">
                  <QrCode className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  Recent Annie Musical Scans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 md:max-h-64 overflow-y-auto">
                  {recentScans.map((scan, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {getStatusBadge(scan.status)}
                        <span className="text-xs md:text-sm font-mono truncate">{scan.bookingId}</span>
                        <span className="text-xs md:text-sm text-gray-600 truncate">{scan.userName}</span>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {scan.seats?.map(s => s.id).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnieMusicalQrScanner;
