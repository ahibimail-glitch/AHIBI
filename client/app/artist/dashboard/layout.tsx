"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createRoleAuthRedirectUrl } from "@/utils/redirectUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  DollarSign,
  Edit,
  Image as ImageIcon,
  FileText,
  Music,
  LogOut,
  Loader2,
  Building2,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";
import KakiMarketingBanner from "@/components/KakiMarketingBanner";
import { ArtistUser, ArtistProfile } from "./types";
import { DashboardContext } from "./dashboard-context";

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

const navItems = [
  { id: "tech-rider", label: "EPK & Tech Rider", icon: FileText },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "teaching", label: "Teaching", icon: GraduationCap },
  { id: "organizer", label: "Organizers", icon: Building2 },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "gallery", label: "Gallery", icon: ImageIcon },
  { id: "terms", label: "Terms", icon: FileText },
  { id: "earnings", label: "Earnings", icon: DollarSign },
  { id: "profile", label: "Profile", icon: Edit },
  { id: "merch", label: "Merch", icon: FileText },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ArtistUser | null>(null);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [shouldWarnOnExit, setShouldWarnOnExit] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeView = pathname.split("/").pop() || "bookings";
  const activeNavItem = navItems.find((item) => item.id === activeView);
  const pageTitle = activeNavItem?.label || "Dashboard";

  useEffect(() => {
    setIsNavigating(false);
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem("artist_token");
    const userData = localStorage.getItem("artist_user");
    
    if (!token || !userData) {
      router.push(createRoleAuthRedirectUrl("artist"));
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchArtistProfile(token);
    } catch (error) {
      console.error("Error parsing user data:", error);
      setError("Error loading user data. Please login again.");
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!shouldWarnOnExit || typeof window === "undefined") return;

    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      setShowExitDialog(true);
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [shouldWarnOnExit]);

  const fetchArtistProfile = async (token?: string) => {
    const authToken = token || localStorage.getItem("artist_token");
    if (!authToken) return;

    try {
      const response = await fetch("/api/artist/profile", {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch artist profile");
      }

      const data = await response.json();
      if (data.data && data.data.artist) {
        const artistData = data.data.artist;
        if (!artistData.profileImage && artistData.gallery?.photos) {
          const profilePhoto = artistData.gallery.photos.find((p: { isProfileImage: boolean; url: string }) => p.isProfileImage);
          if (profilePhoto) {
            artistData.profileImage = profilePhoto.url;
            artistData.profilePic = profilePhoto.url;
          }
        }
        if (!artistData.coverImage && artistData.gallery?.photos) {
          const coverPhoto = artistData.gallery.photos.find((p: { isCoverImage: boolean; url: string }) => p.isCoverImage);
          if (coverPhoto) {
            artistData.coverImage = coverPhoto.url;
          }
        }
        setProfile(artistData);
        if (artistData.name || artistData.email) {
          setUser(prev => prev ? {
            ...prev,
            name: artistData.name || prev.name,
            email: artistData.email || prev.email,
            phone: artistData.phone || prev.phone,
          } : null);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching artist profile:", error);
      setError("Error loading profile data");
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShouldWarnOnExit(false);
    localStorage.removeItem("artist_token");
    localStorage.removeItem("artist_user");
    router.push("/artist/auth/login");
  };

  const handleNavClick = (viewId: string) => {
    setSidebarOpen(false);
    if (viewId === activeView) return;
    setIsNavigating(true);
    router.push(`/artist/dashboard/${viewId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-white to-purple-400 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-red-600 mb-4">{error}</div>
            <Button className="w-full" onClick={() => router.push("/artist/auth/login")}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && profile && profile.approvalStatus === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-xl font-bold">Account Pending Approval</h2>
            <p className="text-muted-foreground">
              Your artist account is currently under review by our admin team. 
              You will receive a notification once your account is approved.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleLogout}>Logout</Button>
              <Button className="w-full sm:w-auto" onClick={() => window.location.reload()}>Check Status</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && profile && profile.approvalStatus === "rejected") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-xl font-bold">Account Rejected</h2>
            <p className="text-red-600">
              {profile.rejectionReason || "Your artist account application has been rejected. Please contact support for more information."}
            </p>
            <Button className="w-full" onClick={handleLogout}>Logout</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        successMessage,
        setSuccessMessage,
        setError,
        fetchArtistProfile,
        handleLogout,
      }}
    >
      <div className="flex min-h-screen bg-gradient-to-br from-pink-400 via-white to-purple-400">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          className={`w-64 max-w-[85vw] bg-white/90 backdrop-blur-sm border-r border-gray-200 fixed h-full flex flex-col p-4 shadow-lg z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-pink-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Music className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">Ahibi Artist</h2>
                <p className="text-xs text-gray-600 truncate">Artist Dashboard</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex flex-col space-y-2 flex-1">
            {navItems.map((item) => (
              <SidebarButton
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeView === item.id}
                onClick={() => handleNavClick(item.id)}
              />
            ))}
          </nav>

          <div className="mt-auto pt-4">
            <Card className="bg-pink-50 border-pink-200">
              <CardContent className="pt-6">
                <h4 className="font-bold text-pink-800">Need Help?</h4>
                <p className="text-xs text-pink-700 mt-1">Check our documentation or contact support.</p>
                <Button size="sm" className="w-full mt-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90">
                  Get Support
                </Button>
              </CardContent>
            </Card>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </aside>

        <main className="flex-1 lg:ml-64 bg-gradient-to-br from-pink-50 to-purple-50 relative min-w-0">
          <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200">
            <div className="flex items-center gap-3 px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">{pageTitle}</h1>
                <p className="text-xs text-gray-600 truncate">Ahibi Artist Dashboard</p>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6">
              <KakiMarketingBanner platform="artist" />
            </div>
            {children}
          </div>
          
          {isNavigating && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-pink-600" />
                <p className="text-sm text-gray-600 font-medium">Loading...</p>
              </div>
            </div>
          )}
        </main>

        <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <DialogContent className="max-w-sm sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Leave artist dashboard?</DialogTitle>
              <DialogDescription>
                If you go back now, you may lose your current view or any unsaved changes. Do you really want to close the dashboard?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowExitDialog(false)}>
                Stay on dashboard
              </Button>
              <Button
                className="bg-gradient-to-r from-pink-600 to-purple-600 text-white"
                onClick={() => {
                  setShowExitDialog(false);
                  setShouldWarnOnExit(false);
                  router.push("/");
                }}
              >
                Leave dashboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardContext.Provider>
  );
}

