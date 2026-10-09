"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  ArrowLeft,
} from "lucide-react";
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
  lastRepliedBy?: "user" | "artist" | "admin";
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

export default function ArtistSupportChatPage() {
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

  const getArtistToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("artist_token") : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  useEffect(() => {
    const token = getArtistToken();
    if (!token) {
      router.replace("/artist/auth/login?redirect=/artist/support/chat");
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
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading your conversation."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [router]);

  const handleSendMessage = async () => {
    const token = getArtistToken();
    if (!token) {
      router.replace("/artist/auth/login?redirect=/artist/support/chat");
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
    } catch (err: unknown) {
      setSendError(
        err instanceof Error ? err.message : "Something went wrong while sending your message."
      );
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
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Failed to upload attachment.");
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
  const isOwnMessage = (role?: string) => role === "user" || role === "artist";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex flex-col">
      <header className="bg-white border-b border-pink-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/artist/dashboard"
            className="inline-flex items-center text-sm text-gray-600 hover:text-pink-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Link>
          <div className="ml-auto text-sm font-medium text-pink-800">Artist Support</div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-2xl mx-auto sm:my-4 sm:rounded-2xl sm:shadow-xl overflow-hidden bg-white border border-pink-100">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 bg-white border-b border-pink-100 sticky top-0 z-20">
          <div className="relative flex-shrink-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-md">
              <HeadphonesIcon className="h-5 w-5 text-white" />
            </div>
            {!isResolved && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold text-gray-900 leading-tight truncate">
              Ahibi Support Team
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
        </div>

        <div
          className={`flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-1 bg-[#faf5f7] ${footerHeight}`}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
              <p className="text-sm font-medium">Loading conversation…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="font-semibold text-gray-900">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 text-xs font-medium text-pink-600 hover:text-pink-700"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </button>
            </div>
          ) : !conversation || conversation.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
              <MessageCircle className="h-10 w-10 text-pink-500" />
              <div>
                <p className="font-semibold text-base text-gray-900 mb-1">Need help with your artist account?</p>
                <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                  Send a message about bookings, profile, payments, or approvals and our team will respond soon.
                </p>
              </div>
            </div>
          ) : (
            <>
              {conversation.messages.map((msg, idx) => {
                const isUser = isOwnMessage(msg.senderRole);
                const showDate =
                  idx === 0 ||
                  formatDate(conversation.messages[idx - 1].createdAt) !== formatDate(msg.createdAt);
                const nextMsg = conversation.messages[idx + 1];
                const isLastInGroup = !nextMsg || nextMsg.senderRole !== msg.senderRole;

                return (
                  <div key={msg._id || idx}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="text-[11px] font-medium text-gray-500 bg-white/90 px-3 py-1 rounded-full shadow-sm border border-pink-100">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-2" : "mb-0.5"}`}>
                      <div
                        className={`max-w-[75%] sm:max-w-[65%] px-3 py-2 text-sm shadow-sm ${
                          isUser
                            ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl"
                            : "bg-white text-gray-800 rounded-2xl"
                        }`}
                      >
                        {msg.message ? (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                        ) : null}
                        <MessageAttachments attachments={msg.attachments} onDarkBubble={isUser} />

                        <div className={`flex items-center justify-end gap-1 mt-1 ${isUser ? "text-pink-100" : "text-gray-400"}`}>
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

        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-pink-100 px-3 sm:px-4 pt-3 pb-4">
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
              className="h-10 w-10 rounded-full flex-shrink-0 border-pink-200"
              aria-label="Attach file"
            >
              {uploadingAttachment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1">
              <Textarea
                placeholder={isResolved ? "Send a message to reopen this conversation…" : "Type a message…"}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={2}
                className="w-full min-h-[44px] max-h-32 rounded-2xl border-pink-200 bg-pink-50/50 focus:bg-white py-2.5 text-sm resize-none"
              />
            </div>
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={sending || uploadingAttachment || !canSend}
              className="h-10 w-10 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 flex-shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
