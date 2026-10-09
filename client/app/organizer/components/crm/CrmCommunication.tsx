"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useEventDepartments } from "@/app/organizer/components/crm/useEventDepartments";

type DiscordLink = {
  id: string;
  serverName: string;
  channelName: string;
  inviteUrl: string;
  departmentId: string | null;
  departmentName: string | null;
  notes: string;
};

const inputClass =
  "rounded-md border border-[#21262d] bg-[#0d1117] text-white px-3 py-2 text-sm placeholder:text-[#6e7681] focus:outline-none focus:ring-1 focus:ring-[#f97316]";

interface CrmCommunicationProps {
  eventId: string;
}

export default function CrmCommunication({ eventId }: CrmCommunicationProps) {
  const { toast } = useToast();
  const { departments, loading: deptLoading, apiUrl, tokenName } = useEventDepartments({ eventId });

  const [links, setLinks] = useState<DiscordLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [server, setServer] = useState("");
  const [channel, setChannel] = useState("");
  const [url, setUrl] = useState("");
  const [dept, setDept] = useState("");

  const load = useCallback(async () => {
    const token = localStorage.getItem(tokenName);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/discord-links`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load channels");
      }
      setLinks(data.data?.links || []);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load channels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiUrl, eventId, tokenName, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/discord-links`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverName: server.trim() || null,
          channelName: channel.trim() || null,
          inviteUrl: url.trim(),
          departmentId: dept || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add channel");
      }

      setServer("");
      setChannel("");
      setUrl("");
      setDept("");
      toast({ title: "Channel added" });
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add channel",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    try {
      setDeletingId(linkId);
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/discord-links/${linkId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete channel");
      }

      toast({ title: "Channel removed" });
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete channel",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
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
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Communication</h1>
      <p className="text-sm text-[#8b949e] mt-1">
        Connect your Discord server and per-department channels for real-time team chat.
      </p>

      <div className="mt-6 rounded-xl border border-[#21262d] bg-[#131820] p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#f97316]/15 text-[#f97316]">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-white">Discord Integration</h2>
            <p className="text-sm text-[#8b949e] mt-0.5">
              Paste your Discord server invite or channel URLs below. Team members can open them
              directly from their event workspace.
            </p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="mt-4 grid gap-2 md:grid-cols-2">
          <input
            value={server}
            onChange={(e) => setServer(e.target.value)}
            placeholder="Server name"
            className={inputClass}
          />
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="Channel name (e.g. #security)"
            className={inputClass}
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://discord.gg/…"
            required
            className={`md:col-span-2 ${inputClass}`}
          />
          <select value={dept} onChange={(e) => setDept(e.target.value)} className={inputClass}>
            <option value="">All teams</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1 rounded-md bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 px-3 py-2 text-sm font-semibold text-black transition-colors"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add channel
          </button>
        </form>
      </div>

      <div className="mt-6 space-y-2">
        {links.length === 0 ? (
          <p className="text-sm text-[#8b949e]">No channels connected yet.</p>
        ) : (
          links.map((link) => (
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
              <div className="flex gap-2 shrink-0">
                <a
                  href={link.inviteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-[#f97316] hover:bg-[#ea580c] px-3 py-1.5 text-xs font-semibold text-black transition-colors"
                >
                  Open Team Communication
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={() => void handleDelete(link.id)}
                  disabled={deletingId === link.id}
                  className="rounded-md p-1.5 text-[#8b949e] hover:text-red-400 hover:bg-[#0d1117] disabled:opacity-60"
                >
                  {deletingId === link.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
