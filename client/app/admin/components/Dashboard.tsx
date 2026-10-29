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
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 xl:gap-6">
        {displayStats.map((stat) => (
          <Card
            key={stat.title}
            className="min-w-0 overflow-hidden border-0 bg-white/70 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl"
          >
            <CardContent className="relative min-h-[152px] min-w-0 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="min-h-10 pr-12 text-sm font-medium leading-5 text-gray-600">
                  {stat.title}
                </p>
                <p className="mt-2 max-w-full whitespace-nowrap text-[clamp(1.25rem,1.75vw,1.75rem)] font-bold leading-tight tracking-tight text-gray-900">
                  {stat.value}
                </p>
                <div className="mt-3 flex min-w-0 items-center gap-1">
                  <TrendingUp
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 text-green-600"
                  />
                  <span className="min-w-0 text-sm font-medium text-green-600">
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className="absolute right-4 top-4 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gray-100 sm:right-5 sm:top-5">
                <stat.icon
                  aria-hidden="true"
                  className={`h-5 w-5 ${stat.color}`}
                />
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
