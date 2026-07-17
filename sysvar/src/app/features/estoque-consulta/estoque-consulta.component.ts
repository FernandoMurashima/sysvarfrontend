import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Colecao } from '../../core/models/colecao';
import { Cor } from '../../core/models/cor';
import { Estoque, EstoqueMovimentacao } from '../../core/models/estoque';
import { Loja } from '../../core/models/loja';
import { Produto } from '../../core/models/produto';
import { TamanhoModel } from '../../core/models/tamanho';
import { ColecoesService } from '../../core/services/colecoes.service';
import { CoresService } from '../../core/services/cores.service';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutoDetalheService, ProdutoSku } from '../../core/services/produto-detalhe.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { TamanhosService } from '../../core/services/tamanhos.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

interface MatrizTamanho {
  id: number;
  label: string;
}

interface MatrizRow {
  lojaId: number;
  loja: string;
  corId: number;
  cor: string;
  saldos: Record<number, number>;
  total: number;
}

interface ColecaoReferenciaRow {
  referencia: string;
  produto: string;
  saldos: Record<number, number>;
  total: number;
}

@Component({
  selector: 'app-estoque-consulta',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './estoque-consulta.component.html',
  styleUrls: ['./estoque-consulta.component.css']
})
export class EstoqueConsultaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(EstoqueService);
  private lojasApi = inject(LojasService);
  private skusApi = inject(ProdutoDetalheService);
  private produtosApi = inject(ProdutosService);
  private colecoesApi = inject(ColecoesService);
  private coresApi = inject(CoresService);
  private tamanhosApi = inject(TamanhosService);

  loading = false;
  errorMsg = '';
  search = '';
  loja = '';
  colecao = '';
  estacao = '';
  estoques: Estoque[] = [];
  movimentos: EstoqueMovimentacao[] = [];
  lojas: Loja[] = [];
  produtos: Produto[] = [];
  colecoes: Colecao[] = [];
  skus: ProdutoSku[] = [];
  cores: Cor[] = [];
  tamanhos: TamanhoModel[] = [];
  matrizTamanhos: MatrizTamanho[] = [];
  matrizRows: MatrizRow[] = [];
  matrizTotais: Record<number, number> = {};
  matrizTotalGeral = 0;
  referenciasMatriz: string[] = [];
  modo: 'matriz' | 'movimentos' | 'colecao' = 'matriz';
  produtoReferencia = '';
  filtroSaldo: 'todos' | 'com_saldo' | 'zerados' = 'todos';
  produtosColecao: Produto[] = [];
  colecaoRows: ColecaoReferenciaRow[] = [];
  colecaoLojaIds: number[] = [];
  colecaoTotaisLoja: Record<number, number> = {};
  colecaoTotalGeral = 0;

  get searchSuggestions(): string[] {
    const valores = [
      ...this.produtos.flatMap(p => [
        this.produtoSugestao(p)
      ]),
      ...this.skus.flatMap(s => [
        s.ean13,
        s.codigo_item_ref
      ]),
      ...this.estoques.flatMap(e => [
        e.referencia,
        e.CodigodeBarra
      ]),
      ...this.movimentos.flatMap(m => [
        m.referencia,
        m.CodigodeBarra,
        m.documento
      ])
    ].filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  buscar(valor?: string): void {
    const termo = String(valor ?? this.search ?? '').trim();
    this.search = this.normalizarBuscaReferencia(termo);
    this.load();
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.modo = data['modo'] || 'matriz';
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    const estoqueParams = this.isColecao()
      ? { loja: this.loja, page_size: 5000 }
      : { search: this.search, loja: this.loja, colecao: this.colecao, estacao: this.estacao, page_size: 5000 };

    forkJoin({
      lojas: this.lojasApi.list({ page_size: 500 }),
      estoque: this.api.list(estoqueParams),
      movimentos: this.api.listMovimentacoes({ search: this.search, loja: this.loja, page_size: 500 }),
      produtos: this.produtosApi.list({ ativo: 'true', page_size: 5000 }),
      colecoes: this.colecoesApi.list(),
      skus: this.skusApi.list({ page_size: 5000 }),
      cores: this.coresApi.list({ page_size: 2000, ordering: 'Descricao' }),
      tamanhos: this.tamanhosApi.list({ ordering: 'Tamanho' })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.estoques = this.unwrap<Estoque>(res.estoque);
        this.movimentos = this.unwrap<EstoqueMovimentacao>(res.movimentos);
        this.produtos = this.unwrap<Produto>(res.produtos);
        this.colecoes = this.unwrap<Colecao>(res.colecoes);
        this.skus = this.unwrap<ProdutoSku>(res.skus);
        this.cores = this.unwrap<Cor>(res.cores);
        this.tamanhos = this.unwrap<TamanhoModel>(res.tamanhos);
        this.montarMatrizReferencia();
        this.montarMatrizColecao();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao consultar estoque.';
      }
    });
  }

  clearFilters(): void {
    this.search = '';
    this.loja = '';
    this.colecao = '';
    this.estacao = '';
    this.filtroSaldo = 'todos';
    this.load();
  }

  private produtoSugestao(produto: Produto): string | null {
    const referencia = produto.referencia || '';
    if (!referencia) return null;
    const descricao = produto.descricao_reduzida || produto.descricao || '';
    return descricao ? `${referencia} - ${descricao}` : referencia;
  }

  private normalizarBuscaReferencia(valor: string): string {
    const termo = valor.includes(' - ') ? valor.split(' - ')[0].trim() : valor;
    const normalizado = this.normalizarTexto(termo);
    const produto = this.produtos.find(p =>
      this.normalizarTexto(p.referencia).includes(normalizado) ||
      this.normalizarTexto(p.descricao).includes(normalizado) ||
      this.normalizarTexto(p.descricao_reduzida).includes(normalizado)
    );
    if (produto?.referencia) return produto.referencia;
    const sku = this.skus.find(s =>
      this.normalizarTexto(s.ean13).includes(normalizado) ||
      this.normalizarTexto(s.codigo_item_ref).includes(normalizado)
    );
    return sku?.codigo_item_ref || termo;
  }

  private normalizarTexto(valor: unknown): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  lojaNome(id: number): string {
    return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`;
  }

  saldoDisponivel(item: Estoque): number {
    return Number(item.Estoque || 0) - Number(item.reserva || 0);
  }

  movimentoQuantidade(item: EstoqueMovimentacao): number {
    return Number(item.quantidade || 0);
  }

  movimentoData(item: EstoqueMovimentacao): string {
    if (!item.data_movimento) return '';
    return new Date(item.data_movimento).toLocaleString('pt-BR');
  }

  corNome(id: number): string {
    if (!id) return 'Sem cor';
    const cor = this.cores.find(c => c.Idcor === id);
    return cor?.Descricao || cor?.Cor || `Cor #${id}`;
  }

  tamanhoNome(id: number): string {
    if (!id) return 'Sem tamanho';
    return this.tamanhos.find(t => t.Idtamanho === id)?.Tamanho || `Tam #${id}`;
  }

  matrizSaldo(row: MatrizRow, tamanhoId: number): number {
    return row.saldos[tamanhoId] || 0;
  }

  matrizTemDados(): boolean {
    return this.matrizRows.length > 0 && this.matrizTamanhos.length > 0;
  }

  isMatriz(): boolean {
    return this.modo === 'matriz';
  }

  isMovimentos(): boolean {
    return this.modo === 'movimentos';
  }

  isColecao(): boolean {
    return this.modo === 'colecao';
  }

  tituloConsulta(): string {
    if (this.isMovimentos()) return 'Movimentação por Referência';
    if (this.modo === 'colecao') return 'Consulta por Coleção/Estação';
    return 'Consulta por Referência';
  }

  colecaoSelecionadaLabel(): string {
    const id = Number(this.colecao || 0);
    const colecao = this.colecoes.find(c => c.Idcolecao === id);
    if (!colecao) return '';
    return `${colecao.Codigo || ''} - ${colecao.Descricao || ''}`.trim();
  }

  colecaoTemDados(): boolean {
    return this.colecaoRows.length > 0 && this.colecaoLojaIds.length > 0;
  }

  colecaoSaldo(row: ColecaoReferenciaRow, lojaId: number): number {
    return row.saldos[lojaId] || 0;
  }

  onColecaoChange(): void {
    this.produtoReferencia = '';
    this.produtosColecao = this.produtosDaColecaoSelecionada();
  }

  exportarCsv(): void {
    const isColecao = this.isColecao();
    const headers = isColecao
      ? ['Referencia', 'Produto', ...this.colecaoLojaIds.map(id => this.lojaNome(id)), 'Total']
      : ['Loja', 'Cor', ...this.matrizTamanhos.map(t => t.label), 'Total'];

    const rows = isColecao
      ? this.colecaoRows.map(row => [
          row.referencia,
          row.produto,
          ...this.colecaoLojaIds.map(lojaId => this.colecaoSaldo(row, lojaId)),
          row.total
        ])
      : this.matrizRows.map(row => [
          row.loja,
          row.cor,
          ...this.matrizTamanhos.map(t => this.matrizSaldo(row, t.id)),
          row.total
        ]);

    if (!rows.length) return;

    const csv = [headers, ...rows]
      .map(row => row.map(value => this.csvCell(value)).join(';'))
      .join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${isColecao ? 'estoque-colecao' : 'estoque-referencia'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private montarMatrizReferencia(): void {
    this.matrizTamanhos = [];
    this.matrizRows = [];
    this.matrizTotais = {};
    this.matrizTotalGeral = 0;
    this.referenciasMatriz = [];

    const termo = this.search.trim().toLowerCase();
    if (!termo) return;

    const estoqueFiltrado = this.estoques.filter(e => (e.referencia || '').toLowerCase().includes(termo));
    const eansEstoque = new Set(estoqueFiltrado.map(e => e.CodigodeBarra));
    const skusDaReferencia = this.skus.filter(s =>
      eansEstoque.has(s.ean13) ||
      (s.codigo_item_ref || '').toLowerCase().includes(termo)
    );

    const skuPorEan = new Map(this.skus.map(s => [s.ean13, s]));
    const tamanhoIds = new Set<number>();
    const corIds = new Set<number>();
    skusDaReferencia.forEach(s => {
      if (s.idtamanho) tamanhoIds.add(s.idtamanho);
      if (s.idcor) corIds.add(s.idcor);
    });
    estoqueFiltrado.forEach(e => {
      const sku = skuPorEan.get(e.CodigodeBarra);
      if (sku?.idtamanho) tamanhoIds.add(sku.idtamanho);
      if (sku?.idcor) corIds.add(sku.idcor);
    });

    this.referenciasMatriz = Array.from(new Set(estoqueFiltrado.map(e => e.referencia).filter(Boolean))).sort();
    this.matrizTamanhos = Array.from(tamanhoIds)
      .map(id => ({ id, label: this.tamanhoNome(id) }))
      .sort((a, b) => this.ordenarTexto(a.label, b.label));

    const lojaIds = this.loja
      ? [Number(this.loja)]
      : Array.from(new Set([
          ...estoqueFiltrado.map(e => e.Idloja),
          ...this.lojas.map(l => l.id).filter((id): id is number => id != null)
        ]));

    const rowMap = new Map<string, MatrizRow>();
    const garantirRow = (lojaId: number, corId: number): MatrizRow => {
      const key = `${lojaId}|${corId}`;
      let row = rowMap.get(key);
      if (!row) {
        row = {
          lojaId,
          loja: this.lojaNome(lojaId),
          corId,
          cor: this.corNome(corId),
          saldos: {},
          total: 0
        };
        this.matrizTamanhos.forEach(t => row!.saldos[t.id] = 0);
        rowMap.set(key, row);
      }
      return row;
    };

    lojaIds.forEach(lojaId => {
      corIds.forEach(corId => garantirRow(lojaId, corId));
    });

    estoqueFiltrado.forEach(e => {
      const sku = skuPorEan.get(e.CodigodeBarra);
      const tamanhoId = sku?.idtamanho || 0;
      const corId = sku?.idcor || 0;
      if (!tamanhoId) return;

      if (!this.matrizTamanhos.some(t => t.id === tamanhoId)) {
        this.matrizTamanhos.push({ id: tamanhoId, label: this.tamanhoNome(tamanhoId) });
        this.matrizTamanhos.sort((a, b) => this.ordenarTexto(a.label, b.label));
        rowMap.forEach(row => row.saldos[tamanhoId] = row.saldos[tamanhoId] || 0);
      }

      const row = garantirRow(e.Idloja, corId);
      row.saldos[tamanhoId] = (row.saldos[tamanhoId] || 0) + this.saldoDisponivel(e);
    });

    this.matrizRows = Array.from(rowMap.values())
      .map(row => {
        row.total = this.matrizTamanhos.reduce((sum, t) => sum + (row.saldos[t.id] || 0), 0);
        return row;
      })
      .filter(row => this.passaFiltroSaldo(row.total))
      .sort((a, b) => this.ordenarTexto(a.loja, b.loja) || this.ordenarTexto(a.cor, b.cor));

    this.matrizTotais = {};
    this.matrizTamanhos.forEach(t => {
      this.matrizTotais[t.id] = this.matrizRows.reduce((sum, row) => sum + (row.saldos[t.id] || 0), 0);
    });
    this.matrizTotalGeral = this.matrizRows.reduce((sum, row) => sum + row.total, 0);
  }

  private montarMatrizColecao(): void {
    this.produtosColecao = [];
    this.colecaoRows = [];
    this.colecaoLojaIds = [];
    this.colecaoTotaisLoja = {};
    this.colecaoTotalGeral = 0;

    if (this.modo !== 'colecao' || !this.colecao) return;

    this.produtosColecao = this.produtosDaColecaoSelecionada();

    const referenciasPermitidas = new Set(this.produtosColecao.map(p => p.referencia || ''));
    const referenciaFiltro = this.produtoReferencia || '';
    const estoquesColecao = this.estoques.filter(e =>
      referenciasPermitidas.has(e.referencia || '') &&
      (!this.loja || e.Idloja === Number(this.loja)) &&
      (!referenciaFiltro || e.referencia === referenciaFiltro)
    );

    this.colecaoLojaIds = this.loja
      ? [Number(this.loja)]
      : Array.from(new Set([
          ...this.lojas.map(l => l.id).filter((id): id is number => id != null),
          ...estoquesColecao.map(e => e.Idloja)
        ]))
          .sort((a, b) => this.ordenarTexto(this.lojaNome(a), this.lojaNome(b)));

    const produtoPorRef = new Map(this.produtosColecao.map(p => [p.referencia || '', p]));
    const rowMap = new Map<string, ColecaoReferenciaRow>();

    const referencias = Array.from(new Set([
      ...this.produtosColecao.map(p => p.referencia || '').filter(Boolean),
      ...estoquesColecao.map(e => e.referencia || '').filter(Boolean)
    ])).filter(ref => !referenciaFiltro || ref === referenciaFiltro);

    referencias.forEach(ref => {
      const produto = produtoPorRef.get(ref);
      const row: ColecaoReferenciaRow = {
        referencia: ref,
        produto: produto?.descricao_reduzida || produto?.descricao || '',
        saldos: {},
        total: 0
      };
      this.colecaoLojaIds.forEach(lojaId => row.saldos[lojaId] = 0);
      rowMap.set(ref, row);
    });

    estoquesColecao.forEach(e => {
      const row = rowMap.get(e.referencia || '');
      if (!row) return;
      row.saldos[e.Idloja] = (row.saldos[e.Idloja] || 0) + this.saldoDisponivel(e);
    });

    this.colecaoRows = Array.from(rowMap.values())
      .map(row => {
        row.total = this.colecaoLojaIds.reduce((sum, lojaId) => sum + (row.saldos[lojaId] || 0), 0);
        return row;
      })
      .filter(row => this.passaFiltroSaldo(row.total))
      .sort((a, b) => this.ordenarTexto(a.referencia, b.referencia));

    this.colecaoLojaIds.forEach(lojaId => {
      this.colecaoTotaisLoja[lojaId] = this.colecaoRows.reduce((sum, row) => sum + (row.saldos[lojaId] || 0), 0);
    });
    this.colecaoTotalGeral = this.colecaoRows.reduce((sum, row) => sum + row.total, 0);
  }

  private ordenarTexto(a: string, b: string): number {
    return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
  }

  private passaFiltroSaldo(total: number): boolean {
    if (this.filtroSaldo === 'com_saldo') return total > 0;
    if (this.filtroSaldo === 'zerados') return total === 0;
    return true;
  }

  private csvCell(value: string | number): string {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  private produtosDaColecaoSelecionada(): Produto[] {
    const colecaoId = Number(this.colecao || 0);
    if (!colecaoId) return [];

    return this.produtos
      .filter(p => Number(p.colecao || 0) === colecaoId && !!p.referencia)
      .sort((a, b) => this.ordenarTexto(a.referencia || '', b.referencia || ''));
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }
}
