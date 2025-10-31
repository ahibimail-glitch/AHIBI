"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import ArtistBookingInvoice from "./ArtistBookingInvoice";

interface DayAvailability {
  _id: string;
  date: string;
  dayStatus: 'available' | 'partially_booked' | 'fully_booked' | 'unavailable';
}

interface Artist {
  _id: string;
  name: string;
  basePrice: number;
  city: string;
  type: string;
}

interface BookingFormData {
  eventName: string;
  eventDescription: string;
  eventLocation: string;
  eventType: string;
  startTime: string;
  endTime: string;
  specialRequests: string;
}

interface PublicBookingCalendarProps {
  artistId: string;
  artist: Artist;
}

// Generate time options (every hour from 9 AM to 9 PM) - HH:MM format
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 9; hour <= 21; hour++) {
    const timeString = `${String(hour).padStart(2, '0')}:00`;
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const amPm = hour >= 12 ? 'PM' : 'AM';
    times.push({ 
      value: timeString, 
      label: `${displayHour}:00 ${amPm}`
    });
  }
  return times;
};

export default function PublicBookingCalendar({ artistId, artist }: PublicBookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    eventName: '',
    eventDescription: '',
    eventLocation: '',
    eventType: 'other',
    startTime: '',
    endTime: '',
    specialRequests: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [currentDate, artistId]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      // Fetch all bookings for this artist (all statuses to check availability)
      const response = await fetch(`/api/organizer/bookings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('organizer_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter bookings for this artist
        const artistBookings = data.data?.bookings?.filter((b: any) => 
          (b.artist?._id === artistId || b.artist?.toString() === artistId) &&
          ['pending', 'accepted', 'confirmed'].includes(b.booking?.status)
        ) || [];
        setBookings(artistBookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const isDateBooked = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.some(booking => {
      const bookingDate = new Date(booking.event.date).toISOString().split('T')[0];
      return bookingDate === dateStr && 
        ['confirmed', 'accepted', 'pending'].includes(booking.booking?.status);
    });
  };

  const getDayStatusColor = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateCheck = new Date(date);
    dateCheck.setHours(0, 0, 0, 0);
    
    if (dateCheck < today) {
      return 'bg-gray-100 text-gray-300 cursor-not-allowed';
    }
    
    if (isDateBooked(date)) {
      return 'bg-red-100 text-red-800 cursor-not-allowed';
    }
    
    return 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateCheck = new Date(date);
    dateCheck.setHours(0, 0, 0, 0);
    
    if (dateCheck < today) {
      toast({
        title: "Past Date",
        description: "Cannot select dates in the past",
        variant: "destructive"
      });
      return;
    }

    if (isDateBooked(date)) {
      toast({
        title: "Date Booked",
        description: "This date is already booked. Only one booking per day is allowed.",
        variant: "destructive"
      });
      return;
    }

    setSelectedDate(date.toISOString().split('T')[0]);
    setShowBookingForm(true);
  };

  const calculateDuration = () => {
    if (!bookingForm.startTime || !bookingForm.endTime) return 0;
    const [startHour, startMin] = bookingForm.startTime.split(':').map(Number);
    const [endHour, endMin] = bookingForm.endTime.split(':').map(Number);
    const start = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;
    return Math.max(0, (end - start) / 60);
  };

  const calculatePrice = () => {
    // Flat day rate - price for entire day regardless of hours
    return artist.basePrice;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive"
      });
      return;
    }

    if (!bookingForm.eventName.trim() || !bookingForm.eventLocation.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!bookingForm.startTime || !bookingForm.endTime) {
      toast({
        title: "Validation Error",
        description: "Please select both start and end times",
        variant: "destructive"
      });
      return;
    }

    if (bookingForm.startTime >= bookingForm.endTime) {
      toast({
        title: "Validation Error",
        description: "End time must be after start time",
        variant: "destructive"
      });
      return;
    }

    const duration = calculateDuration();
    if (duration < 1) {
      toast({
        title: "Validation Error",
        description: "Minimum booking duration is 1 hour",
        variant: "destructive"
      });
      return;
    }

    if (duration > 12) {
      toast({
        title: "Validation Error",
        description: "Maximum booking duration is 12 hours",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      // Parse location - ensure venue name and address are always provided
      const locationParts = bookingForm.eventLocation.split(',').map(s => s.trim());
      
      // If only one part, use it as both name and address
      let venueName = 'Event Venue';
      let venueAddress = bookingForm.eventLocation;
      let venueCity = artist.city;
      let venueState: string | undefined = undefined;
      let venuePincode: string | undefined = undefined;

      if (locationParts.length === 1) {
        venueName = locationParts[0];
        venueAddress = locationParts[0];
      } else if (locationParts.length >= 2) {
        venueName = locationParts[0];
        venueAddress = locationParts[0];
        venueCity = locationParts[locationParts.length - 1] || artist.city;
        if (locationParts.length >= 3) {
          venueState = locationParts[locationParts.length - 2];
        }
        if (locationParts.length >= 4) {
          venuePincode = locationParts[locationParts.length - 1];
          venueCity = locationParts[locationParts.length - 2] || artist.city;
        }
      }

      // Ensure date is in ISO format (YYYY-MM-DD)
      // Validate time format (should be HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(bookingForm.startTime) || !timeRegex.test(bookingForm.endTime)) {
        toast({
          title: "Invalid Time Format",
          description: "Please select valid start and end times",
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }
      
      // Format date as ISO8601 string (YYYY-MM-DD)
      const bookingDateStr = selectedDate; // Already in YYYY-MM-DD format
      
      const bookingData = {
        artistId: artistId,
        requestedAmount: calculatePrice(),
        event: {
          name: bookingForm.eventName,
          description: bookingForm.eventDescription || undefined,
          date: `${bookingDateStr}T00:00:00.000Z`, // Full ISO8601 format
          startTime: bookingForm.startTime, // HH:MM format (e.g., "09:00")
          endTime: bookingForm.endTime, // HH:MM format (e.g., "17:00")
          duration: duration,
          venue: {
            name: venueName,
            address: venueAddress,
            city: venueCity,
            state: venueState || undefined,
            pincode: venuePincode || undefined
          },
          eventType: bookingForm.eventType,
          expectedAudience: undefined
        },
        organizerRequirements: bookingForm.specialRequests || undefined,
        specialRequirements: undefined
      };

      console.log('Booking data being sent:', JSON.stringify(bookingData, null, 2));

      const response = await fetch('/api/organizer/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('organizer_token')}`
        },
        body: JSON.stringify(bookingData)
      });

      const responseData = await response.json();

      console.log('Booking response:', responseData);

      if (!response.ok) {
        console.error('Booking error response:', responseData);
        toast({
          title: "Booking Failed",
          description: responseData.message || responseData.errors?.[0]?.msg || responseData.error || "Failed to create booking",
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }

      if (response.ok && responseData.data) {
        const { booking, paymentOrder } = responseData.data;
        
        console.log('Payment order received:', paymentOrder);
        console.log('Razorpay available:', !!window.Razorpay);
        console.log('Razorpay key:', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
        
        // Check if Razorpay is loaded
        if (!window.Razorpay) {
          toast({
            title: "Payment Error",
            description: "Payment gateway is loading. Please wait a moment and try again.",
            variant: "destructive"
          });
          setSubmitting(false);
          return;
        }

        if (!paymentOrder || !paymentOrder.id) {
          toast({
            title: "Payment Error",
            description: "Failed to create payment order. Please try again.",
            variant: "destructive"
          });
          setSubmitting(false);
          return;
        }

        const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        if (!razorpayKeyId) {
          toast({
            title: "Configuration Error",
            description: "Payment gateway not configured. Please contact support.",
            variant: "destructive"
          });
          setSubmitting(false);
          return;
        }

        // Open Razorpay checkout
        const options = {
          key: razorpayKeyId,
          amount: paymentOrder.amount, // Already in paise from backend
          currency: paymentOrder.currency || 'INR',
          name: artist.name || 'Artist Booking',
          description: `Booking for ${bookingForm.eventName} on ${new Date(selectedDate!).toLocaleDateString()}`,
          order_id: paymentOrder.id,
          handler: async function (response: any) {
            try {
              setIsVerifying(true);
              console.log('Payment response:', response);
              
              const verifyResponse = await fetch(`/api/organizer/bookings/${booking._id}/payment/verify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('organizer_token')}`
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                })
              });

              const verifyData = await verifyResponse.json();

              if (verifyResponse.ok && verifyData.success) {
                toast({
                  title: "Booking Confirmed",
                  description: `Payment successful! Your booking has been confirmed.`,
                });
                
                // Set confirmed booking for invoice display
                setConfirmedBooking(verifyData.data.booking);
                setShowBookingForm(false);
                setShowInvoice(true); // Show invoice dialog
                setSelectedDate(null);
                setBookingForm({
                  eventName: '',
                  eventDescription: '',
                  eventLocation: '',
                  eventType: 'other',
                  startTime: '',
                  endTime: '',
                  specialRequests: ''
                });
                fetchBookings();
              } else {
                toast({
                  title: "Payment Verification Failed",
                  description: verifyData.message || "Payment successful but verification failed. Please contact support.",
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.error('Payment verification error:', error);
              toast({
                title: "Verification Error",
                description: "Payment successful but verification failed. Please contact support.",
                variant: "destructive"
              });
            } finally {
              setIsVerifying(false);
              setSubmitting(false);
            }
          },
          prefill: {
            name: '',
            email: '',
            contact: ''
          },
          theme: {
            color: '#8A2BE2'
          },
          modal: {
            ondismiss: function() {
              setSubmitting(false);
              toast({
                title: "Payment Cancelled",
                description: "You cancelled the payment. Booking is pending.",
              });
            }
          }
        };

        console.log('Opening Razorpay checkout with options:', {
          key: options.key?.substring(0, 12) + '...',
          amount: options.amount,
          currency: options.currency,
          order_id: options.order_id
        });

        try {
          const rzp = new window.Razorpay(options);
          
          rzp.on('payment.failed', function (response: any) {
            console.error('Razorpay payment failed:', response);
            toast({
              title: "Payment Failed",
              description: response.error?.description || response.error?.reason || "Payment failed. Please try again.",
              variant: "destructive"
            });
            setSubmitting(false);
          });
          
          // Close booking dialog before opening Razorpay to avoid z-index conflicts
          setShowBookingForm(false);
          
          // Ensure Razorpay modal has proper z-index
          rzp.open();
          
          // Fix z-index and pointer events after modal opens (Razorpay creates iframe dynamically)
          setTimeout(() => {
            // Fix Razorpay iframes
            const razorpayIframes = document.querySelectorAll('iframe[src*="razorpay"]');
            razorpayIframes.forEach((iframe: any) => {
              iframe.style.zIndex = '10000';
              iframe.style.pointerEvents = 'auto';
              iframe.style.position = 'fixed';
            });
            
            // Fix for Razorpay container and overlay elements
            const razorpayElements = document.querySelectorAll('[class*="razorpay"], [id*="razorpay"], [data-razorpay]');
            razorpayElements.forEach((element: any) => {
              element.style.zIndex = '10000';
              element.style.pointerEvents = 'auto';
              if (element.style.position === '' || element.style.position === 'relative') {
                element.style.position = 'fixed';
              }
            });
            
            // Ensure body and html don't block pointer events
            document.body.style.overflow = 'hidden';
            
            // Remove any overlays that might block interaction
            const overlays = document.querySelectorAll('[role="dialog"], [data-radix-dialog-overlay]');
            overlays.forEach((overlay: any) => {
              if (overlay.style.zIndex && parseInt(overlay.style.zIndex) > 1000) {
                overlay.style.zIndex = '9999';
              }
            });
          }, 100);
          
          // Additional fix after a longer delay to catch dynamically loaded content
          setTimeout(() => {
            const razorpayIframes = document.querySelectorAll('iframe[src*="razorpay"]');
            razorpayIframes.forEach((iframe: any) => {
              iframe.style.zIndex = '10000';
              iframe.style.pointerEvents = 'auto';
              iframe.style.cursor = 'pointer';
            });
          }, 500);
          
          console.log('Razorpay checkout opened successfully');
        } catch (error: any) {
          console.error('Error opening Razorpay:', error);
          toast({
            title: "Payment Error",
            description: error.message || "Failed to open payment gateway. Please try again.",
            variant: "destructive"
          });
          setSubmitting(false);
        }

      } else {
        toast({
          title: "Booking Failed",
          description: responseData.message || responseData.error || "Failed to create booking",
          variant: "destructive"
        });
        setSubmitting(false);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "An error occurred while creating the booking",
        variant: "destructive"
      });
      setSubmitting(false);
    }
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const timeOptions = generateTimeOptions();

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
          <span>Past Date</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
            {day}
          </div>
        ))}
        
        {days.map((date, index) => (
          <div key={index} className="aspect-square">
            {date ? (
              <div
                className={`w-full h-full p-1 text-center text-sm rounded-lg transition-colors ${getDayStatusColor(date)} ${
                  selectedDate === date.toISOString().split('T')[0] ? 'ring-2 ring-pink-500' : ''
                }`}
                onClick={() => handleDateClick(date)}
              >
                {date.getDate()}
              </div>
            ) : (
              <div className="w-full h-full"></div>
            )}
          </div>
        ))}
      </div>

      {/* Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Confirmed - Invoice</DialogTitle>
            <DialogDescription>
              Your booking has been confirmed. Download your invoice below.
            </DialogDescription>
          </DialogHeader>
          {confirmedBooking && (
            <ArtistBookingInvoice booking={confirmedBooking} />
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Form Dialog */}
      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book {artist.name}</DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <>Book for {new Date(selectedDate).toLocaleDateString()}</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div>
              <Label htmlFor="eventName">Event Name *</Label>
              <Input
                id="eventName"
                value={bookingForm.eventName}
                onChange={(e) => setBookingForm(prev => ({ ...prev, eventName: e.target.value }))}
                placeholder="Enter event name"
                required
              />
            </div>

            <div>
              <Label htmlFor="eventLocation">Event Location *</Label>
              <Input
                id="eventLocation"
                value={bookingForm.eventLocation}
                onChange={(e) => setBookingForm(prev => ({ ...prev, eventLocation: e.target.value }))}
                placeholder="Enter event location (address, city, state, pincode)"
                required
              />
            </div>

            <div>
              <Label htmlFor="eventType">Event Type *</Label>
              <Select
                value={bookingForm.eventType}
                onValueChange={(value) => setBookingForm(prev => ({ ...prev, eventType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="private_party">Private Party</SelectItem>
                  <SelectItem value="concert">Concert</SelectItem>
                  <SelectItem value="festival">Festival</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Select
                  value={bookingForm.startTime}
                  onValueChange={(value) => setBookingForm(prev => ({ ...prev, startTime: value }))}
                >
                  <SelectTrigger id="startTime">
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Select
                  value={bookingForm.endTime}
                  onValueChange={(value) => setBookingForm(prev => ({ ...prev, endTime: value }))}
                >
                  <SelectTrigger id="endTime">
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem 
                        key={time.value} 
                        value={time.value}
                        disabled={!!(bookingForm.startTime && time.value <= bookingForm.startTime)}
                      >
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="eventDescription">Event Description</Label>
              <Textarea
                id="eventDescription"
                value={bookingForm.eventDescription}
                onChange={(e) => setBookingForm(prev => ({ ...prev, eventDescription: e.target.value }))}
                placeholder="Describe your event"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="specialRequests">Special Requests</Label>
              <Textarea
                id="specialRequests"
                value={bookingForm.specialRequests}
                onChange={(e) => setBookingForm(prev => ({ ...prev, specialRequests: e.target.value }))}
                placeholder="Any special requirements or requests"
                rows={2}
              />
            </div>

            {/* Pricing Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span>Duration:</span>
                <span>{calculateDuration().toFixed(1)} hours</span>
              </div>
              <div className="flex justify-between items-center font-semibold text-lg border-t pt-2 mt-2">
                <span>Booking Price (Full Day):</span>
                <span className="text-green-600">₹{calculatePrice()}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowBookingForm(false);
                  setSelectedDate(null);
                }}
                className="flex-1"
                disabled={submitting || isVerifying}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!!(submitting || isVerifying || !bookingForm.eventName || !bookingForm.eventLocation || !bookingForm.startTime || !bookingForm.endTime)}
                className="flex-1"
              >
                {isVerifying ? 'Verifying...' : submitting ? 'Processing...' : 'Proceed to Payment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
