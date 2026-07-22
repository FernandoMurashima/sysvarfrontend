import { LocalDatabase } from '../connection';
import { migration001 } from './001_initial';

const migrations = [migration001];

export async function runMigrations(db: LocalDatabase): Promise<void> {
  await db.execute(migration001.statements[0]);
  const applied = await db.query<{ id: number }>('SELECT id FROM schema_migrations');
  const appliedIds = new Set(applied.map(row => row.id));

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) continue;
    await db.transaction(async () => {
      for (const statement of migration.statements.slice(1)) {
        await db.execute(statement);
      }
      await db.execute(
        'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)',
        [migration.id, migration.name, new Date().toISOString()]
      );
    });
  }
}

