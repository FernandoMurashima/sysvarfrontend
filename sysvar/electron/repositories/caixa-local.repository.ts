import { LocalDatabase } from '../database/connection';

export interface CaixaLocalRow {
  local_uuid: string;
  loja_id: number;
  caixa_id: number;
  operador?: string;
  status: 'ABERTO' | 'FECHADO';
  aberto_em: string;
  fechado_em?: string;
  resumo_json?: string;
  created_at: string;
  updated_at: string;
}

export class CaixaLocalRepository {
  constructor(private readonly db: LocalDatabase) {}

  async obter(lojaId: number, caixaId: number): Promise<CaixaLocalRow | null> {
    const rows = await this.db.query<CaixaLocalRow>(
      `SELECT * FROM caixas_locais
       WHERE loja_id = ? AND caixa_id = ? AND status = 'ABERTO'
       ORDER BY aberto_em DESC LIMIT 1`,
      [lojaId, caixaId]
    );
    return rows[0] ?? null;
  }

  async abrir(lojaId: number, caixaId: number, operador?: string): Promise<CaixaLocalRow> {
    const aberto = await this.obter(lojaId, caixaId);
    if (aberto) return aberto;
    const now = new Date().toISOString();
    const uuid = crypto.randomUUID();
    await this.db.execute(
      `INSERT INTO caixas_locais (
        local_uuid, loja_id, caixa_id, operador, status, aberto_em, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ABERTO', ?, ?, ?)`,
      [uuid, lojaId, caixaId, operador || null, now, now, now]
    );
    return (await this.obter(lojaId, caixaId))!;
  }

  async fechar(lojaId: number, caixaId: number, resumo?: unknown): Promise<CaixaLocalRow | null> {
    const aberto = await this.obter(lojaId, caixaId);
    if (!aberto) return null;
    const now = new Date().toISOString();
    await this.db.execute(
      `UPDATE caixas_locais
       SET status = 'FECHADO', fechado_em = ?, resumo_json = ?, updated_at = ?
       WHERE local_uuid = ?`,
      [now, resumo ? JSON.stringify(resumo) : null, now, aberto.local_uuid]
    );
    return { ...aberto, status: 'FECHADO', fechado_em: now, updated_at: now };
  }
}
