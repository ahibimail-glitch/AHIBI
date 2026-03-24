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
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Loader2, Calendar, Clock, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface DailyEvent {
  _id: string;
  title: string;
  description: string;
  startDate: string; // periodStartDate
  endDate: string; // periodEndDate
  category: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  createdAt: string;
  banner?: string;
  ticketTypes?: Array<{
    name: string;
    description?: string;
    price: number;
    quantity: number;
    sold: number;
    capacity: number;
    benefits?: string[];
  }>;
  totalTickets?: number;
  ticketsSold?: number;
  organizerInfo: {
    name: string;
    email: string;
    phone: string;
    companyName: string;
  };
  isDailyEvent: boolean;
  startTime: string;
  duration: {
    hours: number;
    minutes: number;
  };
  activeDates: string[];
  excludedDates: string[];
}

export default function DailyEvents() {
  const [dailyEvents, setDailyEvents] = useState<DailyEvent[]>([]);
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

  const fetchDailyEvents = async () => {
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/approvals`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        const data = response.data.data;
        setDailyEvents(data.dailyEvents || []);
      } else {
        setError(response.data.message || 'Failed to fetch daily events');
      }
    } catch (err: any) {
      console.error('Error fetching daily events:', err);
      setError(err.response?.data?.message || 'Failed to fetch daily events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyEvents();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const token = localStorage.getItem('admin_token');
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/daily-events/${id}/approve`,
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
          description: "Daily event approved successfully",
        });
        fetchDailyEvents(); // Refresh data
      } else {
        throw new Error(response.data.message || 'Approval failed');
      }
    } catch (err: any) {
      console.error('Error approving daily event:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to approve daily event',
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const rejectionReason = prompt('Please provide a reason for rejection:');
    if (!rejectionReason) return;

    try {
      setProcessingId(id);
      const token = localStorage.getItem('admin_token');
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/daily-events/${id}/reject`,
        { rejectionReason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Daily event rejected successfully",
        });
        fetchDailyEvents(); // Refresh data
      } else {
        throw new Error(response.data.message || 'Rejection failed');
      }
    } catch (err: any) {
      console.error('Error rejecting daily event:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to reject daily event',
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pending", variant: "secondary" },
      approved: { label: "Approved", variant: "default" },
      rejected: { label: "Rejected", variant: "destructive" },
      cancelled: { label: "Cancelled", variant: "outline" },
      completed: { label: "Completed", variant: "default" },
    };
    
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchDailyEvents}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Events</h2>
          <p className="text-gray-600">Review and approve daily event submissions</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {dailyEvents.length} pending
        </Badge>
      </div>

      {dailyEvents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending daily events</h3>
            <p className="text-gray-600">All daily events have been reviewed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dailyEvents.map((event) => (
            <Card key={event._id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Daily Event
                      </Badge>
                      {getStatusBadge(event.status)}
                    </div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {event.category} • {event.location.city}, {event.location.state}
                    </CardDescription>
                  </div>
                  {event.banner && (
                    <img
                      src={event.banner}
                      alt={event.title}
                      className="w-20 h-20 object-cover rounded-lg ml-4"
                    />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700 line-clamp-2">
                  {event.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Period</p>
                      <p className="text-gray-600">
                        {format(new Date(event.startDate), "MMM dd")} - {format(new Date(event.endDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-gray-600">
                        {event.startTime} ({event.duration.hours}h {event.duration.minutes}m)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Active Dates</p>
                      <p className="text-gray-600">
                        {event.activeDates?.length || 0} dates
                        {event.excludedDates?.length > 0 && ` (${event.excludedDates.length} excluded)`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-1">Organizer</p>
                  <p className="text-sm text-gray-600">{event.organizerInfo.name}</p>
                  <p className="text-xs text-gray-500">{event.organizerInfo.email}</p>
                  <p className="text-xs text-gray-500">{event.organizerInfo.companyName}</p>
                </div>

                {expandedItems.has(event._id) && (
                  <div className="space-y-3 pt-3 border-t">
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Full Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.description}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Venue</p>
                      <p className="text-sm text-gray-700">{event.location.address}</p>
                      <p className="text-xs text-gray-500">
                        {event.location.city}, {event.location.state}, {event.location.country}
                      </p>
                    </div>

                    {event.ticketTypes && event.ticketTypes.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Ticket Types</p>
                        <div className="space-y-1">
                          {event.ticketTypes.map((ticket, index) => (
                            <div key={index} className="text-sm bg-white p-2 rounded border">
                              <div className="flex justify-between">
                                <span className="font-medium">{ticket.name}</span>
                                <span>₹{ticket.price}</span>
                              </div>
                              <p className="text-xs text-gray-500">{ticket.description}</p>
                              <p className="text-xs text-gray-500">
                                {ticket.sold || 0} sold / {ticket.quantity} available
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpanded(event._id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {expandedItems.has(event._id) ? "Show Less" : "Show More"}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReject(event._id)}
                      disabled={processingId === event._id}
                    >
                      {processingId === event._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(event._id)}
                      disabled={processingId === event._id}
                    >
                      {processingId === event._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
