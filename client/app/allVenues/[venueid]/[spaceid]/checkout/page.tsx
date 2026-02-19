"use client";
import { useState, useEffect, useMemo } from "react";

import { useRouter, useParams } from 'next/navigation';
import { useAuth } from "@/hooks/useAuth";
import { createAuthRedirectUrl } from "@/utils/redirectUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarIcon,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  Loader2,
  IndianRupee,
  Download,
  Clock,
  MessageCircle,
  ChevronLeft,
  Users,
  Building2,
  Plus,
  Minus,
  Star
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

interface VenueData {
  _id: string;
  managedByVenueId?: string | null;
  name: string;
  businessName: string;
  description: string;
  rating?: {
    average?: number;
    count?: number;
  };
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    googleMapsLink?: string;
    directions?: string;
  };
  contactInfo: {
    phone: string;
    email?: string;
    website?: string;
  };
  capacity: number;
  capacityDetails?: {
    standingCapacity: number;
    seatingCapacity?: {
      theatreStyle?: number;
      roundTable?: number;
    };
    minimumBookingCapacity?: number;
    timeSlots?: string[];
    peakSeasonRates?: string;
    offSeasonRates?: string;
    advanceBookingDays?: number;
  };
  pricing: {
    basePrice: number;
    hourlyRate?: number;
    halfDayRate?: number;
    fullDayRate?: number;
    cleaningFee?: number;
    securityDeposit?: number;
    rentalIncludes?: string[];
    otherEquipmentDetails?: string;
    securityDepositRequired?: boolean;
    cancellationPolicy?: {
      refundable: boolean;
      timeFrame?: string;
      deductionPercentage?: number;
    };
  };
  blockedSlots?: Array<{
    _id?: string;
    date: Date;
    isFullDayBlocked: boolean;
    timeSlots?: Array<{
      startTime: string;
      endTime: string;
    }>;
    reason: string;
    notes?: string;
  }>;
}

interface Booking {
  _id: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  eventType?: string;
  guestCount?: number;
  user?: {
    name: string;
  };
}

interface TimeSlot {
  time: string;
  available: boolean;
  bookings: any[];
}

interface AvailabilityData {
  date: string;
  existingBookings: Booking[];
  timeSlots: TimeSlot[];
  summary: {
    totalSlots: number;
    availableSlots: number;
    bookedSlots: number;
  };
}

const TIME_SLOTS = [
  { value: "01:00", label: "1:00 AM" },
  { value: "02:00", label: "2:00 AM" },
  { value: "03:00", label: "3:00 AM" },
  { value: "04:00", label: "4:00 AM" },
  { value: "05:00", label: "5:00 AM" },
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "22:00", label: "10:00 PM" },
  { value: "23:00", label: "11:00 PM" },
  { value: "00:00", label: "12:00 AM" },
];

export default function SpaceCheckoutPage() {
  const params = useParams();
  const venueId = params.venueid as string;
  const spaceId = params.spaceid as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [spaceData, setSpaceData] = useState<any>(null);
  const [venueData, setVenueData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [finalBookingDetails, setFinalBookingDetails] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [guestCount, setGuestCount] = useState<number>(4);

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    startTime: "",
    endTime: "",
    eventType: "",
    specialRequirements: ""
  });

  // Estimated pricing state
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [bookingDuration, setBookingDuration] = useState<number>(0);
  const [fullDaySelected, setFullDaySelected] = useState<boolean>(false);

  // Helper: Load Razorpay script if not already loaded
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  // Helper: compute duration in hours between start and end (handles overnight)
  const getDurationHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(`2000-01-01T${start}:00`);
    const endDate = new Date(`2000-01-01T${end}:00`);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  };

  // Helper: compute estimated price per corrected rules
  const computeEstimatedPrice = (): { basePrice: number; totalPrice: number; duration: number } => {
    if (!spaceData) return { basePrice: 0, totalPrice: 0, duration: 0 };
    
    const hourly = spaceData.pricing?.hourlyRate || 100; // Default to ₹100 if not set
    const halfDay = spaceData.pricing?.halfDayRate;
    const fullDay = spaceData.pricing?.fullDayRate;
    const cleaning = spaceData.pricing?.cleaningFee || 0;
    const securityDeposit = spaceData?.pricing?.securityDeposit || 0;

    // Calculate duration in hours
    const duration = getDurationHours(bookingForm.startTime, bookingForm.endTime);
    if (duration <= 0) return { basePrice: 0, totalPrice: 0, duration: 0 };

    // Default to hourly calculation
    let basePrice = hourly * duration;

    // Override with special rates only for exact time matches
    if (bookingForm.startTime === "00:00" && bookingForm.endTime === "23:00" && typeof fullDay === 'number' && fullDay > 0) {
      basePrice = fullDay;
    } else if (bookingForm.startTime === "09:00" && bookingForm.endTime === "17:00" && typeof halfDay === 'number' && halfDay > 0) {
      basePrice = halfDay;
    }

    // Add cleaning fee and security deposit
    const totalPrice = basePrice + cleaning + securityDeposit;

    // Ensure minimum amount for Razorpay (₹100 for test transactions)
    const minimumAmount = 100;
    const finalTotalPrice = totalPrice < minimumAmount ? minimumAmount : totalPrice;
    const finalBasePrice = finalTotalPrice - cleaning - securityDeposit;

    return {
      basePrice: Math.max(0, Math.round(finalBasePrice)),
      totalPrice: Math.max(0, Math.round(finalTotalPrice)),
      duration
    };
  };

  useEffect(() => {
    const pricing = computeEstimatedPrice();
    setBasePrice(pricing.basePrice);
    setEstimatedPrice(pricing.totalPrice);
    setBookingDuration(pricing.duration);
  }, [bookingForm.startTime, bookingForm.endTime, spaceData]);

  // Fetch space and venue data
  useEffect(() => {
    const fetchSpaceAndVenueData = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        // First fetch space data
        const spaceResponse = await fetch(`${apiUrl}/api/venue/spaces/${spaceId}`);
        
        if (!spaceResponse.ok) {
          if (spaceResponse.status === 404) {
            toast.error('Space not found. Please check the URL or go back to venue.');
            router.push(`/allVenues/${venueId}`);
          } else if (spaceResponse.status === 403) {
            toast.error('This space is not available for booking.');
          } else {
            toast.error('Failed to load space data.');
          }
          return;
        }

        const spaceDataResult = await spaceResponse.json();
        if (spaceDataResult.success && spaceDataResult.data.space) {
          const space = spaceDataResult.data.space;
          setSpaceData(space);
          
          // Fetch venue data from populated venueId
          if (space.venueId && typeof space.venueId === 'object') {
            const venueId = space.venueId._id;
            const venueResponse = await fetch(`${apiUrl}/api/venue/${venueId}`);
            
            if (venueResponse.ok) {
              const venueDataResult = await venueResponse.json();
              if (venueDataResult.success && venueDataResult.data.venue) {
                setVenueData(venueDataResult.data.venue);
              }
            }
          } else if (space.venueId) {
            const venueResponse = await fetch(`${apiUrl}/api/venue/${space.venueId}`);
            
            if (venueResponse.ok) {
              const venueDataResult = await venueResponse.json();
              if (venueDataResult.success && venueDataResult.data.venue) {
                setVenueData(venueDataResult.data.venue);
              }
            }
          }
          
          // Set initial guest count to minimum or 4
          const minGuests = space.capacityDetails?.minimumBookingCapacity || 4;
          setGuestCount(minGuests);
        } else {
          toast.error('Failed to load space data.');
        }
      } catch (error) {
        console.error('Fetch space error:', error);
        toast.error('An error occurred while fetching space data.');
      } finally {
        setLoading(false);
      }
    };

    fetchSpaceAndVenueData();
  }, [spaceId, venueId]);

  // Fetch availability data for selected date
  const fetchAvailabilityData = async (date: Date) => {
    if (!spaceData) return;

    setLoadingAvailability(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const response = await fetch(`${apiUrl}/api/space-booking/spaces/${spaceId}/availability/${dateStr}`);
      const data = await response.json();

      if (data.success) {
        setAvailabilityData(data.data.availability);
      } else {
        console.error('Failed to fetch availability:', data.message);
        toast.error('Failed to load availability data');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Error loading availability data');
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    if (selectedDate && venueData) {
      fetchAvailabilityData(selectedDate);
    }
  }, [selectedDate, venueData]);

  // Helper function to check if a date is fully blocked
  const isDateFullyBlocked = (date: Date): boolean => {
    if (!venueData?.blockedSlots) return false;
    
    return venueData.blockedSlots.some((slot: any) => {
      const slotDate = new Date(slot.date);
      return (
        slotDate.toDateString() === date.toDateString() &&
        slot.isFullDayBlocked
      );
    });
  };

  // Helper function to check if a date is partially booked
  const isDatePartiallyBooked = (date: Date): boolean => {
    // Don't show as partially booked if it's fully blocked
    if (isDateFullyBlocked(date)) return false;

    // Check venue blocked slots (partial blocks)
    if (venueData?.blockedSlots) {
      const hasPartialBlock = venueData.blockedSlots.some((slot: any) => {
        const slotDate = new Date(slot.date);
        return (
          slotDate.toDateString() === date.toDateString() &&
          !slot.isFullDayBlocked
        );
      });
      if (hasPartialBlock) return true;
    }

    // Check space bookings for this date
    if (spaceData?.bookings && Array.isArray(spaceData.bookings)) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const bookingsForDate = spaceData.bookings.filter((booking: any) => {
        if (!booking || booking.status !== 'confirmed') return false;
        const bookingDate = booking.bookingDate;
        // Handle both string and Date formats
        const bookingDateStr = typeof bookingDate === 'string' 
          ? bookingDate 
          : format(new Date(bookingDate), 'yyyy-MM-dd');
        return bookingDateStr === dateStr;
      });

      // If there are any confirmed bookings, consider it partially booked
      if (bookingsForDate.length > 0) {
        return true;
      }
    }

    return false;
  };

  // Get all fully blocked dates
  const getFullyBlockedDates = (): Date[] => {
    const blockedDates: Date[] = [];
    if (venueData?.blockedSlots) {
      venueData.blockedSlots.forEach((slot: any) => {
        if (slot.isFullDayBlocked) {
          blockedDates.push(new Date(slot.date));
        }
      });
    }
    return blockedDates;
  };

  // Get all partially booked dates
  const getPartiallyBookedDates = (): Date[] => {
    const partiallyBookedDates: Date[] = [];
    const dateSet = new Set<string>(); // Use Set to avoid duplicates
    
    // From venue blocked slots (partial blocks)
    if (venueData?.blockedSlots) {
      venueData.blockedSlots.forEach((slot: any) => {
        if (!slot.isFullDayBlocked && slot.date) {
          const slotDate = new Date(slot.date);
          if (!isNaN(slotDate.getTime())) {
            const dateKey = slotDate.toDateString();
            if (!dateSet.has(dateKey) && !isDateFullyBlocked(slotDate)) {
              dateSet.add(dateKey);
              partiallyBookedDates.push(slotDate);
            }
          }
        }
      });
    }

    // From space bookings
    if (spaceData?.bookings && Array.isArray(spaceData.bookings)) {
      spaceData.bookings.forEach((booking: any) => {
        if (booking && booking.status === 'confirmed' && booking.bookingDate) {
          const bookingDate = typeof booking.bookingDate === 'string'
            ? new Date(booking.bookingDate)
            : new Date(booking.bookingDate);
          
          if (!isNaN(bookingDate.getTime())) {
            const dateKey = bookingDate.toDateString();
            // Only add if not already in set and not fully blocked
            if (!dateSet.has(dateKey) && !isDateFullyBlocked(bookingDate)) {
              dateSet.add(dateKey);
              partiallyBookedDates.push(bookingDate);
            }
          }
        }
      });
    }
    
    return partiallyBookedDates;
  };

  const handleDownloadInvoice = async () => {
    if (!finalBookingDetails) return;

    setIsGeneratingInvoice(true);
    try {
      // Dynamically import jsPDF
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // Helper function to add text with word wrap
      const addText = (text: string, x: number, y: number, options: any = {}) => {
        const { fontSize = 10, fontStyle = 'normal', color = [0, 0, 0], maxWidth = contentWidth, align = 'left' } = options;
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        doc.setTextColor(color[0], color[1], color[2]);
        
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y, { align });
        return y + (lines.length * fontSize * 0.4);
      };

      // Header Section
      doc.setFillColor(239, 68, 68); // Red color
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const title = 'BOOKING INVOICE';
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (pageWidth - titleWidth) / 2, 25);

      yPos = 55;

      // Venue Information
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      yPos = addText(venueData?.businessName || venueData?.name || 'Venue', margin, yPos, { fontSize: 16, fontStyle: 'bold' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (venueData?.address) {
        const address = `${venueData.address.street || ''}, ${venueData.address.city || ''}, ${venueData.address.state || ''} - ${venueData.address.pincode || ''}`.trim().replace(/^,\s*|,\s*$/g, '');
        if (address) yPos = addText(address, margin, yPos + 3, { fontSize: 10 });
      }
      if (venueData?.contactInfo?.phone) {
        yPos = addText(`Phone: ${venueData.contactInfo.phone}`, margin, yPos + 3, { fontSize: 10 });
      }
      if (venueData?.contactInfo?.email) {
        yPos = addText(`Email: ${venueData.contactInfo.email}`, margin, yPos + 3, { fontSize: 10 });
      }

      yPos += 10;

      // Invoice Details Box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(margin, yPos, contentWidth, 50, 3, 3, 'FD');
      
      const detailY = yPos + 8;
      let detailX = margin + 5;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Invoice Number:', detailX, detailY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(finalBookingDetails._id || 'N/A', detailX + 45, detailY);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Booking Date:', detailX, detailY + 8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(format(new Date(finalBookingDetails.bookingDate), 'PPP'), detailX + 45, detailY + 8);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Payment ID:', detailX, detailY + 16);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const paymentId = finalBookingDetails.payment?.razorpay_payment_id || 
                       finalBookingDetails.paymentDetails?.paymentId || 
                       finalBookingDetails.paymentDetails?.razorpay_payment_id || 
                       'N/A';
      const displayPaymentId = paymentId.length > 20 ? paymentId.substring(0, 20) + '...' : paymentId;
      doc.text(displayPaymentId, detailX + 45, detailY + 16);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Payment Status:', detailX, detailY + 24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94); // Green
      const paymentStatus = finalBookingDetails.payment?.status || 
                           finalBookingDetails.pricing?.paymentStatus || 
                           'Completed';
      doc.text(paymentStatus.toUpperCase(), detailX + 45, detailY + 24);

      yPos += 60;

      // Booking Details Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      yPos = addText('Booking Details', margin, yPos, { fontSize: 14, fontStyle: 'bold' });
      
      yPos += 5;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Space Name
      if (spaceData?.name) {
        doc.setFont('helvetica', 'bold');
        doc.text('Space:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(spaceData.name, margin + 30, yPos);
        yPos += 7;
      }

      // Date and Time
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(finalBookingDetails.bookingDate), 'PPP'), margin + 30, yPos);
      yPos += 7;

      doc.setFont('helvetica', 'bold');
      doc.text('Time:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${finalBookingDetails.startTime} - ${finalBookingDetails.endTime}`, margin + 30, yPos);
      yPos += 7;

      // Guests
      if (finalBookingDetails.guestCount) {
        doc.setFont('helvetica', 'bold');
        doc.text('Number of Guests:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(finalBookingDetails.guestCount.toString(), margin + 50, yPos);
        yPos += 7;
      }

      // Event Type
      if (finalBookingDetails.eventType) {
        doc.setFont('helvetica', 'bold');
        doc.text('Event Type:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(finalBookingDetails.eventType, margin + 40, yPos);
        yPos += 7;
      }

      yPos += 5;

      // Pricing Breakdown Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      yPos = addText('Pricing Breakdown', margin, yPos, { fontSize: 14, fontStyle: 'bold' });
      
      yPos += 5;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Pricing details
      const pricing = finalBookingDetails.pricing || {};
      const basePrice = pricing.basePrice || 0;
      const cleaningFee = pricing.cleaningFee || 0;
      const securityDeposit = pricing.securityDeposit || 0;
      const totalAmount = pricing.totalAmount || 0;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Base Price
      if (basePrice > 0) {
        doc.text('Base Price:', margin, yPos);
        doc.text(`₹${basePrice.toLocaleString('en-IN')}`, pageWidth - margin - 30, yPos, { align: 'right' });
        yPos += 7;
      }

      // Cleaning Fee
      if (cleaningFee > 0) {
        doc.text('Cleaning Fee:', margin, yPos);
        doc.text(`₹${cleaningFee.toLocaleString('en-IN')}`, pageWidth - margin - 30, yPos, { align: 'right' });
        yPos += 7;
      }

      // Security Deposit
      if (securityDeposit > 0) {
        doc.text('Security Deposit (Refundable):', margin, yPos);
        doc.text(`₹${securityDeposit.toLocaleString('en-IN')}`, pageWidth - margin - 30, yPos, { align: 'right' });
        yPos += 7;
      }

      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Total
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Amount:', margin, yPos);
      doc.setFontSize(14);
      doc.setTextColor(239, 68, 68); // Red
      doc.text(`₹${totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 30, yPos, { align: 'right' });
      yPos += 10;

      // Footer
      const footerY = pageHeight - 30;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      const thankYouText = `Thank you for booking with ${venueData?.businessName || venueData?.name || 'us'}!`;
      const thankYouWidth = doc.getTextWidth(thankYouText);
      doc.text(thankYouText, (pageWidth - thankYouWidth) / 2, footerY + 8);
      
      doc.setFontSize(8);
      const footerText = 'This is a computer-generated invoice and does not require a signature.';
      const footerWidth = doc.getTextWidth(footerText);
      doc.text(footerText, (pageWidth - footerWidth) / 2, footerY + 15);

      // Generate filename
      const venueName = (venueData?.businessName || venueData?.name || 'venue').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${venueName}_invoice_${finalBookingDetails._id?.slice(-8) || Date.now()}.pdf`;

      // Save PDF
      doc.save(fileName);
      
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF invoice:', error);
      toast.error('Failed to generate invoice. Please try again.');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    const toYYYYMMDD = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    e.preventDefault();
    setFormError(null);

    if (!user) {
      toast.error('You must be logged in to book.');
      router.push(createAuthRedirectUrl());
      return;
    }

    if (!selectedDate) {
      setFormError('Please select a booking date.');
      return;
    }
    if (!bookingForm.startTime) {
      setFormError('Please select a start time.');
      return;
    }
    if (!bookingForm.endTime) {
      setFormError('Please select an end time.');
      return;
    }
    if (bookingForm.startTime >= bookingForm.endTime) {
      setFormError('End time must be after start time.');
      return;
    }

    if (!venueData) {
      setFormError('Unable to process booking. Venue information not loaded properly.');
      toast.error('Please refresh the page and try again.');
      return;
    }

    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const orderResponse = await fetch(`${apiUrl}/api/space-booking/spaces/${spaceId}/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookingDate: toYYYYMMDD(selectedDate),
          startTime: bookingForm.startTime,
          endTime: bookingForm.endTime,
          guestCount: guestCount,
          eventType: bookingForm.eventType,
          specialRequirements: bookingForm.specialRequirements,
          pricingHint: {
            estimatedPrice,
          }
        }),
      });

      // Parse JSON response
      let orderResponseData;
      try {
        const responseText = await orderResponse.text();
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        orderResponseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse order response:', parseError);
        throw new Error('Invalid response from server. Please try again.');
      }

      // Check if response indicates an error
      if (!orderResponse.ok) {
        console.error('Order creation failed:', {
          status: orderResponse.status,
          statusText: orderResponse.statusText,
          data: orderResponseData
        });
        const errorMessage = orderResponseData?.message || orderResponseData?.error || 'Failed to create order.';
        throw new Error(errorMessage);
      }

      // Validate response structure
      if (!orderResponseData.success) {
        console.error('Order creation returned success: false:', orderResponseData);
        throw new Error(orderResponseData.message || 'Failed to create order. Please try again.');
      }

      if (!orderResponseData.data) {
        console.error('Missing data in order response:', orderResponseData);
        throw new Error('Invalid response from server. Please try again.');
      }

      // Validate Razorpay key
      const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKeyId) {
        throw new Error('Payment gateway not configured. Please contact support.');
      }

      // Extract order data from response
      const orderData = orderResponseData.data.order;
      if (!orderData) {
        console.error('Missing order in response data:', orderResponseData.data);
        throw new Error('Invalid order data received. Please try again.');
      }

      if (!orderData.orderId || !orderData.amount) {
        console.error('Invalid order data structure - missing required fields:', {
          hasOrderId: !!orderData.orderId,
          hasAmount: !!orderData.amount,
          orderData
        });
        throw new Error('Invalid order data received. Please try again.');
      }

      // Store bookingId for use in payment handler
      const bookingId = orderData.bookingId;
      console.log('Order created successfully:', {
        orderId: orderData.orderId,
        amount: orderData.amount,
        bookingId
      });

      const options = {
        key: razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: venueData?.businessName || venueData?.name || 'Space Booking',
        description: `Booking for ${spaceData?.name} on ${format(selectedDate, 'PPP')}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          setIsVerifying(true);
          
          // Validate payment response
          if (!response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
            setIsVerifying(false);
            console.error('Invalid payment response:', response);
            toast.error('Invalid payment response. Please try again.');
            setFormError('Payment verification failed due to incomplete payment data. Please retry the payment.');
            return;
          }

          try {
            const verificationResponse = await fetch(`${apiUrl}/api/space-booking/spaces/${spaceId}/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: bookingId
              }),
            });

            const verificationData = await verificationResponse.json();
            setIsVerifying(false);

            if (verificationData.success) {
              setFinalBookingDetails(verificationData.data.booking);
              setBookingSuccess(true);
              setFormError(null);
              toast.success('Booking confirmed!');
            } else {
              console.error('Payment verification failed:', verificationData);
              const errorMessage = verificationData.message || 'Payment verification failed.';
              
              // Provide specific error messages based on common issues
              if (errorMessage.includes('Invalid payment signature') || errorMessage.includes('security issues')) {
                toast.error('Payment security verification failed. Please try again.');
                setFormError('Payment verification failed due to security issues. Please retry the payment.');
              } else if (errorMessage.includes('Space not found')) {
                toast.error('Space not found. Please refresh and try again.');
                setFormError('The space is no longer available. Please select a different space.');
              } else if (errorMessage.includes('Order not found') || errorMessage.includes('expired')) {
                toast.error('Payment order not found or expired. Please try again.');
                setFormError('Payment order expired. Please retry the booking.');
              } else if (errorMessage.includes('Invalid booking details') || errorMessage.includes('start a new booking')) {
                toast.error('Booking details are invalid. Please try again.');
                setFormError('Invalid booking information. Please start a new booking.');
              } else if (errorMessage.includes('Payment not completed')) {
                toast.error('Payment not completed. Please complete the payment.');
                setFormError('Payment was not completed successfully. Please try again.');
              } else {
                toast.error(errorMessage);
                setFormError(`${errorMessage} Please contact support if the issue persists.`);
              }
            }
          } catch (networkError: any) {
            setIsVerifying(false);
            console.error('Network error during payment verification:', networkError);
            toast.error('Network error. Please check your connection and try again.');
            setFormError('Unable to verify payment due to network error. Please check your connection and retry.');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        notes: {
          venueId: venueId,
          venueName: venueData?.businessName || venueData?.name
        },
        theme: {
          color: '#EF4444'
        }
      };

      // Ensure Razorpay script is loaded
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        throw new Error('Failed to load payment gateway. Please refresh the page and try again.');
      }

      // Double-check Razorpay is available
      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Payment gateway not available. Please refresh the page and try again.');
      }

      const rzp = new (window as any).Razorpay(options);
      
      rzp.on('payment.failed', function (response: any) {
        console.error('Razorpay payment failed:', response);
        const errorDescription = response.error?.description || 'Unknown error';
        toast.error('Payment failed. Please try again.');
        setFormError(`Payment failed: ${errorDescription}. Please retry the payment.`);
        setSubmitting(false);
      });

      rzp.on('payment.authorized', function (response: any) {
        console.log('Payment authorized:', response);
      });

      rzp.open();

    } catch (error: any) {
      console.error('Booking process error:', error);
      setFormError(error.message || 'An unexpected error occurred.');
      toast.error(error.message || 'An error occurred during the booking process.');
    } finally {
      setSubmitting(false);
    }
  };

  const isTimeSlotAvailable = (time: string): boolean => {
    if (!availabilityData) return true;
    
    // Check if this specific time slot is marked as unavailable
    const timeSlot = availabilityData.timeSlots.find(slot => slot.time === time);
    if (timeSlot?.available === false) {
      return false;
    }
    
    // Check for overlapping bookings from existing bookings
    const hasOverlappingBooking = availabilityData.existingBookings.some(booking => {
      const bookingStart = booking.startTime;
      const bookingEnd = booking.endTime;
      
      // Check if the requested time falls within any existing booking
      return time >= bookingStart && time < bookingEnd;
    });
    
    return !hasOverlappingBooking;
  };

  const slotSummary = useMemo(() => {
    // Prefer server summary when present and consistent with timeSlots
    const serverSummary = availabilityData?.summary;
    const slots = availabilityData?.timeSlots;

    if (!slots?.length) {
      return serverSummary ?? null;
    }

    const totalSlots = slots.length;
    const bookedSlots = slots.filter(slot => slot.available === false).length;
    const availableSlots = totalSlots - bookedSlots;

    return {
      totalSlots,
      availableSlots,
      bookedSlots
    };
  }, [availabilityData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-sm sm:text-base text-gray-600">Loading venue information...</p>
        </div>
      </div>
    );
  }

  if (!loading && !venueData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-100 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="h-7 w-7 sm:h-8 sm:w-8 text-red-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Venue Not Found</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            The venue you're looking for doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => router.push('/allVenues')}
            className="bg-red-500 hover:bg-red-600 h-11 sm:h-12 text-sm sm:text-base px-6"
          >
            Browse All Venues
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {isVerifying && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-[100] px-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full">
            <div className="animate-spin rounded-full h-14 w-14 sm:h-16 sm:w-16 border-4 border-red-200 border-t-red-600"></div>
            <p className="text-gray-800 text-base sm:text-lg mt-4 font-medium">Verifying payment...</p>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Please wait a moment</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Breadcrumb */}
        <button 
          onClick={() => router.push(`/allVenues/${venueId}`)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors min-h-[44px]"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8">
          Complete your booking
        </h1>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Venue Info & Booking Form */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Venue Summary Card */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                    {spaceData?.gallery && spaceData.gallery.length > 0 ? (
                      <img
                        src={(() => {
                          const gallery = Array.isArray(spaceData.gallery) ? spaceData.gallery : [];
                          
                          // If cover image is set, find it in the gallery
                          if (spaceData.coverImage) {
                            const coverImage = gallery.find((img: any) => img.url === spaceData.coverImage);
                            if (coverImage?.url) {
                              return coverImage.url;
                            }
                          }
                          
                          // Fallback to isMain image or first image
                          const mainImage = gallery.find((img: any) => img.isMain)?.url;
                          const firstImage = gallery.find((img: any) => img.url)?.url;
                          return mainImage || firstImage || "";
                        })()}
                        alt={spaceData?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-full h-full p-3 sm:p-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <div>
                        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 line-clamp-2">
                          {spaceData?.name}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          at {venueData?.businessName || venueData?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 text-xs sm:text-sm">
                        <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-red-500 text-red-500" />
                        <span className="font-semibold">
                          {(spaceData?.rating?.average ?? 0).toFixed(1)}
                        </span>
                        <span className="text-gray-500">
                          · {spaceData?.rating?.count ?? 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">{spaceData?.address?.city}, {spaceData?.address?.state}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mt-1">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>Capacity: {spaceData?.capacity} guests</span>
                      <span className="text-gray-400">•</span>
                      <span>{spaceData?.venueClassification?.indoorOutdoor || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Card */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="text-base sm:text-lg font-bold text-gray-900">Select a date</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="flex justify-center overflow-x-auto">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
                        return true
                      }
                      // Disable fully blocked dates
                      return isDateFullyBlocked(date)
                    }}
                    modifiers={{
                      fullyBlocked: getFullyBlockedDates(),
                      partiallyBooked: getPartiallyBookedDates(),
                    }}
                    modifiersClassNames={{
                      fullyBlocked: "bg-red-500 text-white hover:bg-red-600 hover:text-white focus:bg-red-500 focus:text-white cursor-not-allowed opacity-90",
                      partiallyBooked: "bg-yellow-400 text-yellow-900 hover:bg-yellow-500 hover:text-yellow-950 focus:bg-yellow-400 focus:text-yellow-900 font-medium",
                    }}
                    className="rounded-lg border-0"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4 w-full",
                      caption: "flex justify-center pt-1 relative items-center px-2",
                      caption_label: "text-sm font-semibold",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex justify-around",
                      head_cell: "text-gray-500 rounded-md w-8 sm:w-9 font-normal text-[0.75rem] sm:text-[0.8rem] flex-1 text-center",
                      row: "flex w-full mt-2 justify-around",
                      cell: "text-center text-sm p-0 relative flex-1 [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal hover:bg-gray-100 rounded-md aria-selected:opacity-100 mx-auto text-sm sm:text-base",
                      day_selected: "bg-red-500 text-white hover:bg-red-600 hover:text-white focus:bg-red-500 focus:text-white",
                      day_today: "bg-gray-100 text-gray-900 font-semibold",
                      day_outside: "text-gray-400 opacity-50",
                      day_disabled: "text-gray-400 opacity-50 line-through",
                      day_hidden: "invisible",
                    }}
                  />
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-400 border border-yellow-500"></div>
                    <span className="text-gray-600">Partially Booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500"></div>
                    <span className="text-gray-600">Fully Blocked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div>
                    <span className="text-gray-600">Available</span>
                  </div>
                </div>

                {slotSummary && (
                  <div className="bg-gray-50 p-2.5 sm:p-3 rounded-lg">
                    <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs text-gray-600">
                      <span><strong>{slotSummary.totalSlots}</strong> total</span>
                      <span className="text-green-600"><strong>{slotSummary.availableSlots}</strong> available</span>
                      <span className="text-red-600"><strong>{slotSummary.bookedSlots}</strong> booked</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Duration Selection */}
            {selectedDate && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="text-base sm:text-lg font-bold text-gray-900">Select booking duration</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {/* Custom Time Option */}
                    <div className="col-span-1">
                      <Label className="text-xs sm:text-sm font-medium text-gray-900 mb-2 block">
                        Custom Time
                      </Label>
                      <div className="space-y-2">
                        <Select
                          value={bookingForm.startTime}
                          onValueChange={(value) => {
                            if (isTimeSlotAvailable(value)) {
                              setBookingForm({ ...bookingForm, startTime: value });
                              // Auto-set end time to next available slot
                              const currentIndex = TIME_SLOTS.findIndex(slot => slot.value === value);
                              if (currentIndex !== -1 && currentIndex < TIME_SLOTS.length - 1) {
                                const nextSlot = TIME_SLOTS[currentIndex + 1];
                                if (isTimeSlotAvailable(nextSlot.value)) {
                                  setBookingForm(prev => ({ ...prev, endTime: nextSlot.value }));
                                }
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="w-full h-11 text-sm">
                            <SelectValue placeholder="Start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((slot) => {
                              const isAvailable = isTimeSlotAvailable(slot.value);
                              return (
                                <SelectItem
                                  key={slot.value}
                                  value={slot.value}
                                  disabled={!isAvailable}
                                  className={!isAvailable ? "text-gray-400" : ""}
                                >
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    {slot.label}
                                    {!isAvailable && <span className="text-xs text-red-500">(Booked)</span>}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Select
                          value={bookingForm.endTime}
                          onValueChange={(value) => {
                            if (isTimeSlotAvailable(value) && value > bookingForm.startTime) {
                              setBookingForm({ ...bookingForm, endTime: value });
                            }
                          }}
                        >
                          <SelectTrigger className="w-full h-11 text-sm">
                            <SelectValue placeholder="End time" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((slot) => {
                              const isAvailable = isTimeSlotAvailable(slot.value);
                              const isValidEndTime = slot.value > bookingForm.startTime;
                              return (
                                <SelectItem
                                  key={slot.value}
                                  value={slot.value}
                                  disabled={!isAvailable || !isValidEndTime}
                                  className={!isAvailable || !isValidEndTime ? "text-gray-400" : ""}
                                >
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    {slot.label}
                                    {!isAvailable && <span className="text-xs text-red-500">(Booked)</span>}
                                    {!isValidEndTime && <span className="text-xs text-orange-500">(Invalid)</span>}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Half Day Option */}
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-900 mb-2 block">
                        Half Day
                      </Label>
                      <button
                        onClick={() => {
                          setBookingForm({ 
                            ...bookingForm, 
                            startTime: "09:00", 
                            endTime: "17:00" 
                          });
                        }}
                        className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all min-h-[100px] ${
                          bookingForm.startTime === "09:00" && bookingForm.endTime === "17:00"
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="text-center">
                          <Clock className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1.5 sm:mb-2" />
                          <div className="font-semibold text-sm sm:text-base">Half Day</div>
                          <div className="text-xs sm:text-sm">Flexible timing</div>
                          {spaceData?.pricing?.halfDayRate !== undefined && (
                            <div className="text-xs sm:text-sm font-medium mt-1">
                              ₹{spaceData.pricing.halfDayRate.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Full Day Option */}
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-900 mb-2 block">
                        Full Day
                      </Label>
                      <button
                        onClick={() => {
                          setBookingForm({ 
                            ...bookingForm, 
                            startTime: "00:00", 
                            endTime: "23:00" 
                          });
                        }}
                        className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all min-h-[100px] ${
                          bookingForm.startTime === "00:00" && bookingForm.endTime === "23:00"
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="text-center">
                          <Clock className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1.5 sm:mb-2" />
                          <div className="font-semibold text-sm sm:text-base">Full Day</div>
                          <div className="text-xs sm:text-sm">Flexible timing</div>
                          {spaceData?.pricing?.fullDayRate !== undefined && (
                            <div className="text-xs sm:text-sm font-medium mt-1">
                              ₹{spaceData.pricing.fullDayRate.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {bookingForm.startTime && bookingForm.endTime && (
                    <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-700">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>
                          Duration: {getDurationHours(bookingForm.startTime, bookingForm.endTime).toFixed(1)} hours
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Guest Count */}
            {selectedDate && bookingForm.startTime && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="text-base sm:text-lg font-bold text-gray-900">Number of guests</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-2">
                    <Label htmlFor="guestCount" className="text-xs sm:text-sm font-medium text-gray-900">
                      Number of guests
                    </Label>
                    <Input
                      id="guestCount"
                      type="number"
                      min="1"
                      max={spaceData?.capacity || 999}
                      value={guestCount}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1 && value <= (spaceData?.capacity || 999)) {
                          setGuestCount(value);
                        }
                      }}
                      className="w-full h-11 text-sm sm:text-base"
                      placeholder="Enter number of guests"
                    />
                    <p className="text-xs sm:text-sm text-gray-500">
                      Maximum capacity: {spaceData?.capacity || 0} guests
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Event Type */}
            {selectedDate && bookingForm.startTime && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <Label htmlFor="eventType" className="text-xs sm:text-sm font-medium text-gray-900 mb-2 block">
                    Event Type (Optional)
                  </Label>
                  <Input 
                    id="eventType"
                    value={bookingForm.eventType} 
                    onChange={(e) => setBookingForm({ ...bookingForm, eventType: e.target.value })} 
                    placeholder="Wedding, Party, Conference, etc." 
                    className="h-11 text-sm sm:text-base"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Price Summary */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="text-base sm:text-lg font-bold text-gray-900">Price summary</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  {bookingSuccess ? (
                    <div className="text-center py-4 sm:py-6">
                      <div className="bg-green-100 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
                      <div className="text-left space-y-2 text-xs sm:text-sm bg-green-50 p-3 sm:p-4 rounded-xl mt-3 sm:mt-4 mb-3 sm:mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-medium">{format(new Date(finalBookingDetails?.bookingDate), 'PP')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time:</span>
                          <span className="font-medium">{finalBookingDetails?.startTime} - {finalBookingDetails?.endTime}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-green-200">
                          <span className="font-medium">Total Paid:</span>
                          <span className="font-bold text-green-600">₹{finalBookingDetails?.pricing?.totalAmount?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <Button 
                        onClick={handleDownloadInvoice} 
                        disabled={isGeneratingInvoice}
                        className="w-full bg-green-600 hover:bg-green-700 h-11 sm:h-12 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingInvoice ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating PDF...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Download Invoice
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {spaceData && selectedDate && bookingForm.startTime ? (
                        <div>
                          <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                            {bookingForm.startTime && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  {bookingForm.startTime === "00:00" && bookingForm.endTime === "23:00"
                                    ? "Full day rate"
                                    : bookingDuration <= 8 && bookingDuration > 4
                                    ? "Half day rate"
                                    : `Hourly (${bookingDuration.toFixed(1)}h)`
                                  }
                                </span>
                                <span className="font-medium">
                                  ₹{basePrice.toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                            {spaceData.pricing.cleaningFee !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Cleaning fee</span>
                                <span className="font-medium">₹{spaceData.pricing.cleaningFee.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {spaceData.pricing.securityDeposit !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Security deposit (refundable)</span>
                                <span className="font-medium">₹{spaceData.pricing.securityDeposit.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                          </div>

                          <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
                            <div className="flex justify-between items-center mb-3 sm:mb-4">
                              <span className="text-sm sm:text-base font-semibold text-gray-900">Total</span>
                              <span className="text-xl sm:text-2xl font-bold text-gray-900">₹{estimatedPrice.toLocaleString('en-IN')}</span>
                            </div>

                            {formError && (
                              <div className="p-2.5 sm:p-3 text-xs sm:text-sm text-red-700 bg-red-50 rounded-lg mb-3 sm:mb-4">{formError}</div>
                            )}

                            <Button 
                              onClick={handleBookingSubmit}
                              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 sm:py-3.5 rounded-lg h-auto text-sm sm:text-base"
                              disabled={submitting || authLoading || !bookingForm.startTime}
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                'Confirm Booking'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8">
                          <CalendarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
                          <p className="text-xs sm:text-sm text-gray-500">Select date and time to see pricing</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}