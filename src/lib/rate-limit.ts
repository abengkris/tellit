import redis from './redis';

const RATE_LIMIT_PREFIX = 'rate_limit:';

/**
 * Checks if a request should be rate-limited.
 * 
 * @param identifier A unique identifier for the user (e.g., pubkey, IP).
 * @param limit Maximum number of requests within the window.
 * @param window Window size in seconds.
 * @returns Object with result and remaining count.
 */
export async function isRateLimited(
  identifier: string,
  limit: number = 10,
  window: number = 60
): Promise<{ limited: boolean; remaining: number; reset: number }> {
  const key = `${RATE_LIMIT_PREFIX}${identifier}`;

  const current = await redis.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= limit) {
    const ttl = await redis.ttl(key);
    return {
      limited: true,
      remaining: 0,
      reset: Math.max(0, ttl),
    };
  }

  const multi = redis.multi();
  multi.incr(key);
  if (count === 0) {
    multi.expire(key, window);
  }
  
  const results = await multi.exec();
  const newCount = results ? (results[0][1] as number) : count + 1;
  const ttl = await redis.ttl(key);

  return {
    limited: false,
    remaining: Math.max(0, limit - newCount),
    reset: Math.max(0, ttl),
  };
}
