import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clientLogger } from '../client';

describe('clientLogger', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));
  });

  it('should call /api/log with correct body for error', async () => {
    const error = new Error('Client-side error');
    error.stack = 'Mock stack trace';
    
    await clientLogger.error('Something went wrong', error);

    expect(fetch).toHaveBeenCalledWith('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"level":"ERROR"'),
    });

    const callBody = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.message).toBe('Something went wrong');
    expect(callBody.stack).toBe('Mock stack trace');
  });

  it('should call /api/log with correct body for fatal', async () => {
    await clientLogger.fatal('Critical failure');

    expect(fetch).toHaveBeenCalledWith('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"level":"FATAL"'),
    });
  });

  it('should handle fetch failures gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await clientLogger.error('Test error');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to send client log'), expect.any(Error));
    consoleSpy.mockRestore();
  });
});
