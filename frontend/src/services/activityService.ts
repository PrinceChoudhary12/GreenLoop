import type { ActivityListResponse } from '../types/activity';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function handleResponse<T>(response: Response, defaultErrorMsg: string): Promise<T> {
  if (!response.ok) {
    let errorMsg = defaultErrorMsg;
    try {
      const data = await response.json();
      if (data?.error?.message) {
        errorMsg = data.error.message;
      } else if (data?.message) {
        errorMsg = data.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export const activityService = {
  async fetchCitizenActivity(token: string, skip = 0, limit = 50): Promise<ActivityListResponse> {
    const response = await fetch(`${API_BASE}/api/v1/activity/me?skip=${skip}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<ActivityListResponse>(response, 'Failed to fetch personal activity.');
  },

  async fetchCollectorActivity(token: string, skip = 0, limit = 50): Promise<ActivityListResponse> {
    const response = await fetch(`${API_BASE}/api/v1/activity/collector?skip=${skip}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<ActivityListResponse>(response, 'Failed to fetch collector activity.');
  },

  async fetchAdminActivity(
    token: string,
    filters?: {
      action?: string;
      entity_type?: string;
      actor_id?: number;
      skip?: number;
      limit?: number;
    },
  ): Promise<ActivityListResponse> {
    const params = new URLSearchParams();
    if (filters?.action) params.append('action', filters.action);
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.actor_id !== undefined && filters.actor_id !== null) {
      params.append('actor_id', String(filters.actor_id));
    }
    params.append('skip', String(filters?.skip ?? 0));
    params.append('limit', String(filters?.limit ?? 50));

    const response = await fetch(`${API_BASE}/api/v1/activity/admin?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<ActivityListResponse>(response, 'Failed to fetch platform audit logs.');
  },
};
