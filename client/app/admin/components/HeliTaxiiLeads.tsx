"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface LeadUser {
  name?: string;
  email?: string;
  phone?: string;
}

interface HeliTaxiiLead {
  _id: string;
  user?: LeadUser;
  packageId: string;
  packageName: string;
  price?: number;
  duration?: string;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    leads: HeliTaxiiLead[];
  };
}

export default function HeliTaxiiLeads() {
  const [leads, setLeads] = useState<HeliTaxiiLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
        const res = await fetch("/api/admin/helitaxii/leads", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch leads (${res.status})`);
        }

        const json: ApiResponse | any = await res.json();
        const dataLeads: HeliTaxiiLead[] = json.data?.leads || json.leads || [];
        setLeads(dataLeads);
      } catch (err: any) {
        console.error("Error fetching Helitaxii leads:", err);
        setError(err?.message || "Failed to load leads");
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  const filteredLeads = leads.filter((lead) => {
    const q = search.toLowerCase();
    const userName = lead.user?.name || "";
    const userEmail = lead.user?.email || "";
    const userPhone = lead.user?.phone || "";
    return (
      lead.packageName.toLowerCase().includes(q) ||
      userName.toLowerCase().includes(q) ||
      userEmail.toLowerCase().includes(q) ||
      userPhone.includes(q)
    );
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>HeliTaxii Leads</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            All users who clicked Book Now on the HeliTaxii page. No bookings, just captured interest.
          </p>
        </div>
        <Input
          placeholder="Search by user or package..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Loading leads...</p>}
        {error && !loading && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && filteredLeads.length === 0 && (
          <p className="text-sm text-muted-foreground">No leads found.</p>
        )}

        {!loading && !error && filteredLeads.length > 0 && (
          <div className="rounded-md border overflow-hidden mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created At</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const created = new Date(lead.createdAt);
                  const createdStr = created.toLocaleString();
                  const priceStr = typeof lead.price === "number" ? `₹${lead.price.toLocaleString()}` : "-";

                  return (
                    <TableRow key={lead._id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {createdStr}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="font-medium">{lead.user?.name || "Unknown User"}</span>
                          <span className="text-xs text-muted-foreground">
                            {lead.user?.email || "No email"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span>{lead.user?.phone || "No phone"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="font-medium">{lead.packageName}</span>
                          <Badge variant="outline" className="mt-1 w-fit text-[11px]">
                            {lead.packageId}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{priceStr}</TableCell>
                      <TableCell className="text-sm">{lead.duration || "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
