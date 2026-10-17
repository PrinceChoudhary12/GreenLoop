export interface MessageItem {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface ParticipantItem {
  user_id: number;
  name: string;
  role: string;
  email: string;
  last_read_at?: string | null;
}

export interface ConversationItem {
  id: number;
  entity_type?: string | null;
  entity_id?: number | null;
  title?: string | null;
  created_at: string;
  updated_at: string;
  participants: ParticipantItem[];
  last_message?: MessageItem | null;
  unread_count: number;
}

export interface ConversationListResponse {
  items: ConversationItem[];
  total: number;
  total_unread_messages: number;
}

export interface MessageListResponse {
  items: MessageItem[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface UnreadMessageCountResponse {
  unread_count: number;
}
