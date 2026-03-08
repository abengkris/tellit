import { NDKNutzapMonitorStore } from "@nostr-dev-kit/wallet";
import { NDKEventId, NDKNutzapState } from "@nostr-dev-kit/ndk";
import { db } from "./db";

export class DexieNutzapStore implements NDKNutzapMonitorStore {
  async getAllNutzaps(): Promise<Map<NDKEventId, NDKNutzapState>> {
    const states = new Map<NDKEventId, NDKNutzapState>();
    try {
      const entries = await db.nutzapStates.toArray();
      for (const entry of entries) {
        states.set(entry.id, entry.state as NDKNutzapState);
      }
    } catch (e) {
      console.error("Failed to load nutzap states from Dexie", e);
    }
    return states;
  }

  async setNutzapState(id: NDKEventId, stateChange: Partial<NDKNutzapState>): Promise<void> {
    try {
      await db.transaction("rw", db.nutzapStates, async () => {
        const existing = await db.nutzapStates.get(id);
        const newState = {
          ...(existing?.state || {}),
          ...stateChange
        };
        
        // Remove the nutzap event object before saving to avoid serialization issues with complex NDK objects
        // The monitor can usually handle state without the full event object in the store
        if (newState.nutzap) {
          delete newState.nutzap;
        }

        await db.nutzapStates.put({
          id,
          state: newState
        });
      });
    } catch (e) {
      console.error("Failed to save nutzap state to Dexie", e);
    }
  }
}
