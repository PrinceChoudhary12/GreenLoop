import type { ReportPriority, ReportStatus, WasteCategory } from './report';

export type PickupStatus =
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PickupReportSummary {
  id: number;
  category: WasteCategory;
  description: string;
  location: string;
  priority: ReportPriority;
  status: ReportStatus;
  image_path?: string | null;
}

export interface PickupUserSummary {
  id: number;
  name: string;
  email: string;
}

export interface Pickup {
  id: number;
  report_id: number;
  user_id: number;
  collector_id?: number | null;
  status: PickupStatus;
  scheduled_date?: string | null;
  time_slot?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  cancellation_reason?: string | null;
  cancelled_by_id?: number | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  report?: PickupReportSummary | null;
  user?: PickupUserSummary | null;
  collector?: PickupUserSummary | null;
  cancelled_by?: PickupUserSummary | null;
}

export interface PickupCreatePayload {
  report_id: number;
  contact_phone?: string;
  notes?: string;
  preferred_date?: string;
  preferred_time_slot?: string;
}

export interface PickupSchedulePayload {
  scheduled_date: string;
  time_slot: string;
  collector_id?: number;
  notes?: string;
}

export interface PickupAssignPayload {
  collector_id: number;
}

export interface PickupCancelPayload {
  cancellation_reason: string;
}
