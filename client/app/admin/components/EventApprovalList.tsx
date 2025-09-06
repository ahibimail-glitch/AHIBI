"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Eye, Loader2, ChevronDown, ChevronUp, Calendar, MapPin, Mail, Phone, Users, Clock, Tag } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  createdAt: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  ticketTypes?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  maxAttendees?: number;
  images?: string[];
  organizer?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    companyName?: string;
  };
  venue?: {
    _id: string;
    name: string;
    address?: any;
  };
  rejectionReason?: string;
}

export default function EventApprovalList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setError('Admin authentication required');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setEvents(response.data.data.events || []);
      } else {
        setError(response.data.message || 'Failed to fetch events');
      }
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.response?.data?.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const token = localStorage.getItem('admin_token');
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${id}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Event approved successfully",
        });
        fetchEvents();
      } else {
        throw new Error(response.data.message || 'Approval failed');
      }
    } catch (err: any) {
      console.error('Error approving event:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to approve event',
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) return;

    try {
      setProcessingId(id);
      const token = localStorage.getItem('admin_token');
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${id}/reject`,
        { rejectionReason: reason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Event rejected successfully",
        });
        fetchEvents();
      } else {
        throw new Error(response.data.message || 'Rejection failed');
      }
    } catch (err: any) {
      console.error('Error rejecting event:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to reject event',
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
          <Button onClick={fetchEvents} variant="outline">
            Retry
          </Button>
        </CardHeader>
      </Card>
    );
  }

  const renderEventRow = (event: Event) => {
    const isExpanded = expandedItems.has(event._id);

    return (
      <div key={event._id} className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpanded(event._id)}>
          <div className="flex-1 flex items-center space-x-4">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                {event.title}
              </h3>
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <Tag className="h-3 w-3 mr-1" />
                {event.category}
              </p>
              <p className="text-sm text-gray-500 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'No start date'} - {event.endDate ? new Date(event.endDate).toLocaleDateString() : 'No end date'}
              </p>
              {event.organizer && (
                <p className="text-sm text-gray-500 flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  {event.organizer.name || 'Unknown'} ({event.organizer.email || 'No email'})
                </p>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <span className={`text-xs font-medium py-1 px-2 rounded ${
                  event.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
                  event.status === 'approved' ? 'bg-green-100 text-green-600' : 
                  'bg-red-100 text-red-600'
                }`}>
                  {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(event.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {event.status === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); handleApprove(event._id); }}
                  disabled={!!processingId}
                >
                  {processingId === event._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); handleReject(event._id); }}
                  disabled={!!processingId}
                >
                  {processingId === event._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Reject
                </Button>
              </>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); toggleExpanded(event._id); }}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {isExpanded ? 'Hide' : 'View'} Details
            </Button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-600 mt-1">{event.description || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Event Dates
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    Start: {event.startDate ? new Date(event.startDate).toLocaleString() : 'Not specified'}<br/>
                    End: {event.endDate ? new Date(event.endDate).toLocaleString() : 'Not specified'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Location
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    {event.location ? 
                      [event.location.address, event.location.city, event.location.state, event.location.country]
                        .filter(Boolean)
                        .join(', ') || 'Not provided'
                      : 'Not provided'
                    }
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    Max Attendees
                  </label>
                  <p className="text-sm text-gray-600 mt-1">{event.maxAttendees || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Ticket Types</label>
                  <div className="text-sm text-gray-600 mt-1">
                    {event.ticketTypes && event.ticketTypes.length > 0 ? (
                      <div className="space-y-1">
                        {event.ticketTypes.map((ticket, index) => (
                          <div key={index} className="flex justify-between items-center bg-white p-2 rounded border">
                            <span>{ticket.name}</span>
                            <span>₹{ticket.price} ({ticket.quantity} available)</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No ticket types defined</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Organizer Details</label>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {event.organizer ? (
                      <>
                        <p><strong>Name:</strong> {event.organizer.name}</p>
                        <p><strong>Email:</strong> {event.organizer.email}</p>
                        {event.organizer.phone && <p><strong>Phone:</strong> {event.organizer.phone}</p>}
                        {event.organizer.companyName && <p><strong>Company:</strong> {event.organizer.companyName}</p>}
                      </>
                    ) : (
                      <p>Organizer information not available</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Venue Details</label>
                  <div className="text-sm text-gray-600 mt-1">
                    {event.venue ? (
                      <>
                        <p><strong>Name:</strong> {event.venue.name}</p>
                        {event.venue.address && <p><strong>Address:</strong> {JSON.stringify(event.venue.address)}</p>}
                      </>
                    ) : (
                      <p>Venue information not available</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Event Images</label>
                  <div className="text-sm text-gray-600 mt-1">
                    {event.images && event.images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {event.images.map((image, index) => (
                          <img 
                            key={index} 
                            src={image} 
                            alt={`Event ${index + 1}`} 
                            className="w-full h-20 object-cover rounded border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <p>No images provided</p>
                    )}
                  </div>
                </div>
                
                {event.rejectionReason && (
                  <div>
                    <label className="text-sm font-medium text-red-700">Rejection Reason</label>
                    <p className="text-sm text-red-600 mt-1">{event.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (items: Event[], sectionTitle: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          {sectionTitle}
          <span className="ml-2 text-sm font-normal text-gray-500">({items.length})</span>
        </h3>
        <div className="space-y-2">
          {items.map(event => renderEventRow(event))}
        </div>
      </div>
    );
  };

  const pendingEvents = events.filter(event => event.status === 'pending');
  const approvedEvents = events.filter(event => event.status === 'approved');
  const rejectedEvents = events.filter(event => event.status === 'rejected');

  if (events.length === 0) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Event Management</CardTitle>
          <CardDescription>No events found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Event Management
        </CardTitle>
        <CardDescription>Review and manage all event submissions organized by status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderSection(pendingEvents, 'Pending Events')}
        {renderSection(approvedEvents, 'Approved Events')}
        {renderSection(rejectedEvents, 'Rejected Events')}
      </CardContent>
    </Card>
  );
}
