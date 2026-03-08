import Dexie, { Table } from "dexie";

export interface WoTCacheEntry {
  pubkey: string;
  timestamp: number;
  scores: Record<string, number>;
  graph: Record<string, string[]>; // pubkey -> followedBy[]
}

export interface NutzapStateEntry {
  id: string; // NDKEventId
  state: unknown; // NDKNutzapState (serialized)
}

export class TellItDB extends Dexie {
  wotCache!: Table<WoTCacheEntry>;
  nutzapStates!: Table<NutzapStateEntry>;

  constructor() {
    super("TellItDB");
    this.version(2).stores({
      wotCache: "pubkey, timestamp",
      nutzapStates: "id"
    });
  }
}

export const db = new TellItDB();
