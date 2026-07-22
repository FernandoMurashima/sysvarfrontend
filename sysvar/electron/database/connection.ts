export type SqlParam = string | number | boolean | null;

export interface LocalDatabase {
  execute(sql: string, params?: SqlParam[]): Promise<void>;
  query<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  transaction<T>(work: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface DatabaseFactory {
  open(path: string): Promise<LocalDatabase>;
}

export class LocalDatabaseConnection {
  private db: LocalDatabase | null = null;

  constructor(
    private readonly factory: DatabaseFactory,
    private readonly path: string
  ) {}

  async open(): Promise<LocalDatabase> {
    if (!this.db) this.db = await this.factory.open(this.path);
    return this.db;
  }

  async close(): Promise<void> {
    if (!this.db) return;
    await this.db.close();
    this.db = null;
  }
}

