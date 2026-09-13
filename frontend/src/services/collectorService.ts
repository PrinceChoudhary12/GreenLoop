import type { WasteReport, CollectorMetrics, ReportStatus } from '../types/report';
import type { User } from '../types/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface CollectorMeResponse extends User {
  metrics: CollectorMetrics;
}

export const collectorService = {
  async getCollectorMe(token: string): Promise<CollectorMeResponse> {
    const response = await fetch(`${API_BASE}/api/v1/collectors/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch collector profile.');
    }
    return response.json();
  },

  async getAvailableReports(token: string, skip = 0, limit = 50): Promise<WasteReport[]> {
    const response = await fetch(`${API_BASE}/api/v1/collectors/reports/available?skip=${skip}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch available waste reports.');
    }
    return response.json();
  },

  async getAssignedReports(token: string, skip = 0, limit = 50): Promise<WasteReport[]> {
    const response = await fetch(`${API_BASE}/api/v1/collectors/reports/assigned?skip=${skip}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch assigned waste reports.');
    }
    return response.json();
  },

  async claimReport(token: string, reportId: number): Promise<WasteReport> {
    const response = await fetch(`${API_BASE}/api/v1/collectors/reports/${reportId}/claim`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || 'Failed to claim report.';
      throw new Error(msg);
    }
    return data as WasteReport;
  },

  async updateReportStatus(token: string, reportId: number, status: ReportStatus): Promise<WasteReport> {
    const response = await fetch(`${API_BASE}/api/v1/collectors/reports/${reportId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || 'Failed to update report status.';
      throw new Error(msg);
    }
    return data as WasteReport;
  },
};
