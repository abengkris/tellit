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

export interface MintInfoEntry {
  url: string;
  info: unknown; // GetInfoResponse
  timestamp: number;
}

export interface MintKeysEntry {
  url: string;
  keysets: unknown; // Map<string, MintKeys> or object
  timestamp: number;
}

export class TellItDB extends Dexie {
  wotCache!: Table<WoTCacheEntry>;
  nutzapStates!: Table<NutzapStateEntry>;
  mintInfo!: Table<MintInfoEntry>;
  mintKeys!: Table<MintKeysEntry>;

  constructor() {
    super("TellItDB");
    this.version(3).stores({
      wotCache: "pubkey, timestamp",
      nutzapStates: "id",
      mintInfo: "url",
      mintKeys: "url"
    });
  }
}

export const db = new TellItDB();
