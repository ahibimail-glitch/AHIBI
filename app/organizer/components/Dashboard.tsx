"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  Ticket,
  DollarSign,
  TrendingUp,
  Activity,
  PlusCircle,
  BarChart3,
  Loader2,
} from "lucide-react";
import OrganizerTerms from "./OrganizerTerms";

interface DashboardProps {
  setActiveView: (view: string) => void;
}

interface DashboardData {
  stats: {
    totalEvents: number;
    activeEvents: number;
    pendingEvents: number;
    completedEvents: number;
    totalRevenue: number;
    totalTicketsSold: number;
    totalBookings: number;
    pendingBookings: number;
    acceptedBookings: number;
    averageRating: number;
  };
  recentEvents: Array<{
    _id: string;
    title: string;
    startDate: string;
    endDate: string;
    status: string;
    banner?: string;
    totalTickets: number;
    ticketsSold: number;
  }>;
  upcomingEvents: Array<{
    _id: string;
    title: string;
    startDate: string;
    endDate: string;
    banner?: string;
    totalTickets: number;
    ticketsSold: number;
  }>;
  recentBookings: Array<{
    _id: string;
    artist: {
      _id: string;
      name: string;
      email: string;
      phone: string;
      profilePic?: string;
    };
    booking: {
      status: string;
      eventDate: string;
      venue: string;
    };
    createdAt: string;
  }>;
}

export default function Dashboard({ setActiveView }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('organizer_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizer/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
          <Button onClick={fetchDashboardData} variant="outline">
            Retry
          </Button>
        </CardHeader>
      </Card>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No dashboard data available</p>
      </div>
    );
  }

  // Create stats array from dashboard data
  const stats = [
    { 
      title: "Total Events", 
      value: dashboardData.stats.totalEvents.toString(), 
      icon: Calendar, 
      change: "+0%", 
      color: "text-blue-600" 
    },
    { 
      title: "Active Events", 
      value: dashboardData.stats.activeEvents.toString(), 
      icon: Activity, 
      change: "+0%", 
      color: "text-green-600" 
    },
    { 
      title: "Total Revenue", 
      value: `₹${dashboardData.stats.totalRevenue.toLocaleString()}`, 
      icon: DollarSign, 
      change: "+0%", 
      color: "text-purple-600" 
    },
 
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
               
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PlusCircle className="h-5 w-5 mr-2" />
              Quick Actions
            </CardTitle>
            <CardDescription>Manage your events and bookings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 transition-opacity"
              onClick={() => setActiveView("create-event")}
            >
              Create New Event
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setActiveView("events")}
            >
              View All Events
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setActiveView("bookings")}
            >
              Manage Bookings
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest events and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.recentEvents.length > 0 ? (
                dashboardData.recentEvents.map((event) => (
                  <div key={event._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-gray-500">{new Date(event.startDate).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={event.status === "approved" ? "default" : "secondary"}>
                      {event.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent events</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Performance
            </CardTitle>
            <CardDescription>Your event performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Events</span>
                <span className="font-semibold">{dashboardData.stats.totalEvents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Events</span>
                <span className="font-semibold text-green-600">{dashboardData.stats.activeEvents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending Events</span>
                <span className="font-semibold text-yellow-600">{dashboardData.stats.pendingEvents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Revenue</span>
                <span className="font-semibold text-purple-600">₹{dashboardData.stats.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Tickets Sold</span>
                <span className="font-semibold text-blue-600">{dashboardData.stats.totalTicketsSold}</span>
              </div>
              
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Upcoming Events */}
      

      {/* Recent Bookings */}
      {dashboardData.recentBookings.length > 0 && (
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Artist Bookings</CardTitle>
            <CardDescription>Your latest booking requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentBookings.map((booking) => (
                <div key={booking._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{booking.artist.name}</h3>
                      <p className="text-sm text-gray-500">{booking.booking.venue}</p>
                      <p className="text-xs text-gray-400">{new Date(booking.booking.eventDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={booking.booking.status === "accepted" ? "default" : "secondary"}>
                      {booking.booking.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
