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
  MessageCircle,
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
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <HeadphonesIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Support Tickets</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Manage and respond to user support conversations
              </CardDescription>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-6 items-start">
        {/* Ticket list */}
        <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold">All Tickets</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} found
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  onClick={fetchTickets}
                  disabled={listLoading}
                >
                  {listLoading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <span className="mr-1">⟳</span>
                  )}
                  Refresh
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm border-2"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(val: "all" | TicketStatus) => setStatusFilter(val)}
                >
                  <SelectTrigger className="h-9 w-[120px] text-sm border-2">
                    <Filter className="h-4 w-4 mr-1" />
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
                  <SelectTrigger className="h-9 w-[120px] text-sm border-2">
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

            <CardContent className="pt-4 px-0">
              {listLoading && tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm">
                  <Loader2 className="h-6 w-6 mb-3 animate-spin text-blue-600" />
                  <p>Loading tickets...</p>
                </div>
              ) : listError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-700 text-sm px-4">
                  <div className="p-3 bg-red-100 rounded-full mb-3">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <p className="font-medium mb-1">{listError}</p>
                  <p className="text-xs text-gray-500">
                    Check your connection or refresh this page.
                  </p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 text-sm px-4">
                  <HeadphonesIcon className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="font-medium mb-1">No tickets found</p>
                  <p className="text-xs">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="max-h-[520px] overflow-y-auto space-y-2 px-4">
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
                        className={`w-full text-left px-3 py-3 rounded-xl border-2 transition-all duration-200 ${
                          isActive
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-transparent bg-gray-50 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate mb-1">
                              {ticket.subject}
                            </p>
                            <p className="text-xs text-gray-500 truncate mb-1">
                              {ticket.ticketId || ticket._id}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <User className="h-3.5 w-3.5" />
                              <span className="truncate font-medium">
                                {ticket.user?.name || ticket.user?.phone || "Unknown user"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <Badge
                              className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                                ticket.status === 'resolved' || ticket.status === 'closed'
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : ticket.status === 'in-progress'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                              }`}
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
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span className="capitalize font-medium">{ticket.category}</span>
                          <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        {/* Detail / chat column */}
        <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl min-h-[600px] flex flex-col overflow-hidden">
          <CardHeader className="pb-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-bold">
                  {selectedTicket
                    ? selectedTicket.subject
                    : "Select a ticket to view"}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {selectedTicket
                    ? selectedTicket.ticketId
                      ? `Ticket ID: ${selectedTicket.ticketId}`
                      : selectedTicket._id
                    : "Choose a ticket from the list to view details and respond"}
                </CardDescription>
              </div>

              {selectedTicket && (
                <div className="flex flex-col items-end gap-1.5">
                  <Badge
                    className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium ${
                      selectedTicket.status === "resolved" || selectedTicket.status === "closed"
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : selectedTicket.status === "in-progress"
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                    }`}
                  >
                    {statusLabels[selectedTicket.status] || selectedTicket.status}
                  </Badge>
                  <Badge
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      priorityColors[selectedTicket.priority] || priorityColors.medium
                    }`}
                  >
                    {priorityLabels[selectedTicket.priority] || selectedTicket.priority}
                  </Badge>
                  {selectedTicket.assignedTo && (
                    <span className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                      <Shield className="h-3.5 w-3.5" />
                      {selectedTicket.assignedTo.name || "Admin"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-4 pt-4">
            {detailLoading && !selectedTicket ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-500 text-sm">
                <Loader2 className="h-8 w-8 mb-3 animate-spin text-blue-600" />
                <p>Loading ticket...</p>
              </div>
            ) : detailError ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center text-gray-700 text-sm">
                <div className="p-3 bg-red-100 rounded-full mb-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <p className="font-medium mb-2">{detailError}</p>
                <p className="text-xs text-gray-500">
                  Try selecting the ticket again or refreshing the list.
                </p>
              </div>
            ) : !selectedTicket ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center text-gray-600">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <HeadphonesIcon className="h-10 w-10 text-gray-400" />
                </div>
                <p className="font-semibold text-lg mb-2">No ticket selected</p>
                <p className="text-sm text-gray-500 max-w-sm">
                  Choose a ticket from the list to view the conversation and respond as admin.
                </p>
              </div>
            ) : (
              <>
                {/* User info pill */}
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 px-4 py-3 text-sm">
                  <div className="p-2 bg-white rounded-full">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 mb-0.5">
                      {selectedTicket.user?.name || selectedTicket.user?.phone || "User"}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                      {selectedTicket.user?.email && <span>📧 {selectedTicket.user.email}</span>}
                      {selectedTicket.user?.phone && <span>📱 {selectedTicket.user.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[400px] px-1">
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
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                              admin
                                ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md"
                                : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <span
                                className={`font-semibold text-xs ${
                                  admin ? "text-blue-50" : "text-gray-700"
                                }`}
                              >
                                {senderName}
                              </span>
                              <span
                                className={`text-[10px] ${
                                  admin ? "text-blue-100/80" : "text-gray-500"
                                }`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-sm text-gray-500">
                      <MessageCircle className="h-10 w-10 mb-3 text-gray-300" />
                      <p className="font-medium">No messages yet</p>
                      <p className="text-xs mt-1">This ticket has no messages</p>
                    </div>
                  )}
                </div>

                {/* Status actions + reply */}
                <div className="mt-4 space-y-3 border-t-2 border-gray-200 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-700">Status:</span>
                      <div className="flex gap-1.5">
                        {(["open", "in-progress", "resolved", "closed"] as const).map((st) => {
                          const status = st as TicketStatus;
                          return (
                            <Button
                              key={status}
                              size="sm"
                              variant={selectedTicket.status === status ? "default" : "outline"}
                              className={`h-7 px-3 text-xs capitalize ${
                                selectedTicket.status === status
                                  ? "bg-blue-600 hover:bg-blue-700"
                                  : "hover:bg-gray-100"
                              }`}
                              onClick={() => handleStatusChange(status)}
                              disabled={detailLoading}
                            >
                              {statusLabels[status]}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      Updated: {new Date(selectedTicket.updatedAt).toLocaleString()}
                    </span>
                  </div>

                  {replyError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{replyError}</span>
                    </div>
                  )}

                  <div className="flex items-end gap-3">
                    <Textarea
                      placeholder="Type your admin response here..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      className="text-sm resize-none border-2 focus:border-blue-500"
                    />
                    <Button
                      size="icon"
                      className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                      onClick={handleSendReply}
                      disabled={replyLoading || !replyText.trim()}
                    >
                      {replyLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
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

