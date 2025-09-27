
"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon,
  MapPin,
  Phone,
  Mail,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Wifi,
  Car,
  Music,
  Zap,
  Home,
  Snowflake,
  Award,
  Shield,
  Gift,
  Heart
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Navbar from "../../Navbar";
import Footer from "../../Footer";


interface AikoHallData {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  contactPerson: {
    name: string;
    phone: string[];
    email: string;
  };
  venueType: string[];
  venueCategory: string;
  maxCapacity: number;
  minBookingHours: number;
  facilities: {
    inHouseCatering: boolean;
    parking: boolean;
    soundSystem: boolean;
    stage: boolean;
    powerBackup: boolean;
    accommodation: boolean;
    airConditioned: boolean;
  };
  inHouseEventManager: boolean;
  externalVendorsAllowed: boolean;
  marketingWithAhibi: boolean;
  advancePayment: boolean;
  bookingTerms: string;
  notes: string;
}

interface Booking {
  _id: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

// Mock images for the carousel - replace with actual venue images
const venueImages = [
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2098&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
  "https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
  "https://images.unsplash.com/photo-1478146896981-b80fe463b330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
];

export default function AikoHallPage() {
  const [aikoHallData, setAikoHallData] = useState<AikoHallData | null>({
    name: "Aiko Hall",
    address: {
      street: "Near City Center",
      city: "Dimapur",
      state: "Nagaland",
      pincode: "797112"
    },
    contactPerson: {
      name: "Mr. Rajesh Kumar",
      phone: ["+91-9876543210", "+91-8765432109"],
      email: "contact@aikohall.com"
    },
    venueType: ["Banquet", "Wedding", "Corporate"],
    venueCategory: "Premium",
    maxCapacity: 250,
    minBookingHours: 4,
    facilities: {
      inHouseCatering: true,
      parking: true,
      soundSystem: true,
      stage: true,
      powerBackup: true,
      accommodation: false,
      airConditioned: true,
    },
    inHouseEventManager: true,
    externalVendorsAllowed: true,
    marketingWithAhibi: true,
    advancePayment: true,
    bookingTerms: "50% advance payment required",
    notes: "One of the finest venues in Dimapur"
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    customer: {
      name: "",
      phone: "",
      email: ""
    },
    startTime: "",
    endTime: "",
    guestCount: "",
    specialNotes: ""
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % venueImages.length);
    }, 5000);
    
    // Fetch bookings on component mount
    fetchBookings();
    
    return () => clearInterval(interval);
  }, []);

  // Fetch bookings from API
  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/aiko/bookings');
      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  // Helper function to format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % venueImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + venueImages.length) % venueImages.length);
  };

  const facilityIcons = {
    inHouseCatering: Gift,
    parking: Car,
    soundSystem: Music,
    stage: Award,
    powerBackup: Zap,
    accommodation: Home,
    airConditioned: Snowflake,
  };

  const getUnavailableDates = () => {
    const unavailableDates: Date[] = [];
    bookings.forEach(booking => {
      if (booking.status === 'approved' || booking.status === 'pending') {
        unavailableDates.push(new Date(booking.bookingDate));
      }
    });
    return unavailableDates;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate) {
      toast.error('Please select a booking date');
      return;
    }

    if (!bookingForm.startTime || !bookingForm.endTime) {
      toast.error('Please select start and end times');
      return;
    }

    if (parseInt(bookingForm.guestCount) > (aikoHallData?.maxCapacity || 250)) {
      toast.error(`Guest count cannot exceed ${aikoHallData?.maxCapacity || 250}`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/aiko/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bookingForm,
          bookingDate: selectedDate.toISOString().split('T')[0],
          guestCount: parseInt(bookingForm.guestCount)
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Booking request submitted successfully!');
        setBookingForm({
          customer: { name: "", phone: "", email: "" },
          startTime: "",
          endTime: "",
          guestCount: "",
          specialNotes: ""
        });
        setSelectedDate(undefined);
        // Refresh bookings to update availability
        fetchBookings();
      } else {
        toast.error(data.message || 'Failed to submit booking');
      }
    } catch (error) {
      console.error('Error submitting booking:', error);
      toast.error('Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-lg">Loading venue information...</p>
        </div>
      </div>
    );
  }

  if (!aikoHallData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <p className="text-gray-600 text-lg">Failed to load venue information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Hero Section with Image Carousel */}
      <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={venueImages[currentImageIndex]}
            alt="Aiko Hall"
            className="w-full h-full object-cover transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
        </div>
        <Navbar />

        {/* Navigation Buttons */}
        <button
          onClick={prevImage}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={nextImage}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Image Indicators */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {venueImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 drop-shadow-lg">
              {aikoHallData.name}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-6 drop-shadow-md">
              Premium Event & Banquet Hall in Dimapur
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Star className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-white font-medium">4.8 Rating</span>
              </div>
              <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Users className="h-5 w-5 text-white mr-2" />
                <span className="text-white font-medium">Up to {aikoHallData.maxCapacity} Guests</span>
              </div>
              <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Award className="h-5 w-5 text-white mr-2" />
                <span className="text-white font-medium">{aikoHallData.venueCategory} Venue</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-8">
            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Prime Location</h3>
                  <p className="text-sm text-gray-600">{aikoHallData.address.city}, {aikoHallData.address.state}</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Capacity</h3>
                  <p className="text-sm text-gray-600">Up to {aikoHallData.maxCapacity} guests</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Clock className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Min Duration</h3>
                  <p className="text-sm text-gray-600">{aikoHallData.minBookingHours} hours minimum</p>
                </CardContent>
              </Card>
            </div>

            {/* Venue Details */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                  <MapPin className="h-6 w-6 mr-3 text-purple-600" />
                  Venue Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl">
                  <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Address</Label>
                  <p className="text-lg text-gray-800 mt-2">
                    {aikoHallData.address.street}, {aikoHallData.address.city}, {aikoHallData.address.state} - {aikoHallData.address.pincode}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact Person</Label>
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                        <p className="text-lg font-medium text-gray-800">{aikoHallData.contactPerson.name}</p>
                        <div className="space-y-2 mt-3">
                          {aikoHallData.contactPerson.phone.map((phone, index) => (
                            <div key={index} className="flex items-center text-gray-600">
                              <Phone className="h-4 w-4 mr-2 text-green-600" />
                              <span>{phone}</span>
                            </div>
                          ))}
                          <div className="flex items-center text-gray-600">
                            <Mail className="h-4 w-4 mr-2 text-blue-600" />
                            <span>{aikoHallData.contactPerson.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Venue Types</Label>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {aikoHallData.venueType.map((type, index) => (
                          <Badge key={index} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 text-sm">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                        <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Max Capacity</Label>
                        <p className="text-xl font-bold text-gray-800">{aikoHallData.maxCapacity}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <Clock className="h-8 w-8 mx-auto text-green-600 mb-2" />
                        <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Min Hours</Label>
                        <p className="text-xl font-bold text-gray-800">{aikoHallData.minBookingHours}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Facilities */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                  <Shield className="h-6 w-6 mr-3 text-green-600" />
                  Facilities & Amenities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(aikoHallData.facilities).map(([key, value]) => {
                    const IconComponent = facilityIcons[key as keyof typeof facilityIcons];
                    return (
                      <div key={key} className={`p-4 rounded-xl transition-all duration-200 ${value ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200' : 'bg-gray-50 opacity-60'
                        }`}>
                        <div className="flex items-center space-x-3">
                          {value ? (
                            <div className="p-2 bg-green-500 rounded-lg">
                              <IconComponent className="h-5 w-5 text-white" />
                            </div>
                          ) : (
                            <div className="p-2 bg-gray-400 rounded-lg">
                              <XCircle className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <div>
                            <span className={`font-medium ${value ? 'text-gray-800' : 'text-gray-500'}`}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            {value && <CheckCircle className="h-4 w-4 text-green-500 inline ml-2" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Additional Services */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                  <Heart className="h-6 w-6 mr-3 text-red-600" />
                  Additional Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {[
                      { label: 'In-house Event Manager', value: aikoHallData.inHouseEventManager, icon: Award },
                      { label: 'External Vendors Allowed', value: aikoHallData.externalVendorsAllowed, icon: Users },
                      { label: 'Marketing with Ahibi', value: aikoHallData.marketingWithAhibi, icon: Gift },
                      { label: 'Advance Payment Required', value: aikoHallData.advancePayment, icon: Shield }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <item.icon className="h-5 w-5 text-purple-600" />
                          <span className="font-medium text-gray-800">{item.label}</span>
                        </div>
                        <Badge className={item.value ? 'bg-green-500' : 'bg-gray-400'}>
                          {item.value ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {aikoHallData.bookingTerms !== 'nil' && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <Label className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Booking Terms</Label>
                        <p className="text-gray-700 mt-2">{aikoHallData.bookingTerms}</p>
                      </div>
                    )}

                    {aikoHallData.notes !== 'nil' && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <Label className="text-sm font-semibold text-purple-800 uppercase tracking-wide">Special Notes</Label>
                        <p className="text-gray-700 mt-2">{aikoHallData.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Sidebar */}
          <div className="space-y-6">
            {/* Calendar */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl  top-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Check Availability
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Select an available date for your booking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const unavailableDates = getUnavailableDates();
                      return unavailableDates.some(unavailableDate =>
                        date.toDateString() === unavailableDate.toDateString()
                      ) || date < new Date();
                    }}
                    className="rounded-md"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">Unavailable</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Available</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Form */}
            {selectedDate && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800">Book Aiko Hall</CardTitle>
                  <CardDescription className="text-purple-600 font-medium">
                    Selected Date: {format(selectedDate, 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <div className="space-y-4">
                      {/* Customer Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Full Name *</Label>
                          <Input
                            id="name"
                            value={bookingForm.customer.name}
                            onChange={(e) => setBookingForm({
                              ...bookingForm,
                              customer: { ...bookingForm.customer, name: e.target.value }
                            })}
                            className="mt-2 border-2 border-gray-200 focus:border-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={bookingForm.customer.phone}
                            onChange={(e) => setBookingForm({
                              ...bookingForm,
                              customer: { ...bookingForm.customer, phone: e.target.value }
                            })}
                            className="mt-2 border-2 border-gray-200 focus:border-purple-500"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={bookingForm.customer.email}
                          onChange={(e) => setBookingForm({
                            ...bookingForm,
                            customer: { ...bookingForm.customer, email: e.target.value }
                          })}
                          className="mt-2 border-2 border-gray-200 focus:border-purple-500"
                          required
                        />
                      </div>

                      {/* Time Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startTime" className="text-sm font-semibold text-gray-700">Start Time *</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={bookingForm.startTime}
                            onChange={(e) => setBookingForm({
                              ...bookingForm,
                              startTime: e.target.value
                            })}
                            className="mt-2 border-2 border-gray-200 focus:border-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="endTime" className="text-sm font-semibold text-gray-700">End Time *</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={bookingForm.endTime}
                            onChange={(e) => setBookingForm({
                              ...bookingForm,
                              endTime: e.target.value
                            })}
                            className="mt-2 border-2 border-gray-200 focus:border-purple-500"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="guestCount" className="text-sm font-semibold text-gray-700">Number of Guests *</Label>
                        <Input
                          id="guestCount"
                          type="number"
                          min="1"
                          max={aikoHallData.maxCapacity}
                          value={bookingForm.guestCount}
                          onChange={(e) => setBookingForm({
                            ...bookingForm,
                            guestCount: e.target.value
                          })}
                          className="mt-2 border-2 border-gray-200 focus:border-purple-500"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Maximum: {aikoHallData.maxCapacity} guests
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="specialNotes" className="text-sm font-semibold text-gray-700">Special Notes (Optional)</Label>
                        <Textarea
                          id="specialNotes"
                          value={bookingForm.specialNotes}
                          onChange={(e) => setBookingForm({
                            ...bookingForm,
                            specialNotes: e.target.value
                          })}
                          rows={3}
                          className="mt-2 border-2 border-gray-200 focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </div>
                      ) : (
                        'Submit Booking Request'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {!selectedDate && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="pt-8 pb-8">
                  <div className="text-center text-gray-500">
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-8 rounded-2xl">
                      <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-purple-400" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Date</h3>
                      <p className="text-gray-600">Choose an available date from the calendar above to start your booking process</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Card */}
            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Need Help?</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-3" />
                    <span className="text-sm">{aikoHallData.contactPerson.phone[0]}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 mr-3" />
                    <span className="text-sm">{aikoHallData.contactPerson.email}</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-white text-purple-600 hover:bg-gray-100 font-semibold">
                  Contact Us
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>


      <Footer />
    </div>
  );
}