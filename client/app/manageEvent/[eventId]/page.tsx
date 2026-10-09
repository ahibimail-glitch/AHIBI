"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Check,
  ChevronLeft,
  ClipboardList,
  Download,
  ExternalLink,
  Folder,
  ListChecks,
  Loader2,
  MapPin,
  MessageCircle,
  Pin,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createAuthRedirectUrl } from "@/utils/redirectUtils";
import { ReportIncidentDialog } from "@/app/organizer/components/crm/CrmIncidents";

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
  department: string;
  departmentName?: string;
  isOwner?: boolean;
}

interface Responsibility {
  id: string;
  title: string;
  description: string;
  departmentId: string | null;
  departmentName: string | null;
  priority: string;
  expectedOutcome: string;
}

type ChecklistPhase = "pre_event" | "event_day" | "post_event";

interface ChecklistItem {
  id: string;
  checklistId: string;
  title: string;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  deadline: string | null;
  position: number;
}

interface Checklist {
  id: string;
  name: string;
  phase: ChecklistPhase;
  departmentId: string | null;
  departmentName: string | null;
  items: ChecklistItem[];
}

const PHASE_LABELS: Record<ChecklistPhase, string> = {
  pre_event: "Pre-event",
  event_day: "Event day",
  post_event: "Post-event",
};

type TabId = "tasks" | "checklist" | "incident" | "communication" | "department";

const TABS: {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof ClipboardList;
}[] = [
  { id: "tasks", label: "My Tasks", shortLabel: "Tasks", icon: ClipboardList },
  { id: "checklist", label: "Checklist", shortLabel: "Lists", icon: ListChecks },
  { id: "incident", label: "Report Incident", shortLabel: "Incidents", icon: AlertTriangle },
  { id: "communication", label: "Communication", shortLabel: "Comms", icon: MessageCircle },
  { id: "department", label: "Department Info", shortLabel: "Info", icon: Briefcase },
];

const priorityStyles: Record<string, string> = {
  low: "bg-[#21262d] text-[#8b949e]",
  medium: "bg-[#f97316]/15 text-[#fb923c]",
  high: "bg-red-500/15 text-red-400",
  urgent: "bg-red-500/25 text-red-300",
};

const incidentPriorityStyles = priorityStyles;

const TASK_STATUSES = ["not_started", "in_progress", "waiting", "completed", "cancelled"] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: string;
  departmentId: string | null;
  departmentName: string | null;
  deadline: string | null;
  completionComment: string;
}

type IncidentStatus = "open" | "assigned" | "in_progress" | "escalated" | "resolved" | "closed";

interface Incident {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  priority: string;
  status: IncidentStatus;
  departmentId: string | null;
  departmentName: string | null;
  reportedAt: string;
  resolvedAt: string | null;
}

interface EventDepartmentOption {
  id: string;
  name: string;
}

interface EventFileItem {
  id: string;
  name: string;
  storageUrl: string;
  storagePath: string;
  sizeBytes: number | null;
  mimeType: string;
  pinned: boolean;
  departmentId: string | null;
  departmentName: string | null;
  createdAt: string;
}

interface DiscordLink {
  id: string;
  serverName: string;
  channelName: string;
  inviteUrl: string;
  departmentId: string | null;
  departmentName: string | null;
  notes: string;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: EventFileItem) {
  if (file.mimeType?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i.test(file.name);
}

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

function formatBadgeLabel(membership: Membership | null) {
  if (membership?.isOwner) return "Event Admin";
  return membership?.departmentName || "Team Member";
}

export default function ManageEventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [activeTab, setActiveTab] = useState<TabId>("tasks");
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<EventFileItem[]>([]);
  const [discordLinks, setDiscordLinks] = useState<DiscordLink[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [departments, setDepartments] = useState<EventDepartmentOption[]>([]);
  const [showIncidentReport, setShowIncidentReport] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
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
      setResponsibilities(data.data?.responsibilities || []);
      setChecklists(data.data?.checklists || []);
      setTasks(data.data?.tasks || []);
      setFiles(data.data?.files || []);
      setDiscordLinks(data.data?.discordLinks || []);
      setIncidents(data.data?.incidents || []);
      setDepartments(data.data?.departments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, eventId]);

  const handleToggleItem = async (listId: string, item: ChecklistItem) => {
    const next = item.status === "completed" ? "not_started" : "completed";

    try {
      setTogglingItemId(item.id);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${apiUrl}/api/event-team/events/${eventId}/checklists/${listId}/items/${item.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: next }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update item");
      }

      setChecklists((prev) =>
        prev.map((list) =>
          list.id !== listId
            ? list
            : {
                ...list,
                items: list.items.map((i) =>
                  i.id === item.id ? { ...i, status: next } : i
                ),
              }
        )
      );
    } catch (err) {
      console.error("Failed to update checklist item:", err);
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      setUpdatingTaskId(taskId);
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/event-team/events/${eventId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update task");
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status, ...(data.data?.task || {}) } : t))
      );
    } catch (err) {
      console.error("Failed to update task:", err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleTaskCompletionNote = async (taskId: string, completionComment: string) => {
    try {
      setUpdatingTaskId(taskId);
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/event-team/events/${eventId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completionComment }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save note");
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completionComment: data.data?.task?.completionComment || completionComment } : t
        )
      );
    } catch (err) {
      console.error("Failed to save completion note:", err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

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

  const badgeLabel = formatBadgeLabel(membership);
  const departmentLabel = membership?.departmentName || "No department assigned";
  const checklistItemCount = checklists.reduce((sum, list) => sum + list.items.length, 0);
  const openTaskCount = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length;
  const imageFiles = files.filter(isImageFile);
  const documentFiles = files.filter((f) => !isImageFile(f));

  const tabsWithCounts = TABS.map((tab) => {
    if (tab.id === "checklist" && checklistItemCount > 0) {
      return { ...tab, count: checklistItemCount };
    }
    if (tab.id === "tasks" && openTaskCount > 0) {
      return { ...tab, count: openTaskCount };
    }
    return tab;
  });

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Link
          href="/manageEvent"
          className="inline-flex items-center gap-1 text-sm text-[#8b949e] hover:text-white transition-colors mb-5 sm:mb-8 min-h-[44px]"
        >
          <ChevronLeft className="h-4 w-4" />
          All my events
        </Link>

        <header className="mb-5 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-3 sm:mb-4 break-words">
            {event.title}
          </h1>

          <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2 text-sm text-[#8b949e]">
            <span className="inline-flex items-start sm:items-center gap-1.5 max-w-full">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0" />
              <span className="break-words">{formatLocation(event.location)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="break-words">{formatEventDate(event.startDate)}</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-[#30363d] bg-[#161b22] px-3 py-1 text-xs font-medium text-[#c9d1d9]">
              {badgeLabel}
            </span>
          </div>
        </header>

        <nav className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 bg-[#0b0e14]/95 backdrop-blur-sm border-b border-[#21262d] mb-5 sm:mb-8">
          <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-px scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabsWithCounts.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count =
                "count" in tab && tab.count !== undefined ? tab.count : undefined;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex min-h-[44px] min-w-[4.5rem] flex-col items-center justify-center gap-0.5 px-3 py-2.5 text-xs sm:flex-row sm:gap-2 sm:px-4 sm:text-sm whitespace-nowrap transition-colors shrink-0 touch-manipulation ${
                    isActive ? "text-white" : "text-[#8b949e] hover:text-[#c9d1d9]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">
                    {tab.label}
                    {count !== undefined ? ` (${count})` : ""}
                  </span>
                  {count !== undefined && (
                    <span className="absolute top-1 right-1 sm:hidden flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f97316] px-1 text-[10px] font-bold text-black">
                      {count}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 sm:left-0 sm:right-0 h-0.5 bg-[#f97316] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <section className="w-full min-w-0">
          {activeTab === "tasks" && (
            <div className="space-y-3 w-full sm:max-w-2xl">
              {tasks.length === 0 ? (
                <p className="text-sm text-[#8b949e]">No tasks assigned to you yet.</p>
              ) : (
                tasks.map((task) => {
                  const isOverdue =
                    task.deadline &&
                    new Date(task.deadline) < new Date() &&
                    task.status !== "completed" &&
                    task.status !== "cancelled";

                  return (
                    <div
                      key={task.id}
                      className="rounded-xl border border-[#21262d] bg-[#131820] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-white">{task.title}</span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${
                                priorityStyles[task.priority] || priorityStyles.medium
                              }`}
                            >
                              {task.priority}
                            </span>
                            {isOverdue && (
                              <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs text-red-400">
                                overdue
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="mt-1 text-sm text-[#8b949e]">{task.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#8b949e]">
                            {task.departmentName && (
                              <span className="rounded-full bg-[#21262d] px-2.5 py-0.5 text-[#c9d1d9]">
                                {task.departmentName}
                              </span>
                            )}
                            {task.deadline && (
                              <span>Due {new Date(task.deadline).toLocaleString()}</span>
                            )}
                          </div>
                          {task.completionComment && (
                            <p className="mt-2 rounded-md border border-[#21262d] bg-[#0d1117] px-3 py-2 text-xs text-[#c9d1d9]">
                              <Check className="mr-1 inline h-3 w-3 text-emerald-400" />
                              {task.completionComment}
                            </p>
                          )}
                        </div>
                        <select
                          value={task.status}
                          onChange={(e) =>
                            handleTaskStatusChange(task.id, e.target.value as TaskStatus)
                          }
                          disabled={updatingTaskId === task.id}
                          className="w-full sm:w-auto min-h-[44px] rounded-md border border-[#21262d] bg-[#0d1117] text-white px-3 py-2 text-sm sm:text-xs sm:px-2 sm:py-1 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-[#f97316] touch-manipulation"
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </div>

                      {task.status === "completed" && !task.completionComment && (
                        <TaskCompletionForm
                          taskId={task.id}
                          saving={updatingTaskId === task.id}
                          onSave={handleTaskCompletionNote}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "checklist" && (
            <div className="space-y-4 w-full sm:max-w-2xl">
              {checklists.length === 0 ? (
                <p className="text-sm text-[#8b949e]">No checklist items yet.</p>
              ) : (
                checklists.map((list) => {
                  const done = list.items.filter((i) => i.status === "completed").length;
                  const phaseLabel = PHASE_LABELS[list.phase] || list.phase.replace("_", " ");
                  const deptLabel = list.departmentName || "All departments";

                  return (
                    <div
                      key={list.id}
                      className="rounded-xl border border-[#21262d] bg-[#131820] overflow-hidden"
                    >
                      <div className="border-b border-[#21262d] px-4 py-3">
                        <div className="font-semibold text-white">{list.name}</div>
                        <div className="text-xs text-[#8b949e]">
                          {phaseLabel} · {deptLabel} · {done}/{list.items.length} done
                        </div>
                      </div>

                      {list.items.length > 0 ? (
                        <ul className="divide-y divide-[#21262d]">
                          {list.items.map((item) => (
                            <li key={item.id} className="flex items-start gap-3 px-4 py-3 sm:py-2.5 min-h-[44px]">
                              <button
                                type="button"
                                onClick={() => handleToggleItem(list.id, item)}
                                disabled={togglingItemId === item.id}
                                className={`grid h-6 w-6 sm:h-5 sm:w-5 shrink-0 place-items-center rounded border transition-colors disabled:opacity-50 touch-manipulation ${
                                  item.status === "completed"
                                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                                    : "border-[#30363d] hover:border-[#484f58]"
                                }`}
                                aria-label={
                                  item.status === "completed" ? "Mark incomplete" : "Mark complete"
                                }
                              >
                                {togglingItemId === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  item.status === "completed" && <Check className="h-3 w-3" />
                                )}
                              </button>
                              <span
                                className={`flex-1 text-sm ${
                                  item.status === "completed"
                                    ? "line-through text-[#6e7681]"
                                    : "text-[#c9d1d9]"
                                }`}
                              >
                                {item.title}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="px-4 py-3 text-sm text-[#8b949e]">No items in this checklist.</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "incident" && (
            <div className="space-y-4 w-full sm:max-w-2xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-white">Report an incident</h2>
                  <p className="text-sm text-[#8b949e] mt-1">
                    Log on-site issues for the event team to track and resolve.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIncidentReport(true)}
                  className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#f97316] hover:bg-[#ea580c] text-black text-sm font-semibold transition-colors shrink-0 touch-manipulation"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Report
                </button>
              </div>

              {incidents.length === 0 ? (
                <p className="text-sm text-[#8b949e]">No incidents reported yet.</p>
              ) : (
                <div className="space-y-3">
                  {incidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="rounded-xl border border-[#21262d] bg-[#131820] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{inc.title}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${
                            incidentPriorityStyles[inc.priority] || incidentPriorityStyles.medium
                          }`}
                        >
                          {inc.priority}
                        </span>
                        {inc.category && (
                          <span className="rounded-full bg-[#21262d] px-2.5 py-0.5 text-xs text-[#c9d1d9]">
                            {inc.category}
                          </span>
                        )}
                        <span className="rounded-full bg-[#21262d] px-2.5 py-0.5 text-xs text-[#c9d1d9] capitalize">
                          {inc.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      {inc.description && (
                        <p className="mt-1 text-sm text-[#8b949e]">{inc.description}</p>
                      )}
                      <div className="mt-2 text-xs text-[#8b949e]">
                        Reported {new Date(inc.reportedAt).toLocaleString()}
                        {inc.location ? ` · ${inc.location}` : ""}
                        {inc.departmentName ? ` · ${inc.departmentName}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showIncidentReport && (
                <ReportIncidentDialog
                  eventId={eventId}
                  departments={departments}
                  apiUrl={apiUrl}
                  tokenName="token"
                  memberMode
                  onClose={() => setShowIncidentReport(false)}
                  onCreated={() => {
                    setShowIncidentReport(false);
                    void fetchEvent();
                  }}
                />
              )}
            </div>
          )}

          {activeTab === "communication" && (
            <div className="space-y-4 w-full sm:max-w-2xl">
              <div className="rounded-xl border border-[#21262d] bg-[#131820] p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-[#f97316]/15 text-[#f97316]">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">Team communication</h2>
                    <p className="text-sm text-[#8b949e] mt-0.5">
                      Open your event Discord channels below.
                    </p>
                  </div>
                </div>
              </div>

              {discordLinks.length === 0 ? (
                <p className="text-sm text-[#8b949e]">No channels connected yet.</p>
              ) : (
                <div className="space-y-2">
                  {discordLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#21262d] bg-[#131820] p-4"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-white">
                          {link.channelName || link.serverName || "Discord channel"}
                        </div>
                        <div className="text-xs text-[#8b949e] mt-0.5">
                          {link.serverName && link.channelName
                            ? `${link.serverName} · ${link.channelName}`
                            : link.serverName || link.channelName || link.inviteUrl}
                          {link.departmentName ? ` · ${link.departmentName}` : " · All teams"}
                        </div>
                      </div>
                      <a
                        href={link.inviteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-1 rounded-md bg-[#f97316] hover:bg-[#ea580c] px-3 py-2.5 text-xs font-semibold text-black transition-colors shrink-0 touch-manipulation"
                      >
                        <span className="sm:hidden">Open channel</span>
                        <span className="hidden sm:inline">Open Team Communication</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "department" && (
            <div className="space-y-6 w-full sm:max-w-2xl">
              <div className="rounded-xl border border-[#21262d] bg-[#131820] p-4 sm:p-6">
                <h2 className="text-base font-semibold text-white mb-1">Your department</h2>
                <p className="text-sm text-[#8b949e] mb-4">{departmentLabel}</p>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-[#6e7681] text-xs uppercase tracking-wider mb-0.5">Event</dt>
                    <dd className="text-[#c9d1d9]">{event.title}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] mb-3">
                  Responsibilities
                </h2>
                {responsibilities.length === 0 ? (
                  <p className="text-sm text-[#8b949e]">
                    No responsibilities assigned{membership?.departmentName ? ` for ${membership.departmentName}` : ""} yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {responsibilities.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-[#21262d] bg-[#131820] p-4"
                      >
                        <div className="font-medium text-white">{r.title}</div>
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
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] mb-3 inline-flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5" />
                  Files
                </h2>
                {files.length === 0 ? (
                  <p className="text-sm text-[#8b949e]">No files shared yet.</p>
                ) : (
                  <div className="space-y-4">
                    {imageFiles.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {imageFiles.map((file) => (
                          <div
                            key={file.id}
                            className="relative overflow-hidden rounded-xl border border-[#21262d] bg-[#131820]"
                          >
                            <button
                              type="button"
                              onClick={() => window.open(file.storageUrl, "_blank", "noopener,noreferrer")}
                              className="block w-full aspect-square overflow-hidden bg-[#0d1117]"
                              title={file.name}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={file.storageUrl}
                                alt={file.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </button>
                            {file.pinned && (
                              <span className="absolute top-2 left-2 rounded-full bg-[#131820]/90 p-1 text-[#f97316]">
                                <Pin className="h-3 w-3" />
                              </span>
                            )}
                            <div className="p-2.5">
                              <p className="text-xs font-medium text-white truncate">{file.name}</p>
                              {file.departmentName && (
                                <p className="text-[10px] text-[#8b949e] truncate mt-0.5">{file.departmentName}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {documentFiles.length > 0 && (
                      <ul className="space-y-2">
                        {documentFiles.map((file) => (
                          <li
                            key={file.id}
                            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#21262d] bg-[#131820] p-3"
                          >
                            <div className="min-w-0 w-full">
                              <div className="flex items-center gap-2">
                                {file.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-[#f97316]" />}
                                <span className="text-sm font-medium text-white truncate">{file.name}</span>
                              </div>
                              <p className="text-xs text-[#8b949e] mt-0.5">
                                {file.mimeType || "file"}
                                {file.sizeBytes ? ` · ${formatFileSize(file.sizeBytes)}` : ""}
                                {file.departmentName ? ` · ${file.departmentName}` : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => window.open(file.storageUrl, "_blank", "noopener,noreferrer")}
                              className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-1 rounded-md border border-[#21262d] bg-[#0d1117] px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#1e2433] hover:text-white shrink-0 touch-manipulation"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TaskCompletionForm({
  taskId,
  saving,
  onSave,
}: {
  taskId: string;
  saving: boolean;
  onSave: (taskId: string, note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(taskId, note);
      }}
      className="mt-3 flex flex-col gap-2 sm:flex-row"
    >
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add completion note…"
        className="flex-1 min-h-[44px] rounded-md border border-[#21262d] bg-[#0d1117] px-3 py-2 text-sm sm:text-xs sm:py-1.5 text-white placeholder:text-[#6e7681] focus:outline-none focus:ring-1 focus:ring-[#f97316]"
      />
      <button
        type="submit"
        disabled={saving}
        className="min-h-[44px] rounded-md bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 px-4 py-2 text-sm sm:text-xs font-semibold text-black transition-colors shrink-0 touch-manipulation sm:px-3 sm:py-1.5"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
      </button>
    </form>
  );
}
