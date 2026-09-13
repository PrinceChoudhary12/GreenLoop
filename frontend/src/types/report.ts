export type WasteCategory =
  | 'GENERAL'
  | 'PLASTIC'
  | 'PAPER'
  | 'GLASS'
  | 'METAL'
  | 'E_WASTE'
  | 'ORGANIC'
  | 'HAZARDOUS'
  | 'OTHER';

export type ReportStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'RESOLVED';

export type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface WasteReport {
  id: number;
  user_id: number;
  collector_id?: number | null;
  category: WasteCategory;
  description: string;
  location: string;
  image_path?: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  created_at: string;
  updated_at: string;
}

export interface CollectorMetrics {
  available_count: number;
  assigned_count: number;
  active_count: number;
  resolved_count: number;
}

export interface WasteReportCreatePayload {
  category: WasteCategory;
  description: string;
  location: string;
  priority: ReportPriority;
  image?: File | null;
}
