import type { WasteReport, WasteReportCreatePayload } from '../types/report';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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
    const msg = data?.error?.message || 'Request failed. Please try again.';
    throw new Error(msg);
  }
  return data as T;
}

export const reportService = {
  async createReport(token: string, payload: WasteReportCreatePayload): Promise<WasteReport> {
    const formData = new FormData();
    formData.append('category', payload.category);
    formData.append('description', payload.description);
    formData.append('location', payload.location);
    formData.append('priority', payload.priority);
    if (payload.image) {
      formData.append('image', payload.image);
    }
    const response = await fetch(`${API_BASE}/api/v1/reports`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || 'Failed to submit report.';
      throw new Error(msg);
    }
    return data as WasteReport;
  },

  async getReports(token: string): Promise<WasteReport[]> {
    return apiFetch<WasteReport[]>(`${API_BASE}/api/v1/reports`, token);
  },

  async getReport(token: string, id: number): Promise<WasteReport> {
    return apiFetch<WasteReport>(`${API_BASE}/api/v1/reports/${id}`, token);
  },
};
