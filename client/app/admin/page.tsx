"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutDashboard,
  Users,
  Building2,
  Music,
  BarChart3,
  Settings,
  Shield,
  Activity,
  UserCheck,
  CalendarCheck2,
  ListOrdered,
  PlusCircle,
  Bell,
  Calendar,
  DollarSign,
  Ticket,
  QrCode,
  ImageIcon,
  Plus,
} from "lucide-react";

// Import child components
import Dashboard from "./components/Dashboard";
import UsersComponent from "./components/Users";
import Bookings from "./components/Bookings";
import Organizers from "./components/Organizers";
import Artists from "./components/Artists";
import Venues from "./components/Venues";
import Events from "./components/Events";
import System from "./components/System";
import CreateEventForm from "./components/CreateEventForm";
import Analytics from "./components/Analytics";
import SettingsComponent from "./components/Settings";
import ApprovedEvents from "./components/ApprovedEvents";
import HeroImages from "./components/HeroImages";
import FC25Players from "./components/FC25Players";
import FailedPayments from "./components/FailedPayments";

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

// --- Main Admin Dashboard Component ---
export default function AdminDashboard() {
  const router = useRouter();
  
  // Redirect to login if not authenticated or missing required data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("admin_token");
      const adminId = localStorage.getItem("admin_id");
      
      if (!token || !adminId) {
        // Clear any partial/invalid auth data
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_id");
        router.replace("/admin/login");
      }
    }
  }, [router]);

  const [activeView, setActiveView] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  // --- Mock Data (replace with API calls) ---
  const stats = [
    { title: "Total Users", value: "15,847", icon: Users, change: "+12.5%", color: "text-blue-600" },
    { title: "Active Events", value: "342", icon: Calendar, change: "+8.2%", color: "text-green-600" },
    { title: "Registered Venues", value: "1,256", icon: Building2, change: "+15.3%", color: "text-purple-600" },
    { title: "Artists", value: "2,891", icon: Music, change: "+20.1%", color: "text-orange-600" },
    { title: "Monthly Revenue", value: "₹4,67,890", icon: DollarSign, change: "+25.7%", color: "text-emerald-600" },
    { title: "Tickets Sold", value: "12,456", icon: Ticket, change: "+18.9%", color: "text-red-600" },
  ];

  const allUsers = [
    { id: "usr_1", name: "Aarav Sharma", email: "aarav.sharma@example.com", mobile: "9876543210", createdOn: "2025-01-20" },
    { id: "usr_2", name: "Diya Patel", email: "diya.patel@example.com", mobile: "9876543211", createdOn: "2025-02-15" },
    { id: "usr_3", name: "Rohan Kumar", email: "rohan.kumar@example.com", mobile: "9876543212", createdOn: "2025-03-10" },
  ];

  const filteredUsers = allUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.mobile.includes(searchQuery)
  );

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard stats={stats} setActiveView={setActiveView} />;
      case "fc25-players":
        return <FC25Players />;
      case "organizer-approvals":
        return <Organizers />;
      case "artist-approvals":
        return <Artists />;
      case "venue-approvals":
        return <Venues />;
      case "event-approvals":
        return <Events />;
      case "approved-events":
        return <ApprovedEvents />;
      case "users":
        return <UsersComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} users={filteredUsers} />;
      case "bookings":
        return <Bookings />;
      case "create-event":
        return <CreateEventForm onSuccess={() => setActiveView("dashboard")} />;
      case "analytics":
        return <Analytics />;
      case "settings":
        return <SettingsComponent />;
      case "failed-payments":
        return <FailedPayments />;
      case "system":
        return <System />;
      case "hero-images":
        return <HeroImages />;
      case "qr-scanner":
        router.push("/admin/scan");
        return null;
      case "manual-booking":
        router.push("/admin/booking");
        return null;
      default:
        return <Dashboard stats={stats} setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* --- Sidebar --- */}
      <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 fixed h-full flex flex-col p-4 shadow-sm z-10 overflow-y-auto">
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
          <SidebarButton icon={LayoutDashboard} label="Dashboard" active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} />
          <SidebarButton icon={ListOrdered} label="Bookings" active={activeView === "bookings"} onClick={() => setActiveView("bookings")} />
          <SidebarButton icon={Users} label="Users" active={activeView === "users"} onClick={() => setActiveView("users")} />
          <SidebarButton icon={ListOrdered} label="FC25 Players" active={activeView === "fc25-players"} onClick={() => setActiveView("fc25-players")} />
          <SidebarButton icon={QrCode} label="QR Scanner" active={activeView === "qr-scanner"} onClick={() => setActiveView("qr-scanner")} />
          <SidebarButton icon={Ticket} label="Manual Booking" active={activeView === "manual-booking"} onClick={() => router.push("/admin/booking")} />
          <SidebarButton icon={DollarSign} label="Failed Payments" active={activeView === "failed-payments"} onClick={() => setActiveView("failed-payments")} />

          <div className="pt-4 pb-2 px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Approvals</h3>
          </div>
          <SidebarButton icon={UserCheck} label="Organizers" active={activeView === "organizer-approvals"} onClick={() => setActiveView("organizer-approvals")} />
          <SidebarButton icon={Music} label="Artists" active={activeView === "artist-approvals"} onClick={() => setActiveView("artist-approvals")} />
          <SidebarButton icon={Building2} label="Venues" active={activeView === "venue-approvals"} onClick={() => setActiveView("venue-approvals")} />
          <SidebarButton icon={CalendarCheck2} label="Pending Events" active={activeView === "event-approvals"} onClick={() => setActiveView("event-approvals")} />
          <SidebarButton 
            icon={CalendarCheck2} 
            label="Approved Events" 
            active={activeView === "approved-events"} 
            onClick={() => setActiveView("approved-events")} 
          />

          <div className="pt-4 pb-2 px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">System</h3>
          </div>
          <SidebarButton icon={PlusCircle} label="New Event" active={activeView === "create-event"} onClick={() => setActiveView("create-event")} />
          <SidebarButton icon={ImageIcon} label="Hero Images" active={activeView === "hero-images"} onClick={() => setActiveView("hero-images")} />
          <SidebarButton icon={BarChart3} label="Analytics" active={activeView === "analytics"} onClick={() => setActiveView("analytics")} />
          <SidebarButton icon={Settings} label="Settings" active={activeView === "settings"} onClick={() => setActiveView("settings")} />
          <SidebarButton icon={Shield} label="System Health" active={activeView === "system"} onClick={() => setActiveView("system")} />
        </nav>

        <div className="mt-auto">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h4 className="font-bold text-blue-800">Need Help?</h4>
              <p className="text-xs text-blue-700 mt-1">Check our documentation or contact support.</p>
              <Button size="sm" className="w-full mt-3 bg-blue-600 hover:bg-blue-700">Get Support</Button>
            </CardContent>
          </Card>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 ml-64 bg-gradient-to-br from-gray-50 to-blue-50">
        <header className="bg-white/60 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">{activeView.replace(/-/g, " ")}</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  <Activity className="h-3 w-3 mr-1" /> System Healthy
                </Badge>
                <Button variant="outline" size="icon"><Bell className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
