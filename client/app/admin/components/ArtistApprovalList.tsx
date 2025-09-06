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
import { CheckCircle, XCircle, Eye, Loader2, ChevronDown, ChevronUp, Palette, Mail, Phone, Globe, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Artist {
  _id: string;
  name: string;
  email: string;
  phone: string;
  artistType?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  bio?: string;
  experience?: string;
  portfolio?: string[];
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  website?: string;
  rejectionReason?: string;
}

export default function ArtistApprovalList() {
  const [artists, setArtists] = useState<Artist[]>([]);
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

  const fetchArtists = async () => {
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/artists`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setArtists(response.data.data.artists || []);
      } else {
        setError(response.data.message || 'Failed to fetch artists');
      }
    } catch (err: any) {
      console.error('Error fetching artists:', err);
      setError(err.response?.data?.message || 'Failed to fetch artists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const token = localStorage.getItem('admin_token');
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/artists/${id}/approve`,
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
          description: "Artist approved successfully",
        });
        fetchArtists();
      } else {
        throw new Error(response.data.message || 'Approval failed');
      }
    } catch (err: any) {
      console.error('Error approving artist:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to approve artist',
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/artists/${id}/reject`,
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
          description: "Artist rejected successfully",
        });
        fetchArtists();
      } else {
        throw new Error(response.data.message || 'Rejection failed');
      }
    } catch (err: any) {
      console.error('Error rejecting artist:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || 'Failed to reject artist',
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
          <Button onClick={fetchArtists} variant="outline">
            Retry
          </Button>
        </CardHeader>
      </Card>
    );
  }

  const renderArtistRow = (artist: Artist) => {
    const isExpanded = expandedItems.has(artist._id);

    return (
      <div key={artist._id} className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpanded(artist._id)}>
          <div className="flex-1 flex items-center space-x-4">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 flex items-center">
                <Palette className="h-4 w-4 mr-2 text-gray-500" />
                {artist.name}
              </h3>
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <Mail className="h-3 w-3 mr-1" />
                {artist.email}
              </p>
              <p className="text-sm text-gray-500 flex items-center">
                <Phone className="h-3 w-3 mr-1" />
                {artist.phone}
              </p>
              {artist.artistType && (
                <p className="text-sm text-gray-500 flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {artist.artistType}
                </p>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <span className={`text-xs font-medium py-1 px-2 rounded ${
                  artist.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
                  artist.approvalStatus === 'approved' ? 'bg-green-100 text-green-600' : 
                  'bg-red-100 text-red-600'
                }`}>
                  {artist.approvalStatus?.charAt(0).toUpperCase() + artist.approvalStatus?.slice(1)}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(artist.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {artist.approvalStatus === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); handleApprove(artist._id); }}
                  disabled={!!processingId}
                >
                  {processingId === artist._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); handleReject(artist._id); }}
                  disabled={!!processingId}
                >
                  {processingId === artist._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Reject
                </Button>
              </>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); toggleExpanded(artist._id); }}
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
                    <User className="h-4 w-4 mr-1" />
                    Artist Type
                  </label>
                  <p className="text-sm text-gray-600 mt-1">{artist.artistType || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Bio</label>
                  <p className="text-sm text-gray-600 mt-1">{artist.bio || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Experience</label>
                  <p className="text-sm text-gray-600 mt-1">{artist.experience || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Portfolio</label>
                  <div className="text-sm text-gray-600 mt-1">
                    {artist.portfolio && artist.portfolio.length > 0 ? (
                      <div className="space-y-1">
                        {artist.portfolio.map((item, index) => (
                          <a key={index} href={item} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                            Portfolio Item {index + 1}
                          </a>
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
                    {artist.website ? (
                      <a href={artist.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {artist.website}
                      </a>
                    ) : 'Not provided'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Social Media</label>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {artist.socialMedia?.facebook && (
                      <p>Facebook: <a href={artist.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{artist.socialMedia.facebook}</a></p>
                    )}
                    {artist.socialMedia?.twitter && (
                      <p>Twitter: <a href={artist.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{artist.socialMedia.twitter}</a></p>
                    )}
                    {artist.socialMedia?.instagram && (
                      <p>Instagram: <a href={artist.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{artist.socialMedia.instagram}</a></p>
                    )}
                    {artist.socialMedia?.linkedin && (
                      <p>LinkedIn: <a href={artist.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{artist.socialMedia.linkedin}</a></p>
                    )}
                    {!artist.socialMedia && <p>Not provided</p>}
                  </div>
                </div>
                
                {artist.rejectionReason && (
                  <div>
                    <label className="text-sm font-medium text-red-700">Rejection Reason</label>
                    <p className="text-sm text-red-600 mt-1">{artist.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (items: Artist[], sectionTitle: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          {sectionTitle}
          <span className="ml-2 text-sm font-normal text-gray-500">({items.length})</span>
        </h3>
        <div className="space-y-2">
          {items.map(artist => renderArtistRow(artist))}
        </div>
      </div>
    );
  };

  const pendingArtists = artists.filter(artist => artist.approvalStatus === 'pending');
  const approvedArtists = artists.filter(artist => artist.approvalStatus === 'approved');
  const rejectedArtists = artists.filter(artist => artist.approvalStatus === 'rejected');

  if (artists.length === 0) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Artist Management</CardTitle>
          <CardDescription>No artists found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Palette className="h-5 w-5 mr-2" />
          Artist Management
        </CardTitle>
        <CardDescription>Review and manage all artist submissions organized by status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderSection(pendingArtists, 'Pending Artists')}
        {renderSection(approvedArtists, 'Approved Artists')}
        {renderSection(rejectedArtists, 'Rejected Artists')}
      </CardContent>
    </Card>
  );
}
