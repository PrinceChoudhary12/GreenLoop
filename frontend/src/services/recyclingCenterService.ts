import type { RecyclingCenter, RecyclingCenterCreate, RecyclingCenterUpdate } from '../types/recyclingCenter';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const ENDPOINT = `${API_BASE}/api/v1/recycling-centers`;

async function apiFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    const msg =
      data?.error?.message || data?.detail || 'Request failed. Please try again.';
    throw new Error(msg);
  }
  return data as T;
}

export interface ListCentersParams {
  search?: string;
  category?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

export const recyclingCenterService = {
  async listCenters(token: string, params: ListCentersParams = {}): Promise<RecyclingCenter[]> {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.category) qs.set('category', params.category);
    if (params.is_active !== undefined) qs.set('is_active', String(params.is_active));
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiFetch<RecyclingCenter[]>(`${ENDPOINT}${query ? '?' + query : ''}`, token);
  },

  async getCenter(token: string, id: number): Promise<RecyclingCenter> {
    return apiFetch<RecyclingCenter>(`${ENDPOINT}/${id}`, token);
  },

  async createCenter(token: string, payload: RecyclingCenterCreate): Promise<RecyclingCenter> {
    return apiFetch<RecyclingCenter>(ENDPOINT, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async updateCenter(token: string, id: number, payload: RecyclingCenterUpdate): Promise<RecyclingCenter> {
    return apiFetch<RecyclingCenter>(`${ENDPOINT}/${id}`, token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async deleteCenter(token: string, id: number): Promise<RecyclingCenter> {
    return apiFetch<RecyclingCenter>(`${ENDPOINT}/${id}`, token, { method: 'DELETE' });
  },
};
