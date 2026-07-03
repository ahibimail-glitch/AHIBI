"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useEventDepartments } from "@/app/organizer/components/crm/useEventDepartments";

export const INCIDENT_CATEGORIES = [
  "Ticketing",
  "Technical",
  "Security",
  "Medical",
  "Artist",
  "Venue",
  "Crowd",
  "Hospitality",
  "Transport",
  "Lost and Found",
  "Vendor",
  "Production",
];

const STATUSES = ["open", "assigned", "in_progress", "escalated", "resolved", "closed"] as const;
type Status = (typeof STATUSES)[number];

type Incident = {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  priority: string;
  status: Status;
  departmentId: string | null;
  departmentName: string | null;
  reportedAt: string;
  resolvedAt: string | null;
};

const inputClass =
  "bg-[#0d1117] border-[#21262d] text-white placeholder:text-[#6e7681] focus-visible:ring-[#f97316]";

const selectClass =
  "rounded-md border border-[#21262d] bg-[#0d1117] text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#f97316]";

const priorityStyles: Record<string, string> = {
  low: "bg-[#21262d] text-[#8b949e]",
  medium: "bg-[#f97316]/15 text-[#fb923c]",
  high: "bg-red-500/15 text-red-400",
  urgent: "bg-red-500/25 text-red-300",
};

interface CrmIncidentsProps {
  eventId: string;
}

export default function CrmIncidents({ eventId }: CrmIncidentsProps) {
  const { toast } = useToast();
  const { departments, loading: deptLoading, apiUrl, tokenName } = useEventDepartments({ eventId });

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem(tokenName);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/incidents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load incidents");
      }
      setIncidents(data.data?.incidents || []);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load incidents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiUrl, eventId, tokenName, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (inc: Incident, status: Status) => {
    try {
      setUpdatingId(inc.id);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(
        `${apiUrl}/api/organizer/events/${eventId}/incidents/${inc.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update incident");
      }
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update incident",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
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
    <div className="max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Incidents</h1>
          <p className="text-sm text-[#8b949e] mt-1">
            Report issues, assign, escalate and track to resolution.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowReport(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#f97316] hover:bg-[#ea580c] px-4 py-2.5 text-sm font-semibold text-black transition-colors shrink-0"
        >
          <AlertTriangle className="h-4 w-4" />
          Report an issue
        </button>
      </div>

      <div className="space-y-3">
        {incidents.length === 0 ? (
          <p className="text-sm text-[#8b949e]">No incidents reported.</p>
        ) : (
          incidents.map((inc) => (
            <div
              key={inc.id}
              className="rounded-xl border border-[#21262d] bg-[#131820] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{inc.title}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${
                        priorityStyles[inc.priority] || priorityStyles.medium
                      }`}
                    >
                      {inc.priority}
                    </span>
                    {inc.category && (
                      <span className="rounded-full bg-[#21262d] px-2.5 py-0.5 text-xs text-[#c9d1d9]">
                        {inc.category}
                      </span>
                    )}
                    {inc.departmentName && (
                      <span className="rounded-full bg-[#21262d] px-2.5 py-0.5 text-xs text-[#c9d1d9]">
                        {inc.departmentName}
                      </span>
                    )}
                  </div>
                  {inc.description && (
                    <p className="mt-1 text-sm text-[#8b949e]">{inc.description}</p>
                  )}
                  <div className="mt-2 text-xs text-[#8b949e]">
                    Reported {new Date(inc.reportedAt).toLocaleString()}
                    {inc.location ? ` · ${inc.location}` : ""}
                    {inc.resolvedAt
                      ? ` · resolved ${new Date(inc.resolvedAt).toLocaleString()}`
                      : ""}
                  </div>
                </div>
                <select
                  value={inc.status}
                  onChange={(e) => setStatus(inc, e.target.value as Status)}
                  disabled={updatingId === inc.id}
                  className={`${selectClass} text-xs shrink-0 disabled:opacity-50`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {showReport && (
        <ReportIncidentDialog
          eventId={eventId}
          departments={departments}
          apiUrl={apiUrl}
          tokenName={tokenName}
          onClose={() => setShowReport(false)}
          onCreated={() => {
            setShowReport(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

export function ReportIncidentDialog({
  eventId,
  departments,
  apiUrl,
  tokenName,
  onClose,
  onCreated,
  memberMode = false,
}: {
  eventId: string;
  departments: { id: string; name: string }[];
  apiUrl: string;
  tokenName: string;
  onClose: () => void;
  onCreated: () => void;
  memberMode?: boolean;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState(INCIDENT_CATEGORIES[0]);
  const [priority, setPriority] = useState("medium");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem(tokenName);
      const endpoint = memberMode
        ? `${apiUrl}/api/event-team/events/${eventId}/incidents`
        : `${apiUrl}/api/organizer/events/${eventId}/incidents`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          category,
          priority,
          departmentId: department || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to report incident");
      }

      toast({ title: "Incident reported", description: title.trim() });
      onCreated();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to report incident",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto space-y-3 rounded-t-xl sm:rounded-xl border border-[#21262d] bg-[#131820] p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <h2 className="text-lg font-semibold text-white">Report an issue</h2>

        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className={`${inputClass} h-10 text-sm`}
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened?"
          rows={3}
          className={`${inputClass} text-sm resize-none`}
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (e.g. Gate 2)"
            className={`${inputClass} h-10 text-sm`}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectClass}
          >
            {INCIDENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={selectClass}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={selectClass}
          >
            <option value="">No department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full sm:w-auto rounded-md border border-[#21262d] px-3 py-2 text-sm text-[#8b949e] hover:bg-[#1e2433] hover:text-white transition-colors touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-md bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 px-4 py-2 text-sm font-semibold text-black transition-colors touch-manipulation"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Report
          </button>
        </div>
      </form>
    </div>
  );
}
