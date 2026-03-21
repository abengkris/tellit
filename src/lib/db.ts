import Dexie from "dexie";

// We keep the DB class for future use, and now we're re-adding 
// local-first WoT tables to support high-speed trust scoring.
export class TellItDB extends Dexie {
  constructor() {
    super("TellItDB");
    this.version(5).stores({
      follows: "pubkey, *follows", // pubkey is primary, follows is multi-valued index
      wotScores: "pubkey, score, lastUpdated"
    });
  }
}

export const db = new TellItDB();
