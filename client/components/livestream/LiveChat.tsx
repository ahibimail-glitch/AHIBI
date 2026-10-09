'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '@/config';
import { Send, Trash2, Users, Smile, ChevronDown, Wifi, WifiOff, User } from 'lucide-react';

interface Message {
  _id: string;
  streamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  timestamp: Date;
  isDeleted: boolean;
}

interface LiveChatProps {
  streamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  isAdmin?: boolean;
}

const EMOJI_CATEGORIES = {
  '😀': ['😀','😂','🤣','😍','🥰','😎','🤩','🥳','😜','🤔','😮','😢','😡','🤯','🥺','😴','🤗','😏','🙄','😬'],
  '👍': ['👍','👎','👏','🙌','🤝','👊','✊','🤜','💪','🫶','❤️','🔥','✨','💯','🎉','🎊','🚀','💎','⭐','🏆'],
  '🐶': ['🐶','🐱','🐭','🐹','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐧','🐦','🦋','🌸','🌺','🍕','🍔','🎮','⚽'],
};

type EmojiCategoryKey = keyof typeof EMOJI_CATEGORIES;

const CATEGORY_LABELS: Record<EmojiCategoryKey, string> = {
  '😀': 'Faces',
  '👍': 'Gestures',
  '🐶': 'Fun',
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-red-100 text-red-600',
    'bg-orange-100 text-orange-600',
    'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700',
    'bg-cyan-100 text-cyan-700',
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-pink-100 text-pink-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function LiveChat({ streamId, userId, userName, userEmail, isAdmin = false }: LiveChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState<{ [key: string]: string }>({});
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<EmojiCategoryKey>('😀');
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      setShowScrollButton(false);
    }
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = messagesContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 120);
    }
  };

  useEffect(() => {
    if (!showScrollButton) scrollToBottom();
  }, [messages]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const newSocket = io(`${baseUrl}/livestream-chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      newSocket.emit('join-stream', streamId);
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('connect_error', (error) => {
      setIsConnected(false);
      setConnectionError(error.message);
    });

    newSocket.on('joined-stream', () => fetchMessages());

    newSocket.on('new-message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('message-deleted', ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) => msg._id === messageId ? { ...msg, isDeleted: true } : msg)
      );
    });

    newSocket.on('user-typing', ({ userId: typingUserId, userName: typingUserName, isTyping: typing }) => {
      if (typingUserId !== userId) {
        setIsTyping((prev) => {
          if (typing) return { ...prev, [typingUserId]: typingUserName };
          const next = { ...prev };
          delete next[typingUserId];
          return next;
        });
      }
    });

    setSocket(newSocket);
    return () => {
      newSocket.emit('leave-stream', streamId);
      newSocket.close();
    };
  }, [streamId, userId]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`livestream/chat/streams/${streamId}/messages?limit=100`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setMessages(data.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !inputMessage.trim()) return;
    socket.emit('send-message', { streamId, message: inputMessage.trim() });
    setInputMessage('');
    handleTyping(false);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socket) return;
    socket.emit('delete-message', { messageId, streamId });
  };

  const handleTyping = (typing: boolean) => {
    if (!socket) return;
    socket.emit('typing', { streamId, isTyping: typing });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    handleTyping(true);
    typingTimeoutRef.current = setTimeout(() => handleTyping(false), 1000);
  };

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? inputMessage.length;
    const end = input.selectionEnd ?? inputMessage.length;
    const newVal = inputMessage.slice(0, start) + emoji + inputMessage.slice(end);
    setInputMessage(newVal);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const typingUsers = Object.values(isTyping);

  return (
    <div
      className="flex flex-col h-full bg-white overflow-hidden"
      style={{
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fff 0%, #f8f9ff 100%)',
          borderBottom: '1px solid #eef0f5',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #f00 0%, #ff4e4e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(255,0,0,0.25)',
            }}
          >
            <User size={16} color="white" />
            {/* <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M21 3H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 10l-5-3 5-3v6z"/>
            </svg> */}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f0f0f', letterSpacing: '-0.01em' }}>Live Chat</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <span
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: isConnected ? '#22c55e' : '#ef4444',
                  display: 'inline-block',
                  boxShadow: isConnected ? '0 0 0 2px rgba(34,197,94,0.25)' : 'none',
                  animation: isConnected ? 'pulse 2s infinite' : 'none',
                }}
              />
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#f3f4f6', borderRadius: 20, padding: '5px 12px',
          }}
        >
          <Users size={13} color="#6b7280" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Watching live</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 0',
          background: '#fff',
          position: 'relative',
          scrollbarWidth: 'thin',
          scrollbarColor: '#e5e7eb transparent',
        }}
      >
        <style>{`
          @keyframes msgSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.5; }
          }
          @keyframes dotBounce {
            0%, 80%, 100% { transform: translateY(0); }
            40%           { transform: translateY(-4px); }
          }
        `}</style>

        {!isConnected ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <WifiOff size={32} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Chat disconnected</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Trying to reconnect…</p>
            {connectionError && (
              <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 16 }}>{connectionError}</p>
            )}
            <button
              onClick={() => socket?.connect()}
              style={{
                padding: '9px 22px',
                background: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(255,0,0,0.3)',
              }}
            >
              Reconnect
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👋</div>
            <p style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Welcome to Live Chat!</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Be the first to say something</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.userId === userId;
            const initials = getInitials(msg.userName);
            const avatarColor = getAvatarColor(msg.userName);
            const showAvatar = !isMe && (idx === 0 || messages[idx - 1].userId !== msg.userId);
            const showName = !isMe && showAvatar;

            return (
              <div
                key={msg._id}
                onMouseEnter={() => setHoveredMsg(msg._id)}
                onMouseLeave={() => setHoveredMsg(null)}
                style={{
                  padding: '2px 16px',
                  animation: 'msgSlideIn 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                {!msg.isDeleted ? (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '88%' }}>
                    {/* Avatar (others only) */}
                    {!isMe && (
                      <div
                        style={{
                          width: 28, height: 28, borderRadius: '50%',
                          flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700,
                          visibility: showAvatar ? 'visible' : 'hidden',
                          background: showAvatar ? undefined : 'transparent',
                        }}
                        className={showAvatar ? avatarColor : ''}
                      >
                        {showAvatar && initials}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {/* Name + time */}
                      {showName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{msg.userName}</span>
                          <span style={{ fontSize: 10, color: '#d1d5db' }}>{formatTime(msg.timestamp)}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Delete button (shown on hover, left of bubble for own msgs) */}
                        {(msg.userId === userId || isAdmin) && hoveredMsg === msg._id && (
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            title="Delete"
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: 4, borderRadius: 6, color: '#9ca3af',
                              order: isMe ? -1 : 1,
                              transition: 'color 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        {/* Bubble */}
                        <div
                          style={{
                            padding: '8px 13px',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isMe
                              ? 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)'
                              : '#f3f4f6',
                            color: isMe ? '#fff' : '#1f2937',
                            fontSize: 13.5,
                            lineHeight: 1.45,
                            wordBreak: 'break-word',
                            boxShadow: isMe
                              ? '0 2px 8px rgba(255,0,0,0.2)'
                              : '0 1px 3px rgba(0,0,0,0.05)',
                            position: 'relative',
                          }}
                        >
                          {!showName && !isMe && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: 10, fontWeight: 700,
                                color: '#9ca3af',
                                marginBottom: 2,
                              }}
                            >
                              {formatTime(msg.timestamp)}
                            </span>
                          )}
                          {isMe && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.6)',
                                marginBottom: 2,
                                textAlign: 'right',
                              }}
                            >
                              {formatTime(msg.timestamp)}
                            </span>
                          )}
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 11, color: '#d1d5db', fontStyle: 'italic',
                      padding: '2px 0',
                    }}
                  >
                    Message deleted
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Scroll to bottom button ── */}
      {showScrollButton && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 8px' }}>
          <button
            onClick={() => scrollToBottom(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 20, padding: '6px 16px',
              fontSize: 12, fontWeight: 600, color: '#374151',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            }}
          >
            <ChevronDown size={14} />
            New messages
          </button>
        </div>
      )}

      {/* ── Typing indicator ── */}
      {typingUsers.length > 0 && (
        <div
          style={{
            padding: '6px 16px',
            background: '#fafafa',
            borderTop: '1px solid #f3f4f6',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#9ca3af',
                  display: 'inline-block',
                  animation: `dotBounce 1.2s ease ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>
            <strong style={{ color: '#6b7280' }}>{typingUsers.join(', ')}</strong>
            {' '}{typingUsers.length === 1 ? 'is' : 'are'} typing…
          </span>
        </div>
      )}

      {/* ── Emoji Picker ── */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          style={{
            position: 'relative',
            background: '#fff',
            borderTop: '1px solid #f3f4f6',
            borderBottom: '1px solid #f3f4f6',
            padding: '10px 12px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
          }}
        >
          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {(Object.keys(EMOJI_CATEGORIES) as EmojiCategoryKey[]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveEmojiCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: activeEmojiCategory === cat ? '#fee2e2' : 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: activeEmojiCategory === cat ? '#dc2626' : '#6b7280',
                  transition: 'all 0.15s',
                }}
              >
                {cat} {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gap: 2,
            }}
          >
            {EMOJI_CATEGORIES[activeEmojiCategory].map((emoji) => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                style={{
                  background: 'none', border: 'none',
                  fontSize: 20, cursor: 'pointer',
                  padding: '5px',
                  borderRadius: 6,
                  transition: 'transform 0.1s, background 0.1s',
                  lineHeight: 1,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.transform = 'scale(1.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div
        style={{
          padding: '12px 14px',
          background: '#fff',
          borderTop: showEmojiPicker ? 'none' : '1px solid #f3f4f6',
        }}
      >
        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex', gap: 8, alignItems: 'center',
            background: '#f8f9fa',
            borderRadius: 24,
            padding: '6px 6px 6px 16px',
            border: '1.5px solid #e5e7eb',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={() => {}}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            placeholder={isConnected ? 'Send a message…' : 'Chat unavailable'}
            maxLength={500}
            disabled={!isConnected}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: 13.5,
              color: '#1f2937',
              fontFamily: 'inherit',
            }}
          />

          {/* Char count (when typing) */}
          {inputMessage.length > 400 && (
            <span style={{ fontSize: 11, color: inputMessage.length > 480 ? '#ef4444' : '#9ca3af', flexShrink: 0 }}>
              {500 - inputMessage.length}
            </span>
          )}

          {/* Emoji toggle */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(v => !v)}
            disabled={!isConnected}
            title="Emoji"
            style={{
              background: showEmojiPicker ? '#fee2e2' : 'none',
              border: 'none', borderRadius: '50%',
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: showEmojiPicker ? '#dc2626' : '#9ca3af',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            <Smile size={18} />
          </button>

          {/* Send */}
          <button
            type="submit"
            disabled={!isConnected || !inputMessage.trim()}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: isConnected && inputMessage.trim()
                ? 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)'
                : '#e5e7eb',
              color: isConnected && inputMessage.trim() ? '#fff' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isConnected && inputMessage.trim() ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              boxShadow: isConnected && inputMessage.trim()
                ? '0 2px 8px rgba(255,0,0,0.3)'
                : 'none',
              transition: 'all 0.2s',
              transform: isConnected && inputMessage.trim() ? 'scale(1)' : 'scale(0.95)',
            }}
          >
            <Send size={15} style={{ transform: 'translateX(1px)' }} />
          </button>
        </form>
      </div>
    </div>
  );
}