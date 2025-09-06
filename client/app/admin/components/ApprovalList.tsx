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
import { CheckCircle, XCircle, Eye, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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
  companyName: string;
  approvalStatus: string;
  createdAt: string;
}

interface Artist {
  _id: string;
  name: string;
  email: string;
  phone: string;
  approvalStatus: string;
  createdAt: string;
}

interface Venue {
  _id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  approvalStatus: string;
}

type ApprovalItem = Event | Organizer | Artist | Venue;

interface ApprovalListProps {
  type: "Organizer" | "Artist" | "Venue" | "Event";
}

export default function ApprovalList({ type }: ApprovalListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
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

  const fetchApprovals = async () => {
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
        setEvents(data.events || []);
        setOrganizers(data.organizers || []);
        setArtists(data.artists || []);
        setVenues(data.venues || []);
      } else {
        setError(response.data.message || 'Failed to fetch approvals');
      }
    } catch (err: any) {
      console.error('Error fetching approvals:', err);
      setError(err.response?.data?.message || 'Failed to fetch approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [type]);

  const handleApprove = async (id: string, itemType: string) => {
    try {
      setProcessingId(id);
      const token = localStorage.getItem('admin_token');
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${itemType}s/${id}/approve`,
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
          description: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} approved successfully`,
        });
        fetchApprovals(); // Refresh data
      } else {
        throw new Error(response.data.message || 'Approval failed');
      }
    } catch (err: any) {
      console.error(`Error approving ${itemType}:`, err);
      toast({
        title: "Error",
        description: err.response?.data?.message || `Failed to approve ${itemType}`,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, itemType: string) => {
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) return;

    try {
      setProcessingId(id);
      const token = localStorage.getItem('admin_token');
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${itemType}s/${id}/reject`,
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
          description: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} rejected successfully`,
        });
        fetchApprovals(); // Refresh data
      } else {
        throw new Error(response.data.message || 'Rejection failed');
      }
    } catch (err: any) {
      console.error(`Error rejecting ${itemType}:`, err);
      toast({
        title: "Error",
        description: err.response?.data?.message || `Failed to reject ${itemType}`,
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
          <Button onClick={fetchApprovals} variant="outline">
            Retry
          </Button>
        </CardHeader>
      </Card>
    );
  }

  const renderBasicRow = (item: ApprovalItem, itemType: string) => {
    const isExpanded = expandedItems.has(item._id);
    const status = 'status' in item ? item.status : item.approvalStatus;

    return (
      <div key={item._id} className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpanded(item._id)}>
          <div className="flex-1 flex items-center space-x-4">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{item.name || item.title}</h3>
              <p className="text-sm text-gray-500">{item.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs font-medium py-1 px-2 rounded ${status === 'pending' ? 'bg-yellow-100 text-yellow-600' : status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {status?.charAt(0).toUpperCase() + status?.slice(1)}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {status === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); handleApprove(item._id, itemType.toLowerCase()); }}
                  disabled={!!processingId}
                >
                  {processingId === item._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); handleReject(item._id, itemType.toLowerCase()); }}
                  disabled={!!processingId}
                >
                  {processingId === item._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Reject
                </Button>
              </>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); toggleExpanded(item._id); }}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {isExpanded ? 'Hide' : 'View'} Details
            </Button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {itemType === 'Event' && (
                <>
                  <div><label className="text-sm font-medium text-gray-700">Description</label><p className="text-sm text-gray-600 mt-1">{item.description}</p></div>
                  <div><label className="text-sm font-medium text-gray-700">Category</label><p className="text-sm text-gray-600 mt-1">{item.category}</p></div>
                  <div><label className="text-sm font-medium text-gray-700">Start Date</label><p className="text-sm text-gray-600 mt-1">{new Date(item.startDate).toLocaleString()}</p></div>
                  <div><label className="text-sm font-medium text-gray-700">End Date</label><p className="text-sm text-gray-600 mt-1">{new Date(item.endDate).toLocaleString()}</p></div>
                  <div><label className="text-sm font-medium text-gray-700">Location</label><p className="text-sm text-gray-600 mt-1">{`${item.location?.address}, ${item.location?.city}, ${item.location?.country}`}</p></div>
                  <div><label className="text-sm font-medium text-gray-700">Organizer</label><p className="text-sm text-gray-600 mt-1">{`${item.organizerInfo?.name} (${item.organizerInfo?.email})`}</p></div>
                </>
              )}
              {itemType === 'Organizer' && (
                <>
                  <div><label className="text-sm font-medium text-gray-700">Phone</label><p className="text-sm text-gray-600 mt-1">{item.phone}</p></div>
                  <div><label className="text-sm font-medium text-gray-700">Company Name</label><p className="text-sm text-gray-600 mt-1">{item.companyName}</p></div>
                  <div className="md:col-span-2"><label className="text-sm font-medium text-gray-700">Email</label><p className="text-sm text-gray-600 mt-1">{item.email}</p></div>
                </>
              )}
              {itemType === 'Artist' && (
                <>
                  <div><label className="text-sm font-medium text-gray-700">Phone</label><p className="text-sm text-gray-600 mt-1">{item.phone}</p></div>
                  <div><label className="text-sm font-medium text-gray-700">Email</label><p className="text-sm text-gray-600 mt-1">{item.email}</p></div>
                </>
              )}
              {itemType === 'Venue' && (
                <>
                  <div><label className="text-sm font-medium text-gray-700">Phone</label><p className="text-sm text-gray-600 mt-1">{item.phone}</p></div>
                  <div><label className="text-sm font-medium text-gray-700">Email</label><p className="text-sm text-gray-600 mt-1">{item.email}</p></div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (items: ApprovalItem[], sectionTitle: string, itemType: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          {sectionTitle}
          <span className="ml-2 text-sm font-normal text-gray-500">({items.length})</span>
        </h3>
        <div className="space-y-2">
          {items.map(item => renderBasicRow(item, itemType))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    let data, itemType;
    switch (type) {
      case 'Event':     data = events; itemType = 'Event'; break;
      case 'Organizer': data = organizers; itemType = 'Organizer'; break;
      case 'Artist':    data = artists; itemType = 'Artist'; break;
      case 'Venue':     data = venues; itemType = 'Venue'; break;
      default:        return <p>Invalid type</p>;
    }

    const pendingItems = data.filter(item => ('status' in item ? item.status : item.approvalStatus) === 'pending');
    const approvedItems = data.filter(item => ('status' in item ? item.status : item.approvalStatus) === 'approved');
    const rejectedItems = data.filter(item => ('status' in item ? item.status : item.approvalStatus) === 'rejected');

    if (data.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No {type.toLowerCase()}s found.</p>
        </div>
      );
    }

    return (
      <>
        {renderSection(pendingItems, `Pending ${type}s`, itemType)}
        {renderSection(approvedItems, `Approved ${type}s`, itemType)}
        {renderSection(rejectedItems, `Rejected ${type}s`, itemType)}
      </>
    );
  };

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">{type} Management</CardTitle>
        <CardDescription>Review and manage all {type.toLowerCase()} submissions organized by status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
