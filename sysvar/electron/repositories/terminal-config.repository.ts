import { LocalDatabase } from '../database/connection';
import { randomUUID } from 'crypto';

export interface TerminalConfigInput {
  empresaId?: number | null;
  lojaId?: number | null;
  caixaId?: number | null;
  usuarioId?: number | null;
  apiBaseUrl: string;
}

export interface TerminalConfigRow {
  terminal_uuid: string;
  empresa_id?: number | null;
  loja_id?: number | null;
  caixa_id?: number | null;
  usuario_id?: number | null;
  api_base_url: string;
  ativo: number;
  updated_at: string;
}

export class TerminalConfigRepository {
  constructor(private readonly db: LocalDatabase) {}

  async salvar(config: TerminalConfigInput): Promise<TerminalConfigRow> {
    const now = new Date().toISOString();
    const atual = await this.obter();
    const uuid = atual?.terminal_uuid || randomUUID();
    await this.db.execute(
      `INSERT INTO terminal_config (
        id, terminal_uuid, empresa_id, loja_id, caixa_id, usuario_id, api_base_url, ativo, activated_at, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        empresa_id = excluded.empresa_id,
        loja_id = excluded.loja_id,
        caixa_id = excluded.caixa_id,
        usuario_id = excluded.usuario_id,
        api_base_url = excluded.api_base_url,
        ativo = 1,
        updated_at = excluded.updated_at`,
      [
        uuid,
        config.empresaId ?? null,
        config.lojaId ?? null,
        config.caixaId ?? null,
        config.usuarioId ?? null,
        config.apiBaseUrl,
        atual?.updated_at ? atual.updated_at : now,
        now
      ]
    );
    return (await this.obter())!;
  }

  async obter(): Promise<TerminalConfigRow | null> {
    const rows = await this.db.query<TerminalConfigRow>(
      `SELECT terminal_uuid, empresa_id, loja_id, caixa_id, usuario_id, api_base_url, ativo, updated_at
       FROM terminal_config
       WHERE id = 1`
    );
    return rows[0] || null;
  }
}
