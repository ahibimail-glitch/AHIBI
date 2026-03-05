'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '@/config';
import { Send, Trash2, Users } from 'lucide-react';

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

export default function LiveChat({ streamId, userId, userName, userEmail, isAdmin = false }: LiveChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState<{ [key: string]: string }>({});
  const [onlineCount, setOnlineCount] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.parentElement;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
        setShowScrollButton(false);
      }
    }
  };

  const handleScroll = () => {
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.parentElement;
      if (chatContainer) {
        const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
        setShowScrollButton(!isNearBottom);
      }
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/health`);
      const data = await response.json();
      console.log('Server health check:', data);
      return data.status === 'OK';
    } catch (error) {
      console.error('Server health check failed:', error);
      return false;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, cannot connect to chat');
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    console.log('Connecting to socket at:', baseUrl);
    
    const newSocket = io(`${baseUrl}/livestream-chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat successfully');
      setIsConnected(true);
      newSocket.emit('join-stream', streamId);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from chat, reason:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Chat connection error:', error);
      setIsConnected(false);
      setConnectionError(error.message);
    });

    newSocket.on('joined-stream', (data) => {
      console.log('Joined stream:', data);
      fetchMessages();
    });

    newSocket.on('new-message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('message-deleted', ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, isDeleted: true } : msg
        )
      );
    });

    newSocket.on('user-typing', ({ userId: typingUserId, userName: typingUserName, isTyping: typing }) => {
      if (typingUserId !== userId) {
        setIsTyping((prev) => {
          if (typing) {
            return { ...prev, [typingUserId]: typingUserName };
          } else {
            const newTyping = { ...prev };
            delete newTyping[typingUserId];
            return newTyping;
          }
        });
      }
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setIsConnected(false);
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !inputMessage.trim()) return;

    socket.emit('send-message', {
      streamId,
      message: inputMessage.trim()
    });

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
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    handleTyping(true);

    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 1000);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Users className="w-5 h-5" />
            {isConnected && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            )}
          </div>
          <h3 className="font-semibold">Live Chat</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 relative" onScroll={handleScroll}>
        {!isConnected ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Chat is disconnected</p>
            <p className="text-xs mt-1">Trying to reconnect...</p>
            {connectionError && (
              <p className="text-xs mt-2 text-red-500">Error: {connectionError}</p>
            )}
            <div className="mt-4 space-y-2">
              <button
                onClick={() => {
                  if (socket) {
                    socket.connect();
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reconnect
              </button>
              <button
                onClick={testConnection}
                className="w-full px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                Test Server Connection
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex flex-col ${msg.userId === userId ? 'items-end' : 'items-start'}`}
            >
              {!msg.isDeleted ? (
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.userId === userId
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${
                      msg.userId === userId ? 'text-blue-100' : 'text-gray-700'
                    }`}>
                      {msg.userId === userId ? 'You' : msg.userName}
                    </span>
                    <span className={`text-xs ${
                      msg.userId === userId ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className={`text-sm break-words ${
                    msg.userId === userId ? 'text-white' : 'text-gray-800'
                  }`}>
                    {msg.message}
                  </p>
                  {(msg.userId === userId || isAdmin) && (
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      className={`mt-1 text-xs flex items-center gap-1 ${
                        msg.userId === userId ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">Message deleted</div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            title="Scroll to bottom"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>

      {/* Typing Indicator */}
      {Object.keys(isTyping).length > 0 && (
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
          <p className="text-xs text-gray-600 italic">
            {Object.values(isTyping).join(', ')} {Object.keys(isTyping).length === 1 ? 'is' : 'are'} typing...
          </p>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            maxLength={500}
            disabled={!isConnected}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
          <button
            type="submit"
            disabled={!isConnected || !inputMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {inputMessage.length}/500 characters
        </p>
      </form>
    </div>
  );
}
