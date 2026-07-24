import { LocalDatabase } from '../database/connection';

export interface PdvStatusLocal {
  vendasPendentes: number;
  documentosFiscaisPendentes: number;
  movimentosEstoquePendentes: number;
  errosSincronizacao: number;
}

export class PdvStatusLocalRepository {
  constructor(private readonly db: LocalDatabase) {}

  async resumo(): Promise<PdvStatusLocal> {
    const vendas = await this.db.query<{ total: number }>(
      `SELECT COUNT(*) total FROM venda_local WHERE status = ?`,
      ['PENDENTE_SYNC']
    );
    const fiscais = await this.db.query<{ total: number }>(
      `SELECT COUNT(*) total FROM documentos_fiscais_locais WHERE status IN (?, ?)`,
      ['PENDENTE_TRANSMISSAO', 'ERRO']
    );
    const estoque = await this.db.query<{ total: number }>(
      `SELECT COUNT(*) total FROM estoque_movimentos_locais WHERE status_sincronizacao = ?`,
      ['PENDENTE']
    );
    const erros = await this.db.query<{ total: number }>(
      `SELECT COUNT(*) total FROM venda_local WHERE erro IS NOT NULL AND erro <> ''`
    );
    return {
      vendasPendentes: Number(vendas[0]?.total || 0),
      documentosFiscaisPendentes: Number(fiscais[0]?.total || 0),
      movimentosEstoquePendentes: Number(estoque[0]?.total || 0),
      errosSincronizacao: Number(erros[0]?.total || 0)
    };
  }
}
