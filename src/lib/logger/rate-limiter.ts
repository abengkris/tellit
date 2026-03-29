/**
 * In-memory rate limiter to prevent duplicate logs.
 */
export class RateLimiter {
  private lastFired = new Map<string, number>();

  constructor(private windowMs: number = 60000) {}

  /**
   * Checks if an action with the given key is allowed to proceed.
   * @param key Unique key for the action (e.g. error hash).
   * @returns True if allowed, false if rate limited.
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const last = this.lastFired.get(key);

    if (last && now - last < this.windowMs) {
      return false;
    }

    this.lastFired.set(key, now);
    
    // Optional: Periodic cleanup of old keys to prevent memory leak
    if (this.lastFired.size > 1000) {
      this.cleanup();
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.lastFired.entries()) {
      if (now - timestamp > this.windowMs) {
        this.lastFired.delete(key);
      }
    }
  }
}
