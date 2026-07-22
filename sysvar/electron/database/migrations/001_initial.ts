export const migration001 = {
  id: 1,
  name: 'initial_pdv_desktop',
  statements: [
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS terminal_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      terminal_uuid TEXT NOT NULL,
      empresa_id INTEGER,
      loja_id INTEGER,
      caixa_id INTEGER,
      usuario_id INTEGER,
      api_base_url TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 0,
      activated_at TEXT,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS produto_cache (
      sku_id INTEGER PRIMARY KEY,
      produto_id INTEGER NOT NULL,
      descricao TEXT NOT NULL,
      referencia TEXT NOT NULL,
      ean TEXT NOT NULL,
      cor TEXT NOT NULL,
      tamanho TEXT NOT NULL,
      preco REAL NOT NULL,
      estoque REAL NOT NULL DEFAULT 0,
      imagem_url TEXT,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS ix_produto_cache_busca
      ON produto_cache(descricao, referencia, ean)`,
    `CREATE TABLE IF NOT EXISTS venda_local (
      local_uuid TEXT PRIMARY KEY,
      documento TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      tentativas INTEGER NOT NULL DEFAULT 0,
      erro TEXT,
      venda_servidor_id INTEGER,
      created_at TEXT NOT NULL,
      synced_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS ix_venda_local_status
      ON venda_local(status, created_at)`,
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      chave TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      tentativas INTEGER NOT NULL DEFAULT 0,
      erro TEXT,
      created_at TEXT NOT NULL,
      processed_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS ix_sync_queue_status
      ON sync_queue(status, created_at)`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      referencia TEXT,
      payload_json TEXT,
      created_at TEXT NOT NULL
    )`
  ]
};

