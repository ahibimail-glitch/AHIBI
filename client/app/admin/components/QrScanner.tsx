"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { QrCode, Upload, Search, CheckCircle, XCircle, AlertCircle, Clock, Camera, Smartphone, Loader2, History, RefreshCw } from "lucide-react";
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
  eventId?: string;
  checkInRequestId?: string;
  checkOutScanId?: string;
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

interface CheckInHistoryItem {
  scanId: string;
  bookingId: string;
  timestamp: string;
  attendeeName: string;
  ticketType: string;
  ticketIndex?: number;
  totalTickets?: number;
}

interface CheckInHistoryCursor {
  beforeTimestamp: string;
  beforeScanId: string;
}

interface QrScannerProps {
  scannerMode?: boolean;
  scannerToken?: string;
  onSessionExpired?: () => void;
}

const SCANNER_REQUEST_TIMEOUT_MS = 15000;
const MAX_SCANNER_PERFORMANCE_ENTRIES = 80;
type ScannerErrorKind = 'error' | 'network' | 'timeout' | 'auth' | 'rejected' | 'uncertain';

let scannerMetricSequence = 0;

function recordScannerPerformance(name: string, startedAt: number, serverTiming?: string | null) {
  if (typeof performance === 'undefined') return;

  const metricName = `scanner:${name}:${++scannerMetricSequence}`;
  const endedAt = performance.now();
  performance.measure(metricName, { start: startedAt, end: endedAt });

  const scannerMetrics = performance.getEntriesByType('measure')
    .filter((entry) => entry.name.startsWith('scanner:'));
  if (scannerMetrics.length > MAX_SCANNER_PERFORMANCE_ENTRIES) {
    scannerMetrics.slice(0, scannerMetrics.length - MAX_SCANNER_PERFORMANCE_ENTRIES)
      .forEach((entry) => performance.clearMeasures(entry.name));
  }

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[scanner-performance]', {
      name,
      clientDurationMs: Number((endedAt - startedAt).toFixed(1)),
      serverTiming: serverTiming || undefined,
    });
  }
}

function isTimeoutError(error: any) {
  return error?.name === 'AbortError' ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    /timeout/i.test(error?.message || '');
}

const QrScanner = ({ scannerMode = false, scannerToken = '', onSessionExpired }: QrScannerProps) => {
  const [activeTab, setActiveTab] = useState<string>("scan");
  const [manualCode, setManualCode] = useState<string>("");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPaused, setCameraPaused] = useState<boolean>(false);
  const [verification, setVerification] = useState<BookingVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ScannerErrorKind>('error');
  const [pendingVerificationData, setPendingVerificationData] = useState<BookingVerification | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);
  const [eventsLoadError, setEventsLoadError] = useState<string | null>(null);
  const [eventsRetry, setEventsRetry] = useState(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [uncertainCheckIn, setUncertainCheckIn] = useState<boolean>(false);
  const [uncertainCheckOut, setUncertainCheckOut] = useState<boolean>(false);
  const [checkInRejected, setCheckInRejected] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const selectedEventRef = useRef<string | null>(selectedEvent);
  const [showAlreadyUsedAnimation, setShowAlreadyUsedAnimation] = useState<boolean>(false);
  const [checkInHistory, setCheckInHistory] = useState<CheckInHistoryItem[]>([]);
  const [historyCursor, setHistoryCursor] = useState<CheckInHistoryCursor | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const verifyInFlightRef = useRef(false);
  const checkInInFlightRef = useRef(false);
  const checkOutInFlightRef = useRef(false);
  const pendingRenderMeasureRef = useRef<{ name: string; startedAt: number } | null>(null);

  useEffect(() => {
    selectedEventRef.current = selectedEvent;
  }, [selectedEvent]);

  const showError = (message: string, kind: ScannerErrorKind = 'error') => {
    setError(message);
    setErrorKind(kind);
  };

  const clearError = () => {
    setError(null);
    setErrorKind('error');
  };

  const measureNextRender = useCallback((name: string) => {
    pendingRenderMeasureRef.current = { name, startedAt: performance.now() };
  }, []);

  const pendingCheckInStorageKey = scannerMode ? 'scanner_pending_check_in' : 'admin_pending_check_in';
  const getPendingCheckInRequestId = (bookingId: string, eventId: string) => {
    try {
      const pending = JSON.parse(sessionStorage.getItem(pendingCheckInStorageKey) || 'null');
      return pending?.bookingId === bookingId && pending?.eventId === eventId && typeof pending?.requestId === 'string'
        ? pending.requestId as string
        : undefined;
    } catch {
      return undefined;
    }
  };
  const savePendingCheckIn = (bookingId: string, eventId: string, requestId: string) => {
    try {
      sessionStorage.setItem(pendingCheckInStorageKey, JSON.stringify({ bookingId, eventId, requestId }));
    } catch {
      // The in-memory request ID still protects retries during this mounted session.
    }
  };
  const clearPendingCheckIn = (bookingId: string, eventId: string, requestId: string) => {
    try {
      if (getPendingCheckInRequestId(bookingId, eventId) === requestId) {
        sessionStorage.removeItem(pendingCheckInStorageKey);
      }
    } catch {
      // Storage is best effort; never block the operator's online check-in flow.
    }
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const fetchEvents = async () => {
      setEventsLoading(true);
      setEventsLoadError(null);
      const startedAt = performance.now();
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        timeout = setTimeout(() => controller.abort(), SCANNER_REQUEST_TIMEOUT_MS);
        const eventEndpoint = scannerMode ? '/api/scanner/events' : '/api/events?limit=10000';
        const response = await fetch(`${apiUrl}${eventEndpoint}`, {
          signal: controller.signal,
          headers: scannerMode ? { Authorization: `Bearer ${scannerToken}` } : undefined,
        });
        recordScannerPerformance('event-list-rtt', startedAt, response.headers.get('Server-Timing'));
        if (scannerMode && (response.status === 401 || response.status === 403)) {
          onSessionExpired?.();
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
        const loadedEvents: Event[] = Array.isArray(data?.data?.events) ? data.data.events : [];
        if (cancelled) return;
        measureNextRender('event-list-render');
        setEvents(loadedEvents);
        if (loadedEvents.length === 1) setSelectedEvent((current) => current || loadedEvents[0]._id);
      } catch (err: any) {
        if (cancelled) return;
        const message = isTimeoutError(err)
          ? 'Loading events timed out. Check the connection and retry.'
          : 'Could not load events. Check the connection and retry.';
        measureNextRender('event-list-error-render');
        setEventsLoadError(message);
      } finally {
        if (timeout) clearTimeout(timeout);
        if (!cancelled) setEventsLoading(false);
      }
    };

    void fetchEvents();
    return () => {
      cancelled = true;
      controller.abort();
      if (timeout) clearTimeout(timeout);
    };
  }, [onSessionExpired, eventsRetry, scannerMode, scannerToken, measureNextRender]);

  useEffect(() => {
    if (!scannerMode || activeTab !== 'history' || !selectedEvent) return;

    let cancelled = false;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      setCheckInHistory([]);
      setHistoryCursor(null);
      setHistoryHasMore(false);

      const startedAt = performance.now();
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const params = new URLSearchParams({ eventId: selectedEvent, limit: '50' });
        timeout = setTimeout(() => controller.abort(), SCANNER_REQUEST_TIMEOUT_MS);
        const response = await fetch(`${apiUrl}/api/scanner/check-in-history?${params.toString()}`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${scannerToken}` },
        });
        recordScannerPerformance('check-in-history-rtt', startedAt, response.headers.get('Server-Timing'));
        if (response.status === 401 || response.status === 403) {
          onSessionExpired?.();
          return;
        }

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not load check-in history.');
        if (cancelled) return;

        const data = result.data || {};
        setCheckInHistory(Array.isArray(data.items) ? data.items : []);
        setHistoryCursor(data.nextCursor || null);
        setHistoryHasMore(Boolean(data.hasMore));
      } catch (error: any) {
        if (!cancelled) {
          setHistoryError(isTimeoutError(error)
            ? 'Loading check-in history timed out. Check the connection and retry.'
            : error.message || 'Could not load check-in history.');
        }
      } finally {
        if (timeout) clearTimeout(timeout);
        if (!cancelled) setHistoryLoading(false);
      }
    };

    void fetchHistory();
    return () => {
      cancelled = true;
      controller.abort();
      if (timeout) clearTimeout(timeout);
    };
  }, [activeTab, historyRefreshKey, onSessionExpired, scannerMode, scannerToken, selectedEvent]);

  useEffect(() => {
    const pending = pendingRenderMeasureRef.current;
    if (!pending) return;

    const frame = requestAnimationFrame(() => {
      if (pendingRenderMeasureRef.current !== pending) return;
      recordScannerPerformance(pending.name, pending.startedAt);
      pendingRenderMeasureRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [verification, error, errorKind, events, eventsLoading, isVerifying, isCheckingIn, isCheckingOut, uncertainCheckIn, uncertainCheckOut]);

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
    if (
      verifyInFlightRef.current || checkInInFlightRef.current || checkOutInFlightRef.current ||
      isCheckingOut || uncertainCheckIn || uncertainCheckOut
    ) return;
    setCameraPaused(true);
    clearError();
    setVerification(null);
    setCheckInRejected(false);
    setUncertainCheckOut(false);

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
        setPendingVerificationData(bookingToVerify);
        void verifyBooking(bookingToVerify);
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
        setPendingVerificationData(bookingToVerify);
        void verifyBooking(bookingToVerify);
      }
    } catch (err: any) {
      showError(err.message || "Invalid QR code format. Please try again.", 'rejected');
      setCameraPaused(false);
    }
  };

  // Start scanning with real QR scanner
  const startRealScan = () => {
    if (!selectedEvent) {
      showError('Choose the event you are scanning before opening the camera.');
      return;
    }
    setActiveTab('scan');
    setVerification(null);
    setPendingVerificationData(null);
    setCameraActive(true);
    setCameraPaused(false);
    setCheckInRejected(false);
    setUncertainCheckOut(false);
    clearError();
  };

  // Handle QR scanner errors
  const handleScannerError = (err: any) => {
    showError("Camera error: " + (err.message || "Unknown error"));
    setCameraActive(false);
    setCameraPaused(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraPaused(true);
    clearError();
    setVerification(null);
    setPendingVerificationData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          showError("Could not process the uploaded image.", 'rejected');
          setCameraPaused(false);
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        const imageData = context.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleRealQrScan(code.data);
        } else {
          showError("No QR code found in the uploaded image.", 'rejected');
          setCameraPaused(false);
        }
      };
      img.onerror = () => {
        showError("Failed to load the image file.", 'rejected');
        setCameraPaused(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      showError("Failed to read the file.", 'rejected');
      setCameraPaused(false);
    };
    reader.readAsDataURL(file);
  };

  const clearCurrentTicket = () => {
    if (isCheckingIn || isCheckingOut || uncertainCheckIn) return;
    setVerification(null);
    setPendingVerificationData(null);
    setCheckInRejected(false);
    setUncertainCheckOut(false);
    clearError();
    setCameraPaused(false);
  };

  const handleTabChange = (tab: string) => {
    if (isVerifying || isCheckingIn || isCheckingOut || uncertainCheckIn || uncertainCheckOut) return;
    setActiveTab(tab);
  };

  const handleEventChange = (eventId: string) => {
    if (verification || pendingVerificationData || isVerifying || isCheckingIn || isCheckingOut || uncertainCheckIn || uncertainCheckOut) return;
    setSelectedEvent(eventId);
    clearError();
    setCameraPaused(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      showError("Please enter a booking code", 'rejected');
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

    setCameraPaused(true);
    setPendingVerificationData(bookingData);
    void verifyBooking(bookingData);
  };

  // Function to verify booking with backend
  const verifyBooking = async (bookingData: BookingVerification) => {
    if (
      verifyInFlightRef.current || checkInInFlightRef.current || checkOutInFlightRef.current ||
      isCheckingOut || uncertainCheckOut
    ) return;
    if (!bookingData.bookingId) {
      showError('Invalid ticket ID.', 'rejected');
      return;
    }
    if (!selectedEvent) {
      showError('Please select an event before scanning.', 'rejected');
      return;
    }

    verifyInFlightRef.current = true;
    setCameraPaused(true);
    clearError();
    setIsVerifying(true);
    const controller = new AbortController();
    const requestStartedAt = performance.now();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = scannerMode ? scannerToken : localStorage.getItem('admin_token') || '';
      if (!token) {
        if (scannerMode) onSessionExpired?.();
        showError('Your scanner session has expired. Please sign in again.', 'auth');
        return;
      }
      timeout = setTimeout(() => controller.abort(), SCANNER_REQUEST_TIMEOUT_MS);
      const response = await fetch(`${apiUrl}${scannerMode ? '/api/scanner/verify-ticket' : '/api/bookings/verify-ticket'}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId: bookingData.bookingId,
          eventId: selectedEvent
        }),
      });

      const result = await response.json();
      recordScannerPerformance('verify-rtt', requestStartedAt, response.headers.get('Server-Timing'));

      if (scannerMode && (response.status === 401 || response.status === 403)) {
        onSessionExpired?.();
        showError('Scanner authentication expired. Sign in again.', 'auth');
        return;
      }
      if (!response.ok) {
        if (response.status >= 500) throw new Error(result.message || 'Verification service is unavailable.');
        const rejectedBooking: BookingVerification = {
          ...bookingData,
          ...result,
          eventId: selectedEvent,
          status: 'INVALID',
          verificationMessage: result.message || 'Ticket verification was rejected.',
        };
        measureNextRender('rejected-result-render');
        setVerification(rejectedBooking);
        setPendingVerificationData(null);
        clearError();
        return;
      }

      const pendingCheckInRequestId = getPendingCheckInRequestId(bookingData.bookingId, selectedEvent);
      const verifiedBooking: BookingVerification = {
        ...bookingData,
        ...result,
        eventId: selectedEvent,
        ...(pendingCheckInRequestId
          ? {
              checkInRequestId: pendingCheckInRequestId,
              status: 'PENDING',
              verificationMessage: 'A previous check-in request has an unknown outcome. Retry the same request to confirm entry.',
            }
          : result.status === 'VALID'
            ? { checkInRequestId: crypto.randomUUID() }
            : {}),
      };
      measureNextRender('verification-result-render');
      setVerification(verifiedBooking);
      setPendingVerificationData(null);
      setUncertainCheckIn(Boolean(pendingCheckInRequestId));
      if (pendingCheckInRequestId) {
        showError('A previous check-in response was not confirmed. Retry the same request to safely resolve its outcome.', 'uncertain');
      } else {
        clearError();
      }

      if (verifiedBooking.status === 'ALREADY_USED' && !pendingCheckInRequestId) {
        setShowAlreadyUsedAnimation(true);
      }

      setManualCode("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      recordScannerPerformance('verify-rtt', requestStartedAt);
      const timedOut = isTimeoutError(err);
      measureNextRender('verification-error-render');
      showError(
        timedOut
          ? 'Ticket verification timed out. The ticket was not admitted. Retry verification or clear this scan.'
          : 'Could not reach the ticket service. The ticket was not admitted. Retry verification or clear this scan.',
        timedOut ? 'timeout' : 'network',
      );
      setPendingVerificationData(bookingData);
    } finally {
      if (timeout) clearTimeout(timeout);
      setIsVerifying(false);
      verifyInFlightRef.current = false;
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
    const canRetryUncertainResult = uncertainCheckIn && Boolean(verification?.checkInRequestId);
    if (
      !verification ||
      (verification.status !== 'VALID' && !canRetryUncertainResult) ||
      !verification.checkInRequestId ||
      checkInInFlightRef.current ||
      isCheckingIn
    ) return;

    checkInInFlightRef.current = true;
    setIsCheckingIn(true);
    setCameraPaused(true);
    clearError();
    const requestStartedAt = performance.now();
    try {
      const token = scannerMode ? scannerToken : localStorage.getItem('admin_token') || '';
      if (!token) {
        if (scannerMode) onSessionExpired?.();
        showError('Your session has expired. Please sign in again.', 'auth');
        return;
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      savePendingCheckIn(verification.bookingId, verification.eventId || '', verification.checkInRequestId);
      const response = await axios.post(`${apiUrl}${scannerMode ? '/api/scanner/check-in' : '/api/bookings/check-in'}`, {
        bookingId: verification.bookingId,
        eventId: verification.eventId,
        requestId: verification.checkInRequestId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: SCANNER_REQUEST_TIMEOUT_MS,
      });
      recordScannerPerformance('checkin-rtt', requestStartedAt, response.headers?.['server-timing']);

      const result = response.data;

      if (result.status === 'CHECKED_IN') {
        const updatedVerification: BookingVerification = {
          ...verification,
          status: 'CHECKED_IN',
          checkedInAt: result.checkedInAt,
          verificationMessage: 'Check-in successful.',
        };
        measureNextRender('checkin-result-render');
        setVerification(updatedVerification);
        clearPendingCheckIn(verification.bookingId, verification.eventId || '', verification.checkInRequestId);
        setUncertainCheckIn(false);
        setCheckInRejected(false);
        clearError();
      } else {
        throw Object.assign(new Error(result.message || 'Failed to check in.'), { response: { status: 500, data: result } });
      }
    } catch (err: any) {
      const response = err.response;
      recordScannerPerformance('checkin-rtt', requestStartedAt, response?.headers?.['server-timing']);
      measureNextRender('checkin-error-render');
      if (scannerMode && (response?.status === 401 || response?.status === 403)) {
        if (!canRetryUncertainResult) {
          clearPendingCheckIn(verification.bookingId, verification.eventId || '', verification.checkInRequestId);
        }
        onSessionExpired?.();
        showError(
          canRetryUncertainResult
            ? 'Scanner authentication expired. This retry was not authorized; the earlier check-in outcome is still unknown. Sign in and retry the same request.'
            : 'Scanner authentication expired. The request was not authorized. Sign in again.',
          'auth',
        );
      } else if (response?.data?.code === 'REQUEST_ALREADY_PROCESSED' || !response || response.status >= 500) {
        setUncertainCheckIn(true);
        showError(
          isTimeoutError(err)
            ? 'Check-in timed out. Entry outcome is unknown. Retry the same request to safely confirm it.'
            : 'The check-in response was lost. Entry outcome is unknown. Retry the same request to safely confirm it.',
          isTimeoutError(err) ? 'timeout' : response ? 'uncertain' : 'network',
        );
      } else {
        clearPendingCheckIn(verification.bookingId, verification.eventId || '', verification.checkInRequestId);
        setUncertainCheckIn(false);
        const code = response.data?.code;
        const isAlreadyUsed = code === 'TICKET_EXHAUSTED' || code === 'TICKET_ALREADY_USED';
        setCheckInRejected(true);
        measureNextRender('checkin-rejected-render');
        setVerification({
          ...verification,
          status: isAlreadyUsed ? 'ALREADY_USED' : 'INVALID',
          verificationMessage: response.data?.message || 'Entry was rejected.',
        });
        showError(response.data?.message || 'Entry was rejected.', 'rejected');
      }
    } finally {
      setIsCheckingIn(false);
      checkInInFlightRef.current = false;
    }
  };

  const handleDenyEntry = () => {
    clearCurrentTicket();
  };

  const handleCheckout = async () => {
    if (!verification || !verification.bookingId || isCheckingIn || uncertainCheckIn || isCheckingOut || checkOutInFlightRef.current || uncertainCheckOut) return;
    if (!verification.checkOutScanId) {
      showError('No active check-in record is available to check out. Clear and verify the ticket again.', 'rejected');
      return;
    }
    checkOutInFlightRef.current = true;
    setIsCheckingOut(true);
    clearError();
    const requestStartedAt = performance.now();
    try {
      const token = scannerMode ? scannerToken : localStorage.getItem('admin_token') || '';
      if (!token) {
        if (scannerMode) onSessionExpired?.();
        showError('Your session has expired. Please sign in again.', 'auth');
        return;
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${apiUrl}${scannerMode ? '/api/scanner/check-out' : '/api/bookings/check-out'}`, {
        bookingId: verification.bookingId,
        eventId: verification.eventId,
        scanId: verification.checkOutScanId,
      }, { headers: { Authorization: `Bearer ${token}` }, timeout: SCANNER_REQUEST_TIMEOUT_MS });
      recordScannerPerformance('checkout-rtt', requestStartedAt, response.headers?.['server-timing']);

      const result = response.data;

      if (result.status === 'VALID') {
        const isStillAtCapacity = Number(result.remainingEntries) <= 0;
        const updatedVerification: BookingVerification = {
          ...verification,
          status: isStillAtCapacity ? 'ALREADY_USED' : 'VALID',
          checkInRequestId: isStillAtCapacity ? undefined : crypto.randomUUID(),
          checkOutScanId: undefined,
          checkedOutAt: result.checkedOutAt,
          verificationMessage: result.idempotentReplay && isStillAtCapacity
            ? 'This check-out target is already cleared. Verify the ticket again before another action.'
            : result.idempotentReplay
              ? 'This check-out was already processed. Ticket entry is available again.'
              : 'Check-out successful. Ticket can be reused.',
        };
        measureNextRender('checkout-result-render');
        setVerification(updatedVerification);
        setUncertainCheckOut(Boolean(result.idempotentReplay && isStillAtCapacity));
        if (result.idempotentReplay && isStillAtCapacity) {
          showError('This check-out target is already cleared. Verify the ticket again before taking another action.', 'uncertain');
        } else {
          clearError();
        }
      } else {
        throw Object.assign(new Error(result.message || 'Failed to check out.'), { response: { status: 500, data: result } });
      }
    } catch (err: any) {
      const response = err.response;
      recordScannerPerformance('checkout-rtt', requestStartedAt, response?.headers?.['server-timing']);
      measureNextRender('checkout-error-render');
      if (scannerMode && (response?.status === 401 || response?.status === 403)) {
        onSessionExpired?.();
        showError('Scanner authentication expired. The request was not authorized. Sign in again.', 'auth');
      } else if (!response || response.status >= 500) {
        setUncertainCheckOut(true);
        showError(
          isTimeoutError(err)
            ? 'Check-out timed out. Its result is unknown. Clear and verify the ticket again before taking another action.'
            : 'The check-out response was lost. Its result is unknown. Clear and verify the ticket again before taking another action.',
          isTimeoutError(err) ? 'timeout' : 'network',
        );
      } else {
        showError(response.data?.message || 'Check-out was rejected.', 'rejected');
      }
    } finally {
      setIsCheckingOut(false);
      checkOutInFlightRef.current = false;
    }
  };

  const loadMoreCheckInHistory = async () => {
    if (!selectedEvent || !historyCursor || historyLoadingMore) return;

    const requestedEventId = selectedEvent;
    const startedAt = performance.now();
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setHistoryLoadingMore(true);
    setHistoryError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const params = new URLSearchParams({
        eventId: selectedEvent,
        limit: '50',
        beforeTimestamp: historyCursor.beforeTimestamp,
        beforeScanId: historyCursor.beforeScanId,
      });
      timeout = setTimeout(() => controller.abort(), SCANNER_REQUEST_TIMEOUT_MS);
      const response = await fetch(`${apiUrl}/api/scanner/check-in-history?${params.toString()}`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${scannerToken}` },
      });
      recordScannerPerformance('check-in-history-more-rtt', startedAt, response.headers.get('Server-Timing'));
      if (response.status === 401 || response.status === 403) {
        onSessionExpired?.();
        return;
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not load older check-ins.');
      if (selectedEventRef.current !== requestedEventId) return;

      const data = result.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      setCheckInHistory((current) => [...current, ...items]);
      setHistoryCursor(data.nextCursor || null);
      setHistoryHasMore(Boolean(data.hasMore));
    } catch (error: any) {
      if (selectedEventRef.current === requestedEventId) {
        setHistoryError(isTimeoutError(error)
          ? 'Loading older check-ins timed out. Check the connection and retry.'
          : error.message || 'Could not load older check-ins.');
      }
    } finally {
      if (timeout) clearTimeout(timeout);
      setHistoryLoadingMore(false);
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

      <div className={`grid grid-cols-1 gap-6 ${activeTab === 'history' ? '' : 'md:grid-cols-3'}`}>
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
                <Select
                  onValueChange={handleEventChange}
                  value={selectedEvent || undefined}
                  disabled={eventsLoading || !!verification || !!pendingVerificationData || isVerifying || isCheckingIn || isCheckingOut || uncertainCheckIn || uncertainCheckOut}
                >
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
                {eventsLoading && <div className="px-2 py-1 text-sm text-gray-500">Loading events…</div>}
                {eventsLoadError && (
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm text-red-700" role="alert">
                    <span>{eventsLoadError}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEventsRetry((retry) => retry + 1)}>
                      Retry
                    </Button>
                  </div>
                )}
                {!eventsLoading && !eventsLoadError && events.length === 0 && (
                  <div className="text-sm text-gray-500 px-2 py-1">No active events found</div>
                )}
              </div>
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className={`grid w-full ${scannerMode ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <TabsTrigger value="scan" disabled={isVerifying || isCheckingIn || isCheckingOut || uncertainCheckIn || uncertainCheckOut}>Camera Scan</TabsTrigger>
                  <TabsTrigger value="upload" disabled={isVerifying || isCheckingIn || isCheckingOut || uncertainCheckIn || uncertainCheckOut}>Upload Image</TabsTrigger>
                  <TabsTrigger value="manual" disabled={isVerifying || isCheckingIn || isCheckingOut || uncertainCheckIn || uncertainCheckOut}>Manual Entry</TabsTrigger>
                  {scannerMode && <TabsTrigger value="history" disabled={!selectedEvent || eventsLoading || isVerifying || isCheckingIn || isCheckingOut || uncertainCheckIn || uncertainCheckOut}>
                    <History className="mr-2 h-4 w-4" /> History
                  </TabsTrigger>}
                </TabsList>

                <TabsContent value="scan" forceMount className="space-y-4">
                  <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 h-64 overflow-hidden">
                    {cameraActive ? (
                      <div className="relative h-full w-full">
                        <RealQrScanner
                          onScan={handleRealQrScan}
                          onError={handleScannerError}
                          isActive={cameraActive}
                          isScanning={cameraActive && activeTab === 'scan' && !cameraPaused && !verification && !isVerifying && !isCheckingIn && !uncertainCheckIn}
                        />
                        <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2">
                          <span className="rounded-md bg-black/70 px-2 py-1 text-xs text-white" role="status" aria-live="polite">
                            {isVerifying
                              ? 'Validating ticket…'
                              : isCheckingIn
                                ? 'Recording entry…'
                                : uncertainCheckIn
                                  ? 'Entry outcome unknown. Retry the same request.'
                                  : verification
                                    ? 'Review the result below, then clear to scan again.'
                                    : cameraPaused
                                      ? 'Scan paused.'
                                      : 'Scanning for tickets…'}
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="bg-red-500/70 hover:bg-red-600"
                            disabled={isVerifying || isCheckingIn || uncertainCheckIn}
                            onClick={() => { setCameraActive(false); setCameraPaused(true); }}
                          >
                            Stop
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Camera className="h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-4">Position the QR code in front of the camera</p>
                        <Button onClick={startRealScan} disabled={!selectedEvent || eventsLoading || !!eventsLoadError}>
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
                    <div className="flex flex-col items-center">
                      <Upload className="h-16 w-16 text-gray-400 mb-4" />
                      <p className="text-gray-500 mb-4">Upload an image containing a QR code</p>
                      <Button onClick={() => fileInputRef.current?.click()} disabled={isVerifying || isCheckingIn || isCheckingOut || uncertainCheckIn || uncertainCheckOut}>
                        Select Image
                      </Button>
                    </div>
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
                            disabled={isVerifying || isCheckingIn || isCheckingOut || uncertainCheckIn || uncertainCheckOut}
                          />
                          <Button type="submit" disabled={isVerifying || isCheckingIn || isCheckingOut || uncertainCheckIn || uncertainCheckOut}>
                            {isVerifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                            {isVerifying ? 'Verifying…' : 'Verify'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                </TabsContent>
                {scannerMode && (
                  <TabsContent value="history" className="space-y-4">
                    <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">Checked-in tickets</h2>
                        <p className="text-sm text-gray-500">Successful check-ins for the selected event, newest first.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryRefreshKey((value) => value + 1)}
                        disabled={!selectedEvent || historyLoading || historyLoadingMore}
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh
                      </Button>
                    </div>

                    {historyError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{historyError}</AlertDescription>
                      </Alert>
                    )}

                    {historyLoading ? (
                      <p className="py-8 text-center text-sm text-gray-500">Loading check-in history…</p>
                    ) : checkInHistory.length === 0 ? (
                      <p className="py-8 text-center text-sm text-gray-500">No checked-in tickets recorded for this event yet.</p>
                    ) : (
                      <div className="divide-y rounded-md border">
                        {checkInHistory.map((item) => (
                          <div key={item.scanId} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center sm:p-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900">{item.attendeeName}</p>
                              <p className="text-sm text-gray-600">{item.ticketType}{item.ticketIndex && item.totalTickets && item.totalTickets > 1 ? ` · Ticket ${item.ticketIndex} of ${item.totalTickets}` : ''}</p>
                              <p className="truncate font-mono text-xs text-gray-500">Booking {item.bookingId}</p>
                            </div>
                            <time className="text-sm text-gray-500 sm:text-right" dateTime={item.timestamp}>
                              {new Date(item.timestamp).toLocaleString()}
                            </time>
                          </div>
                        ))}
                      </div>
                    )}

                    {historyHasMore && (
                      <div className="flex justify-center pt-2">
                        <Button type="button" variant="outline" onClick={loadMoreCheckInHistory} disabled={historyLoadingMore}>
                          {historyLoadingMore ? 'Loading…' : 'Load older check-ins'}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>

              {error && activeTab !== 'history' && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {errorKind === 'auth'
                      ? 'Authentication expired'
                      : errorKind === 'timeout'
                        ? 'Request timed out'
                        : errorKind === 'network'
                          ? 'Connection problem'
                          : errorKind === 'uncertain'
                            ? 'Entry outcome unknown'
                            : errorKind === 'rejected'
                              ? 'Entry rejected'
                              : 'Scanner error'}
                  </AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                  {pendingVerificationData && !isVerifying && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => void verifyBooking(pendingVerificationData)}>
                        Retry verification
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={clearCurrentTicket}>
                        Clear scan
                      </Button>
                    </div>
                  )}
                  {uncertainCheckIn && verification && !isCheckingIn && (
                    <div className="mt-3">
                      <Button type="button" size="sm" variant="outline" onClick={() => void handleAllowEntry()}>
                        Retry same check-in request
                      </Button>
                    </div>
                  )}
                  {uncertainCheckOut && verification && (
                    <div className="mt-3">
                      <Button type="button" size="sm" variant="outline" onClick={clearCurrentTicket}>
                        Clear and verify again
                      </Button>
                    </div>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

          {/* Verification Result Section */}
        {activeTab !== 'history' && <div className="md:col-span-2">
          {verification && (
            <Card className={`border-2 ${verification.status === 'VALID' ? 'border-green-500' : verification.status === 'CHECKED_IN' ? 'border-blue-500' : verification.status === 'PENDING' ? 'border-amber-500' : 'border-red-500'}`}>
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
                  <Button
                    onClick={handleAllowEntry}
                    disabled={isVerifying || isCheckingIn || checkInRejected || uncertainCheckIn}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isCheckingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    {isCheckingIn ? 'Recording entry…' : uncertainCheckIn ? 'Outcome unknown' : 'Allow Entry'}
                  </Button>
                )}
                {verification.status === 'ALREADY_USED' && (
                  <Button onClick={handleCheckout} disabled={!verification.checkOutScanId || isCheckingIn || uncertainCheckIn || isCheckingOut || uncertainCheckOut} className="bg-blue-600 hover:bg-blue-700">
                    {isCheckingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    {isCheckingOut ? 'Recording check-out…' : 'Check Out'}
                  </Button>
                )}
                <Button variant="outline" onClick={handleDenyEntry} disabled={isCheckingIn || uncertainCheckIn || isCheckingOut}>
                  <XCircle className="mr-2 h-4 w-4" />
                  {verification.status === 'VALID' ? 'Deny' : 'Clear'}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>}
      </div>
    </div>
  );
};

export default QrScanner;
