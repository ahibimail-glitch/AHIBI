"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface Player {
  _id: string;
  fullName: string;
  gender: string;
  phone: string;
  choice_of_controller: string;
  photo: string;
  registrationStatus?: string;
  createdAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export default function FC25Players() {
  const [items, setItems] = useState<Player[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("admin_token") || "";
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/fc25/players?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!res.ok) {
        let message = `Failed to fetch players (${res.status})`;
        try {
          const err = await res.json();
          if (err?.message) message = err.message;
        } catch {}
        throw new Error(message);
      }

      const json: ApiResponse<{ items: Player[]; pagination: { page: number; limit: number; total: number; pages: number } }> = await res.json();
      const data = json.data || (json as any);
      setItems(data.items || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchData();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">FC25 Registered Players</h2>
        <div className="text-sm text-gray-600">Total: {total}</div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by name, phone or controller"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md"
        />
        <Button onClick={() => fetchData()} disabled={loading}>Search</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Photo</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Gender</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-left">Controller</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Registered</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center">Loading...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-red-600">{error}</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500">No players found</td>
                  </tr>
                ) : (
                  items.map((p) => (
                    <tr key={p._id} className="border-t">
                      <td className="px-4 py-2">
                        {p.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.photo} alt={p.fullName} className="h-12 w-12 object-cover rounded" />
                        ) : (
                          <div className="h-12 w-12 bg-gray-200 rounded" />
                        )}
                      </td>
                      <td className="px-4 py-2 font-medium">{p.fullName}</td>
                      <td className="px-4 py-2">{p.gender}</td>
                      <td className="px-4 py-2">{p.phone}</td>
                      <td className="px-4 py-2">{p.choice_of_controller}</td>
                      <td className="px-4 py-2 capitalize">{p.registrationStatus || 'pending'}</td>
                      <td className="px-4 py-2">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
            Previous
          </Button>
          <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
