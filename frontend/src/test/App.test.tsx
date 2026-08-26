import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import * as api from '../services/api';

describe('App Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

    render(<App />);
    expect(screen.getByText(/GreenLoop/i)).toBeInTheDocument();
    expect(screen.getByText(/Milestone 01 — Master Architecture & Foundation/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Operational/i)).toBeInTheDocument();
    });
  });

  it('renders error notice if backend health check fails', async () => {
    vi.spyOn(api, 'fetchHealth').mockRejectedValue(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Backend Connection Notice/i)).toBeInTheDocument();
    });
  });
});
