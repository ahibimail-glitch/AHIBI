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
import { CheckCircle, XCircle, Eye, Loader2, ChevronDown, ChevronUp, Building, Mail, Phone, Globe, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Organizer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  bio?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  experience?: string;
  rejectionReason?: string;
}

export default function OrganizerApprovalList() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
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

  const fetchOrganizers = async () => {
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/organizers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setOrganizers(response.data.data.organizers || []);
      } else {
        setError(response.data.message || 'Failed to fetch organizers');
      }
    } catch (err: any) {
      console.error('Error fetching organizers:', err);
      setError(err.response?.data?.message || 'Failed to fetch organizers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const token = localStorage.getItem('admin_token');
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/organizers/${id}/approve`,
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
          description: "Organizer approved successfully",
        });
        fetchOrganizers();
      } else {
        throw new Error(response.data.message || 'Approval failed');
      }
    } catch (err: any) {
      console.error('Error approving organizer:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to approve organizer',
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/organizers/${id}/reject`,
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
          description: "Organizer rejected successfully",
        });
        fetchOrganizers();
      } else {
        throw new Error(response.data.message || 'Rejection failed');
      }
    } catch (err: any) {
      console.error('Error rejecting organizer:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to reject organizer',
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
          <Button onClick={fetchOrganizers} variant="outline">
            Retry
          </Button>
        </CardHeader>
      </Card>
    );
  }

  const renderOrganizerRow = (organizer: Organizer) => {
    const isExpanded = expandedItems.has(organizer._id);

    return (
      <div key={organizer._id} className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpanded(organizer._id)}>
          <div className="flex-1 flex items-center space-x-4">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 flex items-center">
                <Building className="h-4 w-4 mr-2 text-gray-500" />
                {organizer.name}
              </h3>
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <Mail className="h-3 w-3 mr-1" />
                {organizer.email}
              </p>
              <p className="text-sm text-gray-500 flex items-center">
                <Phone className="h-3 w-3 mr-1" />
                {organizer.phone}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`text-xs font-medium py-1 px-2 rounded ${
                  organizer.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
                  organizer.approvalStatus === 'approved' ? 'bg-green-100 text-green-600' : 
                  'bg-red-100 text-red-600'
                }`}>
                  {organizer.approvalStatus?.charAt(0).toUpperCase() + organizer.approvalStatus?.slice(1)}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(organizer.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {organizer.approvalStatus === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); handleApprove(organizer._id); }}
                  disabled={!!processingId}
                >
                  {processingId === organizer._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); handleReject(organizer._id); }}
                  disabled={!!processingId}
                >
                  {processingId === organizer._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Reject
                </Button>
              </>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); toggleExpanded(organizer._id); }}
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
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Building className="h-4 w-4 mr-1" />
                    Company Name
                  </label>
                  <p className="text-sm text-gray-600 mt-1">{organizer.companyName || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Bio</label>
                  <p className="text-sm text-gray-600 mt-1">{organizer.bio || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-600 mt-1">{organizer.description || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Experience</label>
                  <p className="text-sm text-gray-600 mt-1">{organizer.experience || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Address
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    {organizer.address ? 
                      `${organizer.address.street || ''}, ${organizer.address.city || ''}, ${organizer.address.state || ''}, ${organizer.address.country || ''}`.replace(/^,\s*|,\s*$/g, '') || 'Not provided'
                      : 'Not provided'
                    }
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Globe className="h-4 w-4 mr-1" />
                    Website
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    {organizer.website ? (
                      <a href={organizer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {organizer.website}
                      </a>
                    ) : 'Not provided'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Social Media</label>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {organizer.socialMedia?.facebook && (
                      <p>Facebook: <a href={organizer.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{organizer.socialMedia.facebook}</a></p>
                    )}
                    {organizer.socialMedia?.twitter && (
                      <p>Twitter: <a href={organizer.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{organizer.socialMedia.twitter}</a></p>
                    )}
                    {organizer.socialMedia?.instagram && (
                      <p>Instagram: <a href={organizer.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{organizer.socialMedia.instagram}</a></p>
                    )}
                    {organizer.socialMedia?.linkedin && (
                      <p>LinkedIn: <a href={organizer.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{organizer.socialMedia.linkedin}</a></p>
                    )}
                    {!organizer.socialMedia && <p>Not provided</p>}
                  </div>
                </div>
                
                {organizer.rejectionReason && (
                  <div>
                    <label className="text-sm font-medium text-red-700">Rejection Reason</label>
                    <p className="text-sm text-red-600 mt-1">{organizer.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (items: Organizer[], sectionTitle: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          {sectionTitle}
          <span className="ml-2 text-sm font-normal text-gray-500">({items.length})</span>
        </h3>
        <div className="space-y-2">
          {items.map(organizer => renderOrganizerRow(organizer))}
        </div>
      </div>
    );
  };

  const pendingOrganizers = organizers.filter(org => org.approvalStatus === 'pending');
  const approvedOrganizers = organizers.filter(org => org.approvalStatus === 'approved');
  const rejectedOrganizers = organizers.filter(org => org.approvalStatus === 'rejected');

  if (organizers.length === 0) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Organizer Management</CardTitle>
          <CardDescription>No organizers found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building className="h-5 w-5 mr-2" />
          Organizer Management
        </CardTitle>
        <CardDescription>Review and manage all organizer submissions organized by status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderSection(pendingOrganizers, 'Pending Organizers')}
        {renderSection(approvedOrganizers, 'Approved Organizers')}
        {renderSection(rejectedOrganizers, 'Rejected Organizers')}
      </CardContent>
    </Card>
  );
}
