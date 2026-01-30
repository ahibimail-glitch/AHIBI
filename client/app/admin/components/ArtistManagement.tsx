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
import { Loader2, Eye, Trash2, CheckCircle, XCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ApprovalStatus = "pending" | "approved" | "rejected";

type ArtistListItem = {
  _id: string;
  name?: string;
  stageName?: string;
  email?: string;
  phone?: string;
  city?: string;
  type?: string;
  experience?: string;
  approvalStatus?: ApprovalStatus;
  status?: string;
  createdAt: string;
  profilePic?: string;
};

type ArtistDetails = Record<string, any> & { _id: string };

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

export default function ArtistManagement() {
  const { toast } = useToast();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [artists, setArtists] = useState<ArtistListItem[]>([]);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | ApprovalStatus>("all");

  const [processingId, setProcessingId] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [artistDetails, setArtistDetails] = useState<ArtistDetails | null>(null);

  const fetchArtists = async () => {
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

      const res = await axios.get(`${apiUrl}/api/admin/artists`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to fetch artists");
      }

      setArtists(res.data?.data?.artists || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to fetch artists");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, [statusFilter]);

  const filteredArtists = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return artists;

    return artists.filter((a) => {
      const haystack = [a.name, a.stageName, a.email, a.phone, a.city, a.type, a.experience]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [artists, search]);

  const statusCounts = useMemo(() => {
    const counts = { total: 0, pending: 0, approved: 0, rejected: 0 };
    counts.total = artists.length;
    for (const a of artists) {
      if (a.approvalStatus === "approved") counts.approved += 1;
      else if (a.approvalStatus === "rejected") counts.rejected += 1;
      else counts.pending += 1;
    }
    return counts;
  }, [artists]);

  const overviewForDetails = useMemo(() => {
    if (!artistDetails) return null;
    const keys = [
      "_id",
      "stageName",
      "name",
      "email",
      "phone",
      "city",
      "type",
      "experience",
      "approvalStatus",
      "status",
      "createdAt",
      "updatedAt",
      "performanceRegions",
      "languages",
    ];
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (artistDetails[k] !== undefined) out[k] = artistDetails[k];
    }
    return out;
  }, [artistDetails]);

  const bioForDetails = useMemo(() => {
    if (!artistDetails) return null;
    const keys = ["shortBio", "bio", "longBio", "audienceVibe", "eventTypes", "eventTypesOther", "artistCategories"];
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (artistDetails[k] !== undefined) out[k] = artistDetails[k];
    }
    return out;
  }, [artistDetails]);

  const pricingForDetails = useMemo(() => {
    if (!artistDetails) return null;
    const keys = ["feeRange", "basePrice", "customPricing", "performanceDurations", "performanceDurationOther", "performanceFormats", "performanceFormatsOther"];
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (artistDetails[k] !== undefined) out[k] = artistDetails[k];
    }
    return out;
  }, [artistDetails]);

  const galleryForDetails = useMemo(() => {
    if (!artistDetails) return null;
    const keys = ["profilePic", "gallery", "accolades"];
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (artistDetails[k] !== undefined) out[k] = artistDetails[k];
    }
    return out;
  }, [artistDetails]);

  const termsForDetails = useMemo(() => {
    if (!artistDetails) return null;
    const keys = ["termsAndConditions", "cancellationPolicy"];
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (artistDetails[k] !== undefined) out[k] = artistDetails[k];
    }
    return out;
  }, [artistDetails]);

  const techForDetails = useMemo(() => {
    if (!artistDetails) return null;
    const keys = ["techRider"];
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (artistDetails[k] !== undefined) out[k] = artistDetails[k];
    }
    return out;
  }, [artistDetails]);

  const socialForDetails = useMemo(() => {
    if (!artistDetails) return null;
    const keys = ["socialLinks"];
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (artistDetails[k] !== undefined) out[k] = artistDetails[k];
    }
    return out;
  }, [artistDetails]);

  const openDetails = async (id: string) => {
    try {
      setSelectedArtistId(id);
      setDetailsOpen(true);
      setArtistDetails(null);
      setDetailsLoading(true);

      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error("Admin authentication required");
      }

      const res = await axios.get(`${apiUrl}/api/admin/artists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to fetch artist details");
      }

      setArtistDetails(res.data?.data?.artist || null);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message || e?.message || "Failed to fetch artist details",
        variant: "destructive",
      });
      setDetailsOpen(false);
      setSelectedArtistId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const approveArtist = async (id: string) => {
    try {
      setProcessingId(id);
      const token = localStorage.getItem("admin_token");
      if (!token) throw new Error("Admin authentication required");

      const res = await axios.put(
        `${apiUrl}/api/admin/artists/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to approve artist");
      }

      toast({ title: "Success", description: "Artist approved successfully" });
      await fetchArtists();

      if (selectedArtistId === id && detailsOpen) {
        await openDetails(id);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message || e?.message || "Failed to approve artist",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const rejectArtist = async (id: string) => {
    const reason = window.prompt("Please enter the reason for rejection:");
    if (!reason) return;

    try {
      setProcessingId(id);
      const token = localStorage.getItem("admin_token");
      if (!token) throw new Error("Admin authentication required");

      const res = await axios.put(
        `${apiUrl}/api/admin/artists/${id}/reject`,
        { rejectionReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to reject artist");
      }

      toast({ title: "Success", description: "Artist rejected successfully" });
      await fetchArtists();

      if (selectedArtistId === id && detailsOpen) {
        await openDetails(id);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message || e?.message || "Failed to reject artist",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const deleteArtist = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this artist? This will remove their bookings/availability and unlink them from events."
    );
    if (!confirmed) return;

    try {
      setProcessingId(id);
      const token = localStorage.getItem("admin_token");
      if (!token) throw new Error("Admin authentication required");

      const res = await axios.delete(`${apiUrl}/api/admin/artists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to delete artist");
      }

      toast({ title: "Success", description: "Artist deleted successfully" });
      setArtists((prev) => prev.filter((a) => a._id !== id));

      if (selectedArtistId === id) {
        setDetailsOpen(false);
        setSelectedArtistId(null);
        setArtistDetails(null);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message || e?.message || "Failed to delete artist",
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
              <CardTitle>Artist Management</CardTitle>
              <CardDescription>
                Clean management view for artists: review details, approve/reject, or delete.
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search artists..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>

              <Button variant="outline" onClick={fetchArtists}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border bg-white">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500">Total Artists</div>
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
              <Button className="mt-4" variant="outline" onClick={fetchArtists}>
                Retry
              </Button>
            </div>
          ) : filteredArtists.length === 0 ? (
            <div className="py-10 text-center text-gray-500">No artists found.</div>
          ) : (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artist</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArtists.map((a) => {
                    const approvalStatus = a.approvalStatus || "pending";
                    const statusBadgeClass =
                      approvalStatus === "approved"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : approvalStatus === "rejected"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200";

                    return (
                      <TableRow key={a._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {a.profilePic ? (
                              <img
                                src={a.profilePic}
                                alt=""
                                className="h-10 w-10 rounded-md object-cover border"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : null}
                            <div>
                              <div className="font-medium text-gray-900">
                                {a.stageName || a.name || "Unknown"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {a.stageName && a.name ? a.name : ""}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{a.email || "No email"}</div>
                          <div className="text-xs text-gray-500">{a.phone || "No phone"}</div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{a.city || "Not provided"}</div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{a.type || "Not provided"}</div>
                          <div className="text-xs text-gray-500">{a.experience || ""}</div>
                        </TableCell>

                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass}`}>
                            {approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}
                          </span>
                        </TableCell>

                        <TableCell className="text-sm">{formatDate(a.createdAt)}</TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => openDetails(a._id)}
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
                                  disabled={processingId === a._id}
                                  onClick={() => approveArtist(a._id)}
                                >
                                  {processingId === a._id ? (
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
                                  disabled={processingId === a._id}
                                  onClick={() => rejectArtist(a._id)}
                                >
                                  {processingId === a._id ? (
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
                              disabled={processingId === a._id}
                              onClick={() => deleteArtist(a._id)}
                            >
                              {processingId === a._id ? (
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
            setSelectedArtistId(null);
            setArtistDetails(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Artist Details</DialogTitle>
            <DialogDescription>
              Review everything the artist submitted.
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : !artistDetails ? (
            <div className="py-10 text-center text-gray-500">No details available.</div>
          ) : (
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  {artistDetails.profilePic ? (
                    <img
                      src={artistDetails.profilePic}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover border"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {artistDetails.stageName || artistDetails.name || "Unknown"}
                    </div>
                    <div className="text-sm text-gray-600">{artistDetails.email || "No email"}</div>
                    <div className="text-sm text-gray-600">{artistDetails.phone || "No phone"}</div>
                    <div className="mt-2">
                      <Badge
                        variant="secondary"
                        className={
                          artistDetails.approvalStatus === "approved"
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : artistDetails.approvalStatus === "rejected"
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                        }
                      >
                        {(artistDetails.approvalStatus || "pending")
                          .toString()
                          .charAt(0)
                          .toUpperCase() +
                          (artistDetails.approvalStatus || "pending").toString().slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedArtistId ? (
                  <div className="flex flex-wrap gap-2">
                    {(artistDetails.approvalStatus || "pending") === "pending" ? (
                      <>
                        <Button
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          disabled={processingId === selectedArtistId}
                          onClick={() => approveArtist(selectedArtistId)}
                        >
                          {processingId === selectedArtistId ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          disabled={processingId === selectedArtistId}
                          onClick={() => rejectArtist(selectedArtistId)}
                        >
                          {processingId === selectedArtistId ? (
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
                      disabled={processingId === selectedArtistId}
                      onClick={() => deleteArtist(selectedArtistId)}
                    >
                      {processingId === selectedArtistId ? (
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
                  <TabsTrigger value="bio">Bio</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="gallery">Gallery</TabsTrigger>
                  <TabsTrigger value="terms">Terms</TabsTrigger>
                  <TabsTrigger value="tech">Tech</TabsTrigger>
                  <TabsTrigger value="social">Social</TabsTrigger>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
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

                <TabsContent value="bio">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Bio & Categories</CardTitle>
                      <CardDescription>What the artist says about themselves.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ObjectRenderer data={bioForDetails} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pricing">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Pricing & Formats</CardTitle>
                      <CardDescription>Rates, fee ranges, formats and durations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ObjectRenderer data={pricingForDetails} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="gallery">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Gallery & Accolades</CardTitle>
                      <CardDescription>Photos/videos and achievements.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ObjectRenderer data={galleryForDetails} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="terms">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Terms & Cancellation</CardTitle>
                      <CardDescription>Policies and contract terms.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ObjectRenderer data={termsForDetails} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tech">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Tech Rider</CardTitle>
                      <CardDescription>Sound, lighting, equipment requirements.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ObjectRenderer data={techForDetails} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="social">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Social Links</CardTitle>
                      <CardDescription>External links submitted by artist.</CardDescription>
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
                      <ObjectRenderer data={artistDetails} />
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
