import { DatabaseFactory, LocalDatabase, SqlParam } from './connection';

type Statement = {
  run: (params?: SqlParam[]) => unknown;
  all: <T>(params?: SqlParam[]) => T[];
};

type BetterSqliteDatabaseHandle = {
  prepare: (sql: string) => Statement;
  exec: (sql: string) => void;
  pragma: (statement: string) => void;
  close: () => void;
};

export class BetterSqliteDatabaseFactory implements DatabaseFactory {
  async open(path: string): Promise<LocalDatabase> {
    const nodeRequire = eval('require') as (name: string) => unknown;
    const Database = nodeRequire('better-sqlite3') as new (path: string) => BetterSqliteDatabaseHandle;
    const db = new Database(path);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    return new BetterSqliteDatabase(db);
  }
}

class BetterSqliteDatabase implements LocalDatabase {
  constructor(private readonly db: BetterSqliteDatabaseHandle) {}

  async execute(sql: string, params: SqlParam[] = []): Promise<void> {
    if (params.length) {
      this.db.prepare(sql).run(params);
      return;
    }
    this.db.exec(sql);
  }

  async query<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    return this.db.prepare(sql).all<T>(params);
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    await this.execute('BEGIN IMMEDIATE');
    try {
      const result = await work();
      await this.execute('COMMIT');
      return result;
    } catch (error) {
      await this.execute('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
