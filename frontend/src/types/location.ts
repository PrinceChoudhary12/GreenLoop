export interface UserLocationResponse {
  user_id: number;
  latitude?: number | null;
  longitude?: number | null;
  is_sharing_active: boolean;
  updated_at: string;
  is_stale: boolean;
}

export interface MapPointItem {
  id: string;
  point_type: 'report' | 'pickup' | 'collector';
  entity_id: number;
  title: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  status?: string | null;
  updated_at: string;
  is_live: boolean;
  is_stale: boolean;
}

export interface MapDataResponse {
  points: MapPointItem[];
  total_points: number;
  user_location?: UserLocationResponse | null;
}
