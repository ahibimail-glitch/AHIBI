"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Server, Database, Globe } from "lucide-react";

export default function System() {
  const systemStats = [
    {
      title: "Server Status",
      value: "Online",
      icon: Server,
      status: "healthy",
    },
    {
      title: "Database",
      value: "Connected",
      icon: Database,
      status: "healthy",
    },
    {
      title: "API Health",
      value: "100%",
      icon: Globe,
      status: "healthy",
    },
    {
      title: "Security",
      value: "Protected",
      icon: Shield,
      status: "healthy",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Overview of system components and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {systemStats.map((stat) => (
              <Card key={stat.title} className="border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                      <div className="flex items-center">
                        <span className={`h-2 w-2 rounded-full mr-2 ${
                          stat.status === "healthy" ? "bg-green-500" : 
                          stat.status === "warning" ? "bg-yellow-500" : "bg-red-500"
                        }`}></span>
                        <span className="text-sm font-medium text-gray-600">
                          {stat.status === "healthy" ? "Healthy" : 
                           stat.status === "warning" ? "Warning" : "Critical"}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
                      <stat.icon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>
            Recent system activity and error logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded-md font-mono text-sm h-64 overflow-y-auto">
            <p className="text-green-600">[INFO] System started successfully</p>
            <p className="text-gray-600">[LOG] User authentication service initialized</p>
            <p className="text-gray-600">[LOG] Database connection established</p>
            <p className="text-gray-600">[LOG] API endpoints registered</p>
            <p className="text-yellow-600">[WARN] High memory usage detected</p>
            <p className="text-gray-600">[LOG] Memory optimization completed</p>
            <p className="text-gray-600">[LOG] Scheduled backup completed</p>
            <p className="text-gray-600">[LOG] User session cleanup task executed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
