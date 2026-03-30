import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NostrifyLogger } from '@/lib/logger';
import { NextRequest } from 'next/server';

vi.mock('@/lib/logger', () => ({
  NostrifyLogger: {
    get: vi.fn().mockResolvedValue({
      error: vi.fn().mockResolvedValue(undefined),
      fatal: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('Log API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call logger.error for ERROR level', async () => {
    const mockData = {
      level: 'ERROR',
      message: 'Test error message',
      url: 'http://localhost/test',
      userAgent: 'Mozilla/5.0',
      timestamp: '2026-03-29T10:00:00Z',
      stack: 'Error: Test error message\n    at Object.<anonymous>...'
    };

    const req = new NextRequest('http://localhost/api/log', {
      method: 'POST',
      body: JSON.stringify(mockData),
    });

    const response = await POST(req);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);

    const loggerInstance = await NostrifyLogger.get();
    expect(loggerInstance.error).toHaveBeenCalledWith(
      expect.stringContaining('Test error message'),
      expect.any(Error)
    );
  });

  it('should call logger.fatal for FATAL level', async () => {
    const mockData = {
      level: 'FATAL',
      message: 'Critical failure',
      url: 'http://localhost/test',
      userAgent: 'Mozilla/5.0',
      timestamp: '2026-03-29T10:00:00Z',
    };

    const req = new NextRequest('http://localhost/api/log', {
      method: 'POST',
      body: JSON.stringify(mockData),
    });

    await POST(req);

    const loggerInstance = await NostrifyLogger.get();
    expect(loggerInstance.fatal).toHaveBeenCalled();
  });

  it('should return 400 for invalid payload', async () => {
    const req = new NextRequest('http://localhost/api/log', {
      method: 'POST',
      body: JSON.stringify({ level: 'INFO' }), // INFO is not ERROR/FATAL
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
