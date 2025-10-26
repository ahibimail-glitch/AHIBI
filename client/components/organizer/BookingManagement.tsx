"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, Star, User, Phone, Mail, MessageCircle, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Booking {
  _id: string;
  artist: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    profilePic?: string;
    rating?: {
      average: number;
      count: number;
    };
    city: string;
  };
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
    };
    eventType: string;
    expectedAudience: number;
  };
  booking: {
    status: string;
    requestedAmount: number;
    finalAmount?: number;
  };
  communication: {
    messages: Array<{
      sender: string;
      message: string;
      timestamp: string;
    }>;
    counterOffer?: {
      amount: number;
      message: string;
      timestamp: string;
    };
  };
  timeline: Array<{
    action: string;
    timestamp: string;
    performedBy: string;
    details: string;
  }>;
  createdAt: string;
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('organizer_token');
      const queryParams = statusFilter ? `?status=${statusFilter}` : '';
      
      const response = await fetch(`/api/organizer/bookings${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptCounterOffer = async (bookingId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('organizer_token');
      
      const response = await fetch(`/api/organizer/bookings/${bookingId}/accept-counter-offer`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchBookings();
        if (selectedBooking?._id === bookingId) {
          const updatedBooking = await response.json();
          setSelectedBooking(updatedBooking.data.booking);
        }
      }
    } catch (error) {
      console.error('Error accepting counter offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const rejectCounterOffer = async (bookingId: string, reason: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('organizer_token');
      
      const response = await fetch(`/api/organizer/bookings/${bookingId}/reject-counter-offer`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        fetchBookings();
        if (selectedBooking?._id === bookingId) {
          const updatedBooking = await response.json();
          setSelectedBooking(updatedBooking.data.booking);
        }
      }
    } catch (error) {
      console.error('Error rejecting counter offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string, reason: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('organizer_token');
      
      const response = await fetch(`/api/organizer/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        fetchBookings();
        setShowCancelDialog(false);
        setCancelReason('');
        if (selectedBooking?._id === bookingId) {
          const updatedBooking = await response.json();
          setSelectedBooking(updatedBooking.data.booking);
        }
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (bookingId: string, message: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('organizer_token');
      
      const response = await fetch(`/api/organizer/bookings/${bookingId}/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        setNewMessage('');
        setShowMessageDialog(false);
        // Refresh booking details
        if (selectedBooking?._id === bookingId) {
          fetchBookingDetails(bookingId);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingDetails = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('organizer_token');
      const response = await fetch(`/api/organizer/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedBooking(data.data.booking);
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'counter_offered': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'declined': return <XCircle className="h-4 w-4" />;
      case 'counter_offered': return <AlertCircle className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Booking Management</h2>
        <div className="flex items-center space-x-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="counter_offered">Counter Offered</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchBookings} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card 
                    key={booking._id} 
                    className={`cursor-pointer transition-colors ${selectedBooking?._id === booking._id ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start space-x-3">
                          <Avatar>
                            <AvatarImage src={booking.artist.profilePic} />
                            <AvatarFallback>{booking.artist.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{booking.event.name}</h3>
                            <p className="text-sm text-gray-600">with {booking.artist.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {new Date(booking.event.date).toLocaleDateString()}
                              </span>
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {booking.event.startTime} - {booking.event.endTime}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(booking.booking.status)}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(booking.booking.status)}
                            <span>{booking.booking.status.replace('_', ' ').toUpperCase()}</span>
                          </span>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{booking.event.venue.name}</span>
                        </div>
                        <span className="font-medium text-green-600">
                          ₹{booking.booking.finalAmount || booking.booking.requestedAmount}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No bookings found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Details */}
        {selectedBooking && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Booking Details</span>
                <div className="flex items-center space-x-2">
                  <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send Message</DialogTitle>
                        <DialogDescription>
                          Send a message to {selectedBooking.artist.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => sendMessage(selectedBooking._id, newMessage)}
                            disabled={!newMessage.trim() || loading}
                          >
                            Send Message
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {['pending', 'accepted', 'confirmed'].includes(selectedBooking.booking.status) && (
                    <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Cancel Booking
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cancel Booking</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to cancel this booking? Please provide a reason.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Reason for cancellation..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                              Keep Booking
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={() => cancelBooking(selectedBooking._id, cancelReason)}
                              disabled={!cancelReason.trim() || loading}
                            >
                              Cancel Booking
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="messages">Messages</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  {/* Artist Info */}
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedBooking.artist.profilePic} />
                      <AvatarFallback>{selectedBooking.artist.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedBooking.artist.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {selectedBooking.artist.phone}
                        </span>
                        <span className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {selectedBooking.artist.email}
                        </span>
                      </div>
                      {selectedBooking.artist.rating && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs">{selectedBooking.artist.rating.average} ({selectedBooking.artist.rating.count})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Event Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Event Name:</span>
                        <p className="font-medium">{selectedBooking.event.name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Event Type:</span>
                        <p className="font-medium">{selectedBooking.event.eventType.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <p className="font-medium">{new Date(selectedBooking.event.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Time:</span>
                        <p className="font-medium">{selectedBooking.event.startTime} - {selectedBooking.event.endTime}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Venue:</span>
                        <p className="font-medium">{selectedBooking.event.venue.name}</p>
                        <p className="text-sm text-gray-600">{selectedBooking.event.venue.address}</p>
                      </div>
                      {selectedBooking.event.expectedAudience > 0 && (
                        <div>
                          <span className="text-gray-500">Expected Audience:</span>
                          <p className="font-medium">{selectedBooking.event.expectedAudience}</p>
                        </div>
                      )}
                    </div>
                    {selectedBooking.event.description && (
                      <div>
                        <span className="text-gray-500">Description:</span>
                        <p className="text-sm mt-1">{selectedBooking.event.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Booking Status and Actions */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Booking Status</h4>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <Badge className={getStatusColor(selectedBooking.booking.status)}>
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(selectedBooking.booking.status)}
                          <span>{selectedBooking.booking.status.replace('_', ' ').toUpperCase()}</span>
                        </span>
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="font-semibold text-green-600">
                          ₹{selectedBooking.booking.finalAmount || selectedBooking.booking.requestedAmount}
                        </p>
                      </div>
                    </div>

                    {/* Counter Offer Actions */}
                    {selectedBooking.booking.status === 'counter_offered' && selectedBooking.communication.counterOffer && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p><strong>Counter Offer:</strong> ₹{selectedBooking.communication.counterOffer.amount}</p>
                            {selectedBooking.communication.counterOffer.message && (
                              <p><strong>Message:</strong> {selectedBooking.communication.counterOffer.message}</p>
                            )}
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                onClick={() => acceptCounterOffer(selectedBooking._id)}
                                disabled={loading}
                              >
                                Accept Counter Offer
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const reason = prompt('Reason for rejecting counter offer:');
                                  if (reason) rejectCounterOffer(selectedBooking._id, reason);
                                }}
                                disabled={loading}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="messages" className="space-y-4">
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {selectedBooking.communication.messages.map((message, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg ${
                          message.sender === 'organizer' 
                            ? 'bg-blue-100 ml-8' 
                            : 'bg-gray-100 mr-8'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {message.sender === 'organizer' ? 'You' : selectedBooking.artist.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{message.message}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4">
                  <div className="space-y-3">
                    {selectedBooking.timeline.map((entry, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 border-l-2 border-gray-200">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{entry.action}</p>
                          <p className="text-xs text-gray-500">{entry.details}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(entry.timestamp).toLocaleString()} by {entry.performedBy}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
