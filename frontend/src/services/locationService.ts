import type { MapDataResponse, UserLocationResponse } from '../types/location';

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
      } else if (data?.detail) {
        errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function fetchMapData(token: string): Promise<MapDataResponse> {
  const response = await fetch(`${API_BASE}/api/v1/location/map-data`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  return handleResponse<MapDataResponse>(response, 'Failed to fetch map data.');
}

export async function fetchMyLocation(token: string): Promise<UserLocationResponse> {
  const response = await fetch(`${API_BASE}/api/v1/location/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  return handleResponse<UserLocationResponse>(response, 'Failed to fetch user location setting.');
}

export async function updateUserLocation(
  token: string,
  latitude: number,
  longitude: number,
  isSharingActive?: boolean,
): Promise<UserLocationResponse> {
  const response = await fetch(`${API_BASE}/api/v1/location/update`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      latitude,
      longitude,
      is_sharing_active: isSharingActive,
    }),
  });
  return handleResponse<UserLocationResponse>(response, 'Failed to update location.');
}

export async function toggleLocationConsent(
  token: string,
  isSharingActive: boolean,
): Promise<UserLocationResponse> {
  const response = await fetch(`${API_BASE}/api/v1/location/consent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      is_sharing_active: isSharingActive,
    }),
  });
  return handleResponse<UserLocationResponse>(response, 'Failed to update location sharing consent.');
}

export const locationService = {
  fetchMapData,
  fetchMyLocation,
  updateUserLocation,
  toggleLocationConsent,
};
