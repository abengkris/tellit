import { NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrFilter } from '@nostrify/types';

/**
 * Creates an NPool for the logger.
 * @param relays List of relay URLs.
 * @returns An initialized NPool instance.
 */
export function createLoggerPool(relays: string[]): NPool {
  return new NPool({
    open: (url) => new NRelay1(url),
    reqRouter: (filters: NostrFilter[]) => {
      const map = new Map<string, NostrFilter[]>();
      for (const url of relays) {
        map.set(url, filters);
      }
      return map;
    },
    eventRouter: () => relays,
  });
}
