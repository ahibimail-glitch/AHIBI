"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Eye } from "lucide-react";

interface ApprovalItem {
  id: number;
  type: string;
  name: string;
  email: string;
  date: string;
}

interface ApprovalListProps {
  type: "Organizer" | "Artist" | "Venue" | "Event";
}

export default function ApprovalList({ type }: ApprovalListProps) {
  // Sample data
  const pendingApprovals: ApprovalItem[] = [
    {
      id: 1,
      type: "Organizer",
      name: "Mumbai Events Co.",
      email: "contact@mumbaiEvents.com",
      date: "2025-07-15",
    },
    {
      id: 2,
      type: "Artist",
      name: "The Fusion Collective",
      email: "booking@fusionband.com",
      date: "2025-07-14",
    },
    {
      id: 3,
      type: "Venue",
      name: "Grand Ballroom Delhi",
      email: "manager@grandballroom.in",
      date: "2025-07-13",
    },
    {
      id: 4,
      type: "Event",
      name: "Tech Summit 2025",
      email: "organizer@techsummit.com",
      date: "2025-07-12",
    },
    {
      id: 5,
      type: "Artist",
      name: "Acoustic Wonders",
      email: "contact@acoustic.com",
      date: "2025-07-11",
    },
    {
      id: 6,
      type: "Venue",
      name: "The Seaside Amphitheatre",
      email: "events@seaside.com",
      date: "2025-07-10",
    },
  ];

  const items = pendingApprovals.filter((item) => item.type === type);

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          {type} Approvals ({items.length})
        </CardTitle>
        <CardDescription>
          Review and approve new {type.toLowerCase()} submissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 shadow-sm"
            >
              <div>
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.email}</p>
                <p className="text-xs text-gray-400">
                  Submitted on {item.date}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4 mr-1" /> View
                </Button>
                <Button size="sm" variant="outline" className="text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="text-red-600">
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center py-8 text-gray-500">
            No pending {type.toLowerCase()} approvals.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
