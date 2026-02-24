"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  MessageCircle,
  HeadphonesIcon,
  Send,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Navbar from "../Navbar";
import Footer from "../Footer";
import { getApiUrl } from "@/config";

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
  user?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
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

export default function SupportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Ensure user is logged in and fetch initial list
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/auth?redirect=/support");
      return;
    }

    const fetchTickets = async () => {
      try {
        setLoading(true);
        setListError(null);

        const res = await fetch(getApiUrl("support/tickets"), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data: ApiSuccess<{ tickets: SupportTicketSummary[] }> | ApiError = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load support conversations.");
        }

        const list = data.data.tickets || [];
        setTickets(list);
        if (list.length > 0) {
          setSelectedTicketId(list[0]._id);
        }
      } catch (err: any) {
        setListError(err.message || "Something went wrong while loading support conversations.");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [router]);

  // Fetch ticket details when selection changes
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token || !selectedTicketId) {
      return;
    }

    const fetchDetail = async () => {
      try {
        setDetailLoading(true);
        setDetailError(null);

        const res = await fetch(getApiUrl(`support/tickets/${selectedTicketId}`), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data: ApiSuccess<{ ticket: SupportTicketDetail }> | ApiError = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load conversation.");
        }

        setSelectedTicket(data.data.ticket);
      } catch (err: any) {
        setDetailError(err.message || "Something went wrong while loading this conversation.");
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [selectedTicketId]);

  const handleCreateTicket = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/auth?redirect=/support");
      return;
    }

    if (!newSubject.trim() || !newMessage.trim()) {
      setCreateError("Please provide both a subject and message.");
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const res = await fetch(getApiUrl("support/tickets"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: newSubject.trim(),
          message: newMessage.trim(),
          category: "general",
          priority: "medium",
        }),
      });

      const data: ApiSuccess<{ ticket: SupportTicketDetail }> | ApiError = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create conversation.");
      }

      const ticket = data.data.ticket;
      const summary: SupportTicketSummary = {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        status: ticket.status,
        category: ticket.category,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      };

      setTickets((prev) => [summary, ...prev]);
      setSelectedTicketId(ticket._id);
      setSelectedTicket(ticket);
      setNewSubject("");
      setNewMessage("");
    } catch (err: any) {
      setCreateError(err.message || "Something went wrong while creating the conversation.");
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token || !selectedTicketId) {
      return;
    }

    if (!replyText.trim()) {
      setReplyError("Please enter a message before sending.");
      return;
    }

    try {
      setReplyLoading(true);
      setReplyError(null);

      const res = await fetch(getApiUrl(`support/tickets/${selectedTicketId}/reply`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      const data: ApiSuccess<{ ticket: SupportTicketDetail }> | ApiError = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send message.");
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
      setReplyError(err.message || "Something went wrong while sending your message.");
    } finally {
      setReplyLoading(false);
    }
  };

  const renderMessageSender = (message: SupportMessage) => {
    const sender = message.sender as SupportMessageSender | string | null | undefined;

    // If backend stored just an ID or null, fall back to generic labels
    if (!sender || typeof sender === "string") {
      return message.isStaff ? "Ahibi Team" : "You";
    }

    if (message.isStaff) {
      return sender.name || "Ahibi Team";
    }

    return sender.name || "You";
  };

  const isUserMessage = (message: SupportMessage) => !message.isStaff;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-3 mb-2">
            <HeadphonesIcon className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Chat with Ahibi Support
            </h1>
          </div>
          <p className="text-sm text-gray-600 max-w-2xl">
            Have a question about your bookings, payments, or events? Start a conversation with
            the Ahibi team and we&apos;ll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] gap-6 items-start">
          {/* Conversations list */}
          <Card className="bg-white/90 border border-gray-200 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-col gap-3 pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-gray-700" />
                    Your Conversations
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Select a conversation or start a new one.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    setSelectedTicketId(null);
                    setSelectedTicket(null);
                    setDetailError(null);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New
                </Button>
              </div>

              {/* New ticket form (compact) when no ticket selected */}
              {!selectedTicketId && (
                <div className="space-y-2 mt-1">
                  {createError && (
                    <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-2.5 py-2 text-xs text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
                      <span>{createError}</span>
                    </div>
                  )}
                  <Input
                    placeholder="Subject (e.g. Ticket not visible)"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Textarea
                    placeholder="Describe your issue in a few sentences..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                    className="text-xs resize-none"
                  />
                  <Button
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleCreateTicket}
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3 mr-1" />
                        Start Conversation
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading conversations...
                </div>
              ) : listError ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-700 text-sm">
                  <AlertCircle className="h-5 w-5 text-red-500 mb-2" />
                  <p className="mb-2">{listError}</p>
                  <p className="text-xs text-gray-500">
                    Please refresh the page or try again later.
                  </p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  You don&apos;t have any conversations yet. Start a new one using the form above.
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto space-y-1 pr-1">
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
                        className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors mb-1 ${
                          isActive
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {ticket.subject}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {ticket.ticketId || "Conversation"}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                          >
                            {statusLabels[ticket.status] || ticket.status}
                          </Badge>
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

          {/* Conversation detail */}
          <Card className="bg-white/95 border border-gray-200 shadow-md rounded-2xl min-h-[380px] flex flex-col">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    {selectedTicket
                      ? selectedTicket.subject
                      : "Start a conversation with Ahibi"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {selectedTicket
                      ? selectedTicket.ticketId
                        ? `Ticket ID: ${selectedTicket.ticketId}`
                        : "Support conversation"
                      : "Describe your issue and our team will reply here."}
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
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-3 pt-0">
              {detailLoading ? (
                <div className="flex items-center justify-center flex-1 text-gray-500 text-sm">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading conversation...
                </div>
              ) : detailError ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center text-gray-700 text-sm">
                  <AlertCircle className="h-5 w-5 text-red-500 mb-2" />
                  <p className="mb-2">{detailError}</p>
                  <p className="text-xs text-gray-500">
                    Try selecting the conversation again or refreshing the page.
                  </p>
                </div>
              ) : !selectedTicket ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center text-gray-600 text-sm">
                  <HeadphonesIcon className="h-8 w-8 text-gray-300 mb-3" />
                  <p className="font-medium mb-1">No conversation selected</p>
                  <p className="text-xs text-gray-500 max-w-sm">
                    Choose a conversation on the left or start a new one to chat with the Ahibi
                    team.
                  </p>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px]">
                    {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                      selectedTicket.messages.map((msg) => {
                        const mine = isUserMessage(msg);
                        const senderName = renderMessageSender(msg);
                        return (
                          <div
                            key={msg._id || msg.createdAt}
                            className={`flex w-full ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                                mine
                                  ? "bg-red-600 text-white rounded-br-sm"
                                  : "bg-gray-100 text-gray-900 rounded-bl-sm"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span
                                  className={`font-semibold text-[11px] ${
                                    mine ? "text-red-50" : "text-gray-700"
                                  }`}
                                >
                                  {senderName}
                                </span>
                                <span
                                  className={`text-[9px] ${
                                    mine ? "text-red-100/80" : "text-gray-500"
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
                        No messages yet. Send a message below to begin.
                      </div>
                    )}
                  </div>

                  {/* Reply box */}
                  {selectedTicket.status === "closed" || selectedTicket.status === "resolved" ? (
                    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-gray-500" />
                      This conversation has been marked as{" "}
                      <span className="font-semibold">
                        {statusLabels[selectedTicket.status] || selectedTicket.status}
                      </span>
                      . If you need more help, please start a new conversation.
                    </div>
                  ) : (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      {replyError && (
                        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-2.5 py-2 mb-2 text-[11px] text-red-700">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
                          <span>{replyError}</span>
                        </div>
                      )}
                      <div className="flex items-end gap-2">
                        <Textarea
                          placeholder="Type your message to the Ahibi team..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                          className="text-xs resize-none"
                        />
                        <Button
                          size="icon"
                          className="h-9 w-9 rounded-full bg-red-600 hover:bg-red-700"
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
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

