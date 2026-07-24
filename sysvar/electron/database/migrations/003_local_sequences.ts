export const migration003 = {
  id: 3,
  name: 'local_sequences',
  statements: [
    `CREATE TABLE IF NOT EXISTS sequencias_locais (
      chave TEXT PRIMARY KEY,
      ultimo_numero INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`
  ]
};
