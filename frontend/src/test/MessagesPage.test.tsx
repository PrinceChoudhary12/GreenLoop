import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MessagesPage } from '../pages/messages/MessagesPage';
import { AuthContext } from '../context/useAuth';
import { messagingService } from '../services/messagingService';
import type { User } from '../types/auth';
import type { ConversationItem, MessageItem } from '../types/messaging';

const mockCitizenUser: User = {
  id: 10,
  name: 'Alex Eco',
  email: 'alex@greenloop.local',
  role: 'CITIZEN',
  is_active: true,
  created_at: new Date().toISOString(),
};

const mockConversations: ConversationItem[] = [
  {
    id: 1,
    title: 'Chat with Collector Marcus',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    unread_count: 1,
    participants: [
      { user_id: 10, name: 'Alex Eco', role: 'CITIZEN', email: 'alex@greenloop.local' },
      { user_id: 20, name: 'Marcus Collector', role: 'COLLECTOR', email: 'marcus@greenloop.local' },
    ],
    last_message: {
      id: 101,
      conversation_id: 1,
      sender_id: 20,
      sender_name: 'Marcus Collector',
      sender_role: 'COLLECTOR',
      body: 'I am arriving for your plastic waste pickup.',
      is_read: false,
      created_at: new Date().toISOString(),
    },
  },
];

const mockMessages: MessageItem[] = [
  {
    id: 101,
    conversation_id: 1,
    sender_id: 20,
    sender_name: 'Marcus Collector',
    sender_role: 'COLLECTOR',
    body: 'I am arriving for your plastic waste pickup.',
    is_read: false,
    created_at: new Date().toISOString(),
  },
];

describe('MessagesPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function renderMessagesPage() {
    return render(
      <MemoryRouter initialEntries={['/messages']}>
        <AuthContext.Provider
          value={{
            user: mockCitizenUser,
            token: 'test-jwt',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
            updateUser: vi.fn(),
          }}
        >
          <MessagesPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );
  }

  it('renders conversations list and allows selecting a conversation', async () => {
    vi.spyOn(messagingService, 'fetchConversations').mockResolvedValue({
      items: mockConversations,
      total: 1,
      total_unread_messages: 1,
    });
    vi.spyOn(messagingService, 'fetchMessages').mockResolvedValue({
      items: mockMessages,
      total: 1,
      skip: 0,
      limit: 50,
      has_more: false,
    });

    renderMessagesPage();

    await waitFor(() => {
      expect(screen.getByText('Direct Messages')).toBeInTheDocument();
      expect(screen.getByText('Marcus Collector')).toBeInTheDocument();
      expect(screen.getByText(/arriving for your plastic waste/i)).toBeInTheDocument();
    });

    // Click conversation
    const convItem = screen.getByText('Marcus Collector');
    fireEvent.click(convItem);

    await waitFor(() => {
      expect(screen.getByText('I am arriving for your plastic waste pickup.')).toBeInTheDocument();
    });
  });

  it('handles sending a new message in conversation', async () => {
    vi.spyOn(messagingService, 'fetchConversations').mockResolvedValue({
      items: mockConversations,
      total: 1,
      total_unread_messages: 0,
    });
    vi.spyOn(messagingService, 'fetchMessages').mockResolvedValue({
      items: mockMessages,
      total: 1,
      skip: 0,
      limit: 50,
      has_more: false,
    });
    const sendSpy = vi.spyOn(messagingService, 'sendMessage').mockResolvedValue({
      id: 102,
      conversation_id: 1,
      sender_id: 10,
      sender_name: 'Alex Eco',
      sender_role: 'CITIZEN',
      body: 'Thank you Marcus, see you soon!',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    renderMessagesPage();

    await waitFor(() => {
      expect(screen.getByText('Marcus Collector')).toBeInTheDocument();
    });

    // Select conversation
    fireEvent.click(screen.getByText('Marcus Collector'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Thank you Marcus, see you soon!' } });

    const sendBtn = screen.getByRole('button', { name: /send message/i });
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(sendSpy).toHaveBeenCalledWith('test-jwt', 1, 'Thank you Marcus, see you soon!');
    await waitFor(() => {
      expect(screen.getAllByText('Thank you Marcus, see you soon!').length).toBeGreaterThan(0);
    });
  });

  it('allows opening New Chat modal and starting a chat', async () => {
    vi.spyOn(messagingService, 'fetchConversations').mockResolvedValue({
      items: [],
      total: 0,
      total_unread_messages: 0,
    });
    const createSpy = vi.spyOn(messagingService, 'createConversation').mockResolvedValue({
      ...mockConversations[0],
    });

    renderMessagesPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start new conversation/i })).toBeInTheDocument();
    });

    const newChatBtn = screen.getByRole('button', { name: /start new conversation/i });
    fireEvent.click(newChatBtn);

    expect(screen.getByText('Initiate Direct Conversation')).toBeInTheDocument();

    const recipientInput = screen.getByPlaceholderText(/enter user id/i);
    fireEvent.change(recipientInput, { target: { value: '20' } });

    const submitBtn = screen.getByRole('button', { name: 'Start Chat' });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(createSpy).toHaveBeenCalledWith('test-jwt', {
      recipient_id: 20,
      initial_message: undefined,
    });
  });
});
