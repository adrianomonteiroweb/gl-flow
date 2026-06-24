import { db } from '../db';
import { eq, count, getTableName } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import { PgTable } from 'drizzle-orm/pg-core';
import { RelationalQueryBuilder } from 'drizzle-orm/mysql-core/query-builders/query';

export type TableModel<T extends PgTable> = T;

export class BaseRepository {
  static db: any = db;
  static model: TableModel<any>;

  static async transaction(fn: (db: NodePgDatabase<typeof schema>) => Promise<any>) {
    return await this.db.transaction(fn);
  }

  static query(db = this.db): RelationalQueryBuilder<any, any, any> {
    return (db as any).query[getTableName(this.model) + '_table'];
  }

  static async findById(id: any, options: any = {}, { tx }: any = {}) {
    return await this.query(tx).findFirst({
      ...options,
      where: eq(this.model.id, id),
    });
  }

  static async findAll(where?: any, options: any = {}, { tx }: any = {}) {
    return await this.query(tx).findMany({
      ...options,
      where,
    });
  }

  static async findOne(where: any, options: any = {}, { tx }: any = {}) {
    return await this.query(tx).findFirst({
      ...options,
      where,
    });
  }

  static async findOrCreate(where: any, data: any, opts: any = {}) {
    const db = opts.tx || this.db;

    const item = await this.findOne(where);

    if (item) {
      return [item, false];
    }

    const created = await db.insert(this.model).values(data).returning();
    return [created[0], true];
  }

  static async count(where?: any, opts: any = {}) {
    type Result = {
      count: number;
    }[];

    const db = opts.tx || this.db;

    const result: Result = await db.select({ count: count() }).from(this.model).where(where);
    return result[0]?.count || 0;
  }

  static async updateOrCreate(data: any, target: any = null, opts: any = {}) {
    const db = opts.tx || this.db;

    return await db
      .insert(this.model)
      .values(data)
      .onConflictDoUpdate({
        target: target || this.model.id,
        set: data,
      })
      .returning();
  }

  static async create(data: any, opts: any = {}) {
    const db = opts.tx || this.db;

    const created: any = await db.insert(this.model).values(data).returning();

    return created[0];
  }

  /**
   * Idempotent insert keyed on the primary key — for offline replay. If a row
   * with the same `id` already exists, the insert is a no-op and the existing
   * row is returned. Conflicts on other unique constraints still throw, so the
   * caller can resolve them (e.g. dedupe a person by phone/document).
   */
  static async createIdempotent(data: any, opts: any = {}) {
    const db = opts.tx || this.db;

    const inserted: any = await db.insert(this.model).values(data).onConflictDoNothing({ target: this.model.id }).returning();

    if (inserted[0]) {
      return inserted[0];
    }

    return await this.findById(data.id, {}, { tx: opts.tx });
  }

  static async bulkCreate(data: any, opts: any = {}) {
    const db = opts.tx || this.db;

    return await db.insert(this.model).values(data).returning();
  }

  static async update(id: any, data: any, opts: any = {}) {
    const db = opts.tx || this.db;

    if (this.model?.updated_at) {
      data.updated_at = new Date();
    }

    const updated: any = await db.update(this.model).set(data).where(eq(this.model.id, id)).returning();
    return updated[0];
  }

  static async bulkUpdate(where: any, data: any, opts: any = {}) {
    const db = opts.tx || this.db;
    return db.update(this.model).set(data).where(where).returning();
  }

  static async destroy(where: any, opts: any = {}) {
    const db = opts.tx || this.db;
    return await db.delete(this.model).where(where).returning();
  }

  static async deleteById(id: any, opts: any = {}) {
    const db = opts.tx || this.db;
    return await db.delete(this.model).where(eq(this.model.id, id)).returning();
  }
}

export default BaseRepository;
