import { LocalDatabase } from '../database/connection';

export interface ProdutoCacheRow {
  sku_id: number;
  produto_id: number;
  descricao: string;
  referencia: string;
  ean: string;
  cor: string;
  tamanho: string;
  preco: number;
  estoque: number;
  imagem_url?: string;
}

export class ProdutoCacheRepository {
  constructor(private readonly db: LocalDatabase) {}

  pesquisar(termo: string): Promise<ProdutoCacheRow[]> {
    const normalized = `%${termo.trim()}%`;
    return this.db.query<ProdutoCacheRow>(
      `SELECT sku_id, produto_id, descricao, referencia, ean, cor, tamanho, preco, estoque, imagem_url
       FROM produto_cache
       WHERE descricao LIKE ? OR referencia LIKE ? OR ean LIKE ?
       ORDER BY descricao
       LIMIT 40`,
      [normalized, normalized, normalized]
    );
  }
}

