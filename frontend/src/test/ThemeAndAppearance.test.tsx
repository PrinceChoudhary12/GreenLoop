import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { useTheme } from '../context/useTheme';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { AuthContext } from '../context/useAuth';
import type { User } from '../types/auth';

const mockCitizen: User = {
  id: 1,
  name: 'Jane Citizen',
  email: 'jane@greenloop.local',
  role: 'CITIZEN',
  is_active: true,
  created_at: '2026-01-15T10:00:00Z',
};

// Test consumer helper component
const TestThemeConsumer: React.FC = () => {
  const {
    preferences,
    resolvedTheme,
    setTheme,
    setWallpaper,
    setDensity,
    setAnimation,
    setBorderRadius,
    setSidebarMode,
    resetToDefaults,
  } = useTheme();

  return (
    <div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <div data-testid="pref-theme">{preferences.theme}</div>
      <div data-testid="pref-wallpaper">{preferences.wallpaper}</div>
      <div data-testid="pref-density">{preferences.density}</div>
      <div data-testid="pref-animation">{preferences.animation}</div>
      <div data-testid="pref-radius">{preferences.borderRadius}</div>
      <div data-testid="pref-sidebar">{preferences.sidebarMode}</div>

      <button onClick={() => setTheme('forest')}>Set Forest</button>
      <button onClick={() => setTheme('ocean')}>Set Ocean</button>
      <button onClick={() => setTheme('midnight')}>Set Midnight</button>
      <button onClick={() => setTheme('warm-earth')}>Set Warm Earth</button>
      <button onClick={() => setTheme('high-contrast')}>Set High Contrast</button>
      <button onClick={() => setTheme('system')}>Set System</button>
      <button onClick={() => setWallpaper('eco-pattern')}>Set Eco Wallpaper</button>
      <button onClick={() => setDensity('compact')}>Set Compact</button>
      <button onClick={() => setAnimation('reduced')}>Set Reduced Motion</button>
      <button onClick={() => setBorderRadius('rounded')}>Set Rounded</button>
      <button onClick={() => setSidebarMode('collapsed')}>Set Collapsed</button>
      <button onClick={resetToDefaults}>Reset</button>
    </div>
  );
};

describe('Theme and Appearance System', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-wallpaper');
    document.documentElement.removeAttribute('data-density');
    document.documentElement.removeAttribute('data-animation');
    document.documentElement.removeAttribute('data-radius');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads default preferences when localStorage is empty', () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('pref-theme')).toHaveTextContent('light');
    expect(screen.getByTestId('pref-wallpaper')).toHaveTextContent('none');
    expect(screen.getByTestId('pref-density')).toHaveTextContent('comfortable');
    expect(screen.getByTestId('pref-animation')).toHaveTextContent('full');
    expect(screen.getByTestId('pref-radius')).toHaveTextContent('medium');
    expect(screen.getByTestId('pref-sidebar')).toHaveTextContent('expanded');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('handles corrupted localStorage gracefully without crashing', () => {
    localStorage.setItem('greenloop_preferences', 'invalid-json-structure-}{');

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('pref-theme')).toHaveTextContent('light');
  });

  it('updates theme across multiple themes and sets document attributes', () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    // Switch to Forest
    fireEvent.click(screen.getByText('Set Forest'));
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('forest');
    expect(document.documentElement.getAttribute('data-theme')).toBe('forest');

    // Switch to Ocean
    fireEvent.click(screen.getByText('Set Ocean'));
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('ocean');
    expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');

    // Switch to Midnight
    fireEvent.click(screen.getByText('Set Midnight'));
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('midnight');
    expect(document.documentElement.getAttribute('data-theme')).toBe('midnight');

    // Switch to High Contrast
    fireEvent.click(screen.getByText('Set High Contrast'));
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('high-contrast');
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');

    // Verify localStorage has persisted
    const saved = JSON.parse(localStorage.getItem('greenloop_preferences') || '{}');
    expect(saved.theme).toBe('high-contrast');
  });

  it('updates wallpaper, density, animation, and border radius correctly', () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Set Eco Wallpaper'));
    expect(screen.getByTestId('pref-wallpaper')).toHaveTextContent('eco-pattern');
    expect(document.documentElement.getAttribute('data-wallpaper')).toBe('eco-pattern');

    fireEvent.click(screen.getByText('Set Compact'));
    expect(screen.getByTestId('pref-density')).toHaveTextContent('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');

    fireEvent.click(screen.getByText('Set Reduced Motion'));
    expect(screen.getByTestId('pref-animation')).toHaveTextContent('reduced');
    expect(document.documentElement.getAttribute('data-animation')).toBe('reduced');

    fireEvent.click(screen.getByText('Set Rounded'));
    expect(screen.getByTestId('pref-radius')).toHaveTextContent('rounded');
    expect(document.documentElement.getAttribute('data-radius')).toBe('rounded');

    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByTestId('pref-theme')).toHaveTextContent('light');
    expect(screen.getByTestId('pref-wallpaper')).toHaveTextContent('none');
  });

  it('renders SettingsPage Appearance Studio and switches themes via UI cards', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthContext.Provider
            value={{
              user: mockCitizen,
              token: 'fake-token',
              isAuthenticated: true,
              isLoading: false,
              login: vi.fn(),
              logout: vi.fn(),
            }}
          >
            <SettingsPage />
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Platform Settings & Appearance Studio/i)).toBeInTheDocument();
    expect(screen.getByText('Deep Forest')).toBeInTheDocument();
    expect(screen.getByText('Ocean Marine')).toBeInTheDocument();
    expect(screen.getByText('Midnight Obsidian')).toBeInTheDocument();

    // Click Deep Forest theme card
    const forestCard = screen.getByText('Deep Forest').closest('button');
    if (forestCard) fireEvent.click(forestCard);

    expect(document.documentElement.getAttribute('data-theme')).toBe('forest');

    // Click Compact density button
    const compactBtn = screen.getByText('Compact');
    fireEvent.click(compactBtn);
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });
});
