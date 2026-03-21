import { describe, it, expect } from "vitest";
import { TellItDB } from "../db";

describe("Dexie Database Schema", () => {
  it("should have correct schema for 'follows' and 'wotScores' tables", () => {
    const db = new TellItDB();
    
    // Dexie initializes the tables in the constructor
    const followsTable = db.table("follows");
    const wotScoresTable = db.table("wotScores");
    
    expect(followsTable).toBeDefined();
    expect(wotScoresTable).toBeDefined();
    
    // Check primary keys
    expect(followsTable.schema.primKey.name).toBe("pubkey");
    expect(wotScoresTable.schema.primKey.name).toBe("pubkey");
    
    // Check indexes for 'follows'
    expect(followsTable.schema.indexes.some(idx => idx.name === "follows")).toBe(true);
    // Dexie version 5 should have correctly parsed the multi-valued index
    
    // Check indexes for 'wotScores'
    expect(wotScoresTable.schema.indexes.some(idx => idx.name === "score")).toBe(true);
    expect(wotScoresTable.schema.indexes.some(idx => idx.name === "lastUpdated")).toBe(true);
  });
});
