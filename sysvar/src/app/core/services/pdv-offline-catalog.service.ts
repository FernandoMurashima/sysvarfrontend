import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PdvOfflineCatalogService {
  private readonly key = 'sysvar.pdv.offline.catalog';

  salvarProdutos<T extends { codigo?: string; descricao?: string; produto?: { referencia?: string | null }; sku?: { codigo_item_ref?: string } }>(produtos: T[]): void {
    const atuais = this.listar<T>();
    const mapa = new Map<string, T>();
    [...atuais, ...produtos].forEach(produto => {
      const chave = String(produto.codigo || produto.produto?.referencia || produto.descricao || '').trim();
      if (chave) mapa.set(chave, produto);
    });
    localStorage.setItem(this.key, JSON.stringify(Array.from(mapa.values()).slice(0, 500)));
  }

  pesquisar<T>(termo: string): T[] {
    const q = termo.trim().toLowerCase();
    const produtos = this.listar<any>();
    if (!q) return produtos.slice(0, 30);
    return produtos.filter(produto =>
      String(produto.codigo || '').toLowerCase().includes(q) ||
      String(produto.descricao || '').toLowerCase().includes(q) ||
      String(produto.produto?.referencia || '').toLowerCase().includes(q) ||
      String(produto.sku?.codigo_item_ref || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }

  baixarEstoque(itens: Array<{ codigo: string; qtd: number }>): void {
    const produtos = this.listar<any>();
    itens.forEach(item => {
      const produto = produtos.find(p => String(p.codigo || '') === String(item.codigo || ''));
      if (produto) produto.estoque = Math.max(Number(produto.estoque || 0) - Number(item.qtd || 0), 0);
    });
    localStorage.setItem(this.key, JSON.stringify(produtos));
  }

  private listar<T>(): T[] {
    try {
      const data = JSON.parse(localStorage.getItem(this.key) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
}
