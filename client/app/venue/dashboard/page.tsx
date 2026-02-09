"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { useVenueAuth } from "@/hooks/useVenueAuth";
import VenueDashboardLayout from "./VenueDashboardLayout";
import { Loader2 } from "lucide-react";

export default function VenueDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useVenueAuth();
  const [loading, setLoading] = useState(true);
  const [venueData, setVenueData] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("venueToken")}`,
  });
  const venueIdParam = (id: string | null) => (id ? `?venueId=${id}` : "");

  const fetchVenues = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/venue/venues`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success && data.data.venues?.length > 0) {
        setVenues(data.data.venues);
        setSelectedVenueId((prev) => prev || data.data.venues[0]._id);
      }
    } catch (error) {
      console.error("Error fetching venues:", error);
    }
  }, [apiUrl]);

  const fetchVenueData = useCallback(async () => {
    try {
      const url = `${apiUrl}/api/venue/profile${venueIdParam(selectedVenueId)}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) {
        setVenueData(data.data.venue);
      } else {
        setVenueData(null);
      }
    } catch (error) {
      console.error("Error fetching venue data:", error);
      toast.error("Failed to load venue data");
      setVenueData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedVenueId]);

  const fetchStats = useCallback(async () => {
    try {
      const url = `${apiUrl}/api/venue/manager/stats${venueIdParam(selectedVenueId)}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [selectedVenueId]);

  const fetchBookings = useCallback(async () => {
    try {
      const url = `${apiUrl}/api/venue/manager/bookings${venueIdParam(selectedVenueId)}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) {
        setBookings(data.data.bookings || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  }, [selectedVenueId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/venue/auth/login");
      return;
    }
    if (user) {
      fetchVenues();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user && venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0]._id);
    }
  }, [user, venues, selectedVenueId]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchVenueData();
      fetchStats();
      fetchBookings();
    }
  }, [selectedVenueId, user]);

  const handleSectionUpdate = async (section: string, data: any) => {
    setSaving(true);
    try {
      const endpointMap: { [key: string]: string } = {
        "owner-details": "/details/owner-details",
        "venue-classification": "/details/venue-classification",
        location: "/details/location",
        capacity: "/details/capacity",
        pricing: "/details/pricing",
        amenities: "/details/amenities",
        policies: "/details/policies",
        "addon-services": "/details/addon-services",
        documents: "/details/documents",
        authorizations: "/details/authorizations",
      };

      const endpoint = endpointMap[section] || "/profile";
      let updateData = data;

      if (section === "location") {
        updateData = {
          address: data.address,
          parking: data.parking,
          accessibility: data.accessibility,
        };
      } else if (section === "policies") {
        updateData = data.policies || data;
      }

      if (selectedVenueId) {
        updateData = { ...updateData, venueId: selectedVenueId };
      }

      const response = await fetch(`${apiUrl}/api/venue${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Section updated successfully");
        fetchVenueData();
      } else {
        toast.error(result.message || "Failed to update section");
      }
    } catch (error) {
      console.error("Error updating section:", error);
      toast.error("Failed to update section");
    } finally {
      setSaving(false);
    }
  };

  const exportBookings = () => {
    const csvContent = [
      ["Name", "Phone", "Email", "Date", "Start Time", "End Time", "Duration", "Guests", "Event Type", "Amount", "Status", "Booked At"].join(","),
      ...bookings.map((booking) => {
        const amount = booking.pricing?.totalAmount || "N/A";
        return [
          booking.user?.name || "N/A",
          booking.user?.phone || "N/A",
          booking.user?.email || "N/A",
          format(new Date(booking.bookingDate), "yyyy-MM-dd"),
          booking.startTime,
          booking.endTime,
          booking.duration,
          booking.guestCount,
          booking.eventType || "N/A",
          amount,
          booking.status,
          format(new Date(booking.createdAt), "yyyy-MM-dd HH:mm"),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${venueData?.name?.replace(/\s+/g, "-") || "venue"}-bookings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const refreshVenues = async () => {
    await fetchVenues();
    if (selectedVenueId) {
      fetchVenueData();
      fetchStats();
      fetchBookings();
    }
  };

  if (authLoading || (loading && !venueData && venues.length === 0)) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && venues.length === 0 && !venueData) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <p className="text-gray-600">Failed to load venue data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VenueDashboardLayout
        venueData={venueData}
        venues={venues}
        selectedVenueId={selectedVenueId}
        onSelectVenue={setSelectedVenueId}
        onRefreshVenues={refreshVenues}
        stats={stats}
        bookings={bookings}
        onSectionUpdate={handleSectionUpdate}
        onExportBookings={exportBookings}
      />
    </div>
  );
}
