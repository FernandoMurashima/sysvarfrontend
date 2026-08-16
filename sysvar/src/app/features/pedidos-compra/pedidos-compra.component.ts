// src/app/features/pedidos-compra/pedidos-compra.component.ts
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';

import { LojasService } from '../../core/services/lojas.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { PrazoPagamento } from '../../core/models/forma-pagamento';
import { PedidosCompraService } from '../../core/services/pedidos-compra.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { CoresService } from '../../core/services/cores.service';
import { PacksService } from '../../core/services/pack.service';
import { PackItensService } from '../../core/services/pack-item.service';
import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';
import { NatLancamento } from '../../core/models/natureza-lancamento';
import { UnidadesService } from '../../core/services/unidades.service';
import { Unidade } from '../../core/models/unidade';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RowAction, RowActionsMenuComponent } from '../../shared/components/row-actions-menu/row-actions-menu.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';

type Option = { id: number; label: string };
type FormaOption = { codigo: string; label: string; prazo?: number | null };
type PrazoOption = { id: number; label: string };
type CorOption = { id: number; label: string };
type PackOption = { id: number; label: string; grade: number };

interface PedidoCompraItemUI {
  id: number | null;
  pedido: number;
  produto: number | null;
  produto_referencia: string;
  cor: number | null;
  cor_nome: string;
  pack: number | null;
  pack_nome: string;
  n_packs: number;
  quantidade: number;
  preco_unit: number;
  desconto_valor: number;
  total_item: number;
  observacoes?: string | null;
  produto_tipo?: '' | '1' | '2' | '4';
  produto_label?: string;
  unidade_label?: string;
}

@Component({
  selector: 'app-pedidos-compra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, RowActionsMenuComponent, SummaryCardComponent],
  templateUrl: './pedidos-compra.component.html',
  styleUrls: ['./pedidos-compra.component.css'],
})
export class PedidosCompraComponent implements OnInit {
  private fb = inject(FormBuilder);
  private lojasApi = inject(LojasService);
  private formasApi = inject(FormasPagamentoService);
  private pedidosApi = inject(PedidosCompraService);
  private fornecedoresApi = inject(FornecedoresService);
  private produtosApi = inject(ProdutosService);
  private coresApi = inject(CoresService);
  private packsApi = inject(PacksService);
  private packItensApi = inject(PackItensService);
  private unidadesApi = inject(UnidadesService);
  private naturezasApi = inject(NatLancamentosService);
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('compras', true) !== false;
  }

  // navegação: list / form
  view = signal<'list' | 'form'>('list');
  setViewList() {
    this.view.set('list');
    this.pedidoAtualId.set(null);
    this.consultando = false;
    this.headerForm.enable({ emitEvent: false });
    this.itemForm.enable({ emitEvent: false });
  }
  setViewForm() {
    this.view.set('form');
  }

  // estado geral
  submitted = false;
  saving = false;
  consultando = false;
  loadingLookups = signal(false);
  loadingPedidos = false;
  successMsg = '';
  errorMsg = '';
  indicatorsVisible = true;
  filtersVisible = true;
  columnsOpen = false;
  filterStatus = '';
  private readonly columnsStorageKey = 'sysvar.list.pedidos-compra.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.pedidos-compra';
  columns = [
    { key: 'numero', label: 'Nº Pedido', visible: true, required: true },
    { key: 'tipo', label: 'Tipo', visible: true, required: false },
    { key: 'loja', label: 'Loja', visible: true, required: false },
    { key: 'fornecedor', label: 'Fornecedor', visible: true, required: false },
    { key: 'emissao', label: 'Emissão', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
    { key: 'natureza', label: 'Natureza', visible: true, required: false },
    { key: 'total', label: 'Total', visible: true, required: false },
  ];
  filterTipo = '';
  selectedPedido: any | null = null;
  confirmModal: {
    action: 'removerItem' | 'excluirPedido' | 'cancelarPedido';
    title: string;
    text: string;
    item?: PedidoCompraItemUI;
    pedido?: any;
  } | null = null;
  aprovarModal: { pedido: any; idnatureza: number | null } | null = null;
  naturezaModal: { pedido: any; idnatureza: number | null } | null = null;

  // lookups
  lojas: Option[] = [];
  fornecedores: Option[] = [];
  formas: FormaOption[] = [];
  prazos: PrazoOption[] = [];
  naturezasCompra: NatLancamento[] = [];
  unidades: Unidade[] = [];

  private lojaMap = new Map<number, string>();
  private fornecedorMap = new Map<number, string>();
  private unidadeMap = new Map<number, Unidade>();

  // Pedido atual
  pedidoAtualId = signal<number | null>(null);
  pedidoAtual: any | null = null;
  itensModalAberto = false;
  selectedItem: PedidoCompraItemUI | null = null;
  produtoSelecionado: any | null = null;

  // form de cabeçalho
  headerForm: FormGroup = this.fb.group({
    loja: [null, Validators.required],
    fornecedor: [null, Validators.required],
    emissao: [this.hojeISO(), Validators.required],
    previsao_entrega: [null],
    forma_pagamento_codigo: [null],
    prazo_pagamento: [null],
    frete: [0, [Validators.min(0)]],
    total_desconto: [0, [Validators.min(0)]],
    observacoes: [''],
  });

  // ===== Itens =====
  itemForm: FormGroup = this.fb.group({
    id: [null],
    produto_input: ['', Validators.required], // ref ou ID
    produto: [null, Validators.required],
    cor: [null],
    pack: [null],
    n_packs: [1],
    quantidade: [{ value: 0, disabled: false }],
    preco_unit: [0, [Validators.required, Validators.min(0)]],
    desconto_valor: [0],
    total_item: [{ value: 0, disabled: false }],
    observacoes: [''],
  });

  itens: PedidoCompraItemUI[] = [];
  loadingItens = false;
  savingItem = false;

  // produto / cor / pack auxiliares
  produtoDescricaoAtual = '';
  produtoGradeAtual: number | null = null;
  coresAll: CorOption[] = [];
  coresProduto: CorOption[] = [];
  packsProduto: PackOption[] = [];
  produtosSugestoes: any[] = [];
  produtoSugestoesAbertas = false;
  carregandoProdutosSugestoes = false;
  consultaProdutoAberta = false;
  produtoConsultaBusca = '';
  produtosConsulta: any[] = [];
  produtoConsultaId: number | null = null;
  carregandoProdutosConsulta = false;

  // quantidade de 1 pack (somatório dos itens do pack)
  private packQtdUnit = 0;

  // ===== lista de pedidos (client-side) =====
  search = '';
  pedidosAll: any[] = [];
  pedidosFiltered: any[] = [];
  pedidos: any[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];

  get total(): number {
    return this.pedidosFiltered.length;
  }
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }
  get pageStart(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }
  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }
  get searchSuggestions(): string[] {
    return this.pedidosAll.flatMap(p => [
      String(p.id ?? ''),
      this.labelLoja(p.loja),
      this.labelFornecedor(p.fornecedor),
      p.status,
      p.natureza_label,
    ].filter(Boolean));
  }
  get abertos(): number {
    return this.pedidosAll.filter(p => (p.status || '').toUpperCase() === 'AB').length;
  }
  get aprovados(): number {
    return this.pedidosAll.filter(p => (p.status || '').toUpperCase() === 'AP').length;
  }
  get atendidos(): number {
    return this.pedidosAll.filter(p => (p.status || '').toUpperCase() === 'AT').length;
  }
  get pendentesAprovacao(): number {
    return this.pedidosAll.filter(p => (p.status || '').toUpperCase() === 'AB' && Number(p.total_pedido || 0) > 0).length;
  }
  get valorTotalListado(): number {
    return this.pedidosFiltered.reduce((acc, p) => acc + Number(p.total_pedido || 0), 0);
  }
  get quantidadeTotalItens(): number {
    return this.itens.reduce((acc, it) => acc + Number(it.quantidade || 0), 0);
  }
  get totalItensResumo(): number {
    return this.itens.reduce((acc, it) => acc + Number(it.total_item || 0), 0);
  }
  get produtoConsultaSuggestions(): string[] {
    const base = [...this.produtosConsulta, ...this.produtosSugestoes];
    const valores = base.flatMap(p => [
      p.descricao,
      p.descricao_reduzida,
      p.referencia,
      String(p.Idproduto ?? p.id ?? '')
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.loadLookups();
    this.loadNaturezasCompra();
    this.loadAllCores();
    this.loadPedidos();
    this.setupItemFormRecalc();
  }

  // util
  private hojeISO(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private arrayOrResults<T>(data: any): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && Array.isArray(data.results)) return data.results as T[];
    return [];
  }

  // ===== Lookups: lojas / fornecedores / formas =====
  private loadLookups() {
    this.loadingLookups.set(true);

    // LOJAS
    this.lojasApi.list({ ordering: 'nome_loja', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        const list = arr
          .slice()
          .sort((a, b) => (a.nome_loja || '').localeCompare(b.nome_loja || ''))
          .map((l: any) => {
            const id = (l.id ?? l.Idloja) as number;
            const nome = (l.nome_loja || '').toString();
            return {
              id,
              label: `${id} - ${nome}`,
            } as Option;
          })
          .filter(o => !!o.id);

        this.lojas = list;
        this.lojaMap.clear();
        list.forEach(o => {
          const nome = o.label.split(' - ').slice(1).join(' - ') || o.label;
          this.lojaMap.set(o.id, nome);
        });
      },
      error: () => {
        this.lojas = [];
      },
      complete: () => this.loadingLookups.set(false),
    });

    // FORNECEDORES
    this.fornecedoresApi.list({ ordering: 'nome_fornecedor', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        const list = arr
          .slice()
          .sort((a, b) => (a.nome_fornecedor || '').localeCompare(b.nome_fornecedor || ''))
          .map((f: any) => {
            const id = (f.id ?? f.Idfornecedor) as number;
            const nome = (f.nome_fornecedor || '').toString();
            return {
              id,
              label: `${id} - ${nome}`,
            } as Option;
          })
          .filter(o => !!o.id);

        this.fornecedores = list;
        this.fornecedorMap.clear();
        list.forEach(o => {
          const nome = o.label.split(' - ').slice(1).join(' - ') || o.label;
          this.fornecedorMap.set(o.id, nome);
        });
      },
      error: () => {
        this.fornecedores = [];
      },
    });

    // FORMAS DE PAGAMENTO
    this.formasApi.list({ ativo: true }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        this.formas = arr
          .slice()
          .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''))
          .map((f: any) => {
            const codigo = (f.codigo ?? f.Codigo ?? '').toString();
            const desc = (f.descricao ?? f.Descricao ?? '').toString();
            return {
              codigo,
              label: desc ? `${codigo} — ${desc}` : codigo,
              prazo: Number(f.prazo_pagamento ?? 0) || null,
            } as FormaOption;
          })
          .filter(o => !!o.codigo);
      },
      error: () => {
        this.formas = [];
      },
    });

    this.formasApi.listPrazos({ ativo: true }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<PrazoPagamento>(resp);
        this.prazos = arr
          .map(p => ({ id: Number(p.Idprazo ?? p.id ?? 0), label: `${p.codigo} - ${p.descricao}` }))
          .filter(p => !!p.id);
      },
      error: () => {
        this.prazos = [];
      },
    });

    this.unidadesApi.list({ ordering: 'Descricao', page_size: 1000 }).subscribe({
      next: (resp: any) => {
        this.unidades = this.arrayOrResults<Unidade>(resp);
        this.unidadeMap.clear();
        this.unidades.forEach(unidade => {
          const id = Number(unidade.Idunidade || 0);
          if (id) this.unidadeMap.set(id, unidade);
        });
      },
      error: () => {
        this.unidades = [];
        this.unidadeMap.clear();
      },
    });
  }

  // ===== Cores (todas) =====
  private loadAllCores() {
    this.coresApi.list({ ordering: 'Descricao', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        this.coresAll = arr
          .map((c: any) => {
            const id = (c.Idcor ?? c.id) as number;
            const nome = (c.Descricao ?? c.Cor ?? '').toString();
            return { id, label: nome } as CorOption;
          })
          .filter(c => !!c.id);
        // fallback: enquanto não escolher produto, deixa todas
        this.coresProduto = this.coresAll.slice();
      },
      error: () => {
        this.coresAll = [];
        this.coresProduto = [];
      },
    });
  }

  // ===== Lista de pedidos (Revenda) =====
  private loadPedidos() {
    this.loadingPedidos = true;

    this.pedidosApi
      .listar({ page_size: 500 })
      .subscribe({
        next: (resp: any) => {
          const arr = this.arrayOrResults<any>(resp);
          this.pedidosAll = arr;
          this.applyFilter();
          this.loadingPedidos = false;
        },
        error: () => {
          this.pedidosAll = [];
          this.pedidosFiltered = [];
          this.pedidos = [];
          this.loadingPedidos = false;
        },
      });
  }

  private applyFilter() {
    const term = this.normalizeSearch(this.search);
    let base = this.pedidosAll.slice();

    if (term) {
      base = base.filter(p => {
        const id = String(p.id ?? '');
        const lojaId = Number(p.loja ?? 0);
        const fornId = Number(p.fornecedor ?? 0);
        const alvo = this.normalizeSearch([
          id,
          p.status,
          p.natureza_label,
          p.total_pedido,
          this.labelLoja(lojaId),
          this.lojaMap.get(lojaId),
          this.labelFornecedor(fornId),
          this.fornecedorMap.get(fornId),
        ].filter(Boolean).join(' '));
        return alvo.includes(term);
      });
    }
    if (this.filterStatus) {
      base = base.filter(p => (p.status || '').toUpperCase() === this.filterStatus);
    }
    if (this.filterTipo) {
      base = base.filter(p => String(p.tipo || '') === this.filterTipo);
    }

    this.pedidosFiltered = base;
    this.page = 1;
    this.selectedPedido = null;
    this.applyPage();
  }

  private applyPage() {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pedidos = this.pedidosFiltered.slice(start, end);
    if (this.selectedPedido && !this.pedidosFiltered.some(p => p.id === this.selectedPedido?.id)) {
      this.selectedPedido = null;
    }
  }

  onPageSizeChange(sizeStr: string): void {
    const size = Number(sizeStr) || 10;
    this.pageSize = size;
    this.page = 1;
    this.applyPage();
  }
  firstPage(): void {
    if (this.page !== 1) {
      this.page = 1;
      this.applyPage();
    }
  }
  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.applyPage();
    }
  }
  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyPage();
    }
  }
  lastPage(): void {
    if (this.page !== this.totalPages) {
      this.page = this.totalPages;
      this.applyPage();
    }
  }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }
  doSearch(): void {
    this.applyFilter();
  }
  clearSearch(): void {
    this.search = '';
    this.filterStatus = '';
    this.filterTipo = '';
    this.applyFilter();
  }

  visibleColumn(key: string): boolean { return this.columns.find(c => c.key === key)?.visible !== false; }
  toggleColumn(key: string, checked: boolean): void { const col = this.columns.find(c => c.key === key); if (!col || col.required) return; col.visible = checked; this.saveColumnsPreference(); }
  selecionarPedido(p: any): void { this.selectedPedido = p; }
  pedidoSelecionado(p: any): boolean { return !!this.selectedPedido && this.selectedPedido.id === p.id; }
  executarAcaoSelecionada(action: string): void { if (this.selectedPedido) this.executarAcao(action, this.selectedPedido); }
  acaoSelecionadaDesabilitada(action: string): boolean {
    if (!this.selectedPedido) return true;
    const config = this.rowActions(this.selectedPedido).find(a => a.key === action);
    return !config || config.visible === false || !!config.disabled;
  }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  restoreViewPreference(): void { localStorage.removeItem(this.viewPrefsKey); localStorage.removeItem('sysvar.list.pedidos-compra.pageSize'); this.indicatorsVisible = true; this.filtersVisible = true; this.pageSize = 20; this.columns = this.columns.map(c => ({ ...c, visible: true })); this.saveColumnsPreference(); this.saveViewPreference(); this.applyPage(); }
  @HostListener('window:sysvar-pedidos-compra-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-pedidos-compra-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-pedidos-compra-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  // ===== helpers de label =====
  labelLoja(id: number | null | undefined): string {
    if (!id) return '';
    return this.lojaMap.get(id) ? `${id} - ${this.lojaMap.get(id)}` : String(id);
  }

  labelFornecedor(id: number | null | undefined): string {
    if (!id) return '';
    return this.fornecedorMap.get(id) ? `${id} - ${this.fornecedorMap.get(id)}` : String(id);
  }

  tipoPedidoLabel(tipo: unknown): string {
    const map: Record<string, string> = {
      '1': 'Revenda',
      '2': 'Uso/Consumo',
      '4': 'Insumo',
    };
    return map[String(tipo || '')] || 'Não definido';
  }

  tipoProdutoFiltro(): string {
    const tipo = String(this.pedidoAtual?.tipo || '');
    return ['1', '2', '4'].includes(tipo) ? tipo : '1,2,4';
  }

  produtoPermitidoParaPedido(prod: any): boolean {
    const tipoProduto = String(prod?.tipo_produto || '');
    if (!['1', '2', '4'].includes(tipoProduto)) return false;
    const tipoPedido = String(this.pedidoAtual?.tipo || '');
    return !tipoPedido || tipoPedido === tipoProduto;
  }

  isPedidoRevenda(): boolean {
    return String(this.pedidoAtual?.tipo || this.produtoSelecionado?.tipo_produto || '') === '1';
  }

  isPedidoUsoOuInsumo(): boolean {
    const tipo = String(this.pedidoAtual?.tipo || this.produtoSelecionado?.tipo_produto || '');
    return tipo === '2' || tipo === '4';
  }

  unidadeProdutoSelecionadoLabel(): string {
    const unidadeId = Number(this.produtoSelecionado?.unidade || 0);
    const unidade = unidadeId ? this.unidadeMap.get(unidadeId) : null;
    if (!unidade) return '';
    return `${unidade.Descricao}${unidade.permite_decimal ? ' - aceita decimal' : ' - somente inteiro'}`;
  }

  produtoTipoLabel(prod: any): string {
    return this.tipoPedidoLabel(prod?.tipo_produto);
  }

  private validarQuantidadePorUnidade(): boolean {
    if (!this.isPedidoUsoOuInsumo()) return true;
    const unidadeId = Number(this.produtoSelecionado?.unidade || 0);
    const unidade = unidadeId ? this.unidadeMap.get(unidadeId) : null;
    const quantidade = Number(this.itemForm.get('quantidade')?.value || 0);
    if (quantidade <= 0) {
      this.showError('Informe uma quantidade maior que zero.');
      return false;
    }
    if (unidade && !unidade.permite_decimal && !Number.isInteger(quantidade)) {
      this.showError(`A unidade ${unidade.Descricao} não aceita quantidade decimal.`);
      return false;
    }
    return true;
  }

  // ===== validação do form =====
  isInvalid(controlName: string): boolean {
    const c = this.headerForm.get(controlName);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.headerForm.controls as any;

    if (f['loja']?.invalid) msgs.push('Loja: obrigatória.');
    if (f['fornecedor']?.invalid) msgs.push('Fornecedor: obrigatório.');
    if (f['emissao']?.invalid) msgs.push('Emissão: obrigatória.');
    if (f['frete']?.invalid) msgs.push('Frete: informe valor maior ou igual a zero.');
    if (f['total_desconto']?.invalid) msgs.push('Desconto geral: informe valor maior ou igual a zero.');

    return msgs;
  }

  // ===== ações do form =====
  resetForm() {
    this.submitted = false;
    this.pedidoAtualId.set(null);
    this.headerForm.reset({
      loja: null,
      fornecedor: null,
      emissao: this.hojeISO(),
      previsao_entrega: null,
      forma_pagamento_codigo: null,
      prazo_pagamento: null,
      observacoes: '',
      frete: 0,
      total_desconto: 0,
    });
    this.pedidoAtual = null;
    this.selectedItem = null;
    this.itensModalAberto = false;
    this.itens = [];
    this.limparItem();
  }

  novo() {
    this.resetForm();
    this.consultando = false;
    this.headerForm.enable({ emitEvent: false });
    this.itemForm.enable({ emitEvent: false });
    this.setViewForm();
  }

  cancelar() {
    this.resetForm();
    this.setViewList();
  }

  abrirItensPedido(): void {
    this.submitted = true;
    if (this.headerForm.invalid) {
      this.showError('Preencha o cabeçalho antes de abrir os itens.');
      return;
    }
    const pedidoId = this.pedidoAtualId();
    if (!pedidoId) {
      this.salvarCabecalho(() => this.abrirItensPedido());
      return;
    }
    this.carregarItensPedido(pedidoId);
    this.limparItem();
    this.itensModalAberto = true;
  }

  fecharItensPedido(): void {
    this.itensModalAberto = false;
    this.selectedItem = null;
    const pedidoId = this.pedidoAtualId();
    if (pedidoId) {
      this.carregarItensPedido(pedidoId);
      this.recarregarPedidoAtual(pedidoId);
    }
  }

  private salvarCabecalho(afterSave?: () => void): void {
    const v = this.headerForm.getRawValue();
    const payloadHeader: any = {
      loja: v.loja,
      fornecedor: v.fornecedor,
      emissao: v.emissao,
      previsao_entrega: v.previsao_entrega,
      frete: v.frete || 0,
      total_desconto: v.total_desconto || 0,
      observacoes: v.observacoes,
    };
    const pedidoId = this.pedidoAtualId();
    const request = pedidoId
      ? this.pedidosApi.updateHeader(pedidoId, payloadHeader)
      : this.pedidosApi.createHeader(payloadHeader);
    this.saving = true;
    request.subscribe({
      next: (pedido: any) => {
        this.saving = false;
        this.pedidoAtual = pedido;
        this.pedidoAtualId.set(pedido.id ?? pedido.Id);
        afterSave?.();
      },
      error: (err) => {
        this.saving = false;
        this.showError(err?.error?.detail || 'Erro ao salvar cabeçalho do pedido.');
      },
    });
  }

  // ===== PRODUTO (ref ou ID) → produto + cores do produto =====
  onProdutoBlur() {
    const input = (this.itemForm.get('produto_input')?.value || '').toString().trim();
    if (!input) {
      this.itemForm.patchValue({ produto: null }, { emitEvent: false });
      this.produtoDescricaoAtual = '';
      this.coresProduto = this.coresAll.slice();
      return;
    }

    const maybeId = Number(input);
    const isId = !isNaN(maybeId);

    if (isId) {
      this.produtosApi.get(maybeId).subscribe({
        next: (prod) => this.setProdutoFromApi(prod as any),
        error: () => this.buscarProdutoPorReferencia(input),
      });
    } else {
      this.buscarProdutoPorReferencia(input);
    }
  }

  private buscarProdutoPorReferencia(refOrDesc: string) {
    this.produtosApi.list({ search: refOrDesc, page_size: 5, ativo: 'true', tipo_produto: this.tipoProdutoFiltro() }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp).filter(p => this.produtoPermitidoParaPedido(p));
        if (!arr.length) {
          this.showError('Produto de revenda não encontrado.');
          this.itemForm.patchValue({ produto: null }, { emitEvent: false });
          this.produtoDescricaoAtual = '';
          this.coresProduto = this.coresAll.slice();
          return;
        }
        this.setProdutoFromApi(arr[0]);
      },
      error: () => {
        this.showError('Erro ao buscar produto.');
      },
    });
  }

  onFormaPagamentoChange(): void {
    const codigo = this.headerForm.get('forma_pagamento_codigo')?.value;
    const forma = this.formas.find(f => f.codigo === codigo);
    if (forma?.prazo) {
      this.headerForm.patchValue({ prazo_pagamento: forma.prazo }, { emitEvent: false });
    }
  }

  private loadNaturezasCompra(): void {
    this.naturezasApi.list({
      page_size: 500,
      ordering: 'codigo',
      natureza_operacao: 'DESPESA',
      ativo: true,
    }).subscribe({
      next: (resp: any) => {
        this.naturezasCompra = this.arrayOrResults<NatLancamento>(resp)
          .filter(n => (n.ativo ?? true) && (n.natureza_operacao || '').toUpperCase() === 'DESPESA')
          .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      },
      error: () => {
        this.naturezasCompra = [];
      },
    });
  }

  naturezaLabel(n: NatLancamento): string {
    const conta = n.plano_contabil_codigo
      ? ` · Conta ${n.plano_contabil_codigo} - ${n.plano_contabil_descricao || ''}`.trim()
      : '';
    return `${n.codigo} - ${n.descricao}${conta}`;
  }

  private sugerirNaturezaCompraRevenda(): number | null {
    const textoPreferido = ['mercador', 'revenda', 'cmv', 'compra'];
    const encontrada = this.naturezasCompra.find(n => {
      const alvo = `${n.codigo} ${n.descricao} ${n.categoria_principal} ${n.subcategoria} ${n.categoria_gerencial || ''}`.toLowerCase();
      return textoPreferido.some(term => alvo.includes(term));
    });
    return encontrada?.idnatureza ?? this.naturezasCompra[0]?.idnatureza ?? null;
  }

  buscarProdutosConsulta(): void {
    this.carregandoProdutosConsulta = true;
    const search = (this.produtoConsultaBusca || '').trim();

    this.produtosApi.list({ search, page_size: 30, ativo: 'true', tipo_produto: this.tipoProdutoFiltro() }).subscribe({
      next: (resp: any) => {
        this.produtosConsulta = this.arrayOrResults<any>(resp).filter(p => this.produtoPermitidoParaPedido(p));
        this.carregandoProdutosConsulta = false;
      },
      error: () => {
        this.produtosConsulta = [];
        this.carregandoProdutosConsulta = false;
        this.showError('Erro ao buscar produtos de revenda.');
      },
    });
  }

  abrirConsultaProdutos(): void {
    this.consultaProdutoAberta = true;
    if (!this.produtosConsulta.length) {
      this.buscarProdutosConsulta();
    }
  }

  fecharConsultaProdutos(): void {
    this.consultaProdutoAberta = false;
  }

  usarProdutoConsulta(): void {
    const prod = this.produtosConsulta.find(p => (p.Idproduto ?? p.id) === this.produtoConsultaId);
    if (!prod) {
      this.showError('Selecione um produto da consulta.');
      return;
    }
    this.setProdutoFromApi(prod);
    this.fecharConsultaProdutos();
  }

  buscarSugestoesProduto(): void {
    const search = (this.itemForm.get('produto_input')?.value || '').toString().trim();
    const produtoAtual = this.itemForm.get('produto')?.value;
    if (search.length < 2) {
      this.produtosSugestoes = [];
      this.produtoSugestoesAbertas = false;
      if (!search) {
        this.itemForm.patchValue({ produto: null }, { emitEvent: false });
        this.produtoDescricaoAtual = '';
        this.coresProduto = this.coresAll.slice();
      }
      return;
    }

    if (produtoAtual && search === this.produtoDescricaoAtual) {
      this.produtoSugestoesAbertas = false;
      return;
    }

    this.carregandoProdutosSugestoes = true;
    this.produtosApi.list({ search, page_size: 8, ativo: 'true', tipo_produto: this.tipoProdutoFiltro() }).subscribe({
      next: (resp: any) => {
        this.produtosSugestoes = this.arrayOrResults<any>(resp).filter(p => this.produtoPermitidoParaPedido(p));
        this.produtoSugestoesAbertas = this.produtosSugestoes.length > 0;
        this.carregandoProdutosSugestoes = false;
      },
      error: () => {
        this.produtosSugestoes = [];
        this.produtoSugestoesAbertas = false;
        this.carregandoProdutosSugestoes = false;
      },
    });
  }

  selecionarProdutoSugestao(prod: any): void {
    this.setProdutoFromApi(prod);
    this.produtosSugestoes = [];
    this.produtoSugestoesAbertas = false;
  }

  fecharSugestoesProdutoComAtraso(): void {
    window.setTimeout(() => {
      this.produtoSugestoesAbertas = false;
    }, 150);
  }

  private setProdutoFromApi(prod: any) {
    if (!this.produtoPermitidoParaPedido(prod)) {
      this.showError('Produto incompatível com o tipo do pedido.');
      this.itemForm.patchValue({ produto: null }, { emitEvent: false });
      this.produtoDescricaoAtual = '';
      this.coresProduto = this.coresAll.slice();
      return;
    }

    const id = (prod.Idproduto ?? prod.id) as number;
    const referencia = (prod.referencia ?? '').toString();
    const descricao = (prod.descricao ?? '').toString();
    const grade = Number(prod.grade ?? 0) || null;

    this.itemForm.patchValue(
      {
        produto: id,
        produto_input: referencia || String(id),
      },
      { emitEvent: false }
    );

    this.produtoDescricaoAtual = descricao;
    this.produtoGradeAtual = grade;
    this.produtoConsultaId = id;
    this.produtoSelecionado = prod;
    this.produtosSugestoes = [];
    this.produtoSugestoesAbertas = false;
    if (String(prod.tipo_produto) === '1') {
      this.carregarCoresDoProduto(id);
      this.carregarPacksDoProduto(grade);
    } else {
      this.coresProduto = [];
      this.packsProduto = [];
      this.packQtdUnit = 0;
      this.itemForm.patchValue({ cor: null, pack: null, n_packs: 0 }, { emitEvent: false });
      this.recalcularQuantidadeETotal();
    }
  }

  // ===== CORES DO PRODUTO (filtradas via produto_produtodetalhe) =====
  private carregarCoresDoProduto(produtoId: number) {
    if (!produtoId) {
      this.coresProduto = this.coresAll.slice();
      this.itemForm.patchValue({ cor: null }, { emitEvent: false });
      return;
    }

    const url = `${environment.apiBaseUrl}/produto/produto-detalhe/`;
    let params = new HttpParams().set('produto', String(produtoId));
    params = params.set('page_size', '2000');

    this.http.get<any>(url, { params }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        const corIds = new Set<number>();
        arr.forEach((det: any) => {
          const cid = (det.idcor ?? det.Idcor ?? det.idcor_id ?? det.idcor_id_id) as number | undefined;
          if (cid) corIds.add(cid);
        });

        if (!corIds.size) {
          // se por algum motivo não vier nada, não trava: mostra todas
          this.coresProduto = this.coresAll.slice();
        } else {
          this.coresProduto = this.coresAll.filter(c => corIds.has(c.id));
        }

        const currentCor = this.itemForm.get('cor')?.value as number | null;
        if (currentCor && !this.coresProduto.some(c => c.id === currentCor)) {
          this.itemForm.patchValue({ cor: null }, { emitEvent: false });
        }
      },
      error: () => {
        // fallback: todas as cores
        this.coresProduto = this.coresAll.slice();
      },
    });
  }

  // ===== PACK → quantidade correta (1 pack) =====
  private carregarPacksDoProduto(gradeId: number | null): void {
    const packAtual = Number(this.itemForm.get('pack')?.value || 0);
    this.packsProduto = [];
    this.packQtdUnit = 0;

    if (!gradeId) {
      this.itemForm.patchValue({ pack: null }, { emitEvent: false });
      this.recalcularQuantidadeETotal();
      return;
    }

    this.packsApi.list({ grade: gradeId, ativo: true, ordering: 'nome', page_size: 500 }).subscribe({
      next: (resp: any) => {
        this.packsProduto = this.arrayOrResults<any>(resp)
          .map((p: any) => ({
            id: Number(p.id ?? p.Idpack ?? 0),
            label: `${p.nome || `Pack ${p.id ?? p.Idpack}`}`,
            grade: Number(p.grade ?? 0),
          } as PackOption))
          .filter(p => !!p.id && p.grade === gradeId);

        if (packAtual && this.packsProduto.some(p => p.id === packAtual)) {
          this.onPackBlur();
          return;
        }

        this.itemForm.patchValue({ pack: null }, { emitEvent: false });
        this.recalcularQuantidadeETotal();
      },
      error: () => {
        this.packsProduto = [];
        this.itemForm.patchValue({ pack: null }, { emitEvent: false });
        this.recalcularQuantidadeETotal();
      },
    });
  }

  onPackBlur() {
    const raw = this.itemForm.get('pack')?.value;
    const packId = Number(raw);
    if (!packId) {
      this.packQtdUnit = 0;
      this.recalcularQuantidadeETotal();
      return;
    }

    if (this.produtoGradeAtual && this.packsProduto.length && !this.packsProduto.some(p => p.id === packId)) {
      this.showError('Pack incompatível com a grade do produto selecionado.');
      this.itemForm.patchValue({ pack: null }, { emitEvent: false });
      this.packQtdUnit = 0;
      this.recalcularQuantidadeETotal();
      return;
    }

    // carrega itens do pack para calcular a quantidade de UM pack
    this.packItensApi.list({ pack: packId }).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        this.packQtdUnit = arr.reduce(
          (sum: number, it: any) => sum + Number(it.qtd || 0),
          0
        );
        this.recalcularQuantidadeETotal();
      },
      error: () => {
        this.packQtdUnit = 0;
        this.recalcularQuantidadeETotal();
      },
    });
  }

  private setupItemFormRecalc() {
    this.itemForm.get('quantidade')?.valueChanges.subscribe(() => {
      this.recalcularQuantidadeETotal();
    });
    this.itemForm.get('n_packs')?.valueChanges.subscribe(() => {
      this.recalcularQuantidadeETotal();
    });
    this.itemForm.get('preco_unit')?.valueChanges.subscribe(() => {
      this.recalcularQuantidadeETotal();
    });
    this.itemForm.get('desconto_valor')?.valueChanges.subscribe(() => {
      this.recalcularQuantidadeETotal();
    });
  }

  private recalcularQuantidadeETotal() {
    const n_packs = Number(this.itemForm.get('n_packs')?.value || 0);
    const preco = Number(this.itemForm.get('preco_unit')?.value || 0);
    const desc = Number(this.itemForm.get('desconto_valor')?.value || 0);

    const qtd = this.isPedidoRevenda()
      ? (this.packQtdUnit > 0 && n_packs > 0 ? this.packQtdUnit * n_packs : 0)
      : Number(this.itemForm.get('quantidade')?.value || 0);
    const totalBruto = qtd * preco;
    const total = totalBruto - desc;

    const patch: any = { total_item: total };
    if (this.isPedidoRevenda()) patch.quantidade = qtd;
    this.itemForm.patchValue(patch, { emitEvent: false });
  }

  // ===== Itens – limpar / editar / remover =====
  limparItem() {
    this.itemForm.reset({
      id: null,
      produto_input: '',
      produto: null,
      cor: null,
      pack: null,
      n_packs: 1,
      quantidade: 0,
      preco_unit: 0,
      desconto_valor: 0,
      total_item: 0,
      observacoes: '',
      frete: 0,
      total_desconto: 0,
    });
    this.pedidoAtual = null;
    this.selectedItem = null;
    this.itensModalAberto = false;
    this.produtoDescricaoAtual = '';
    this.produtoGradeAtual = null;
    this.packsProduto = [];
    this.packQtdUnit = 0;
    this.produtoConsultaId = null;
    this.produtoSelecionado = null;
  }

  selecionarItem(it: PedidoCompraItemUI): void {
    this.selectedItem = it;
  }

  itemSelecionado(it: PedidoCompraItemUI): boolean {
    return !!this.selectedItem && this.selectedItem.id === it.id;
  }

  consultarItemSelecionado(): void {
    if (this.selectedItem) this.editarItem(this.selectedItem);
    this.itemForm.disable({ emitEvent: false });
  }

  editarItemSelecionado(): void {
    if (!this.selectedItem || this.consultando || !this.isAberto(this.pedidoAtual)) return;
    this.itemForm.enable({ emitEvent: false });
    this.editarItem(this.selectedItem);
  }

  removerItemSelecionado(): void {
    if (!this.selectedItem || this.consultando || !this.isAberto(this.pedidoAtual)) return;
    this.removerItem(this.selectedItem);
  }

  editarItem(it: PedidoCompraItemUI) {
    this.itemForm.reset({
      id: it.id,
      produto_input: it.produto_referencia || String(it.produto || ''),
      produto: it.produto,
      cor: it.cor,
      pack: it.pack,
      n_packs: it.n_packs,
      quantidade: it.quantidade,
      preco_unit: it.preco_unit,
      desconto_valor: it.desconto_valor,
      total_item: it.total_item,
      observacoes: it.observacoes || '',
    });

    this.packQtdUnit = it.n_packs ? it.quantidade / it.n_packs : 0;
    if (it.produto) {
      this.carregarCoresDoProduto(it.produto);
      this.produtosApi.get(it.produto).subscribe({
        next: (prod: any) => {
          this.produtoSelecionado = prod;
          this.produtoGradeAtual = Number(prod.grade ?? 0) || null;
          if (String(prod.tipo_produto) === '1') {
            this.carregarPacksDoProduto(this.produtoGradeAtual);
          }
        },
        error: () => {
          this.produtoGradeAtual = null;
          this.packsProduto = [];
        },
      });
    }
  }

  removerItem(it: PedidoCompraItemUI) {
    if (!it.id) return;
    this.confirmModal = {
      action: 'removerItem',
      title: 'Remover item',
      text: 'Confirma a remoção deste item do pedido?',
      item: it,
    };
  }

  confirmarAcao(): void {
    const modal = this.confirmModal;
    if (!modal) return;

    if (modal.action === 'removerItem' && modal.item) {
      this.executarRemocaoItem(modal.item);
      return;
    }
    if (modal.action === 'excluirPedido' && modal.pedido) {
      this.executarExclusaoPedido(modal.pedido);
      return;
    }
    if (modal.action === 'cancelarPedido' && modal.pedido) {
      this.executarCancelamentoPedido(modal.pedido);
    }
  }

  fecharConfirmacao(): void {
    this.confirmModal = null;
  }

  private executarRemocaoItem(it: PedidoCompraItemUI): void {
    this.pedidosApi.deleteItem(it.id!).subscribe({
      next: () => {
        this.confirmModal = null;
        const pedidoId = this.pedidoAtualId();
        if (pedidoId) {
          this.carregarItensPedido(pedidoId);
          this.recarregarPedidoAtual(pedidoId);
        }
      },
      error: () => {
        this.showError('Erro ao remover item.');
      },
    });
  }

  // ===== Itens – adicionar (cria pedido se precisar) =====
  adicionarItem() {
    this.submitted = true;

    if (this.headerForm.invalid) {
      this.showError('Preencha e salve o cabeçalho antes de adicionar itens.');
      return;
    }

    if (!this.validarItemAtual()) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const pedidoIdAtual = this.pedidoAtualId();
    if (!pedidoIdAtual) {
      this.criarPedidoEAdicionarItem();
    } else {
      this.salvarItemNoBackend(pedidoIdAtual);
    }
  }

  private criarPedidoEAdicionarItem() {
    const v = this.headerForm.value;
    const payloadHeader: any = {
      loja: v.loja,
      fornecedor: v.fornecedor,
      emissao: v.emissao,
      previsao_entrega: v.previsao_entrega,
      observacoes: v.observacoes,
    };

    this.savingItem = true;

    this.pedidosApi.createHeader(payloadHeader).subscribe({
      next: (pedido: any) => {
        const idPedido = (pedido.id ?? pedido.Id) as number;
        this.pedidoAtualId.set(idPedido);
        this.pedidoAtual = pedido;

        this.salvarItemNoBackend(idPedido);
      },
      error: () => {
        this.savingItem = false;
        this.showError('Erro ao criar o pedido.');
      },
    });
  }

  private salvarItemNoBackend(pedidoId: number) {
    const raw = this.itemForm.getRawValue();

    const payload: any = {
      pedido: pedidoId,
      produto: raw.produto,
      preco_unit: raw.preco_unit || 0,
      desconto_valor: raw.desconto_valor || 0,
      observacoes: raw.observacoes || null,
    };
    if (this.isPedidoRevenda()) {
      payload.cor = raw.cor;
      payload.pack = raw.pack;
      payload.n_packs = raw.n_packs;
    } else {
      payload.qtd = raw.quantidade;
      payload.descricao_livre = this.produtoDescricaoAtual || raw.produto_input || null;
    }

    const itemId = raw.id as number | null;

    const obs = itemId
      ? this.pedidosApi.updateItem(itemId, payload)
      : this.pedidosApi.createItem(payload);

    this.savingItem = true;
    obs.subscribe({
      next: () => {
        this.savingItem = false;
        this.carregarItensPedido(pedidoId);
        this.recarregarPedidoAtual(pedidoId);
        this.recalcularQuantidadeETotal(); // garante quantidade/total coerentes na tela
        this.limparItem();
      },
      error: () => {
        this.savingItem = false;
        this.showError('Erro ao salvar item.');
      },
    });
  }

  private validarItemAtual(): boolean {
    if (this.itemForm.get('produto')?.invalid || this.itemForm.get('preco_unit')?.invalid) return false;
    if (this.isPedidoRevenda()) {
      if (!this.itemForm.get('cor')?.value) {
        this.showError('Informe a cor do item de Revenda.');
        return false;
      }
      if (!this.itemForm.get('pack')?.value || Number(this.itemForm.get('n_packs')?.value || 0) < 1) {
        this.showError('Informe pack e número de packs para Revenda.');
        return false;
      }
      return true;
    }
    return this.validarQuantidadePorUnidade();
  }

  private recarregarPedidoAtual(pedidoId: number): void {
    this.pedidosApi.getById(pedidoId).subscribe({
      next: pedido => {
        this.pedidoAtual = pedido;
        const index = this.pedidosAll.findIndex(p => p.id === pedido.id);
        if (index >= 0) this.pedidosAll[index] = pedido;
        this.applyFilter();
      },
      error: () => {},
    });
  }

  private carregarItensPedido(pedidoId: number) {
    this.loadingItens = true;
    this.pedidosApi.listItensByPedido(pedidoId).subscribe({
      next: (resp: any) => {
        const arr = this.arrayOrResults<any>(resp);
        this.itens = arr.map((it: any) => {
          const produtoId = it.produto as number;
          const corId = it.cor as number;
          const packId = it.pack as number;

          const corNome = this.coresAll.find(c => c.id === corId)?.label || String(corId || '');
          const packNomeBackend = (it.pack_nome ?? it.pack_descricao ?? '') as string;
          const packNome = packNomeBackend
            ? packNomeBackend.substring(0, 15)
            : String(packId || '');

          const ref = (it.produto_referencia ?? it.referencia ?? '') as string;
          const desc = (it.produto_descricao ?? it.descricao_livre ?? '') as string;

          return {
            id: it.id,
            pedido: pedidoId,
            produto: produtoId,
            produto_referencia: ref || desc || String(produtoId || ''),
            cor: corId,
            cor_nome: corNome,
            pack: packId,
            pack_nome: packNome,
            n_packs: Number(it.n_packs || 0),
            quantidade: Number(it.qtd || it.quantidade || 0),
            preco_unit: Number(it.preco_unit || 0),
            desconto_valor: Number(it.desconto_valor || 0),
            total_item: Number(it.total_item || 0),
            observacoes: it.observacoes ?? null,
            produto_label: desc || ref || String(produtoId || ''),
            unidade_label: it.unidade_descricao || '',
          } as PedidoCompraItemUI;
        });
        this.loadingItens = false;
      },
      error: () => {
        this.itens = [];
        this.loadingItens = false;
      },
    });
  }

  // ===== Ações na LISTA: editar / excluir / aprovar / cancelar =====

  isAberto(p: any): boolean {
    return (p.status ?? '').toUpperCase() === 'AB';
  }

  editarPedido(p: any) {
    if (!this.isAberto(p)) {
      this.showError('Pedidos aprovados ou cancelados não podem ser editados.');
      return;
    }

    this.abrirPedido(p, false);
  }

  consultarPedido(p: any) {
    this.abrirPedido(p, true);
  }

  private abrirPedido(p: any, somenteConsulta: boolean) {
    this.submitted = false;
    this.consultando = somenteConsulta;
    this.pedidoAtualId.set(p.id);
    this.pedidoAtual = p;
    this.headerForm.enable({ emitEvent: false });
    this.itemForm.enable({ emitEvent: false });

    this.headerForm.reset({
      loja: p.loja ?? null,
      fornecedor: p.fornecedor ?? null,
      emissao: p.emissao ?? this.hojeISO(),
      previsao_entrega: p.previsao_entrega ?? null,
      forma_pagamento_codigo: p.forma_pagamento ?? null,
      prazo_pagamento: p.prazo_pagamento ?? null,
      frete: Number(p.frete || 0),
      total_desconto: Number(p.total_desconto || 0),
      observacoes: p.observacoes ?? '',
    });

    this.itens = [];
    this.carregarItensPedido(p.id);
    this.setViewForm();

    if (somenteConsulta) {
      this.headerForm.disable({ emitEvent: false });
      this.itemForm.disable({ emitEvent: false });
    }
  }

  excluirPedido(p: any) {
    if (!this.isAberto(p)) {
      this.showError('Só é permitido excluir pedidos em aberto (AB).');
      return;
    }
    this.confirmModal = {
      action: 'excluirPedido',
      title: 'Excluir pedido',
      text: `Confirma a exclusão do pedido ${p.id}?`,
      pedido: p,
    };
  }

  private executarExclusaoPedido(p: any): void {
    this.pedidosApi.delete(p.id).subscribe({
      next: () => {
        this.confirmModal = null;
        this.showSuccess('Pedido excluído com sucesso.');
        this.loadPedidos();
        if (this.pedidoAtualId() === p.id) {
          this.resetForm();
          this.setViewList();
        }
      },
      error: () => {
        this.showError('Erro ao excluir pedido.');
      },
    });
  }

  aprovarPedido(p: any) {
    if (!this.isAberto(p)) {
      this.showError('Só é possível aprovar pedidos em aberto (AB).');
      return;
    }
    this.aprovarModal = { pedido: p, idnatureza: this.sugerirNaturezaCompraRevenda() };
  }

  confirmarAprovacao(): void {
    const p = this.aprovarModal?.pedido;
    const idnatureza = Number(this.aprovarModal?.idnatureza || 0);
    if (!p) return;
    if (!idnatureza || Number.isNaN(idnatureza)) {
      this.showError('Selecione a natureza de lançamento para aprovar o pedido.');
      return;
    }

    this.pedidosApi.aprovar(p.id, idnatureza).subscribe({
      next: () => {
        this.aprovarModal = null;
        this.showSuccess('Pedido aprovado com sucesso.');
        this.loadPedidos();
        // se estiver editando este pedido, volta para a lista
        if (this.pedidoAtualId() === p.id) {
          this.resetForm();
          this.setViewList();
        }
      },
      error: () => {
        this.showError('Erro ao aprovar pedido.');
      },
    });
  }

  fecharAprovacao(): void {
    this.aprovarModal = null;
  }

  editarNaturezaPedido(p: any): void {
    if (!['AP', 'AT'].includes((p.status || '').toUpperCase())) {
      this.showError('A natureza só pode ser editada em pedido aprovado ou atendido.');
      return;
    }
    this.naturezaModal = {
      pedido: p,
      idnatureza: p.idnatureza ?? this.sugerirNaturezaCompraRevenda(),
    };
  }

  confirmarNatureza(): void {
    const p = this.naturezaModal?.pedido;
    const idnatureza = Number(this.naturezaModal?.idnatureza || 0);
    if (!p) return;
    if (!idnatureza || Number.isNaN(idnatureza)) {
      this.showError('Selecione a natureza de lançamento.');
      return;
    }

    this.pedidosApi.alterarNatureza(p.id, idnatureza).subscribe({
      next: () => {
        this.naturezaModal = null;
        this.showSuccess('Natureza do pedido atualizada.');
        this.loadPedidos();
      },
      error: (err) => {
        this.showError(err?.error?.detail || 'Erro ao alterar natureza do pedido.');
      },
    });
  }

  fecharNatureza(): void {
    this.naturezaModal = null;
  }

  cancelarPedido(p: any) {
    if (!this.isAberto(p)) {
      this.showError('Só é possível cancelar pedidos em aberto (AB).');
      return;
    }
    this.confirmModal = {
      action: 'cancelarPedido',
      title: 'Cancelar pedido',
      text: `Confirma o cancelamento do pedido ${p.id}?`,
      pedido: p,
    };
  }

  rowActions(p: any): RowAction[] {
    const status = (p.status || '').toUpperCase();
    return [
      { key: 'consultar', label: 'Consultar', icon: '⌕' },
      { key: 'editar', label: 'Editar', icon: '✎', visible: this.podeEditarModulo, disabled: status !== 'AB' },
      { key: 'aprovar', label: 'Aprovar', icon: '✓', visible: this.podeEditarModulo, disabled: status !== 'AB' },
      { key: 'natureza', label: 'Natureza', icon: '☷', visible: this.podeEditarModulo, disabled: !['AP', 'AT'].includes(status) },
      { key: 'cancelar', label: 'Cancelar', icon: '×', visible: this.podeEditarModulo, disabled: status !== 'AB' },
      { key: 'excluir', label: 'Excluir', icon: '!', visible: this.podeEditarModulo, disabled: status !== 'AB', danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string, p: any): void {
    if (action === 'consultar') this.consultarPedido(p);
    if (action === 'editar') this.editarPedido(p);
    if (action === 'aprovar') this.aprovarPedido(p);
    if (action === 'natureza') this.editarNaturezaPedido(p);
    if (action === 'cancelar') this.cancelarPedido(p);
    if (action === 'excluir') this.excluirPedido(p);
  }

  private executarCancelamentoPedido(p: any): void {
    this.pedidosApi.cancelar(p.id).subscribe({
      next: () => {
        this.confirmModal = null;
        this.showSuccess('Pedido cancelado com sucesso.');
        this.loadPedidos();
        if (this.pedidoAtualId() === p.id) {
          this.resetForm();
          this.setViewList();
        }
      },
      error: () => {
        this.showError('Erro ao cancelar pedido.');
      },
    });
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.pedidos-compra.pageSize'));
    if ([10, 20, 50, 100].includes(size)) this.pageSize = size;
    const raw = localStorage.getItem(this.columnsStorageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Record<string, boolean>;
      this.columns = this.columns.map(c => c.required ? c : { ...c, visible: saved[c.key] ?? c.visible });
    } catch {}
  }

  private saveColumnsPreference(): void {
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(Object.fromEntries(this.columns.map(c => [c.key, c.visible]))));
  }

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try {
      const pref = JSON.parse(raw) as { indicatorsVisible?: boolean; filtersVisible?: boolean };
      this.indicatorsVisible = pref.indicatorsVisible !== false;
      this.filtersVisible = pref.filtersVisible !== false;
    } catch {}
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible }));
  }

  // ===== Salvar pedido (finalizar) =====
  salvarPedido() {
    this.submitted = true;

    if (this.headerForm.invalid) {
      this.showError('Preencha o cabeçalho antes de gravar o pedido.');
      return;
    }
    this.salvarCabecalho(() => {
      this.showSuccess('Pedido gravado com sucesso.');
      this.loadPedidos();
    });
  }

  private showSuccess(message: string): void {
    this.successMsg = message;
    this.errorMsg = '';
  }

  private showError(message: string): void {
    this.errorMsg = message;
    this.successMsg = '';
  }
}


