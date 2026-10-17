import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { AuthContext } from '../context/useAuth';
import { ThemeProvider } from '../context/ThemeContext';
import { authService } from '../services/authService';
import type { User } from '../types/auth';

vi.mock('../services/authService', () => ({
  authService: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

const mockUser: User = {
  id: 10,
  name: 'Alex Eco',
  email: 'alex@greenloop.local',
  role: 'CITIZEN',
  is_active: true,
  created_at: '2026-02-01T12:00:00Z',
};

describe('Platform UI 2.0 — Phase 3 Profile & Security Page', () => {
  const updateUserMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderProfilePage() {
    return render(
      <MemoryRouter initialEntries={['/profile']}>
        <ThemeProvider>
          <AuthContext.Provider
            value={{
              user: mockUser,
              token: 'test-token',
              isAuthenticated: true,
              isLoading: false,
              login: vi.fn(),
              logout: vi.fn(),
              updateUser: updateUserMock,
            }}
          >
            <ProfilePage />
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  it('renders profile details correctly for authenticated user', () => {
    renderProfilePage();

    expect(screen.getAllByText('Alex Eco').length).toBeGreaterThan(0);
    expect(screen.getAllByText('alex@greenloop.local').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CITIZEN').length).toBeGreaterThan(0);
  });

  it('allows opening change password modal and changing password', async () => {
    vi.mocked(authService.changePassword).mockResolvedValueOnce();

    const { container } = renderProfilePage();

    // Click Change Password trigger button using ID
    const triggerBtn = container.querySelector('#profile-change-password-btn');
    expect(triggerBtn).not.toBeNull();
    fireEvent.click(triggerBtn!);

    expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument();

    const currentPwInput = screen.getByLabelText('Current Password');
    const newPwInput = screen.getByLabelText('New Password');
    const confirmPwInput = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPwInput, { target: { value: 'OldSecret123' } });
    fireEvent.change(newPwInput, { target: { value: 'NewSecret123' } });
    fireEvent.change(confirmPwInput, { target: { value: 'NewSecret123' } });

    // Submit modal form
    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn).not.toBeNull();
    fireEvent.click(submitBtn!);

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith('test-token', {
        current_password: 'OldSecret123',
        new_password: 'NewSecret123',
        new_password_confirm: 'NewSecret123',
      });
    });
  });

  it('handles profile name editing and calls updateUser', async () => {
    const updatedUser: User = { ...mockUser, name: 'Alex Green Eco' };
    vi.mocked(authService.updateProfile).mockResolvedValueOnce(updatedUser);

    renderProfilePage();

    const editBtn = screen.getByRole('button', { name: 'Edit' });
    fireEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue('Alex Eco');
    fireEvent.change(nameInput, { target: { value: 'Alex Green Eco' } });

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(authService.updateProfile).toHaveBeenCalledWith('test-token', {
        name: 'Alex Green Eco',
      });
      expect(updateUserMock).toHaveBeenCalledWith(updatedUser);
    });
  });
});
