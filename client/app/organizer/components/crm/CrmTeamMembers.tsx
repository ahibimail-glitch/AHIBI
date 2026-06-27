"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const DEPARTMENTS = [
  { value: "none", label: "No department" },
  { value: "artist-management", label: "Artist Management" },
  { value: "event-management", label: "Event Management" },
  { value: "hospitality", label: "Hospitality" },
  { value: "media-content", label: "Media and Content" },
  { value: "medical", label: "Medical" },
  { value: "security", label: "Security" },
  { value: "sound-lighting", label: "Sound and Lighting" },
  { value: "stage-production", label: "Stage and Production" },
  { value: "ticketing-entry", label: "Ticketing and Entry" },
];

const ROLES = [
  { value: "team-member", label: "Team Member" },
  { value: "admin", label: "Admin" },
  { value: "viewer", label: "Viewer" },
];

interface TeamMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  department: string;
  isOwner?: boolean;
}

interface PendingInvite {
  id: string;
  phone: string;
  email: string;
  role: string;
  department: string;
  accessExpiresAt?: string;
}

const inputClass =
  "bg-[#0d1117] border-[#21262d] text-white placeholder:text-[#6e7681] focus-visible:ring-[#f97316] h-10";

const selectTriggerClass =
  "bg-[#0d1117] border-[#21262d] text-white focus:ring-[#f97316] h-10";

const selectContentClass = "bg-[#161b26] border-[#21262d] text-white";

function getDepartmentLabel(value: string) {
  if (!value || value === "none") return "—";
  return DEPARTMENTS.find((d) => d.value === value)?.label ?? value;
}

interface CrmTeamMembersProps {
  eventId: string;
  readOnly?: boolean;
}

export default function CrmTeamMembers({ eventId, readOnly = false }: CrmTeamMembersProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("team-member");
  const [department, setDepartment] = useState("none");
  const [expiresAt, setExpiresAt] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("organizer_token");
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load team");
      }

      const data = await res.json();
      setMembers(data.data?.members || []);
      setPendingInvites(data.data?.pendingInvites || []);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load team",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiUrl, eventId, toast]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleInvite = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);

    if (!normalizedPhone || normalizedPhone.length !== 10) {
      toast({ title: "Valid 10-digit phone number is required", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("organizer_token");
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/team/invite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          email: trimmedEmail || undefined,
          role,
          department,
          accessExpiresAt: expiresAt || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send invitation");
      }

      const smsSent = data.data?.delivery?.sms?.success;
      const emailSent = data.data?.delivery?.email?.success;

      toast({
        title: "Invitation sent",
        description:
          smsSent && emailSent
            ? `SMS and email sent to ${normalizedPhone}`
            : smsSent
              ? `SMS sent to ${normalizedPhone}`
              : emailSent
                ? `Email sent${trimmedEmail ? ` to ${trimmedEmail}` : ""}`
                : `Invite created for ${normalizedPhone}. Check SMS/email configuration.`,
      });

      setEmail("");
      setPhone("");
      setRole("team-member");
      setDepartment("none");
      setExpiresAt("");
      await fetchTeam();
    } catch (err) {
      toast({
        title: "Invite failed",
        description: err instanceof Error ? err.message : "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Remove this team member or cancel the invitation?")) return;

    try {
      const token = localStorage.getItem("organizer_token");
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/team/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to remove member");
      }

      toast({ title: "Removed", description: "Team member removed successfully" });
      await fetchTeam();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove member",
        variant: "destructive",
      });
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
        <h1 className="text-2xl font-semibold tracking-tight text-white">Team Members</h1>
        <p className="text-sm text-[#8b949e] mt-1">
          {readOnly
            ? "View event team members."
            : "Invite by mobile number and email. Use the invitee's details, not your organizer account."}
        </p>
      </div>

      {!readOnly && (
        <div className="rounded-xl border border-[#21262d] bg-[#131820] p-4 sm:p-5 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              type="tel"
              placeholder="Mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className={inputClass}
              maxLength={10}
            />

            <Input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />

            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="focus:bg-[#1e2433] focus:text-white">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.value} value={d.value} className="focus:bg-[#1e2433] focus:text-white">
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={handleInvite}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 text-black font-semibold text-sm transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Invite
            </button>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <label className="text-sm text-[#8b949e] shrink-0 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Access expires (optional):
            </label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={`${inputClass} sm:max-w-xs`}
            />
          </div>
        </div>
      )}

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681] mb-3">
          Members ({members.length})
        </p>

        <div className="rounded-xl border border-[#21262d] bg-[#131820] overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1.2fr_1fr_1fr_40px] gap-4 px-5 py-3 border-b border-[#21262d] text-[10px] font-semibold uppercase tracking-widest text-[#6e7681]">
            <span>Name</span>
            <span>Phone</span>
            <span>Email</span>
            <span>Role</span>
            <span>Department</span>
            <span />
          </div>

          {members.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[#8b949e]">No members yet.</p>
          ) : (
            <div className="divide-y divide-[#21262d]">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.2fr_1fr_1fr_40px] gap-2 sm:gap-4 px-5 py-4 items-center"
                >
                  <div>
                    <p className="text-[10px] uppercase text-[#6e7681] sm:hidden mb-0.5">Name</p>
                    <p className="text-sm font-medium text-white tracking-wide">
                      {(member.name || member.phone).toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-[#6e7681] sm:hidden mb-0.5">Phone</p>
                    <p className="text-sm text-[#c9d1d9]">{member.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-[#6e7681] sm:hidden mb-0.5">Email</p>
                    <p className="text-sm text-[#c9d1d9]">{member.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-[#6e7681] sm:hidden mb-0.5">Role</p>
                    <p className="text-sm text-[#c9d1d9]">{member.role}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-[#6e7681] sm:hidden mb-0.5">Department</p>
                    <p className="text-sm text-[#c9d1d9]">{getDepartmentLabel(member.department)}</p>
                  </div>
                  <div className="flex justify-end">
                    {!readOnly && !member.isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-[#6e7681] hover:text-red-400 rounded-md hover:bg-[#1e2433] transition-colors"
                        aria-label="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!readOnly && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681] mb-3">
            Pending Invitations
          </p>

          <div className="rounded-xl border border-[#21262d] bg-[#131820] overflow-hidden">
            {pendingInvites.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#8b949e]">No pending invitations.</p>
            ) : (
              <div className="divide-y divide-[#21262d]">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{invite.phone}</p>
                      {invite.email && (
                        <p className="text-xs text-[#8b949e] truncate">{invite.email}</p>
                      )}
                      <p className="text-xs text-[#8b949e] mt-0.5">
                        {invite.role}
                        {invite.department !== "none" && ` · ${getDepartmentLabel(invite.department)}`}
                        {invite.accessExpiresAt &&
                          ` · Expires ${new Date(invite.accessExpiresAt).toLocaleString()}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(invite.id)}
                      className="p-2 text-[#6e7681] hover:text-red-400 rounded-md hover:bg-[#1e2433] transition-colors self-end sm:self-auto"
                      aria-label="Cancel invitation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
