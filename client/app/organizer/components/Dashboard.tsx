"use client";

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
} from "lucide-react";

interface DashboardProps {
  stats: Array<{
    title: string;
    value: string;
    icon: React.ElementType;
    change: string;
    color: string;
  }>;
  setActiveView: (view: string) => void;
}

export default function Dashboard({ stats, setActiveView }: DashboardProps) {
  const recentEvents = [
    {
      id: "1",
      name: "Summer Music Festival",
      date: "2025-06-15",
      status: "active",
      ticketsSold: 150,
      revenue: "₹75,000",
    },
    {
      id: "2",
      name: "Rock Concert Night",
      date: "2025-05-20",
      status: "completed",
      ticketsSold: 200,
      revenue: "₹1,00,000",
    },
  ];

  const upcomingEvents = [
    {
      id: "3",
      name: "Jazz Evening",
      date: "2025-07-10",
      status: "upcoming",
      ticketsSold: 50,
      revenue: "₹25,000",
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
                <p className="text-xs text-muted-foreground flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stat.change} from last month
                </p>
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
              {recentEvents.length > 0 ? (
                recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{event.name}</p>
                      <p className="text-xs text-gray-500">{event.date}</p>
                    </div>
                    <Badge variant={event.status === "active" ? "default" : "secondary"}>
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
                <span className="font-semibold">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Events</span>
                <span className="font-semibold text-green-600">1</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Revenue</span>
                <span className="font-semibold text-purple-600">₹2,00,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg. Rating</span>
                <span className="font-semibold text-yellow-600">4.5/5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Your scheduled events</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{event.name}</h3>
                      <p className="text-sm text-gray-500">{event.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{event.ticketsSold} tickets sold</p>
                    <p className="text-sm text-gray-500">{event.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming events</p>
              <p className="text-sm text-gray-400 mt-2">
                Create your first event to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
