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
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Event {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  category: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  createdAt: string;
  organizerInfo?: {
    name: string;
    email: string;
  };
}

interface Organizer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  organizer?: {
    companyName: string;
    description: string;
    contactInfo: {
      email: string;
    };
    address: {
      city: string;
      state: string;
    };
    approvalStatus: string;
  };
}

interface Artist {
  _id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  artist?: {
    bio: string;
    type: string;
    experience: string;
    approvalStatus: string;
  };
}

interface ApprovalListProps {
  type: "Organizer" | "Artist" | "Venue" | "Event";
}

export default function ApprovalList({ type }: ApprovalListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (type === 'Event') {
      fetchPendingEvents();
    } else if (type === 'Organizer') {
      fetchPendingOrganizers();
    } else if (type === 'Artist') {
      fetchPendingArtists();
    }
  }, [type]);

  const fetchPendingEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/events/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending events');
      }

      const data = await response.json();
      setEvents(data.data?.events || []);
    } catch (err) {
      console.error('Error fetching pending events:', err);
      setError('Failed to load pending events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingOrganizers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/approvals?type=organizers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending organizers');
      }

      const data = await response.json();
      setOrganizers(data.data?.organizers || []);
    } catch (err) {
      console.error('Error fetching pending organizers:', err);
      setError('Failed to load pending organizers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingArtists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/approvals?type=artists`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending artists');
      }

      const data = await response.json();
      setArtists(data.data?.artists || []);
    } catch (err) {
      console.error('Error fetching pending artists:', err);
      setError('Failed to load pending artists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId: string) => {
    try {
      setProcessingId(eventId);
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/approvals/event/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve event');
      }

      // Refresh the list
      await fetchPendingEvents();
      toast({
        title: "Success",
        description: "Event approved successfully!",
        variant: "default",
      });
    } catch (err) {
      console.error('Error approving event:', err);
      toast({
        title: "Error",
        description: "Failed to approve event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (eventId: string) => {
    if (!confirm('Are you sure you want to reject this event?')) return;
    
    try {
      setProcessingId(eventId);
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const reason = prompt('Please enter the reason for rejection:');
      if (!reason) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/approvals/event/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: reason
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject event');
      }

      // Refresh the list
      await fetchPendingEvents();
      toast({
        title: "Success",
        description: "Event rejected successfully!",
        variant: "default",
      });
    } catch (err) {
      console.error('Error rejecting event:', err);
      toast({
        title: "Error",
        description: "Failed to reject event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOrganizerApprove = async (organizerId: string) => {
    try {
      setProcessingId(organizerId);
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/approvals/organizer/${organizerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve organizer');
      }

      // Refresh the list
      await fetchPendingOrganizers();
      toast({
        title: "Success",
        description: "Organizer approved successfully!",
        variant: "default",
      });
    } catch (err) {
      console.error('Error approving organizer:', err);
      toast({
        title: "Error",
        description: "Failed to approve organizer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOrganizerReject = async (organizerId: string) => {
    if (!confirm('Are you sure you want to reject this organizer?')) return;
    
    try {
      setProcessingId(organizerId);
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const reason = prompt('Please enter the reason for rejection:');
      if (!reason) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/approvals/organizer/${organizerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'rejected',
          rejectionReason: reason 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject organizer');
      }

      // Refresh the list
      await fetchPendingOrganizers();
      toast({
        title: "Success",
        description: "Organizer rejected successfully!",
        variant: "default",
      });
    } catch (err) {
      console.error('Error rejecting organizer:', err);
      toast({
        title: "Error",
        description: "Failed to reject organizer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleArtistApprove = async (artistId: string) => {
    try {
      setProcessingId(artistId);
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/approvals/artist/${artistId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve artist');
      }

      // Refresh the list
      await fetchPendingArtists();
      toast({
        title: "Success",
        description: "Artist approved successfully!",
        variant: "default",
      });
    } catch (err) {
      console.error('Error approving artist:', err);
      toast({
        title: "Error",
        description: "Failed to approve artist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleArtistReject = async (artistId: string) => {
    if (!confirm('Are you sure you want to reject this artist?')) return;
    
    try {
      setProcessingId(artistId);
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const reason = prompt('Please enter the reason for rejection:');
      if (!reason) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/approvals/artist/${artistId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'rejected',
          rejectionReason: reason 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject artist');
      }

      // Refresh the list
      await fetchPendingArtists();
      toast({
        title: "Success",
        description: "Artist rejected successfully!",
        variant: "default",
      });
    } catch (err) {
      console.error('Error rejecting artist:', err);
      toast({
        title: "Error",
        description: "Failed to reject artist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (type !== 'Event' && type !== 'Organizer' && type !== 'Artist') {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{type} Approvals</CardTitle>
          <CardDescription>
            {type} approval functionality coming soon.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

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
          <Button onClick={fetchPendingEvents} variant="outline">
            Retry
          </Button>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          {type} Approvals ({type === 'Event' ? events.length : type === 'Organizer' ? organizers.length : artists.length})
        </CardTitle>
        <CardDescription>
          Review and approve new {type.toLowerCase()} submissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {type === 'Event' ? (
          events.length > 0 ? (
          events.map((event) => (
            <div
              key={event._id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 shadow-sm"
            >
              <div className="flex-1">
                <h3 className="font-medium">{event.title}</h3>
                <p className="text-sm text-gray-500">{event.organizerInfo?.email || 'No email'}</p>
                <p className="text-sm text-gray-500">{event.location.city}, {event.location.country}</p>
                <p className="text-xs text-gray-400">
                  Submitted on {new Date(event.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4 mr-1" /> View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => handleApprove(event._id)}
                  disabled={!!processingId}
                >
                  {processingId === event._id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleReject(event._id)}
                  disabled={!!processingId}
                >
                  {processingId === event._id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-1" />
                  )}
                  Reject
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">
                No pending event approvals at the moment.
              </p>
            </div>
          )
        ) : type === 'Organizer' ? (
          organizers.length > 0 ? (
            organizers.map((organizer) => (
              <div
                key={organizer._id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 shadow-sm"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{organizer.name}</h3>
                  <p className="text-sm text-gray-500">{organizer.email}</p>
                  <p className="text-sm text-gray-500">{organizer.phone}</p>
                  {organizer.organizer && (
                    <>
                      <p className="text-sm text-gray-600 font-medium">{organizer.organizer.companyName}</p>
                      <p className="text-sm text-gray-500">{organizer.organizer.address.city}, {organizer.organizer.address.state}</p>
                    </>
                  )}
                  <p className="text-xs text-gray-400">
                    Submitted on {new Date(organizer.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => handleOrganizerApprove(organizer._id)}
                    disabled={!!processingId}
                  >
                    {processingId === organizer._id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleOrganizerReject(organizer._id)}
                    disabled={!!processingId}
                  >
                    {processingId === organizer._id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No pending organizer approvals at the moment.
            </p>
          </div>
          )
        ) : (
          // Artist approvals
          artists.length > 0 ? (
            artists.map((artist) => (
              <div
                key={artist._id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 shadow-sm"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{artist.name}</h3>
                  <p className="text-sm text-gray-500">{artist.email}</p>
                  <p className="text-sm text-gray-500">{artist.phone}</p>
                  {artist.artist && (
                    <>
                      <p className="text-sm text-gray-600 font-medium">{artist.artist.bio}</p>
                      <p className="text-sm text-gray-500">{artist.artist.type}</p>
                    </>
                  )}
                  <p className="text-xs text-gray-400">
                    Submitted on {new Date(artist.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => handleArtistApprove(artist._id)}
                    disabled={!!processingId}
                  >
                    {processingId === artist._id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleArtistReject(artist._id)}
                    disabled={!!processingId}
                  >
                    {processingId === artist._id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No pending artist approvals at the moment.
            </p>
          </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
