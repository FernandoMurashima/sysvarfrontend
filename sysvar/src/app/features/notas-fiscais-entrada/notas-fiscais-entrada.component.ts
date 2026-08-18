import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FornecedoresService } from '../../core/services/fornecedores.service';
import { LojasService } from '../../core/services/lojas.service';
import { NotaFiscalEntradaIndicadores, NotaFiscalEntradaListParams, NotasFiscaisEntradaService } from '../../core/services/notas-fiscais-entrada.service';
import { PedidoCompra, PedidosCompraService } from '../../core/services/pedidos-compra.service';
import {
  NotaFiscalEntrada,
  NotaFiscalEntradaPedidoItem,
} from '../../core/models/nota-fiscal-entrada';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';

type Option = { id: number; label: string };
type RowAction = { key: string; label: string; icon?: string; disabled?: boolean; visible?: boolean; danger?: boolean; dividerBefore?: boolean };

type ItemRecebimentoUI = NotaFiscalEntradaPedidoItem & {
  qtd_receber: number;
  preco_unit_nf: number;
  desconto_item: number;
  total_item: number;
};

@Component({
  selector: 'app-notas-fiscais-entrada',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, SearchSuggestComponent, PageHeaderComponent, SummaryCardComponent],
  templateUrl: './notas-fiscais-entrada.component.html',
  styleUrls: ['./notas-fiscais-entrada.component.css'],
})
export class NotasFiscaisEntradaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private notasApi = inject(NotasFiscaisEntradaService);
  private pedidosApi = inject(PedidosCompraService);
  private lojasApi = inject(LojasService);
  private fornecedoresApi = inject(FornecedoresService);

  view = signal<'list' | 'form'>('list');
  notaAtual = signal<NotaFiscalEntrada | null>(null);
  loading = false;
  saving = false;
  submitted = false;
  mensagem = '';
  erro = '';
  indicatorsVisible = true;
  filtersVisible = true;
  advancedFiltersOpen = false;
  selectedNota: NotaFiscalEntrada | null = null;
  private readonly viewPrefsKey = 'sysvar.ui.preferences.notas-entrada';
  confirmModal: {
    action: 'removerItem' | 'fecharNota' | 'cancelarNota';
    title: string;
    text: string;
    item?: ItemRecebimentoUI;
  } | null = null;

  search = '';
  filtroStatus = '';
  filtroFornecedor: number | null = null;
  filtroLoja: number | null = null;
  filtroEmissaoDe = '';
  filtroEmissaoAte = '';
  filtroEntradaDe = '';
  filtroEntradaAte = '';
  filtroValorMin: number | null = null;
  filtroValorMax: number | null = null;
  notas: NotaFiscalEntrada[] = [];
  notasFiltradas: NotaFiscalEntrada[] = [];
  notasPagina: NotaFiscalEntrada[] = [];
  totalRecords = 0;
  indicadores: NotaFiscalEntradaIndicadores = {
    total: 0,
    abertas: 0,
    fechadas: 0,
    canceladas: 0,
    valor_total: '0.00',
  };

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];

  pedidosAprovados: PedidoCompra[] = [];
  lojas: Option[] = [];
  fornecedores: Option[] = [];
  private lojaMap = new Map<number, string>();
  private fornecedorMap = new Map<number, string>();

  itensPedido: ItemRecebimentoUI[] = [];
  selectedItem: ItemRecebimentoUI | null = null;
  loadingItens = false;

  form: FormGroup = this.fb.group({
    pedido_compra: [null, Validators.required],
    modelo: ['55', [Validators.required, Validators.maxLength(2)]],
    serie: [''],
    numero: ['', Validators.required],
    chave_acesso: [''],
    dt_emissao: [this.hojeISO(), Validators.required],
    dt_entrada: [this.hojeISO(), Validators.required],
    valor_frete: [0, [Validators.min(0)]],
    observacoes: [''],
  });

  get total(): number {
    return this.totalRecords;
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
    return this.notasPagina.flatMap(n => [
      String(n.pedido_compra ?? ''),
      n.numero,
      n.serie,
      n.chave_acesso,
      this.statusLabel(n.status),
    ].filter(Boolean));
  }
  get abertas(): number {
    return this.indicadores.abertas;
  }
  get fechadas(): number {
    return this.indicadores.fechadas;
  }
  get canceladas(): number {
    return this.indicadores.canceladas;
  }
  get valorTotalListado(): number {
    return Number(this.indicadores.valor_total || 0);
  }
  get pedidoSelecionado(): PedidoCompra | null {
    const pedidoId = Number(this.form.get('pedido_compra')?.value || 0);
    return this.pedidosAprovados.find(p => p.id === pedidoId) || null;
  }

  ngOnInit(): void {
    this.loadViewPreference();
    this.loadLookups();
    this.loadPedidosAprovados();
    this.loadNotas();
  }

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

  private loadLookups(): void {
    this.lojasApi.list({ ordering: 'nome_loja', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        this.lojas = this.arrayOrResults<any>(resp).map((l: any) => {
          const id = Number(l.id ?? l.Idloja);
          const nome = String(l.nome_loja ?? l.Nome ?? '');
          this.lojaMap.set(id, nome);
          return { id, label: `${id} - ${nome}` };
        }).filter(l => !!l.id);
      },
    });

    this.fornecedoresApi.list({ ordering: 'nome_fornecedor', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        this.fornecedores = this.arrayOrResults<any>(resp).map((f: any) => {
          const id = Number(f.id ?? f.Idfornecedor);
          const nome = String(f.nome_fornecedor ?? f.RazaoSocial ?? f.NomeFantasia ?? '');
          this.fornecedorMap.set(id, nome);
          return { id, label: `${id} - ${nome}` };
        }).filter(f => !!f.id);
      },
    });
  }

  private loadPedidosAprovados(): void {
    this.pedidosApi.listar({ status: 'AP', page_size: 500 }).subscribe({
      next: (resp: any) => {
        this.pedidosAprovados = this.arrayOrResults<PedidoCompra>(resp);
      },
      error: () => {
        this.pedidosAprovados = [];
      },
    });
  }

  loadNotas(): void {
    this.loading = true;
    this.notasApi.listar(this.listParams(true)).subscribe({
      next: (resp: any) => {
        this.notasPagina = this.arrayOrResults<NotaFiscalEntrada>(resp);
        this.notas = this.notasPagina;
        this.notasFiltradas = this.notasPagina;
        this.totalRecords = Array.isArray(resp) ? this.notasPagina.length : Number(resp?.count ?? this.notasPagina.length);
        this.limparSelecaoForaDaPagina();
        this.loading = false;
        this.loadIndicadores();
      },
      error: () => {
        this.notas = [];
        this.notasFiltradas = [];
        this.notasPagina = [];
        this.totalRecords = 0;
        this.loading = false;
        this.erro = 'Não foi possível carregar as notas fiscais.';
      },
    });
  }

  applyFilter(): void {
    this.page = 1;
    this.selectedNota = null;
    this.loadNotas();
  }

  private applyPage(): void {
    this.loadNotas();
  }

  private limparSelecaoForaDaPagina(): void {
    if (this.selectedNota && !this.notasPagina.some(n => n.id === this.selectedNota?.id)) {
      this.selectedNota = null;
    }
  }

  private listParams(includePaging = false): NotaFiscalEntradaListParams {
    const params: NotaFiscalEntradaListParams = {
      search: this.search || undefined,
      status: this.filtroStatus || undefined,
      fornecedor: this.filtroFornecedor || undefined,
      loja: this.filtroLoja || undefined,
      dt_emissao_de: this.filtroEmissaoDe || undefined,
      dt_emissao_ate: this.filtroEmissaoAte || undefined,
      dt_entrada_de: this.filtroEntradaDe || undefined,
      dt_entrada_ate: this.filtroEntradaAte || undefined,
      valor_min: this.filtroValorMin ?? undefined,
      valor_max: this.filtroValorMax ?? undefined,
    };
    if (includePaging) {
      params.page = this.page;
      params.page_size = this.pageSize;
    }
    return params;
  }

  private loadIndicadores(): void {
    this.notasApi.indicadores(this.listParams()).subscribe({
      next: (indicadores) => this.indicadores = indicadores,
      error: () => this.indicadores = { total: this.totalRecords, abertas: 0, fechadas: 0, canceladas: 0, valor_total: '0.00' },
    });
  }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.applyFilter();
  }

  clearSearch(): void {
    this.search = '';
    this.filtroStatus = '';
    this.filtroFornecedor = null;
    this.filtroLoja = null;
    this.filtroEmissaoDe = '';
    this.filtroEmissaoAte = '';
    this.filtroEntradaDe = '';
    this.filtroEntradaAte = '';
    this.filtroValorMin = null;
    this.filtroValorMax = null;
    this.applyFilter();
  }

  onPageSizeChange(sizeStr: string): void {
    this.pageSize = Number(sizeStr) || 20;
    this.page = 1;
    localStorage.setItem('sysvar.list.notas-entrada.pageSize', String(this.pageSize));
    this.loadNotas();
  }

  firstPage(): void {
    if (this.page !== 1) {
      this.page = 1;
      this.loadNotas();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadNotas();
    }
  }

  lastPage(): void {
    if (this.page !== this.totalPages) {
      this.page = this.totalPages;
      this.loadNotas();
    }
  }

  selecionarNota(nota: NotaFiscalEntrada): void {
    this.selectedNota = nota;
  }

  notaSelecionada(nota: NotaFiscalEntrada): boolean {
    return !!this.selectedNota && this.selectedNota.id === nota.id;
  }

  executarAcaoSelecionada(action: string): void {
    if (this.selectedNota) this.executarAcao(action, this.selectedNota);
  }

  acaoSelecionadaDesabilitada(action: string): boolean {
    if (!this.selectedNota) return true;
    const config = this.rowActions(this.selectedNota).find(a => a.key === action);
    return !config || config.visible === false || !!config.disabled;
  }

  toggleIndicators(): void {
    this.indicatorsVisible = !this.indicatorsVisible;
    this.saveViewPreference();
  }

  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
    this.saveViewPreference();
  }

  toggleAdvancedFilters(): void {
    this.advancedFiltersOpen = !this.advancedFiltersOpen;
    this.saveViewPreference();
  }

  restoreViewPreference(): void {
    localStorage.removeItem(this.viewPrefsKey);
    localStorage.removeItem('sysvar.list.notas-entrada.pageSize');
    this.indicatorsVisible = true;
    this.filtersVisible = true;
    this.advancedFiltersOpen = false;
    this.pageSize = 20;
    this.saveViewPreference();
    this.loadNotas();
  }

  @HostListener('window:sysvar-notas-entrada-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-notas-entrada-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-notas-entrada-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadNotas();
    }
  }

  novo(): void {
    this.submitted = false;
    this.mensagem = '';
    this.erro = '';
    this.notaAtual.set(null);
    this.itensPedido = [];
    this.selectedItem = null;
    this.form.reset({
      pedido_compra: null,
      modelo: '55',
      serie: '',
      numero: '',
      chave_acesso: '',
      dt_emissao: this.hojeISO(),
      dt_entrada: this.hojeISO(),
      valor_frete: 0,
      observacoes: '',
    });
    this.form.enable();
    this.view.set('form');
  }

  voltarLista(): void {
    this.view.set('list');
    this.notaAtual.set(null);
    this.itensPedido = [];
    this.selectedItem = null;
    this.loadNotas();
  }

  editar(nota: NotaFiscalEntrada): void {
    this.mensagem = '';
    this.erro = '';
    this.notaAtual.set(nota);
    this.form.reset({
      pedido_compra: nota.pedido_compra,
      modelo: nota.modelo,
      serie: nota.serie,
      numero: nota.numero,
      chave_acesso: nota.chave_acesso,
      dt_emissao: nota.dt_emissao,
      dt_entrada: nota.dt_entrada,
      valor_frete: Number(nota.valor_frete || 0),
      observacoes: nota.observacoes,
    });

    if (nota.status === 'AB') {
      this.form.enable();
    } else {
      this.form.disable();
    }

    this.view.set('form');
    this.selectedItem = null;
    this.carregarItensPedido(nota.id);
  }

  rowActions(nota: NotaFiscalEntrada): RowAction[] {
    return [
      { key: 'abrir', label: 'Abrir', icon: '⌕' },
      { key: 'cancelar', label: 'Cancelar NF', icon: '×', disabled: nota.status === 'CA', danger: true, dividerBefore: true },
    ];
  }

  executarAcao(action: string | Event, nota: NotaFiscalEntrada): void {
    if (action === 'abrir') this.editar(nota);
    if (action === 'cancelar') {
      this.notaAtual.set(nota);
      this.cancelarNota();
    }
  }

  salvarCabecalho(): void {
    this.submitted = true;
    this.mensagem = '';
    this.erro = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.datasValidas()) {
      this.erro = 'Data de entrada não pode ser anterior à data de emissão.';
      return;
    }

    const payload = this.form.getRawValue();
    const nota = this.notaAtual();
    this.saving = true;

    const req = nota
      ? this.notasApi.atualizar(nota.id, payload)
      : this.notasApi.criar(payload);

    req.subscribe({
      next: (saved) => {
        this.notaAtual.set(saved);
        this.saving = false;
        this.mensagem = 'Nota gravada.';
        this.carregarItensPedido(saved.id);
      },
      error: (err) => {
        this.saving = false;
        this.erro = err?.error?.detail || 'Não foi possível gravar a nota.';
      },
    });
  }

  onPedidoChange(): void {
    const nota = this.notaAtual();
    if (nota) return;

    const pedidoId = Number(this.form.get('pedido_compra')?.value || 0);
    const pedido = this.pedidosAprovados.find(p => p.id === pedidoId);
    if (!pedido) return;

    this.form.patchValue({
      dt_emissao: pedido.emissao || this.hojeISO(),
      valor_frete: Number(pedido.frete || 0),
    });
  }

  private carregarItensPedido(notaId: number): void {
    this.loadingItens = true;
    this.notasApi.itensPedido(notaId).subscribe({
      next: (itens) => {
        this.itensPedido = itens.map(item => {
          const qtdNaNota = Number(item.qtd_na_nota || 0);
          const saldo = Number(item.saldo_total_recebivel || 0);
          const preco = Number(item.preco_unit_pedido || 0);
          const qtdInicial = qtdNaNota > 0 ? qtdNaNota : saldo;
          return {
            ...item,
            qtd_receber: qtdInicial,
            preco_unit_nf: preco,
            desconto_item: 0,
            total_item: qtdInicial * preco,
          };
        });
        this.preservarSelecaoItem();
        this.loadingItens = false;
      },
      error: () => {
        this.itensPedido = [];
        this.selectedItem = null;
        this.loadingItens = false;
        this.erro = 'Não foi possível carregar os itens do pedido.';
      },
    });
  }

  selecionarItem(item: ItemRecebimentoUI): void {
    this.selectedItem = item;
  }

  itemSelecionado(item: ItemRecebimentoUI): boolean {
    return !!this.selectedItem && this.itemKey(this.selectedItem) === this.itemKey(item);
  }

  podeAlterarItemSelecionado(): boolean {
    return !!this.selectedItem && this.notaAtual()?.status === 'AB' && !this.saving;
  }

  salvarItemSelecionado(): void {
    if (this.selectedItem) this.salvarItem(this.selectedItem);
  }

  removerItemSelecionado(): void {
    if (this.selectedItem) this.removerItem(this.selectedItem);
  }

  private preservarSelecaoItem(): void {
    if (!this.selectedItem) return;
    const selectedKey = this.itemKey(this.selectedItem);
    this.selectedItem = this.itensPedido.find(item => this.itemKey(item) === selectedKey) || null;
  }

  private itemKey(item: ItemRecebimentoUI): number {
    return item.nota_item || item.pedido_item;
  }

  recalcularItem(item: ItemRecebimentoUI): void {
    const bruto = Number(item.qtd_receber || 0) * Number(item.preco_unit_nf || 0);
    item.total_item = Math.max(0, bruto - Number(item.desconto_item || 0));
  }

  salvarItem(item: ItemRecebimentoUI): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB') return;

    const qtd = Number(item.qtd_receber || 0);
    const saldoTotal = Number(item.saldo_total_recebivel || 0);
    if (qtd < 0 || qtd > saldoTotal) {
      this.erro = 'Quantidade recebida inválida para o saldo do pedido.';
      return;
    }
    const preco = Number(item.preco_unit_nf || 0);
    const desconto = Number(item.desconto_item || 0);
    const bruto = qtd * preco;
    if (preco < 0) {
      this.erro = 'Preço do item deve ser maior ou igual a zero.';
      return;
    }
    if (desconto < 0) {
      this.erro = 'Desconto do item deve ser maior ou igual a zero.';
      return;
    }
    if (desconto > bruto) {
      this.erro = 'Desconto do item não pode ser maior que o valor bruto.';
      return;
    }
    if (!this.quantidadeFechaPack(item, qtd)) {
      const validas = (item.quantidades_validas || []).join(', ');
      this.erro = validas
        ? `A quantidade recebida do item ${item.pedido_item} precisa fechar com o pack. Use: ${validas}.`
        : `A quantidade recebida do item ${item.pedido_item} não fecha com a composição do pack.`;
      return;
    }

    const payload = {
      nota: nota.id,
      pedido_item: item.pedido_item,
      qtd_recebida: String(qtd),
      preco_unit_nf: String(Number(item.preco_unit_nf || 0)),
      desconto_item: String(Number(item.desconto_item || 0)),
    };

    const req = item.nota_item
      ? this.notasApi.atualizarItem(item.nota_item, payload)
      : this.notasApi.criarItem(payload);

    this.saving = true;
    req.subscribe({
      next: () => {
        this.saving = false;
        this.mensagem = 'Item gravado.';
        this.erro = '';
        this.notasApi.get(nota.id).subscribe(n => this.notaAtual.set(n));
        this.carregarItensPedido(nota.id);
      },
      error: (err) => {
        this.saving = false;
        this.erro = err?.error?.detail || 'Não foi possível gravar o item.';
      },
    });
  }

  descricaoItem(item: ItemRecebimentoUI): string {
    const partes = [
      item.produto_descricao || item.descricao_livre || '',
      item.produto_referencia ? `Ref. ${item.produto_referencia}` : '',
      item.cor_nome || '',
      item.pack_nome || '',
    ].filter(Boolean);
    return partes.join(' · ') || '-';
  }

  private quantidadeFechaPack(item: ItemRecebimentoUI, qtd: number): boolean {
    if (!item.pack || !item.quantidades_validas?.length || qtd <= 0) return true;
    return item.quantidades_validas.some(valor => Number(valor) === qtd);
  }

  removerItem(item: ItemRecebimentoUI): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB' || !item.nota_item) return;
    this.confirmModal = {
      action: 'removerItem',
      title: 'Remover item da nota',
      text: 'Confirma a remoção deste item da nota?',
      item,
    };
  }

  confirmarAcao(): void {
    const modal = this.confirmModal;
    if (!modal) return;
    if (modal.action === 'removerItem' && modal.item) {
      this.executarRemocaoItem(modal.item);
      return;
    }
    if (modal.action === 'fecharNota') {
      this.executarFechamentoNota();
      return;
    }
    if (modal.action === 'cancelarNota') {
      this.executarCancelamentoNota();
    }
  }

  fecharConfirmacao(): void {
    this.confirmModal = null;
  }

  private executarRemocaoItem(item: ItemRecebimentoUI): void {
    const nota = this.notaAtual();
    if (!nota || !item.nota_item) return;
    this.notasApi.removerItem(item.nota_item).subscribe({
      next: () => {
        this.confirmModal = null;
        this.selectedItem = null;
        this.mensagem = 'Item removido.';
        this.notasApi.get(nota.id).subscribe(n => this.notaAtual.set(n));
        this.carregarItensPedido(nota.id);
      },
      error: () => {
        this.erro = 'Não foi possível remover o item.';
      },
    });
  }

  fecharNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB') return;
    this.confirmModal = {
      action: 'fecharNota',
      title: 'Fechar nota fiscal',
      text: `Confirma o fechamento da nota ${nota.numero}?`,
    };
  }

  private executarFechamentoNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB') return;
    this.notasApi.fechar(nota.id).subscribe({
      next: (n) => {
        this.confirmModal = null;
        this.notaAtual.set(n);
        this.form.disable();
        const fin = n.financeiro;
        const msgFin = fin?.disponivel
          ? ` Financeiro atualizado: ${fin.titulos_atualizados || 0} título(s).`
          : '';
        this.mensagem = `Nota fechada.${msgFin}`;
        this.erro = '';
        this.loadNotas();
        this.loadPedidosAprovados();
      },
      error: (err) => {
        this.erro = err?.error?.detail || 'Não foi possível fechar a nota.';
      },
    });
  }

  cancelarNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status === 'CA') return;
    this.confirmModal = {
      action: 'cancelarNota',
      title: 'Cancelar nota fiscal',
      text: `Confirma o cancelamento da nota ${nota.numero}?`,
    };
  }

  private executarCancelamentoNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status === 'CA') return;
    this.notasApi.cancelar(nota.id).subscribe({
      next: (n) => {
        this.confirmModal = null;
        this.notaAtual.set(n);
        this.form.disable();
        this.mensagem = 'Nota cancelada.';
        this.erro = '';
        this.loadNotas();
        this.loadPedidosAprovados();
      },
      error: () => {
        this.erro = 'Não foi possível cancelar a nota.';
      },
    });
  }

  labelLoja(id: number | null | undefined): string {
    if (!id) return '';
    const nome = this.lojaMap.get(id);
    return nome ? `${id} - ${nome}` : String(id);
  }

  labelFornecedor(id: number | null | undefined): string {
    if (!id) return '';
    const nome = this.fornecedorMap.get(id);
    return nome ? `${id} - ${nome}` : String(id);
  }

  pedidoLabel(pedido: PedidoCompra): string {
    return `${pedido.id} - ${this.labelLoja(pedido.loja)} - ${this.labelFornecedor(pedido.fornecedor)}`;
  }

  tipoPedidoLabel(tipo: string | null | undefined): string {
    const labels: Record<string, string> = { '1': 'Revenda', '2': 'Uso/Consumo', '4': 'Insumo' };
    return labels[String(tipo || '')] || 'Não definido';
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = { AB: 'Aberta', FE: 'Fechada', CA: 'Cancelada' };
    return labels[status] || status;
  }

  statusClass(status: string): string {
    if (status === 'FE') return 'badge-ok';
    if (status === 'CA') return 'badge-danger';
    return 'badge-off';
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private datasValidas(): boolean {
    const emissao = this.form.get('dt_emissao')?.value;
    const entrada = this.form.get('dt_entrada')?.value;
    return !emissao || !entrada || String(entrada) >= String(emissao);
  }

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (raw) {
      try {
        const prefs = JSON.parse(raw);
        this.indicatorsVisible = prefs.indicatorsVisible !== false;
        this.filtersVisible = prefs.filtersVisible !== false;
        this.advancedFiltersOpen = prefs.advancedFiltersOpen === true;
      } catch {
        this.indicatorsVisible = true;
        this.filtersVisible = true;
        this.advancedFiltersOpen = false;
      }
    }
    const size = Number(localStorage.getItem('sysvar.list.notas-entrada.pageSize'));
    if ([10, 20, 50, 100].includes(size)) this.pageSize = size;
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({
      indicatorsVisible: this.indicatorsVisible,
      filtersVisible: this.filtersVisible,
      advancedFiltersOpen: this.advancedFiltersOpen,
    }));
  }
}
