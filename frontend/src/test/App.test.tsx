import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import * as api from '../services/api';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

function renderApplication(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('App Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('renders application title and loading state initially', async () => {
    vi.spyOn(api, 'fetchHealth').mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                status: 'healthy',
                app_name: 'GreenLoop',
                version: '1.0.0',
                environment: 'development',
                components: {
                  database: {
                    status: 'healthy',
                    details: 'Database connection active',
                  },
                },
              }),
            10
          )
        )
    );

    renderApplication();
    expect(screen.getAllByText(/GreenLoop/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Milestone 01 — Master Architecture & Foundation/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Operational/i)).toBeInTheDocument();
    });
  });

  it('renders error notice if backend health check fails', async () => {
    vi.spyOn(api, 'fetchHealth').mockRejectedValue(new Error('Network error'));

    renderApplication();

    await waitFor(() => {
      expect(screen.getByText(/Backend Connection Notice/i)).toBeInTheDocument();
    });
  });
});
