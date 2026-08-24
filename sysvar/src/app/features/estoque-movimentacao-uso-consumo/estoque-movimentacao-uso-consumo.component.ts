import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Loja } from '../../core/models/loja';
import { Produto } from '../../core/models/produto';
import { ProdutoUsoConsumoMovimentacao } from '../../core/models/estoque';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-estoque-movimentacao-uso-consumo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './estoque-movimentacao-uso-consumo.component.html',
  styleUrls: ['../estoque-consulta/estoque-consulta.component.css']
})
export class EstoqueMovimentacaoUsoConsumoComponent implements OnInit {
  private estoqueApi = inject(EstoqueService);
  private lojasApi = inject(LojasService);
  private produtosApi = inject(ProdutosService);

  loading = false;
  errorMsg = '';
  search = '';
  loja = '';
  tipo = '';
  dataInicio = '';
  dataFim = '';
  lojas: Loja[] = [];
  produtos: Produto[] = [];
  movimentos: ProdutoUsoConsumoMovimentacao[] = [];

  get searchSuggestions(): string[] {
    return Array.from(new Set(this.produtos.flatMap(p => [
      this.produtoSugestao(p),
      p.referencia || '',
      p.descricao || '',
      p.descricao_reduzida || ''
    ]).filter(Boolean) as string[]));
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
    this.tipo = '';
    this.dataInicio = '';
    this.dataFim = '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    forkJoin({
      lojas: this.lojasApi.list({ page_size: 500 }),
      produtos: this.produtosApi.list({ ativo: 'true', tipo_produto: '2', search: this.search, page_size: 5000 }),
      movimentos: this.estoqueApi.listMovimentacoesUsoConsumo({
        search: this.search,
        loja: this.loja,
        tipo: this.tipo,
        data_inicio: this.dataInicio,
        data_fim: this.dataFim,
        page_size: 5000
      })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.produtos = this.unwrap<Produto>(res.produtos).filter(p => String(p.tipo_produto) === '2');
        this.movimentos = this.unwrap<ProdutoUsoConsumoMovimentacao>(res.movimentos).filter(m => String(m.produto_tipo) === '2');
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao consultar movimentações de Uso/Consumo.';
      }
    });
  }

  movimentoData(item: ProdutoUsoConsumoMovimentacao): string {
    if (!item.data_movimento) return '';
    return new Date(item.data_movimento).toLocaleString('pt-BR');
  }

  numero(value: number | string): number {
    return Number(value || 0);
  }

  tipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      ENTRADA: 'Entrada',
      CONSUMO_INTERNO: 'Consumo interno',
      AJUSTE_ENTRADA: 'Ajuste entrada',
      AJUSTE_SAIDA: 'Ajuste saída'
    };
    return labels[tipo] || tipo;
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

  private normalizarTexto(valor: unknown): string {
    return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }
}
