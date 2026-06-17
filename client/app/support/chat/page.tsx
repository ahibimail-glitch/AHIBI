"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Send,
  Loader2,
  AlertCircle,
  HeadphonesIcon,
  CheckCheck,
  ShieldCheck,
  RefreshCw,
  Paperclip,
  X,
} from "lucide-react";
import Navbar from "../../Navbar";
import { getApiUrl } from "@/config";
import MessageAttachments from "@/components/support/MessageAttachments";
import {
  type SupportAttachment,
  type SupportMessage,
  uploadSupportAttachment,
  validateSupportAttachment,
} from "@/lib/supportChat";

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
  messages: SupportMessage[];
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

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

interface ApiError {
  success: false;
  message: string;
}

export default function SupportChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<SupportAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/auth?redirect=/support/chat");
      return;
    }

    const fetchConversation = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(getApiUrl("support/chat"), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data: ApiSuccess<{ conversation: Conversation }> | ApiError = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load conversation.");
        }

        setConversation(data.data.conversation);
      } catch (err: any) {
        setError(err.message || "Something went wrong while loading your conversation.");
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [router]);

  const handleSendMessage = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/auth?redirect=/support/chat");
      return;
    }

    if (!messageText.trim() && pendingAttachments.length === 0) {
      setSendError("Please enter a message or attach a file.");
      return;
    }

    try {
      setSending(true);
      setSendError(null);

      const res = await fetch(getApiUrl("support/chat/message"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText.trim(),
          attachments: pendingAttachments,
        }),
      });

      const data: ApiSuccess<{ conversation: Conversation }> | ApiError = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send message.");
      }

      setConversation(data.data.conversation);
      setMessageText("");
      setPendingAttachments([]);
    } catch (err: any) {
      setSendError(err.message || "Something went wrong while sending your message.");
    } finally {
      setSending(false);
    }
  };

  const handleAttachmentSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateSupportAttachment(file);
    if (validationError) {
      setSendError(validationError);
      return;
    }

    try {
      setUploadingAttachment(true);
      setSendError(null);
      const attachment = await uploadSupportAttachment(file);
      setPendingAttachments((prev) => [...prev, attachment]);
    } catch (err: any) {
      setSendError(err.message || "Failed to upload attachment.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const canSend = Boolean(messageText.trim() || pendingAttachments.length);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const isResolved = conversation?.status === "resolved";
  const footerHeight = isResolved ? "pb-36 sm:pb-32" : "pb-24 sm:pb-20";

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col">
      <Navbar />

      {/* Full-height chat shell */}
      <main className="flex-1 flex flex-col w-full max-w-2xl mx-auto sm:my-4 sm:rounded-2xl sm:shadow-xl overflow-hidden bg-white border border-gray-100">

        {/* ── HEADER ── */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 bg-white border-b border-gray-100 sticky top-0 z-20">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md">
              <HeadphonesIcon className="h-5 w-5 text-white" />
            </div>
            {/* Online dot */}
            {!isResolved && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold text-gray-900 leading-tight truncate">
              Support Team
            </p>
            <p className="text-[11px] sm:text-xs leading-tight mt-0.5">
              {isResolved ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <ShieldCheck className="h-3 w-3" /> Resolved
                </span>
              ) : conversation?.assignedToName ? (
                <span className="text-gray-500">
                  Chatting with{" "}
                  <span className="font-medium text-gray-700">{conversation.assignedToName}</span>
                </span>
              ) : (
                <span className="text-amber-500 font-medium">Waiting for an agent…</span>
              )}
            </p>
          </div>

          {/* Category badge */}
          {conversation?.category && (
            <span className="hidden sm:inline-flex text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 capitalize flex-shrink-0">
              {conversation.category}
            </span>
          )}
        </div>

        {/* ── MESSAGES ── */}
        <div
          className={`flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-1 bg-[#f0f2f5] ${footerHeight}`}
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #d1d5db44 1px, transparent 0)", backgroundSize: "24px 24px" }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
              <div className="h-12 w-12 rounded-full bg-white shadow-md flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-red-600" />
              </div>
              <p className="text-sm font-medium">Loading conversation…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
              <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">{error}</p>
                <p className="text-xs text-gray-400">Please refresh the page or try again later.</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </button>
            </div>
          ) : !conversation || conversation.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
              <div className="h-16 w-16 rounded-2xl bg-white shadow-md flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-base text-gray-900 mb-1">Start a conversation</p>
                <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                  Send your first message and our support team will respond as soon as possible.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white rounded-full px-3 py-1.5 shadow-sm border border-gray-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                Typical response time: under 1 hour
              </div>
            </div>
          ) : (
            <>
              {conversation.messages.map((msg, idx) => {
                const isUser = msg.senderRole === "user";
                const showDate =
                  idx === 0 ||
                  formatDate(conversation.messages[idx - 1].createdAt) !== formatDate(msg.createdAt);

                // Group consecutive messages from same sender
                const nextMsg = conversation.messages[idx + 1];
                const isLastInGroup = !nextMsg || nextMsg.senderRole !== msg.senderRole;

                return (
                  <div key={msg._id || idx}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="text-[11px] font-medium text-gray-500 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-gray-100">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-2" : "mb-0.5"}`}>
                      {/* Admin avatar placeholder for spacing */}
                      {!isUser && (
                        <div className="flex-shrink-0 mr-1.5 mt-auto">
                          {isLastInGroup ? (
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                              <HeadphonesIcon className="h-3 w-3 text-white" />
                            </div>
                          ) : (
                            <div className="h-6 w-6" />
                          )}
                        </div>
                      )}

                      <div
                        className={`
                          max-w-[75%] sm:max-w-[65%] px-3 py-2 text-sm shadow-sm
                          ${isUser
                            ? `bg-red-600 text-white ${isLastInGroup ? "rounded-t-2xl rounded-l-2xl rounded-br-sm" : "rounded-2xl"}`
                            : `bg-white text-gray-800 ${isLastInGroup ? "rounded-t-2xl rounded-r-2xl rounded-bl-sm" : "rounded-2xl"}`
                          }
                        `}
                      >
                        {/* Show sender name for admin */}
                        {!isUser && idx === 0 || (!isUser && conversation.messages[idx - 1]?.senderRole === "user") ? (
                          <p className="text-[10px] font-semibold text-red-500 mb-1">{msg.senderName}</p>
                        ) : null}

                        {msg.message ? (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                        ) : null}
                        <MessageAttachments attachments={msg.attachments} onDarkBubble={isUser} />

                        <div className={`flex items-center justify-end gap-1 mt-1 ${isUser ? "text-red-200" : "text-gray-400"}`}>
                          <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                          {isUser && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ── INPUT FOOTER ── */}
        <div
          className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-3 sm:px-4 pt-3 pb-safe-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.06)] sm:bottom-0 bottom-16"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
        >
          {isResolved && (
            <div className="flex items-start gap-2.5 bg-emerald-50 rounded-xl px-3 py-2.5 mb-2.5 border border-emerald-100">
              <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 leading-relaxed">
                Your issue has been resolved. 
              </p>
            </div>
          )}
          {sendError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 mb-2.5">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{sendError}</span>
            </div>
          )}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5">
              {pendingAttachments.map((attachment, index) => (
                <div
                  key={`${attachment.url}-${index}`}
                  className="relative flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700"
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
              disabled={uploadingAttachment || sending}
              className="h-10 w-10 rounded-full flex-shrink-0 border-gray-200"
              aria-label="Attach file"
            >
              {uploadingAttachment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1 relative">
              <Textarea
                placeholder={isResolved ? "Send a message to reopen this conversation…" : "Type a message…"}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={2}
                className="w-full min-h-[44px] max-h-32 rounded-2xl border-gray-200 bg-[#f0f2f5] focus:bg-white focus-visible:ring-1 focus-visible:ring-red-400 focus-visible:border-red-300 py-2.5 text-sm transition-colors placeholder:text-gray-400 resize-none"
              />
            </div>
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={sending || uploadingAttachment || !canSend}
              className="h-10 w-10 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 transition-all duration-150 shadow-md hover:shadow-red-200"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 ml-0.5" />
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}