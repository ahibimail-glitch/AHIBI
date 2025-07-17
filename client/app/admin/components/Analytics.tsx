"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { BarChart3, LineChart, PieChart, TrendingUp } from "lucide-react";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("month");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Platform Analytics</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Time Range:</span>
          <Select
            value={timeRange}
            onValueChange={(value: string) => setTimeRange(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">₹24,58,932</p>
                <div className="flex items-center">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-xs font-medium text-green-600">
                    +18.2% vs previous
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold">8,742</p>
                <div className="flex items-center">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-xs font-medium text-green-600">
                    +12.5% vs previous
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
                <LineChart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">New Users</p>
                <p className="text-2xl font-bold">1,254</p>
                <div className="flex items-center">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-xs font-medium text-green-600">
                    +8.7% vs previous
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100">
                <PieChart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Event Conversion</p>
                <p className="text-2xl font-bold">24.8%</p>
                <div className="flex items-center">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-xs font-medium text-green-600">
                    +2.3% vs previous
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
            <CardDescription>
              Monthly revenue breakdown for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p>Revenue chart visualization would appear here</p>
              <p className="text-sm text-gray-400">
                (Actual chart implementation would use a library like Chart.js or Recharts)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Popular Event Categories</CardTitle>
            <CardDescription>
              Distribution of events by category
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <PieChart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p>Category distribution chart would appear here</p>
              <p className="text-sm text-gray-400">
                (Actual chart implementation would use a library like Chart.js or Recharts)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
