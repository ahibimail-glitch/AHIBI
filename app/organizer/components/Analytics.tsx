"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Ticket,
  Eye,
  Download,
} from "lucide-react";

export default function Analytics() {
  const stats = [
    {
      title: "Total Revenue",
      value: "₹2,00,000",
      change: "+15.3%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Total Events",
      value: "12",
      change: "+8.2%",
      trend: "up",
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      title: "Total Tickets Sold",
      value: "1,247",
      change: "+12.7%",
      trend: "up",
      icon: Ticket,
      color: "text-purple-600",
    },
    {
      title: "Average Attendance",
      value: "89%",
      change: "-2.1%",
      trend: "down",
      icon: Users,
      color: "text-orange-600",
    },
  ];

  const recentEvents = [
    {
      id: "1",
      name: "Summer Music Festival",
      revenue: "₹75,000",
      ticketsSold: 150,
      attendance: "95%",
      rating: 4.8,
    },
    {
      id: "2",
      name: "Rock Concert Night",
      revenue: "₹1,00,000",
      ticketsSold: 200,
      attendance: "100%",
      rating: 4.9,
    },
    {
      id: "3",
      name: "Jazz Evening",
      revenue: "₹25,000",
      ticketsSold: 50,
      attendance: "80%",
      rating: 4.5,
    },
  ];

  const monthlyData = [
    { month: "Jan", revenue: 45000, tickets: 120 },
    { month: "Feb", revenue: 52000, tickets: 140 },
    { month: "Mar", revenue: 48000, tickets: 130 },
    { month: "Apr", revenue: 61000, tickets: 160 },
    { month: "May", revenue: 75000, tickets: 180 },
    { month: "Jun", revenue: 82000, tickets: 200 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm sm:text-base text-gray-600">Track your event performance and insights</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 transition-opacity w-full sm:w-auto">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      </div>

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
                <div className="flex items-center space-x-1">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <p className={`text-xs ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {stat.change} from last month
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Monthly Revenue
            </CardTitle>
            <CardDescription>Revenue trend over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{data.month}</span>
                  <div className="flex items-center space-x-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full"
                        style={{
                          width: `${(data.revenue / 100000) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">₹{data.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ticket Sales Chart */}
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Ticket className="h-5 w-5 mr-2" />
              Ticket Sales
            </CardTitle>
            <CardDescription>Ticket sales trend over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{data.month}</span>
                  <div className="flex items-center space-x-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                        style={{
                          width: `${(data.tickets / 250) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{data.tickets}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events Performance */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Recent Events Performance</CardTitle>
          <CardDescription>Performance metrics for your recent events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{event.name}</h3>
                    <p className="text-sm text-gray-500">Event Performance</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Revenue</p>
                    <p className="font-semibold text-green-600">{event.revenue}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Tickets</p>
                    <p className="font-semibold">{event.ticketsSold}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Attendance</p>
                    <p className="font-semibold text-blue-600">{event.attendance}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Rating</p>
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold">{event.rating}</span>
                      <span className="text-yellow-500">★</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Best Performing Event</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-lg">Rock Concert Night</h3>
              <p className="text-sm text-gray-500">100% attendance</p>
              <p className="text-2xl font-bold text-green-600 mt-2">₹1,00,000</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">4.7</span>
              </div>
              <h3 className="font-semibold text-lg">Excellent</h3>
              <p className="text-sm text-gray-500">Based on 1,247 reviews</p>
              <div className="flex justify-center space-x-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-yellow-500">★</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-lg">+15.3%</h3>
              <p className="text-sm text-gray-500">Revenue growth</p>
              <p className="text-sm text-green-600 mt-2">+12.7% ticket sales</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
