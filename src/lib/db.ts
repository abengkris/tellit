import Dexie from "dexie";

// We keep the DB class for future use, but the wotCache is removed 
// as we've migrated to a Redis-backed on-demand WoT engine.
export class TellItDB extends Dexie {
  constructor() {
    super("TellItDB");
    this.version(4).stores({
      // wotCache removed
    });
  }
}

export const db = new TellItDB();
