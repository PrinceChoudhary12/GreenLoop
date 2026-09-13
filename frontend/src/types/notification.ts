/**
 * Notification TypeScript type definitions.
 */

export type NotificationType =
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
  | 'SYSTEM_ALERT';

export interface NotificationItem {
  id: number;
  user_id: number;
  actor_id?: number | null;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: number | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unread_count: number;
}

export interface NotificationCountResponse {
  unread_count: number;
}
