import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recyclingCenterService } from '../services/recyclingCenterService';

const TOKEN = 'test-token';
const MOCK_CENTER = {
  id: 1,
  name: 'EcoHub Recycling',
  address: '123 Green St',
  description: 'Test center',
  latitude: 37.7749,
  longitude: -122.4194,
  phone: '+1 555 000 1234',
  email: 'info@ecohub.test',
  website: 'https://ecohub.test',
  accepted_categories: 'PLASTIC,GLASS',
  opening_hours: 'Mon-Fri 08:00-18:00',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('recyclingCenterService', () => {
  it('listCenters sends GET with correct query params and auth header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [MOCK_CENTER],
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await recyclingCenterService.listCenters(TOKEN, { search: 'eco', category: 'PLASTIC' });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('search=eco');
    expect(url).toContain('category=PLASTIC');
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TOKEN}`);
    expect(result).toEqual([MOCK_CENTER]);
  });

  it('getCenter sends GET to correct endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_CENTER,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await recyclingCenterService.getCenter(TOKEN, 1);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/recycling-centers/1');
    expect(result).toEqual(MOCK_CENTER);
  });

  it('createCenter sends POST with JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_CENTER,
    });
    vi.stubGlobal('fetch', mockFetch);

    const payload = { name: 'EcoHub Recycling', address: '123 Green St' };
    await recyclingCenterService.createCenter(TOKEN, payload);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(url).toContain('/recycling-centers');
    expect(JSON.parse(init.body as string)).toMatchObject(payload);
  });

  it('deleteCenter sends DELETE to correct endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...MOCK_CENTER, is_active: false }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await recyclingCenterService.deleteCenter(TOKEN, 1);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('DELETE');
    expect(url).toContain('/recycling-centers/1');
    expect(result.is_active).toBe(false);
  });

  it('handles API error response and throws with detail message', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Not found' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(recyclingCenterService.getCenter(TOKEN, 9999)).rejects.toThrow('Not found');
  });
});
