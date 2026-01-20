"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Filter, 
  Search, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  IndianRupee,
  ChevronRight,
  RefreshCw,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiUrl } from '@/config';

interface ArenaPartnerBooking {
  _id: string;
  user: {
    name: string;
    email: string;
    phone: string;
  } | null;
  venue: {
    _id: string;
    venueName: string;
    address: {
      street: string;
      city: string;
      state: string;
    };
  };
  court: {
    _id: string;
    courtName: string;
    sportType: string;
  };
  bookingDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  numberOfPlayers: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  pricing: {
    baseAmount: number;
    totalAmount: number;
    arenaEarnings: number;
    platformCommission: number;
  };
  payment: {
    paymentMethod: string;
    paymentStatus: string;
    paidAt: string;
    amountPaid?: number;
    advancePaymentPercent?: number;
  };
  contactDetails?: {
    name: string;
    phone: string;
    email?: string;
  };
  checkIn?: {
    checkedIn: boolean;
    checkedInAt: string;
  };
  createdAt: string;
}

export default function ArenaPartnerBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<ArenaPartnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('all');
  const [venues, setVenues] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    confirmed: 0,
    completed: 0,
    revenue: 0
  });

  useEffect(() => {
    const token = localStorage.getItem('arenaPartnerToken');
    if (!token) {
      router.push('/arena-partner/auth');
      return;
    }

    fetchBookings();
    fetchVenues();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('arenaPartnerToken');
      
      const response = await fetch(getApiUrl('/arena-partner/bookings'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setBookings(data.data.bookings || []);
        calculateStats(data.data.bookings || []);
      } else {
        setError(data.message || 'Failed to fetch bookings');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVenues = async () => {
    try {
      const token = localStorage.getItem('arenaPartnerToken');
      
      const response = await fetch(getApiUrl('/arena-partner/venues'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setVenues(data.data.venues || []);
      }
    } catch (err) {
      console.error('Failed to fetch venues:', err);
    }
  };

  const calculateStats = (bookingsList: ArenaPartnerBooking[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayBookings = bookingsList.filter(booking => {
      const bookingDate = new Date(booking.bookingDate);
      return bookingDate.toDateString() === today.toDateString();
    });

    const confirmedBookings = bookingsList.filter(b => b.status === 'confirmed');
    const completedBookings = bookingsList.filter(b => b.status === 'completed');
    const totalRevenue = bookingsList.reduce((sum, b) => sum + b.pricing.arenaEarnings, 0);

    setStats({
      total: bookingsList.length,
      today: todayBookings.length,
      confirmed: confirmedBookings.length,
      completed: completedBookings.length,
      revenue: totalRevenue
    });
  };

  const handleCheckIn = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('arenaPartnerToken');
      
      const response = await fetch(getApiUrl(`/arena-partner/bookings/${bookingId}/check-in`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        fetchBookings(); // Refresh the list
      } else {
        alert(data.message || 'Failed to check in booking');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  const handleComplete = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('arenaPartnerToken');
      
      const response = await fetch(getApiUrl(`/arena-partner/bookings/${bookingId}/complete`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        fetchBookings(); // Refresh the list
      } else {
        alert(data.message || 'Failed to complete booking');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  const getSportIcon = (sportType: string) => {
    const icons: any = {
      cricket: '🏏',
      football: '⚽',
      basketball: '🏀',
      badminton: '🏸',
      tennis: '🎾',
      volleyball: '🏐',
      table_tennis: '🏓',
      swimming: '🏊',
      gym: '💪',
      yoga: '🧘',
      squash: '🎾',
      boxing: '🥊',
      martial_arts: '🥋',
      athletics: '🏃',
      hockey: '🏑',
      kabaddi: '🤼',
      archery: '🏹',
      shooting: '🎯',
      golf: '⛳',
    };
    return icons[sportType] || '🏟️';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'checked_in':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'checked_in':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-purple-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentBadgeClass = (paymentStatus: string) => {
    if (paymentStatus === 'completed') {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    if (paymentStatus === 'failed') {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (paymentStatus === 'refunded') {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user?.phone?.includes(searchTerm) ||
      booking.venue.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.court.courtName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.contactDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.contactDetails?.phone?.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesVenue = venueFilter === 'all' || booking.venue._id === venueFilter;

    return matchesSearch && matchesStatus && matchesVenue;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/arena-partner/dashboard" className="text-orange-600 hover:text-orange-700">
                ← Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Bookings Management</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Confirmed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <IndianRupee className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">₹{stats.revenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white border-0 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by customer name, phone, venue, or court..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="w-full lg:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full lg:w-48">
                <Select value={venueFilter} onValueChange={setVenueFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Venues</SelectItem>
                    {venues.map((venue) => (
                      <SelectItem key={venue._id} value={venue._id}>
                        {venue.venueName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={fetchBookings} variant="outline" className="w-full lg:w-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' || venueFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'You haven\'t received any bookings yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      {/* Left Section - Booking Details */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          {/* Sport Icon */}
                          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl">
                            {getSportIcon(booking.court.sportType)}
                          </div>

                          <div className="flex-1">
                            {/* Venue and Court */}
                            <div className="mb-2">
                              <h3 className="font-semibold text-gray-900 text-lg">
                                {booking.venue.venueName}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {booking.court.courtName} • {booking.court.sportType.toUpperCase()}
                              </p>
                            </div>

                            {/* Date and Time */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(booking.bookingDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {booking.startTime} - {booking.endTime}
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {booking.numberOfPlayers} players
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                {booking.venue.address.city}
                              </div>
                            </div>

                            {/* Customer Info */}
                            <div className="mb-3">
                              {booking.user ? (
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center">
                                    <User className="h-4 w-4 mr-1" />
                                    {booking.user.name}
                                  </div>
                                  <div className="flex items-center">
                                    <Phone className="h-4 w-4 mr-1" />
                                    {booking.user.phone}
                                  </div>
                                  <div className="flex items-center">
                                    <Mail className="h-4 w-4 mr-1" />
                                    {booking.user.email}
                                  </div>
                                </div>
                              ) : booking.contactDetails ? (
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center">
                                    <User className="h-4 w-4 mr-1" />
                                    {booking.contactDetails.name}
                                  </div>
                                  <div className="flex items-center">
                                    <Phone className="h-4 w-4 mr-1" />
                                    {booking.contactDetails.phone}
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    Walk-in
                                  </Badge>
                                </div>
                              ) : null}
                            </div>

                            {/* Status and Payment */}
                            <div className="flex items-center gap-3">
                              {getStatusIcon(booking.status)}
                              <Badge className={`${getStatusColor(booking.status)} border`}>
                                {booking.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge className={`${getPaymentBadgeClass(booking.payment.paymentStatus)} border text-xs`}>
                                {booking.payment.paymentStatus === 'completed' ? 'Paid' : booking.payment.paymentStatus.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Section - Price and Actions */}
                      <div className="lg:text-right">
                        <div className="mb-4">
                          <p className="text-sm text-gray-600">Your Earnings</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ₹{booking.pricing.arenaEarnings.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Total: ₹{booking.pricing.totalAmount.toLocaleString()}
                          </p>
                          {typeof booking.payment?.amountPaid === 'number' && booking.payment.amountPaid > 0 && (
                            <p className="text-xs text-gray-500">
                              Paid earlier: ({booking.payment.advancePaymentPercent || 0}%): ₹{booking.payment.amountPaid.toLocaleString()}
                            </p>
                          )}
                          {typeof booking.payment?.amountPaid === 'number' && booking.payment.amountPaid > 0 && booking.payment.amountPaid < booking.pricing.totalAmount && booking.status !== 'completed' && (
                            <p className="text-l font-medium text-orange-700">
                              Amount to be paid: ₹{Math.max(0, booking.pricing.totalAmount - booking.payment.amountPaid).toLocaleString()}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {booking.status === 'confirmed' && (
                            <Button
                              size="sm"
                              onClick={() => handleCheckIn(booking._id)}
                              className="w-full lg:w-auto"
                            >
                              Check In
                            </Button>
                          )}
                          
                          {booking.status === 'checked_in' && (
                            <Button
                              size="sm"
                              onClick={() => handleComplete(booking._id)}
                              className="w-full lg:w-auto"
                            >
                              Complete
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/arena-partner/bookings/${booking._id}`)}
                            className="w-full lg:w-auto"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
