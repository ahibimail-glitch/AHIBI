"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useEventDepartments } from "@/app/organizer/components/crm/useEventDepartments";

const inputClass =
  "bg-[#0d1117] border-[#21262d] text-white placeholder:text-[#6e7681] focus-visible:ring-[#f97316]";

type Role = { id: string; name: string; description: string };
type Responsibility = {
  id: string;
  title: string;
  description: string;
  departmentId: string | null;
  departmentName: string | null;
  assigneeId: string | null;
  priority: string;
  expectedOutcome: string;
};

interface CrmRolesProps {
  eventId: string;
}

const priorityStyles: Record<string, string> = {
  low: "bg-[#21262d] text-[#8b949e]",
  medium: "bg-[#f97316]/15 text-[#fb923c]",
  high: "bg-red-500/15 text-red-400",
};

export default function CrmRoles({ eventId }: CrmRolesProps) {
  const { toast } = useToast();
  const { departments, loading: deptLoading, apiUrl, tokenName } = useEventDepartments({ eventId });

  const [roles, setRoles] = useState<Role[]>([]);
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [loading, setLoading] = useState(true);

  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [addingRole, setAddingRole] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  const [rTitle, setRTitle] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rDept, setRDept] = useState("");
  const [rOutcome, setROutcome] = useState("");
  const [addingResp, setAddingResp] = useState(false);
  const [deletingRespId, setDeletingRespId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem(tokenName);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load roles");
      }
      setRoles(data.data?.roles || []);
      setResponsibilities(data.data?.responsibilities || []);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load roles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiUrl, eventId, tokenName, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddRole = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = roleName.trim();
    if (!trimmed) {
      toast({ title: "Role name is required", variant: "destructive" });
      return;
    }

    try {
      setAddingRole(true);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/roles`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmed, description: roleDesc.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add role");
      }

      setRoleName("");
      setRoleDesc("");
      toast({ title: "Role added", description: trimmed });
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add role",
        variant: "destructive",
      });
    } finally {
      setAddingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string, name: string) => {
    if (!confirm(`Delete role "${name}"?`)) return;

    try {
      setDeletingRoleId(roleId);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/roles/${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete role");
      }
      toast({ title: "Role removed", description: name });
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete role",
        variant: "destructive",
      });
    } finally {
      setDeletingRoleId(null);
    }
  };

  const handleAddResp = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = rTitle.trim();
    if (!trimmed) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    try {
      setAddingResp(true);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/responsibilities`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmed,
          description: rDesc.trim() || undefined,
          departmentId: rDept || undefined,
          expectedOutcome: rOutcome.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add responsibility");
      }

      setRTitle("");
      setRDesc("");
      setROutcome("");
      setRDept("");
      toast({ title: "Responsibility added", description: trimmed });
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add responsibility",
        variant: "destructive",
      });
    } finally {
      setAddingResp(false);
    }
  };

  const handleDeleteResp = async (respId: string, title: string) => {
    if (!confirm(`Delete responsibility "${title}"?`)) return;

    try {
      setDeletingRespId(respId);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(
        `${apiUrl}/api/organizer/events/${eventId}/responsibilities/${respId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete responsibility");
      }
      toast({ title: "Responsibility removed", description: title });
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete responsibility",
        variant: "destructive",
      });
    } finally {
      setDeletingRespId(null);
    }
  };

  if (loading || deptLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Roles & Responsibilities</h1>
        <p className="text-sm text-[#8b949e] mt-1">
          Custom event roles and assigned responsibilities.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e]">
          Custom roles
        </h2>
        <form
          onSubmit={handleAddRole}
          className="mt-3 grid gap-3 rounded-xl border border-[#21262d] bg-[#131820] p-4 md:grid-cols-[1fr_2fr_auto] md:items-end"
        >
          <Input
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Role name"
            className={`${inputClass} h-10`}
          />
          <Input
            value={roleDesc}
            onChange={(e) => setRoleDesc(e.target.value)}
            placeholder="Description"
            className={`${inputClass} h-10`}
          />
          <button
            type="submit"
            disabled={addingRole}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-black transition-colors h-10"
          >
            {addingRole ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add role
          </button>
        </form>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.length === 0 && (
            <p className="text-sm text-[#8b949e] sm:col-span-2 lg:col-span-3">No custom roles yet.</p>
          )}
          {roles.map((r) => (
            <div
              key={r.id}
              className="group flex items-start justify-between gap-2 rounded-xl border border-[#21262d] bg-[#131820] p-4"
            >
              <div className="min-w-0">
                <div className="font-medium text-white">{r.name}</div>
                {r.description && (
                  <div className="text-xs text-[#8b949e] mt-0.5">{r.description}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDeleteRole(r.id, r.name)}
                disabled={deletingRoleId === r.id}
                className="p-1.5 text-[#6e7681] hover:text-red-400 rounded-md hover:bg-[#1e2433] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 disabled:opacity-50"
                aria-label={`Delete ${r.name}`}
              >
                {deletingRoleId === r.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e]">
          Responsibilities
        </h2>
        <form
          onSubmit={handleAddResp}
          className="mt-3 grid gap-3 rounded-xl border border-[#21262d] bg-[#131820] p-4 md:grid-cols-2"
        >
          <Input
            value={rTitle}
            onChange={(e) => setRTitle(e.target.value)}
            placeholder="Title (e.g. Manage Gate 2 Operations)"
            className={`${inputClass} h-10 md:col-span-2`}
          />
          <select
            value={rDept}
            onChange={(e) => setRDept(e.target.value)}
            className={`${inputClass} h-10 rounded-md border px-3 py-2 text-sm`}
          >
            <option value="">No department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Input
            value={rOutcome}
            onChange={(e) => setROutcome(e.target.value)}
            placeholder="Expected outcome"
            className={`${inputClass} h-10`}
          />
          <Textarea
            value={rDesc}
            onChange={(e) => setRDesc(e.target.value)}
            placeholder="Description"
            rows={2}
            className={`${inputClass} md:col-span-2 resize-none`}
          />
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={addingResp}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-black transition-colors"
            >
              {addingResp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add responsibility
            </button>
          </div>
        </form>

        <div className="mt-3 space-y-3">
          {responsibilities.length === 0 ? (
            <p className="text-sm text-[#8b949e]">No responsibilities yet.</p>
          ) : (
            responsibilities.map((r) => (
              <div
                key={r.id}
                className="group rounded-xl border border-[#21262d] bg-[#131820] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-white">{r.title}</div>
                  <button
                    type="button"
                    onClick={() => handleDeleteResp(r.id, r.title)}
                    disabled={deletingRespId === r.id}
                    className="p-1.5 text-[#6e7681] hover:text-red-400 rounded-md hover:bg-[#1e2433] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 disabled:opacity-50"
                    aria-label={`Delete ${r.title}`}
                  >
                    {deletingRespId === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {r.description && (
                  <p className="mt-1 text-sm text-[#8b949e]">{r.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {r.departmentName && (
                    <span className="rounded-full bg-[#21262d] px-2.5 py-0.5 text-[#c9d1d9]">
                      {r.departmentName}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 capitalize ${
                      priorityStyles[r.priority] || priorityStyles.medium
                    }`}
                  >
                    {r.priority}
                  </span>
                  {r.expectedOutcome && (
                    <span className="text-[#8b949e]">→ {r.expectedOutcome}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
