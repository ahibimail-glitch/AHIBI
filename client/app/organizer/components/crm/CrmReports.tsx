"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileBarChart,
  Layers,
  ListChecks,
  Loader2,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type EventRow = {
  id: string;
  name: string;
  venue: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  description: string;
};

type Dept = { id: string; name: string; color: string | null };
type Member = {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
};
type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  completedAt: string | null;
  createdAt: string;
  departmentId: string | null;
  departmentName: string | null;
  assigneeId: string | null;
};
type ClItem = {
  id: string;
  status: string;
  departmentId: string | null;
  departmentName: string | null;
};
type Incident = {
  id: string;
  title: string;
  status: string;
  priority: string;
  location: string;
  reportedAt: string;
  resolvedAt: string | null;
  departmentId: string | null;
  departmentName: string | null;
};

interface CrmReportsProps {
  eventId: string;
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-[#21262d] px-2 py-0.5 text-[10px] font-medium capitalize text-[#c9d1d9]">
      {children}
    </span>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneCls =
    tone === "success"
      ? "text-[#22c55e]"
      : tone === "warning"
        ? "text-[#f97316]"
        : "text-[#f97316]";

  return (
    <div className="rounded-xl border border-[#21262d] bg-[#131820] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681]">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[#8b949e]">{sub}</div>}
    </div>
  );
}

export default function CrmReports({ eventId }: CrmReportsProps) {
  const { toast } = useToast();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [items, setItems] = useState<ClItem[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = localStorage.getItem("organizer_token");
    if (!token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/crm-report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load report");
      }

      setEvent(data.data?.event || null);
      setDepts(data.data?.departments || []);
      setMembers(data.data?.members || []);
      setTasks(data.data?.tasks || []);
      setItems(data.data?.checklistItems || []);
      setIncidents(data.data?.incidents || []);
      setGeneratedAt(data.data?.generatedAt || new Date().toISOString());
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const tDone = tasks.filter((t) => t.status === "completed").length;
    const tOver = tasks.filter(
      (t) => t.status !== "completed" && t.deadline && new Date(t.deadline) < new Date()
    ).length;
    const iResolved = incidents.filter((i) => i.status === "resolved" || i.status === "closed");
    const iOpen = incidents.filter((i) => !["resolved", "closed"].includes(i.status)).length;
    const avgResolveMin =
      iResolved.length === 0
        ? 0
        : iResolved.reduce((sum, i) => {
            if (!i.resolvedAt) return sum;
            return (
              sum +
              (new Date(i.resolvedAt).getTime() - new Date(i.reportedAt).getTime()) / 60000
            );
          }, 0) / iResolved.length;
    const clDone = items.filter((i) => i.status === "completed").length;

    return {
      taskCompletion: tasks.length ? Math.round((tDone / tasks.length) * 100) : 0,
      checklistCompletion: items.length ? Math.round((clDone / items.length) * 100) : 0,
      tDone,
      tOver,
      iOpen,
      iResolved: iResolved.length,
      avgResolveMin: Math.round(avgResolveMin),
    };
  }, [tasks, items, incidents]);

  const perDept = useMemo(() => {
    return depts.map((d) => {
      const dTasks = tasks.filter((t) => String(t.departmentId) === String(d.id));
      const dDone = dTasks.filter((t) => t.status === "completed").length;
      const dItems = items.filter((i) => String(i.departmentId) === String(d.id));
      const dItemsDone = dItems.filter((i) => i.status === "completed").length;
      const dInc = incidents.filter((i) => String(i.departmentId) === String(d.id));
      const dMembers = members.filter((m) => String(m.departmentId) === String(d.id)).length;

      return {
        ...d,
        members: dMembers,
        tasks: dTasks.length,
        tasksDone: dDone,
        taskPct: dTasks.length ? Math.round((dDone / dTasks.length) * 100) : 0,
        items: dItems.length,
        itemsDone: dItemsDone,
        itemPct: dItems.length ? Math.round((dItemsDone / dItems.length) * 100) : 0,
        incidents: dInc.length,
        incidentsOpen: dInc.filter((i) => !["resolved", "closed"].includes(i.status)).length,
      };
    });
  }, [depts, tasks, items, incidents, members]);

  const pendingFollowups = useMemo(
    () => [
      ...tasks
        .filter((t) => t.status !== "completed" && t.status !== "cancelled")
        .map((t) => ({
          kind: "Task" as const,
          id: t.id,
          title: t.title,
          priority: t.priority,
          status: t.status,
          deadline: t.deadline,
          department: t.departmentName || "—",
        })),
      ...incidents
        .filter((i) => !["resolved", "closed"].includes(i.status))
        .map((i) => ({
          kind: "Incident" as const,
          id: i.id,
          title: i.title,
          priority: i.priority,
          status: i.status,
          deadline: null as string | null,
          department: i.departmentName || "—",
        })),
    ],
    [tasks, incidents]
  );

  function exportCSV() {
    const rows = [
      ["Section", "Name", "Status", "Priority", "Department", "Deadline/Resolved", "Notes"],
      ...tasks.map((t) => [
        "Task",
        t.title,
        t.status,
        t.priority,
        t.departmentName || "",
        t.completedAt || t.deadline || "",
        "",
      ]),
      ...incidents.map((i) => [
        "Incident",
        i.title,
        i.status,
        i.priority,
        i.departmentName || "",
        i.resolvedAt || "",
        i.location || "",
      ]),
    ];

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event?.name ?? "event"}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="print:text-black">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white inline-flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-[#f97316]" />
            Event Report
          </h1>
          <p className="text-sm text-[#8b949e] mt-1">Post-event operations snapshot.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="rounded-md border border-[#21262d] bg-[#131820] px-3 py-2 text-sm text-[#c9d1d9] hover:bg-[#161b26] hover:text-white transition-colors"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 rounded-md bg-[#f97316] hover:bg-[#ea580c] px-3 py-2 text-sm font-semibold text-black transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-[#21262d] bg-[#131820] p-6 print:border-gray-300 print:bg-white">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681]">
          Event
        </div>
        <h2 className="mt-1 text-xl font-semibold text-white print:text-black">{event?.name}</h2>
        <div className="mt-2 grid gap-3 text-sm text-[#8b949e] sm:grid-cols-3 print:text-gray-600">
          {event?.venue && (
            <div>
              <span className="text-[#c9d1d9] print:text-black">Venue:</span> {event.venue}
            </div>
          )}
          {event?.startsAt && (
            <div>
              <span className="text-[#c9d1d9] print:text-black">Start:</span>{" "}
              {new Date(event.startsAt).toLocaleString()}
            </div>
          )}
          {event?.endsAt && (
            <div>
              <span className="text-[#c9d1d9] print:text-black">End:</span>{" "}
              {new Date(event.endsAt).toLocaleString()}
            </div>
          )}
          <div>
            <span className="text-[#c9d1d9] print:text-black">Status:</span>{" "}
            <span className="capitalize">{event?.status}</span>
          </div>
        </div>
        {event?.description && (
          <p className="mt-3 text-sm text-[#8b949e] print:text-gray-600">{event.description}</p>
        )}
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label="Team members" value={members.length} />
        <Kpi icon={Layers} label="Departments" value={depts.length} />
        <Kpi
          icon={CheckCircle2}
          label="Task completion"
          value={`${summary.taskCompletion}%`}
          tone="success"
          sub={`${summary.tDone}/${tasks.length} done`}
        />
        <Kpi
          icon={ListChecks}
          label="Checklist completion"
          value={`${summary.checklistCompletion}%`}
          tone="success"
          sub={`${items.length} items`}
        />
        <Kpi
          icon={ClipboardList}
          label="Tasks overdue"
          value={summary.tOver}
          tone={summary.tOver ? "warning" : "default"}
        />
        <Kpi
          icon={AlertTriangle}
          label="Incidents resolved"
          value={summary.iResolved}
          tone="success"
          sub={`${incidents.length} total`}
        />
        <Kpi
          icon={AlertTriangle}
          label="Incidents open"
          value={summary.iOpen}
          tone={summary.iOpen ? "warning" : "default"}
        />
        <Kpi
          icon={Clock}
          label="Avg response time"
          value={summary.avgResolveMin ? `${summary.avgResolveMin} min` : "—"}
        />
      </section>

      <section className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] inline-flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" />
          Department performance
        </h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[#21262d] bg-[#131820] print:border-gray-300 print:bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-[#21262d] text-[10px] font-semibold uppercase tracking-widest text-[#6e7681] print:border-gray-300">
              <tr>
                <th className="px-3 py-2 text-left">Department</th>
                <th className="px-3 py-2 text-right">Members</th>
                <th className="px-3 py-2 text-right">Tasks</th>
                <th className="px-3 py-2 text-right">Task %</th>
                <th className="px-3 py-2 text-right">Checklist</th>
                <th className="px-3 py-2 text-right">Checklist %</th>
                <th className="px-3 py-2 text-right">Incidents</th>
                <th className="px-3 py-2 text-right">Open</th>
              </tr>
            </thead>
            <tbody className="text-[#c9d1d9] print:text-black">
              {perDept.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-[#8b949e]">
                    No departments.
                  </td>
                </tr>
              )}
              {perDept.map((d) => (
                <tr key={d.id} className="border-t border-[#21262d] print:border-gray-200">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: d.color ?? "#f97316" }}
                      />
                      {d.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{d.members}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {d.tasksDone}/{d.tasks}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{d.taskPct}%</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {d.itemsDone}/{d.items}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{d.itemPct}%</td>
                  <td className="px-3 py-2 text-right font-mono">{d.incidents}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${d.incidentsOpen ? "text-[#f97316]" : ""}`}
                  >
                    {d.incidentsOpen}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] inline-flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          Incident log
        </h3>
        {incidents.length === 0 ? (
          <p className="mt-2 text-sm text-[#8b949e]">No incidents recorded.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-[#21262d] bg-[#131820] print:border-gray-300 print:bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-[#21262d] text-[10px] font-semibold uppercase tracking-widest text-[#6e7681] print:border-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Department</th>
                  <th className="px-3 py-2 text-left">Priority</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Reported</th>
                  <th className="px-3 py-2 text-left">Response</th>
                </tr>
              </thead>
              <tbody className="text-[#c9d1d9] print:text-black">
                {incidents.map((i) => {
                  const mins = i.resolvedAt
                    ? Math.round(
                        (new Date(i.resolvedAt).getTime() - new Date(i.reportedAt).getTime()) /
                          60000
                      )
                    : null;
                  return (
                    <tr key={i.id} className="border-t border-[#21262d] print:border-gray-200">
                      <td className="px-3 py-2">
                        {i.title}
                        {i.location ? (
                          <span className="text-[#8b949e]"> · {i.location}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{i.departmentName || "—"}</td>
                      <td className="px-3 py-2">
                        <StatusPill>{i.priority}</StatusPill>
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill>{i.status.replace(/_/g, " ")}</StatusPill>
                      </td>
                      <td className="px-3 py-2 text-[#8b949e]">
                        {new Date(i.reportedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-mono">{mins !== null ? `${mins} min` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e]">
          Pending follow-ups
        </h3>
        {pendingFollowups.length === 0 ? (
          <p className="mt-2 text-sm text-[#8b949e]">Nothing outstanding.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pendingFollowups.map((p) => (
              <li
                key={`${p.kind}-${p.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#21262d] bg-[#131820] p-3 text-sm print:border-gray-300 print:bg-white"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill>{p.kind}</StatusPill>
                  <span className="font-medium text-white print:text-black">{p.title}</span>
                  <span className="text-[#8b949e]">· {p.department}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#8b949e]">
                  <StatusPill>{p.priority}</StatusPill>
                  <StatusPill>{p.status.replace(/_/g, " ")}</StatusPill>
                  {p.deadline && <span>Due {new Date(p.deadline).toLocaleDateString()}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-center text-xs text-[#6e7681] print:text-gray-500">
        Generated {generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString()}{" "}
        · AHIBI Event Command CRM
      </p>
    </div>
  );
}
