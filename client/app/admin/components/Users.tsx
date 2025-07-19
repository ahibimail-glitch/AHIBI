"use client";

import { useState, useEffect } from "react";
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

export default function Users({ searchQuery, setSearchQuery }: UsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("admin_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const res = await fetch(`${apiUrl}/api/admin/users`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : "",
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include',
          mode: 'cors'
        });
        
        if (!res.ok) {
          let errorMessage = 'Failed to fetch users';
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If we can't parse the error response, use the status text
            errorMessage = res.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        const response = await res.json();
        
        // Check if response has the expected data structure
        if (!response.data || !Array.isArray(response.data.users)) {
          throw new Error("Invalid data format received from server");
        }
        
        // Map backend fields to User type
        const backendUsers = response.data.users.map((u: any) => ({
          id: u._id,
          name: u.name || "",
          email: u.email || "",
          mobile: u.phone || u.mobile || "",
          createdOn: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
        }));
        
        setUsers(backendUsers);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Filter users based on search query
  const filteredUsers = searchQuery
    ? users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.mobile.includes(searchQuery)
      )
    : users;

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
        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading users...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">{error}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Created On</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

