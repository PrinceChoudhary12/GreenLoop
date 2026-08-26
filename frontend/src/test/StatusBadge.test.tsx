import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '../components/common/StatusBadge';

describe('StatusBadge Component', () => {
  it('renders healthy badge with custom label', () => {
    render(<StatusBadge status="healthy" label="Online" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Online');
    expect(badge).toHaveClass('badge-success');
  });

  it('renders connecting/warning status correctly', () => {
    render(<StatusBadge status="connecting" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('badge-warning');
  });

  it('renders error status correctly', () => {
    render(<StatusBadge status="error" label="Failed" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Failed');
    expect(badge).toHaveClass('badge-error');
  });
});
