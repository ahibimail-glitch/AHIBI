"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Music,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ListOrdered,
  UserCheck,
} from "lucide-react";

interface Stat {
  title: string;
  value: string;
  icon: React.ElementType;
  change: string;
  color: string;
}

interface DashboardProps {
  stats: Stat[];
  setActiveView: (view: string) => void;
}

export default function Dashboard({ stats, setActiveView }: DashboardProps) {
  // Use stats from props or fallback to sample data if not provided
  const displayStats = stats?.length ? stats : [
    {
      title: "Total Users",
      value: "15,847",
      icon: Users,
      change: "+12.5%",
      color: "text-blue-600",
    },
    {
      title: "Active Events",
      value: "342",
      icon: Calendar,
      change: "+8.2%",
      color: "text-green-600",
    },
    {
      title: "Registered Venues",
      value: "1,256",
      icon: Building2,
      change: "+15.3%",
      color: "text-purple-600",
    },
    {
      title: "Artists",
      value: "2,891",
      icon: Music,
      change: "+20.1%",
      color: "text-orange-600",
    },
    {
      title: "Monthly Revenue",
      value: "₹4,67,890",
      icon: DollarSign,
      change: "+25.7%",
      color: "text-emerald-600",
    },
    {
      title: "Tickets Sold",
      value: "12,456",
      icon: ListOrdered,
      change: "+18.9%",
      color: "text-red-600",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {displayStats.map((stat) => (
          <Card
            key={stat.title}
            className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <div className="flex items-center">
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    <span className="text-sm font-medium text-green-600">
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200`}
                >
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Welcome back!</CardTitle>
            <CardDescription>
              Here's a quick overview of your platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Select a view from the sidebar to manage different aspects
              of the platform.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />{" "}
              Quick Actions
            </CardTitle>
            <CardDescription>Jump right into your tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button onClick={() => setActiveView("users")}>
              <Users className="mr-2 h-4 w-4" /> Manage Users
            </Button>
            <Button onClick={() => setActiveView("bookings")}>
              <ListOrdered className="mr-2 h-4 w-4" /> View Bookings
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveView("organizer-approvals")}
            >
              <UserCheck className="mr-2 h-4 w-4" /> Organizer Approvals
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveView("artist-approvals")}
            >
              <Music className="mr-2 h-4 w-4" /> Artist Approvals
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
