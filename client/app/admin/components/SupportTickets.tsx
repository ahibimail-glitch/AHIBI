"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HeadphonesIcon,
  Search,
  Loader2,
  AlertCircle,
  Send,
  Filter,
  User,
  Shield,
} from "lucide-react";

type TicketStatus = "open" | "in-progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

interface SupportTicketSummary {
  _id: string;
  ticketId?: string;
  subject: string;
  status: TicketStatus;
  category: string;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  user?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  assignedTo?: {
    _id: string;
    name?: string;
    email?: string;
  };
}

interface SupportMessageSender {
  _id: string;
  name?: string;
  role?: string;
  profilePic?: string;
}

interface SupportMessage {
  _id?: string;
  sender: SupportMessageSender | string;
  message: string;
  isStaff: boolean;
  createdAt: string;
}

interface SupportTicketDetail extends SupportTicketSummary {
  messages: SupportMessage[];
}

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

interface ApiError {
  success: false;
  message: string;
}

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  "in-progress": "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const statusOrder: TicketStatus[] = ["open", "in-progress", "resolved", "closed"];

const priorityLabels: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const priorityColors: Record<TicketPriority, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);

  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("open");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TicketPriority>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTickets = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setListError("Admin authentication required.");
      return;
    }

    try {
      setListLoading(true);
      setListError(null);

      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const query = new URLSearchParams(params).toString();

      const res = await fetch(`/api/admin/support/tickets${query ? `?${query}` : ""}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data: ApiSuccess<{ tickets: SupportTicketSummary[] }> | ApiError = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch support tickets.");
      }

      const list = (data.data.tickets || []).sort((a, b) => {
        const aIdx = statusOrder.indexOf(a.status);
        const bIdx = statusOrder.indexOf(b.status);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      setTickets(list);
      if (!selectedTicketId && list.length > 0) {
        setSelectedTicketId(list[0]._id);
      }
    } catch (err: any) {
      setListError(err.message || "Something went wrong while loading tickets.");
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, priorityFilter, searchQuery, selectedTicketId]);

  const fetchTicketDetail = useCallback(
    async (ticketId: string) => {
      const token = getToken();
      if (!token) return;

      try {
        setDetailLoading(true);
        setDetailError(null);

        // Admin is allowed to view via the user-support endpoint as well
        const res = await fetch(`/api/support/tickets/${ticketId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data: ApiSuccess<{ ticket: SupportTicketDetail }> | ApiError = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load ticket details.");
        }

        setSelectedTicket(data.data.ticket);
      } catch (err: any) {
        setDetailError(err.message || "Something went wrong while loading this ticket.");
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (selectedTicketId) {
      fetchTicketDetail(selectedTicketId);
    } else {
      setSelectedTicket(null);
      setDetailError(null);
    }
  }, [selectedTicketId, fetchTicketDetail]);

  const handleSendReply = async () => {
    const token = getToken();
    if (!token || !selectedTicketId) return;
    if (!replyText.trim()) {
      setReplyError("Please enter a message before sending.");
      return;
    }

    try {
      setReplyLoading(true);
      setReplyError(null);

      const res = await fetch(`/api/support/tickets/${selectedTicketId}/reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      const data: ApiSuccess<{ ticket: SupportTicketDetail }> | ApiError = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send reply.");
      }

      const updated = data.data.ticket;
      setSelectedTicket(updated);
      setTickets((prev) =>
        prev.map((t) =>
          t._id === updated._id
            ? {
                ...t,
                status: updated.status,
                updatedAt: updated.updatedAt,
              }
            : t,
        ),
      );
      setReplyText("");
    } catch (err: any) {
      setReplyError(err.message || "Something went wrong while sending your reply.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    const token = getToken();
    if (!token || !selectedTicketId) return;

    try {
      const res = await fetch(`/api/support/tickets/${selectedTicketId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data: ApiSuccess<{ ticket: SupportTicketDetail }> | ApiError = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update ticket status.");
      }

      const updated = data.data.ticket;
      setSelectedTicket(updated);
      setTickets((prev) =>
        prev.map((t) =>
          t._id === updated._id
            ? {
                ...t,
                status: updated.status,
                updatedAt: updated.updatedAt,
              }
            : t,
        ),
      );
    } catch (err: any) {
      setDetailError(err.message || "Something went wrong while updating ticket status.");
    }
  };

  const renderMessageSender = (message: SupportMessage) => {
    const sender = message.sender as SupportMessageSender | string | null | undefined;

    // If backend stored just an ID or null, fall back to generic labels
    if (!sender || typeof sender === "string") {
      return message.isStaff ? "Ahibi Admin" : "User";
    }

    if (message.isStaff) {
      return sender.name || "Ahibi Admin";
    }

    return sender.name || "User";
  };

  const isAdminMessage = (message: SupportMessage) => message.isStaff;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <HeadphonesIcon className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl">User Support Conversations</CardTitle>
          </div>
          <CardDescription className="mt-1 text-sm">
            View and reply to support tickets created by users across the platform.
          </CardDescription>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 items-start">
        {/* Ticket list */}
        <Card className="bg-white/90 border border-gray-200 shadow-sm rounded-2xl">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Tickets</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={fetchTickets}
                  disabled={listLoading}
                >
                  {listLoading ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <span className="mr-1">⟳</span>
                  )}
                  Refresh
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[120px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Search by subject or ticket ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(val: "all" | TicketStatus) => setStatusFilter(val)}
                >
                  <SelectTrigger className="h-8 w-[110px] text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={priorityFilter}
                  onValueChange={(val: "all" | TicketPriority) => setPriorityFilter(val)}
                >
                  <SelectTrigger className="h-8 w-[110px] text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            </CardHeader>

            <CardContent className="pt-0">
              {listLoading && tickets.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading tickets...
                </div>
              ) : listError ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-700 text-sm">
                  <AlertCircle className="h-5 w-5 text-red-500 mb-2" />
                  <p className="mb-2">{listError}</p>
                  <p className="text-xs text-gray-500">
                    Check your connection or refresh this page.
                  </p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500 text-sm">
                  <HeadphonesIcon className="h-8 w-8 text-gray-300 mb-2" />
                  <p>No support tickets found.</p>
                </div>
              ) : (
                <div className="max-h-[480px] overflow-y-auto space-y-1 pr-1">
                  {tickets.map((ticket) => {
                    const isActive = ticket._id === selectedTicketId;
                    return (
                      <button
                        key={ticket._id}
                        type="button"
                        onClick={() => {
                          setSelectedTicketId(ticket._id);
                          setDetailError(null);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg border mb-1 transition-colors ${
                          isActive
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {ticket.subject}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {ticket.ticketId || ticket._id}
                            </p>
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                              <User className="h-3 w-3" />
                              <span className="truncate">
                                {ticket.user?.name || ticket.user?.phone || "Unknown user"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                            >
                              {statusLabels[ticket.status] || ticket.status}
                            </Badge>
                            <Badge
                              className={`text-[10px] px-2 py-0.5 rounded-full ${
                                priorityColors[ticket.priority] || priorityColors.medium
                              }`}
                            >
                              {priorityLabels[ticket.priority] || ticket.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                          <span className="capitalize">{ticket.category}</span>
                          <span>{formatDateTime(ticket.updatedAt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        {/* Detail / chat column */}
        <Card className="bg-white/95 border border-gray-200 shadow-md rounded-2xl min-h-[380px] flex flex-col">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {selectedTicket
                    ? selectedTicket.subject
                    : "Select a ticket to view the conversation"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedTicket
                    ? selectedTicket.ticketId
                      ? `Ticket ID: ${selectedTicket.ticketId}`
                      : selectedTicket._id
                    : "You can reply as admin and update ticket status here."}
                </CardDescription>
              </div>

              {selectedTicket && (
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                      selectedTicket.status === "resolved" || selectedTicket.status === "closed"
                        ? "border-green-500 text-green-700"
                        : "border-blue-500 text-blue-700"
                    }`}
                  >
                    {statusLabels[selectedTicket.status] || selectedTicket.status}
                  </Badge>
                  <Badge
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      priorityColors[selectedTicket.priority] || priorityColors.medium
                    }`}
                  >
                    {priorityLabels[selectedTicket.priority] || selectedTicket.priority}
                  </Badge>
                  {selectedTicket.assignedTo && (
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                      <Shield className="h-3 w-3" />
                      Assigned to {selectedTicket.assignedTo.name || "Admin"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-3 pt-0">
            {detailLoading && !selectedTicket ? (
              <div className="flex items-center justify-center flex-1 text-gray-500 text-sm">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading ticket...
              </div>
            ) : detailError ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center text-gray-700 text-sm">
                <AlertCircle className="h-5 w-5 text-red-500 mb-2" />
                <p className="mb-2">{detailError}</p>
                <p className="text-xs text-gray-500">
                  Try selecting the ticket again or refreshing the list.
                </p>
              </div>
            ) : !selectedTicket ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center text-gray-600 text-sm">
                <HeadphonesIcon className="h-8 w-8 text-gray-300 mb-3" />
                <p className="font-medium mb-1">No ticket selected</p>
                <p className="text-xs text-gray-500 max-w-sm">
                  Choose a ticket from the list to view the full conversation and reply as an
                  admin.
                </p>
              </div>
            ) : (
              <>
                {/* User info pill */}
                <div className="flex items-center gap-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-semibold text-gray-900">
                        {selectedTicket.user?.name || selectedTicket.user?.phone || "User"}
                      </div>
                      <div className="flex gap-2 text-[11px] text-gray-500">
                        {selectedTicket.user?.email && <span>{selectedTicket.user.email}</span>}
                        {selectedTicket.user?.phone && <span>{selectedTicket.user.phone}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px]">
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg) => {
                      const admin = isAdminMessage(msg);
                      const senderName = renderMessageSender(msg);
                      return (
                        <div
                          key={msg._id || msg.createdAt}
                          className={`flex w-full ${admin ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                              admin
                                ? "bg-blue-600 text-white rounded-br-sm"
                                : "bg-gray-100 text-gray-900 rounded-bl-sm"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span
                                className={`font-semibold text-[11px] ${
                                  admin ? "text-blue-50" : "text-gray-700"
                                }`}
                              >
                                {senderName}
                              </span>
                              <span
                                className={`text-[9px] ${
                                  admin ? "text-blue-100/80" : "text-gray-500"
                                }`}
                              >
                                {formatDateTime(msg.createdAt)}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-40 text-xs text-gray-500">
                      No messages yet on this ticket.
                    </div>
                  )}
                </div>

                {/* Status actions + reply */}
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Set status:</span>
                      <div className="flex gap-1">
                        {(["open", "in-progress", "resolved", "closed"] as const).map((st) => {
                          const status = st as TicketStatus;
                          return (
                            <Button
                              key={status}
                              size="sm"
                              variant={selectedTicket.status === status ? "default" : "outline"}
                              className="h-6 px-2 text-[10px] capitalize"
                              onClick={() => handleStatusChange(status)}
                              disabled={detailLoading}
                            >
                              {statusLabels[status]}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <span>
                      Last updated: {formatDateTime(selectedTicket.updatedAt) || "—"}
                    </span>
                  </div>

                  {replyError && (
                    <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-2.5 py-2 text-[11px] text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
                      <span>{replyError}</span>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <Textarea
                      placeholder="Reply to the user as Ahibi admin..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      className="text-xs resize-none"
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleSendReply}
                      disabled={replyLoading || !replyText.trim()}
                    >
                      {replyLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

