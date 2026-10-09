"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, Trash2, CheckCircle, XCircle, Search, Building, Mail, Phone, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ApprovalStatus = "pending" | "approved" | "rejected";

type OrganizerListItem = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  city?: string;
  state?: string;
  approvalStatus?: ApprovalStatus;
  status?: string;
  createdAt: string;
  profilePic?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
};

type OrganizerDetails = Record<string, any> & { _id: string };

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function isProbablyUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function formatLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function ValueRenderer({ value }: { value: any }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-400">Not provided</span>;
  }

  if (typeof value === "string") {
    if (isProbablyUrl(value)) {
      const isImage = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(value);
      return (
        <div className="space-y-2">
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline break-all"
          >
            {value}
          </a>
          {isImage ? (
            <img
              src={value}
              alt=""
              className="max-h-56 w-auto rounded border"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </div>
      );
    }

    const maybeDate = new Date(value);
    if (!Number.isNaN(maybeDate.getTime()) && /\d{4}-\d{2}-\d{2}/.test(value)) {
      return <span>{maybeDate.toLocaleString()}</span>;
    }

    return <span className="break-words">{value}</span>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">Not provided</span>;

    const allPrimitive = value.every(
      (v) => v === null || v === undefined || ["string", "number", "boolean"].includes(typeof v)
    );

    if (allPrimitive) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((v, idx) => (
            <Badge key={idx} variant="secondary" className="break-all">
              {String(v)}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {value.map((v, idx) => (
          <div key={idx} className="rounded border bg-white p-3">
            <ObjectRenderer data={v} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    return <ObjectRenderer data={value} />;
  }

  return <span className="break-words">{String(value)}</span>;
}

function ObjectRenderer({ data }: { data: any }) {
  if (!data || typeof data !== "object") return <span className="text-gray-400">Not provided</span>;

  const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
  if (entries.length === 0) return <span className="text-gray-400">Not provided</span>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-1">
          <div className="text-xs font-semibold text-gray-600">{formatLabel(key)}</div>
          <div className="text-sm text-gray-900">
            <ValueRenderer value={value} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OrganizerManagement() {
  const { toast } = useToast();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organizers, setOrganizers] = useState<OrganizerListItem[]>([]);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | ApprovalStatus>("all");

  const [processingId, setProcessingId] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [organizerDetails, setOrganizerDetails] = useState<OrganizerDetails | null>(null);

  const fetchOrganizers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("admin_token");
      if (!token) {
        setError("Admin authentication required");
        return;
      }

      const params: Record<string, any> = { limit: 200, page: 1 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await axios.get(`${apiUrl}/api/admin/organizers`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to fetch organizers");
      }

      setOrganizers(res.data?.data?.organizers || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to fetch organizers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizers();
  }, [statusFilter]);

  const filteredOrganizers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizers;

    return organizers.filter((o) => {
      const haystack = [
        o.name,
        o.email,
        o.phone,
        o.companyName,
        o.city,
        o.state,
        o.address?.city,
        o.address?.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [organizers, search]);

  const statusCounts = useMemo(() => {
    const counts = { total: 0, pending: 0, approved: 0, rejected: 0 };
    counts.total = organizers.length;
    for (const o of organizers) {
      if (o.approvalStatus === "approved") counts.approved += 1;
      else if (o.approvalStatus === "rejected") counts.rejected += 1;
      else counts.pending += 1;
    }
    return counts;
  }, [organizers]);

  const overviewForDetails = useMemo(() => {
    if (!organizerDetails) return null;
    const keys = [
      "_id",
      "name",
      "email",
      "phone",
      "approvalStatus",
      "status",
      "createdAt",
      "updatedAt",
      "companyName",
      "website",
      "establishedYear",
    ];
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (organizerDetails[k] !== undefined) out[k] = organizerDetails[k];
    }
    return out;
  }, [organizerDetails]);

  const addressForDetails = useMemo(() => {
    if (!organizerDetails) return null;
    const keys = ["address", "officeAddress"];
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (organizerDetails[k] !== undefined) out[k] = organizerDetails[k];
    }
    return out;
  }, [organizerDetails]);

  const businessForDetails = useMemo(() => {
    if (!organizerDetails) return null;
    const keys = ["businessType", "services", "eventTypes", "targetAudience"];
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (organizerDetails[k] !== undefined) out[k] = organizerDetails[k];
    }
    return out;
  }, [organizerDetails]);

  const socialForDetails = useMemo(() => {
    if (!organizerDetails) return null;
    const keys = ["socialLinks", "portfolio"];
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (organizerDetails[k] !== undefined) out[k] = organizerDetails[k];
    }
    return out;
  }, [organizerDetails]);

  const openDetails = async (id: string) => {
    try {
      setSelectedOrganizerId(id);
      setDetailsOpen(true);
      setOrganizerDetails(null);
      setDetailsLoading(true);

      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error("Admin authentication required");
      }

      const res = await axios.get(`${apiUrl}/api/admin/organizers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to fetch organizer details");
      }

      setOrganizerDetails(res.data?.data?.organizer || null);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message || e?.message || "Failed to fetch organizer details",
        variant: "destructive",
      });
      setDetailsOpen(false);
      setSelectedOrganizerId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const approveOrganizer = async (id: string) => {
    try {
      setProcessingId(id);
      const token = localStorage.getItem("admin_token");
      if (!token) throw new Error("Admin authentication required");

      const res = await axios.put(
        `${apiUrl}/api/admin/organizers/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to approve organizer");
      }

      toast({ title: "Success", description: "Organizer approved successfully" });
      await fetchOrganizers();

      if (selectedOrganizerId === id && detailsOpen) {
        await openDetails(id);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message || e?.message || "Failed to approve organizer",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const rejectOrganizer = async (id: string) => {
    const reason = window.prompt("Please enter the reason for rejection:");
    if (!reason) return;

    try {
      setProcessingId(id);
      const token = localStorage.getItem("admin_token");
      if (!token) throw new Error("Admin authentication required");

      const res = await axios.put(
        `${apiUrl}/api/admin/organizers/${id}/reject`,
        { rejectionReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to reject organizer");
      }

      toast({ title: "Success", description: "Organizer rejected successfully" });
      await fetchOrganizers();

      if (selectedOrganizerId === id && detailsOpen) {
        await openDetails(id);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message || e?.message || "Failed to reject organizer",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const deleteOrganizer = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this organizer? This will remove all associated events and data."
    );
    if (!confirmed) return;

    try {
      setProcessingId(id);
      const token = localStorage.getItem("admin_token");
      if (!token) throw new Error("Admin authentication required");

      const res = await axios.delete(`${apiUrl}/api/admin/organizers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to delete organizer");
      }

      toast({ title: "Success", description: "Organizer deleted successfully" });
      setOrganizers((prev) => prev.filter((o) => o._id !== id));

      if (selectedOrganizerId === id) {
        setDetailsOpen(false);
        setSelectedOrganizerId(null);
        setOrganizerDetails(null);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message || e?.message || "Failed to delete organizer",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Organizer Management</CardTitle>
              <CardDescription>
                Clean management view for organizers: review details, approve/reject, or delete.
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search organizers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>

              <Button variant="outline" onClick={fetchOrganizers}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border bg-white">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500">Total Organizers</div>
                <div className="text-2xl font-semibold text-gray-900">{statusCounts.total}</div>
              </CardContent>
            </Card>
            <Card className="border bg-white">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500">Pending</div>
                <div className="text-2xl font-semibold text-yellow-700">{statusCounts.pending}</div>
              </CardContent>
            </Card>
            <Card className="border bg-white">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500">Approved</div>
                <div className="text-2xl font-semibold text-green-700">{statusCounts.approved}</div>
              </CardContent>
            </Card>
            <Card className="border bg-white">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500">Rejected</div>
                <div className="text-2xl font-semibold text-red-700">{statusCounts.rejected}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as any)}
            className="mb-6"
          >
            <TabsList className="bg-white">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="py-10 text-center">
              <div className="text-red-500">{error}</div>
              <Button className="mt-4" variant="outline" onClick={fetchOrganizers}>
                Retry
              </Button>
            </div>
          ) : filteredOrganizers.length === 0 ? (
            <div className="py-10 text-center text-gray-500">No organizers found.</div>
          ) : (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizers.map((o) => {
                    const approvalStatus = o.approvalStatus || "pending";
                    const statusBadgeClass =
                      approvalStatus === "approved"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : approvalStatus === "rejected"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200";

                    return (
                      <TableRow key={o._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Building className="h-10 w-10 rounded-md object-cover border text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {o.name || "Unknown"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {o.companyName || ""}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{o.email || "No email"}</div>
                          <div className="text-xs text-gray-500">{o.phone || "No phone"}</div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{o.companyName || "Not provided"}</div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{o.city || o.address?.city || "Not provided"}</div>
                          <div className="text-xs text-gray-500">{o.state || o.address?.state || ""}</div>
                        </TableCell>

                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass}`}>
                            {approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}
                          </span>
                        </TableCell>

                        <TableCell className="text-sm">{formatDate(o.createdAt)}</TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => openDetails(o._id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>

                            {approvalStatus === "pending" ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 text-green-600 hover:bg-green-50"
                                  disabled={processingId === o._id}
                                  onClick={() => approveOrganizer(o._id)}
                                >
                                  {processingId === o._id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  )}
                                  Approve
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 text-red-600 hover:bg-red-50"
                                  disabled={processingId === o._id}
                                  onClick={() => rejectOrganizer(o._id)}
                                >
                                  {processingId === o._id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                  )}
                                  Reject
                                </Button>
                              </>
                            ) : null}

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-red-600 hover:bg-red-50"
                              disabled={processingId === o._id}
                              onClick={() => deleteOrganizer(o._id)}
                            >
                              {processingId === o._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedOrganizerId(null);
            setOrganizerDetails(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Organizer Details</DialogTitle>
            <DialogDescription>
              Review everything the organizer submitted.
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : !organizerDetails ? (
            <div className="py-10 text-center text-gray-500">No details available.</div>
          ) : (
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Building className="h-16 w-16 rounded-lg object-cover border text-gray-400" />
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {organizerDetails.name || "Unknown"}
                    </div>
                    <div className="text-sm text-gray-600">{organizerDetails.email || "No email"}</div>
                    <div className="text-sm text-gray-600">{organizerDetails.phone || "No phone"}</div>
                    <div className="mt-2">
                      <Badge
                        variant="secondary"
                        className={
                          organizerDetails.approvalStatus === "approved"
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : organizerDetails.approvalStatus === "rejected"
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                        }
                      >
                        {(organizerDetails.approvalStatus || "pending")
                          .toString()
                          .charAt(0)
                          .toUpperCase() +
                          (organizerDetails.approvalStatus || "pending").toString().slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedOrganizerId ? (
                  <div className="flex flex-wrap gap-2">
                    {(organizerDetails.approvalStatus || "pending") === "pending" ? (
                      <>
                        <Button
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          disabled={processingId === selectedOrganizerId}
                          onClick={() => approveOrganizer(selectedOrganizerId)}
                        >
                          {processingId === selectedOrganizerId ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          disabled={processingId === selectedOrganizerId}
                          onClick={() => rejectOrganizer(selectedOrganizerId)}
                        >
                          {processingId === selectedOrganizerId ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Reject
                        </Button>
                      </>
                    ) : null}
                    <Button
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      disabled={processingId === selectedOrganizerId}
                      onClick={() => deleteOrganizer(selectedOrganizerId)}
                    >
                      {processingId === selectedOrganizerId ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-white flex flex-wrap justify-start">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="address">Address</TabsTrigger>
                  <TabsTrigger value="business">Business</TabsTrigger>
                  <TabsTrigger value="social">Social</TabsTrigger>
                  <TabsTrigger value="raw">Raw Data</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Overview</CardTitle>
                      <CardDescription>Key identity and status information.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ObjectRenderer data={overviewForDetails} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="address">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Address & Location</CardTitle>
                      <CardDescription>Business address and location details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ObjectRenderer data={addressForDetails} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="business">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Business Details</CardTitle>
                      <CardDescription>Business type, services and offerings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ObjectRenderer data={businessForDetails} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="social">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Social & Portfolio</CardTitle>
                      <CardDescription>Social media links and portfolio.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ObjectRenderer data={socialForDetails} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="raw">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Raw Data</CardTitle>
                      <CardDescription>Everything as returned by the backend.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ObjectRenderer data={organizerDetails} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
