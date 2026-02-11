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
  Menu,
  X,
  ScrollText,
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
import ScheduleEvent from "../components/ScheduleEvent"
import KakiMarketingBanner from "@/components/KakiMarketingBanner"
import TermsDisplay from "@/components/TermsDisplay"
import OrganizerTerms from "../components/OrganizerTerms"

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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      case "terms":
        return <OrganizerTerms/>
      case "schedule-event":
        return <ScheduleEvent />
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
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-white to-purple-400 flex flex-col">
      {/* Mobile Top Bar */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:hidden">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-br from-pink-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Organizer</p>
            <h1 className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">
              {activeView.replace(/-/g, " ")}
            </h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="hidden xs:inline-flex bg-green-100 text-green-800 border-green-200">
            <Activity className="h-3 w-3 mr-1" /> Live
          </Badge>
          <Button
            variant="outline"
            size="icon"
            className="border-gray-300"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen((prev: boolean) => !prev)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* --- Sidebar --- */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-30 w-64 bg-white/90 backdrop-blur-md border-r border-gray-200
            flex flex-col p-4 shadow-lg transform transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            lg:static lg:translate-x-0 lg:shadow-none lg:bg-white/80
          `}
        >
          <div className="flex items-center space-x-3 mb-6 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">Ahibi Organizer</h2>
              <p className="text-xs text-gray-600 truncate">Event Management Suite</p>
            </div>
          </div>

          <nav className="flex flex-col space-y-2 text-sm">
            <SidebarButton 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={activeView === "dashboard"} 
              onClick={() => {
                setActiveView("dashboard")
                setSidebarOpen(false)
              }} 
            />
            <SidebarButton 
              icon={QrCode} 
              label="QR Scanner" 
              active={activeView === "qr-scanner"} 
              onClick={() => {
                setActiveView("qr-scanner")
                setSidebarOpen(false)
              }} 
            />
            <SidebarButton 
              icon={CheckCircle} 
              label="Approved Events" 
              active={activeView === "approved-events"} 
              onClick={() => {
                setActiveView("approved-events")
                setSidebarOpen(false)
              }} 
            />
            <SidebarButton 
              icon={Clock} 
              label="Pending Events" 
              active={activeView === "pending-events"} 
              onClick={() => {
                setActiveView("pending-events")
                setSidebarOpen(false)
              }} 
            />
            <SidebarButton 
              icon={Ticket} 
              label="Bookings" 
              active={activeView === "bookings"} 
              onClick={() => {
                setActiveView("bookings")
                setSidebarOpen(false)
              }} 
            />

            <SidebarButton
              icon={Calendar}
              label="Schedule Event"
              active={activeView === "schedule-event"}
              onClick={() => {
                setActiveView("schedule-event")
                setSidebarOpen(false)
              }}
            />
        
            <SidebarButton 
              icon={PlusCircle} 
              label="Create Event" 
              active={activeView === "create-event"} 
              onClick={() => {
                setActiveView("create-event")
                setSidebarOpen(false)
              }} 
            />
            <SidebarButton 
              icon={ScrollText} 
              label="Ahibi Terms & Conditions" 
              active={activeView === "terms"} 
              onClick={() => {
                setActiveView("terms")
                setSidebarOpen(false)
              }} 
            />

            {/* Future: Analytics & Settings sections can be enabled later */}
          </nav>

          <div className="mt-auto pt-4">
            <Card className="bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 border-pink-100">
              <CardContent className="pt-4">
                <h4 className="font-semibold text-pink-900 text-sm">Need Help?</h4>
                <p className="text-xs text-pink-700 mt-1">
                  Explore our organizer guide or chat with our success team.
                </p>
                <Button 
                  size="sm" 
                  className="w-full mt-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-xs"
                >
                  Get Premium Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Sidebar overlay on mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* --- Main Content --- */}
        <main className="flex-1 bg-gradient-to-br from-pink-50 to-purple-50">
          {/* Desktop header */}
          <header className="hidden lg:block bg-white/70 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-20">
            <div className="px-8 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {activeView.replace(/-/g, " ")}
                </h1>
                <p className="text-sm text-gray-600">Welcome back, {user.name}</p>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
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
          </header>

          <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
            {/* Kaki Marketing Banner */}
            <div className="mb-6 lg:mb-8">
              <KakiMarketingBanner platform="organizer" />
            </div>
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm shadow-sm border border-white/60 p-3 sm:p-4 lg:p-6">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
