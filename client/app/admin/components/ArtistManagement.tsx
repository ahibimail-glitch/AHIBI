"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX, 
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Globe,
  Music,
  Award,
  Clock,
  TrendingUp,
  Download,
  Plus,
  X
} from 'lucide-react';

interface Artist {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  profilePic?: string;
  bio?: string;
  genres: string[];
  type: string;
  experience: string;
  basePrice: number;
  socialLinks: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
  };
  rating: {
    average: number;
    count: number;
  };
  totalBookings: number;
  totalEarnings: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  status: 'active' | 'pending' | 'blocked';
  createdAt: string;
}

const ArtistManagement: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'view' | 'edit' | 'social'>('view');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockArtists: Artist[] = [
      {
        _id: '1',
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        phone: '+91 9876543210',
        city: 'Mumbai',
        profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        bio: 'Professional singer with 10+ years of experience in Bollywood and classical music.',
        genres: ['Bollywood', 'Classical', 'Ghazal'],
        type: 'Singer',
        experience: '10+ years',
        basePrice: 50000,
        socialLinks: {
          instagram: 'https://instagram.com/rahulmusic',
          youtube: 'https://youtube.com/rahulmusic',
          spotify: 'https://spotify.com/artist/rahul',
          facebook: 'https://facebook.com/rahulmusic',
          website: 'https://rahulmusic.com'
        },
        rating: { average: 4.8, count: 156 },
        totalBookings: 89,
        totalEarnings: 2450000,
        approvalStatus: 'approved',
        status: 'active',
        createdAt: '2024-01-15T10:30:00Z'
      },
      {
        _id: '2',
        name: 'Priya Patel',
        email: 'priya@example.com',
        phone: '+91 9876543211',
        city: 'Delhi',
        profilePic: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        bio: 'Contemporary dancer and choreographer specializing in fusion and modern dance.',
        genres: ['Contemporary', 'Fusion', 'Modern'],
        type: 'Dancer',
        experience: '7 years',
        basePrice: 35000,
        socialLinks: {
          instagram: 'https://instagram.com/priyadance',
          youtube: 'https://youtube.com/priyadance',
          facebook: 'https://facebook.com/priyadance'
        },
        rating: { average: 4.6, count: 78 },
        totalBookings: 45,
        totalEarnings: 1200000,
        approvalStatus: 'pending',
        status: 'pending',
        createdAt: '2024-02-20T14:15:00Z'
      },
      {
        _id: '3',
        name: 'Arjun Kumar',
        email: 'arjun@example.com',
        phone: '+91 9876543212',
        city: 'Bangalore',
        profilePic: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        bio: 'Stand-up comedian with a unique style of observational humor.',
        genres: ['Stand-up', 'Observational', 'Improv'],
        type: 'Comedian',
        experience: '5 years',
        basePrice: 25000,
        socialLinks: {
          instagram: 'https://instagram.com/arjuncomedy',
          youtube: 'https://youtube.com/arjuncomedy',
          twitter: 'https://twitter.com/arjuncomedy'
        },
        rating: { average: 4.4, count: 92 },
        totalBookings: 67,
        totalEarnings: 890000,
        approvalStatus: 'approved',
        status: 'active',
        createdAt: '2024-01-08T09:45:00Z'
      }
    ];

    setTimeout(() => {
      setArtists(mockArtists);
      setFilteredArtists(mockArtists);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter artists based on search and status
  useEffect(() => {
    let filtered = artists;

    if (searchTerm) {
      filtered = filtered.filter(artist =>
        artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artist.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artist.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artist.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(artist => artist.approvalStatus === statusFilter);
    }

    setFilteredArtists(filtered);
  }, [searchTerm, statusFilter, artists]);

  const handleApprove = async (artistId: string) => {
    // API call to approve artist
    setArtists(prev => prev.map(artist => 
      artist._id === artistId 
        ? { ...artist, approvalStatus: 'approved' as const, status: 'active' as const }
        : artist
    ));
  };

  const handleReject = async (artistId: string) => {
    // API call to reject artist
    setArtists(prev => prev.map(artist => 
      artist._id === artistId 
        ? { ...artist, approvalStatus: 'rejected' as const, status: 'blocked' as const }
        : artist
    ));
  };

  const openModal = (artist: Artist, type: 'view' | 'edit' | 'social') => {
    setSelectedArtist(artist);
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedArtist(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getSocialIcon = (platform: string) => {
    const icons = {
      instagram: Instagram,
      youtube: Youtube,
      facebook: Facebook,
      twitter: Twitter,
      spotify: Music,
      website: Globe
    };
    return icons[platform as keyof typeof icons] || Globe;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Music className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Artists</p>
              <p className="text-2xl font-bold text-gray-900">{artists.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">
                {artists.filter(a => a.approvalStatus === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {artists.filter(a => a.approvalStatus === 'approved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{artists.reduce((sum, a) => sum + a.totalEarnings, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search artists by name, email, city, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button className="flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Artists Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Artist
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Social Media
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredArtists.map((artist) => (
                <tr key={artist._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        <img
                          className="h-12 w-12 rounded-full object-cover"
                          src={artist.profilePic || '/default-avatar.png'}
                          alt={artist.name}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{artist.name}</div>
                        <div className="text-sm text-gray-500">{artist.type} • {artist.experience}</div>
                        <div className="flex items-center mt-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600 ml-1">
                            {artist.rating.average} ({artist.rating.count})
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center mb-1">
                        <Mail className="w-4 h-4 text-gray-400 mr-2" />
                        {artist.email}
                      </div>
                      <div className="flex items-center mb-1">
                        <Phone className="w-4 h-4 text-gray-400 mr-2" />
                        {artist.phone}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                        {artist.city}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center mb-1">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        {artist.totalBookings} bookings
                      </div>
                      <div className="flex items-center mb-1">
                        <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                        ₹{artist.totalEarnings.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Base: ₹{artist.basePrice.toLocaleString()}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(artist.approvalStatus)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {Object.entries(artist.socialLinks).map(([platform, url]) => {
                        if (!url) return null;
                        const IconComponent = getSocialIcon(platform);
                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                            title={platform}
                          >
                            <IconComponent className="w-4 h-4 text-gray-600" />
                          </a>
                        );
                      })}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openModal(artist, 'view')}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => openModal(artist, 'social')}
                        className="text-purple-600 hover:text-purple-900 p-2 rounded-full hover:bg-purple-50 transition-colors"
                        title="Manage Social Media"
                      >
                        <Globe className="w-4 h-4" />
                      </button>

                      {artist.approvalStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(artist._id)}
                            className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50 transition-colors"
                            title="Approve"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleReject(artist._id)}
                            className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors"
                            title="Reject"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedArtist && (
        <ArtistModal
          artist={selectedArtist}
          type={modalType}
          onClose={closeModal}
          onUpdate={(updatedArtist) => {
            setArtists(prev => prev.map(a => a._id === updatedArtist._id ? updatedArtist : a));
            closeModal();
          }}
        />
      )}
    </div>
  );
};

// Artist Modal Component
const ArtistModal: React.FC<{
  artist: Artist;
  type: 'view' | 'edit' | 'social';
  onClose: () => void;
  onUpdate: (artist: Artist) => void;
}> = ({ artist, type, onClose, onUpdate }) => {
  const [editedArtist, setEditedArtist] = useState(artist);

  const handleSave = () => {
    // API call to update artist
    onUpdate(editedArtist);
  };

  const updateSocialLink = (platform: string, url: string) => {
    setEditedArtist(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: url
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            {type === 'view' ? 'Artist Details' : type === 'social' ? 'Social Media Links' : 'Edit Artist'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {type === 'view' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-6">
                <img
                  src={artist.profilePic || '/default-avatar.png'}
                  alt={artist.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">{artist.name}</h4>
                  <p className="text-lg text-gray-600">{artist.type}</p>
                  <div className="flex items-center mt-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="ml-1 text-gray-600">
                      {artist.rating.average} ({artist.rating.count} reviews)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Contact Information</h5>
                  <div className="space-y-2">
                    <p><span className="font-medium">Email:</span> {artist.email}</p>
                    <p><span className="font-medium">Phone:</span> {artist.phone}</p>
                    <p><span className="font-medium">City:</span> {artist.city}</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Performance Details</h5>
                  <div className="space-y-2">
                    <p><span className="font-medium">Experience:</span> {artist.experience}</p>
                    <p><span className="font-medium">Base Price:</span> ₹{artist.basePrice.toLocaleString()}</p>
                    <p><span className="font-medium">Total Bookings:</span> {artist.totalBookings}</p>
                    <p><span className="font-medium">Total Earnings:</span> ₹{artist.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 mb-3">Genres</h5>
                <div className="flex flex-wrap gap-2">
                  {artist.genres.map((genre, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              {artist.bio && (
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Biography</h5>
                  <p className="text-gray-700">{artist.bio}</p>
                </div>
              )}

              <div>
                <h5 className="font-semibold text-gray-900 mb-3">Social Media</h5>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(artist.socialLinks).map(([platform, url]) => {
                    if (!url) return null;
                    const IconComponent = getSocialIcon(platform);
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <IconComponent className="w-4 h-4" />
                        <span className="capitalize">{platform}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {type === 'social' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/username' },
                  { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/channel' },
                  { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/page' },
                  { key: 'twitter', label: 'Twitter', icon: Twitter, placeholder: 'https://twitter.com/username' },
                  { key: 'spotify', label: 'Spotify', icon: Music, placeholder: 'https://spotify.com/artist' },
                  { key: 'website', label: 'Website', icon: Globe, placeholder: 'https://yourwebsite.com' }
                ].map(({ key, label, icon: Icon, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Icon className="w-4 h-4 inline mr-2" />
                      {label}
                    </label>
                    <input
                      type="url"
                      value={editedArtist.socialLinks[key as keyof typeof editedArtist.socialLinks] || ''}
                      onChange={(e) => updateSocialLink(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getSocialIcon = (platform: string) => {
  const icons = {
    instagram: Instagram,
    youtube: Youtube,
    facebook: Facebook,
    twitter: Twitter,
    spotify: Music,
    website: Globe
  };
  return icons[platform as keyof typeof icons] || Globe;
};

export default ArtistManagement;
