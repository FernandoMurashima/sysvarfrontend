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

export interface ProdutoCacheInput {
  skuId: number;
  produtoId: number;
  descricao: string;
  referencia: string;
  ean: string;
  cor: string;
  tamanho: string;
  preco: number;
  estoque: number;
  imagemUrl?: string;
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

  async salvarCatalogo(produtos: ProdutoCacheInput[]): Promise<number> {
    const now = new Date().toISOString();
    await this.db.transaction(async () => {
      for (const produto of produtos) {
        await this.db.execute(
          `INSERT INTO produto_cache (
            sku_id, produto_id, descricao, referencia, ean, cor, tamanho, preco, estoque, imagem_url, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(sku_id) DO UPDATE SET
            produto_id = excluded.produto_id,
            descricao = excluded.descricao,
            referencia = excluded.referencia,
            ean = excluded.ean,
            cor = excluded.cor,
            tamanho = excluded.tamanho,
            preco = excluded.preco,
            estoque = excluded.estoque,
            imagem_url = excluded.imagem_url,
            updated_at = excluded.updated_at`,
          [
            produto.skuId,
            produto.produtoId,
            produto.descricao,
            produto.referencia,
            produto.ean,
            produto.cor,
            produto.tamanho,
            produto.preco,
            produto.estoque,
            produto.imagemUrl ?? null,
            now
          ]
        );
      }
      await this.db.execute(
        `INSERT INTO audit_log (tipo, referencia, payload_json, created_at)
         VALUES (?, ?, ?, ?)`,
        ['CATALOGO_ATUALIZADO', 'produto_cache', JSON.stringify({ total: produtos.length }), now]
      );
    });
    return produtos.length;
  }
}
