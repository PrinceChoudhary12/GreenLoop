import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ActivityTimeline } from '../components/activity/ActivityTimeline';
import type { ActivityLogItem } from '../types/activity';

const mockActivities: ActivityLogItem[] = [
  {
    id: 1,
    actor_id: 10,
    actor_name: 'Alice Citizen',
    actor_role: 'CITIZEN',
    action: 'REPORT_CREATED',
    entity_type: 'report',
    entity_id: 55,
    target_user_id: 10,
    target_user_name: 'Alice Citizen',
    details: 'Report submitted in PLASTIC category',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    actor_id: 20,
    actor_name: 'Marcus Collector',
    actor_role: 'COLLECTOR',
    action: 'PICKUP_COMPLETED',
    entity_type: 'pickup',
    entity_id: 12,
    target_user_id: 10,
    target_user_name: 'Alice Citizen',
    details: 'Pickup completed and report resolved',
    created_at: new Date().toISOString(),
  },
];

describe('ActivityTimeline Component', () => {
  it('renders timeline items with action, entity, details, and actor', () => {
    render(<ActivityTimeline activities={mockActivities} showActor={true} />);

    expect(screen.getByText('Report Created')).toBeInTheDocument();
    expect(screen.getByText('report #55')).toBeInTheDocument();
    expect(screen.getByText('Report submitted in PLASTIC category')).toBeInTheDocument();

    expect(screen.getByText('Pickup Completed')).toBeInTheDocument();
    expect(screen.getByText('pickup #12')).toBeInTheDocument();
    expect(screen.getByText('Pickup completed and report resolved')).toBeInTheDocument();

    expect(screen.getByText(/Alice Citizen \(CITIZEN\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Marcus Collector \(COLLECTOR\)/i)).toBeInTheDocument();
  });

  it('renders empty message when no activities are present', () => {
    render(<ActivityTimeline activities={[]} emptyMessage="Custom empty message" />);
    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('renders loading state when loading is true', () => {
    render(<ActivityTimeline activities={[]} loading={true} />);
    expect(screen.getByText('Loading activity history...')).toBeInTheDocument();
  });
});
