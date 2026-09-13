import type { AdminMetrics, AdminReport, AdminUser, CollectorLookupItem } from '../types/admin';
import type { ReportStatus } from '../types/report';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const adminService = {
  async getMetrics(token: string): Promise<AdminMetrics> {
    const response = await fetch(`${API_BASE}/api/v1/admin/metrics`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch admin system metrics.');
    }
    return response.json();
  },

  async getUsers(
    token: string,
    params: {
      role?: string;
      is_active?: boolean;
      search?: string;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<AdminUser[]> {
    const searchParams = new URLSearchParams();
    if (params.role) searchParams.append('role', params.role);
    if (params.is_active !== undefined) searchParams.append('is_active', String(params.is_active));
    if (params.search) searchParams.append('search', params.search);
    if (params.skip !== undefined) searchParams.append('skip', String(params.skip));
    if (params.limit !== undefined) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString();
    const url = `${API_BASE}/api/v1/admin/users${qs ? `?${qs}` : ''}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user directory.');
    }
    return response.json();
  },

  async getCollectors(token: string): Promise<CollectorLookupItem[]> {
    const response = await fetch(`${API_BASE}/api/v1/admin/collectors`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch collectors lookup list.');
    }
    return response.json();
  },

  async updateUserStatus(token: string, userId: number, isActive: boolean): Promise<AdminUser> {
    const response = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ is_active: isActive }),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || 'Failed to update user active status.';
      throw new Error(msg);
    }
    return data as AdminUser;
  },

  async getReports(
    token: string,
    params: {
      status?: string;
      category?: string;
      priority?: string;
      collector_id?: number;
      search?: string;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<AdminReport[]> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    if (params.category) searchParams.append('category', params.category);
    if (params.priority) searchParams.append('priority', params.priority);
    if (params.collector_id !== undefined) searchParams.append('collector_id', String(params.collector_id));
    if (params.search) searchParams.append('search', params.search);
    if (params.skip !== undefined) searchParams.append('skip', String(params.skip));
    if (params.limit !== undefined) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString();
    const url = `${API_BASE}/api/v1/admin/reports${qs ? `?${qs}` : ''}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch platform waste reports.');
    }
    return response.json();
  },

  async assignReport(token: string, reportId: number, collectorId: number): Promise<AdminReport> {
    const response = await fetch(`${API_BASE}/api/v1/admin/reports/${reportId}/assign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ collector_id: collectorId }),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || 'Failed to assign report to collector.';
      throw new Error(msg);
    }
    return data as AdminReport;
  },

  async updateReportStatus(token: string, reportId: number, status: ReportStatus): Promise<AdminReport> {
    const response = await fetch(`${API_BASE}/api/v1/admin/reports/${reportId}/status`, {
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
    return data as AdminReport;
  },
};
