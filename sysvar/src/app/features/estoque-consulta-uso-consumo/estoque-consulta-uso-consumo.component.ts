import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProdutoUsoConsumoEstoque } from '../../core/models/estoque';
import { Loja } from '../../core/models/loja';
import { Produto } from '../../core/models/produto';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

interface UsoConsumoRow {
  referencia: string;
  produto: string;
  produtoId: number;
  lojaId: number;
  loja: string;
  unidade: string;
  saldo: number;
}

@Component({
  selector: 'app-estoque-consulta-uso-consumo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './estoque-consulta-uso-consumo.component.html',
  styleUrls: ['../estoque-consulta/estoque-consulta.component.css']
})
export class EstoqueConsultaUsoConsumoComponent implements OnInit {
  private estoqueApi = inject(EstoqueService);
  private lojasApi = inject(LojasService);
  private produtosApi = inject(ProdutosService);

  loading = false;
  errorMsg = '';
  search = '';
  loja = '';
  filtroSaldo: 'todos' | 'com_saldo' | 'zerados' = 'todos';
  lojas: Loja[] = [];
  produtos: Produto[] = [];
  estoques: ProdutoUsoConsumoEstoque[] = [];
  rows: UsoConsumoRow[] = [];
  totalSaldo = 0;

  get searchSuggestions(): string[] {
    const valores = this.produtos.flatMap(p => [
      this.produtoSugestao(p),
      p.referencia || '',
      p.descricao || '',
      p.descricao_reduzida || ''
    ]).filter(Boolean) as string[];
    return Array.from(new Set(valores));
  }

  ngOnInit(): void {
    this.load();
  }

  buscar(valor?: string): void {
    this.search = this.normalizarBusca(valor ?? this.search);
    this.load();
  }

  clearFilters(): void {
    this.search = '';
    this.loja = '';
    this.filtroSaldo = 'todos';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    forkJoin({
      lojas: this.lojasApi.list({ page_size: 500 }),
      produtos: this.produtosApi.list({ ativo: 'true', tipo_produto: '2', search: this.search, page_size: 5000 }),
      estoques: this.estoqueApi.listUsoConsumo({ search: this.search, loja: this.loja, page_size: 5000 })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.produtos = this.unwrap<Produto>(res.produtos).filter(p => String(p.tipo_produto) === '2');
        this.estoques = this.unwrap<ProdutoUsoConsumoEstoque>(res.estoques).filter(e => String(e.produto_tipo) === '2');
        this.montarRows();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao consultar estoque de Uso/Consumo.';
      }
    });
  }

  exportarCsv(): void {
    if (!this.rows.length) return;
    const headers = ['Referencia', 'Produto', 'Loja', 'Unidade', 'Saldo'];
    const rows = this.rows.map(row => [row.referencia, row.produto, row.loja, row.unidade, row.saldo]);
    const csv = [headers, ...rows].map(row => row.map(value => this.csvCell(value)).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'estoque-referencia-uso-consumo.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  private montarRows(): void {
    const lojasConsulta = this.loja
      ? this.lojas.filter(l => l.id === Number(this.loja))
      : this.lojas;
    const saldoPorProdutoLoja = new Map<string, number>();
    this.estoques.forEach(e => {
      const key = `${e.produto}|${e.loja}`;
      saldoPorProdutoLoja.set(key, (saldoPorProdutoLoja.get(key) || 0) + Number(e.saldo || 0));
    });

    this.rows = this.produtos.flatMap(produto => lojasConsulta.map(loja => {
      const saldo = saldoPorProdutoLoja.get(`${produto.Idproduto}|${loja.id}`) || 0;
      return {
        referencia: produto.referencia || '-',
        produto: produto.descricao_reduzida || produto.descricao || '',
        produtoId: Number(produto.Idproduto || 0),
        lojaId: Number(loja.id || 0),
        loja: loja.nome_loja || `Loja #${loja.id}`,
        unidade: this.unidadeLabel(produto),
        saldo
      };
    }))
      .filter(row => this.passaFiltroSaldo(row.saldo))
      .sort((a, b) => this.ordenarTexto(a.referencia, b.referencia) || this.ordenarTexto(a.loja, b.loja));
    this.totalSaldo = this.rows.reduce((sum, row) => sum + row.saldo, 0);
  }

  private produtoSugestao(produto: Produto): string | null {
    const referencia = produto.referencia || '';
    if (!referencia) return null;
    const descricao = produto.descricao_reduzida || produto.descricao || '';
    return descricao ? `${referencia} - ${descricao}` : referencia;
  }

  private normalizarBusca(valor: string): string {
    const termo = String(valor || '').includes(' - ') ? String(valor).split(' - ')[0].trim() : String(valor || '').trim();
    const normalizado = this.normalizarTexto(termo);
    const produto = this.produtos.find(p =>
      this.normalizarTexto(p.referencia).includes(normalizado) ||
      this.normalizarTexto(p.descricao).includes(normalizado) ||
      this.normalizarTexto(p.descricao_reduzida).includes(normalizado)
    );
    return produto?.referencia || termo;
  }

  private unidadeLabel(produto: Produto): string {
    const unidade = produto.unidade as any;
    if (unidade && typeof unidade === 'object') return unidade.Codigo || unidade.Descricao || '-';
    return unidade ? String(unidade) : '-';
  }

  private passaFiltroSaldo(total: number): boolean {
    if (this.filtroSaldo === 'com_saldo') return total > 0;
    if (this.filtroSaldo === 'zerados') return total === 0;
    return true;
  }

  private normalizarTexto(valor: unknown): string {
    return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private ordenarTexto(a: string, b: string): number {
    return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
  }

  private csvCell(value: string | number): string {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }
}
