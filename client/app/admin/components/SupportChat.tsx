"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  MessageCircle,
  Paperclip,
  X,
} from "lucide-react";
import MessageAttachments from "@/components/support/MessageAttachments";
import {
  type SupportAttachment,
  type SupportMessage,
  uploadSupportAttachment,
  validateSupportAttachment,
} from "@/lib/supportChat";

interface Message extends SupportMessage {}

interface Conversation {
  _id: string;
  user: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  category: string;
  status: "active" | "resolved";
  assignedTo?: string;
  assignedToName?: string;
  messages: Message[];
  lastMessage?: {
    text: string;
    sender: string;
    createdAt: string;
  };
  lastRepliedAt?: string;
  lastRepliedBy?: "user" | "admin";
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  active: number;
  resolved: number;
  unassigned: number;
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

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export default function SupportChat() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<SupportAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [statusFilter, setStatusFilter] = useState<"active" | "resolved">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchConversations = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setListError("Admin authentication required.");
      return;
    }

    try {
      setListLoading(true);
      setListError(null);

      const params: Record<string, string> = {
        status: statusFilter,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const query = new URLSearchParams(params).toString();

      const res = await fetch(`/api/admin/support/conversations${query ? `?${query}` : ""}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data: ApiSuccess<{ conversations: Conversation[] }> | ApiError = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch conversations.");
      }

      setConversations(data.data.conversations || []);
      if (!selectedConversationId && data.data.conversations.length > 0) {
        setSelectedConversationId(data.data.conversations[0]._id);
      }
    } catch (err: any) {
      setListError(err.message || "Something went wrong while loading conversations.");
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, searchQuery, selectedConversationId]);

  const fetchConversationDetail = useCallback(
    async (conversationId: string) => {
      const token = getToken();
      if (!token) return;

      try {
        setDetailLoading(true);
        setDetailError(null);

        const res = await fetch(`/api/admin/support/${conversationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data: ApiSuccess<{ conversation: Conversation }> | ApiError = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load conversation.");
        }

        setSelectedConversation(data.data.conversation);
      } catch (err: any) {
        setDetailError(err.message || "Something went wrong while loading this conversation.");
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  const fetchStats = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/support/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data: ApiSuccess<{ stats: Stats }> | ApiError = await res.json();

      if (res.ok && data.success) {
        setStats(data.data.stats);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchStats();
  }, [fetchConversations, fetchStats]);

  useEffect(() => {
    if (selectedConversationId) {
      fetchConversationDetail(selectedConversationId);
    } else {
      setSelectedConversation(null);
      setDetailError(null);
    }
  }, [selectedConversationId, fetchConversationDetail]);

  const handleSendReply = async () => {
    const token = getToken();
    if (!token || !selectedConversationId) return;
    if (!replyText.trim() && pendingAttachments.length === 0) {
      setReplyError("Please enter a message or attach a file before sending.");
      return;
    }

    try {
      setReplyLoading(true);
      setReplyError(null);

      const res = await fetch(`/api/admin/support/${selectedConversationId}/reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: replyText.trim(),
          attachments: pendingAttachments,
        }),
      });

      const data: ApiSuccess<{ conversation: Conversation }> | ApiError = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send reply.");
      }

      const updated = data.data.conversation;
      setSelectedConversation(updated);
      setConversations((prev) =>
        prev.map((c) =>
          c._id === updated._id
            ? {
                ...c,
                status: updated.status,
                updatedAt: updated.updatedAt,
                lastMessage: updated.lastMessage,
                lastRepliedAt: updated.lastRepliedAt,
              }
            : c,
        ),
      );
      setReplyText("");
      setPendingAttachments([]);
    } catch (err: any) {
      setReplyError(err.message || "Something went wrong while sending your reply.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleAttachmentSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateSupportAttachment(file);
    if (validationError) {
      setReplyError(validationError);
      return;
    }

    try {
      setUploadingAttachment(true);
      setReplyError(null);
      const attachment = await uploadSupportAttachment(file);
      setPendingAttachments((prev) => [...prev, attachment]);
    } catch (err: any) {
      setReplyError(err.message || "Failed to upload attachment.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const canSendReply = Boolean(replyText.trim() || pendingAttachments.length);

  const handleStatusChange = async (status: "active" | "resolved") => {
    const token = getToken();
    if (!token || !selectedConversationId) return;
    if (selectedConversation?.status === status) return;

    try {
      setStatusUpdating(true);
      setDetailError(null);

      const res = await fetch(`/api/admin/support/${selectedConversationId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data: ApiSuccess<{ conversation: Conversation }> | ApiError = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update status.");
      }

      const updated = data.data.conversation;
      setSelectedConversation(updated);
      setConversations((prev) =>
        prev.map((c) =>
          c._id === updated._id
            ? {
                ...c,
                status: updated.status,
                updatedAt: updated.updatedAt,
              }
            : c,
        ),
      );
      fetchStats();
      fetchConversations();
    } catch (err: any) {
      setDetailError(err.message || "Something went wrong while updating status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="space-y-4 h-full">
      {/* Stats - Modern WhatsApp Style */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-blue-50 border-blue-200 shadow-sm rounded-xl">
            <CardContent className="pt-3 pb-3">
              <p className="text-xs font-medium text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200 shadow-sm rounded-xl">
            <CardContent className="pt-3 pb-3">
              <p className="text-xs font-medium text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-bold text-amber-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200 shadow-sm rounded-xl">
            <CardContent className="pt-3 pb-3">
              <p className="text-xs font-medium text-gray-600 mb-1">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200 shadow-sm rounded-xl">
            <CardContent className="pt-3 pb-3">
              <p className="text-xs font-medium text-gray-600 mb-1">Unassigned</p>
              <p className="text-2xl font-bold text-red-600">{stats.unassigned}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chat Layout - WhatsApp Style Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-280px)]">
        {/* Conversation List - Left Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Messages
            </h2>

            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm rounded-full border-gray-300"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(val: "active" | "resolved") => setStatusFilter(val)}
                >
                  <SelectTrigger className="h-9 text-sm rounded-full flex-1">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchConversations}
                  disabled={listLoading}
                  className="rounded-full"
                >
                  {listLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>⟳</span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {listLoading && conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm">
                <Loader2 className="h-6 w-6 mb-3 animate-spin text-blue-600" />
                <p>Loading conversations...</p>
              </div>
            ) : listError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-700 text-sm px-4">
                <div className="p-3 bg-red-100 rounded-full mb-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <p className="font-medium mb-1">{listError}</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 text-sm px-4">
                <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
                <p className="font-medium mb-1">No conversations</p>
                <p className="text-xs">Conversations will appear here</p>
              </div>
            ) : (
              <div className="space-y-1 px-2 py-2">
                {conversations.map((conv) => {
                  const isActive = conv._id === selectedConversationId;
                  return (
                    <button
                      key={conv._id}
                      type="button"
                      onClick={() => {
                        setSelectedConversationId(conv._id);
                        setDetailError(null);
                      }}
                      className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-blue-100 hover:bg-blue-100"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {conv.userName}
                        </p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          conv.status === "resolved"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {conv.status === "resolved" ? "✓" : "●"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate mb-1">
                        {conv.lastMessage?.text || "No messages"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(conv.updatedAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area - Right Side */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {/* Chat Header */}
          {selectedConversation ? (
            <div className="px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedConversation.userName}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedConversation.userEmail || selectedConversation.userPhone || "No contact info"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant={selectedConversation.status === "active" ? "default" : "outline"}
                    className={`h-8 px-3 text-xs ${
                      selectedConversation.status === "active"
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleStatusChange("active")}
                    disabled={statusUpdating}
                  >
                    Active
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedConversation.status === "resolved" ? "default" : "outline"}
                    className={`h-8 px-3 text-xs ${
                      selectedConversation.status === "resolved"
                        ? "bg-green-600 hover:bg-green-700"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleStatusChange("resolved")}
                    disabled={statusUpdating}
                  >
                    Resolved
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
              <p className="text-gray-500 text-sm">Select a conversation to start</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white">
            {detailLoading && !selectedConversation ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-500 text-sm">
                <Loader2 className="h-8 w-8 mb-3 animate-spin text-blue-600" />
                <p>Loading conversation...</p>
              </div>
            ) : detailError ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center text-gray-700 text-sm">
                <div className="p-3 bg-red-100 rounded-full mb-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <p className="font-medium mb-2">{detailError}</p>
              </div>
            ) : !selectedConversation ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-600">
                <HeadphonesIcon className="h-12 w-12 text-gray-300 mb-3" />
                <p className="font-semibold text-lg">No conversation selected</p>
                <p className="text-sm text-gray-500">Choose a conversation from the list</p>
              </div>
            ) : detailLoading && !selectedConversation?.messages?.length ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            ) : selectedConversation.messages && selectedConversation.messages.length > 0 ? (
              selectedConversation.messages.map((msg, idx) => {
                const isAdmin = msg.senderRole === "admin";
                const showDate =
                  idx === 0 ||
                  formatDate(selectedConversation.messages[idx - 1].createdAt) !==
                    formatDate(msg.createdAt);

                return (
                  <div key={msg._id || idx}>
                    {showDate && (
                      <div className="flex justify-center my-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex w-full mb-2 ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                        isAdmin
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-gray-200 text-gray-900 rounded-bl-none"
                      }`}>
                        {msg.message ? (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {msg.message}
                          </p>
                        ) : null}
                        <MessageAttachments attachments={msg.attachments} onDarkBubble={isAdmin} />
                        <div className={`text-xs mt-1 flex justify-end ${
                          isAdmin ? "text-blue-100" : "text-gray-600"
                        }`}>
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageCircle className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm">No messages yet</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          {selectedConversation && selectedConversation.status === "active" ? (
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              {replyError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 mb-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{replyError}</span>
                </div>
              )}
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {pendingAttachments.map((attachment, index) => (
                    <div
                      key={`${attachment.url}-${index}`}
                      className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700"
                    >
                      <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="max-w-[140px] truncate">{attachment.filename}</span>
                      <button
                        type="button"
                        onClick={() => removePendingAttachment(index)}
                        className="rounded-full p-0.5 hover:bg-gray-200"
                        aria-label="Remove attachment"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={handleAttachmentSelect}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment || replyLoading}
                  className="h-10 w-10 rounded-full flex-shrink-0"
                  aria-label="Attach file"
                >
                  {uploadingAttachment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                <Textarea
                  placeholder="Type a message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  className="flex-1 min-h-[44px] max-h-32 rounded-2xl border-gray-300 resize-none"
                />
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                  onClick={handleSendReply}
                  disabled={replyLoading || uploadingAttachment || !canSendReply}
                >
                  {replyLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          ) : selectedConversation?.status === "resolved" ? (
            <div className="px-4 py-3 border-t border-green-200 bg-green-50 text-center text-sm text-green-700">
              ✓ This conversation is resolved. Mark it as Active to send a reply.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
