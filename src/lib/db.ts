import Dexie, { Table } from "dexie";

export interface WoTCacheEntry {
  pubkey: string;
  timestamp: number;
  scores: Record<string, number>;
  graph: Record<string, string[]>; // pubkey -> followedBy[]
}

export class TellItDB extends Dexie {
  wotCache!: Table<WoTCacheEntry>;

  constructor() {
    super("TellItDB");
    this.version(4).stores({
      wotCache: "pubkey, timestamp",
    });
  }
}

export const db = new TellItDB();
