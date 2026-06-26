'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building, Calendar as CalendarIcon, Users, DollarSign, Settings, LogOut, Plus, Menu, X, LayoutDashboard, Home, Shield, Ban, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import EditProfileForm from './EditProfileForm';
import SpacesSection from './SpacesSection';
import BlockDatesTimes from './BlockDatesTimes';
import { isVenueAddressComplete } from '@/utils/venueValidation';

// --- Helper component for sidebar buttons ---
interface SidebarButtonProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const SidebarButton = ({ icon: Icon, label, active, ...props }: SidebarButtonProps) => (
  <Button
    variant={active ? "secondary" : "ghost"}
    className="w-full justify-start"
    {...props}
  >
    <Icon className="mr-2 h-4 w-4" />
    {label}
  </Button>
);

interface VenueData {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  status: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
}

export default function VenueDashboard() {
  const router = useRouter();
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    checkAuth();
    fetchVenueData();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('venueToken');
    const venueData = localStorage.getItem('venueData');
    
    if (!token || !venueData) {
      router.push('/venue/auth/login');
      return;
    }
  };

  const fetchVenueData = async () => {
    try {
      const token = localStorage.getItem('venueToken');
      const response = await fetch('/api/venue/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setVenue(data.data.venue);
      } else {
        // Check if the venue exists but is not approved
        if (data.message && data.message.includes('not approved')) {
          setVenue({ status: 'rejected' } as VenueData); // Set venue with rejected status
        } else {
          toast.error('Failed to fetch venue data');
          if (response.status === 401) {
            handleLogout();
          } else if (response.status === 403) {
            // Venue not approved, set status to show appropriate message
            setVenue({ status: 'rejected' } as VenueData);
          }
        }
      }
    } catch (error) {
      console.error('Fetch venue data error:', error);
      toast.error('Failed to fetch venue data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('venueToken');
    localStorage.removeItem('venueData');
    router.push('/venue/auth/login');
    toast.success('Logged out successfully');
  };

  const sidebarItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'spaces', label: 'My Spaces', icon: Building },
    { id: 'bookings', label: 'Bookings', icon: CalendarIcon },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'block-dates', label: 'Block Dates', icon: Ban },
    // { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'profile', label: 'Profile Settings', icon: Settings },
  ];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return <OverviewSection venue={venue} onNavigate={setActiveSection} />;
      case 'spaces':
        return venue ? <SpacesSection venue={venue} onNavigate={setActiveSection} /> : null;
      case 'bookings':
        return <BookingsSection venue={venue} onNavigate={setActiveSection} />;
      case 'calendar':
        return <CalendarSection venue={venue} />;
      case 'block-dates':
        return <BlockDatesTimes venue={venue} />;
      // case 'earnings':
      //   return <EarningsSection venue={venue} />;
      case 'profile':
        return <EditProfileForm venue={venue} onUpdate={fetchVenueData} />;
      default:
        return <OverviewSection venue={venue} />;
    }
  };

  if (!isLoading && venue && (venue.status === 'rejected' || venue.status === 'pending')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">VENUE NOT APPROVED BY ADMIN</h2>
          <p className="text-gray-600 mb-6">
            Your venue registration is currently under review. Please wait for admin approval before accessing the dashboard.
          </p>
          <div className="space-y-3">
            <Button onClick={() => router.push('/venue/auth/login')} className="w-full">
              Go to Login
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Check Status Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!venue && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Venue not found</h2>
          <p className="text-gray-600 mt-2">Please log in again</p>
          <Button onClick={() => router.push('/venue/auth/login')} className="mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Toggle */}
      {/* <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Venue Dashboard</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div> */}

      <div className="flex">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* --- Sidebar --- */}
        <aside className={`w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 fixed h-full flex flex-col p-4 shadow-sm z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}>
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Venue Portal</h2>
                <p className="text-xs text-gray-600">Management Center</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Venue Info */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg border">
            <div className="text-sm">
              <p className="font-medium text-gray-900 truncate">{venue?.name || 'Loading...'}</p>
              <p className="text-gray-500 text-xs truncate">{venue?.email || 'Loading...'}</p>
              <div className="mt-2 flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  venue?.status === 'approved' || venue?.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : venue?.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {venue?.status || 'Loading'}
                </span>
                {venue?.isVerified && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <nav className="flex flex-col space-y-2 flex-1">
            <Link href="/" onClick={() => setSidebarOpen(false)}>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-blue-600">
                <Home className="mr-2 h-4 w-4" />
                Back to Homepage
              </Button>
            </Link>
            <SidebarButton icon={LayoutDashboard} label="Dashboard" active={activeSection === "overview"} onClick={() => { setActiveSection("overview"); setSidebarOpen(false); }} />
            <SidebarButton icon={Building} label="My Spaces" active={activeSection === "spaces"} onClick={() => { setActiveSection("spaces"); setSidebarOpen(false); }} />
            <SidebarButton icon={CalendarIcon} label="Bookings" active={activeSection === "bookings"} onClick={() => { setActiveSection("bookings"); setSidebarOpen(false); }} />
            <SidebarButton icon={CalendarIcon} label="Calendar" active={activeSection === "calendar"} onClick={() => { setActiveSection("calendar"); setSidebarOpen(false); }} />
            <SidebarButton icon={Ban} label="Block Dates" active={activeSection === "block-dates"} onClick={() => { setActiveSection("block-dates"); setSidebarOpen(false); }} />
            {/* <SidebarButton icon={DollarSign} label="Earnings" active={activeSection === "earnings"} onClick={() => { setActiveSection("earnings"); setSidebarOpen(false); }} /> */}
            
            <div className="pt-4 pb-2 px-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Settings</h3>
            </div>
            <SidebarButton icon={Settings} label="Venue Settings" active={activeSection === "profile"} onClick={() => { setActiveSection("profile"); setSidebarOpen(false); }} />
          </nav>

          <div className="mt-auto pt-4">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </aside>

        {/* --- Main Content --- */}
        <main className="flex-1 lg:ml-64 bg-gradient-to-br from-gray-50 to-blue-50">
          <header className="bg-white/60 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
            <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden h-8 w-8 sm:h-10 sm:w-10"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Venue Dashboard</h1>
                    <p className="text-gray-600">Welcome back, {venue?.name}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4">
                  <Link href="/" className="hidden sm:inline-flex">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Home className="h-4 w-4" />
                      Homepage
                    </Button>
                  </Link>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      venue?.status === 'approved' || venue?.status === 'active'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : venue?.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {venue?.status === 'approved' || venue?.status === 'active' ? 'Active' : venue?.status || 'Loading'}
                    </span>
                  </div>
                  <Button onClick={handleLogout} className="w-full sm:w-auto justify-center">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 md:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

// Enhanced Components for different sections
interface OverviewSectionProps {
  venue: VenueData | null;
  onNavigate?: (section: string) => void;
}

function OverviewSection({ venue, onNavigate }: OverviewSectionProps) {
  const [stats, setStats] = useState([
    {
      title: "Venue Status",
      value: venue?.status || 'N/A',
      description: venue?.status === 'approved' || venue?.status === 'active' ? 'Ready to operate' : 'Pending approval',
      icon: Building,
      color: venue?.status === 'approved' || venue?.status === 'active' ? 'text-green-600' : 
             venue?.status === 'pending' ? 'text-yellow-600' : 'text-red-600',
      bgColor: venue?.status === 'approved' || venue?.status === 'active' ? 'bg-green-50 border-green-200' : 
               venue?.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
    },
    {
      title: "Total Spaces",
      value: "0",
      description: 'Active venue spaces',
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200'
    },
    {
      title: "Total Bookings",
      value: "0",
      description: 'Total bookings received',
      icon: CalendarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200'
    }
  ]);

  useEffect(() => {
    if (venue) {
      fetchStats();
    }
  }, [venue]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('venueToken');
      
      // Fetch spaces count
      const spacesResponse = await fetch('/api/venue/spaces', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      let spacesCount = 0;
      if (spacesResponse.ok) {
        const spacesData = await spacesResponse.json();
        spacesCount = spacesData.success ? spacesData.data.spaces.length : 0;
        console.log('Spaces data:', spacesData);
      } else {
        console.error('Spaces API error:', spacesResponse.status);
      }
      
      // Fetch bookings count
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const bookingsResponse = await fetch(`${apiUrl}/api/venue/spaces/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      let bookingsCount = 0;
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        bookingsCount = bookingsData.success ? bookingsData.data.bookings.length : 0;
        console.log('Bookings data:', bookingsData);
      } else {
        console.error('Bookings API error:', bookingsResponse.status);
      }
      
      // Update stats with real data
      setStats(prevStats => 
        prevStats.map(stat => {
          if (stat.title === "Total Spaces") {
            return { ...stat, value: spacesCount.toString() };
          }
          if (stat.title === "Total Bookings") {
            return { ...stat, value: bookingsCount.toString() };
          }
          return stat;
        })
      );
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className={`${stat.bgColor} border transition-all duration-200 hover:shadow-md`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 capitalize">{stat.value}</div>
              <p className="text-xs text-gray-600 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl text-gray-900">Welcome to Your Venue Dashboard</CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-600 mt-1">
                Get started by adding your first venue space or managing your existing bookings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Button 
              className="w-full sm:w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
              onClick={() => {
                if (!isVenueAddressComplete(venue)) {
                  toast.error('Please complete your venue address in Profile Settings before adding a space.');
                  onNavigate?.('profile');
                  return;
                }
                onNavigate?.('spaces');
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Space
            </Button>
            <Button 
              variant="outline" 
              className="w-full sm:w-full border-2 border-gray-300 hover:border-gray-400 font-medium py-3 px-4 rounded-lg transition-all duration-200"
              onClick={() => onNavigate?.('profile')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Complete Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card 
          className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500"
          onClick={() => {
            if (!isVenueAddressComplete(venue)) {
              toast.error('Please complete your venue address in Profile Settings before managing spaces.');
              onNavigate?.('profile');
              return;
            }
            onNavigate?.('spaces');
          }}
          role="button"
          tabIndex={0}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Manage Spaces</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Add and edit your venue spaces</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-green-500"
          onClick={() => onNavigate?.('bookings')}
          role="button"
          tabIndex={0}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">View Calendar</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Check your booking schedule</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-purple-500"
          onClick={() => onNavigate?.('calendar')}
          role="button"
          tabIndex={0}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">View Bookings</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage all reservations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BookingsSection({ venue, onNavigate }: { venue: VenueData | null; onNavigate?: (section: string) => void }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [venue]);

  const fetchBookings = async () => {
    if (!venue) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('venueToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Fetch all venue bookings in one request (venue auth)
      const response = await fetch(`${apiUrl}/api/venue/spaces/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch bookings');
      }

      const allBookings = data.data?.bookings || [];
      setBookings(Array.isArray(allBookings) ? allBookings : []);

    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes || '00'} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900">Bookings</CardTitle>
              <CardDescription className="text-gray-600">Manage your venue bookings and reservations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-t-blue-400 animate-pulse"></div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-gray-900">Loading bookings...</p>
              <p className="text-sm text-gray-600">Please wait while we fetch your bookings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-red-200">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900">Bookings</CardTitle>
              <CardDescription className="text-gray-600">Manage your venue bookings and reservations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <CalendarIcon className="h-10 w-10 text-red-600" />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-900">Error Loading Bookings</h3>
              <p className="text-gray-600 max-w-md mx-auto">{error}</p>
            </div>
            <Button 
              onClick={fetchBookings}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-blue-50 border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900">Bookings</CardTitle>
              <CardDescription className="text-gray-600">Manage your venue bookings and reservations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <CalendarIcon className="h-10 w-10 text-gray-400" />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-900">No bookings yet</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Your bookings will appear here once customers start booking your spaces
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                onClick={() => onNavigate?.('spaces')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Promote Your Spaces
              </Button>
              <Button
                variant="outline"
                className="border-gray-300 hover:border-gray-400 px-6 py-2 rounded-lg transition-colors"
                onClick={() => onNavigate?.('profile')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Update Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bookings Header with Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Bookings Management</h2>
              <p className="text-sm text-gray-600">Manage your venue bookings and reservations</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-blue-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Total Bookings:</span>
                <span className="text-lg font-bold text-blue-600">{bookings.length}</span>
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />
              Add Booking
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border p-1">
        <div className="flex flex-col sm:flex-row gap-1">
          {['All', 'Confirmed', 'Pending', 'Cancelled'].map((status) => (
            <Button
              key={status}
              variant="ghost"
              className="flex-1 justify-start sm:justify-center px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Bookings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {bookings.map((booking, index) => (
          <Card key={booking._id || `${booking.spaceId}-${booking.bookingDate}-${booking.startTime}-${index}`} 
                className="bg-white/80 backdrop-blur-sm border hover:shadow-lg transition-all duration-300 overflow-hidden group">
            {/* Card Header with Status */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 border-b">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">{booking.spaceName || 'Unknown Space'}</h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>ID:</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {booking._id ? String(booking._id).slice(-8) : '—'}
                    </span>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Date & Time */}
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{formatDate(booking.bookingDate)}</p>
                  <p className="text-gray-600">
                    {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                  </p>
                </div>
              </div>

              {/* Guest Count */}
              {booking.guestCount && (
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{booking.guestCount} Guests</p>
                    <p className="text-gray-600">Expected attendance</p>
                  </div>
                </div>
              )}

              {/* Amount */}
              {booking.pricing && (
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-green-600 text-lg">
                      ₹{booking.pricing.totalAmount?.toLocaleString('en-IN') || 'N/A'}
                    </p>
                    <p className="text-gray-600">Total amount</p>
                  </div>
                </div>
              )}

              {/* Customer Info */}
              {booking.user && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {(booking.user.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-500">Customer</p>
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{booking.user.name || 'Unknown'}</p>
                  {booking.user.email && (
                    <p className="text-xs text-gray-600">{booking.user.email}</p>
                  )}
                </div>
              )}

              {/* Event Type */}
              {booking.eventType && (
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    {booking.eventType}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-3 border-t">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    Contact
                  </Button>
                </div>
                {booking.status === 'pending' && (
                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-xs">
                    Confirm Booking
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CalendarSection({ venue }: { venue: VenueData | null }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (!venue) return;
    const token = localStorage.getItem('venueToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    setLoading(true);
    
    // Fetch bookings
    fetch(`${apiUrl}/api/venue/spaces/bookings`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data?.bookings)) {
          setBookings(data.data.bookings);
        }
      })
      .catch(() => setBookings([]));

    // Fetch blocked dates
    fetch('/api/venue/spaces/blocked-slots', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data?.spaces)) {
          const allBlockedDates: any[] = [];
          data.data.spaces.forEach((space: any) => {
            if (space.blockedSlots) {
              space.blockedSlots.forEach((block: any) => {
                allBlockedDates.push({
                  date: new Date(block.date),
                  spaceName: space.name,
                  isFullDayBlocked: block.isFullDayBlocked,
                  reason: block.reason,
                  notes: block.notes
                });
              });
            }
          });
          setBlockedDates(allBlockedDates);
        }
      })
      .catch(() => setBlockedDates([]))
      .finally(() => setLoading(false));
  }, [venue]);

  const getPartiallyBookedDates = useMemo(() => {
    const dateSet = new Set<string>();
    const dates: Date[] = [];
    bookings.forEach((b) => {
      if (b?.bookingDate) {
        const d = typeof b.bookingDate === 'string' ? new Date(b.bookingDate) : new Date(b.bookingDate);
        if (!isNaN(d.getTime())) {
          const key = d.toDateString();
          if (!dateSet.has(key)) {
            dateSet.add(key);
            dates.push(d);
          }
        }
      }
    });
    return dates;
  }, [bookings]);

  const getBlockedDatesList = useMemo(() => {
    const dateSet = new Set<string>();
    const dates: Date[] = [];
    blockedDates.forEach((b) => {
      if (b?.date) {
        const d = new Date(b.date);
        if (!isNaN(d.getTime())) {
          const key = d.toDateString();
          if (!dateSet.has(key)) {
            dateSet.add(key);
            dates.push(d);
          }
        }
      }
    });
    return dates;
  }, [blockedDates]);

  const bookingsOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return bookings.filter((b) => {
      if (!b?.bookingDate) return false;
      const bStr = typeof b.bookingDate === 'string' ? b.bookingDate : format(new Date(b.bookingDate), 'yyyy-MM-dd');
      return bStr === dateStr;
    });
  }, [bookings, selectedDate]);

  const blockedOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return blockedDates.filter((b) => {
      if (!b?.date) return false;
      const bStr = format(new Date(b.date), 'yyyy-MM-dd');
      return bStr === dateStr;
    });
  }, [blockedDates, selectedDate]);

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900">Calendar</CardTitle>
              <CardDescription className="text-gray-600">View and manage your booking calendar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
              <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-t-purple-400 animate-pulse"></div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-gray-900">Loading calendar...</p>
              <p className="text-sm text-gray-600">Please wait while we fetch your bookings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Calendar</h2>
              <p className="text-sm text-gray-600">View and manage your booking calendar</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Total Bookings:</span>
            <span className="text-lg font-semibold text-purple-600">{bookings.length}</span>
          </div>
        </div>
      </div>

      {/* Calendar Card */}
      <Card className="bg-white/80 backdrop-blur-sm border">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-6">
            {/* Calendar Component */}
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  modifiers={{
                    partiallyBooked: getPartiallyBookedDates,
                    blocked: getBlockedDatesList,
                  }}
                  modifiersClassNames={{
                    partiallyBooked: "bg-yellow-400 text-yellow-900 hover:bg-yellow-500 hover:text-yellow-950 focus:bg-yellow-400 focus:text-yellow-900 font-semibold",
                    blocked: "bg-red-500 text-white hover:bg-red-600 hover:text-white focus:bg-red-500 focus:text-white font-semibold",
                  }}
                  className="rounded-lg border-0 shadow-sm"
                  classNames={{
                    months: "flex flex-col space-y-4 w-full",
                    month: "space-y-4 w-full",
                    caption: "flex justify-center pt-1 relative items-center px-2",
                    caption_label: "text-sm font-semibold text-gray-900",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-gray-100 rounded-md transition-colors",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex w-full justify-around",
                    head_cell: "text-gray-500 rounded-md w-8 sm:w-9 font-normal text-[0.75rem] sm:text-[0.8rem] flex-1 text-center",
                    row: "flex w-full mt-2 justify-around",
                    cell: "text-center text-sm p-0 relative flex-1 [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal hover:bg-gray-100 rounded-md aria-selected:opacity-100 mx-auto text-sm sm:text-base transition-colors",
                    day_selected: "bg-purple-600 text-white hover:bg-purple-700 hover:text-white focus:bg-purple-600 focus:text-white font-semibold",
                    day_today: "bg-purple-100 text-purple-900 font-semibold border border-purple-200",
                    day_outside: "text-gray-400 opacity-50",
                    day_disabled: "text-gray-400 opacity-50 line-through",
                    day_hidden: "invisible",
                  }}
                />
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500 border border-red-600 shadow-sm" />
                <span className="text-sm font-medium text-gray-700">Blocked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-400 border border-yellow-500 shadow-sm" />
                <span className="text-sm font-medium text-gray-700">Has bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-100 border border-purple-200 shadow-sm" />
                <span className="text-sm font-medium text-gray-700">Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-white border border-gray-300 shadow-sm" />
                <span className="text-sm font-medium text-gray-700">Available</span>
              </div>
            </div>

            {/* Selected Date Bookings */}
            {selectedDate && bookingsOnSelectedDate.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <CalendarIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Bookings on {format(selectedDate, 'PPP')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {bookingsOnSelectedDate.length} booking{bookingsOnSelectedDate.length !== 1 ? 's' : ''} scheduled
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {bookingsOnSelectedDate.map((b, i) => (
                      <div key={b._id || i} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-gray-900">{b.spaceName}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {b.startTime} – {b.endTime}
                              </span>
                              {b.guestCount && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {b.guestCount} guests
                                </span>
                              )}
                            </div>
                          </div>
                          {b.pricing?.totalAmount != null && (
                            <div className="text-right">
                              <p className="text-lg font-semibold text-green-600">
                                ₹{Number(b.pricing.totalAmount).toLocaleString('en-IN')}
                              </p>
                              <p className="text-xs text-gray-500">Total Amount</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Date Blocked Dates */}
            {selectedDate && blockedOnSelectedDate.length > 0 && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200 p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                      <Ban className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Blocked on {format(selectedDate, 'PPP')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {blockedOnSelectedDate.length} block{blockedOnSelectedDate.length !== 1 ? 's' : ''} active
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {blockedOnSelectedDate.map((block, i) => (
                      <div key={i} className="bg-white rounded-lg border border-red-200 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-gray-900">{block.spaceName}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                              {block.isFullDayBlocked ? (
                                <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                  Full Day Blocked
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  Time slots blocked
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                Reason: {block.reason}
                              </span>
                              {block.notes && <span>Notes: {block.notes}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedDate && bookingsOnSelectedDate.length === 0 && blockedOnSelectedDate.length === 0 && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No bookings on {format(selectedDate, 'PPP')}
                </h3>
                <p className="text-gray-600">This date is available for new bookings</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// function EarningsSection({ venue }: { venue: VenueData | null }) {
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Earnings</CardTitle>
//         <CardDescription>
//           Track your revenue and earnings
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         <div className="text-center py-12">
//           <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
//           <h3 className="text-lg font-semibold text-gray-900 mb-2">No earnings yet</h3>
//           <p className="text-gray-600">Your earnings will appear here once you start receiving bookings</p>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }
