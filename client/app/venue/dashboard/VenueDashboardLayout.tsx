"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { 
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Settings,
  Edit,
  FileText,
  BarChart3,
  CheckCircle,
  Star,
  Camera,
  Download,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
  Phone,
  Mail,
  Globe,
  Wifi,
  Car,
  Utensils,
  Shield,
  Music,
  Zap,
  Heart,
  Upload,
  Save,
  X,
  Ban,
  Building,
  Menu,
  ArrowLeft,
  Home,
  Plus,
  ChevronDown
} from "lucide-react";
import KakiMarketingBanner from "@/components/KakiMarketingBanner";
import { toast } from "sonner";
import { format } from "date-fns";
import { useVenueAuth } from "@/hooks/useVenueAuth";
import VenueDetailsManager from "./VenueDetailsManager";
import BlockedSlotsManager from "./BlockedSlotsManager";
import VenueCompletenessAlert from "./VenueCompletenessAlert";
import AddVenueForm from "./AddVenueForm";

interface VenueDashboardLayoutProps {
  venueData: any;
  venues?: any[];
  selectedVenueId?: string | null;
  onSelectVenue?: (id: string) => void;
  onRefreshVenues?: () => void;
  stats: any;
  bookings: any[];
  onSectionUpdate: (section: string, data: any) => Promise<void>;
  onExportBookings: () => void;
}

export default function VenueDashboardLayout({ 
  venueData, 
  venues = [],
  selectedVenueId = null,
  onSelectVenue,
  onRefreshVenues,
  stats, 
  bookings, 
  onSectionUpdate,
  onExportBookings 
}: VenueDashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState("bookings");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [venueDetailsSection, setVenueDetailsSection] = useState<string | null>(null);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Listing details state
  const [editingListing, setEditingListing] = useState(false);
  const [listingData, setListingData] = useState({
    name: venueData?.name || "",
    description: venueData?.description || "",
    capacity: venueData?.capacity || 0,
    pricing: venueData?.pricing?.basePrice || 0,
    facilities: venueData?.facilities || {}
  });
  
  // Settings state
  const [settingsData, setSettingsData] = useState({
    instantBooking: venueData?.instantBooking || false,
    notifications: venueData?.notifications !== false,
    minBookingHours: venueData?.minBookingHours || 2,
    maxAdvanceBookingDays: venueData?.maxAdvanceBookingDays || 90,
    cancellationPolicy: venueData?.cancellationPolicy || "",
    operatingHours: {
      start: "09:00",
      end: "22:00"
    }
  });
  
  const [savingSettings, setSavingSettings] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showAddVenue, setShowAddVenue] = useState(false);
  // FAQs state
  const [faqs, setFaqs] = useState<Array<{ _id?: string; question: string; answer: string; isActive?: boolean; order?: number }>>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [newFaq, setNewFaq] = useState<{ question: string; answer: string }>({ question: '', answer: '' });
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<{ question: string; answer: string; isActive?: boolean; order?: number }>({ question: '', answer: '' });
  
  // Image management state
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>(venueData?.gallery?.map((img: any) => img.url) || []);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sidebarItems = [
    ...(venues.length > 0 ? [{ id: "my-venues" as const, label: "My Venues", icon: Building }] : []),
    { id: "bookings" as const, label: "Bookings", icon: Calendar },
    { id: "calendar" as const, label: "Calendar", icon: Calendar },
    { id: "blocked-slots" as const, label: "Block Dates/Times", icon: Ban },
    { id: "earnings" as const, label: "Earnings", icon: DollarSign },
    { id: "venue-details" as const, label: "Manage Venue Details", icon: Building },
    { id: "faqs" as const, label: "FAQs", icon: FileText },
  ];

  const filteredBookings = bookings.filter(booking => {
    // Exclude pending bookings from dashboard
    if (booking.status === 'pending') {
      return false;
    }
    
    const matchesSearch = (booking.user?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (booking.user?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (booking.user?.phone || '').includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  // FAQs helpers
  const fetchFaqs = async () => {
    try {
      setFaqLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const url = selectedVenueId
        ? `${apiUrl}/api/venue/faqs?venueId=${selectedVenueId}`
        : `${apiUrl}/api/venue/faqs`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFaqs(data.data.faqs || []);
      } else {
        toast.error(data.message || 'Failed to load FAQs');
      }
    } catch (e) {
      console.error('Fetch FAQs error', e);
      toast.error('Failed to load FAQs');
    } finally {
      setFaqLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'faqs' && faqs.length === 0 && !faqLoading) {
      fetchFaqs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const createFaq = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      toast.error('Please enter question and answer');
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const body = selectedVenueId ? { ...newFaq, venueId: selectedVenueId } : newFaq;
      const res = await fetch(`${apiUrl}/api/venue/faqs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFaqs(data.data.faqs || []);
        setNewFaq({ question: '', answer: '' });
        toast.success('FAQ added');
      } else {
        toast.error(data.message || 'Failed to add FAQ');
      }
    } catch (e) {
      console.error('Create FAQ error', e);
      toast.error('Failed to add FAQ');
    }
  };

  const startEditFaq = (f: any) => {
    setEditingFaqId(f._id);
    setEditingFaq({ question: f.question, answer: f.answer, isActive: f.isActive, order: f.order });
  };

  const cancelEditFaq = () => {
    setEditingFaqId(null);
    setEditingFaq({ question: '', answer: '' });
  };

  const saveFaq = async (faqId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const body = selectedVenueId ? { ...editingFaq, venueId: selectedVenueId } : editingFaq;
      const res = await fetch(`${apiUrl}/api/venue/faqs/${faqId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFaqs(data.data.faqs || []);
        setEditingFaqId(null);
        toast.success('FAQ updated');
      } else {
        toast.error(data.message || 'Failed to update FAQ');
      }
    } catch (e) {
      console.error('Update FAQ error', e);
      toast.error('Failed to update FAQ');
    }
  };

  const deleteFaq = async (faqId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const url = selectedVenueId
        ? `${apiUrl}/api/venue/faqs/${faqId}?venueId=${selectedVenueId}`
        : `${apiUrl}/api/venue/faqs/${faqId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFaqs(data.data.faqs || []);
        toast.success('FAQ deleted');
      } else {
        toast.error(data.message || 'Failed to delete FAQ');
      }
    } catch (e) {
      console.error('Delete FAQ error', e);
      toast.error('Failed to delete FAQ');
    }
  };

  const renderFaqsContent = () => (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="text-sm sm:text-base text-gray-600">Add common questions and answers for your venue</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add FAQ</CardTitle>
          <CardDescription>Create a new frequently asked question</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Question</Label>
            <Input value={newFaq.question} onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })} placeholder="Enter question" />
          </div>
          <div>
            <Label>Answer</Label>
            <Textarea value={newFaq.answer} onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })} rows={3} placeholder="Enter answer" />
          </div>
          <div className="flex justify-end">
            <Button onClick={createFaq}>Add FAQ</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing FAQs</CardTitle>
          <CardDescription>{faqLoading ? 'Loading...' : `${faqs.length} item(s)`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqLoading ? (
            <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading FAQs...</div>
          ) : faqs.length === 0 ? (
            <p className="text-gray-500">No FAQs added yet.</p>
          ) : (
            <div className="space-y-4">
              {faqs
                .slice()
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((f) => (
                <div key={f._id} className="border rounded-lg p-3 sm:p-4">
                  {editingFaqId === f._id ? (
                    <div className="space-y-3">
                      <div>
                        <Label>Question</Label>
                        <Input value={editingFaq.question} onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })} />
                      </div>
                      <div>
                        <Label>Answer</Label>
                        <Textarea rows={3} value={editingFaq.answer} onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => saveFaq(f._id!)}>
                          <Save className="h-4 w-4 mr-2" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditFaq}>
                          <X className="h-4 w-4 mr-2" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                        <h3 className="font-medium text-gray-900 flex-1">{f.question}</h3>
                        <div className="flex gap-2 self-end sm:self-start">
                          <Button size="sm" variant="outline" onClick={() => startEditFaq(f)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteFaq(f._id!)}>
                            <X className="h-4 w-4 mr-2" /> Delete
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-line">{f.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDate);
      // Only show confirmed bookings in the calendar
      return bookingDate.toDateString() === date.toDateString() && booking.status === 'confirmed';
    });
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Settings handlers
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await onSectionUpdate('settings', settingsData);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Listing handlers
  const handleSaveListing = async () => {
    try {
      await onSectionUpdate('listing', listingData);
      setEditingListing(false);
      toast.success('Listing updated successfully');
    } catch (error) {
      toast.error('Failed to update listing');
    }
  };

  // Image management handlers
  const handleImageUpload = async (files: FileList) => {
    setUploadingImages(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const newImageUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('folder', 'venues');

        const response = await fetch(`${apiUrl}/api/upload`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (response.ok && data.status === 'success') {
          const uploaded = data?.data?.photo;
          const url = uploaded?.secure_url || uploaded?.url;
          if (url) {
            newImageUrls.push(url);
          }
        } else {
          throw new Error(data.message || 'Upload failed');
        }
      }

      setImageUrls(prev => [...prev, ...newImageUrls]);
      toast.success(`${newImageUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImages = (urlsToRemove: string[]) => {
    setImageUrls(prev => prev.filter(url => !urlsToRemove.includes(url)));
    setSelectedImages([]);
    toast.success(`${urlsToRemove.length} image(s) removed`);
  };

  const handleSaveGallery = async () => {
    try {
      const gallery = imageUrls.map((url, index) => ({
        url,
        caption: '',
        isMain: index === 0
      }));
      
      await onSectionUpdate('gallery', { gallery });
      setShowImageDialog(false);
      toast.success('Gallery updated successfully');
    } catch (error) {
      toast.error('Failed to update gallery');
    }
  };

  const toggleImageSelection = (url: string) => {
    setSelectedImages(prev => 
      prev.includes(url) 
        ? prev.filter(u => u !== url)
        : [...prev, url]
    );
  };

  // Navigate to specific section in venue details
  const handleNavigateToSection = (section: string) => {
    console.log('Navigating to section:', section);
    setActiveTab("venue-details");
    setVenueDetailsSection(section);
    // Scroll to top to see the section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageUpload(files);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
      completed: { color: 'bg-blue-100 text-blue-800', label: 'Completed' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.confirmed;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const renderBookingsContent = () => (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Venue Completeness Alert */}
      <VenueCompletenessAlert 
        venueData={venueData}
        onNavigateToSection={handleNavigateToSection}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">All Bookings</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage and track all venue bookings</p>
        </div>
        <Button onClick={onExportBookings} variant="outline" size="sm" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold">{stats?.totalBookings || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold">{bookings.filter(b => b.status === 'confirmed').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">₹{stats?.totalRevenue?.toLocaleString() || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guests</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div>
                        <p className="font-medium text-gray-900">{booking.user?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{booking.user?.email || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{booking.user?.phone || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(new Date(booking.bookingDate), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.startTime} - {booking.endTime}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900">
                      {booking.guestCount}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium text-gray-900">
                      ₹{booking.pricing?.totalAmount?.toLocaleString() || 'N/A'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      {getStatusBadge(booking.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCalendarContent = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    
    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Calendar View</h1>
          <div className="flex items-center justify-center space-x-2 sm:space-x-4">
            <Button variant="outline" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base sm:text-lg font-semibold min-w-[160px] sm:min-w-[200px] text-center">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <Button variant="outline" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3 sm:mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-semibold text-gray-600 border-b">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} className="p-1 sm:p-2 h-16 sm:h-24"></div>
              ))}
              
              {/* Days of the month */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const dayBookings = getBookingsForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                
                // Check if date is blocked
                const blockedSlot = venueData?.blockedSlots?.find((slot: any) => {
                  const slotDate = new Date(slot.date);
                  return slotDate.toDateString() === date.toDateString();
                });
                const isFullDayBlocked = blockedSlot?.isFullDayBlocked;
                const hasPartialBlock = blockedSlot && !blockedSlot.isFullDayBlocked;
                
                return (
                  <div
                    key={day}
                    className={`p-1 sm:p-2 h-16 sm:h-24 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      isToday ? 'bg-blue-50 border-blue-200' : 
                      isFullDayBlocked ? 'bg-red-50 border-red-300' :
                      hasPartialBlock ? 'bg-orange-50 border-orange-200' :
                      'border-gray-200'
                    }`}
                  >
                    <div className={`text-xs sm:text-sm font-semibold ${
                      isToday ? 'text-blue-600' : 
                      isFullDayBlocked ? 'text-red-600' :
                      hasPartialBlock ? 'text-orange-600' :
                      'text-gray-900'
                    }`}>
                      {day}
                    </div>
                    <div className="mt-1 space-y-1">
                      {isFullDayBlocked && (
                        <div className="text-xs p-1 rounded bg-red-100 text-red-800 truncate">
                          🚫 Blocked
                        </div>
                      )}
                      {hasPartialBlock && (
                        <div className="text-xs p-1 rounded bg-orange-100 text-orange-800 truncate">
                          ⏰ Partial Block
                        </div>
                      )}
                      {/* Show up to two items: prioritize blocks indicator and first booking with time */}
                      {dayBookings.slice(0, isFullDayBlocked || hasPartialBlock ? 1 : 2).map((booking, idx) => (
                        <div
                          key={idx}
                          className={`text-xs p-1 rounded truncate ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {`${booking.startTime || ''}${booking.startTime ? ' - ' : ''}${booking.endTime || ''}`}
                          {` ${booking.user?.name ? `• ${booking.user.name}` : ''}`}
                        </div>
                      ))}
                      {/* Show partial block time ranges if any */}
                      {hasPartialBlock && Array.isArray(blockedSlot?.timeSlots) && blockedSlot.timeSlots.slice(0, 2 - Math.min(dayBookings.length, 2)).map((ts: any, i: number) => (
                        <div key={`blk-${i}`} className="text-xs p-1 rounded bg-orange-100 text-orange-800 truncate">
                          {`${ts.startTime} - ${ts.endTime}`}
                        </div>
                      ))}
                      {dayBookings.length > 2 && !isFullDayBlocked && !hasPartialBlock && (
                        <div className="text-xs text-gray-500">
                          +{dayBookings.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Booking Legend */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Calendar Legend</h3>
            <div className="flex flex-wrap gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                <span className="text-sm">Confirmed Bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
                <span className="text-sm">Fully Blocked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
                <span className="text-sm">Partially Blocked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
                <span className="text-sm">Today</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Note: Only confirmed bookings are shown. Blocked dates prevent online bookings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMyVenuesContent = () => (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Venues</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage all your venue listings</p>
        </div>
        <Button onClick={() => setShowAddVenue(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Venue
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {venues.map((v) => (
          <Card
            key={v._id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedVenueId === v._id ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
            }`}
            onClick={() => onSelectVenue?.(v._id)}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {v.name?.charAt(0) || 'V'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{v.name}</h3>
                    <p className="text-sm text-gray-500">{v.city || v.email}</p>
                    <Badge
                      className={`mt-1 text-xs ${
                        v.approvalStatus === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : v.approvalStatus === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {v.approvalStatus || 'Pending'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedVenueId === v._id && (
                    <Badge variant="outline" className="text-blue-600">Current</Badge>
                  )}
                  <Button
                    size="sm"
                    variant={selectedVenueId === v._id ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVenue?.(v._id);
                    }}
                  >
                    {selectedVenueId === v._id ? 'Managing' : 'Switch'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AddVenueForm
        open={showAddVenue}
        onOpenChange={setShowAddVenue}
        onSuccess={() => onRefreshVenues?.()}
        parentVenue={venueData ? { name: venueData.name, email: venueData.email, phone: venueData.phone } : null}
      />
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "my-venues":
        return renderMyVenuesContent();
      case "bookings":
        return renderBookingsContent();
      case "calendar":
        return renderCalendarContent();
      case "blocked-slots":
        return <BlockedSlotsManager venueId={venueData?._id} selectedVenueId={selectedVenueId} bookings={bookings} />;
      case "faqs":
        return renderFaqsContent();
      case "listing":
        return (
          <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Listing Details</h1>
                <p className="text-gray-600">Manage your venue listing information</p>
              </div>
              {!editingListing && (
                <Button onClick={() => setEditingListing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Listing
                </Button>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Update your venue's basic details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingListing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="venueName">Venue Name</Label>
                        <Input
                          id="venueName"
                          value={listingData.name}
                          onChange={(e) => setListingData({...listingData, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="capacity">Capacity</Label>
                        <Input
                          id="capacity"
                          type="number"
                          value={listingData.capacity}
                          onChange={(e) => setListingData({...listingData, capacity: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        rows={4}
                        value={listingData.description}
                        onChange={(e) => setListingData({...listingData, description: e.target.value})}
                        placeholder="Describe your venue..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="pricing">Base Price (per day)</Label>
                      <Input
                        id="pricing"
                        type="number"
                        value={listingData.pricing}
                        onChange={(e) => setListingData({...listingData, pricing: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveListing}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setEditingListing(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Venue Name</Label>
                        <p className="text-lg font-semibold">{venueData?.name || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Capacity</Label>
                        <p className="text-lg font-semibold">{venueData?.capacity || 0} guests</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Description</Label>
                      <p className="text-gray-900">{venueData?.description || 'No description provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Base Price</Label>
                      <p className="text-lg font-semibold">₹{venueData?.pricing?.basePrice?.toLocaleString() || 0} per day</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Facilities</CardTitle>
                <CardDescription>Available facilities at your venue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'parking', label: 'Parking', icon: Car },
                    { key: 'wifi', label: 'WiFi', icon: Wifi },
                    { key: 'catering', label: 'Catering', icon: Utensils },
                    { key: 'security', label: 'Security', icon: Shield },
                    { key: 'soundSystem', label: 'Sound System', icon: Music },
                    { key: 'lighting', label: 'Lighting', icon: Zap },
                    { key: 'ac', label: 'Air Conditioning', icon: Star },
                    { key: 'petFriendly', label: 'Pet Friendly', icon: Heart }
                  ].map((facility) => {
                    const Icon = facility.icon;
                    const isAvailable = venueData?.facilities?.[facility.key];
                    return (
                      <div key={facility.key} className={`flex items-center gap-2 p-3 rounded-lg border ${
                        isAvailable ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          isAvailable ? 'text-green-600' : 'text-gray-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          isAvailable ? 'text-green-900' : 'text-gray-500'
                        }`}>
                          {facility.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Image Gallery Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Photo Gallery</CardTitle>
                    <CardDescription>Manage your venue photos</CardDescription>
                  </div>
                  <Button onClick={() => setShowImageDialog(true)}>
                    <Camera className="h-4 w-4 mr-2" />
                    Manage Photos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {imageUrls.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {imageUrls.slice(0, 8).map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={url}
                            alt={`Venue photo ${index + 1}`}
                            width={200}
                            height={200}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        {index === 0 && (
                          <Badge className="absolute top-2 left-2 bg-blue-600">
                            Main Photo
                          </Badge>
                        )}
                      </div>
                    ))}
                    {imageUrls.length > 8 && (
                      <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">+{imageUrls.length - 8} more</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
                    <p className="text-gray-500 mb-4">Add photos to showcase your venue</p>
                    <Button onClick={() => setShowImageDialog(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case "earnings":
        return (
          <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Earnings & Analytics</h1>
              <p className="text-gray-600">Track your venue's financial performance</p>
            </div>

            {/* Revenue Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">₹{stats?.totalRevenue?.toLocaleString() || 0}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">+12% from last month</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">This Month</p>
                      <p className="text-2xl font-bold">₹{Math.floor((stats?.totalRevenue || 0) * 0.3).toLocaleString()}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">+8% from last month</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg. Booking Value</p>
                      <p className="text-2xl font-bold">₹{Math.floor((stats?.totalRevenue || 0) / Math.max(stats?.totalBookings || 1, 1)).toLocaleString()}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600">-2% from last month</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Occupancy Rate</p>
                      <p className="text-2xl font-bold">78%</p>
                    </div>
                    <Users className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">+5% from last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Latest booking payments</CardDescription>
                  </div>
                  <Button variant="outline" onClick={onExportBookings}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.filter(b => b.status === 'confirmed').slice(0, 5).map((booking) => (
                    <div key={booking._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{booking.user?.name || 'Guest'}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(booking.bookingDate), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          +₹{booking.pricing?.totalAmount?.toLocaleString() || 0}
                        </p>
                        <p className="text-sm text-gray-500">{booking.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Trends</CardTitle>
                  <CardDescription>Monthly booking performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Confirmed Bookings</span>
                      <span className="font-semibold">{bookings.filter(b => b.status === 'confirmed').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completed Bookings</span>
                      <span className="font-semibold">{bookings.filter(b => b.status === 'completed').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Conversion Rate</span>
                      <span className="font-semibold text-green-600">85%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Repeat Customers</span>
                      <span className="font-semibold">23%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <CardDescription>Revenue sources this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Base Venue Rental</span>
                      <span className="font-semibold">₹{Math.floor((stats?.totalRevenue || 0) * 0.7).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Additional Services</span>
                      <span className="font-semibold">₹{Math.floor((stats?.totalRevenue || 0) * 0.2).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Catering Commission</span>
                      <span className="font-semibold">₹{Math.floor((stats?.totalRevenue || 0) * 0.1).toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Revenue</span>
                      <span className="text-green-600">₹{stats?.totalRevenue?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Venue Settings</h1>
              <p className="text-gray-600">Configure your venue preferences and policies</p>
            </div>

            {/* Booking Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Configuration</CardTitle>
                <CardDescription>Manage how customers can book your venue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Instant Booking</Label>
                    <p className="text-sm text-gray-500">Allow customers to book without approval</p>
                  </div>
                  <Switch
                    checked={settingsData.instantBooking}
                    onCheckedChange={(checked) => setSettingsData({...settingsData, instantBooking: checked})}
                  />
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minBookingHours">Minimum Booking Duration (hours)</Label>
                    <Input
                      id="minBookingHours"
                      type="number"
                      value={settingsData.minBookingHours}
                      onChange={(e) => setSettingsData({...settingsData, minBookingHours: parseInt(e.target.value) || 2})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAdvanceBookingDays">Maximum Advance Booking (days)</Label>
                    <Input
                      id="maxAdvanceBookingDays"
                      type="number"
                      value={settingsData.maxAdvanceBookingDays}
                      onChange={(e) => setSettingsData({...settingsData, maxAdvanceBookingDays: parseInt(e.target.value) || 90})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                  <Textarea
                    id="cancellationPolicy"
                    rows={3}
                    value={settingsData.cancellationPolicy}
                    onChange={(e) => setSettingsData({...settingsData, cancellationPolicy: e.target.value})}
                    placeholder="Describe your cancellation policy..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Operating Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Operating Hours</CardTitle>
                <CardDescription>Set your venue's operating schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Opening Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={settingsData.operatingHours.start}
                      onChange={(e) => setSettingsData({
                        ...settingsData,
                        operatingHours: { ...settingsData.operatingHours, start: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">Closing Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={settingsData.operatingHours.end}
                      onChange={(e) => setSettingsData({
                        ...settingsData,
                        operatingHours: { ...settingsData.operatingHours, end: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage your notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive booking updates via email</p>
                  </div>
                  <Switch
                    checked={settingsData.notifications}
                    onCheckedChange={(checked) => setSettingsData({...settingsData, notifications: checked})}
                  />
                </div>
                
                <div className="space-y-3">
                  <Label className="text-base">Notification Types</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="newBookings" className="rounded" defaultChecked />
                      <Label htmlFor="newBookings" className="text-sm">New booking requests</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="cancellations" className="rounded" defaultChecked />
                      <Label htmlFor="cancellations" className="text-sm">Booking cancellations</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="payments" className="rounded" defaultChecked />
                      <Label htmlFor="payments" className="text-sm">Payment confirmations</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="reminders" className="rounded" />
                      <Label htmlFor="reminders" className="text-sm">Event reminders</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Update your contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPhone">Phone Number</Label>
                    <div className="flex">
                      <Phone className="h-4 w-4 mt-3 mr-2 text-gray-400" />
                      <Input
                        id="contactPhone"
                        value={venueData?.contactInfo?.phone || ""}
                        placeholder="Enter phone number"
                        readOnly
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Email Address</Label>
                    <div className="flex">
                      <Mail className="h-4 w-4 mt-3 mr-2 text-gray-400" />
                      <Input
                        id="contactEmail"
                        type="email"
                        value={venueData?.email || ""}
                        placeholder="Enter email address"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="website">Website (Optional)</Label>
                  <div className="flex">
                    <Globe className="h-4 w-4 mt-3 mr-2 text-gray-400" />
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://your-venue-website.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Settings */}
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? (
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
            </div>
          </div>
        );
      case "venue-details":
        return (
          <VenueDetailsManager 
            venueData={venueData}
            onUpdate={onSectionUpdate}
            initialSection={venueDetailsSection}
            onSectionChange={() => setVenueDetailsSection(null)}
            onBack={() => setActiveTab("bookings")}
          />
        );
      default:
        return renderBookingsContent();
    }
  };

  return (
    <div className="flex h-full flex-col md:flex-row bg-gray-50">
      {/* Mobile Header with Hamburger */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="px-3 py-3 flex items-center justify-between">
          <button
            aria-label="Open menu"
            className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {venueData?.name?.charAt(0) || 'V'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              {venues.length > 1 ? (
                <select
                  value={selectedVenueId || ''}
                  onChange={(e) => onSelectVenue?.(e.target.value)}
                  className="text-sm font-semibold text-gray-900 bg-transparent border-none p-0 focus:ring-0 truncate max-w-full"
                >
                  {venues.map((v) => (
                    <option key={v._id} value={v._id}>{v.name}</option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-semibold text-gray-900 truncate">{venueData?.name || 'Venue Dashboard'}</span>
              )}
              <span className="text-xs text-gray-500">{sidebarItems.find(item => item.id === activeTab)?.label || 'Dashboard'}</span>
            </div>
          </div>
          <div className="w-10 flex-shrink-0" />
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl border-r flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">Venue Dashboard</h2>
                <button
                  aria-label="Close menu"
                  className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md">
                  {venueData?.name?.charAt(0) || 'V'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 truncate">{venueData?.name || 'Venue Name'}</h3>
                  <p className="text-xs text-gray-600 truncate">{venueData?.address?.city || 'City'}</p>
                  <Badge 
                    className={`mt-1 text-xs ${
                      venueData?.approvalStatus === 'approved' 
                        ? 'bg-green-100 text-green-700' 
                        : venueData?.approvalStatus === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {venueData?.approvalStatus || 'Pending'}
                  </Badge>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-3 overflow-y-auto">
              <ul className="space-y-1.5">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all ${
                          isActive 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md transform scale-[1.02]' 
                            : 'text-gray-700 hover:bg-gray-100 active:scale-95'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                        {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg text-gray-700 hover:bg-white transition-colors border border-gray-200"
              >
                <Home className="h-4 w-4" />
                <span className="text-sm font-medium">Back to Home</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Left Sidebar - Desktop */}
      <div className="hidden md:block w-64 bg-white shadow-sm border-r min-h-screen">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
              {venueData?.name?.charAt(0) || 'V'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{venueData?.name || 'Venue Name'}</h2>
              <p className="text-sm text-gray-500">{venueData?.address?.city || 'City'}</p>
            </div>
          </div>
          <Badge 
            className={`mt-3 ${
              venueData?.approvalStatus === 'approved' 
                ? 'bg-green-100 text-green-800' 
                : venueData?.approvalStatus === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {venueData?.approvalStatus || 'Pending'}
          </Badge>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === item.id
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-3 sm:p-6 max-w-7xl mx-auto">
          {/* Venue Switcher - Desktop */}
          {venues.length > 1 && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <Label className="text-sm text-gray-600">Active Venue:</Label>
              <select
                value={selectedVenueId || ''}
                onChange={(e) => onSelectVenue?.(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {venues.map((v) => (
                  <option key={v._id} value={v._id}>{v.name} ({v.approvalStatus || 'pending'})</option>
                ))}
              </select>
            </div>
          )}
          {/* Kaki Marketing Banner */}
          <div className="mb-6">
            <KakiMarketingBanner platform="venue" />
          </div>
          {renderContent()}
        </div>
      </div>

      {/* Image Management Dialog */}
    <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Venue Photos</DialogTitle>
          <DialogDescription>
            Upload, organize, and manage your venue's photo gallery
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Upload Section */}
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors"
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Photos</h3>
              <p className="text-gray-500 mb-4">Drag and drop images here, or click to select files</p>
              <p className="text-xs text-gray-400 mb-4">Supports: JPG, PNG, GIF, WebP (Max 10MB each)</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages}
              >
                {uploadingImages ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Select Images
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Current Images */}
          {imageUrls.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Current Photos ({imageUrls.length})</h3>
                <div className="flex gap-2">
                  {selectedImages.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleRemoveImages(selectedImages)}
                    >
                      Remove Selected ({selectedImages.length})
                    </Button>
                  )}
                  <Button onClick={handleSaveGallery}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Gallery
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div 
                      className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedImages.includes(url) 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      onClick={() => toggleImageSelection(url)}
                    >
                      <Image
                        src={url}
                        alt={`Venue photo ${index + 1}`}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Selection overlay */}
                      {selectedImages.includes(url) && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-blue-600" />
                        </div>
                      )}
                      
                      {/* Main photo badge */}
                      {index === 0 && (
                        <Badge className="absolute top-2 left-2 bg-blue-600">
                          Main Photo
                        </Badge>
                      )}
                    </div>
                    
                    {/* Image actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImages([url]);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Photo Tips</h4>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• The first photo will be used as your main venue image</li>
                      <li>• Use high-quality images (minimum 1200x800 pixels)</li>
                      <li>• Show different angles and areas of your venue</li>
                      <li>• Include photos of amenities and facilities</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}
