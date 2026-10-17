import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  locationService,
  fetchMapData,
  fetchMyLocation,
  updateUserLocation,
  toggleLocationConsent,
} from '../services/locationService';

describe('locationService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches map data with correct endpoint and authorization header', async () => {
    const mockData = {
      points: [
        {
          id: 'report-1',
          point_type: 'report',
          entity_id: 1,
          title: 'Illegal Dumping',
          latitude: 37.7749,
          longitude: -122.4194,
          updated_at: '2026-10-09T08:00:00Z',
          is_live: false,
          is_stale: false,
        },
      ],
      total_points: 1,
      user_location: {
        user_id: 2,
        latitude: 37.7749,
        longitude: -122.4194,
        is_sharing_active: true,
        updated_at: '2026-10-09T08:00:00Z',
        is_stale: false,
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    globalThis.fetch = fetchMock;

    const data = await fetchMapData('test-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/location/map-data');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(data.points).toHaveLength(1);
    expect(data.total_points).toBe(1);
  });

  it('fetches my location setting correctly', async () => {
    const mockUserLoc = {
      user_id: 2,
      latitude: 37.7749,
      longitude: -122.4194,
      is_sharing_active: true,
      updated_at: '2026-10-09T08:00:00Z',
      is_stale: false,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUserLoc,
    });
    globalThis.fetch = fetchMock;

    const data = await fetchMyLocation('test-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/location/me');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(data.is_sharing_active).toBe(true);
  });

  it('updates user location coordinates', async () => {
    const mockRes = {
      user_id: 2,
      latitude: 37.8,
      longitude: -122.4,
      is_sharing_active: true,
      updated_at: '2026-10-09T08:30:00Z',
      is_stale: false,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRes,
    });
    globalThis.fetch = fetchMock;

    const data = await updateUserLocation('test-token', 37.8, -122.4, true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/location/update');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    const parsedBody = JSON.parse(options.body);
    expect(parsedBody.latitude).toBe(37.8);
    expect(parsedBody.longitude).toBe(-122.4);
    expect(parsedBody.is_sharing_active).toBe(true);
    expect(data.latitude).toBe(37.8);
  });

  it('toggles location sharing consent', async () => {
    const mockRes = {
      user_id: 2,
      latitude: null,
      longitude: null,
      is_sharing_active: false,
      updated_at: '2026-10-09T08:35:00Z',
      is_stale: false,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRes,
    });
    globalThis.fetch = fetchMock;

    const data = await toggleLocationConsent('test-token', false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/location/consent');
    expect(options.method).toBe('POST');
    const parsedBody = JSON.parse(options.body);
    expect(parsedBody.is_sharing_active).toBe(false);
    expect(data.is_sharing_active).toBe(false);
  });

  it('handles error response when toggle fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Invalid consent parameters' }),
    });
    globalThis.fetch = fetchMock;

    await expect(locationService.toggleLocationConsent('test-token', true)).rejects.toThrow(
      'Invalid consent parameters',
    );
  });
});
