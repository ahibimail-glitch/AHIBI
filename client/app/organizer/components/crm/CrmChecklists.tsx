"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useEventDepartments } from "@/app/organizer/components/crm/useEventDepartments";

const inputClass =
  "bg-[#0d1117] border-[#21262d] text-white placeholder:text-[#6e7681] focus-visible:ring-[#f97316] h-10";

type ChecklistPhase = "pre_event" | "event_day" | "post_event";

type ChecklistItem = {
  id: string;
  checklistId: string;
  title: string;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  deadline: string | null;
  position: number;
};

type Checklist = {
  id: string;
  name: string;
  phase: ChecklistPhase;
  departmentId: string | null;
  departmentName: string | null;
  items: ChecklistItem[];
};

const PHASE_LABELS: Record<ChecklistPhase, string> = {
  pre_event: "Pre-event",
  event_day: "Event day",
  post_event: "Post-event",
};

interface CrmChecklistsProps {
  eventId: string;
}

export default function CrmChecklists({ eventId }: CrmChecklistsProps) {
  const { toast } = useToast();
  const { departments, loading: deptLoading, apiUrl, tokenName } = useEventDepartments({ eventId });

  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phase, setPhase] = useState<ChecklistPhase>("pre_event");
  const [dept, setDept] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem(tokenName);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/checklists`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load checklists");
      }
      setChecklists(data.data?.checklists || []);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load checklists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiUrl, eventId, tokenName, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddList = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Checklist name is required", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/checklists`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmed,
          phase,
          departmentId: dept || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create checklist");
      }

      setName("");
      setDept("");
      toast({ title: "Checklist created", description: trimmed });
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create checklist",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = async (listId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      const token = localStorage.getItem(tokenName);
      const res = await fetch(
        `${apiUrl}/api/organizer/events/${eventId}/checklists/${listId}/items`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: trimmed }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add item");
      }
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add item",
        variant: "destructive",
      });
    }
  };

  const handleToggleItem = async (listId: string, item: ChecklistItem) => {
    const next = item.status === "completed" ? "not_started" : "completed";

    try {
      const token = localStorage.getItem(tokenName);
      const res = await fetch(
        `${apiUrl}/api/organizer/events/${eventId}/checklists/${listId}/items/${item.id}`,
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
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update item",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (listId: string, itemId: string) => {
    try {
      const token = localStorage.getItem(tokenName);
      const res = await fetch(
        `${apiUrl}/api/organizer/events/${eventId}/checklists/${listId}/items/${itemId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete item");
      }
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    if (!confirm(`Delete checklist "${listName}"?`)) return;

    try {
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/checklists/${listId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete checklist");
      }
      toast({ title: "Checklist deleted", description: listName });
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete checklist",
        variant: "destructive",
      });
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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Checklists</h1>
        <p className="text-sm text-[#8b949e] mt-1">
          Pre-event, event-day and post-event checklists.
        </p>
      </div>

      <form
        onSubmit={handleAddList}
        className="grid gap-3 rounded-xl border border-[#21262d] bg-[#131820] p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end"
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Checklist name"
          className={inputClass}
        />
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value as ChecklistPhase)}
          className={`${inputClass} rounded-md border px-3 py-2 text-sm`}
        >
          <option value="pre_event">Pre-event</option>
          <option value="event_day">Event day</option>
          <option value="post_event">Post-event</option>
        </select>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className={`${inputClass} rounded-md border px-3 py-2 text-sm`}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 px-4 h-10 text-sm font-semibold text-black transition-colors"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New checklist
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {checklists.length === 0 ? (
          <p className="text-sm text-[#8b949e]">No checklists yet.</p>
        ) : (
          checklists.map((list) => (
            <ChecklistCard
              key={list.id}
              list={list}
              onAdd={handleAddItem}
              onToggle={handleToggleItem}
              onDeleteItem={handleDeleteItem}
              onDeleteList={handleDeleteList}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ChecklistCard({
  list,
  onAdd,
  onToggle,
  onDeleteItem,
  onDeleteList,
}: {
  list: Checklist;
  onAdd: (listId: string, title: string) => void;
  onToggle: (listId: string, item: ChecklistItem) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
  onDeleteList: (listId: string, name: string) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const items = list.items;
  const done = items.filter((i) => i.status === "completed").length;
  const phaseLabel = PHASE_LABELS[list.phase] || list.phase.replace("_", " ");
  const deptLabel = list.departmentName || "All departments";

  return (
    <div className="rounded-xl border border-[#21262d] bg-[#131820] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#21262d] px-4 py-3">
        <div>
          <div className="font-semibold text-white">{list.name}</div>
          <div className="text-xs text-[#8b949e]">
            {phaseLabel} · {deptLabel} · {done}/{items.length} done
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDeleteList(list.id, list.name)}
          className="p-1.5 text-[#6e7681] hover:text-red-400 rounded-md hover:bg-[#1e2433] transition-colors"
          aria-label={`Delete ${list.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {items.length > 0 && (
        <ul className="divide-y divide-[#21262d]">
          {items.map((item) => (
            <li key={item.id} className="group flex items-center gap-3 px-4 py-2.5">
              <button
                type="button"
                onClick={() => onToggle(list.id, item)}
                className={`grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${
                  item.status === "completed"
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                    : "border-[#30363d] hover:border-[#484f58]"
                }`}
                aria-label={item.status === "completed" ? "Mark incomplete" : "Mark complete"}
              >
                {item.status === "completed" && <Check className="h-3 w-3" />}
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
              <button
                type="button"
                onClick={() => onDeleteItem(list.id, item.id)}
                className="p-1 text-[#6e7681] hover:text-red-400 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                aria-label={`Delete ${item.title}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(list.id, newTitle);
          setNewTitle("");
        }}
        className="flex gap-2 border-t border-[#21262d] px-4 py-2.5"
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a checklist item…"
          className="flex-1 bg-[#0d1117] border-[#21262d] text-white placeholder:text-[#6e7681] focus-visible:ring-[#f97316] h-9 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-[#f97316] hover:bg-[#ea580c] px-3 py-1.5 text-sm font-semibold text-black transition-colors shrink-0"
        >
          Add
        </button>
      </form>
    </div>
  );
}
