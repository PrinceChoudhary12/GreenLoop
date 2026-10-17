import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  ArrowLeft,
  Loader2,
  AlertCircle,
  User as UserIcon,
  CheckCheck,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { messagingService } from '../../services/messagingService';
import type { ConversationItem, MessageItem } from '../../types/messaging';
import './MessagesPage.css';

function getInitials(name?: string): string {
  if (!name) return 'GL';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(isoDate?: string): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export const MessagesPage: React.FC = () => {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [composerText, setComposerText] = useState<string>('');

  const [loadingConvs, setLoadingConvs] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New Chat Modal state
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [recipientIdInput, setRecipientIdInput] = useState<string>('');
  const [initialMsgInput, setInitialMsgInput] = useState<string>('');
  const [creatingChat, setCreatingChat] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await messagingService.fetchConversations(token);
      setConversations(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load conversations.');
    } finally {
      setLoadingConvs(false);
    }
  }, [token]);

  const loadMessages = useCallback(async (convId: number) => {
    if (!token) return;
    setLoadingMessages(true);
    try {
      const res = await messagingService.fetchMessages(token, convId, 0, 50);
      setMessages(res.items);
      // Mark as read in state
      setConversations(prev =>
        prev.map(c => (c.id === convId ? { ...c, unread_count: 0 } : c)),
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Active conversation message polling (every 8s)
  useEffect(() => {
    if (!activeConvId || !token) return;
    loadMessages(activeConvId);

    const interval = setInterval(() => {
      messagingService
        .fetchMessages(token, activeConvId, 0, 50)
        .then(res => setMessages(res.items))
        .catch(() => {});
    }, 8000);

    return () => clearInterval(interval);
  }, [activeConvId, token, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectConv = (convId: number) => {
    setActiveConvId(convId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = composerText.trim();
    if (!token || !activeConvId || !body || sending) return;

    setSending(true);
    try {
      const newMsg = await messagingService.sendMessage(token, activeConvId, body);
      setMessages(prev => [...prev, newMsg]);
      setComposerText('');
      // Update snippet in conversation list
      setConversations(prev =>
        prev.map(c =>
          c.id === activeConvId
            ? { ...c, last_message: newMsg, updated_at: newMsg.created_at }
            : c,
        ),
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const rId = parseInt(recipientIdInput, 10);
    if (!token || isNaN(rId) || rId <= 0 || creatingChat) return;

    setCreatingChat(true);
    setModalError(null);
    try {
      const conv = await messagingService.createConversation(token, {
        recipient_id: rId,
        initial_message: initialMsgInput.trim() || undefined,
      });
      setShowNewModal(false);
      setRecipientIdInput('');
      setInitialMsgInput('');
      await loadConversations();
      setActiveConvId(conv.id);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to initiate conversation.');
    } finally {
      setCreatingChat(false);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const partner = activeConv?.participants.find(p => p.user_id !== user?.id);

  return (
    <div className={`messages-page-wrapper`}>
      <div className="messages-header-top" style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Direct Messages
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
              Secure messaging with platform collectors, citizens, and administrators.
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowNewModal(true)}
            aria-label="Start new conversation"
          >
            <Plus size={16} style={{ marginRight: '4px' }} />
            New Chat
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }} role="alert">
          <AlertCircle size={16} style={{ marginRight: '6px' }} />
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)} style={{ marginLeft: 'auto' }}>
            Dismiss
          </button>
        </div>
      )}

      <div className={`messages-container ${activeConvId ? 'has-active-chat' : ''}`}>
        {/* Sidebar Conversations List */}
        <div className="messages-sidebar">
          <div className="messages-sidebar-header">
            <div className="messages-sidebar-title">
              <MessageSquare size={18} />
              <span>Conversations ({conversations.length})</span>
            </div>
          </div>

          <div className="messages-conv-list" role="list">
            {loadingConvs ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                No active conversations yet. Click "New Chat" to start messaging.
              </div>
            ) : (
              conversations.map(conv => {
                const pUser = conv.participants.find(p => p.user_id !== user?.id);
                const isActive = conv.id === activeConvId;

                return (
                  <div
                    key={conv.id}
                    className={`conv-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectConv(conv.id)}
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') handleSelectConv(conv.id);
                    }}
                    data-testid="conversation-item"
                  >
                    <div className="conv-avatar">{getInitials(pUser?.name || conv.title || 'Chat')}</div>
                    <div className="conv-info">
                      <div className="conv-header-line">
                        <span className="conv-name">{pUser?.name || conv.title || 'Direct Chat'}</span>
                        <span className="conv-time">{formatTime(conv.updated_at)}</span>
                      </div>
                      <div className="conv-snippet">
                        {conv.last_message?.body || 'No messages yet.'}
                      </div>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="conv-unread-badge">{conv.unread_count}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Conversation Stream */}
        <div className="messages-main">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="messages-chat-header">
                <div className="chat-header-info">
                  <button
                    className="btn btn-ghost btn-sm mobile-back-btn"
                    onClick={() => setActiveConvId(null)}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="conv-avatar" style={{ width: 36, height: 36, fontSize: '0.8125rem' }}>
                    {getInitials(partner?.name || activeConv.title || 'Chat')}
                  </div>
                  <div>
                    <div className="chat-partner-name">{partner?.name || activeConv.title || 'Direct Conversation'}</div>
                    {partner?.role && (
                      <span className="chat-partner-role">{partner.role}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Stream */}
              <div className="messages-stream" role="log" aria-label="Message stream">
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Loading message history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="messages-empty-pane">
                    <MessageSquare size={36} />
                    <p>No messages in this conversation yet. Send a message to start chatting.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`message-bubble-wrap ${isMine ? 'sent' : 'received'}`}
                        data-testid="message-bubble"
                      >
                        {!isMine && <span className="message-sender-tag">{msg.sender_name}</span>}
                        <div className="message-bubble">
                          <div>{msg.body}</div>
                          <div className="message-meta">
                            <span>{formatTime(msg.created_at)}</span>
                            {isMine && (
                              <span>
                                {msg.is_read ? <CheckCheck size={12} /> : <Check size={12} />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <form className="messages-composer" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="composer-input"
                  placeholder="Type a message..."
                  value={composerText}
                  onChange={e => setComposerText(e.target.value)}
                  disabled={sending}
                  aria-label="Type your message"
                />
                <button
                  type="submit"
                  className="composer-send-btn"
                  disabled={sending || !composerText.trim()}
                  aria-label="Send message"
                >
                  {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                </button>
              </form>
            </>
          ) : (
            <div className="messages-empty-pane">
              <MessageSquare size={48} style={{ marginBottom: '1rem', color: '#94a3b8' }} />
              <h3>Select a Conversation</h3>
              <p>Choose an existing thread from the left or click "New Chat" to initiate messaging.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewModal && (
        <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="new-chat-modal-title">
          <div className="profile-modal" style={{ maxWidth: 450 }}>
            <div className="profile-modal__header">
              <h3 id="new-chat-modal-title">
                <UserIcon size={18} style={{ marginRight: '6px' }} />
                Initiate Direct Conversation
              </h3>
              <button
                type="button"
                className="profile-modal__close"
                onClick={() => setShowNewModal(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateChat} className="profile-modal__body">
              {modalError && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                  {modalError}
                </div>
              )}

              <div className="profile-form-field">
                <label className="profile-form-label" htmlFor="recipient-id">Recipient User ID</label>
                <input
                  id="recipient-id"
                  type="number"
                  className="profile-form-input"
                  placeholder="Enter User ID (e.g. 2 for Collector)"
                  value={recipientIdInput}
                  onChange={e => setRecipientIdInput(e.target.value)}
                  required
                />
                <span className="profile-form-hint">
                  {user?.role === 'CITIZEN'
                    ? 'Citizens can message active Collectors or Admins.'
                    : user?.role === 'COLLECTOR'
                    ? 'Collectors can message Citizens or Admins.'
                    : 'Administrators can message any user.'}
                </span>
              </div>

              <div className="profile-form-field">
                <label className="profile-form-label" htmlFor="initial-msg">Initial Message (Optional)</label>
                <textarea
                  id="initial-msg"
                  className="profile-form-input"
                  rows={3}
                  placeholder="Type an optional initial message..."
                  value={initialMsgInput}
                  onChange={e => setInitialMsgInput(e.target.value)}
                />
              </div>

              <div className="profile-modal__actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowNewModal(false)}
                  disabled={creatingChat}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={creatingChat || !recipientIdInput}>
                  {creatingChat ? 'Starting...' : 'Start Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
