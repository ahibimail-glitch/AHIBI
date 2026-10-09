"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useEventDepartments } from "@/app/organizer/components/crm/useEventDepartments";

const inputClass =
  "bg-[#0d1117] border-[#21262d] text-white placeholder:text-[#6e7681] focus-visible:ring-[#f97316] h-10";

interface CrmDepartmentsProps {
  eventId: string;
  readOnly?: boolean;
}

export default function CrmDepartments({ eventId, readOnly = false }: CrmDepartmentsProps) {
  const { toast } = useToast();
  const { departments, loading, refetch, apiUrl, tokenName } = useEventDepartments({ eventId });
  const [name, setName] = useState("");
  const [color, setColor] = useState("#f97316");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Department name is required", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/departments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmed, color }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add department");
      }

      setName("");
      setColor("#f97316");
      toast({ title: "Department added", description: trimmed });
      await refetch();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add department",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (departmentId: string, departmentName: string) => {
    if (!confirm(`Delete "${departmentName}"?`)) return;

    try {
      setDeletingId(departmentId);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(
        `${apiUrl}/api/organizer/events/${eventId}/departments/${departmentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete department");
      }

      toast({ title: "Department removed", description: departmentName });
      await refetch();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete department",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Departments</h1>
        <p className="text-sm text-[#8b949e] mt-1">Custom departments for this event.</p>
      </div>

      {!readOnly && (
        <div className="rounded-xl border border-[#21262d] bg-[#131820] p-4 sm:p-5 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="department-name" className="text-sm text-[#8b949e]">
                Department name
              </Label>
              <Input
                id="department-name"
                placeholder="Ticketing and Entry"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department-color" className="text-sm text-[#8b949e]">
                Color
              </Label>
              <div className="flex items-center h-10">
                <input
                  id="department-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-md border border-[#21262d] bg-[#0d1117] p-1"
                  aria-label="Department color"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 text-black font-semibold text-sm transition-colors sm:mb-0"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="group flex items-center justify-between gap-3 rounded-xl border border-[#21262d] bg-[#131820] px-4 py-3.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: dept.color }}
                aria-hidden
              />
              <span className="text-sm font-medium text-white truncate">{dept.name}</span>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleDelete(dept.id, dept.name)}
                disabled={deletingId === dept.id}
                className="p-1.5 text-[#6e7681] hover:text-red-400 rounded-md hover:bg-[#1e2433] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 disabled:opacity-50"
                aria-label={`Delete ${dept.name}`}
              >
                {deletingId === dept.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { EventDepartment } from "@/app/organizer/components/crm/useEventDepartments";
