"use client";

import { useState } from "react";
import AdminLayout from "./components/AdminLayout";
import EventApprovalList from "./components/EventApprovalList";
import VenueApprovalList from "./components/VenueApprovalList";
import Artists from "./components/Artists";
import ArtistManagement from "./components/ArtistManagement";
import BookingManagement from "./components/BookingManagement";
import AnnieMusicalBookings from "./components/AnnieMusicalBookings";
import AnnieManualBooking from "./components/AnnieManualBooking";
import MelitaBookings from "./components/MelitaBookings";
import { 
  Users, 
  Calendar, 
  Building2, 
  BarChart3, 
  Music,
  TrendingUp,
  DollarSign,
  Clock,
  UserCheck
} from "lucide-react";

export default function AdminPage() {
  const [activeView, setActiveView] = useState("dashboard");

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardContent />;
      case "events":
        return <EventApprovalList />;
      case "venues":
        return <VenueApprovalList />;
      case "artists":
        return <Artists />;
      case "artist-approvals":
        return <Artists />;
      case "all-artists":
        return <ArtistManagement />;
      case "artist-analytics":
        return <div>Artist Analytics Coming Soon...</div>;
      case "all-bookings":
        return <BookingManagement />;
      case "pending-bookings":
        return <BookingManagement />;
      case "booking-analytics":
        return <div>Booking Analytics Coming Soon...</div>;
      case "annie-musical-bookings":
        return <AnnieMusicalBookings />;
      case "annie-manual-booking":
        return <AnnieManualBooking />;
      case "melita-bookings":
        return <MelitaBookings />;
      case "payments":
        return <div>Payment Management Coming Soon...</div>;
      case "notifications":
        return <div>Notifications Management Coming Soon...</div>;
      case "settings":
        return <div>Settings Coming Soon...</div>;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <AdminLayout activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
    </AdminLayout>
  );
}

// Dashboard Content Component
const DashboardContent = () => {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome to Ahibi Admin</h1>
        <p className="text-blue-100 text-lg">
          Manage your platform efficiently with comprehensive tools and analytics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value="2,847"
          change="+12.5%"
          changeType="positive"
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Active Events"
          value="156"
          change="+8.2%"
          changeType="positive"
          icon={Calendar}
          color="green"
        />
        <MetricCard
          title="Total Revenue"
          value="₹4.2M"
          change="+15.3%"
          changeType="positive"
          icon={DollarSign}
          color="purple"
        />
        <MetricCard
          title="Pending Approvals"
          value="23"
          change="-5.1%"
          changeType="negative"
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Artist Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Artist Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Music className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-700">Total Artists</span>
              </div>
              <span className="font-semibold text-gray-900">342</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-700">Approved</span>
              </div>
              <span className="font-semibold text-gray-900">298</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-gray-700">Pending</span>
              </div>
              <span className="font-semibold text-gray-900">44</span>
            </div>
          </div>
        </div>

        {/* Booking Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-gray-700">Total Bookings</span>
              </div>
              <span className="font-semibold text-gray-900">1,247</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-700">Confirmed</span>
              </div>
              <span className="font-semibold text-gray-900">1,089</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-gray-700">Pending</span>
              </div>
              <span className="font-semibold text-gray-900">158</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { action: "New artist registration", user: "Rahul Sharma", time: "2 minutes ago", type: "artist" },
            { action: "Booking confirmed", user: "Wedding Bells Pvt Ltd", time: "15 minutes ago", type: "booking" },
            { action: "Event approved", user: "Tech Conference 2024", time: "1 hour ago", type: "event" },
            { action: "Venue verification", user: "Grand Ballroom", time: "2 hours ago", type: "venue" },
            { action: "Payment received", user: "₹45,000 from Priya Events", time: "3 hours ago", type: "payment" }
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-b-0">
              <div className={`p-2 rounded-full ${
                activity.type === 'artist' ? 'bg-blue-100' :
                activity.type === 'booking' ? 'bg-green-100' :
                activity.type === 'event' ? 'bg-purple-100' :
                activity.type === 'venue' ? 'bg-yellow-100' :
                'bg-gray-100'
              }`}>
                {activity.type === 'artist' && <Music className="w-4 h-4 text-blue-600" />}
                {activity.type === 'booking' && <Calendar className="w-4 h-4 text-green-600" />}
                {activity.type === 'event' && <Users className="w-4 h-4 text-purple-600" />}
                {activity.type === 'venue' && <Building2 className="w-4 h-4 text-yellow-600" />}
                {activity.type === 'payment' && <DollarSign className="w-4 h-4 text-gray-600" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-500">{activity.user}</p>
              </div>
              <span className="text-xs text-gray-400">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color 
}: {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: any;
  color: string;
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <div className="flex items-center mt-2">
            <TrendingUp className={`w-4 h-4 mr-1 ${
              changeType === 'positive' ? 'text-green-500' : 'text-red-500'
            }`} />
            <span className={`text-sm font-medium ${
              changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}>
              {change}
            </span>
            <span className="text-sm text-gray-500 ml-1">vs last month</span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
