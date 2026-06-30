"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  MapPin,
  User,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createAuthRedirectUrl } from "@/utils/redirectUtils";
import { useToast } from "@/components/ui/use-toast";

interface PendingInvite {
  id: string;
  phone: string;
  email?: string;
  department: string;
  departmentName?: string;
  inviteToken?: string;
  accessExpiresAt?: string;
  userMatches?: boolean | null;
  event: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    location?: { city?: string; state?: string; address?: string };
    status: string;
  } | null;
  invitedBy?: { name: string; companyName?: string } | null;
}

interface ActiveEvent {
  membershipId: string;
  department: string;
  departmentName?: string;
  isOwner?: boolean;
  acceptedAt?: string;
  event: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    location?: { city?: string; state?: string; address?: string };
    status: string;
  };
}

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLocation(location?: { address?: string; city?: string; state?: string }) {
  if (!location) return null;
  const parts = [location.address, location.city, location.state].filter(Boolean);
  return parts.join(", ") || null;
}

function InviteDetailRows({ invite }: { invite: PendingInvite }) {
  const location = formatLocation(invite.event?.location);
  const inviter =
    invite.invitedBy?.companyName || invite.invitedBy?.name || "Event organizer";

  return (
    <div className="mt-4 space-y-2.5 text-sm">
      <div className="flex items-start gap-2.5 text-[#c9d1d9]">
        <User className="h-4 w-4 shrink-0 mt-0.5 text-[#6e7681]" />
        <span>
          Invited by <span className="text-white font-medium">{inviter}</span>
        </span>
      </div>
      <div className="flex items-start gap-2.5 text-[#c9d1d9]">
        <Briefcase className="h-4 w-4 shrink-0 mt-0.5 text-[#6e7681]" />
        <span>
          Department:{" "}
          <span className="text-[#f97316] font-medium">
            {invite.departmentName || "No department"}
          </span>
        </span>
      </div>
      {invite.event?.startDate && (
        <div className="flex items-start gap-2.5 text-[#c9d1d9]">
          <Calendar className="h-4 w-4 shrink-0 mt-0.5 text-[#6e7681]" />
          <span>{formatEventDate(invite.event.startDate)}</span>
        </div>
      )}
      {location && (
        <div className="flex items-start gap-2.5 text-[#c9d1d9]">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-[#6e7681]" />
          <span>{location}</span>
        </div>
      )}
      {invite.accessExpiresAt && (
        <div className="flex items-start gap-2.5 text-[#c9d1d9]">
          <Clock className="h-4 w-4 shrink-0 mt-0.5 text-[#6e7681]" />
          <span>Access expires {formatEventDate(invite.accessExpiresAt)}</span>
        </div>
      )}
      <p className="text-xs text-[#6e7681] pt-1">
        Invitation sent to {invite.phone}
        {invite.email ? ` · ${invite.email}` : ""}
      </p>
    </div>
  );
}

function ManageEventContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const { toast } = useToast();
  const { user, isAuthenticated, loading: authLoading } = useAuth({
    redirectPath: createAuthRedirectUrl(
      inviteToken ? `/manageEvent?invite=${inviteToken}` : "/manageEvent"
    ),
  });

  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [tokenPreview, setTokenPreview] = useState<PendingInvite | null>(null);
  const [tokenPreviewError, setTokenPreviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchTokenPreview = useCallback(async () => {
    if (!inviteToken) {
      setTokenPreview(null);
      setTokenPreviewError(null);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${apiUrl}/api/event-team/invites/token/${inviteToken}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setTokenPreview(null);
        setTokenPreviewError(data.message || "Invitation not found or expired");
        return;
      }

      setTokenPreview(data.data?.invite || null);
      setTokenPreviewError(null);
    } catch {
      setTokenPreview(null);
      setTokenPreviewError("Failed to load invitation details");
    }
  }, [apiUrl, inviteToken]);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const [invitesRes, eventsRes] = await Promise.all([
        fetch(`${apiUrl}/api/event-team/invites`, { headers }),
        fetch(`${apiUrl}/api/event-team/events`, { headers }),
      ]);

      await fetchTokenPreview();

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvites(invitesData.data?.invites || []);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data?.events || []);
      }
    } catch (err) {
      console.error("Failed to load manage event data:", err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, fetchTokenPreview]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchData();
    }
  }, [isAuthenticated, authLoading, fetchData]);

  const handleAccept = async (invite: PendingInvite) => {
    try {
      setActionId(invite.id);
      const token = localStorage.getItem("token");
      const endpoint =
        invite.inviteToken && inviteToken === invite.inviteToken
          ? `${apiUrl}/api/event-team/invites/token/${invite.inviteToken}/accept`
          : `${apiUrl}/api/event-team/invites/${invite.id}/accept`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to accept invitation");
      }

      const eventId = data.data?.eventId;
      toast({
        title: "Invitation accepted",
        description: `Welcome to ${data.data?.eventTitle || "the event"}.${
          invite.departmentName && invite.departmentName !== "No department"
            ? ` You are assigned to ${invite.departmentName}.`
            : ""
        }`,
      });

      if (eventId) {
        router.replace(`/manageEvent/${eventId}`);
      } else {
        router.replace("/manageEvent");
        await fetchData();
      }
    } catch (err) {
      toast({
        title: "Could not accept invite",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      setActionId(inviteId);
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/event-team/invites/${inviteId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to decline invitation");

      toast({ title: "Invitation declined" });
      if (inviteToken) router.replace("/manageEvent");
      await fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to decline",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    router.push("/auth");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#f97316]" />
      </div>
    );
  }

  const highlightedInvite =
    tokenPreview ||
    (inviteToken ? invites.find((i) => i.inviteToken === inviteToken) : null) ||
    null;

  const showPhoneMismatch =
    highlightedInvite?.userMatches === false ||
    (highlightedInvite && user?.phone && highlightedInvite.phone !== user.phone.replace(/\D/g, "").slice(-10));

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white">
      <header className="border-b border-[#21262d] px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/images/Logo.png"
            alt="AHIBI Event Command"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
          />
          <div className="hidden sm:block border-l border-[#21262d] pl-3">
            <p className="text-xs text-[#8b949e]">Team member dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user?.phone && (
            <span className="hidden sm:inline text-sm text-[#8b949e]">{user.phone}</span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-[#8b949e] hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {!user?.phone && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Sign in with the mobile number your invitation was sent to in order to accept it.
          </div>
        )}

        {inviteToken && tokenPreviewError && !highlightedInvite && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            {tokenPreviewError}
          </div>
        )}

        {highlightedInvite && (
          <div className="rounded-xl border border-[#f97316]/40 bg-[#131820] p-5 sm:p-6">
            <p className="text-[10px] uppercase tracking-widest text-[#f97316] mb-2">
              You&apos;re invited
            </p>
            <h2 className="text-2xl font-semibold text-white">
              {highlightedInvite.event?.title || "Event invitation"}
            </h2>
            <p className="text-sm text-[#8b949e] mt-1">
              Join the event team on AHIBI Event Command
            </p>

            <InviteDetailRows invite={highlightedInvite} />

            {showPhoneMismatch && (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                This invitation was sent to <strong>{highlightedInvite.phone}</strong>. Sign in
                with that number to accept.
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="button"
                disabled={!!actionId || showPhoneMismatch}
                onClick={() => handleAccept(highlightedInvite)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#f97316] hover:bg-[#ea580c] text-black font-semibold text-sm disabled:opacity-60"
              >
                {actionId === highlightedInvite.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Accept invitation
              </button>
              <button
                type="button"
                disabled={!!actionId || showPhoneMismatch}
                onClick={() => handleDecline(highlightedInvite.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-[#21262d] text-[#8b949e] hover:text-white text-sm disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Decline
              </button>
            </div>
          </div>
        )}

        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681] mb-3">
            Pending Invitations ({invites.length})
          </h2>
          <div className="rounded-xl border border-[#21262d] bg-[#131820] overflow-hidden">
            {invites.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#8b949e]">No pending invitations.</p>
            ) : (
              <div className="divide-y divide-[#21262d]">
                {invites.map((invite) => (
                  <div key={invite.id} className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white">
                          {invite.event?.title || "Event invitation"}
                        </h3>
                        <InviteDetailRows invite={invite} />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={!!actionId || invite.userMatches === false}
                          onClick={() => handleAccept(invite)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#f97316] text-black font-semibold text-sm disabled:opacity-60"
                        >
                          {actionId === invite.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={!!actionId}
                          onClick={() => handleDecline(invite.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#21262d] text-[#8b949e] hover:text-white text-sm disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681] mb-3">
            Your Events ({events.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {events.length === 0 ? (
              <div className="sm:col-span-2 rounded-xl border border-[#21262d] bg-[#131820] p-8 text-center text-sm text-[#8b949e]">
                Accept an invitation to access your event dashboard.
              </div>
            ) : (
              events.map(({ event, departmentName, membershipId, isOwner }) => (
                <button
                  key={membershipId}
                  type="button"
                  onClick={() => router.push(`/manageEvent/${event.id}`)}
                  className="text-left rounded-xl border border-[#21262d] bg-[#131820] p-5 hover:border-[#f97316]/40 transition-colors"
                >
                  <p className="text-[10px] uppercase tracking-widest text-[#f97316] mb-2">
                    {isOwner ? "Event Admin" : departmentName || "Team Member"}
                  </p>
                  <h3 className="font-semibold text-white">{event.title}</h3>
                  <p className="text-sm text-[#8b949e] mt-2 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(event.startDate).toLocaleDateString()}
                  </p>
                  {event.location?.city && (
                    <p className="text-xs text-[#6e7681] mt-1 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.location.city}
                    </p>
                  )}
                  <p className="text-xs text-[#f97316] mt-4 font-medium">Open event →</p>
                </button>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function ManageEventPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#f97316]" />
        </div>
      }
    >
      <ManageEventContent />
    </Suspense>
  );
}
