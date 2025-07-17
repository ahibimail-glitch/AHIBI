"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  createdOn: string;
}

interface UsersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  users?: User[];
}

export default function Users({ searchQuery, setSearchQuery, users }: UsersProps) {
  // Use users from props or fallback to sample data if not provided
  const allUsers: User[] = users?.length ? users : [
    {
      id: "usr_1",
      name: "Aarav Sharma",
      email: "aarav.sharma@example.com",
      mobile: "9876543210",
      createdOn: "2025-01-20",
    },
    {
      id: "usr_2",
      name: "Diya Patel",
      email: "diya.patel@example.com",
      mobile: "9876543211",
      createdOn: "2025-02-15",
    },
    {
      id: "usr_3",
      name: "Rohan Kumar",
      email: "rohan.kumar@example.com",
      mobile: "9876543212",
      createdOn: "2025-03-10",
    },
    {
      id: "usr_4",
      name: "Priya Singh",
      email: "priya.singh@example.com",
      mobile: "9876543213",
      createdOn: "2025-04-05",
    },
    {
      id: "usr_5",
      name: "Vikram Reddy",
      email: "vikram.reddy@example.com",
      mobile: "9876543214",
      createdOn: "2025-05-01",
    },
  ];

  // Filter users based on search query
  const filteredUsers = searchQuery ? allUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.mobile.includes(searchQuery)
  ) : allUsers;

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </div>
        </div>
        <CardDescription>
          View, manage, and search for users on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Created On</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-mono text-xs">{user.id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.mobile}</TableCell>
                <TableCell>{user.createdOn}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
