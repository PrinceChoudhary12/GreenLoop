import type {
  ConversationItem,
  ConversationListResponse,
  MessageItem,
  MessageListResponse,
  UnreadMessageCountResponse,
} from '../types/messaging';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function handleResponse<T>(response: Response, defaultErrorMsg: string): Promise<T> {
  if (!response.ok) {
    let errorMsg = defaultErrorMsg;
    try {
      const data = await response.json();
      if (data?.error?.message) {
        errorMsg = data.error.message;
      } else if (data?.detail) {
        errorMsg = typeof data.detail === 'string' ? data.detail : data.detail[0]?.msg || defaultErrorMsg;
      } else if (data?.message) {
        errorMsg = data.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export const messagingService = {
  async fetchConversations(token: string): Promise<ConversationListResponse> {
    const response = await fetch(`${API_BASE}/api/v1/messaging/conversations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<ConversationListResponse>(response, 'Failed to fetch conversations.');
  },

  async createConversation(
    token: string,
    payload: {
      recipient_id: number;
      entity_type?: string;
      entity_id?: number;
      title?: string;
      initial_message?: string;
    },
  ): Promise<ConversationItem> {
    const response = await fetch(`${API_BASE}/api/v1/messaging/conversations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<ConversationItem>(response, 'Failed to initiate conversation.');
  },

  async fetchMessages(
    token: string,
    conversationId: number,
    skip = 0,
    limit = 50,
  ): Promise<MessageListResponse> {
    const response = await fetch(
      `${API_BASE}/api/v1/messaging/conversations/${conversationId}/messages?skip=${skip}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );
    return handleResponse<MessageListResponse>(response, 'Failed to fetch message history.');
  },

  async sendMessage(token: string, conversationId: number, body: string): Promise<MessageItem> {
    const response = await fetch(
      `${API_BASE}/api/v1/messaging/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ body }),
      },
    );
    return handleResponse<MessageItem>(response, 'Failed to send message.');
  },

  async markAsRead(token: string, conversationId: number): Promise<{ success: boolean }> {
    const response = await fetch(
      `${API_BASE}/api/v1/messaging/conversations/${conversationId}/read`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );
    return handleResponse<{ success: boolean }>(response, 'Failed to mark conversation as read.');
  },

  async fetchUnreadCount(token: string): Promise<UnreadMessageCountResponse> {
    const response = await fetch(`${API_BASE}/api/v1/messaging/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<UnreadMessageCountResponse>(
      response,
      'Failed to fetch unread message count.',
    );
  },
};
