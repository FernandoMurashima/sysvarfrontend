import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import * as XLSX from 'xlsx';
import { Colecao } from '../../core/models/colecao';
import { Cor } from '../../core/models/cor';
import { Estoque, EstoqueConsultaColecaoItem, EstoqueConsultaReferenciaItem, EstoqueMovimentacao } from '../../core/models/estoque';
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

type ExcelCell = string | number;

interface ExcelExportData {
  headers: ExcelCell[];
  rows: ExcelCell[][];
  filename: string;
  sheetName: string;
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
  consultaReferenciaRows: EstoqueConsultaReferenciaItem[] = [];
  consultaColecaoRowsApi: EstoqueConsultaColecaoItem[] = [];
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
    if (this.isMatriz() && (this.loja || this.colecao)) {
      const valoresLoja = [
        ...this.estoques.flatMap(e => [
          e.referencia,
          e.CodigodeBarra
        ]),
        ...this.consultaReferenciaRows.flatMap(e => [
          e.referencia,
          e.ean
        ])
      ].filter((v): v is string => !!v);
      return Array.from(new Set(valoresLoja));
    }

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
    const consultaReferenciaParams = { search: this.search, loja: this.loja, saldo: this.filtroSaldo, colecao: this.colecao };
    const consultaColecaoParams = {
      estacao: this.estacao,
      colecao: this.colecao,
      referencia: this.produtoReferencia,
      loja: this.loja,
      saldo: this.filtroSaldo
    };
    const produtoParams = this.isColecao()
      ? { ativo: 'true' as const, colecao: this.colecao, page_size: 1000 }
      : { ativo: 'true' as const, search: this.search, page_size: 500 };
    const skuParams = { search: this.search, page_size: 1000 };

    forkJoin({
      lojas: this.lojasApi.list({ page_size: 500 }),
      estoque: this.isMatriz() && !!this.loja ? this.api.list({ loja: this.loja, search: this.search, colecao: this.colecao, page_size: 500 }) : of([]),
      consultaReferencia: this.isMatriz() ? this.api.consultaReferencia(consultaReferenciaParams) : of([]),
      consultaColecao: this.isColecao() ? this.api.consultaColecao(consultaColecaoParams) : of([]),
      movimentos: this.isMovimentos() ? this.api.listMovimentacoes({
        search: this.search,
        loja: this.loja,
        tipo: this.tipo,
        data_inicio: this.dataInicio,
        data_fim: this.dataFim,
        page_size: 1000
      }) : of([]),
      produtos: this.isMovimentos() ? of([]) : this.produtosApi.list(produtoParams),
      colecoes: !this.isMovimentos() ? this.colecoesApi.list() : of([]),
      skus: this.isColecao() ? of([]) : this.skusApi.list(skuParams),
      cores: this.isMatriz() ? this.coresApi.list({ page_size: 1000, ordering: 'Descricao' }) : of([]),
      tamanhos: this.isMatriz() ? this.tamanhosApi.list({ ordering: 'Tamanho' }) : of([])
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.estoques = this.unwrap<Estoque>(res.estoque);
        this.consultaReferenciaRows = this.unwrap<EstoqueConsultaReferenciaItem>(res.consultaReferencia);
        this.consultaColecaoRowsApi = this.unwrap<EstoqueConsultaColecaoItem>(res.consultaColecao);
        this.movimentos = this.unwrap<EstoqueMovimentacao>(res.movimentos);
        this.produtos = this.unwrap<Produto>(res.produtos);
        this.colecoes = this.unwrap<Colecao>(res.colecoes);
        this.skus = this.unwrap<ProdutoSku>(res.skus);
        this.cores = this.unwrap<Cor>(res.cores);
        this.tamanhos = this.unwrap<TamanhoModel>(res.tamanhos);
        this.produtosColecao = this.produtosDaColecaoSelecionada();
        this.montarMatrizReferencia();
        this.montarMatrizColecao();
        if (this.isMatriz() && this.loja && this.search && !this.referenciaExisteNaLojaSelecionada()) {
          this.search = '';
          this.load();
          return;
        }
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

  onLojaChange(): void {
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

  exportarExcel(): void {
    const exportData = this.montarDadosExportacaoExcel();
    if (!exportData.rows.length) return;

    const worksheet = XLSX.utils.aoa_to_sheet([exportData.headers, ...exportData.rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, exportData.sheetName);
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportData.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private montarDadosExportacaoExcel(): ExcelExportData {
    if (this.isMovimentos()) {
      return {
        headers: ['Data', 'Loja', 'Tipo', 'Referência', 'EAN', 'Cor', 'Tamanho', 'Quantidade', 'Saldo anterior', 'Saldo posterior', 'Origem', 'Documento', 'Observação'],
        rows: this.movimentos.map(m => [
          this.movimentoData(m),
          this.lojaNome(m.Idloja),
          m.tipo,
          m.referencia || '-',
          m.CodigodeBarra || '-',
          this.movimentoCor(m),
          this.movimentoTamanho(m),
          this.movimentoQuantidade(m),
          this.movimentoSaldo(m.saldo_anterior),
          this.movimentoSaldo(m.saldo_posterior),
          this.movimentoOrigem(m),
          m.documento || '-',
          m.observacao || '-'
        ]),
        filename: 'estoque-movimentacao.xlsx',
        sheetName: 'Movimentacoes'
      };
    }

    if (this.isColecao()) {
      return {
        headers: ['Referencia', 'Produto', ...this.colecaoLojaIds.flatMap(id => [`${this.lojaNome(id)} Físico`, `${this.lojaNome(id)} Reservado`, `${this.lojaNome(id)} Disponível`]), 'Total Físico', 'Total Reservado', 'Total Disponível'],
        rows: this.colecaoRows.map(row => [
          row.referencia,
          row.produto,
          ...this.colecaoLojaIds.flatMap(lojaId => {
            const saldo = this.colecaoSaldo(row, lojaId);
            return [saldo.fisico, saldo.reservado, saldo.disponivel];
          }),
          row.total.fisico,
          row.total.reservado,
          row.total.disponivel
        ]),
        filename: 'estoque-colecao.xlsx',
        sheetName: 'Colecao'
      };
    }

    return {
      headers: ['Loja', 'Cor', ...this.matrizTamanhos.flatMap(t => [`${t.label} Físico`, `${t.label} Reservado`, `${t.label} Disponível`]), 'Total Físico', 'Total Reservado', 'Total Disponível'],
      rows: this.matrizRows.map(row => [
        row.loja,
        row.cor,
        ...this.matrizTamanhos.flatMap(t => {
          const saldo = this.matrizSaldo(row, t.id);
          return [saldo.fisico, saldo.reservado, saldo.disponivel];
        }),
        row.total.fisico,
        row.total.reservado,
        row.total.disponivel
      ]),
      filename: 'estoque-referencia.xlsx',
      sheetName: 'Referencia'
    };
  }

  private montarMatrizReferencia(): void {
    this.matrizTamanhos = [];
    this.matrizRows = [];
    this.matrizTotais = {};
    this.matrizTotalGeral = this.saldoVazio();
    this.referenciasMatriz = [];

    const tamanhoIds = new Set<number>();
    const corIds = new Set<number>();
    const corKeyPorNome = new Map<string, number>();
    const tamanhoKeyPorNome = new Map<string, number>();
    this.consultaReferenciaRows.forEach(e => {
      const corNome = e.cor || 'Sem cor';
      const tamanhoNome = e.tamanho || 'Sem tamanho';
      if (!corKeyPorNome.has(corNome)) corKeyPorNome.set(corNome, corKeyPorNome.size + 1);
      if (!tamanhoKeyPorNome.has(tamanhoNome)) tamanhoKeyPorNome.set(tamanhoNome, tamanhoKeyPorNome.size + 1);
      corIds.add(corKeyPorNome.get(corNome)!);
      tamanhoIds.add(tamanhoKeyPorNome.get(tamanhoNome)!);
    });

    this.referenciasMatriz = Array.from(new Set(this.consultaReferenciaRows.map(e => e.referencia).filter(Boolean))).sort();
    this.matrizTamanhos = Array.from(tamanhoKeyPorNome.entries())
      .map(([label, id]) => ({ id, label }))
      .sort((a, b) => this.ordenarTexto(a.label, b.label));

    const lojaIds = this.loja
      ? [Number(this.loja)]
      : Array.from(new Set([
          ...this.consultaReferenciaRows.map(e => e.loja),
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
          cor: Array.from(corKeyPorNome.entries()).find(([, id]) => id === corId)?.[0] || 'Sem cor',
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

    this.consultaReferenciaRows.forEach(e => {
      const tamanhoId = tamanhoKeyPorNome.get(e.tamanho || 'Sem tamanho') || 0;
      const corId = corKeyPorNome.get(e.cor || 'Sem cor') || 0;
      const row = garantirRow(e.loja, corId);
      const saldo = row.saldos[tamanhoId] || this.saldoVazio();
      row.saldos[tamanhoId] = {
        fisico: saldo.fisico + Number(e.fisico || 0),
        reservado: saldo.reservado + Number(e.reservado || 0),
        disponivel: saldo.disponivel + Number(e.disponivel || 0)
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

    const referenciaFiltro = this.produtoReferencia || '';
    const produtoMetaPorRef = new Map(this.produtos.map(p => [p.referencia || '', p]));
    const estoquesColecao = this.consultaColecaoRowsApi.filter(e =>
      (!this.loja || e.loja === Number(this.loja)) &&
      (!referenciaFiltro || e.referencia === referenciaFiltro) &&
      this.produtoCompatívelComFiltrosColecao(produtoMetaPorRef.get(e.referencia || ''))
    );

    this.colecaoLojaIds = this.loja
      ? [Number(this.loja)]
      : Array.from(new Set([
          ...this.lojas.map(l => l.id).filter((id): id is number => id != null),
          ...estoquesColecao.map(e => e.loja)
        ]))
          .sort((a, b) => this.ordenarTexto(this.lojaNome(a), this.lojaNome(b)));

    const produtoPorRef = new Map(this.produtosColecao.map(p => [p.referencia || '', p]));
    const produtoApiPorRef = new Map(estoquesColecao.map(e => [e.referencia || '', e.produto || '']));
    const rowMap = new Map<string, ColecaoReferenciaRow>();

    const referencias = Array.from(new Set([
      ...this.produtosColecao.map(p => p.referencia || '').filter(Boolean),
      ...estoquesColecao.map(e => e.referencia || '').filter(Boolean)
    ])).filter(ref => !referenciaFiltro || ref === referenciaFiltro);

    referencias.forEach(ref => {
      const produto = produtoPorRef.get(ref);
      const row: ColecaoReferenciaRow = {
        referencia: ref,
        produto: produto?.descricao_reduzida || produto?.descricao || produtoApiPorRef.get(ref) || '',
        saldos: {},
        total: this.saldoVazio()
      };
      this.colecaoLojaIds.forEach(lojaId => row.saldos[lojaId] = this.saldoVazio());
      rowMap.set(ref, row);
    });

    estoquesColecao.forEach(e => {
      const row = rowMap.get(e.referencia || '');
      if (!row) return;
      const saldo = row.saldos[e.loja] || this.saldoVazio();
      row.saldos[e.loja] = {
        fisico: saldo.fisico + Number(e.fisico || 0),
        reservado: saldo.reservado + Number(e.reservado || 0),
        disponivel: saldo.disponivel + Number(e.disponivel || 0)
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

  private referenciaExisteNaLojaSelecionada(): boolean {
    if (!this.loja || !this.search.trim()) return true;
    const lojaId = Number(this.loja);
    const termo = this.normalizarTexto(this.search);
    return [...this.estoques, ...this.consultaReferenciaRows.map(row => ({
      referencia: row.referencia,
      CodigodeBarra: row.ean,
      Idloja: row.loja,
      Estoque: row.fisico,
      reserva: row.reservado
    } as Estoque))].some(item =>
      Number(item.Idloja) === lojaId &&
      (
        this.normalizarTexto(item.referencia) === termo ||
        this.normalizarTexto(item.CodigodeBarra) === termo
      )
    );
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

  private produtoCompatívelComFiltrosColecao(produto?: Produto): boolean {
    if (!produto) return true;
    if (this.colecao && Number(produto.colecao || 0) !== Number(this.colecao)) return false;
    if (!this.estacao) return true;
    const colecao = this.colecoes.find(c => c.Idcolecao === Number(produto.colecao || 0));
    return colecao?.Estacao === this.estacao;
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }
}
