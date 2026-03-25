import { NPool, NRelay1 } from '@nostrify/nostrify';

/**
 * Creates a Nostrify relay pool (NPool) using a set of relay URLs.
 * This manager simplifies the creation and pooling of relay connections.
 */
export function createRelayPool(relays: string[]): NPool {
  return new NPool({
    open: (url) => new NRelay1(url),
    reqRouter: (filters) => new Map(relays.map((url) => [url, filters])),
    eventRouter: () => relays,
  });
}

/**
 * Creates a single relay connection (NRelay1).
 */
export function createRelay(url: string): NRelay1 {
  return new NRelay1(url);
}
