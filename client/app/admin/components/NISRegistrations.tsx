"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Search,
  Eye,
  Download,
  Users,
  Calendar,
  Award,
  TrendingUp,
  Filter,
  RefreshCw
} from "lucide-react";
import { getNicheLabel } from "@/lib/niche-labels";

interface NISRegistration {
  _id: string;
  registrationId: string;
  fullName: string;
  creatorName: string;
  email: string;
  mobileNumber: string;
  dateOfBirth: string;
  gender: string;
  bio: string;
  nagalandResident: boolean;
  platforms: Array<{
    platform: string;
    handle: string;
    profileUrl: string;
    followerCount: number;
    isPrimary: boolean;
    engagementRate?: number;
  }>;
  totalFollowers: number;
  topContent: Array<{
    title: string;
    platform: string;
    url: string;
    type: string;
    views: number;
    likes: number;
    shares: number;
    comments: number;
  }>;
  contentNiches: string[];
  customNiches: string[];
  awardCategories: string[];
  campusName?: string;
  yearsActive: number;
  achievements: string;
  brandCollaborations: Array<{
    brandName: string;
    campaignTitle: string;
    year: string;
    type: string;
    description: string;
  }>;
  consents: {
    accuracy: boolean;
    terms: boolean;
    dataUsage: boolean;
    emailCopy: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export default function NISRegistrations() {
  const [registrations, setRegistrations] = useState<NISRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegistration, setSelectedRegistration] = useState<NISRegistration | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    topCategory: "",
    avgFollowers: 0
  });

  // Fetch registrations
  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/nis/registrations');
      if (response.ok) {
        const data = await response.json();
        const docs: NISRegistration[] = data.data.docs || [];
        setRegistrations(docs);

        const total = data.data.total || docs.length || 0;
        const thisMonth = docs.filter((reg: NISRegistration) =>
          new Date(reg.createdAt).getMonth() === new Date().getMonth()
        ).length || 0;

        // Build category frequency map then find top category name
        const categoryCounts = docs.reduce((acc: Record<string, number>, reg: NISRegistration) => {
          const cats = Array.isArray(reg.awardCategories) && reg.awardCategories.length ? reg.awardCategories : ['Uncategorised'];
          cats.forEach((key) => {
            acc[key] = (acc[key] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>);
        const topCategory = Object.keys(categoryCounts).length
          ? Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0]
          : '';

        const avgFollowers = docs.length
          ? docs.reduce((sum: number, reg: NISRegistration) => sum + (reg.totalFollowers || 0), 0) / docs.length
          : 0;

        setStats({ total, thisMonth, topCategory, avgFollowers });
      }
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  // Filter registrations based on search query
  const filteredRegistrations = registrations.filter(reg =>
    reg.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reg.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reg.registrationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (Array.isArray(reg.awardCategories) && reg.awardCategories.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Registration ID', 'Full Name', 'Creator Name', 'Email', 'Mobile Number', 'Date of Birth',
      'Gender', 'Nagaland Resident', 'Total Followers', 'Award Categories',
      'Years Active', 'Content Niches', 'Created At'
    ];

    const csvData = filteredRegistrations.map(reg => [
      reg.registrationId,
      reg.fullName,
      reg.creatorName,
      reg.email,
      reg.mobileNumber,
      reg.dateOfBirth,
      reg.gender,
      reg.nagalandResident ? 'Yes' : 'No',
      reg.totalFollowers,
      (reg.awardCategories || []).join('|'),
      reg.yearsActive,
      [...reg.contentNiches.map(niche => getNicheLabel(niche)), ...reg.customNiches].join(', '),
      new Date(reg.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nis-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Fashion & Lifestyle': 'bg-pink-100 text-pink-800',
      'Food & Travel': 'bg-orange-100 text-orange-800',
      'Tech & Gaming': 'bg-blue-100 text-blue-800',
      'Beauty & Wellness': 'bg-purple-100 text-purple-800',
      'Entertainment': 'bg-yellow-100 text-yellow-800',
      'Education': 'bg-green-100 text-green-800',
      'Sports & Fitness': 'bg-red-100 text-red-800',
      'Business & Finance': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading registrations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Registrations</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-3xl font-bold text-gray-900">{stats.thisMonth}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Followers</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.avgFollowers)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Category</p>
                <p className="text-lg font-bold text-gray-900 truncate">{stats.topCategory}</p>
              </div>
              <Award className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search registrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchRegistrations} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>NIS 2025 Registrations ({filteredRegistrations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Creator Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Followers</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((registration) => (
                  <TableRow key={registration._id}>
                    <TableCell className="font-mono text-sm">
                      {registration.registrationId}
                    </TableCell>
                    <TableCell className="font-medium">
                      {registration.fullName}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {registration.creatorName}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {registration.email}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {registration.mobileNumber}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatNumber(registration.totalFollowers)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(registration.awardCategories || []).map((cat, i) => (
                          <Badge key={i} className={getCategoryColor(cat)}>
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={registration.nagalandResident ? "default" : "secondary"}>
                        {registration.nagalandResident ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(registration.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Open a new tab with dedicated details page
                          window.open(`/admin/nis/${registration._id}`, '_blank');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>


                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
