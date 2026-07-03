"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useEventDepartments } from "@/app/organizer/components/crm/useEventDepartments";

const STATUSES = ["not_started", "in_progress", "waiting", "completed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

type Task = {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: string;
  departmentId: string | null;
  departmentName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  deadline: string | null;
  completionComment: string;
};

type TeamMember = {
  id: string;
  name: string;
  phone: string;
  email: string;
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

interface CrmTasksProps {
  eventId: string;
}

export default function CrmTasks({ eventId }: CrmTasksProps) {
  const { toast } = useToast();
  const { departments, loading: deptLoading, apiUrl, tokenName } = useEventDepartments({ eventId });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem(tokenName);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [tasksRes, teamRes] = await Promise.all([
        fetch(`${apiUrl}/api/organizer/events/${eventId}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/organizer/events/${eventId}/team`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const tasksData = await tasksRes.json();
      const teamData = await teamRes.json();

      if (!tasksRes.ok) {
        throw new Error(tasksData.message || "Failed to load tasks");
      }

      setTasks(tasksData.data?.tasks || []);
      setMembers(
        (teamData.data?.members || []).map((m: TeamMember & { isOwner?: boolean }) => ({
          id: m.id,
          name: (m.name || m.phone || m.email || "Member").toUpperCase(),
          phone: m.phone,
          email: m.email,
        }))
      );
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiUrl, eventId, tokenName, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

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
          <h1 className="text-2xl font-semibold tracking-tight text-white">Tasks</h1>
          <p className="text-sm text-[#8b949e] mt-1">
            Assign, track, and complete tasks with proof.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#f97316] hover:bg-[#ea580c] px-4 py-2.5 text-sm font-semibold text-black transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          New task
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
              filter === s
                ? "border-[#f97316] bg-[#f97316]/10 text-[#fb923c]"
                : "border-[#21262d] bg-[#131820] text-[#8b949e] hover:bg-[#1e2433] hover:text-white"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.length === 0 ? (
          <p className="text-sm text-[#8b949e]">No tasks.</p>
        ) : (
          visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              eventId={eventId}
              apiUrl={apiUrl}
              tokenName={tokenName}
              onChange={load}
            />
          ))
        )}
      </div>

      {showCreate && (
        <CreateTaskDialog
          eventId={eventId}
          departments={departments}
          members={members}
          apiUrl={apiUrl}
          tokenName={tokenName}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  eventId,
  apiUrl,
  tokenName,
  onChange,
}: {
  task: Task;
  eventId: string;
  apiUrl: string;
  tokenName: string;
  onChange: () => void;
}) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== "completed" &&
    task.status !== "cancelled";

  const setStatus = async (status: Status) => {
    try {
      setUpdating(true);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/tasks/${task.id}`, {
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
      await onChange();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#21262d] bg-[#131820] p-4">
      <div className="flex items-start justify-between gap-3">
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
            {task.assigneeName && (
              <span className="rounded-full bg-[#21262d] px-2.5 py-0.5 text-[#c9d1d9]">
                → {task.assigneeName}
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
          onChange={(e) => setStatus(e.target.value as Status)}
          disabled={updating}
          className={`${selectClass} text-xs shrink-0 disabled:opacity-50`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {task.status === "completed" && !task.completionComment && (
        <CompletionForm
          eventId={eventId}
          taskId={task.id}
          apiUrl={apiUrl}
          tokenName={tokenName}
          onDone={onChange}
        />
      )}
    </div>
  );
}

function CompletionForm({
  eventId,
  taskId,
  apiUrl,
  tokenName,
  onDone,
}: {
  eventId: string;
  taskId: string;
  apiUrl: string;
  tokenName: string;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completionComment: note }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save note");
      }
      await onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add completion note…"
        className={`${inputClass} flex-1 h-9 text-xs`}
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-black transition-colors shrink-0"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
      </button>
    </form>
  );
}

function CreateTaskDialog({
  eventId,
  departments,
  members,
  apiUrl,
  tokenName,
  onClose,
  onCreated,
}: {
  eventId: string;
  departments: { id: string; name: string }[];
  members: TeamMember[];
  apiUrl: string;
  tokenName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("medium");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          departmentId: department || undefined,
          assigneeId: assignee || undefined,
          priority,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create task");
      }
      toast({ title: "Task created", description: title.trim() });
      onCreated();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg space-y-3 rounded-xl border border-[#21262d] bg-[#131820] p-6"
      >
        <h2 className="text-lg font-semibold text-white">New task</h2>

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
          placeholder="Description"
          rows={3}
          className={`${inputClass} text-sm resize-none`}
        />

        <div className="grid gap-2 sm:grid-cols-2">
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
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className={selectClass}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
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
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={selectClass}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#21262d] px-3 py-2 text-sm text-[#8b949e] hover:bg-[#1e2433] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 px-4 py-2 text-sm font-semibold text-black transition-colors"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create task
          </button>
        </div>
      </form>
    </div>
  );
}
