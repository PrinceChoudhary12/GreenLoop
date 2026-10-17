import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchService, searchGlobal } from '../services/searchService';

describe('searchService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches global search results with correct URL query parameter and headers', async () => {
    const mockResponse = {
      query: 'plastic',
      total_results: 1,
      results: [
        {
          id: 'report_10',
          entity_type: 'report',
          entity_id: 10,
          title: 'Report #10 (PLASTIC)',
          subtitle: 'Main Street — Plastic bottles',
          category: 'PLASTIC',
          status: 'SUBMITTED',
          target_url: '/reports?reportId=10',
          created_at: '2026-10-09T08:00:00Z',
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    globalThis.fetch = fetchMock;

    const data = await searchGlobal('test-token', 'plastic', 10);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/search?q=plastic&limit=10');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(data.total_results).toBe(1);
    expect(data.results[0].title).toBe('Report #10 (PLASTIC)');
  });

  it('handles error message responses from search endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Search query invalid' }),
    });
    globalThis.fetch = fetchMock;

    await expect(searchService.searchGlobal('test-token', 'a')).rejects.toThrow('Search query invalid');
  });
});
