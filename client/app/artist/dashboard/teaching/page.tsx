"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Monitor,
  Users,
  Clock,
  IndianRupee,
  Loader2,
  MessageSquare,
  CalendarDays,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";

type TeachingMode = "online" | "offline" | "both";
type ClassLevel = "beginner" | "intermediate" | "advanced" | "all";
type PricingType = "per_session" | "per_month" | "package";
type InquiryStatus = "new" | "contacted" | "confirmed" | "completed" | "cancelled";

interface TeachingClass {
  _id: string;
  title: string;
  description?: string;
  subject?: string;
  level: ClassLevel;
  mode: TeachingMode;
  pricing: {
    amount: number;
    currency: string;
    pricingType: PricingType;
  };
  schedule?: {
    days?: string[];
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
  };
  offlineLocation?: {
    venueName?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
  };
  onlineDetails?: {
    platform?: string;
    platformOther?: string;
    meetingLink?: string;
    instructions?: string;
  };
  maxStudents?: number;
  isActive: boolean;
}

type BookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "refunded";

interface TeachingBooking {
  _id: string;
  studentName: string;
  studentEmail?: string;
  studentPhone: string;
  message?: string;
  mode: "online" | "offline";
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  pricing: { amount: number; currency: string };
  payment?: { paymentStatus: string; amountPaid?: number; paidAt?: string };
  invoiceNumber?: string;
  invoiceUrl?: string;
  classId?: { _id: string; title: string; mode: TeachingMode; subject?: string };
  createdAt: string;
}

interface TeachingInquiry {
  _id: string;
  studentName: string;
  studentEmail?: string;
  studentPhone: string;
  message?: string;
  preferredMode?: "online" | "offline";
  preferredDate?: string;
  status: InquiryStatus;
  notes?: string;
  classId?: { _id: string; title: string; mode: TeachingMode; pricing?: TeachingClass["pricing"] };
  createdAt: string;
}

const emptyClassForm = {
  title: "",
  description: "",
  subject: "",
  level: "all" as ClassLevel,
  mode: "both" as TeachingMode,
  pricing: { amount: "", currency: "INR", pricingType: "per_session" as PricingType },
  schedule: { days: [] as string[], startTime: "", endTime: "", durationMinutes: "" },
  offlineLocation: { venueName: "", address: "", city: "", state: "", pincode: "", landmark: "" },
  onlineDetails: { platform: "zoom", platformOther: "", meetingLink: "", instructions: "" },
  maxStudents: "",
  isActive: true,
};

const emptyInquiryForm = {
  studentName: "",
  studentEmail: "",
  studentPhone: "",
  message: "",
  preferredMode: "" as "" | "online" | "offline",
  preferredDate: "",
  classId: "",
  status: "new" as InquiryStatus,
  notes: "",
};

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const bookingStatusColors: Record<BookingStatus, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
};

const statusColors: Record<InquiryStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const modeLabel = (mode: TeachingMode) =>
  mode === "both" ? "Online & Offline" : mode.charAt(0).toUpperCase() + mode.slice(1);

const pricingLabel = (type: PricingType) =>
  ({ per_session: "per session", per_month: "per month", package: "package" })[type];

export default function TeachingPage() {
  const [activeTab, setActiveTab] = useState("classes");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({ activeClasses: 0, totalInquiries: 0, confirmedBookings: 0, inquiriesByStatus: {} as Record<string, number> });
  const [classes, setClasses] = useState<TeachingClass[]>([]);
  const [inquiries, setInquiries] = useState<TeachingInquiry[]>([]);
  const [bookings, setBookings] = useState<TeachingBooking[]>([]);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TeachingClass | null>(null);
  const [editingInquiry, setEditingInquiry] = useState<TeachingInquiry | null>(null);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [inquiryForm, setInquiryForm] = useState(emptyInquiryForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const getToken = () => localStorage.getItem("artist_token");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [overviewRes, classesRes, inquiriesRes, bookingsRes] = await Promise.all([
        fetch("/api/artist/teaching/overview", { headers }),
        fetch("/api/artist/teaching/classes", { headers }),
        fetch("/api/artist/teaching/inquiries", { headers }),
        fetch("/api/artist/teaching/bookings", { headers }),
      ]);
      if (overviewRes.ok) {
        const d = await overviewRes.json();
        setOverview(d.data || { activeClasses: 0, totalInquiries: 0, confirmedBookings: 0, inquiriesByStatus: {} });
      }
      if (classesRes.ok) {
        const d = await classesRes.json();
        setClasses(d.data?.classes || []);
      }
      if (inquiriesRes.ok) {
        const d = await inquiriesRes.json();
        setInquiries(d.data?.inquiries || []);
      }
      if (bookingsRes.ok) {
        const d = await bookingsRes.json();
        setBookings(d.data?.bookings || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load teaching data");
    } finally {
      setLoading(false);
    }
  };

  const openCreateClass = () => {
    setEditingClass(null);
    setClassForm(emptyClassForm);
    setClassDialogOpen(true);
  };

  const openEditClass = (cls: TeachingClass) => {
    setEditingClass(cls);
    setClassForm({
      title: cls.title,
      description: cls.description || "",
      subject: cls.subject || "",
      level: cls.level,
      mode: cls.mode,
      pricing: {
        amount: cls.pricing?.amount?.toString() ?? "",
        currency: cls.pricing?.currency || "INR",
        pricingType: cls.pricing?.pricingType || "per_session",
      },
      schedule: {
        days: cls.schedule?.days || [],
        startTime: cls.schedule?.startTime || "",
        endTime: cls.schedule?.endTime || "",
        durationMinutes: cls.schedule?.durationMinutes?.toString() ?? "",
      },
      offlineLocation: { ...emptyClassForm.offlineLocation, ...cls.offlineLocation },
      onlineDetails: { ...emptyClassForm.onlineDetails, ...cls.onlineDetails },
      maxStudents: cls.maxStudents?.toString() ?? "",
      isActive: cls.isActive,
    });
    setClassDialogOpen(true);
  };

  const saveClass = async () => {
    if (!classForm.title.trim()) {
      toast.error("Class title is required");
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const url = editingClass
        ? `/api/artist/teaching/classes/${editingClass._id}`
        : "/api/artist/teaching/classes";
      const res = await fetch(url, {
        method: editingClass ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...classForm,
          maxStudents: classForm.maxStudents ? parseInt(classForm.maxStudents) : undefined,
          pricing: {
            ...classForm.pricing,
            amount: classForm.pricing.amount ? parseFloat(classForm.pricing.amount) : 0,
          },
          schedule: {
            ...classForm.schedule,
            durationMinutes: classForm.schedule.durationMinutes
              ? parseInt(classForm.schedule.durationMinutes)
              : undefined,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save class");
      }
      toast.success(editingClass ? "Class updated" : "Class created");
      setClassDialogOpen(false);
      fetchAll();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save class");
    } finally {
      setSaving(false);
    }
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Delete this class?")) return;
    try {
      const token = getToken();
      const res = await fetch(`/api/artist/teaching/classes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Class deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete class");
    }
  };

  const openCreateInquiry = () => {
    setEditingInquiry(null);
    setInquiryForm(emptyInquiryForm);
    setInquiryDialogOpen(true);
  };

  const openEditInquiry = (inq: TeachingInquiry) => {
    setEditingInquiry(inq);
    setInquiryForm({
      studentName: inq.studentName,
      studentEmail: inq.studentEmail || "",
      studentPhone: inq.studentPhone,
      message: inq.message || "",
      preferredMode: inq.preferredMode || "",
      preferredDate: inq.preferredDate ? inq.preferredDate.slice(0, 10) : "",
      classId: typeof inq.classId === "object" ? inq.classId?._id || "" : "",
      status: inq.status,
      notes: inq.notes || "",
    });
    setInquiryDialogOpen(true);
  };

  const saveInquiry = async () => {
    if (!inquiryForm.studentName.trim() || !inquiryForm.studentPhone.trim()) {
      toast.error("Student name and phone are required");
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const payload = {
        ...inquiryForm,
        classId: inquiryForm.classId || undefined,
        preferredDate: inquiryForm.preferredDate || undefined,
        preferredMode: inquiryForm.preferredMode || undefined,
      };
      const url = editingInquiry
        ? `/api/artist/teaching/inquiries/${editingInquiry._id}`
        : "/api/artist/teaching/inquiries";
      const res = await fetch(url, {
        method: editingInquiry ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save inquiry");
      toast.success(editingInquiry ? "Inquiry updated" : "Inquiry added");
      setInquiryDialogOpen(false);
      fetchAll();
    } catch {
      toast.error("Failed to save inquiry");
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setClassForm((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(day)
          ? prev.schedule.days.filter((d) => d !== day)
          : [...prev.schedule.days, day],
      },
    }));
  };

  const updateBookingStatus = async (bookingId: string, status: "completed" | "cancelled") => {
    try {
      const token = getToken();
      const res = await fetch(`/api/artist/teaching/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(status === "completed" ? "Marked as completed" : "Booking cancelled");
      fetchAll();
    } catch {
      toast.error("Failed to update booking");
    }
  };

  const formatBookingDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const downloadInvoice = async (bookingId: string, invoiceNumber?: string) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/artist/teaching/bookings/${bookingId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to download invoice");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoiceNumber || bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download invoice");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Teaching CRM</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage classes, schedules, pricing, and student inquiries for online and offline teaching.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100">
              <GraduationCap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overview.activeClasses}</p>
              <p className="text-sm text-muted-foreground">Active classes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overview.totalInquiries}</p>
              <p className="text-sm text-muted-foreground">Total inquiries</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <CalendarDays className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overview.confirmedBookings || 0}</p>
              <p className="text-sm text-muted-foreground">Confirmed bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overview.inquiriesByStatus?.new || 0}</p>
              <p className="text-sm text-muted-foreground">New inquiries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="classes" className="flex-1 sm:flex-none">Classes</TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1 sm:flex-none">Bookings</TabsTrigger>
            <TabsTrigger value="inquiries" className="flex-1 sm:flex-none">Inquiries</TabsTrigger>
          </TabsList>
          <Button
            size="sm"
            onClick={activeTab === "classes" ? openCreateClass : activeTab === "inquiries" ? openCreateInquiry : undefined}
            className={`w-full sm:w-auto ${activeTab === "bookings" ? "hidden" : ""}`}
          >
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === "classes" ? "Add class" : "Add inquiry"}
          </Button>
        </div>

        <TabsContent value="classes" className="mt-4 space-y-4">
          {classes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No classes yet. Add your first class to start accepting student inquiries.
              </CardContent>
            </Card>
          ) : (
            classes.map((cls) => (
              <Card key={cls._id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">{cls.title}</CardTitle>
                        <Badge variant={cls.isActive ? "default" : "secondary"}>
                          {cls.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{modeLabel(cls.mode)}</Badge>
                      </div>
                      {cls.subject && (
                        <CardDescription className="mt-1">{cls.subject} · {cls.level}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEditClass(cls)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteClass(cls._id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cls.description && (
                    <p className="text-sm text-muted-foreground">{cls.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-4 w-4" />
                      ₹{cls.pricing?.amount?.toLocaleString()} {pricingLabel(cls.pricing?.pricingType || "per_session")}
                    </span>
                    {cls.schedule?.days && cls.schedule.days.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {cls.schedule.days.join(", ")}
                        {cls.schedule.startTime && ` · ${cls.schedule.startTime}`}
                      </span>
                    )}
                    {cls.maxStudents && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Max {cls.maxStudents} students
                      </span>
                    )}
                  </div>
                  {(cls.mode === "offline" || cls.mode === "both") && cls.offlineLocation?.city && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        {[cls.offlineLocation.venueName, cls.offlineLocation.address, cls.offlineLocation.city]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {(cls.mode === "online" || cls.mode === "both") && cls.onlineDetails?.platform && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Monitor className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        {cls.onlineDetails.platform === "other"
                          ? cls.onlineDetails.platformOther
                          : cls.onlineDetails.platform.replace("_", " ")}
                        {cls.onlineDetails.meetingLink && " · Link on file"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4 space-y-4">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No teaching bookings yet. Paid sessions booked from your public profile will appear here.
              </CardContent>
            </Card>
          ) : (
            bookings.map((booking) => (
              <Card key={booking._id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">{booking.studentName}</CardTitle>
                        <Badge className={bookingStatusColors[booking.status]}>{booking.status}</Badge>
                        <Badge variant="outline" className="capitalize">{booking.mode}</Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {formatBookingDate(booking.bookingDate)} · {booking.startTime}–{booking.endTime}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {["confirmed", "completed"].includes(booking.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadInvoice(booking._id, booking.invoiceNumber)}
                        >
                          <FileDown className="h-4 w-4 mr-1" /> Invoice
                        </Button>
                      )}
                      {booking.status === "confirmed" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => updateBookingStatus(booking._id, "completed")}>
                            Mark completed
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => updateBookingStatus(booking._id, "cancelled")}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><span className="font-medium">Phone:</span> {booking.studentPhone}</p>
                  {booking.studentEmail && <p><span className="font-medium">Email:</span> {booking.studentEmail}</p>}
                  {booking.classId && <p><span className="font-medium">Class:</span> {booking.classId.title}</p>}
                  <p className="flex items-center gap-1 font-medium text-green-700">
                    <IndianRupee className="h-4 w-4" />
                    ₹{booking.pricing?.amount?.toLocaleString()}
                    {booking.payment?.paymentStatus === "completed" && " · Paid"}
                  </p>
                  {booking.invoiceNumber && (
                    <p className="text-muted-foreground">Invoice: {booking.invoiceNumber}</p>
                  )}
                  {booking.message && <p className="text-muted-foreground">{booking.message}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="inquiries" className="mt-4 space-y-4">
          {inquiries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No student inquiries yet. They will appear here when students enquire via your profile.
              </CardContent>
            </Card>
          ) : (
            inquiries.map((inq) => (
              <Card key={inq._id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">{inq.studentName}</CardTitle>
                        <Badge className={statusColors[inq.status]}>{inq.status}</Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {inq.studentPhone}
                        {inq.studentEmail && ` · ${inq.studentEmail}`}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEditInquiry(inq)}>
                      <Pencil className="h-4 w-4 mr-1" /> Manage
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {inq.classId && typeof inq.classId === "object" && (
                    <p><span className="font-medium">Class:</span> {inq.classId.title}</p>
                  )}
                  {inq.preferredMode && (
                    <p><span className="font-medium">Preferred mode:</span> {inq.preferredMode}</p>
                  )}
                  {inq.message && <p className="text-muted-foreground">{inq.message}</p>}
                  {inq.notes && (
                    <p className="text-muted-foreground italic">Notes: {inq.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Class dialog */}
      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit class" : "Add class"}</DialogTitle>
            <DialogDescription>
              Set class details, schedule, pricing, and location or online meeting info.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Title *</Label>
                <Input
                  value={classForm.title}
                  onChange={(e) => setClassForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Guitar fundamentals"
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  value={classForm.subject}
                  onChange={(e) => setClassForm((p) => ({ ...p, subject: e.target.value }))}
                />
              </div>
              <div>
                <Label>Level</Label>
                <Select
                  value={classForm.level}
                  onValueChange={(v) => setClassForm((p) => ({ ...p, level: v as ClassLevel }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="all">All levels</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mode *</Label>
                <Select
                  value={classForm.mode}
                  onValueChange={(v) => setClassForm((p) => ({ ...p, mode: v as TeachingMode }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max students</Label>
                <Input
                  type="number"
                  min={1}
                  value={classForm.maxStudents}
                  onChange={(e) => setClassForm((p) => ({ ...p, maxStudents: e.target.value }))}
                  placeholder="e.g. 10"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={classForm.description}
                  onChange={(e) => setClassForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Pricing</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={classForm.pricing.amount}
                    onChange={(e) =>
                      setClassForm((p) => ({
                        ...p,
                        pricing: { ...p.pricing, amount: e.target.value },
                      }))
                    }
                    placeholder="e.g. 500"
                  />
                </div>
                <div>
                  <Label>Pricing type</Label>
                  <Select
                    value={classForm.pricing.pricingType}
                    onValueChange={(v) =>
                      setClassForm((p) => ({
                        ...p,
                        pricing: { ...p.pricing, pricingType: v as PricingType },
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_session">Per session</SelectItem>
                      <SelectItem value="per_month">Per month</SelectItem>
                      <SelectItem value="package">Package</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Schedule</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {DAY_OPTIONS.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    size="sm"
                    variant={classForm.schedule.days.includes(day) ? "default" : "outline"}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Start time</Label>
                  <Input
                    type="time"
                    value={classForm.schedule.startTime}
                    onChange={(e) =>
                      setClassForm((p) => ({
                        ...p,
                        schedule: { ...p.schedule, startTime: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>End time</Label>
                  <Input
                    type="time"
                    value={classForm.schedule.endTime}
                    onChange={(e) =>
                      setClassForm((p) => ({
                        ...p,
                        schedule: { ...p.schedule, endTime: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    min={15}
                    value={classForm.schedule.durationMinutes}
                    onChange={(e) =>
                      setClassForm((p) => ({
                        ...p,
                        schedule: { ...p.schedule, durationMinutes: e.target.value },
                      }))
                    }
                    placeholder="e.g. 60"
                  />
                </div>
              </div>
            </div>

            {(classForm.mode === "offline" || classForm.mode === "both") && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Offline location
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Venue / studio name</Label>
                    <Input
                      value={classForm.offlineLocation.venueName}
                      onChange={(e) =>
                        setClassForm((p) => ({
                          ...p,
                          offlineLocation: { ...p.offlineLocation, venueName: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={classForm.offlineLocation.address}
                      onChange={(e) =>
                        setClassForm((p) => ({
                          ...p,
                          offlineLocation: { ...p.offlineLocation, address: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={classForm.offlineLocation.city}
                      onChange={(e) =>
                        setClassForm((p) => ({
                          ...p,
                          offlineLocation: { ...p.offlineLocation, city: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={classForm.offlineLocation.state}
                      onChange={(e) =>
                        setClassForm((p) => ({
                          ...p,
                          offlineLocation: { ...p.offlineLocation, state: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {(classForm.mode === "online" || classForm.mode === "both") && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Monitor className="h-4 w-4" /> Online details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Platform</Label>
                    <Select
                      value={classForm.onlineDetails.platform}
                      onValueChange={(v) =>
                        setClassForm((p) => ({
                          ...p,
                          onlineDetails: { ...p.onlineDetails, platform: v },
                        }))
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="google_meet">Google Meet</SelectItem>
                        <SelectItem value="teams">Microsoft Teams</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {classForm.onlineDetails.platform === "other" && (
                    <div>
                      <Label>Platform name</Label>
                      <Input
                        value={classForm.onlineDetails.platformOther}
                        onChange={(e) =>
                          setClassForm((p) => ({
                            ...p,
                            onlineDetails: { ...p.onlineDetails, platformOther: e.target.value },
                          }))
                        }
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Label>Meeting link</Label>
                    <Input
                      value={classForm.onlineDetails.meetingLink}
                      onChange={(e) =>
                        setClassForm((p) => ({
                          ...p,
                          onlineDetails: { ...p.onlineDetails, meetingLink: e.target.value },
                        }))
                      }
                      placeholder="Shared with confirmed students"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Instructions</Label>
                    <Textarea
                      value={classForm.onlineDetails.instructions}
                      onChange={(e) =>
                        setClassForm((p) => ({
                          ...p,
                          onlineDetails: { ...p.onlineDetails, instructions: e.target.value },
                        }))
                      }
                      rows={2}
                      placeholder="Join 5 min early, have instrument ready, etc."
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={classForm.isActive}
                onChange={(e) => setClassForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="isActive">List this class on public profile</Label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setClassDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveClass} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingClass ? "Save changes" : "Create class"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inquiry dialog */}
      <Dialog open={inquiryDialogOpen} onOpenChange={setInquiryDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInquiry ? "Manage inquiry" : "Add inquiry"}</DialogTitle>
            <DialogDescription>Track student interest and booking status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={inquiryForm.studentName}
                  onChange={(e) => setInquiryForm((p) => ({ ...p, studentName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={inquiryForm.studentPhone}
                  onChange={(e) => setInquiryForm((p) => ({ ...p, studentPhone: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={inquiryForm.studentEmail}
                  onChange={(e) => setInquiryForm((p) => ({ ...p, studentEmail: e.target.value }))}
                />
              </div>
              <div>
                <Label>Class</Label>
                <Select
                  value={inquiryForm.classId || "none"}
                  onValueChange={(v) => setInquiryForm((p) => ({ ...p, classId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific class</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={inquiryForm.status}
                  onValueChange={(v) => setInquiryForm((p) => ({ ...p, status: v as InquiryStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preferred mode</Label>
                <Select
                  value={inquiryForm.preferredMode || "none"}
                  onValueChange={(v) =>
                    setInquiryForm((p) => ({
                      ...p,
                      preferredMode: v === "none" ? "" : (v as "online" | "offline"),
                    }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preferred date</Label>
                <Input
                  type="date"
                  value={inquiryForm.preferredDate}
                  onChange={(e) => setInquiryForm((p) => ({ ...p, preferredDate: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Message</Label>
                <Textarea
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm((p) => ({ ...p, message: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Internal notes</Label>
                <Textarea
                  value={inquiryForm.notes}
                  onChange={(e) => setInquiryForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <Button variant="outline" onClick={() => setInquiryDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveInquiry} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
