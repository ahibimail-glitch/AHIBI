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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Building2,
  Music,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  Settings,
  Bell,
  Shield,
  Activity,
  Eye,
  Search,
  Plus,
  Clock,
  Ticket,
  UserCheck,
  CalendarCheck2,
  ListOrdered,
  PlusCircle,
  Upload,
} from "lucide-react";

// --- Helper function for sidebar button styling ---
const SidebarButton = ({ icon: Icon, label, active, ...props }) => (
  <Button
    variant={active ? "secondary" : "ghost"}
    className="w-full justify-start"
    {...props}
  >
    <Icon className="mr-2 h-4 w-4" />
    {label}
  </Button>
);

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  // --- Sample Data ---
  const stats = [
    {
      title: "Total Users",
      value: "15,847",
      icon: Users,
      change: "+12.5%",
      color: "text-blue-600",
    },
    {
      title: "Active Events",
      value: "342",
      icon: Calendar,
      change: "+8.2%",
      color: "text-green-600",
    },
    {
      title: "Registered Venues",
      value: "1,256",
      icon: Building2,
      change: "+15.3%",
      color: "text-purple-600",
    },
    {
      title: "Artists",
      value: "2,891",
      icon: Music,
      change: "+20.1%",
      color: "text-orange-600",
    },
    {
      title: "Monthly Revenue",
      value: "₹4,67,890",
      icon: DollarSign,
      change: "+25.7%",
      color: "text-emerald-600",
    },
    {
      title: "Tickets Sold",
      value: "12,456",
      icon: Ticket,
      change: "+18.9%",
      color: "text-red-600",
    },
  ];

  const pendingApprovals = [
    {
      id: 1,
      type: "Organizer",
      name: "Mumbai Events Co.",
      email: "contact@mumbaiEvents.com",
      date: "2025-07-15",
    },
    {
      id: 2,
      type: "Artist",
      name: "The Fusion Collective",
      email: "booking@fusionband.com",
      date: "2025-07-14",
    },
    {
      id: 3,
      type: "Venue",
      name: "Grand Ballroom Delhi",
      email: "manager@grandballroom.in",
      date: "2025-07-13",
    },
    {
      id: 4,
      type: "Event",
      name: "Tech Summit 2025",
      email: "organizer@techsummit.com",
      date: "2025-07-12",
    },
    {
      id: 5,
      type: "Artist",
      name: "Acoustic Wonders",
      email: "contact@acoustic.com",
      date: "2025-07-11",
    },
    {
      id: 6,
      type: "Venue",
      name: "The Seaside Amphitheatre",
      email: "events@seaside.com",
      date: "2025-07-10",
    },
  ];

  const allUsers = [
    {
      id: "usr_1",
      name: "Aarav Sharma",
      email: "aarav.sharma@example.com",
      mobile: "9876543210",
      createdOn: "2025-01-20",
    },
    {
      id: "usr_2",
      name: "Diya Patel",
      email: "diya.patel@example.com",
      mobile: "9876543211",
      createdOn: "2025-02-15",
    },
    {
      id: "usr_3",
      name: "Rohan Kumar",
      email: "rohan.kumar@example.com",
      mobile: "9876543212",
      createdOn: "2025-03-10",
    },
    {
      id: "usr_4",
      name: "Priya Singh",
      email: "priya.singh@example.com",
      mobile: "9876543213",
      createdOn: "2025-04-05",
    },
    {
      id: "usr_5",
      name: "Vikram Reddy",
      email: "vikram.reddy@example.com",
      mobile: "9876543214",
      createdOn: "2025-05-25",
    },
    {
      id: "usr_6",
      name: "Anjali Gupta",
      email: "anjali.gupta@example.com",
      mobile: "9876543215",
      createdOn: "2025-06-30",
    },
  ];

  const allBookings = [
    {
      id: "bk_1",
      eventName: "Tech Summit 2025",
      userName: "Aarav Sharma",
      bookingDate: "2025-07-01",
      status: "Confirmed",
    },
    {
      id: "bk_2",
      eventName: "Annual Music Festival",
      userName: "Diya Patel",
      bookingDate: "2025-07-02",
      status: "Confirmed",
    },
    {
      id: "bk_3",
      eventName: "Food Carnival",
      userName: "Rohan Kumar",
      bookingDate: "2025-07-03",
      status: "Pending",
    },
    {
      id: "bk_4",
      eventName: "Art Exhibition",
      userName: "Priya Singh",
      bookingDate: "2025-07-04",
      status: "Cancelled",
    },
    {
      id: "bk_5",
      eventName: "Tech Summit 2025",
      userName: "Vikram Reddy",
      bookingDate: "2025-07-05",
      status: "Confirmed",
    },
  ];

  // --- Filtered Data ---
  const filteredUsers = allUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.mobile.includes(searchQuery)
  );

  // --- Reusable Components ---

  const ApprovalList = ({ type }) => {
    const items = pendingApprovals.filter((p) => p.type === type);
    const icons = {
      Organizer: UserCheck,
      Artist: Music,
      Venue: Building2,
      Event: CalendarCheck2,
    };
    const Icon = icons[type];

    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icon className="h-5 w-5 mr-2 text-blue-600" /> {type} Approvals (
            {items.length})
          </CardTitle>
          <CardDescription>
            Review and approve new {type.toLowerCase()} submissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg border hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">{item.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Submitted on {item.date}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" /> Review
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive">
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">
              No pending {type.toLowerCase()} approvals.
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const CreateEventForm = () => {
    const [eventData, setEventData] = useState({
      eventName: "",
      description: "",
      venue: "",
      startDate: "",
      endDate: "",
      category: "",
      ticketPrice: "",
      capacity: "",
    });

    const handleChange = (e) => {
      const { id, value } = e.target;
      setEventData((prev) => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (value) => {
      setEventData((prev) => ({ ...prev, category: value }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      console.log("Submitting New Event:", eventData);
      alert(`Event "${eventData.eventName}" created successfully!`);
      // Reset form and navigate away
      setEventData({
        eventName: "",
        description: "",
        venue: "",
        startDate: "",
        endDate: "",
        category: "",
        ticketPrice: "",
        capacity: "",
      });
      setActiveView("dashboard");
    };

    return (
      <form onSubmit={handleSubmit}>
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Create New Event</CardTitle>
            <CardDescription>
              Fill in the details below to add a new event to the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name</Label>
                <Input
                  id="eventName"
                  value={eventData.eventName}
                  onChange={handleChange}
                  placeholder="e.g., Annual Tech Conference"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={eventData.venue}
                  onChange={handleChange}
                  placeholder="e.g., City Convention Center"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Event Description</Label>
              <Textarea
                id="description"
                value={eventData.description}
                onChange={handleChange}
                placeholder="Describe the event..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date & Time</Label>
                <Input
                  id="startDate"
                  value={eventData.startDate}
                  onChange={handleChange}
                  type="datetime-local"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date & Time</Label>
                <Input
                  id="endDate"
                  value={eventData.endDate}
                  onChange={handleChange}
                  type="datetime-local"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  onValueChange={handleSelectChange}
                  value={eventData.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="tech">Technology</SelectItem>
                    <SelectItem value="art">Art & Culture</SelectItem>
                    <SelectItem value="food">Food & Drink</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticketPrice">Ticket Price (₹)</Label>
                <Input
                  id="ticketPrice"
                  value={eventData.ticketPrice}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g., 500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  value={eventData.capacity}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g., 2000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-poster">Event Poster</Label>
              <Input
                id="event-poster"
                type="file"
                className="file:text-blue-700 file:font-semibold"
              />
              <p className="text-xs text-gray-500">
                Upload an image for the event (e.g., JPG, PNG).
              </p>
            </div>
          </CardContent>
          <CardContent className="text-right">
            <Button type="submit">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Event
            </Button>
          </CardContent>
        </Card>
      </form>
    );
  };

  // --- Dynamic Content Renderer ---
  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
              {stats.map((stat) => (
                <Card
                  key={stat.title}
                  className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600">
                          {stat.title}
                        </p>
                        <p className="text-3xl font-bold text-gray-900">
                          {stat.value}
                        </p>
                        <div className="flex items-center">
                          <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                          <span className="text-sm font-medium text-green-600">
                            {stat.change}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200`}
                      >
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Welcome back!</CardTitle>
                  <CardDescription>
                    Here's a quick overview of your platform.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>
                    Select a view from the sidebar to manage different aspects
                    of the platform.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />{" "}
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Jump right into your tasks.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Button onClick={() => setActiveView("users")}>
                    <Users className="mr-2 h-4 w-4" /> Manage Users
                  </Button>
                  <Button onClick={() => setActiveView("bookings")}>
                    <ListOrdered className="mr-2 h-4 w-4" /> View Bookings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveView("organizer-approvals")}
                  >
                    <UserCheck className="mr-2 h-4 w-4" /> Organizer Approvals
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveView("artist-approvals")}
                  >
                    <Music className="mr-2 h-4 w-4" /> Artist Approvals
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        );
      case "organizer-approvals":
        return <ApprovalList type="Organizer" />;
      case "artist-approvals":
        return <ApprovalList type="Artist" />;
      case "venue-approvals":
        return <ApprovalList type="Venue" />;
      case "event-approvals":
        return <ApprovalList type="Event" />;
      case "users":
        return (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <div className="flex space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, email, or mobile..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Add User
                  </Button>
                </div>
              </div>
              <CardDescription>
                View, manage, and search for users on the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile Number</TableHead>
                    <TableHead>Account Created On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.mobile}</TableCell>
                      <TableCell>{user.createdOn}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      case "bookings":
        return (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>
                A complete log of all event bookings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Booking Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.eventName}
                      </TableCell>
                      <TableCell>{booking.userName}</TableCell>
                      <TableCell>{booking.bookingDate}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            booking.status === "Confirmed"
                              ? "default"
                              : booking.status === "Cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {booking.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      case "create-event":
        return <CreateEventForm />;
      default:
        return <div>Select a view</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* --- Sidebar --- */}
      <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 fixed h-full flex flex-col p-4 shadow-sm z-10">
        <div className="flex items-center space-x-3 mb-6 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ahibi Admin</h2>
            <p className="text-xs text-gray-600">Control Center</p>
          </div>
        </div>

        <nav className="flex flex-col space-y-2">
          <SidebarButton
            icon={LayoutDashboard}
            label="Dashboard"
            active={activeView === "dashboard"}
            onClick={() => setActiveView("dashboard")}
          />
          <SidebarButton
            icon={ListOrdered}
            label="Bookings"
            active={activeView === "bookings"}
            onClick={() => setActiveView("bookings")}
          />
          <SidebarButton
            icon={Users}
            label="Users"
            active={activeView === "users"}
            onClick={() => setActiveView("users")}
          />

          <div className="pt-4 pb-2 px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">
              Approvals
            </h3>
          </div>
          <SidebarButton
            icon={UserCheck}
            label="Organizers"
            active={activeView === "organizer-approvals"}
            onClick={() => setActiveView("organizer-approvals")}
          />
          <SidebarButton
            icon={Music}
            label="Artists"
            active={activeView === "artist-approvals"}
            onClick={() => setActiveView("artist-approvals")}
          />
          <SidebarButton
            icon={Building2}
            label="Venues"
            active={activeView === "venue-approvals"}
            onClick={() => setActiveView("venue-approvals")}
          />
          <SidebarButton
            icon={CalendarCheck2}
            label="Events"
            active={activeView === "event-approvals"}
            onClick={() => setActiveView("event-approvals")}
          />

          <div className="pt-4 pb-2 px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">
              System
            </h3>
          </div>
          <SidebarButton
            icon={PlusCircle}
            label="New Event"
            active={activeView === "create-event"}
            onClick={() => setActiveView("create-event")}
          />
          <SidebarButton
            icon={BarChart3}
            label="Analytics"
            active={activeView === "analytics"}
            onClick={() => setActiveView("analytics")}
          />
          <SidebarButton
            icon={Settings}
            label="Settings"
            active={activeView === "settings"}
            onClick={() => setActiveView("settings")}
          />
        </nav>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 ml-64 bg-gradient-to-br from-gray-50 to-blue-50">
        <header className="bg-white/60 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {activeView.replace("-", " ")}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 border-green-200"
                >
                  <Activity className="h-3 w-3 mr-1" /> System Healthy
                </Badge>
                <Button variant="outline" size="icon">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">{renderContent()}</div>
      </main>
    </div>
  );
}
