"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { createRoleAuthRedirectUrl } from "@/utils/redirectUtils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  LayoutDashboard,
  Calendar,
  Users,
  Ticket,
  DollarSign,
  Settings,
  Activity,
  PlusCircle,
  BarChart3,
  LogOut,
  Building2,
  Music,
  QrCode,
  Eye,
  Bell,
  CheckCircle,
  Clock,
} from "lucide-react"

// Import child components
import Dashboard from "../components/Dashboard"
import Events from "../components/Events"
import Bookings from "../components/Bookings"
import CreateEventForm from "../components/CreateEventForm"
import Analytics from "../components/Analytics"
import SettingsComponent from "../components/Settings"
import ArtistBookingCalendar from "@/components/organizer/ArtistBookingCalendar"
import BookingManagement from "@/components/organizer/BookingManagement"
import QrScanner from "../components/QRScanner"

interface OrganizerUser {
  id: string
  name: string
  email: string
  phone: string
  role: string
  status: string
}

// --- Helper component for sidebar buttons ---
interface SidebarButtonProps {
  icon: React.ElementType
  label: string
  active: boolean
  onClick?: () => void
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
)

// --- Main Organizer Dashboard Component ---
export default function OrganizerDashboard() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth({
    tokenName: 'organizer_token',
    redirectPath: '/organizer/auth/login',
  });
  const [user, setUser] = useState<OrganizerUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState("dashboard")

  useEffect(() => {
    if (isAuthenticated) {
      const userData = localStorage.getItem('organizer_user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('Error parsing user data:', error);
          handleLogout(); // Log out if user data is corrupted
        }
      }
    } 
    setLoading(authLoading);
  }, [isAuthenticated, authLoading]);

  const handleLogout = () => {
    localStorage.removeItem('organizer_token')
    localStorage.removeItem('organizer_user')
    router.push('/organizer/auth/login')
  }

  // Dashboard data is now fetched internally by the Dashboard component

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard setActiveView={setActiveView} />
      case "events":
        return <Events />
      case "approved-events":
        return <Events filterStatus="approved" />
      case "pending-events":
        return <Events filterStatus="pending" />
      case "bookings":
        return <Bookings />
      case "artist-booking":
        return <ArtistBookingCalendar />
      case "booking-management":
        return <BookingManagement />
      case "create-event":
        return <CreateEventForm onSuccess={() => setActiveView("dashboard")} />
      case "analytics":
        return <Analytics />
      case "settings":
        return <SettingsComponent />
      case "qr-scanner":
        return <QrScanner />
      default:
        return <Dashboard setActiveView={setActiveView} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-white to-purple-400 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null // The useAuth hook will handle the redirect.
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-pink-400 via-white to-purple-400">
      {/* --- Sidebar --- */}
      <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 fixed h-full flex flex-col p-4 shadow-sm z-10 overflow-y-auto">
        <div className="flex items-center space-x-3 mb-6 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ahibi Organizer</h2>
            <p className="text-xs text-gray-600">Event Management</p>
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
            icon={Calendar} 
            label="QR Scanner" 
            active={activeView === "qr-scanner"} 
            onClick={() => setActiveView("qr-scanner")} 
          />
          <SidebarButton 
            icon={CheckCircle} 
            label="Approved Events" 
            active={activeView === "approved-events"} 
            onClick={() => setActiveView("approved-events")} 
          />
          <SidebarButton 
            icon={Clock} 
            label="Pending Events" 
            active={activeView === "pending-events"} 
            onClick={() => setActiveView("pending-events")} 
          />
          <SidebarButton 
            icon={Ticket} 
            label="Bookings" 
            active={activeView === "bookings"} 
            onClick={() => setActiveView("bookings")} 
          />
       
          <SidebarButton 
            icon={PlusCircle} 
            label="Create Event" 
            active={activeView === "create-event"} 
            onClick={() => setActiveView("create-event")} 
          />

          {/* <div className="pt-4 pb-2 px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Analytics</h3>
          </div>
          <SidebarButton 
            icon={BarChart3} 
            label="Analytics" 
            active={activeView === "analytics"} 
            onClick={() => setActiveView("analytics")} 
          /> */}

          {/* <div className="pt-4 pb-2 px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Account</h3>
          </div>
          <SidebarButton 
            icon={Settings} 
            label="Settings" 
            active={activeView === "settings"} 
            onClick={() => setActiveView("settings")} 
          /> */}
        </nav>

        <div className="mt-auto">
          <Card className="bg-pink-50 border-pink-200">
            <CardContent className="pt-6">
              <h4 className="font-bold text-pink-800">Need Help?</h4>
              <p className="text-xs text-pink-700 mt-1">Check our documentation or contact support.</p>
              <Button size="sm" className="w-full mt-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90">
                Get Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 ml-64 bg-gradient-to-br from-pink-50 to-purple-50">
        {/* <header className="bg-white/60 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {activeView.replace(/-/g, " ")}
                </h1>
                <p className="text-sm text-gray-600">Welcome back, {user.name}</p>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  <Activity className="h-3 w-3 mr-1" /> Account Active
                </Badge>
                <Button variant="outline" size="icon">
                  <Bell className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header> */}

        <div className="p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
