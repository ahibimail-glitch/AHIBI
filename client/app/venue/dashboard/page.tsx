"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { useVenueAuth } from "@/hooks/useVenueAuth";
import VenueDashboardLayout from "./VenueDashboardLayout";
import Navbar from "@/app/Navbar";
import { Loader2 } from "lucide-react";

export default function VenueDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useVenueAuth();
  const [loading, setLoading] = useState(true);
  const [venueData, setVenueData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/venue/auth/login');
      return;
    }
    if (user) {
      fetchVenueData();
      fetchStats();
      fetchBookings();
    }
  }, [user, authLoading]);

  const fetchVenueData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setVenueData(data.data.venue);
      }
    } catch (error) {
      console.error('Error fetching venue data:', error);
      toast.error('Failed to load venue data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/manager/bookings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBookings(data.data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleSectionUpdate = async (section: string, data: any) => {
    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Map section to endpoint
      const endpointMap: { [key: string]: string } = {
        'owner-details': '/details/owner-details',
        'venue-classification': '/details/venue-classification',
        'location': '/details/location',
        'capacity': '/details/capacity',
        'pricing': '/details/pricing',
        'amenities': '/details/amenities',
        'policies': '/details/policies',
        'addon-services': '/details/addon-services',
        'documents': '/details/documents',
        'authorizations': '/details/authorizations'
      };

      const endpoint = endpointMap[section] || '/profile';
      
      // Prepare data based on section
      let updateData = data;
      
      if (section === 'location') {
        // Location section sends address, parking, and accessibility separately
        updateData = {
          address: data.address,
          parking: data.parking,
          accessibility: data.accessibility
        };
      } else if (section === 'policies') {
        // Policies section might include both policies and addOnServices
        // We'll handle policies separately, addOnServices has its own endpoint
        updateData = data.policies || data;
      }
      
      const response = await fetch(`${apiUrl}/api/venue${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('venueToken')}`
        },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success('Section updated successfully');
        fetchVenueData();
      } else {
        toast.error(result.message || 'Failed to update section');
      }
    } catch (error) {
      console.error('Error updating section:', error);
      toast.error('Failed to update section');
    } finally {
      setSaving(false);
    }
  };

  const exportBookings = () => {
    const csvContent = [
      ['Name', 'Phone', 'Email', 'Date', 'Start Time', 'End Time', 'Duration', 'Guests', 'Event Type', 'Amount', 'Status', 'Booked At'].join(','),
      ...bookings.map(booking => {
        const amount = booking.pricing?.totalAmount || 'N/A';
        return [
          booking.user?.name || 'N/A',
          booking.user?.phone || 'N/A',
          booking.user?.email || 'N/A',
          format(new Date(booking.bookingDate), 'yyyy-MM-dd'),
          booking.startTime,
          booking.endTime,
          booking.duration,
          booking.guestCount,
          booking.eventType || 'N/A',
          amount,
          booking.status,
          format(new Date(booking.createdAt), 'yyyy-MM-dd HH:mm')
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${venueData?.name.replace(/\s+/g, '-')}-bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!venueData) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <p>Failed to load venue data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VenueDashboardLayout
        venueData={venueData}
        stats={stats}
        bookings={bookings}
        onSectionUpdate={handleSectionUpdate}
        onExportBookings={exportBookings}
      />
    </div>
  );
}
