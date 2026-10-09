/** Recycling center domain types. */

export interface RecyclingCenter {
  id: number;
  name: string;
  description?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  /** Comma-separated waste category string, e.g. "PLASTIC,GLASS,METAL" */
  accepted_categories?: string | null;
  opening_hours?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecyclingCenterCreate {
  name: string;
  description?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  accepted_categories?: string;
  opening_hours?: string;
  is_active?: boolean;
}

export interface RecyclingCenterUpdate extends Partial<RecyclingCenterCreate> {}

/** Parse accepted_categories CSV to a sorted list */
export function parseCategoryList(csv?: string | null): string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}
