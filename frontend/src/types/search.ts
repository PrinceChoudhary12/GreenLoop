export interface SearchResultItem {
  id: string;
  entity_type: 'report' | 'pickup' | 'navigation';
  entity_id?: number | null;
  title: string;
  subtitle?: string | null;
  category?: string | null;
  status?: string | null;
  target_url: string;
  created_at?: string | null;
}

export interface GlobalSearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
}
