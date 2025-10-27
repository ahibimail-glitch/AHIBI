"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  MapPin,
  Users,
  Car,
  Snowflake,
  Heart,
  UtensilsCrossed,
  Accessibility,
  Camera,
  Star,
  MoreVertical,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  Music,
  Zap,
  Shield,
  Wifi,
  XCircle,
  Building2,
  BarChart3,
  Download,
  Edit,
  Filter,
  Search,
  Upload,
  FileText,
  Eye,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Info,
  Save,
  X,
  ImagePlus,
} from "lucide-react";
import Image from "next/image";
import Footer from "@/app/Footer";
import Navbar from "@/app/Navbar";
import { toast } from "sonner";
import { format } from "date-fns";
import { useVenueAuth } from "@/hooks/useVenueAuth";

export default function VenueDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useVenueAuth();
  const [loading, setLoading] = useState(true);
  const [venueData, setVenueData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarBookings, setCalendarBookings] = useState<any[]>([]);
  const [editedVenueData, setEditedVenueData] = useState<any>(null);
  const [settingsData, setSettingsData] = useState<any>({
    phone: '',
    email: '',
    instantBooking: false,
    notifications: true,
    minBookingHours: 2,
    maxAdvanceBookingDays: 90,
    cancellationPolicy: ''
  });
  
  // Booking action form state
  const [bookingAction, setBookingAction] = useState({
    status: "",
    rejectionReason: "",
    venueNotes: ""
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/venue/auth/login');
      return;
    }
    if (user) {
      fetchVenueData();
      fetchStats();
      fetchBookings();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (venueData?.gallery) {
      setPhotoUrls(venueData.gallery.map((g: any) => g.url));
    }
    if (venueData) {
      setEditedVenueData({ ...venueData });
      setSettingsData({
        phone: venueData.contactInfo?.phone || '',
        email: venueData.email || '',
        instantBooking: venueData.instantBooking || false,
        notifications: venueData.notifications !== false,
        minBookingHours: venueData.minBookingHours || 2,
        maxAdvanceBookingDays: venueData.maxAdvanceBookingDays || 90,
        cancellationPolicy: venueData.cancellationPolicy || ''
      });
    }
  }, [venueData]);

  const fetchVenueData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setVenueData(data.data.venue);
      }
    } catch (error) {
      console.error('Error fetching venue data:', error);
      toast.error('Failed to load venue data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
        setUpcomingBookings(data.data.upcomingBookings);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/bookings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBookings(data.data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        },
        body: JSON.stringify(venueData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Profile updated successfully');
        setVenueData(data.data.venue);
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleBookingAction = async (bookingId: string, status: string, reason?: string) => {
    setUpdating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        },
        body: JSON.stringify({ 
          status, 
          rejectionReason: reason,
          venueNotes: '' 
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Booking ${status} successfully`);
        fetchBookings();
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to update booking');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    } finally {
      setUpdating(false);
    }
  };

  const exportBookings = () => {
    const csvContent = [
      ['Name', 'Phone', 'Email', 'Date', 'Start Time', 'End Time', 'Duration', 'Guests', 'Event Type', 'Amount', 'Status', 'Booked At'].join(','),
      ...bookings.map(booking => {
        const amount = booking.pricing?.totalAmount || 'N/A';
        return [
          booking.user?.name || 'N/A',
          booking.user?.phone || 'N/A',
          booking.user?.email || 'N/A',
          format(new Date(booking.bookingDate), 'yyyy-MM-dd'),
          booking.startTime,
          booking.endTime,
          booking.duration,
          booking.guestCount,
          booking.eventType || 'N/A',
          amount,
          booking.status,
          format(new Date(booking.createdAt), 'yyyy-MM-dd HH:mm')
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${venueData?.name.replace(/\s+/g, '-')}-bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
      completed: { color: 'bg-blue-100 text-blue-800', label: 'Completed' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = (booking.user?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (booking.user?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (booking.user?.phone || '').includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  

  const handleRemovePhoto = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        // Backend expects field name 'photo'
        formData.append('photo', file);
        // Optional folder to organize uploads
        formData.append('folder', 'venues');

        const response = await fetch(`${apiUrl}/api/upload`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
          throw new Error(data.message || 'Upload failed');
        }
        const uploaded = data?.data?.photo;
        const url = uploaded?.secure_url || uploaded?.url;
        if (url) {
          setPhotoUrls(prev => [...prev, url]);
        }
      }
      toast.success('Photos uploaded successfully');
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSavePhotos = async () => {
    setUpdating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const gallery = photoUrls.map((url, index) => ({
        url,
        caption: '',
        isMain: index === 0
      }));

      const response = await fetch(`${apiUrl}/api/venue/manager/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        },
        body: JSON.stringify({ gallery })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Photos updated successfully');
        setShowPhotoDialog(false);
        fetchVenueData();
      } else {
        toast.error(data.message || 'Failed to update photos');
      }
    } catch (error) {
      console.error('Error updating photos:', error);
      toast.error('Failed to update photos');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateListingDetails = async () => {
    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        },
        body: JSON.stringify(editedVenueData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Listing details updated successfully');
        setVenueData(data.data.venue);
        setEditedVenueData(data.data.venue);
      } else {
        toast.error(data.message || 'Failed to update listing');
      }
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async () => {
    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        },
        body: JSON.stringify({
          email: settingsData.email,
          contactInfo: { phone: settingsData.phone },
          instantBooking: settingsData.instantBooking,
          notifications: settingsData.notifications,
          minBookingHours: settingsData.minBookingHours,
          maxAdvanceBookingDays: settingsData.maxAdvanceBookingDays,
          cancellationPolicy: settingsData.cancellationPolicy
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Settings updated successfully');
        fetchVenueData();
      } else {
        toast.error(data.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDate);
      return bookingDate.toDateString() === date.toDateString();
    });
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!venueData) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <p>Failed to load venue data</p>
      </div>
    );
  }
  const facilities = [
    { id: "parking", label: "Parking Available", icon: Car },
    { id: "ac", label: "AC Available", icon: Snowflake },
    { id: "petFriendly", label: "Pet Friendly", icon: Heart },
    { id: "catering", label: "Catering", icon: UtensilsCrossed },
    { id: "accessible", label: "Wheelchair Accessible", icon: Accessibility },
    { id: "wifi", label: "WiFi", icon: Wifi },
    { id: "soundSystem", label: "Sound System", icon: Music },
    { id: "lighting", label: "Lighting", icon: Zap },
    { id: "security", label: "Security", icon: Shield },
    { id: "alcohol", label: "Alcohol Allowed", icon: Star },
  ];

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <Navbar />
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Venue Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Verified Venue
            </Badge>
            <Button variant="outline" size="sm">
              View Public Listing
            </Button>
          </div>
        </div>

        {/* Venue Profile Header */}
        <Card className="mb-8 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6">
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1.5 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium text-foreground">
                    {venueData.rating?.average || 0}
                  </span>
                  ({stats?.totalBookings || 0} bookings)
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1.5" />
                  {venueData.address?.city}, {venueData.address?.state}
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1.5" />
                  Up to {venueData.capacity} guests
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-3">{venueData.name}</h2>
              <p className="text-muted-foreground mb-4">
                {venueData.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {facilities
                  .filter((f) => venueData.facilities?.[f.id])
                  .map((facility) => (
                    <Badge
                      key={facility.id}
                      variant="secondary"
                      className="flex items-center"
                    >
                      <facility.icon className="h-3.5 w-3.5 mr-1.5" />
                      {facility.label}
                    </Badge>
                  ))}
              </div>
            </div>
            <div className="relative min-h-[250px] md:min-h-0">
              {venueData.gallery && venueData.gallery.length > 0 ? (
                <Image
                  src={venueData.gallery[0].url || "/images/placeholder.jpg"}
                  alt={venueData.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Camera className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setShowPhotoDialog(true)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Edit Photos
              </Button>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="bookings">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="listing">Listing Details</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>All Bookings</CardTitle>
                    <CardDescription>Manage and track all venue bookings</CardDescription>
                  </div>
                  <Button onClick={exportBookings} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bookings Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Guests</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            No bookings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBookings.map((booking) => (
                          <TableRow key={booking._id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{booking.user?.name || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{booking.user?.email || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{booking.user?.phone || 'N/A'}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{format(new Date(booking.bookingDate), 'PPP')}</p>
                                <p className="text-sm text-muted-foreground">
                                  {booking.startTime} - {booking.endTime} ({booking.duration}h)
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{booking.eventType || 'N/A'}</TableCell>
                            <TableCell>{booking.guestCount}</TableCell>
                            <TableCell className="font-medium">₹{booking.pricing?.totalAmount || 0}</TableCell>
                            <TableCell>{getStatusBadge(booking.status)}</TableCell>
                            <TableCell className="text-right">
                              {booking.status === 'pending' && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBookingAction(booking._id, 'confirmed')}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive"
                                    onClick={() => {
                                      const reason = prompt('Enter rejection reason:');
                                      if (reason) handleBookingAction(booking._id, 'rejected', reason);
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {booking.status !== 'pending' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedBooking(booking)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Booking Calendar</CardTitle>
                    <CardDescription>View and manage your venue's booking schedule</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={previousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[140px] text-center">
                      {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4">
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {(() => {
                      const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
                      const days = [];
                      
                      // Empty cells for days before month starts
                      for (let i = 0; i < startingDayOfWeek; i++) {
                        days.push(<div key={`empty-${i}`} className="aspect-square" />);
                      }
                      
                      // Days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const date = new Date(year, month, day);
                        const dayBookings = getBookingsForDate(date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        
                        days.push(
                          <div
                            key={day}
                            className={`aspect-square border rounded-lg p-2 ${
                              isToday ? 'border-primary bg-primary/5' : 'border-border'
                            } ${dayBookings.length > 0 ? 'bg-green-50' : ''}`}
                          >
                            <div className="text-sm font-medium mb-1">{day}</div>
                            {dayBookings.length > 0 && (
                              <div className="space-y-1">
                                {dayBookings.slice(0, 2).map((booking, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs bg-green-600 text-white rounded px-1 py-0.5 truncate"
                                    title={`${booking.eventType} - ${booking.user?.name}`}
                                  >
                                    {booking.startTime}
                                  </div>
                                ))}
                                {dayBookings.length > 2 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{dayBookings.length - 2} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      return days;
                    })()}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary bg-primary/5 rounded" />
                    <span>Today</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-50 border rounded" />
                    <span>Has Bookings</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listing">
            <Card>
              <CardHeader>
                <CardTitle>Venue Listing Details</CardTitle>
                <CardDescription>
                  Update the public information about your venue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {editedVenueData && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Core Details</h3>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="venueName">Venue Name</Label>
                          <Input
                            id="venueName"
                            value={editedVenueData.name || ''}
                            onChange={(e) => setEditedVenueData({ ...editedVenueData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="capacity">Capacity (Max Guests)</Label>
                          <Input
                            id="capacity"
                            type="number"
                            value={editedVenueData.capacity || ''}
                            onChange={(e) => setEditedVenueData({ ...editedVenueData, capacity: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={editedVenueData.description || ''}
                          onChange={(e) => setEditedVenueData({ ...editedVenueData, description: e.target.value })}
                          rows={5}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Pricing</h3>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="basePrice">Base Price (₹ per day)</Label>
                          <Input
                            id="basePrice"
                            type="number"
                            value={editedVenueData.pricing?.basePrice || ''}
                            onChange={(e) => setEditedVenueData({
                              ...editedVenueData,
                              pricing: { ...editedVenueData.pricing, basePrice: parseInt(e.target.value) }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hourlyRate">Hourly Rate (₹ per hour)</Label>
                          <Input
                            id="hourlyRate"
                            type="number"
                            value={editedVenueData.pricing?.hourlyRate || ''}
                            onChange={(e) => setEditedVenueData({
                              ...editedVenueData,
                              pricing: { ...editedVenueData.pricing, hourlyRate: parseInt(e.target.value) }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Facilities & Amenities</h3>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {facilities.map((facility) => (
                          <div key={facility.id} className="flex items-center space-x-3">
                            <Checkbox
                              id={facility.id}
                              checked={editedVenueData.facilities?.[facility.id] || false}
                              onCheckedChange={(checked) => setEditedVenueData({
                                ...editedVenueData,
                                facilities: { ...editedVenueData.facilities, [facility.id]: checked }
                              })}
                            />
                            <Label
                              htmlFor={facility.id}
                              className="font-normal flex items-center cursor-pointer"
                            >
                              <facility.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                              {facility.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={handleUpdateListingDetails} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Earnings & Payouts</CardTitle>
                <CardDescription>Track your income and manage payouts.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">₹{stats?.totalRevenue || 0}</div>
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        All time earnings
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
                      <p className="text-xs text-muted-foreground">Confirmed bookings</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">This Month</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.monthlyBookings || 0}</div>
                      <p className="text-xs text-muted-foreground">Bookings this month</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg. Booking</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ₹{stats?.totalBookings > 0 ? Math.round(stats.totalRevenue / stats.totalBookings) : 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Per booking</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Transaction History</h3>
                    <Button variant="outline" size="sm" onClick={exportBookings}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Event Type</TableHead>
                          <TableHead>Booking Date</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {confirmedBookings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              No transactions yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          confirmedBookings.slice(0, 10).map((booking) => (
                            <TableRow key={booking._id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{booking.user?.name || 'N/A'}</p>
                                  <p className="text-sm text-muted-foreground">{booking.user?.phone || 'N/A'}</p>
                                </div>
                              </TableCell>
                              <TableCell>{booking.eventType || 'Event'}</TableCell>
                              <TableCell>{format(new Date(booking.bookingDate), 'PPP')}</TableCell>
                              <TableCell>{booking.duration}h</TableCell>
                              <TableCell>{getStatusBadge(booking.status)}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                ₹{booking.pricing?.totalAmount || 0}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Venue Settings</CardTitle>
                <CardDescription>
                  Manage your contact details and booking preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <h3 className="font-medium">Contact Information</h3>
                  <Separator/>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="settingsPhone">Contact Phone</Label>
                      <Input
                        id="settingsPhone"
                        placeholder="+91 9876543210"
                        value={settingsData.phone}
                        onChange={(e) => setSettingsData({ ...settingsData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settingsEmail">Contact Email</Label>
                      <Input
                        id="settingsEmail"
                        type="email"
                        placeholder="contact@venue.com"
                        value={settingsData.email}
                        onChange={(e) => setSettingsData({ ...settingsData, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Booking Preferences</h3>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="instantBooking" className="font-normal">
                          Instant Booking
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Allow customers to book without approval
                        </p>
                      </div>
                      <Checkbox
                        id="instantBooking"
                        checked={settingsData.instantBooking}
                        onCheckedChange={(checked) => setSettingsData({ ...settingsData, instantBooking: !!checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notifications" className="font-normal">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive emails for new booking requests
                        </p>
                      </div>
                      <Checkbox
                        id="notifications"
                        checked={settingsData.notifications}
                        onCheckedChange={(checked) => setSettingsData({ ...settingsData, notifications: !!checked })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Booking Rules</h3>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minBookingHours">Minimum Booking Hours</Label>
                      <Input
                        id="minBookingHours"
                        type="number"
                        min="1"
                        value={settingsData.minBookingHours}
                        onChange={(e) => setSettingsData({ ...settingsData, minBookingHours: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Minimum hours required per booking</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxAdvanceBookingDays">Advance Booking Limit (Days)</Label>
                      <Input
                        id="maxAdvanceBookingDays"
                        type="number"
                        min="1"
                        value={settingsData.maxAdvanceBookingDays}
                        onChange={(e) => setSettingsData({ ...settingsData, maxAdvanceBookingDays: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">How far in advance customers can book</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Cancellation Policy</h3>
                  <Separator />
                  <div className="space-y-2">
                    <Textarea
                      id="cancellationPolicy"
                      placeholder="Enter your cancellation policy..."
                      rows={4}
                      value={settingsData.cancellationPolicy}
                      onChange={(e) => setSettingsData({ ...settingsData, cancellationPolicy: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be shown to customers during booking
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleUpdateSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Photo Management Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Venue Photos</DialogTitle>
            <DialogDescription>
              Add or remove photos for your venue. The first photo will be used as the main image.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current Photos */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Current Photos</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="relative aspect-video rounded-lg overflow-hidden border">
                      <Image
                        src={url}
                        alt={`Venue photo ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      {index === 0 && (
                        <Badge className="absolute top-2 left-2 bg-blue-600">
                          Main Photo
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemovePhoto(index)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {photoUrls.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No photos added yet
                  </div>
                )}
              </div>
            </div>

            {/* Upload from Device */}
            <div className="space-y-2">
              <Label>Upload from Device</Label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                  disabled={uploadingPhotos}
                >
                  {uploadingPhotos ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Choose Photos from Device
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload photos directly from your device. Multiple files supported.
              </p>
            </div>



            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPhotoDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePhotos} disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Photos'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}