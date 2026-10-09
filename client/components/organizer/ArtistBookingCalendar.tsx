"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, Star, User, Phone, Mail, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Artist {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  genres: string[];
  type: string;
  basePrice: number;
  profilePic?: string;
  rating?: {
    average: number;
    count: number;
  };
  totalBookings?: number;
  calculatedPrice?: number;
  availabilityId?: string;
  dayStatus?: string;
  minimumBookingDuration?: number;
  maximumBookingDuration?: number;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  calculatedPrice: number;
  note?: string;
}

interface CalendarData {
  [dateKey: string]: {
    dayStatus: string;
    availableSlots: TimeSlot[];
    isSpecialDay: boolean;
    specialReason?: string;
    minimumBookingDuration: number;
    maximumBookingDuration: number;
    advanceBookingDays: number;
  };
}

interface BookingFormData {
  artistId: string;
  event: {
    name: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: {
      name: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
    };
    eventType: string;
    expectedAudience: number;
  };
  requestedAmount: number;
  organizerRequirements: string;
  specialRequirements: string;
}

export default function ArtistBookingCalendar() {
  const [searchFilters, setSearchFilters] = useState({
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    genre: '',
    type: '',
    minPrice: '',
    maxPrice: ''
  });
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [artistCalendar, setArtistCalendar] = useState<CalendarData>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    artistId: '',
    event: {
      name: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      venue: {
        name: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
      },
      eventType: 'private_party',
      expectedAudience: 0
    },
    requestedAmount: 0,
    organizerRequirements: '',
    specialRequirements: ''
  });

  const searchArtists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('organizer_token');
      const queryParams = new URLSearchParams();
      
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/organizer/artists/search?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setArtists(data.data.artists);
      }
    } catch (error) {
      console.error('Error searching artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtistCalendar = async (artistId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('organizer_token');
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const response = await fetch(`/api/organizer/artists/${artistId}/calendar?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setArtistCalendar(data.data.calendarData);
      }
    } catch (error) {
      console.error('Error fetching artist calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBookingRequest = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('organizer_token');

      const response = await fetch('/api/organizer/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingForm)
      });

      if (response.ok) {
        const data = await response.json();
        setShowBookingDialog(false);
        // Reset form
        setBookingForm({
          artistId: '',
          event: {
            name: '',
            description: '',
            date: '',
            startTime: '',
            endTime: '',
            venue: {
              name: '',
              address: '',
              city: '',
              state: '',
              pincode: ''
            },
            eventType: 'private_party',
            expectedAudience: 0
          },
          requestedAmount: 0,
          organizerRequirements: '',
          specialRequirements: ''
        });
        alert('Booking request sent successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Error creating booking request');
      }
    } catch (error) {
      console.error('Error creating booking request:', error);
      alert('Error creating booking request');
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dateKey = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === month;
      const isToday = current.toDateString() === new Date().toDateString();
      const dayData = artistCalendar[dateKey];

      days.push({
        date: new Date(current),
        dateKey,
        isCurrentMonth,
        isToday,
        data: dayData
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getDayStatusColor = (status?: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'partially_booked': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'fully_booked': return 'bg-red-100 text-red-800 border-red-200';
      case 'unavailable': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    if (selectedArtist) {
      fetchArtistCalendar(selectedArtist._id);
    }
  };

  const handleBookSlot = (artist: Artist, date: string, slot: TimeSlot) => {
    setBookingForm(prev => ({
      ...prev,
      artistId: artist._id,
      event: {
        ...prev.event,
        date: date,
        startTime: slot.startTime,
        endTime: slot.endTime
      },
      requestedAmount: slot.calculatedPrice
    }));
    setShowBookingDialog(true);
  };

  const calendarDays = selectedArtist ? generateCalendarDays() : [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Find Artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="date">Event Date</Label>
              <Input
                id="date"
                type="date"
                value={searchFilters.date}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={searchFilters.startTime}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={searchFilters.endTime}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="City"
                value={searchFilters.location}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="genre">Genre</Label>
              <Input
                id="genre"
                placeholder="e.g., Classical, Rock"
                value={searchFilters.genre}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, genre: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="type">Artist Type</Label>
              <Select value={searchFilters.type} onValueChange={(value) => setSearchFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="musician">Musician</SelectItem>
                  <SelectItem value="singer">Singer</SelectItem>
                  <SelectItem value="dj">DJ</SelectItem>
                  <SelectItem value="band">Band</SelectItem>
                  <SelectItem value="comedian">Comedian</SelectItem>
                  <SelectItem value="dancer">Dancer</SelectItem>
                  <SelectItem value="sessionist">Sessionist</SelectItem>
                  <SelectItem value="songwriter">Songwriter</SelectItem>
                  <SelectItem value="magician">Magician</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="minPrice">Min Price</Label>
              <Input
                id="minPrice"
                type="number"
                placeholder="₹"
                value={searchFilters.minPrice}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, minPrice: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="maxPrice">Max Price</Label>
              <Input
                id="maxPrice"
                type="number"
                placeholder="₹"
                value={searchFilters.maxPrice}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={searchArtists} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            {loading ? 'Searching...' : 'Search Artists'}
          </Button>
        </CardContent>
      </Card>

      {/* Artist Results */}
      {artists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Artists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {artists.map((artist) => (
                <Card key={artist._id} className={`cursor-pointer transition-colors ${selectedArtist?._id === artist._id ? 'ring-2 ring-blue-500' : ''}`}>
                  <CardContent className="p-4" onClick={() => {
                    setSelectedArtist(artist);
                    fetchArtistCalendar(artist._id);
                  }}>
                    <div className="flex items-start space-x-3">
                      <Avatar>
                        <AvatarImage src={artist.profilePic} />
                        <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{artist.name}</h3>
                        <p className="text-sm text-gray-600">{artist.type}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{artist.city}</span>
                        </div>
                        {artist.rating && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-xs">{artist.rating.average} ({artist.rating.count})</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {artist.genres.slice(0, 2).map((genre) => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-2">
                          <span className="font-medium text-green-600">
                            ₹{artist.calculatedPrice || artist.basePrice}
                          </span>
                          {artist.calculatedPrice && artist.calculatedPrice !== artist.basePrice && (
                            <span className="text-xs text-gray-500 ml-1">
                              (Base: ₹{artist.basePrice})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Artist Calendar */}
      {selectedArtist && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                <Calendar className="h-5 w-5 inline mr-2" />
                {selectedArtist.name}'s Availability
              </span>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => navigateMonth('prev')}>
                  ←
                </Button>
                <span className="text-sm font-medium">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
                <Button variant="outline" onClick={() => navigateMonth('next')}>
                  →
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, dateKey, isCurrentMonth, isToday, data }) => (
                <div
                  key={dateKey}
                  className={`
                    min-h-[80px] p-2 border rounded cursor-pointer transition-colors
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                    ${selectedDate === dateKey ? 'bg-blue-50' : ''}
                    ${data ? getDayStatusColor(data.dayStatus) : ''}
                    hover:bg-gray-100
                  `}
                  onClick={() => setSelectedDate(selectedDate === dateKey ? '' : dateKey)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {date.getDate()}
                    </span>
                    {data && (
                      <Badge variant="secondary" className="text-xs">
                        {data.availableSlots.length}
                      </Badge>
                    )}
                  </div>
                  
                  {data && (
                    <div className="space-y-1">
                      {data.isSpecialDay && (
                        <div className="text-xs text-orange-600 font-medium">
                          Special
                        </div>
                      )}
                      <div className="text-xs text-gray-600">
                        {data.availableSlots.length} slots
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Date Time Slots */}
      {selectedDate && artistCalendar[selectedDate] && (
        <Card>
          <CardHeader>
            <CardTitle>
              Available Time Slots - {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {artistCalendar[selectedDate].availableSlots.length > 0 ? (
              <div className="space-y-3">
                {artistCalendar[selectedDate].availableSlots.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        {slot.note && (
                          <div className="text-sm text-gray-500">{slot.note}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="font-medium">
                        ₹{slot.calculatedPrice}
                      </Badge>
                    </div>
                    <Button onClick={() => handleBookSlot(selectedArtist!, selectedDate, slot)}>
                      Book This Slot
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No available time slots for this date.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Booking Request</DialogTitle>
            <DialogDescription>
              Fill in the event details to send a booking request to {selectedArtist?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventName">Event Name</Label>
                <Input
                  id="eventName"
                  value={bookingForm.event.name}
                  onChange={(e) => setBookingForm(prev => ({
                    ...prev,
                    event: { ...prev.event, name: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Select 
                  value={bookingForm.event.eventType} 
                  onValueChange={(value) => setBookingForm(prev => ({
                    ...prev,
                    event: { ...prev.event, eventType: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
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
            </div>

            <div>
              <Label htmlFor="eventDescription">Event Description</Label>
              <Textarea
                id="eventDescription"
                value={bookingForm.event.description}
                onChange={(e) => setBookingForm(prev => ({
                  ...prev,
                  event: { ...prev.event, description: e.target.value }
                }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venueName">Venue Name</Label>
                <Input
                  id="venueName"
                  value={bookingForm.event.venue.name}
                  onChange={(e) => setBookingForm(prev => ({
                    ...prev,
                    event: { 
                      ...prev.event, 
                      venue: { ...prev.event.venue, name: e.target.value }
                    }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="expectedAudience">Expected Audience</Label>
                <Input
                  id="expectedAudience"
                  type="number"
                  value={bookingForm.event.expectedAudience}
                  onChange={(e) => setBookingForm(prev => ({
                    ...prev,
                    event: { ...prev.event, expectedAudience: parseInt(e.target.value) || 0 }
                  }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="venueAddress">Venue Address</Label>
              <Textarea
                id="venueAddress"
                value={bookingForm.event.venue.address}
                onChange={(e) => setBookingForm(prev => ({
                  ...prev,
                  event: { 
                    ...prev.event, 
                    venue: { ...prev.event.venue, address: e.target.value }
                  }
                }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="venueCity">City</Label>
                <Input
                  id="venueCity"
                  value={bookingForm.event.venue.city}
                  onChange={(e) => setBookingForm(prev => ({
                    ...prev,
                    event: { 
                      ...prev.event, 
                      venue: { ...prev.event.venue, city: e.target.value }
                    }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="venueState">State</Label>
                <Input
                  id="venueState"
                  value={bookingForm.event.venue.state}
                  onChange={(e) => setBookingForm(prev => ({
                    ...prev,
                    event: { 
                      ...prev.event, 
                      venue: { ...prev.event.venue, state: e.target.value }
                    }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="venuePincode">Pincode</Label>
                <Input
                  id="venuePincode"
                  value={bookingForm.event.venue.pincode}
                  onChange={(e) => setBookingForm(prev => ({
                    ...prev,
                    event: { 
                      ...prev.event, 
                      venue: { ...prev.event.venue, pincode: e.target.value }
                    }
                  }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="requestedAmount">Offered Amount (₹)</Label>
              <Input
                id="requestedAmount"
                type="number"
                value={bookingForm.requestedAmount}
                onChange={(e) => setBookingForm(prev => ({
                  ...prev,
                  requestedAmount: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div>
              <Label htmlFor="organizerRequirements">Your Requirements</Label>
              <Textarea
                id="organizerRequirements"
                placeholder="Any specific requirements or expectations..."
                value={bookingForm.organizerRequirements}
                onChange={(e) => setBookingForm(prev => ({
                  ...prev,
                  organizerRequirements: e.target.value
                }))}
              />
            </div>

            <div>
              <Label htmlFor="specialRequirements">Special Requirements</Label>
              <Textarea
                id="specialRequirements"
                placeholder="Equipment, setup, or other special needs..."
                value={bookingForm.specialRequirements}
                onChange={(e) => setBookingForm(prev => ({
                  ...prev,
                  specialRequirements: e.target.value
                }))}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createBookingRequest} disabled={loading}>
                {loading ? 'Sending...' : 'Send Booking Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
