import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
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

interface MatrizSaldo {
  fisico: number;
  reservado: number;
  disponivel: number;
}

interface MatrizRow {
  lojaId: number;
  loja: string;
  corId: number;
  cor: string;
  saldos: Record<number, MatrizSaldo>;
  total: MatrizSaldo;
}

interface ColecaoReferenciaRow {
  referencia: string;
  produto: string;
  saldos: Record<number, MatrizSaldo>;
  total: MatrizSaldo;
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
  tipo = '';
  dataInicio = '';
  dataFim = '';
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
  matrizTotais: Record<number, MatrizSaldo> = {};
  matrizTotalGeral: MatrizSaldo = this.saldoVazio();
  referenciasMatriz: string[] = [];
  modo: 'matriz' | 'movimentos' | 'colecao' = 'matriz';
  produtoReferencia = '';
  filtroSaldo: 'todos' | 'com_saldo' | 'zerados' = 'todos';
  produtosColecao: Produto[] = [];
  colecaoRows: ColecaoReferenciaRow[] = [];
  colecaoLojaIds: number[] = [];
  colecaoTotaisLoja: Record<number, MatrizSaldo> = {};
  colecaoTotalGeral: MatrizSaldo = this.saldoVazio();

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

  get estacoesColecao(): string[] {
    return Array.from(new Set(this.colecoes.map(c => c.Estacao || '').filter(Boolean)))
      .sort((a, b) => this.ordenarTexto(a, b));
  }

  get colecoesFiltradas(): Colecao[] {
    return this.colecoes
      .filter(c => !this.estacao || c.Estacao === this.estacao)
      .sort((a, b) => this.ordenarTexto(a.Codigo || '', b.Codigo || '') || this.ordenarTexto(a.Descricao || '', b.Descricao || ''));
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
    const colecaoSelecionada = this.colecoes.find(c => c.Idcolecao === Number(this.colecao || 0));
    const estoqueParams = this.isColecao()
      ? { loja: this.loja, colecao: colecaoSelecionada?.Codigo || '', estacao: this.estacao, page_size: 1000 }
      : { search: this.search, loja: this.loja, colecao: this.colecao, estacao: this.estacao, page_size: 1000 };
    const produtoParams = this.isColecao()
      ? { ativo: 'true' as const, colecao: this.colecao, page_size: 1000 }
      : { ativo: 'true' as const, search: this.search, page_size: 500 };
    const skuParams = { search: this.search, page_size: 1000 };

    forkJoin({
      lojas: this.lojasApi.list({ page_size: 500 }),
      estoque: this.isMovimentos() ? of([]) : this.api.list(estoqueParams),
      movimentos: this.isMovimentos() ? this.api.listMovimentacoes({
        search: this.search,
        loja: this.loja,
        tipo: this.tipo,
        data_inicio: this.dataInicio,
        data_fim: this.dataFim,
        page_size: 1000
      }) : of([]),
      produtos: this.isMovimentos() ? of([]) : this.produtosApi.list(produtoParams),
      colecoes: this.isColecao() ? this.colecoesApi.list() : of([]),
      skus: this.isColecao() ? of([]) : this.skusApi.list(skuParams),
      cores: this.isMatriz() ? this.coresApi.list({ page_size: 1000, ordering: 'Descricao' }) : of([]),
      tamanhos: this.isMatriz() ? this.tamanhosApi.list({ ordering: 'Tamanho' }) : of([])
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
        this.produtosColecao = this.produtosDaColecaoSelecionada();
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
    this.tipo = '';
    this.dataInicio = '';
    this.dataFim = '';
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
    const termo = (valor.includes(' - ') ? valor.split(' - ')[0] : valor).trim();
    const normalizado = this.normalizarTexto(termo);
    if (!normalizado) return '';

    const produto = this.produtos.find(p => this.normalizarTexto(p.referencia) === normalizado);
    if (produto?.referencia) return produto.referencia;

    const skuPorEan = this.skus.find(s => this.normalizarTexto(s.ean13) === normalizado);
    if (skuPorEan?.ean13) return skuPorEan.ean13;

    const skuPorCodigo = this.skus.find(s => this.normalizarTexto(s.codigo_item_ref) === normalizado);
    if (skuPorCodigo?.codigo_item_ref) return skuPorCodigo.codigo_item_ref;

    const estoque = this.estoques.find(e =>
      this.normalizarTexto(e.referencia) === normalizado ||
      this.normalizarTexto(e.CodigodeBarra) === normalizado
    );
    if (estoque?.referencia && this.normalizarTexto(estoque.referencia) === normalizado) return estoque.referencia;
    if (estoque?.CodigodeBarra && this.normalizarTexto(estoque.CodigodeBarra) === normalizado) return estoque.CodigodeBarra;

    return termo;
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

  saldoFisico(item: Estoque): number {
    return Number(item.Estoque || 0);
  }

  saldoReservado(item: Estoque): number {
    return Number(item.reserva || 0);
  }

  movimentoQuantidade(item: EstoqueMovimentacao): number {
    return Number(item.quantidade || 0);
  }

  movimentoSaldo(value: number | string | null | undefined): number {
    return Number(value || 0);
  }

  movimentoOrigem(item: EstoqueMovimentacao): string {
    const labels: Record<string, string> = {
      NFE: 'NF-e',
      VENDA: 'Venda',
      DEVOLUCAO: 'Devolução',
      TRANSFERENCIA: 'Transferência',
      INVENTARIO: 'Inventário',
      PRODUCAO: 'Produção',
      AJUSTE_MANUAL: 'Ajuste manual'
    };
    return item.origem ? (labels[item.origem] || item.origem) : '-';
  }

  movimentoCor(item: EstoqueMovimentacao): string {
    if (item.cor) return item.cor;
    const sku = this.skus.find(s => s.ean13 === item.CodigodeBarra);
    return sku?.cor_descricao || '-';
  }

  movimentoTamanho(item: EstoqueMovimentacao): string {
    if (item.tamanho) return item.tamanho;
    const sku = this.skus.find(s => s.ean13 === item.CodigodeBarra);
    return sku?.tamanho_descricao || '-';
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

  matrizSaldo(row: MatrizRow, tamanhoId: number): MatrizSaldo {
    return row.saldos[tamanhoId] || this.saldoVazio();
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

  colecaoSaldo(row: ColecaoReferenciaRow, lojaId: number): MatrizSaldo {
    return row.saldos[lojaId] || this.saldoVazio();
  }

  onEstacaoChange(): void {
    if (this.colecao && !this.colecoesFiltradas.some(c => c.Idcolecao === Number(this.colecao))) {
      this.colecao = '';
      this.produtoReferencia = '';
    }
    this.produtosColecao = this.produtosDaColecaoSelecionada();
    if (this.produtoReferencia && !this.produtosColecao.some(p => p.referencia === this.produtoReferencia)) {
      this.produtoReferencia = '';
    }
  }

  onColecaoChange(): void {
    this.produtosColecao = this.produtosDaColecaoSelecionada();
    if (this.produtoReferencia && !this.produtosColecao.some(p => p.referencia === this.produtoReferencia)) {
      this.produtoReferencia = '';
    }
  }

  exportarCsv(): void {
    const isColecao = this.isColecao();
    const headers = isColecao
      ? ['Referencia', 'Produto', ...this.colecaoLojaIds.flatMap(id => [`${this.lojaNome(id)} Físico`, `${this.lojaNome(id)} Reservado`, `${this.lojaNome(id)} Disponível`]), 'Total Físico', 'Total Reservado', 'Total Disponível']
      : ['Loja', 'Cor', ...this.matrizTamanhos.flatMap(t => [`${t.label} Físico`, `${t.label} Reservado`, `${t.label} Disponível`]), 'Total Físico', 'Total Reservado', 'Total Disponível'];

    const rows = isColecao
      ? this.colecaoRows.map(row => [
          row.referencia,
          row.produto,
          ...this.colecaoLojaIds.flatMap(lojaId => {
            const saldo = this.colecaoSaldo(row, lojaId);
            return [saldo.fisico, saldo.reservado, saldo.disponivel];
          }),
          row.total.fisico,
          row.total.reservado,
          row.total.disponivel
        ])
      : this.matrizRows.map(row => [
          row.loja,
          row.cor,
          ...this.matrizTamanhos.flatMap(t => {
            const saldo = this.matrizSaldo(row, t.id);
            return [saldo.fisico, saldo.reservado, saldo.disponivel];
          }),
          row.total.fisico,
          row.total.reservado,
          row.total.disponivel
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
    this.matrizTotalGeral = this.saldoVazio();
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
          total: this.saldoVazio()
        };
        this.matrizTamanhos.forEach(t => row!.saldos[t.id] = this.saldoVazio());
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
        rowMap.forEach(row => row.saldos[tamanhoId] = row.saldos[tamanhoId] || this.saldoVazio());
      }

      const row = garantirRow(e.Idloja, corId);
      const saldo = row.saldos[tamanhoId] || this.saldoVazio();
      row.saldos[tamanhoId] = {
        fisico: saldo.fisico + this.saldoFisico(e),
        reservado: saldo.reservado + this.saldoReservado(e),
        disponivel: saldo.disponivel + this.saldoDisponivel(e)
      };
    });

    this.matrizRows = Array.from(rowMap.values())
      .map(row => {
        row.total = this.matrizTamanhos.reduce((sum, t) => this.somarSaldos(sum, row.saldos[t.id]), this.saldoVazio());
        return row;
      })
      .filter(row => this.passaFiltroSaldo(row.total.disponivel))
      .sort((a, b) => this.ordenarTexto(a.loja, b.loja) || this.ordenarTexto(a.cor, b.cor));

    this.matrizTotais = {};
    this.matrizTamanhos.forEach(t => {
      this.matrizTotais[t.id] = this.matrizRows.reduce((sum, row) => this.somarSaldos(sum, row.saldos[t.id]), this.saldoVazio());
    });
    this.matrizTotalGeral = this.matrizRows.reduce((sum, row) => this.somarSaldos(sum, row.total), this.saldoVazio());
  }

  private montarMatrizColecao(): void {
    this.produtosColecao = [];
    this.colecaoRows = [];
    this.colecaoLojaIds = [];
    this.colecaoTotaisLoja = {};
    this.colecaoTotalGeral = this.saldoVazio();

    if (this.modo !== 'colecao' || (!this.estacao && !this.colecao)) return;

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
        total: this.saldoVazio()
      };
      this.colecaoLojaIds.forEach(lojaId => row.saldos[lojaId] = this.saldoVazio());
      rowMap.set(ref, row);
    });

    estoquesColecao.forEach(e => {
      const row = rowMap.get(e.referencia || '');
      if (!row) return;
      const saldo = row.saldos[e.Idloja] || this.saldoVazio();
      row.saldos[e.Idloja] = {
        fisico: saldo.fisico + this.saldoFisico(e),
        reservado: saldo.reservado + this.saldoReservado(e),
        disponivel: saldo.disponivel + this.saldoDisponivel(e)
      };
    });

    this.colecaoRows = Array.from(rowMap.values())
      .map(row => {
        row.total = this.colecaoLojaIds.reduce((sum, lojaId) => this.somarSaldos(sum, row.saldos[lojaId]), this.saldoVazio());
        return row;
      })
      .filter(row => this.passaFiltroSaldo(row.total.disponivel))
      .sort((a, b) => this.ordenarTexto(a.referencia, b.referencia));

    this.colecaoLojaIds.forEach(lojaId => {
      this.colecaoTotaisLoja[lojaId] = this.colecaoRows.reduce((sum, row) => this.somarSaldos(sum, row.saldos[lojaId]), this.saldoVazio());
    });
    this.colecaoTotalGeral = this.colecaoRows.reduce((sum, row) => this.somarSaldos(sum, row.total), this.saldoVazio());
  }

  private ordenarTexto(a: string, b: string): number {
    return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
  }

  private passaFiltroSaldo(total: number): boolean {
    if (this.filtroSaldo === 'com_saldo') return total > 0;
    if (this.filtroSaldo === 'zerados') return total === 0;
    return true;
  }

  private saldoVazio(): MatrizSaldo {
    return { fisico: 0, reservado: 0, disponivel: 0 };
  }

  private somarSaldos(a: MatrizSaldo, b?: MatrizSaldo): MatrizSaldo {
    return {
      fisico: a.fisico + (b?.fisico || 0),
      reservado: a.reservado + (b?.reservado || 0),
      disponivel: a.disponivel + (b?.disponivel || 0)
    };
  }

  private csvCell(value: string | number): string {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  private produtosDaColecaoSelecionada(): Produto[] {
    const colecaoId = Number(this.colecao || 0);

    return this.produtos
      .filter(p => {
        if (!p.referencia) return false;
        if (colecaoId) return Number(p.colecao || 0) === colecaoId;
        const colecao = this.colecoes.find(c => c.Idcolecao === Number(p.colecao || 0));
        return !this.estacao || colecao?.Estacao === this.estacao;
      })
      .sort((a, b) => this.ordenarTexto(a.referencia || '', b.referencia || ''));
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }
}
