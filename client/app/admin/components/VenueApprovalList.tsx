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
import { CheckCircle, XCircle, Eye, Loader2, ChevronDown, ChevronUp, MapPin, Mail, Phone, Globe, Users, Camera } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Venue {
  _id: string;
  name: string;
  email: string;
  phone: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  capacity?: number;
  amenities?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  website?: string;
  images?: string[];
  rejectionReason?: string;
}

export default function VenueApprovalList() {
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

  const fetchVenues = async () => {
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/venues`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setVenues(response.data.data.venues || []);
      } else {
        setError(response.data.message || 'Failed to fetch venues');
      }
    } catch (err: any) {
      console.error('Error fetching venues:', err);
      setError(err.response?.data?.message || 'Failed to fetch venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const token = localStorage.getItem('admin_token');
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/venues/${id}/approve`,
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
          description: "Venue approved successfully",
        });
        fetchVenues();
      } else {
        throw new Error(response.data.message || 'Approval failed');
      }
    } catch (err: any) {
      console.error('Error approving venue:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to approve venue',
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/venues/${id}/reject`,
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
          description: "Venue rejected successfully",
        });
        fetchVenues();
      } else {
        throw new Error(response.data.message || 'Rejection failed');
      }
    } catch (err: any) {
      console.error('Error rejecting venue:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to reject venue',
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
          <Button onClick={fetchVenues} variant="outline">
            Retry
          </Button>
        </CardHeader>
      </Card>
    );
  }

  const renderVenueRow = (venue: Venue) => {
    const isExpanded = expandedItems.has(venue._id);

    return (
      <div key={venue._id} className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpanded(venue._id)}>
          <div className="flex-1 flex items-center space-x-4">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                {venue.name}
              </h3>
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <Mail className="h-3 w-3 mr-1" />
                {venue.email}
              </p>
              <p className="text-sm text-gray-500 flex items-center">
                <Phone className="h-3 w-3 mr-1" />
                {venue.phone}
              </p>
              {venue.capacity && (
                <p className="text-sm text-gray-500 flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  Capacity: {venue.capacity}
                </p>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <span className={`text-xs font-medium py-1 px-2 rounded ${
                  venue.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
                  venue.approvalStatus === 'approved' ? 'bg-green-100 text-green-600' : 
                  'bg-red-100 text-red-600'
                }`}>
                  {venue.approvalStatus?.charAt(0).toUpperCase() + venue.approvalStatus?.slice(1)}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(venue.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {venue.approvalStatus === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); handleApprove(venue._id); }}
                  disabled={!!processingId}
                >
                  {processingId === venue._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); handleReject(venue._id); }}
                  disabled={!!processingId}
                >
                  {processingId === venue._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Reject
                </Button>
              </>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); toggleExpanded(venue._id); }}
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
                  <p className="text-sm text-gray-600 mt-1">{venue.description || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Address
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    {venue.address ? 
                      `${venue.address.street || ''}, ${venue.address.city || ''}, ${venue.address.state || ''}, ${venue.address.country || ''}`.replace(/^,\s*|,\s*$/g, '') || 'Not provided'
                      : 'Not provided'
                    }
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    Capacity
                  </label>
                  <p className="text-sm text-gray-600 mt-1">{venue.capacity || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Amenities</label>
                  <div className="text-sm text-gray-600 mt-1">
                    {venue.amenities && venue.amenities.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {venue.amenities.map((amenity, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p>Not provided</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Globe className="h-4 w-4 mr-1" />
                    Website
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    {venue.website ? (
                      <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {venue.website}
                      </a>
                    ) : 'Not provided'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Contact Information</label>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {venue.contactInfo?.email && (
                      <p>Email: {venue.contactInfo.email}</p>
                    )}
                    {venue.contactInfo?.phone && (
                      <p>Phone: {venue.contactInfo.phone}</p>
                    )}
                    {venue.contactInfo?.website && (
                      <p>Website: <a href={venue.contactInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{venue.contactInfo.website}</a></p>
                    )}
                    {!venue.contactInfo && <p>Not provided</p>}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Camera className="h-4 w-4 mr-1" />
                    Images
                  </label>
                  <div className="text-sm text-gray-600 mt-1">
                    {venue.images && venue.images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {venue.images.map((image, index) => (
                          <img 
                            key={index} 
                            src={image} 
                            alt={`Venue ${index + 1}`} 
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
                
                {venue.rejectionReason && (
                  <div>
                    <label className="text-sm font-medium text-red-700">Rejection Reason</label>
                    <p className="text-sm text-red-600 mt-1">{venue.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (items: Venue[], sectionTitle: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          {sectionTitle}
          <span className="ml-2 text-sm font-normal text-gray-500">({items.length})</span>
        </h3>
        <div className="space-y-2">
          {items.map(venue => renderVenueRow(venue))}
        </div>
      </div>
    );
  };

  const pendingVenues = venues.filter(venue => venue.approvalStatus === 'pending');
  const approvedVenues = venues.filter(venue => venue.approvalStatus === 'approved');
  const rejectedVenues = venues.filter(venue => venue.approvalStatus === 'rejected');

  if (venues.length === 0) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Venue Management</CardTitle>
          <CardDescription>No venues found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Venue Management
        </CardTitle>
        <CardDescription>Review and manage all venue submissions organized by status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderSection(pendingVenues, 'Pending Venues')}
        {renderSection(approvedVenues, 'Approved Venues')}
        {renderSection(rejectedVenues, 'Rejected Venues')}
      </CardContent>
    </Card>
  );
}
