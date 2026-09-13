import type { UserRole } from './auth';
import type { ReportPriority, ReportStatus, WasteCategory } from './report';

export interface AdminMetrics {
  total_users: number;
  total_citizens: number;
  total_collectors: number;
  active_users: number;
  deactivated_users: number;
  total_reports: number;
  submitted_reports: number;
  active_reports: number;
  resolved_reports: number;
  rejected_reports: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  reports_count: number;
  assigned_reports_count: number;
}

export interface CollectorLookupItem {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  active_tasks_count: number;
}

export interface AdminReport {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  collector_id?: number | null;
  collector_name?: string | null;
  collector_email?: string | null;
  category: WasteCategory;
  description: string;
  location: string;
  image_path?: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  created_at: string;
  updated_at: string;
}
