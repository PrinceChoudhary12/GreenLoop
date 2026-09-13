import type {
  Pickup,
  PickupAssignPayload,
  PickupCancelPayload,
  PickupCreatePayload,
  PickupSchedulePayload,
  PickupStatus,
} from '../types/pickup';

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

export const pickupService = {
  // Citizen methods
  async requestPickup(token: string, payload: PickupCreatePayload): Promise<Pickup> {
    const response = await fetch(`${API_BASE}/api/v1/pickups`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<Pickup>(response, 'Failed to request waste pickup.');
  },

  async getCitizenPickups(token: string, skip = 0, limit = 50): Promise<Pickup[]> {
    const response = await fetch(`${API_BASE}/api/v1/pickups?skip=${skip}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<Pickup[]>(response, 'Failed to fetch your pickup requests.');
  },

  async getPickupDetails(token: string, pickupId: number): Promise<Pickup> {
    const response = await fetch(`${API_BASE}/api/v1/pickups/${pickupId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<Pickup>(response, 'Failed to fetch pickup details.');
  },

  async cancelPickup(token: string, pickupId: number, payload: PickupCancelPayload): Promise<Pickup> {
    const response = await fetch(`${API_BASE}/api/v1/pickups/${pickupId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<Pickup>(response, 'Failed to cancel pickup.');
  },

  // Collector methods
  async getCollectorPickups(
    token: string,
    status?: PickupStatus,
    skip = 0,
    limit = 50
  ): Promise<Pickup[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('skip', String(skip));
    params.append('limit', String(limit));

    const response = await fetch(`${API_BASE}/api/v1/collectors/pickups?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<Pickup[]>(response, 'Failed to fetch assigned pickups.');
  },

  async acceptPickup(token: string, pickupId: number): Promise<Pickup> {
    const response = await fetch(`${API_BASE}/api/v1/collectors/pickups/${pickupId}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<Pickup>(response, 'Failed to accept pickup assignment.');
  },

  async startPickup(token: string, pickupId: number): Promise<Pickup> {
    const response = await fetch(`${API_BASE}/api/v1/collectors/pickups/${pickupId}/start`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<Pickup>(response, 'Failed to start pickup transit.');
  },

  async completePickup(token: string, pickupId: number): Promise<Pickup> {
    const response = await fetch(`${API_BASE}/api/v1/collectors/pickups/${pickupId}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<Pickup>(response, 'Failed to complete pickup.');
  },

  // Admin methods
  async getAdminPickups(
    token: string,
    params: {
      status?: PickupStatus;
      collector_id?: number;
      search?: string;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<Pickup[]> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    if (params.collector_id) searchParams.append('collector_id', String(params.collector_id));
    if (params.search) searchParams.append('search', params.search);
    if (params.skip !== undefined) searchParams.append('skip', String(params.skip));
    if (params.limit !== undefined) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString();
    const url = `${API_BASE}/api/v1/admin/pickups${qs ? `?${qs}` : ''}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<Pickup[]>(response, 'Failed to fetch platform pickups.');
  },

  async schedulePickup(
    token: string,
    pickupId: number,
    payload: PickupSchedulePayload
  ): Promise<Pickup> {
    const response = await fetch(`${API_BASE}/api/v1/admin/pickups/${pickupId}/schedule`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<Pickup>(response, 'Failed to schedule pickup.');
  },

  async assignCollector(
    token: string,
    pickupId: number,
    payload: PickupAssignPayload
  ): Promise<Pickup> {
    const response = await fetch(`${API_BASE}/api/v1/admin/pickups/${pickupId}/assign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<Pickup>(response, 'Failed to assign collector.');
  },
};
