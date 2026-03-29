import { db as dexieDb } from "../db";
import { getKysely } from "../nostrify-sql-store";
import { track } from "@vercel/analytics";

/**
 * Migrates data from Dexie (TellItDB) to the new SQL store.
 * Returns true if migration was performed, false if already migrated or no data.
 */
export async function migrateDexieToSql(): Promise<boolean> {
  const isServer = typeof window === 'undefined';
  if (isServer) return false; // Migration only makes sense on the client where Dexie was used

  const migrationKey = 'tellit_dexie_to_sql_migrated';
  if (localStorage.getItem(migrationKey) === 'true') {
    return false;
  }

  console.log("[Migration] Starting migration from Dexie to SQL...");

  try {
    const sqlDb = await getKysely();

    // 1. Migrate follows
    const follows = await dexieDb.table('follows').toArray();
    if (follows.length > 0) {
      console.log(`[Migration] Migrating ${follows.length} follow records...`);
      for (const record of follows) {
        await sqlDb
          .insertInto('follows')
          .values({
            pubkey: record.pubkey,
            follows: JSON.stringify(record.follows),
            timestamp: record.timestamp
          })
          .onConflict((oc) => oc.column('pubkey').doUpdateSet({
            follows: JSON.stringify(record.follows),
            timestamp: record.timestamp
          }))
          .execute();
      }
    }

    // 2. Migrate WoT scores
    const wotScores = await dexieDb.table('wotScores').toArray();
    if (wotScores.length > 0) {
      console.log(`[Migration] Migrating ${wotScores.length} WoT score records...`);
      for (const record of wotScores) {
        await sqlDb
          .insertInto('wot_scores')
          .values({
            pubkey: record.pubkey,
            score: record.score,
            last_updated: record.lastUpdated
          })
          .onConflict((oc) => oc.column('pubkey').doUpdateSet({
            score: record.score,
            last_updated: record.lastUpdated
          }))
          .execute();
      }
    }

    localStorage.setItem(migrationKey, 'true');
    console.log("[Migration] Migration complete.");
    try {
      track("migration_dexie_to_sql_complete", {
        followsCount: follows.length,
        wotCount: wotScores.length
      });
    } catch (_e) {
      // Ignore tracking errors
    }
    return true;
  } catch (err) {
    console.error("[Migration] Migration failed:", err);
    try {
      track("migration_dexie_to_sql_failed", {
        error: String(err)
      });
    } catch (_e) {
      // Ignore tracking errors
    }
    return false;
  }
}
