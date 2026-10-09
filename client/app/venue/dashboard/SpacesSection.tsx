'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Building, Plus, Search, Edit, Trash2, Eye, Calendar, Users, DollarSign } from 'lucide-react';
import CreateSpaceForm from './CreateSpaceForm';
import EditSpaceForm from './EditSpaceForm';
import { isVenueAddressComplete } from '@/utils/venueValidation';

interface SpaceData {
  _id: string;
  name: string;
  description: string;
  tagline?: string;
  venueClassification: {
    venueTypes: string[];
    venueTypeOther?: string;
    indoorOutdoor: string;
    operationMode: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  capacity: number;
  capacityDetails: {
    standingCapacity: number;
    seatingCapacity?: {
      theatreStyle?: number;
      roundTable?: number;
    };
    minimumBookingCapacity?: number;
    multipleEventsPerDay: boolean;
    timeSlots: string[];
    peakSeasonRates?: string;
    offSeasonRates?: string;
    advanceBookingDays: number;
    cancellationPolicy?: string;
  };
  pricing: {
    basePrice: number;
    hourlyRate?: number;
    halfDayRate?: number;
    fullDayRate?: number;
    cleaningFee?: number;
    securityDeposit?: number;
    rentalIncludes: string[];
    otherEquipmentDetails?: string;
    securityDepositRequired: boolean;
    cancellationPolicy: {
    refundable: boolean;
    timeFrame?: string;
    deductionPercentage?: number;
  };
    refundPolicy: string;
  };
  totalBookings: number;
  totalEarnings: number;
  rating: {
    average: number;
    count: number;
  };
  gallery: Array<{
    public_id: string;
    url: string;
    width: number;
    height: number;
    format: string;
    size: number;
    created_at: string;
    caption?: string;
    isMain?: boolean;
  }>;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
  parking: {
    carCapacity: number;
    twoWheelerAvailable: boolean;
  };
  accessibility: {
    wheelchairAccess: boolean;
    liftElevator: boolean;
    nearbyTransport: {
      airport: boolean;
      railwayStation: boolean;
      taxiService: boolean;
    };
  };
  facilities: {
    [key: string]: boolean;
  };
  contactInfo: {
    phone: string;
    email?: string;
    website?: string;
  };
  amenities?: string[];
  rules?: string[];
  terms: {
    cancellationPolicy?: string;
    additionalRules?: string;
  };
  policies: {
    operatingHours: {
      startTime: string;
      endTime: string;
    };
    noiseRestrictions?: string;
    smokingPolicy: string;
    alcoholServingPermission: boolean;
    requiredPermissions?: string;
    eventTypeRestrictions?: string;
  };
}

interface VenueData {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  status: string;
  isVerified: boolean;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

interface SpacesSectionProps {
  venue: VenueData;
  onNavigate?: (section: string) => void;
}

const venueTypeLabels: { [key: string]: string } = {
  restaurant_cafe_lounge: 'Restaurant/Cafe/Lounge',
  banquet_hall: 'Banquet Hall',
  event_hall_multipurpose: 'Event Hall/Multipurpose',
  auditorium_convention_centre: 'Auditorium/Convention Centre',
  resort_hotel_event_space: 'Resort/Hotel Event Space',
  outdoor_venue: 'Outdoor Venue',
  rooftop_venue: 'Rooftop Venue',
  sports_complex: 'Sports Complex',
  conference_meeting_room: 'Conference/Meeting Room',
  wedding_venue: 'Wedding Venue',
  jamming_room: 'Jamming Room',
  others: 'Others'
};

export default function SpacesSection({ venue, onNavigate }: SpacesSectionProps) {
  const [spaces, setSpaces] = useState<SpaceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<SpaceData | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    totalSpaces: 0,
    totalBookings: 0,
    totalEarnings: 0,
    averageRating: 0
  });

  useEffect(() => {
    fetchSpaces();
    fetchStats();
  }, []);

  const fetchSpaces = async () => {
    try {
      const token = localStorage.getItem('venueToken');
      const response = await fetch('/api/venue/spaces', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setSpaces(data.data.spaces);
      } else {
        toast.error('Failed to fetch spaces');
      }
    } catch (error) {
      console.error('Fetch spaces error:', error);
      toast.error('Failed to fetch spaces');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('venueToken');
      const response = await fetch('/api/venue/spaces/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm('Are you sure you want to delete this space? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('venueToken');
      const response = await fetch(`/api/venue/spaces/${spaceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Space deleted successfully');
        fetchSpaces();
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to delete space');
      }
    } catch (error) {
      console.error('Delete space error:', error);
      toast.error('Failed to delete space');
    }
  };

  const handleEditSpace = (space: SpaceData) => {
    setSelectedSpace(space);
    setShowEditForm(true);
  };

  const handleViewDetails = (space: SpaceData) => {
    setSelectedSpace(space);
    setShowDetailsModal(true);
  };

  const handleOpenCreateForm = () => {
    if (!isVenueAddressComplete(venue)) {
      toast.error('Please complete your venue address (street, city, state, and pincode) in Profile Settings before creating a space.');
      onNavigate?.('profile');
      return;
    }
    setShowCreateForm(true);
  };

  const filteredSpaces = spaces.filter(space => {
    const matchesSearch = space.name.toLowerCase().includes(search.toLowerCase()) ||
                         space.description.toLowerCase().includes(search.toLowerCase()) ||
                         space.address.city.toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch;
  });

  const getPrimaryImage = (space: SpaceData) => {
    // If cover image is set, find it in the gallery
    if (space.coverImage) {
      const coverImage = space.gallery.find(img => img.public_id === space.coverImage);
      if (coverImage?.url) {
        return coverImage.url;
      }
    }
  
    // Fallback to isMain image or first image
    const mainImage = space.gallery.find(img => img.isMain);
    return mainImage?.url || space.gallery[0]?.url || '/api/placeholder/400/300';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-t-blue-400 animate-pulse"></div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-gray-900">Loading spaces...</p>
          <p className="text-sm text-gray-600">Please wait while we fetch your venue spaces</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Total Spaces</CardTitle>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.totalSpaces}</div>
            <p className="text-xs text-blue-700 mt-1">Active venue spaces</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Total Bookings</CardTitle>
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-900">{stats.totalBookings}</div>
            <p className="text-xs text-green-700 mt-1">Across all spaces</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Total Earnings</CardTitle>
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-purple-900">{formatCurrency(stats.totalEarnings)}</div>
            <p className="text-xs text-purple-700 mt-1">Revenue generated</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Average Rating</CardTitle>
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-orange-900">{stats.averageRating.toFixed(1)}</div>
            <p className="text-xs text-orange-700 mt-1">Customer satisfaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Spaces</h2>
              <p className="text-sm text-gray-600">Manage your venue spaces and configurations</p>
            </div>
          </div>
          <Button 
            onClick={handleOpenCreateForm}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg transition-colors w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Space
          </Button>
        </div>
      </div>

      {/* Enhanced Search */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search spaces by name, description, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Enhanced Spaces List */}
      {filteredSpaces.length === 0 ? (
        <Card className="bg-gradient-to-br from-gray-50 to-blue-50 border-gray-200">
          <CardContent className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {spaces.length === 0 ? 'No spaces yet' : 'No spaces found'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {spaces.length === 0 
                ? 'Create your first venue space to start receiving bookings and generating revenue'
                : 'Try adjusting your search terms to find the spaces you\'re looking for'
              }
            </p>
            {spaces.length === 0 && (
              <Button 
                onClick={handleOpenCreateForm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Space
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSpaces.map((space) => (
            <Card key={space._id} className="bg-white/80 backdrop-blur-sm border hover:shadow-lg transition-all duration-300 overflow-hidden group">
              <div className="aspect-[16/10] overflow-hidden relative">
                <img
                  src={getPrimaryImage(space)}
                  alt={space.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-xs font-semibold text-gray-700">
                    {venueTypeLabels[space.venueClassification.venueTypes[0]] || space.venueClassification.venueTypes[0]}
                  </span>
                </div>
              </div>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 flex-1">{space.name}</h3>
                      <div className="flex items-center space-x-1 bg-yellow-100 px-2 py-1 rounded-full">
                        <span className="text-yellow-600 text-xs font-medium">★</span>
                        <span className="text-yellow-700 text-xs font-medium">{space.rating.average.toFixed(1)}</span>
                      </div>
                    </div>
                    {space.tagline && (
                      <p className="text-sm text-gray-600 italic line-clamp-1">{space.tagline}</p>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{space.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {space.venueClassification.venueTypes.slice(0, 2).map((type) => (
                      <Badge key={type} variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                        {venueTypeLabels[type] || type}
                      </Badge>
                    ))}
                    {space.venueClassification.venueTypes.length > 2 && (
                      <Badge variant="outline" className="text-xs border-gray-200 text-gray-700 bg-gray-50">
                        +{space.venueClassification.venueTypes.length - 2} more
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Capacity</p>
                      <p className="font-semibold text-gray-900">{space.capacity.toLocaleString()} guests</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Starting from</p>
                      <p className="font-semibold text-green-600">{formatCurrency(space.pricing.basePrice)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Total Bookings</p>
                      <p className="font-semibold text-blue-600">{space.totalBookings}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Reviews</p>
                      <p className="font-semibold text-purple-600">{space.rating.count}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(space)}
                      className="flex-1 border-gray-300 hover:border-gray-400"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSpace(space)}
                      className="flex-1 border-gray-300 hover:border-gray-400"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSpace(space._id)}
                      disabled={space.totalBookings > 0}
                      className="px-3"
                      title={space.totalBookings > 0 ? "Cannot delete space with existing bookings" : "Delete space"}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Space Modal */}
      {showCreateForm && (
        <CreateSpaceForm venue={venue} onClose={() => {
          setShowCreateForm(false);
          fetchSpaces();
          fetchStats();
        }} />
      )}

      {/* Edit Space Modal */}
      {showEditForm && selectedSpace && (
        <EditSpaceForm 
          venue={venue} 
          space={selectedSpace} 
          onClose={() => {
            setShowEditForm(false);
            setSelectedSpace(null);
            fetchSpaces();
            fetchStats();
          }} 
        />
      )}

      {/* Space Details Modal */}
      {showDetailsModal && selectedSpace && (
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSpace.name}</DialogTitle>
              <DialogDescription>
                Detailed information about this space
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{selectedSpace.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSpace.venueClassification.venueTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {venueTypeLabels[type] || type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {selectedSpace.tagline && (
                  <div className="mt-4">
                    <span className="text-gray-500">Tagline:</span>
                    <p className="font-medium">{selectedSpace.tagline}</p>
                  </div>
                )}
                <div className="mt-4">
                  <span className="text-gray-500">Description:</span>
                  <p className="mt-1">{selectedSpace.description}</p>
                </div>
              </div>

              {/* Capacity */}
              <div>
                <h3 className="font-semibold mb-3">Capacity</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-500">Total Capacity:</span>
                    <p className="font-medium">{selectedSpace.capacity}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Standing Capacity:</span>
                    <p className="font-medium">{selectedSpace.capacityDetails.standingCapacity}</p>
                  </div>
                  {selectedSpace.capacityDetails.minimumBookingCapacity && (
                    <div>
                      <span className="text-gray-500">Min Booking:</span>
                      <p className="font-medium">{selectedSpace.capacityDetails.minimumBookingCapacity}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="font-semibold mb-3">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">Base Price:</span>
                    <p className="font-medium">{formatCurrency(selectedSpace.pricing.basePrice)}</p>
                  </div>
                  {selectedSpace.pricing.hourlyRate && (
                    <div>
                      <span className="text-gray-500">Hourly Rate:</span>
                      <p className="font-medium">{formatCurrency(selectedSpace.pricing.hourlyRate)}</p>
                    </div>
                  )}
                  {selectedSpace.pricing.halfDayRate && (
                    <div>
                      <span className="text-gray-500">Half Day Rate:</span>
                      <p className="font-medium">{formatCurrency(selectedSpace.pricing.halfDayRate)}</p>
                    </div>
                  )}
                  {selectedSpace.pricing.fullDayRate && (
                    <div>
                      <span className="text-gray-500">Full Day Rate:</span>
                      <p className="font-medium">{formatCurrency(selectedSpace.pricing.fullDayRate)}</p>
                    </div>
                  )}
                  {selectedSpace.pricing.cleaningFee && (
                    <div>
                      <span className="text-gray-500">Cleaning Fee:</span>
                      <p className="font-medium">{formatCurrency(selectedSpace.pricing.cleaningFee)}</p>
                    </div>
                  )}
                  {selectedSpace.pricing.securityDeposit && (
                    <div>
                      <span className="text-gray-500">Security Deposit:</span>
                      <p className="font-medium">{formatCurrency(selectedSpace.pricing.securityDeposit)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="font-semibold mb-3">Address</h3>
                <div className="space-y-1">
                  <p>{selectedSpace.address.street}</p>
                  <p>{selectedSpace.address.city}, {selectedSpace.address.state} - {selectedSpace.address.pincode}</p>
                  {selectedSpace.address.landmark && (
                    <p>Landmark: {selectedSpace.address.landmark}</p>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h3 className="font-semibold mb-3">Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-500">Total Bookings:</span>
                    <p className="font-medium">{selectedSpace.totalBookings}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Earnings:</span>
                    <p className="font-medium">{formatCurrency(selectedSpace.totalEarnings)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Average Rating:</span>
                    <p className="font-medium">
                      {selectedSpace.rating.average.toFixed(1)} ({selectedSpace.rating.count} reviews)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
