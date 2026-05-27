import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Database = require("better-sqlite3");
import { resolve } from "path";

/**
 * Thin wrapper around better-sqlite3 for raw SQL queries that
 * Prisma's ORM layer handles poorly (density grid aggregations,
 * bulk batch inserts, etc.).
 *
 * The DB path is resolved once from DATABASE_URL or falls back
 * to the default geoai_data/geoai.db location.
 */
@Injectable()
export class BetterSqliteService implements OnModuleDestroy {
  private db: Database.Database | null = null;

  /** Lazy-open so tests can construct the service without a real file. */
  getDb(): Database.Database {
    if (!this.db) {
      this.db = new Database(this.resolveDbPath(), { timeout: 30000 });
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");
      this.db.pragma("busy_timeout = 30000");
      this.ensureRuntimeIndexes(this.db);
    }
    return this.db;
  }

  /** Run a read query and return all rows. */
  all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
    return this.getDb().prepare(sql).all(...params) as T[];
  }

  /** Run a write query and return run result. */
  run(sql: string, ...params: unknown[]): Database.RunResult {
    return this.getDb().prepare(sql).run(...params);
  }

  /** Execute multiple statements inside a single transaction. */
  transaction<T>(fn: (db: Database.Database) => T): T {
    const db = this.getDb();
    return db.transaction(() => fn(db))();
  }

  /** Insert rows in batches with commit between each batch. */
  batchInsert(
    sql: string,
    rows: unknown[][],
    batchSize = 1000
  ): { inserted: number; batches: number } {
    const db = this.getDb();
    const stmt = db.prepare(sql);
    let inserted = 0;
    let batches = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const insertBatch = db.transaction((batchRows: unknown[][]) => {
        for (const row of batchRows) {
          stmt.run(...row);
        }
        return batchRows.length;
      });
      inserted += insertBatch(batch);
      batches += 1;
    }

    return { inserted, batches };
  }

  onModuleDestroy() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private resolveDbPath(): string {
    const envUrl = process.env.DATABASE_URL || "";
    const fileMatch = envUrl.match(/^file:(.+)$/);

    if (fileMatch) {
      const filePath = fileMatch[1];
      // Prisma file: URLs are relative to schema.prisma location
      // For better-sqlite3 we resolve relative to project root
      if (filePath.startsWith("/") || /^[a-zA-Z]:/.test(filePath)) {
        return filePath; // absolute
      }
      // Resolve relative to apps/api/prisma/ (where schema.prisma lives).
      return resolve(process.cwd(), "prisma", filePath);
    }

    // Fallback: project root geoai_data/geoai.db
    return resolve(__dirname, "..", "..", "..", "..", "geoai_data", "geoai.db");
  }

  private ensureRuntimeIndexes(db: Database.Database) {
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS BuildingProperty_density_source_ward_district_centroid_idx
        ON BuildingProperty(source, ward, district, centroidLat, centroidLng)
        WHERE deletedAt IS NULL;

        CREATE INDEX IF NOT EXISTS idx_buildingproperty_ward_district
        ON BuildingProperty(deletedAt, source, ward, district);

        CREATE INDEX IF NOT EXISTS idx_buildingproperty_centroid
        ON BuildingProperty(centroidLat, centroidLng)
        WHERE deletedAt IS NULL;
      `);
    } catch (error) {
      console.warn("Could not ensure BuildingProperty runtime indexes.", error);
    }
  }
}
