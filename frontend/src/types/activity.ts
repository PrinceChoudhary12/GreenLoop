/**
 * Activity log TypeScript type definitions.
 */

export type ActivityAction =
  | 'REPORT_CREATED'
  | 'REPORT_CLAIMED'
  | 'REPORT_STATUS_UPDATED'
  | 'PICKUP_REQUESTED'
  | 'PICKUP_SCHEDULED'
  | 'PICKUP_ASSIGNED'
  | 'PICKUP_ACCEPTED'
  | 'PICKUP_IN_PROGRESS'
  | 'PICKUP_COMPLETED'
  | 'PICKUP_CANCELLED'
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED';

export interface ActivityLogItem {
  id: number;
  actor_id?: number | null;
  actor_name?: string | null;
  actor_role?: string | null;
  action: ActivityAction;
  entity_type: string;
  entity_id: number;
  target_user_id?: number | null;
  target_user_name?: string | null;
  details?: string | null;
  created_at: string;
}

export interface ActivityListResponse {
  items: ActivityLogItem[];
  total: number;
}
