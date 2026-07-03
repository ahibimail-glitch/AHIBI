"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Layers,
  ClipboardList,
  ListChecks,
  AlertTriangle,
  Folder,
  Calendar,
  MapPin,
  Ticket,
  IndianRupee,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { useCrm } from "@/app/organizer/components/crm/CrmContext";
import CrmMetricCard from "@/app/organizer/components/crm/CrmMetricCard";

interface OverviewStats {
  teamMembers: number;
  pendingInvites: number;
  departments: number;
  checklistItems: number;
  checklistCompleted: number;
  tasksOpen: number;
  tasksCompleted: number;
  tasksOverdue: number;
  incidentsOpen: number;
  incidentsResolved: number;
  files: number;
  discordLinks: number;
  uniqueAttendees: number;
  ticketsSold: number;
  totalRevenue: number;
}

function formatEventDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLocation(location?: { address?: string; city?: string; state?: string }) {
  if (!location) return "—";
  const parts = [location.address, location.city, location.state].filter(Boolean);
  return parts.join(", ") || "—";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatStatus(status?: string) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function CrmOverviewPage() {
  const { eventId, event } = useCrm();
  const basePath = `/organizer/dashboard/crm/${eventId}`;

  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("organizer_token");
      if (!token) {
        setLoadingStats(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      try {
        setLoadingStats(true);
        const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/crm-overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to load overview");
        }
        setStats(data.data?.stats || null);
      } catch (err) {
        console.error("Failed to load CRM overview:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    void load();
  }, [eventId]);

  const cards = [
    { label: "Team Members", value: stats?.teamMembers ?? 0, icon: Users, to: "team" },
    { label: "Departments", value: stats?.departments ?? 0, icon: Layers, to: "departments" },
    { label: "Tasks Open", value: stats?.tasksOpen ?? 0, icon: ClipboardList, to: "tasks" },
    {
      label: "Tasks Completed",
      value: stats?.tasksCompleted ?? 0,
      icon: ClipboardList,
      to: "tasks",
      tone: "success" as const,
    },
    {
      label: "Tasks Overdue",
      value: stats?.tasksOverdue ?? 0,
      icon: ClipboardList,
      to: "tasks",
      tone: "warning" as const,
    },
    {
      label: "Checklist Items",
      value: stats?.checklistItems ?? 0,
      icon: ListChecks,
      to: "checklists",
    },
    {
      label: "Incidents Open",
      value: stats?.incidentsOpen ?? 0,
      icon: AlertTriangle,
      to: "incidents",
      tone: "warning" as const,
    },
    {
      label: "Incidents Resolved",
      value: stats?.incidentsResolved ?? 0,
      icon: AlertTriangle,
      to: "incidents",
      tone: "success" as const,
    },
    { label: "Files", value: stats?.files ?? 0, icon: Folder, to: "files" },
    {
      label: "Discord Channels",
      value: stats?.discordLinks ?? 0,
      icon: MessageCircle,
      to: "communication",
    },
  ];

  const ticketsSold = stats?.ticketsSold ?? event?.ticketsSold ?? 0;
  const totalTickets = event?.totalTickets ?? 0;
  const totalRevenue = stats?.totalRevenue ?? event?.totalRevenue ?? 0;
  const uniqueAttendees = stats?.uniqueAttendees ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Event Overview</h1>
      <p className="text-sm text-[#8b949e] mt-1">Live operations snapshot.</p>

      {event && (
        <div className="mt-6 rounded-xl border border-[#21262d] bg-[#131820] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white truncate">{event.title}</h2>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#8b949e]">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0 text-[#6e7681]" />
                  {formatEventDate(event.startDate)}
                  {event.endDate ? ` – ${formatEventDate(event.endDate)}` : ""}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0 text-[#6e7681]" />
                  {formatLocation(event.location)}
                </span>
              </div>
            </div>
            <span className="inline-flex shrink-0 self-start rounded-full border border-[#30363d] bg-[#0d1117] px-3 py-1 text-xs font-medium text-[#c9d1d9] capitalize">
              {formatStatus(event.status)}
            </span>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[#21262d] bg-[#0d1117] p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681] flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5" />
                Tickets sold
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-white">
                {ticketsSold}
                {totalTickets > 0 ? (
                  <span className="text-sm font-normal text-[#8b949e]"> / {totalTickets}</span>
                ) : null}
              </dd>
            </div>
            <div className="rounded-lg border border-[#21262d] bg-[#0d1117] p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681] flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5" />
                Revenue
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-white">
                {formatCurrency(totalRevenue)}
              </dd>
            </div>
            <div className="rounded-lg border border-[#21262d] bg-[#0d1117] p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681] flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Attendees
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-white">{uniqueAttendees}</dd>
            </div>
            <div className="rounded-lg border border-[#21262d] bg-[#0d1117] p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681] flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Pending invites
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-white">
                {stats?.pendingInvites ?? 0}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {loadingStats ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#f97316]" />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <CrmMetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              href={`${basePath}/${card.to}`}
              tone={card.tone}
            />
          ))}
        </div>
      )}
    </div>
  );
}
