"use client";

import { useState, useEffect, useRef } from "react";
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
  Star,
  Bell,
  Calendar,
  DollarSign,
  Ticket,
  QrCode,
  ImageIcon,
  Plus,
  Bike,
  Package,
  Menu,
  X,
  Video,
  Heart,
  FileText,
} from "lucide-react";

// Import child components
import Dashboard from "./components/Dashboard";
import UsersComponent from "./components/Users";
import Bookings from "./components/Bookings";
import Artists from "./components/Artists";
import Events from "./components/Events";
import OrganizerManagement from "./components/OrganizerManagement";
import System from "./components/System";
import CreateEventForm from "./components/CreateEventForm";
import Analytics from "./components/Analytics";
import SettingsComponent from "./components/Settings";
import ApprovedEvents from "./components/ApprovedEvents";
import HeroImages from "./components/HeroImages";
import EventsHeroImages from "./components/EventsHeroImages";
import FC25Players from "./components/FC25Players";
import FailedPayments from "./components/FailedPayments";
import AnnieMusicalBookings from "./components/AnnieMusicalBookings";
import AnnieMusicalQrScanner from "./components/AnnieMusicalQrScanner";
import AnnieManualBooking from "./components/AnnieManualBooking";
import AnnieFailedBookings from "./components/AnnieFailedBookings";
import NISRegistrations from "./components/NISRegistrations";
import BikerBash from "./components/BikerBash";
import Coupons from "./components/Coupons";
import MelitaBookings from "./components/MelitaBookings";
import FeaturedEvents from "./components/FeaturedEvents";
import ArtistManagement from "./components/ArtistManagement";
import VenueManagement from "./components/VenueManagement";

import MerchOrders from "./components/MerchOrders";
import HeliTaxiiLeads from "./components/HeliTaxiiLeads";
import HmfTickets from "./components/HmfTickets";
import HFTickets from "./components/HFTickets";
import ScheduleEvent from "./components/ScheduleEvent";
import KakiMarketingSettings from "./components/KakiMarketingSettings";
import DanceLeagueRegistrations from "./components/DanceLeagueRegistrations";
import AdminLivestreamPage from "./livestream/page";
import Donations from "./components/Donations";
import AdminNotifications from "./components/AdminNotifications";
import TermsManager from "./components/TermsManager";
// import AikoHallManagement from "../allVenues/aiko-hall/adminDashboard.tsx/page";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const lastUnreadCountRef = useRef<number | null>(null);

  useEffect(() => {
    let intervalId: number | undefined;

    const playNotificationSound = () => {
      try {
        if (typeof window === "undefined") return;

        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.4);

        oscillator.onended = () => {
          try {
            audioContext.close();
          } catch {
            // ignore
          }
        };
      } catch {
        // ignore
      }
    };

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        if (!token) return;

        const res = await fetch(`/api/admin/notifications/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;
        const data = await res.json();
        const totalUnread = data?.data?.totalUnread;
        if (typeof totalUnread === "number") {
          const previous = lastUnreadCountRef.current;
          if (previous !== null && totalUnread > previous) {
            playNotificationSound();
          }

          lastUnreadCountRef.current = totalUnread;
          setUnreadNotificationCount(totalUnread);
        }
      } catch {
        // ignore
      }
    };

    if (typeof window !== "undefined") {
      fetchUnreadCount();
      intervalId = window.setInterval(fetchUnreadCount, 300000);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

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
      case "organizer-management":
        return <OrganizerManagement />;
      case "artist-approvals":
        return <Artists />;
      case "artist-management":
        return <ArtistManagement />;
      case "venue-management":
        return <VenueManagement />;
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
      case "events-hero-images":
        return <EventsHeroImages />;
      case "qr-scanner":
        router.push("/admin/scan");
        return null;
      case "manual-booking":
        router.push("/admin/booking");
        return null;
      case "annie-musical-bookings":
        return <AnnieMusicalBookings />;
      case "annie-musical-qr":
        return <AnnieMusicalQrScanner />;
      case "annie-manual-booking":
        return <AnnieManualBooking />;
      case "annie-failed-bookings":
        return <AnnieFailedBookings />;
      case "nis-registrations":
        return <NISRegistrations />;
      case "bikerbash":
        return <BikerBash />;
      case "coupons":
        return <Coupons />;
      case "melita-bookings":
        return <MelitaBookings />;
      case "featured-events":
        return <FeaturedEvents />;
      case "hmf-tickets":
        return <HmfTickets />;
      case "hf-tickets":
        return <HFTickets />;
      case "merch-orders":
        return <MerchOrders />;
      case "helitaxii-leads":
        return <HeliTaxiiLeads />;
      case "schedule-event":
        return <ScheduleEvent />;
      case "kaki-marketing":
        return <KakiMarketingSettings />;
      case "dance-league":
        return <DanceLeagueRegistrations />;
      case "live-streaming":
        return <AdminLivestreamPage/>
      case "donations":
        return <Donations />;
      case "notifications":
        return <AdminNotifications />;
      case "terms":
        return <TermsManager />;
      // case "aiko-hall":
      //   return <AikoHallManagement />;
      default:
        return <Dashboard stats={stats} setActiveView={setActiveView} />;
    }
  };

  // Special full-width layout without sidebar for Annie Musical QR view
  if (activeView === "annie-musical-qr") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white/60 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 capitalize">{activeView.replace(/-/g, " ")}</h1>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
                <Badge variant="secondary" className="hidden sm:flex bg-green-100 text-green-800 border-green-200">
                  <Activity className="h-3 w-3 mr-1" /> System Healthy
                </Badge>
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10"><Bell className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="p-4 md:p-8">
            <AnnieMusicalQrScanner />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
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
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Ahibi Admin</h2>
              <p className="text-xs text-gray-600">Control Center</p>
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

        <nav className="flex flex-col space-y-2">
          <SidebarButton icon={LayoutDashboard} label="Dashboard" active={activeView === "dashboard"} onClick={() => { setActiveView("dashboard"); setSidebarOpen(false); }} />
          {/* <SidebarButton icon={Bell} label="Notifications" active={activeView === "notifications"} onClick={() => { setActiveView("notifications"); setSidebarOpen(false); }} /> */}
          <SidebarButton icon={ListOrdered} label="Bookings" active={activeView === "bookings"} onClick={() => { setActiveView("bookings"); setSidebarOpen(false); }} />
          <SidebarButton icon={Users} label="Users" active={activeView === "users"} onClick={() => { setActiveView("users"); setSidebarOpen(false); }} />
          <SidebarButton icon={QrCode} label="QR Scanner" active={activeView === "qr-scanner"} onClick={() => { setActiveView("qr-scanner"); setSidebarOpen(false); }} />

          <SidebarButton icon={Ticket} label="Manual Booking" active={activeView === "manual-booking"} onClick={() => { router.push("/admin/booking"); setSidebarOpen(false); }} />
          <SidebarButton icon={DollarSign} label="Failed Payments" active={activeView === "failed-payments"} onClick={() => { setActiveView("failed-payments"); setSidebarOpen(false); }} />
      
      
          <div className="pt-4 pb-2 px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Approvals</h3>
          </div>
          <SidebarButton icon={UserCheck} label="Organizer Management" active={activeView === "organizer-management"} onClick={() => { setActiveView("organizer-management"); setSidebarOpen(false); }} />
          <SidebarButton icon={Music} label="Artist Approvals" active={activeView === "artist-approvals"} onClick={() => { setActiveView("artist-approvals"); setSidebarOpen(false); }} />
          <SidebarButton icon={Music} label="Artist Management" active={activeView === "artist-management"} onClick={() => { setActiveView("artist-management"); setSidebarOpen(false); }} />
          <SidebarButton icon={Building2} label="Venue Management" active={activeView === "venue-management"} onClick={() => { setActiveView("venue-management"); setSidebarOpen(false); }} />
          {/* Sports Integration */}
          <SidebarButton
            icon={UserCheck}
            label="Sports Partners"
            active={false}
            onClick={() => { router.push('/admin/sports/partners'); setSidebarOpen(false); }}
          />
          <SidebarButton
            icon={Building2}
            label="Sports Management"
            active={false}
            onClick={() => { router.push('/admin/sports/management'); setSidebarOpen(false); }}
          />
          <SidebarButton icon={Video} label="Live Streaming" active={activeView === "live-streaming"} onClick={() => { setActiveView("live-streaming"); setSidebarOpen(false); }} />

          <div className="pt-4 pb-2 px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Events</h3>
          </div>
          <SidebarButton icon={Calendar} label="Schedule Event" active={activeView === "schedule-event"} onClick={() => { setActiveView("schedule-event"); setSidebarOpen(false); }} />
          <SidebarButton icon={PlusCircle} label="New Event" active={activeView === "create-event"} onClick={() => { setActiveView("create-event"); setSidebarOpen(false); }} />
          <SidebarButton icon={CalendarCheck2} label="Pending Events" active={activeView === "event-approvals"} onClick={() => { setActiveView("event-approvals"); setSidebarOpen(false); }} />
          
          <SidebarButton
            icon={CalendarCheck2}
            label="Approved Events"
            active={activeView === "approved-events"}
            onClick={() => { setActiveView("approved-events"); setSidebarOpen(false); }}
          />
          <SidebarButton
            icon={Star}
            label="Featured Events"
            active={activeView === "featured-events"}
            onClick={() => { setActiveView("featured-events"); setSidebarOpen(false); }}
          />

          <div className="pt-4 pb-2 px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Special Events</h3>
          </div>
          <SidebarButton icon={Music} label="Dance League" active={activeView === "dance-league"} onClick={() => { setActiveView("dance-league"); setSidebarOpen(false); }} />
          <SidebarButton icon={Heart} label="Donations" active={activeView === "donations"} onClick={() => { setActiveView("donations"); setSidebarOpen(false); }} />
       
          <div className="pt-4 pb-2 px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">System</h3>
          </div>
          {/* <SidebarButton icon={FileText} label="Terms & Conditions" active={activeView === "terms"} onClick={() => { setActiveView("terms"); setSidebarOpen(false); }} /> */}
          <SidebarButton icon={Ticket} label="Coupons" active={activeView === "coupons"} onClick={() => { setActiveView("coupons"); setSidebarOpen(false); }} />
          {/* <SidebarButton icon={Building2} label="Aiko Hall" active={activeView === "aiko-hall"} onClick={() => { setActiveView("aiko-hall"); setSidebarOpen(false); }} /> */}
          <SidebarButton icon={ImageIcon} label="Hero Images" active={activeView === "hero-images"} onClick={() => { setActiveView("hero-images"); setSidebarOpen(false); }} />
          <SidebarButton icon={ImageIcon} label="Events Hero Images" active={activeView === "events-hero-images"} onClick={() => { setActiveView("events-hero-images"); setSidebarOpen(false); }} />
          <SidebarButton icon={BarChart3} label="Analytics" active={activeView === "analytics"} onClick={() => { setActiveView("analytics"); setSidebarOpen(false); }} />
          <SidebarButton icon={Settings} label="Settings" active={activeView === "settings"} onClick={() => { setActiveView("settings"); setSidebarOpen(false); }} />
          <SidebarButton icon={Shield} label="System Health" active={activeView === "system"} onClick={() => { setActiveView("system"); setSidebarOpen(false); }} />
          <SidebarButton icon={Building2} label="Kaki Marketing" active={activeView === "kaki-marketing"} onClick={() => { setActiveView("kaki-marketing"); setSidebarOpen(false); }} />
        </nav>

        <div className="mt-auto pt-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <h4 className="font-bold text-blue-800 text-sm">Need Help?</h4>
              <p className="text-xs text-blue-700 mt-1">Check our documentation or contact support.</p>
              <Button size="sm" className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-xs">Get Support</Button>
            </CardContent>
          </Card>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 lg:ml-64 bg-gradient-to-br from-gray-50 to-blue-50">
        <header className="bg-white/60 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden h-8 w-8 sm:h-10 sm:w-10"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 capitalize">{activeView.replace(/-/g, " ")}</h1>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Badge variant="secondary" className="hidden sm:flex bg-green-100 text-green-800 border-green-200">
                  <Activity className="h-3 w-3 mr-1" /> System Healthy
                </Badge>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10 relative"
                  onClick={() => setActiveView("notifications")}
                >
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] leading-5 text-center">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  )}
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
  );
}
