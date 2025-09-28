"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { 
  Building2, 
  Users, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Download,
  Filter,
  Search,
  Settings,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AikoHallData {
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  contactPerson: {
    name: string;
    phone: string[];
    email: string;
  };
  maxCapacity: number;
  minBookingHours: number;
  facilities: {
    inHouseCatering: boolean;
    parking: boolean;
    soundSystem: boolean;
    stage: boolean;
    powerBackup: boolean;
    accommodation: boolean;
    airConditioned: boolean;
  };
  adminSettings: {
    capacity: number;
    facilities: any;
    terms: string;
    minBookingHours: number;
    pricePerHour: number;
  };
  totalBookings: number;
  totalRevenue: number;
  venueCategory: string;
  inHouseEventManager: boolean;
  externalVendorsAllowed: boolean;
  marketingWithAhibi: boolean;
  advancePayment: boolean;
  bookingTerms: string;
  notes: string;
}

interface Booking {
  _id: string;
  user: {
    name: string;
    phone: string;
    email: string;
  };
  bookingDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  guestCount: number;
  specialNotes?: string;
  status: string;
  rejectionReason?: string;
  adminNotes?: string;
  bookedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}

interface BookingStats {
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  rejectedBookings: number;
  completedBookings: number;
  upcomingBookings: number;
}

interface SettingsForm {
  capacity: number;
  minBookingHours: number;
  pricePerHour: number;
  terms: string;
  contactPerson: { name: string; phone: string[] };
  address: { street: string };
  facilities: {
    inHouseCatering: boolean;
    parking: boolean;
    soundSystem: boolean;
    stage: boolean;
    powerBackup: boolean;
    accommodation: boolean;
    airConditioned: boolean;
  };
  venueCategory: string;
  inHouseEventManager: boolean;
  externalVendorsAllowed: boolean;
  marketingWithAhibi: boolean;
  advancePayment: boolean;
  maxCapacity: number;
}

const facilityKeys = [
  'inHouseCatering',
  'parking',
  'soundSystem',
  'stage',
  'powerBackup',
  'accommodation',
  'airConditioned'
] as const;

const additionalServiceKeys = [
  'inHouseEventManager',
  'externalVendorsAllowed',
  'marketingWithAhibi',
  'advancePayment'
] as const;

export default function AikoHallManagement() {
  const [aikoHallData, setAikoHallData] = useState<AikoHallData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  // Settings form state
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    capacity: 0,
    minBookingHours: 0,
    pricePerHour: 0,
    terms: "",
    contactPerson: { name: '', phone: [] },
    address: { street: '' },
    facilities: {
      inHouseCatering: false,
      parking: false,
      soundSystem: false,
      stage: false,
      powerBackup: false,
      accommodation: false,
      airConditioned: false
    },
    venueCategory: '',
    inHouseEventManager: false,
    externalVendorsAllowed: false,
    marketingWithAhibi: false,
    advancePayment: false,
    maxCapacity: 0
  });

  // Booking action form state
  const [bookingAction, setBookingAction] = useState({
    status: "",
    rejectionReason: "",
    adminNotes: ""
  });

  useEffect(() => {
    const token = localStorage.getItem('aiko_admin_token');
    if (token) {
      setIsLoggedIn(true);
      fetchData();
    } else {
      setLoading(false); 
    }
  }, []);

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      const response = await fetch('/api/aiko/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('aiko_admin_token', data.data.token);
        setIsLoggedIn(true);
        toast.success('Login successful');
        fetchData();
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login.');
    } finally {
      setLoggingIn(false);
    }
  };

  const fetchData = async () => {
    setLoading(true); 
    try {
      await Promise.all([
        fetchAikoHallData(),
        fetchBookings(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAikoHallData = async () => {
    try {
      const token = localStorage.getItem('aiko_admin_token');
      const response = await fetch('/api/aiko', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAikoHallData(data.data);
        setSettingsForm({
          capacity: data.data.adminSettings.capacity,
          minBookingHours: data.data.adminSettings.minBookingHours,
          pricePerHour: data.data.adminSettings.pricePerHour,
          terms: data.data.adminSettings.terms,
          facilities: data.data.adminSettings.facilities,
          contactPerson: data.data.contactPerson,
          address: data.data.address,
          venueCategory: data.data.venueCategory,
          inHouseEventManager: data.data.inHouseEventManager,
          externalVendorsAllowed: data.data.externalVendorsAllowed,
          marketingWithAhibi: data.data.marketingWithAhibi,
          advancePayment: data.data.advancePayment,
          // Redundant fields are removed from the form state
          maxCapacity: data.data.maxCapacity, // This is now set by 'capacity'
          // bookingTerms: data.data.bookingTerms, // This is now set by 'terms'
          // notes: data.data.notes, // This is now set by 'terms'
        });
      }
    } catch (error) {
      console.error('Error fetching Aiko Hall data:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('aiko_admin_token');
      const response = await fetch('/api/aiko/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('aiko_admin_token');
      const response = await fetch('/api/aiko/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleUpdateSettings = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('aiko_admin_token');
      const response = await fetch('/api/aiko/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          adminSettings: {
            capacity: settingsForm.capacity,
            minBookingHours: settingsForm.minBookingHours,
            pricePerHour: settingsForm.pricePerHour,
            terms: settingsForm.terms,
            facilities: settingsForm.facilities,
          },
          contactPerson: settingsForm.contactPerson,
          address: settingsForm.address,
          venueCategory: settingsForm.venueCategory,
          inHouseEventManager: settingsForm.inHouseEventManager,
          externalVendorsAllowed: settingsForm.externalVendorsAllowed,
          marketingWithAhibi: settingsForm.marketingWithAhibi,
          advancePayment: settingsForm.advancePayment,
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Settings updated successfully');
        setShowSettingsDialog(false);
        fetchAikoHallData();
      } else {
        toast.error(data.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setUpdating(false);
    }
  };

  const handleBookingAction = async () => {
    if (!selectedBooking || !bookingAction.status) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem('aiko_admin_token');
      const response = await fetch(`/api/aiko/bookings/${selectedBooking._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingAction)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Booking ${bookingAction.status} successfully`);
        setShowBookingDialog(false);
        setSelectedBooking(null);
        setBookingAction({ status: "", rejectionReason: "", adminNotes: "" });
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
      ['Name', 'Phone', 'Email', 'Date', 'Start Time', 'End Time', 'Duration', 'Guests', 'Status', 'Booked At'].join(','),
      ...bookings.map(booking => [
        booking.user?.name || 'N/A',
        booking.user?.phone || 'N/A',
        booking.user?.email || 'N/A',
        format(new Date(booking.bookingDate), 'yyyy-MM-dd'),
        booking.startTime,
        booking.endTime,
        booking.duration,
        booking.guestCount,
        booking.status,
        format(new Date(booking.bookedAt), 'yyyy-MM-dd HH:mm')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiko-hall-bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!isLoggedIn) { return ( <Dialog open={true}> <DialogContent className="sm:max-w-md"> <DialogHeader> <DialogTitle>Admin Login</DialogTitle> </DialogHeader> <div className="space-y-4"> <div> <Label>Email</Label> <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter admin email" /> </div> <div> <Label>Password</Label> <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" /> </div> <Button className="w-full" onClick={handleLogin} disabled={loggingIn}> {loggingIn ? "Logging in..." : "Login"} </Button> </div> </DialogContent> </Dialog> ); }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Aiko Hall Management</h2>
          <p className="text-gray-600">Manage bookings and settings for Aiko Hall</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportBookings} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Venue Settings</DialogTitle>
                <DialogDescription>
                  Update all details for Aiko Hall.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium text-lg border-b pb-2">Core Details</h4>
                    <div>
                      <Label htmlFor="capacity">Maximum Capacity (Admin)</Label>
                      <Input id="capacity" type="number" value={settingsForm.capacity} onChange={(e) => setSettingsForm({ ...settingsForm, capacity: parseInt(e.target.value) })} />
                    </div>
                    <div>
                      <Label htmlFor="minHours">Minimum Booking Hours (Admin)</Label>
                      <Input id="minHours" type="number" value={settingsForm.minBookingHours} onChange={(e) => setSettingsForm({ ...settingsForm, minBookingHours: parseInt(e.target.value) })} />
                    </div>
                    <div>
                      <Label htmlFor="pricePerHour">Price Per Hour (INR)</Label>
                      <Input id="pricePerHour" type="number" value={settingsForm.pricePerHour} onChange={(e) => setSettingsForm({ ...settingsForm, pricePerHour: parseInt(e.target.value) })} />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium text-lg border-b pb-2">Contact & Address</h4>
                    <div>
                      <Label>Contact Person Name</Label>
                      <Input value={settingsForm.contactPerson.name} onChange={(e) => setSettingsForm({ ...settingsForm, contactPerson: { ...settingsForm.contactPerson, name: e.target.value }})} />
                    </div>
                    <div>
                      <Label>Contact Phone (comma-separated)</Label>
                      <Input value={settingsForm.contactPerson.phone.join(', ')} onChange={(e) => setSettingsForm({ ...settingsForm, contactPerson: { ...settingsForm.contactPerson, phone: e.target.value.split(',').map(p => p.trim()) }})} />
                    </div>
                     <div>
                      <Label>Street</Label>
                      <Input value={settingsForm.address.street} onChange={(e) => setSettingsForm({ ...settingsForm, address: { ...settingsForm.address, street: e.target.value }})} />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Facilities & Amenities</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 p-4 border rounded-lg">
                    {facilityKeys.map((key) => (
                      <label key={key} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          checked={settingsForm.facilities[key] || false}
                          onChange={(e) => setSettingsForm({ 
                            ...settingsForm, 
                            facilities: { ...settingsForm.facilities, [key]: e.target.checked } 
                          })} 
                        />
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="terms">Admin Booking Terms & Notes</Label>
                  <Textarea id="terms" value={settingsForm.terms} onChange={(e) => setSettingsForm({ ...settingsForm, terms: e.target.value })} rows={4} />
                </div>

                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium text-lg border-b pb-2">Venue Properties</h4>
                  <div>
                    <Label htmlFor="venueCategory">Venue Category</Label>
                    <Input id="venueCategory" value={settingsForm.venueCategory} onChange={(e) => setSettingsForm({ ...settingsForm, venueCategory: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium text-lg border-b pb-2">Additional Services</h4>
                    {additionalServiceKeys.map((key) => (
                      <div key={key} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id={key}
                          checked={settingsForm[key] || false}
                          onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.checked })} 
                        />
                        <Label htmlFor={key} className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                      </div>
                    ))}
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>Cancel</Button>
                  <Button onClick={handleUpdateSettings} disabled={updating}>
                    {updating ? 'Updating...' : 'Save All Settings'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBookings}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingBookings}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.upcomingBookings}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Venue Information */}
          {aikoHallData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Venue Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Contact Person:</strong> {aikoHallData.contactPerson.name}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Phone:</strong> {aikoHallData.contactPerson.phone.join(', ')}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Address:</strong> {aikoHallData.address.street}, {aikoHallData.address.city}, {aikoHallData.address.state} - {aikoHallData.address.pincode}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Venue Details</h4>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Max Capacity:</strong> {aikoHallData.adminSettings.capacity} guests
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Min Booking:</strong> {aikoHallData.adminSettings.minBookingHours} hours
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Total Bookings:</strong> {aikoHallData.totalBookings}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Bookings ({filteredBookings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{booking.user?.name || 'Unknown User'}</div>
                            <div className="text-sm text-gray-500">{booking.user?.phone || 'No phone'}</div>
                            <div className="text-sm text-gray-500">{booking.user?.email || 'No email'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {format(new Date(booking.bookingDate), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {booking.startTime} - {booking.endTime}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{booking.duration} hours</TableCell>
                        <TableCell>{booking.guestCount}</TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setBookingAction({
                                status: booking.status,
                                rejectionReason: booking.rejectionReason || "",
                                adminNotes: booking.adminNotes || ""
                              });
                              setShowBookingDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking Calendar</CardTitle>
              <CardDescription>View all bookings in calendar format</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="multiple"
                selected={bookings
                  .filter(b => b.status === 'approved' || b.status === 'pending')
                  .map(b => new Date(b.bookingDate))
                }
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Booking Action Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Booking</DialogTitle>
            <DialogDescription>
              Update booking status and add notes
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <p className="text-sm font-medium">{selectedBooking.user?.name || 'Unknown User'}</p>
                  <p className="text-sm text-gray-500">{selectedBooking.user?.phone || 'No phone'}</p>
                </div>
                <div>
                  <Label>Event Details</Label>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedBooking.bookingDate), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedBooking.startTime} - {selectedBooking.endTime}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={bookingAction.status} onValueChange={(value) => setBookingAction({
                  ...bookingAction,
                  status: value
                })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bookingAction.status === 'rejected' && (
                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason</Label>
                  <Textarea
                    id="rejectionReason"
                    value={bookingAction.rejectionReason}
                    onChange={(e) => setBookingAction({
                      ...bookingAction,
                      rejectionReason: e.target.value
                    })}
                    rows={3}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={bookingAction.adminNotes}
                  onChange={(e) => setBookingAction({
                    ...bookingAction,
                    adminNotes: e.target.value
                  })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBookingAction} disabled={updating}>
                  {updating ? 'Updating...' : 'Update Booking'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
