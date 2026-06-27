"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  ChevronLeft,
  ClipboardList,
  ListChecks,
  Loader2,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createAuthRedirectUrl } from "@/utils/redirectUtils";

interface EventLocation {
  address?: string;
  city?: string;
  state?: string;
}

interface EventDetails {
  _id: string;
  title: string;
  startDate: string;
  endDate?: string;
  location?: EventLocation;
  status: string;
}

interface Membership {
  role: string;
  department: string;
  isOwner?: boolean;
}

const DEPARTMENTS: Record<string, string> = {
  none: "No department assigned",
  "artist-management": "Artist Management",
  "event-management": "Event Management",
  hospitality: "Hospitality",
  "media-content": "Media and Content",
  medical: "Medical",
  security: "Security",
  "sound-lighting": "Sound and Lighting",
  "stage-production": "Stage and Production",
  "ticketing-entry": "Ticketing and Entry",
};

type TabId = "tasks" | "checklist" | "incident" | "department";

const TABS: { id: TabId; label: string; icon: typeof ClipboardList; count?: number }[] = [
  { id: "tasks", label: "My Tasks", icon: ClipboardList, count: 0 },
  { id: "checklist", label: "Checklist", icon: ListChecks, count: 0 },
  { id: "incident", label: "Report Incident", icon: AlertTriangle },
  { id: "department", label: "Department Info", icon: Briefcase },
];

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatLocation(location?: EventLocation) {
  if (!location) return "—";
  const parts = [location.address, location.city, location.state].filter(Boolean);
  return parts[0] || parts.join(", ") || "—";
}

function formatRole(role: string, isOwner?: boolean) {
  if (isOwner) return "Event Admin";
  if (role === "Admin") return "Event Admin";
  return role;
}

export default function ManageEventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [activeTab, setActiveTab] = useState<TabId>("tasks");
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, loading: authLoading } = useAuth({
    redirectPath: createAuthRedirectUrl(`/manageEvent/${eventId}`),
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchEvent = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${apiUrl}/api/event-team/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "You do not have access to this event");
      }

      setEvent(data.data?.event || null);
      setMembership(data.data?.membership || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, eventId]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchEvent();
    }
  }, [isAuthenticated, authLoading, fetchEvent]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#f97316]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-4">
        <div className="rounded-xl border border-[#21262d] bg-[#131820] p-6 max-w-md w-full text-center">
          <h2 className="text-lg font-semibold text-white mb-2">Unable to open event</h2>
          <p className="text-sm text-red-400 mb-6">{error || "Event not found"}</p>
          <Link
            href="/manageEvent"
            className="inline-flex items-center gap-2 text-sm text-[#8b949e] hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            All my events
          </Link>
        </div>
      </div>
    );
  }

  const roleLabel = formatRole(membership?.role || "Team Member", membership?.isOwner);
  const departmentLabel = DEPARTMENTS[membership?.department || "none"] || membership?.department || "—";

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/manageEvent"
          className="inline-flex items-center gap-1 text-sm text-[#8b949e] hover:text-white transition-colors mb-8"
        >
          <ChevronLeft className="h-4 w-4" />
          All my events
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#8b949e]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              {formatLocation(event.location)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0" />
              {formatEventDate(event.startDate)}
            </span>
            <span className="inline-flex items-center rounded-full border border-[#30363d] bg-[#161b22] px-3 py-1 text-xs font-medium text-[#c9d1d9]">
              {roleLabel}
            </span>
          </div>
        </header>

        <nav className="border-b border-[#21262d] mb-8">
          <div className="flex gap-6 sm:gap-8 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const label =
                tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 pb-3 text-sm whitespace-nowrap transition-colors shrink-0 ${
                    isActive ? "text-white" : "text-[#8b949e] hover:text-[#c9d1d9]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f97316] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <section>
          {activeTab === "tasks" && (
            <p className="text-sm text-[#8b949e]">No tasks assigned to you yet.</p>
          )}

          {activeTab === "checklist" && (
            <p className="text-sm text-[#8b949e]">No checklist items yet.</p>
          )}

          {activeTab === "incident" && (
            <div className="rounded-xl border border-[#21262d] bg-[#131820] p-6 max-w-lg">
              <h2 className="text-base font-semibold text-white mb-2">Report an incident</h2>
              <p className="text-sm text-[#8b949e] mb-4">
                Incident reporting will be available here soon.
              </p>
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#21262d] text-[#6e7681] text-sm font-medium cursor-not-allowed"
              >
                <AlertTriangle className="h-4 w-4" />
                Submit report
              </button>
            </div>
          )}

          {activeTab === "department" && (
            <div className="rounded-xl border border-[#21262d] bg-[#131820] p-6 max-w-lg">
              <h2 className="text-base font-semibold text-white mb-1">Your department</h2>
              <p className="text-sm text-[#8b949e] mb-4">{departmentLabel}</p>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[#6e7681] text-xs uppercase tracking-wider mb-0.5">Role</dt>
                  <dd className="text-[#c9d1d9]">{roleLabel}</dd>
                </div>
                <div>
                  <dt className="text-[#6e7681] text-xs uppercase tracking-wider mb-0.5">Event</dt>
                  <dd className="text-[#c9d1d9]">{event.title}</dd>
                </div>
              </dl>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
