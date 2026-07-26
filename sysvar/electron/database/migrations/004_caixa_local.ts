export const migration004 = {
  id: 4,
  name: 'caixa_local',
  statements: [
    `CREATE TABLE IF NOT EXISTS caixas_locais (
      local_uuid TEXT PRIMARY KEY,
      loja_id INTEGER NOT NULL,
      caixa_id INTEGER NOT NULL,
      operador TEXT,
      status TEXT NOT NULL,
      aberto_em TEXT NOT NULL,
      fechado_em TEXT,
      resumo_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS caixas_locais_idx_status ON caixas_locais (loja_id, caixa_id, status)'
  ]
};
